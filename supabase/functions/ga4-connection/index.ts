/**
 * GA4 Connection Management
 * 
 * Handles GA4 connection operations:
 * - GET /status: Get current connection status
 * - POST /sync: Refresh property/data stream information
 * - POST /disconnect: Remove GA4 connection
 * 
 * Security:
 * - Requires JWT authentication (authenticated admin user)
 * - Validates tenant membership
 * - Manages OAuth token refresh
 * - Never exposes tokens to frontend
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const GOOGLE_OAUTH_CLIENT_ID = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID') || '';
const GOOGLE_OAUTH_CLIENT_SECRET = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET') || '';
const GA4_ENCRYPTION_KEY = Deno.env.get('GA4_ENCRYPTION_KEY') || '';
const FRONTEND_URL = Deno.env.get('SITE_URL') || 'http://localhost:5173';

/**
 * AES-256-GCM decryption using Web Crypto API
 */
async function decryptToken(encryptedToken: string): Promise<string> {
  const combined = Uint8Array.from(atob(encryptedToken), c => c.charCodeAt(0));
  
  // Extract IV and encrypted data
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);
  
  // Import encryption key
  const keyData = Uint8Array.from(atob(GA4_ENCRYPTION_KEY), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
  
  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encrypted
  );
  
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
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
 * Get tenant ID from authenticated user
 */
async function getTenantIdFromAuth(authToken: string): Promise<string | null> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  const { data: { user }, error } = await supabase.auth.getUser(authToken);
  if (error || !user) {
    console.error('[GA4 Connection] Auth error:', error);
    return null;
  }
  
  // Get user's tenant membership
  const { data } = await supabase
    .from('tenant_memberships')
    .select('tenant_id')
    .eq('auth_user_id', user.id)
    .limit(1)
    .single();
  
  return data?.tenant_id || null;
}

/**
 * Refresh access token using refresh token
 */
async function refreshAccessToken(refreshToken: string): Promise<{ 
  access_token: string; 
  expires_in: number;
}> {
  console.log('[GA4 Connection] Refreshing access token...');
  
  const tokenUrl = 'https://oauth2.googleapis.com/token';
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: GOOGLE_OAUTH_CLIENT_ID,
      client_secret: GOOGLE_OAUTH_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    console.error('[GA4 Connection] Token refresh failed:', error);
    throw new Error('Failed to refresh access token');
  }
  
  const tokenData = await response.json();
  console.log('[GA4 Connection] Access token refreshed successfully');
  
  return {
    access_token: tokenData.access_token,
    expires_in: tokenData.expires_in,
  };
}

/**
 * Get valid access token (refresh if needed)
 */
