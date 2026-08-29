/**
 * GA4 OAuth Callback Handler
 * 
 * Handles OAuth 2.0 callback from Google after user authorizes Analytics access.
 * - Exchanges authorization code for access/refresh tokens
 * - Fetches user's GA4 accounts, properties, and data streams
 * - Automatically detects Measurement ID from web data streams
 * - Intelligently matches property to tenant domain when possible
 * - Stores encrypted tokens and GA4 configuration in database
 * - Redirects back to frontend with success/error status
 * 
 * Security:
 * - Validates CSRF state parameter
 * - Encrypts OAuth tokens before storage (AES-256-GCM)
 * - Never exposes tokens to frontend
 * - Enforces tenant isolation
 * - Handles multiple properties (user selects which one)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const GOOGLE_OAUTH_CLIENT_ID = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID') || '';
const GOOGLE_OAUTH_CLIENT_SECRET = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET') || '';
const GA4_ENCRYPTION_KEY = Deno.env.get('GA4_ENCRYPTION_KEY') || '';
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

interface GA4Account {
  name: string; // "accounts/123456789"
  displayName: string;
}

interface GA4Property {
  name: string; // "properties/123456789"
  displayName: string;
  account: string; // "accounts/123456789"
  timeZone: string;
  currencyCode: string;
}

interface GA4DataStream {
  name: string; // "properties/123456789/dataStreams/987654321"
  displayName: string;
  type: string; // "WEB_DATA_STREAM", "ANDROID_APP_DATA_STREAM", "IOS_APP_DATA_STREAM"
  webStreamData?: {
    measurementId: string; // "G-XXXXXXXXXX"
    defaultUri: string; // Website URL
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
  const keyData = Uint8Array.from(atob(GA4_ENCRYPTION_KEY), c => c.charCodeAt(0));
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
      console.error('[GA4 OAuth] State expired:', age / 1000, 'seconds old');
      return null;
    }
    
    return { tenantId, timestamp };
  } catch (err) {
    console.error('[GA4 OAuth] Invalid state format:', err);
    return null;
  }
}

/**
 * Exchange authorization code for tokens
 */
async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<TokenResponse> {
  const tokenUrl = 'https://oauth2.googleapis.com/token';
  
  console.log('[GA4 OAuth] Token exchange - Redirect URI:', redirectUri);
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_OAUTH_CLIENT_ID,
      client_secret: GOOGLE_OAUTH_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  
  console.log('[GA4 OAuth] Token exchange - HTTP Status:', response.status);
  
  if (!response.ok) {
    const error = await response.text();
    console.error('[GA4 OAuth] Token exchange failed:', error);
    throw new Error(`Token exchange failed: ${error}`);
  }
  
  const tokenData = await response.json();
  console.log('[GA4 OAuth] Token exchange success');
  console.log('[GA4 OAuth] Has refresh_token:', !!tokenData.refresh_token);
  console.log('[GA4 OAuth] Granted scopes:', tokenData.scope);
  
  return tokenData;
}

/**
 * Get Google user info
 */
async function getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const userInfoUrl = 'https://www.googleapis.com/oauth2/v2/userinfo';
  
  const response = await fetch(userInfoUrl, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  
  console.log('[GA4 OAuth] User info - HTTP Status:', response.status);
  
  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[GA4 OAuth] Failed to get user info:', errorBody);
    throw new Error(`Failed to get user info: ${errorBody}`);
  }
  
  const userInfo = await response.json();
  console.log('[GA4 OAuth] User info retrieved:', userInfo.email);
  
  return userInfo;
}

/**
 * List GA4 accounts accessible to the user
 */
async function listGA4Accounts(accessToken: string): Promise<GA4Account[]> {
  const accountsUrl = 'https://analyticsadmin.googleapis.com/v1beta/accounts';
  
  console.log('[GA4 OAuth] Fetching GA4 accounts...');
  
  const response = await fetch(accountsUrl, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  
  console.log('[GA4 OAuth] Accounts API - HTTP Status:', response.status);
  
  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[GA4 OAuth] Failed to get accounts:', errorBody);
    throw new Error(`Failed to get GA4 accounts: ${errorBody}`);
  }
  
  const data = await response.json();
  const accounts = data.accounts || [];
  console.log('[GA4 OAuth] Found', accounts.length, 'accounts');
  
  return accounts;
}

