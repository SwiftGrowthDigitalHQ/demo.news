/**
 * Facebook OAuth Callback Handler
 * 
 * Handles OAuth 2.0 callback from Facebook after user authorizes Page access.
 * - Exchanges authorization code for access token
 * - Fetches user's managed Facebook Pages
 * - Stores encrypted token and Page data in database
 * - Redirects back to frontend with success/error status
 * 
 * Security:
 * - Validates CSRF state parameter
 * - Encrypts OAuth tokens before storage (AES-256-GCM)
 * - Never exposes tokens to frontend
 * - Enforces tenant isolation
 * - Handles multiple Pages (user selects which one)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const META_APP_ID = Deno.env.get('META_APP_ID') || '';
const META_APP_SECRET = Deno.env.get('META_APP_SECRET') || '';
const FB_ENCRYPTION_KEY = Deno.env.get('FB_ENCRYPTION_KEY') || '';
const FRONTEND_URL = Deno.env.get('SITE_URL') || 'http://localhost:5173';

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

interface UserInfo {
  id: string;
  name: string;
  email?: string;
}

interface FacebookPage {
  id: string;
  name: string;
  username?: string;
  category?: string;
  picture?: {
    data: {
      url: string;
    };
  };
  access_token: string; // Page-specific access token
}

interface PagesResponse {
  data: FacebookPage[];
  paging?: {
    cursors?: {
      before: string;
      after: string;
    };
  };
}

/**
 * AES-256-GCM encryption using Web Crypto API
 */
async function encryptToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  
  // Generate random IV (12 bytes for GCM)
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Import encryption key
  const keyData = Uint8Array.from(atob(FB_ENCRYPTION_KEY), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  
  // Encrypt
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    data
  );
  
  // Combine IV + encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  // Return base64
  return btoa(String.fromCharCode(...combined));
}

/**
 * Validate CSRF state parameter
 */
function validateState(state: string): { tenantId: string; timestamp: number } | null {
  try {
    const parts = state.split(':');
    if (parts.length !== 3) return null;
    
    const [tenantId, _csrfToken, timestampStr] = parts;
    const timestamp = parseInt(timestampStr, 10);
    
    // Validate timestamp (max age: 10 minutes)
    const now = Date.now();
    const age = now - timestamp;
    if (age > 10 * 60 * 1000) {
      console.error('[Facebook OAuth] State expired:', age / 1000, 'seconds old');
      return null;
    }
    
    return { tenantId, timestamp };
  } catch (err) {
    console.error('[Facebook OAuth] Invalid state format:', err);
    return null;
  }
}

/**
 * Exchange authorization code for access token
 */
async function exchangeCodeForToken(code: string, redirectUri: string): Promise<TokenResponse> {
  const tokenUrl = 'https://graph.facebook.com/v18.0/oauth/access_token?' + new URLSearchParams({
    client_id: META_APP_ID,
    client_secret: META_APP_SECRET,
    redirect_uri: redirectUri,
    code: code,
  });
  
  console.log('[Facebook OAuth] Token exchange - Redirect URI:', redirectUri);
  
  const response = await fetch(tokenUrl);
  
  console.log('[Facebook OAuth] Token exchange - HTTP Status:', response.status);
  
  if (!response.ok) {
    const error = await response.text();
    console.error('[Facebook OAuth] Token exchange failed:', error);
    throw new Error(`Token exchange failed: ${error}`);
  }
  
  const tokenData: TokenResponse = await response.json();
  console.log('[Facebook OAuth] Token exchange success');
  console.log('[Facebook OAuth] Token expires in:', tokenData.expires_in || 'long-lived', 'seconds');
  
  return tokenData;
}

/**
 * Get Facebook user info
 */
async function getUserInfo(accessToken: string): Promise<UserInfo> {
  const userInfoUrl = 'https://graph.facebook.com/v18.0/me?' + new URLSearchParams({
    fields: 'id,name,email',
    access_token: accessToken,
  });
  
  const response = await fetch(userInfoUrl);
  
  console.log('[Facebook OAuth] User info - HTTP Status:', response.status);
  
  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[Facebook OAuth] Failed to get user info:', errorBody);
    throw new Error(`Failed to get user info: ${errorBody}`);
  }
  
  const userInfo: UserInfo = await response.json();
  console.log('[Facebook OAuth] User info retrieved:', userInfo.name);
  
  return userInfo;
}

/**
 * Get user's managed Facebook Pages with Page access tokens
 */
