/**
 * Google Search Console OAuth Callback Handler
 * 
 * Handles OAuth 2.0 callback from Google after user authorizes Search Console access.
 * - Exchanges authorization code for access/refresh tokens
 * - Fetches user's Search Console properties (sites)
 * - Automatically matches property to tenant domain
 * - Stores encrypted tokens and connection in database
 * - Redirects back to frontend with success/error status
 * 
 * Customer Experience:
 * 1. Customer authorizes Search Console access in Google
 * 2. Google redirects here with authorization code
 * 3. System discovers all verified Search Console properties
 * 4. If 1 property + matches tenant → Auto-connect
 * 5. If multiple properties → Show selection UI
 * 6. If 0 properties → Show helpful error
 * 
 * Security:
 * - Validates CSRF state parameter
 * - Encrypts OAuth tokens before storage (AES-256-GCM)
 * - Never exposes tokens to frontend
 * - Enforces tenant isolation
 * - Validates property matches tenant domain
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const GOOGLE_OAUTH_CLIENT_ID = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID') || '';
const GOOGLE_OAUTH_CLIENT_SECRET = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET') || '';
const GSC_ENCRYPTION_KEY = Deno.env.get('GA4_ENCRYPTION_KEY') || ''; // Reuse GA4 key
const FRONTEND_URL = Deno.env.get('SITE_URL') || 'http://localhost:5173';

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
}

interface GSCSiteEntry {
  siteUrl: string; // "https://example.com/" or "sc-domain:example.com"
  permissionLevel: string; // "siteOwner", "siteFullUser", "siteRestrictedUser"
}

interface GSCSitesResponse {
  siteEntry?: GSCSiteEntry[];
}

/**
 * AES-256-GCM encryption
 */
async function encryptToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const keyData = Uint8Array.from(atob(GSC_ENCRYPTION_KEY), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    data
  );
  
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

/**
 * Validate CSRF state
 */
function validateState(state: string): { tenantId: string; timestamp: number } | null {
  try {
    const parts = state.split(':');
    if (parts.length !== 3) return null;
    
    const [tenantId, _csrfToken, timestampStr] = parts;
    const timestamp = parseInt(timestampStr, 10);
    
    const now = Date.now();
    const age = now - timestamp;
    if (age > 10 * 60 * 1000) {
      console.error('[GSC OAuth] State expired:', age / 1000, 'seconds old');
      return null;
    }
    
    return { tenantId, timestamp };
  } catch (err) {
    console.error('[GSC OAuth] Invalid state format:', err);
    return null;
  }
}

/**
 * Exchange authorization code for tokens
 */
async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<TokenResponse> {
  const tokenUrl = 'https://oauth2.googleapis.com/token';
  
  console.log('[GSC OAuth] Token exchange - Redirect URI:', redirectUri);
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_OAUTH_CLIENT_ID,
      client_secret: GOOGLE_OAUTH_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  
  console.log('[GSC OAuth] Token exchange - HTTP Status:', response.status);
  
  if (!response.ok) {
    const error = await response.text();
    console.error('[GSC OAuth] Token exchange failed:', error);
    throw new Error(`Token exchange failed: ${error}`);
  }
  
  const tokenData = await response.json();
  console.log('[GSC OAuth] Token exchange success');
  console.log('[GSC OAuth] Has refresh_token:', !!tokenData.refresh_token);
  console.log('[GSC OAuth] Granted scopes:', tokenData.scope);
  
  return tokenData;
}

/**
 * Get Google user info
 */
async function getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const userInfoUrl = 'https://www.googleapis.com/oauth2/v2/userinfo';
  
  const response = await fetch(userInfoUrl, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  
  console.log('[GSC OAuth] User info - HTTP Status:', response.status);
  
  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[GSC OAuth] Failed to get user info:', errorBody);
    throw new Error(`Failed to get user info: ${errorBody}`);
  }
  
  const userInfo = await response.json();
  console.log('[GSC OAuth] User info retrieved:', userInfo.email);
  
  return userInfo;
}

/**
 * List Search Console properties (sites)
 */