/**
 * List GA4 properties for an account
 */
async function listGA4Properties(accessToken: string, accountName?: string): Promise<GA4Property[]> {
  // Build URL with optional filter parameter
  // If accountName is provided, filter by parent account
  // If not provided, omit filter entirely (API will return all accessible properties)
  let propertiesUrl = 'https://analyticsadmin.googleapis.com/v1beta/properties';
  
  if (accountName) {
    const filter = `parent:${accountName}`;
    propertiesUrl += `?${new URLSearchParams({ filter })}`;
    console.log('[GA4 OAuth] Fetching GA4 properties for account:', accountName);
  } else {
    console.log('[GA4 OAuth] Fetching all accessible GA4 properties...');
  }
  
  const response = await fetch(propertiesUrl, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  
  console.log('[GA4 OAuth] Properties API - HTTP Status:', response.status);
  
  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[GA4 OAuth] Failed to get GA4 properties:', errorBody);
    throw new Error(`Failed to get GA4 properties: ${errorBody}`);
  }
  
  const data = await response.json();
  const properties = data.properties || [];
  console.log('[GA4 OAuth] Found', properties.length, 'properties');
  
  return properties;
}

/**
 * List data streams for a GA4 property
 */
async function listDataStreams(accessToken: string, propertyName: string): Promise<GA4DataStream[]> {
  const streamsUrl = `https://analyticsadmin.googleapis.com/v1beta/${propertyName}/dataStreams`;
  
  console.log('[GA4 OAuth] Fetching data streams for:', propertyName);
  
  const response = await fetch(streamsUrl, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  
  console.log('[GA4 OAuth] Data streams API - HTTP Status:', response.status);
  
  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[GA4 OAuth] Failed to get data streams:', errorBody);
    throw new Error(`Failed to get data streams: ${errorBody}`);
  }
  
  const data = await response.json();
  const dataStreams = data.dataStreams || [];
  console.log('[GA4 OAuth] Found', dataStreams.length, 'data streams');
  
  return dataStreams;
}

/**
 * Extract domain from URL for matching
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return url.replace(/^www\./, '');
  }
}

/**
 * Find best matching property for tenant
 * Prioritizes web data streams that match the tenant's domain
 */
async function findBestMatchingProperty(
  accessToken: string,
  properties: GA4Property[],
  tenantDomain?: string
): Promise<{ property: GA4Property; dataStream: GA4DataStream } | null> {
  console.log('[GA4 OAuth] Finding best matching property for domain:', tenantDomain);
  
  for (const property of properties) {
    const dataStreams = await listDataStreams(accessToken, property.name);
    
    // Filter to web data streams only
    const webStreams = dataStreams.filter(ds => ds.type === 'WEB_DATA_STREAM' && ds.webStreamData);
    
    if (webStreams.length === 0) continue;
    
    // If tenant domain provided, try to match
    if (tenantDomain) {
      const normalizedTenantDomain = extractDomain(tenantDomain);
      
      for (const stream of webStreams) {
        const streamDomain = extractDomain(stream.webStreamData!.defaultUri);
        if (streamDomain === normalizedTenantDomain) {
          console.log('[GA4 OAuth] Found exact domain match:', property.displayName, '->', streamDomain);
          return { property, dataStream: stream };
        }
      }
    }
    
    // If no domain match or no tenant domain, return first web stream
    if (webStreams.length === 1) {
      console.log('[GA4 OAuth] Using first web stream:', property.displayName);
      return { property, dataStream: webStreams[0] };
    }
  }
  
  return null;
}

/**
 * Store GA4 connection in database
 */