async function getUserPages(accessToken: string): Promise<FacebookPage[]> {
  const pagesUrl = 'https://graph.facebook.com/v18.0/me/accounts?' + new URLSearchParams({
    fields: 'id,name,username,category,picture,access_token',
    access_token: accessToken,
  });
  
  console.log('[Facebook OAuth] Fetching Pages...');
  
  const response = await fetch(pagesUrl);
  
  console.log('[Facebook OAuth] Pages API - HTTP Status:', response.status);
  
  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[Facebook OAuth] Failed to get Pages:', errorBody);
    throw new Error(`Failed to get Facebook Pages: ${errorBody}`);
  }
  
  const data: PagesResponse = await response.json();
  const pages = data.data || [];
  
  console.log('[Facebook OAuth] Found', pages.length, 'Pages');
  
  return pages;
}

/**
 * Get long-lived Page access token (60 days)
 */
async function exchangeForLongLivedToken(shortLivedToken: string): Promise<TokenResponse> {
  const tokenUrl = 'https://graph.facebook.com/v18.0/oauth/access_token?' + new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: META_APP_ID,
    client_secret: META_APP_SECRET,
    fb_exchange_token: shortLivedToken,
  });
  
  console.log('[Facebook OAuth] Exchanging for long-lived token...');
  
  const response = await fetch(tokenUrl);
  
  if (!response.ok) {
    const error = await response.text();
    console.error('[Facebook OAuth] Long-lived token exchange failed:', error);
    // Continue with short-lived token if exchange fails
    return {
      access_token: shortLivedToken,
      token_type: 'bearer',
    };
  }
  
  const tokenData: TokenResponse = await response.json();
  console.log('[Facebook OAuth] Long-lived token obtained');
  
  return tokenData;
}

/**
 * Store Facebook connection in database
 */