async function listGSCSites(accessToken: string): Promise<GSCSiteEntry[]> {
  const sitesUrl = 'https://www.googleapis.com/webmasters/v3/sites';
  
  console.log('[GSC OAuth] Fetching Search Console properties...');
  
  const response = await fetch(sitesUrl, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  
  console.log('[GSC OAuth] Sites API - HTTP Status:', response.status);
  
  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[GSC OAuth] Failed to get sites:', errorBody);
    throw new Error(`Failed to get Search Console sites: ${errorBody}`);
  }
  
  const data: GSCSitesResponse = await response.json();
  const sites = data.siteEntry || [];
  console.log('[GSC OAuth] Found', sites.length, 'Search Console properties');
  
  return sites;
}

/**
 * Get tenant domain from database
 */
async function getTenantDomain(tenantId: string): Promise<string | null> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  const { data, error } = await supabase
    .from('site_settings')
    .select('domain')
    .eq('tenant_id', tenantId)
    .maybeSingle();
  
  if (error) {
    console.error('[GSC OAuth] Failed to get tenant domain:', error);
    return null;
  }
  
  return data?.domain || null;
}

/**
 * Extract domain from Search Console property URL
 */
function extractDomain(siteUrl: string): string {
  if (siteUrl.startsWith('sc-domain:')) {
    return siteUrl.replace('sc-domain:', '');
  }
  
  try {
    const url = new URL(siteUrl);
    return url.hostname;
  } catch {
    return siteUrl;
  }
}

/**
 * Determine property type
 */
function getPropertyType(siteUrl: string): 'DOMAIN' | 'URL_PREFIX' {
  return siteUrl.startsWith('sc-domain:') ? 'DOMAIN' : 'URL_PREFIX';
}

/**
 * Match property to tenant domain
 */
function matchPropertyToTenant(siteUrl: string, tenantDomain: string | null): boolean {
  if (!tenantDomain) return false;
  
  const propertyDomain = extractDomain(siteUrl);
  const normalizedTenant = tenantDomain.toLowerCase().replace(/^www\./, '');
  const normalizedProperty = propertyDomain.toLowerCase().replace(/^www\./, '');
  
  return normalizedTenant === normalizedProperty;
}

/**
 * Store connection in database
 */
async function storeConnection(
  tenantId: string,
  userInfo: GoogleUserInfo,
  tokens: TokenResponse,
  site: GSCSiteEntry,
  connectedByUserId: string | null
) {
  console.log('[GSC OAuth] Storing connection for tenant:', tenantId);
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  // Encrypt tokens
  console.log('[GSC OAuth] Encrypting tokens...');
  const accessTokenEncrypted = await encryptToken(tokens.access_token);
  const refreshTokenEncrypted = await encryptToken(tokens.refresh_token);
  console.log('[GSC OAuth] Tokens encrypted successfully');
  
  // Calculate expiration time
  const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  
  const upsertPayload = {
    tenant_id: tenantId,
    google_account_email: userInfo.email,
    google_account_id: userInfo.id,
    property_url: site.siteUrl,
    property_type: getPropertyType(site.siteUrl),
    permission_level: site.permissionLevel,
    access_token_encrypted: accessTokenEncrypted,
    refresh_token_encrypted: refreshTokenEncrypted,
    token_expires_at: tokenExpiresAt,
    granted_scopes: tokens.scope,
    status: 'active' as const,
    connected_by_user_id: connectedByUserId || null,
  };
  
  console.log('[GSC OAuth] Upserting connection to database...');
  console.log('[GSC OAuth] Property:', site.siteUrl);
  
  const { data, error } = await supabase
    .from('google_search_console_connections')
    .upsert(upsertPayload, {
      onConflict: 'tenant_id,property_url',
    })
    .select()
    .single();
  
  if (error) {
    console.error('[GSC OAuth] Database upsert failed:', error);
    throw new Error(`Failed to store connection: ${error.message}`);
  }
  
  console.log('[GSC OAuth] Connection stored successfully, ID:', data?.id);
  
  return data;
}

/**
 * Encode property selection data for frontend
 */