async function getValidAccessToken(connectionId: string, tenantId: string): Promise<string> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  // Get connection with tokens
  const { data: connection, error } = await supabase
    .from('ga4_connections')
    .select('access_token_encrypted, refresh_token_encrypted, token_expires_at')
    .eq('id', connectionId)
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .single();
  
  if (error || !connection) {
    throw new Error('Connection not found');
  }
  
  // Check if token is expired or will expire soon (within 5 minutes)
  const expiresAt = new Date(connection.token_expires_at);
  const now = new Date();
  const fiveMinutes = 5 * 60 * 1000;
  
  if (expiresAt.getTime() - now.getTime() > fiveMinutes) {
    // Token still valid, decrypt and return
    console.log('[GA4 Connection] Using existing access token');
    return await decryptToken(connection.access_token_encrypted);
  }
  
  // Token expired or expiring soon, refresh it
  console.log('[GA4 Connection] Access token expired, refreshing...');
  const refreshToken = await decryptToken(connection.refresh_token_encrypted);
  const newTokens = await refreshAccessToken(refreshToken);
  
  // Encrypt and store new access token
  const newAccessTokenEncrypted = await encryptToken(newTokens.access_token);
  const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000).toISOString();
  
  await supabase
    .from('ga4_connections')
    .update({
      access_token_encrypted: newAccessTokenEncrypted,
      token_expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', connectionId);
  
  console.log('[GA4 Connection] New access token stored');
  
  return newTokens.access_token;
}

/**
 * Sync GA4 property information
 */
async function syncProperty(tenantId: string): Promise<any> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  // Get connection
  const { data: connection, error: connError } = await supabase
    .from('ga4_connections')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .single();
  
  if (connError || !connection) {
    throw new Error('No active connection found');
  }
  
  // Get valid access token
  const accessToken = await getValidAccessToken(connection.id, tenantId);
  
  // Fetch updated property info
  console.log('[GA4 Connection] Fetching property info:', connection.property_id);
  
  const propertyUrl = `https://analyticsadmin.googleapis.com/v1beta/${connection.property_id}`;
  const propertyResponse = await fetch(propertyUrl, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  
  if (!propertyResponse.ok) {
    const errorBody = await propertyResponse.text();
    console.error('[GA4 Connection] Failed to fetch property:', errorBody);
    throw new Error('Failed to fetch property information');
  }
  
  const propertyData = await propertyResponse.json();
  
  // Fetch updated data stream info
  console.log('[GA4 Connection] Fetching data stream info:', connection.data_stream_id);
  
  const streamUrl = `https://analyticsadmin.googleapis.com/v1beta/${connection.data_stream_id}`;
  const streamResponse = await fetch(streamUrl, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  
  if (!streamResponse.ok) {
    const errorBody = await streamResponse.text();
    console.error('[GA4 Connection] Failed to fetch data stream:', errorBody);
    throw new Error('Failed to fetch data stream information');
  }
  
  const streamData = await streamResponse.json();
  
  // Update connection with fresh data
  const { error: updateError } = await supabase
    .from('ga4_connections')
    .update({
      property_display_name: propertyData.displayName,
      data_stream_name: streamData.displayName,
      data_stream_url: streamData.webStreamData?.defaultUri,
      measurement_id: streamData.webStreamData?.measurementId,
      last_sync_at: new Date().toISOString(),
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', connection.id);
  
  if (updateError) {
    throw new Error(`Failed to update connection: ${updateError.message}`);
  }
  
  console.log('[GA4 Connection] Property synced successfully');
  
  return {
    success: true,
    property_name: propertyData.displayName,
    measurement_id: streamData.webStreamData?.measurementId,
    synced_at: new Date().toISOString(),
  };
}

/**
 * Disconnect GA4
 */
async function disconnectGA4(tenantId: string): Promise<void> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  // Soft delete connection
  const { error } = await supabase
    .from('ga4_connections')
    .update({
      status: 'disconnected',
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', tenantId)
    .eq('status', 'active');
  
  if (error) {
    throw new Error(`Failed to disconnect: ${error.message}`);
  }
  
  console.log('[GA4 Connection] Disconnected successfully for tenant:', tenantId);
}

/**
 * Main handler
 */
serve(async (req: Request) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': FRONTEND_URL,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
  
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }
  
  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const authToken = authHeader.replace('Bearer ', '');
    
    // Get tenant ID from auth
    const tenantId = await getTenantIdFromAuth(authToken);
    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: 'Tenant not found' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Parse URL to get action
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const action = pathParts[pathParts.length - 1];
    
    // GET /status - Get connection status
    if (req.method === 'GET' && action === 'status') {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      const { data: connection } = await supabase
        .from('ga4_connections')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('status', 'active')
        .maybeSingle();
      
      if (!connection) {
        return new Response(
          JSON.stringify({ connected: false, connection: null }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Return safe connection data (without tokens)
      return new Response(
        JSON.stringify({
          connected: true,
          connection: {
            id: connection.id,
            google_account_email: connection.google_account_email,
            analytics_account_name: connection.analytics_account_name,
            property_name: connection.property_name,
            property_display_name: connection.property_display_name,
            data_stream_url: connection.data_stream_url,
            measurement_id: connection.measurement_id,
            status: connection.status,
            last_sync_at: connection.last_sync_at,
            last_error: connection.last_error,
          },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // POST /sync - Sync property information
    if (req.method === 'POST' && action === 'sync') {
      const result = await syncProperty(tenantId);
      
      return new Response(
        JSON.stringify(result),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // POST /disconnect - Disconnect GA4
    if (req.method === 'POST' && action === 'disconnect') {
      await disconnectGA4(tenantId);
      
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Unknown action
    return new Response(
      JSON.stringify({ error: 'Unknown action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (err) {
    console.error('[GA4 Connection] Error:', err);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: err instanceof Error ? err.message : String(err)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