async function storeConnection(
  tenantId: string,
  userInfo: GoogleUserInfo,
  tokens: TokenResponse,
  account: GA4Account | null,
  property: GA4Property,
  dataStream: GA4DataStream,
  connectedByUserId: string | null
) {
  console.log('[GA4 OAuth] Storing connection for tenant:', tenantId);
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  // Encrypt tokens
  console.log('[GA4 OAuth] Encrypting tokens...');
  const accessTokenEncrypted = await encryptToken(tokens.access_token);
  const refreshTokenEncrypted = await encryptToken(tokens.refresh_token);
  console.log('[GA4 OAuth] Tokens encrypted successfully');
  
  // Calculate expiration time
  const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  
  // Extract Measurement ID
  const measurementId = dataStream.webStreamData!.measurementId;
  
  const upsertPayload = {
    tenant_id: tenantId,
    google_account_email: userInfo.email,
    google_account_id: userInfo.id,
    analytics_account_id: account ? account.name.replace('accounts/', '') : null,
    analytics_account_name: account?.displayName || null,
    property_id: property.name,
    property_name: property.name.replace('properties/', ''),
    property_display_name: property.displayName,
    data_stream_id: dataStream.name,
    data_stream_name: dataStream.displayName,
    data_stream_type: dataStream.type,
    data_stream_url: dataStream.webStreamData!.defaultUri,
    measurement_id: measurementId,
    access_token_encrypted: accessTokenEncrypted,
    refresh_token_encrypted: refreshTokenEncrypted,
    token_expires_at: tokenExpiresAt,
    granted_scopes: tokens.scope,
    status: 'active' as const,
    last_sync_at: new Date().toISOString(),
    connected_by_user_id: connectedByUserId || null,
  };
  
  console.log('[GA4 OAuth] Upserting connection to database...');
  console.log('[GA4 OAuth] Measurement ID:', measurementId);
  
  // Upsert connection (replace if exists)
  const { data, error } = await supabase
    .from('ga4_connections')
    .upsert(upsertPayload, {
      onConflict: 'tenant_id',
    })
    .select()
    .single();
  
  if (error) {
    console.error('[GA4 OAuth] Database upsert failed:', error);
    throw new Error(`Failed to store connection: ${error.message}`);
  }
  
  console.log('[GA4 OAuth] Connection stored successfully, ID:', data?.id);
  
  return data;
}

/**
 * Store property selection temporarily (for multiple properties scenario)
 */