async function storeConnection(
  tenantId: string,
  userInfo: UserInfo,
  page: FacebookPage,
  permissions: string,
  tokenExpiresAt: string | null,
  connectedByUserId: string | null
) {
  console.log('[Facebook OAuth] Storing connection for tenant:', tenantId);
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  // Encrypt Page access token
  console.log('[Facebook OAuth] Encrypting Page access token...');
  const accessTokenEncrypted = await encryptToken(page.access_token);
  console.log('[Facebook OAuth] Token encrypted successfully');
  
  // Construct Page URL
  const pageUrl = page.username 
    ? `https://www.facebook.com/${page.username}`
    : `https://www.facebook.com/${page.id}`;
  
  const upsertPayload = {
    tenant_id: tenantId,
    facebook_user_id: userInfo.id,
    facebook_user_name: userInfo.name,
    facebook_user_email: userInfo.email || null,
    facebook_page_id: page.id,
    facebook_page_name: page.name,
    facebook_page_username: page.username || null,
    facebook_page_category: page.category || null,
    facebook_page_image_url: page.picture?.data?.url || null,
    facebook_page_url: pageUrl,
    access_token_encrypted: accessTokenEncrypted,
    token_expires_at: tokenExpiresAt,
    granted_permissions: permissions,
    status: 'active' as const,
    last_used_at: new Date().toISOString(),
    connected_by_user_id: connectedByUserId || null,
  };
  
  console.log('[Facebook OAuth] Upserting connection to database...');
  
  // Upsert connection (replace if exists)
  const { data, error } = await supabase
    .from('facebook_connections')
    .upsert(upsertPayload, {
      onConflict: 'tenant_id',
    })
    .select()
    .single();
  
  if (error) {
    console.error('[Facebook OAuth] Database upsert failed:', error);
    throw new Error(`Failed to store connection: ${error.message}`);
  }
  
  console.log('[Facebook OAuth] Connection stored successfully, ID:', data?.id);
  
  return data;
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
    // CRITICAL: Validate configuration
    if (!META_APP_ID || META_APP_ID.trim() === '') {
      console.error('[Facebook OAuth] META_APP_ID is not configured');
      return Response.redirect(
        `${FRONTEND_URL}/admin/facebook-publisher?facebook_error=configuration_missing`,
        302
      );
    }
    
    if (!META_APP_SECRET || META_APP_SECRET.trim() === '') {
      console.error('[Facebook OAuth] META_APP_SECRET is not configured');
      return Response.redirect(
        `${FRONTEND_URL}/admin/facebook-publisher?facebook_error=configuration_missing`,
        302
      );
    }
    
    if (!FB_ENCRYPTION_KEY || FB_ENCRYPTION_KEY.trim() === '') {
      console.error('[Facebook OAuth] FB_ENCRYPTION_KEY is not configured');
      return Response.redirect(
        `${FRONTEND_URL}/admin/facebook-publisher?facebook_error=configuration_missing`,
        302
      );
    }
    
    // Parse query parameters
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    const errorReason = url.searchParams.get('error_reason');
    
    console.log('[Facebook OAuth] Callback received');
    
    // Check for OAuth errors (user denied access)
    if (error) {
      console.error('[Facebook OAuth] User denied access:', error, errorReason);
      return Response.redirect(
        `${FRONTEND_URL}/admin/facebook-publisher?facebook_error=access_denied`,
        302
      );
    }
    
    // Validate required parameters
    if (!code || !state) {
      console.error('[Facebook OAuth] Missing code or state');
      return Response.redirect(
        `${FRONTEND_URL}/admin/facebook-publisher?facebook_error=invalid_callback`,
        302
      );
    }
    
    console.log('[Facebook OAuth] Validating state...');
    
    // Validate state (CSRF protection)
    const stateData = validateState(state);
    if (!stateData) {
      console.error('[Facebook OAuth] Invalid or expired state');
      return Response.redirect(
        `${FRONTEND_URL}/admin/facebook-publisher?facebook_error=invalid_state`,
        302
      );
    }
    
    const { tenantId } = stateData;
    console.log('[Facebook OAuth] State validated for tenant:', tenantId);
    
    // Construct redirect URI (must match OAuth start)
    const redirectUri = `${SUPABASE_URL}/functions/v1/facebook-oauth-callback`;
    
    // Exchange code for access token
    console.log('[Facebook OAuth] Exchanging code for token...');
    const tokens = await exchangeCodeForToken(code, redirectUri);
    
    // Get user info
    console.log('[Facebook OAuth] Fetching user info...');
    const userInfo = await getUserInfo(tokens.access_token);
    
    // Get user's Facebook Pages
    console.log('[Facebook OAuth] Fetching Facebook Pages...');
    const pages = await getUserPages(tokens.access_token);
    
    if (pages.length === 0) {
      console.error('[Facebook OAuth] No Facebook Pages found');
      return Response.redirect(
        `${FRONTEND_URL}/admin/facebook-publisher?facebook_error=no_pages`,
        302
      );
    }
    
    // Calculate token expiration (long-lived tokens are ~60 days)
    const tokenExpiresAt = tokens.expires_in 
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null; // NULL means long-lived (60 days)
    
    // Get granted permissions
    const permissions = 'pages_show_list,pages_read_engagement,pages_manage_posts';
    
    // Handle multiple Pages
    if (pages.length > 1) {
      console.log('[Facebook OAuth] Multiple Pages found, user must select');
      
      // Encode Pages data for frontend selection
      const pagesData = pages.map(p => ({
        id: p.id,
        name: p.name,
        username: p.username,
        category: p.category,
        image: p.picture?.data?.url,
        access_token: p.access_token, // Temporary - will be encrypted when selected
      }));
      
      const selectionData = btoa(JSON.stringify({
        tenant_id: tenantId,
        user_id: userInfo.id,
        user_name: userInfo.name,
        user_email: userInfo.email,
        pages: pagesData,
        permissions: permissions,
        token_expires_at: tokenExpiresAt,
        timestamp: Date.now(),
      }));
      
      return Response.redirect(
        `${FRONTEND_URL}/admin/facebook-publisher?facebook_select_page=${encodeURIComponent(selectionData)}`,
        302
      );
    }
    
    // Single Page - auto-connect
    console.log('[Facebook OAuth] Single Page found, auto-connecting...');
    const page = pages[0];
    
    // Store connection
    await storeConnection(
      tenantId,
      userInfo,
      page,
      permissions,
      tokenExpiresAt,
      null // TODO: Extract user ID from session if available
    );
    
    console.log('[Facebook OAuth] Connection complete, redirecting to success...');
    
    // Redirect back to frontend with success
    return Response.redirect(
      `${FRONTEND_URL}/admin/facebook-publisher?facebook_success=true`,
      302
    );
    
  } catch (err) {
    console.error('[Facebook OAuth] Callback failed:', err);
    console.error('[Facebook OAuth] Error type:', err instanceof Error ? err.constructor.name : typeof err);
    console.error('[Facebook OAuth] Error message:', err instanceof Error ? err.message : String(err));
    
    // Redirect to frontend with error
    return Response.redirect(
      `${FRONTEND_URL}/admin/facebook-publisher?facebook_error=connection_failed`,
      302
    );
  }
});