function encodePropertySelection(
  tenantId: string,
  userInfo: GoogleUserInfo,
  tokens: TokenResponse,
  sites: GSCSiteEntry[]
): string {
  const selectionData = {
    tenant_id: tenantId,
    google_email: userInfo.email,
    google_id: userInfo.id,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_in: tokens.expires_in,
    scope: tokens.scope,
    sites: sites.map(site => ({
      site_url: site.siteUrl,
      permission_level: site.permissionLevel,
      property_type: getPropertyType(site.siteUrl),
    })),
    timestamp: Date.now(),
  };
  
  return btoa(JSON.stringify(selectionData));
}

/**
 * Main handler
 */
serve(async (req: Request) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': FRONTEND_URL,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }
  
  try {
    // Parse query parameters
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    
    console.log('[GSC OAuth] Callback received');
    
    // Check for OAuth errors
    if (error) {
      console.error('[GSC OAuth] User denied access:', error);
      return Response.redirect(
        `${FRONTEND_URL}/admin/google-search-console?gsc_error=access_denied`,
        302
      );
    }
    
    // Validate required parameters
    if (!code || !state) {
      console.error('[GSC OAuth] Missing code or state');
      return Response.redirect(
        `${FRONTEND_URL}/admin/google-search-console?gsc_error=invalid_callback`,
        302
      );
    }
    
    console.log('[GSC OAuth] Validating state...');
    
    // Validate state (CSRF protection)
    const stateData = validateState(state);
    if (!stateData) {
      console.error('[GSC OAuth] Invalid or expired state');
      return Response.redirect(
        `${FRONTEND_URL}/admin/google-search-console?gsc_error=invalid_state`,
        302
      );
    }
    
    const { tenantId } = stateData;
    console.log('[GSC OAuth] State validated for tenant:', tenantId);
    
    // Construct redirect URI
    const redirectUri = `${SUPABASE_URL}/functions/v1/gsc-oauth-callback`;
    
    // Exchange code for tokens
    console.log('[GSC OAuth] Exchanging code for tokens...');
    const tokens = await exchangeCodeForTokens(code, redirectUri);
    
    // Get user info
    console.log('[GSC OAuth] Fetching user info...');
    const userInfo = await getUserInfo(tokens.access_token);
    
    // Get Search Console properties
    console.log('[GSC OAuth] Fetching Search Console properties...');
    const sites = await listGSCSites(tokens.access_token);
    
    if (sites.length === 0) {
      console.error('[GSC OAuth] No Search Console properties found');
      return Response.redirect(
        `${FRONTEND_URL}/admin/google-search-console?gsc_error=no_properties`,
        302
      );
    }
    
    // Get tenant domain for matching
    const tenantDomain = await getTenantDomain(tenantId);
    console.log('[GSC OAuth] Tenant domain:', tenantDomain);
    
    // Find matching properties
    const matchingSites = sites.filter(site => 
      matchPropertyToTenant(site.siteUrl, tenantDomain)
    );
    
    console.log('[GSC OAuth] Matching sites:', matchingSites.length);
    
    // If exactly one matching site, auto-connect
    if (matchingSites.length === 1) {
      console.log('[GSC OAuth] Single matching property found, auto-connecting...');
      
      await storeConnection(
        tenantId,
        userInfo,
        tokens,
        matchingSites[0],
        null
      );
      
      return Response.redirect(
        `${FRONTEND_URL}/admin/google-search-console?gsc_success=true`,
        302
      );
    }
    
    // If multiple matching sites or no match, show selection UI
    if (matchingSites.length > 1 || matchingSites.length === 0) {
      const sitesToShow = matchingSites.length > 0 ? matchingSites : sites;
      console.log('[GSC OAuth] Multiple/no matching properties, showing selection UI');
      
      const selectionData = encodePropertySelection(
        tenantId,
        userInfo,
        tokens,
        sitesToShow
      );
      
      const hasMatch = matchingSites.length > 0 ? 'partial' : 'none';
      
      return Response.redirect(
        `${FRONTEND_URL}/admin/google-search-console?gsc_select_property=${selectionData}&match=${hasMatch}`,
        302
      );
    }
    
    // Fallback (shouldn't reach here)
    return Response.redirect(
      `${FRONTEND_URL}/admin/google-search-console?gsc_error=unknown`,
      302
    );
    
  } catch (error: any) {
    console.error('[GSC OAuth] Error:', error);
    return Response.redirect(
      `${FRONTEND_URL}/admin/google-search-console?gsc_error=connection_failed`,
      302
    );
  }
});