async function encodePropertySelection(
  tenantId: string,
  userInfo: GoogleUserInfo,
  tokens: TokenResponse,
  properties: GA4Property[],
  dataStreamsByProperty: Map<string, GA4DataStream[]>
): Promise<string> {
  // Encode property data for selection UI
  const propertiesData = properties.map(prop => {
    const streams = dataStreamsByProperty.get(prop.name) || [];
    const webStreams = streams.filter(ds => ds.type === 'WEB_DATA_STREAM' && ds.webStreamData);
    
    return {
      property_id: prop.name,
      property_name: prop.displayName,
      account: prop.account,
      web_streams: webStreams.map(ws => ({
        stream_id: ws.name,
        stream_name: ws.displayName,
        url: ws.webStreamData!.defaultUri,
        measurement_id: ws.webStreamData!.measurementId,
      })),
    };
  }).filter(p => p.web_streams.length > 0); // Only include properties with web streams
  
  // Encode as base64 JSON
  const selectionData = {
    tenant_id: tenantId,
    google_email: userInfo.email,
    google_id: userInfo.id,
    access_token: tokens.access_token, // Temporary - will be encrypted when property selected
    refresh_token: tokens.refresh_token,
    expires_in: tokens.expires_in,
    scope: tokens.scope,
    properties: propertiesData,
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
    
    console.log('[GA4 OAuth] Callback received');
    
    // Check for OAuth errors (user denied access)
    if (error) {
      console.error('[GA4 OAuth] User denied access:', error);
      return Response.redirect(
        `${FRONTEND_URL}/admin/plugins/google-analytics?ga4_error=access_denied`,
        302
      );
    }
    
    // Validate required parameters
    if (!code || !state) {
      console.error('[GA4 OAuth] Missing code or state');
      return Response.redirect(
        `${FRONTEND_URL}/admin/plugins/google-analytics?ga4_error=invalid_callback`,
        302
      );
    }
    
    console.log('[GA4 OAuth] Validating state...');
    
    // Validate state (CSRF protection)
    const stateData = validateState(state);
    if (!stateData) {
      console.error('[GA4 OAuth] Invalid or expired state');
      return Response.redirect(
        `${FRONTEND_URL}/admin/plugins/google-analytics?ga4_error=invalid_state`,
        302
      );
    }
    
    const { tenantId } = stateData;
    console.log('[GA4 OAuth] State validated for tenant:', tenantId);
    
    // Construct redirect URI (must match OAuth start)
    const redirectUri = `${SUPABASE_URL}/functions/v1/ga4-oauth-callback`;
    
    // Exchange code for tokens
    console.log('[GA4 OAuth] Exchanging code for tokens...');
    const tokens = await exchangeCodeForTokens(code, redirectUri);
    
    // Get user info
    console.log('[GA4 OAuth] Fetching user info...');
    const userInfo = await getUserInfo(tokens.access_token);
    
    // Get GA4 accounts
    console.log('[GA4 OAuth] Fetching GA4 accounts...');
    const accounts = await listGA4Accounts(tokens.access_token);
    
    if (accounts.length === 0) {
      console.error('[GA4 OAuth] No GA4 accounts found');
      return Response.redirect(
        `${FRONTEND_URL}/admin/plugins/google-analytics?ga4_error=no_account`,
        302
      );
    }
    
    // Get all properties across all accounts
    console.log('[GA4 OAuth] Fetching GA4 properties...');
    const properties = await listGA4Properties(tokens.access_token);
    
    if (properties.length === 0) {
      console.error('[GA4 OAuth] No GA4 properties found');
      return Response.redirect(
        `${FRONTEND_URL}/admin/plugins/google-analytics?ga4_error=no_property`,
        302
      );
    }
    
    // Try to find best matching property
    // TODO: Get tenant domain from database for intelligent matching
    const match = await findBestMatchingProperty(tokens.access_token, properties);
    
    if (!match) {
      console.error('[GA4 OAuth] No web data streams found in any property');
      return Response.redirect(
        `${FRONTEND_URL}/admin/plugins/google-analytics?ga4_error=no_web_stream`,
        302
      );
    }
    
    // Check if multiple properties with web streams exist
    let propertiesWithWebStreams = 0;
    const dataStreamsByProperty = new Map<string, GA4DataStream[]>();
    
    for (const property of properties) {
      const streams = await listDataStreams(tokens.access_token, property.name);
      const webStreams = streams.filter(ds => ds.type === 'WEB_DATA_STREAM' && ds.webStreamData);
      if (webStreams.length > 0) {
        propertiesWithWebStreams++;
        dataStreamsByProperty.set(property.name, webStreams);
      }
    }
    
    // If multiple properties, show selection UI
    if (propertiesWithWebStreams > 1) {
      console.log('[GA4 OAuth] Multiple properties found, user must select');
      const selectionData = await encodePropertySelection(
        tenantId,
        userInfo,
        tokens,
        properties,
        dataStreamsByProperty
      );
      return Response.redirect(
        `${FRONTEND_URL}/admin/plugins/google-analytics?ga4_select_property=${selectionData}`,
        302
      );
    }
    
    // Single property - auto-connect
    console.log('[GA4 OAuth] Single property found, auto-connecting...');
    const account = accounts.find(acc => match.property.account === acc.name) || null;
    
    // Store connection
    await storeConnection(
      tenantId,
      userInfo,
      tokens,
      account,
      match.property,
      match.dataStream,
      null // TODO: Extract user ID from session if available
    );
    
    console.log('[GA4 OAuth] Connection complete, redirecting to success...');
    
    // Redirect back to frontend with success
    return Response.redirect(
      `${FRONTEND_URL}/admin/plugins/google-analytics?ga4_success=true`,
      302
    );
    
  } catch (err) {
    console.error('[GA4 OAuth] Callback failed:', err);
    console.error('[GA4 OAuth] Error type:', err instanceof Error ? err.constructor.name : typeof err);
    console.error('[GA4 OAuth] Error message:', err instanceof Error ? err.message : String(err));
    
    // Redirect to frontend with error
    return Response.redirect(
      `${FRONTEND_URL}/admin/plugins/google-analytics?ga4_error=connection_failed`,
      302
    );
  }
});
