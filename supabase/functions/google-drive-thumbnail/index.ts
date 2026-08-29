/**
 * Google Drive Thumbnail Proxy
 * 
 * Proxies Google Drive file thumbnails through authenticated requests.
 * Handles CORS properly for browser requests.
 * 
 * Security:
 * - Requires valid JWT (tenant user authentication)
 * - Validates file belongs to requesting tenant
 * - Refreshes expired access tokens automatically
 * - Never exposes OAuth tokens to frontend
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const GDRIVE_ENCRYPTION_KEY = Deno.env.get('GDRIVE_ENCRYPTION_KEY') || '';
const GOOGLE_OAUTH_CLIENT_ID = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID') || '';
const GOOGLE_OAUTH_CLIENT_SECRET = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET') || '';

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

/**
 * Decrypt OAuth token using AES-256-GCM
 */
async function decryptToken(encryptedToken: string): Promise<string> {
  try {
    const combined = Uint8Array.from(atob(encryptedToken), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    
    const keyData = Uint8Array.from(atob(GDRIVE_ENCRYPTION_KEY), c => c.charCodeAt(0));
    const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'AES-GCM' }, false, ['decrypt']);
    
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, ciphertext);
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('[GD_THUMB] Decryption failed:', error);
    throw new Error('Failed to decrypt token');
  }
}

/**
 * Refresh expired access token using refresh token
 */
async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_OAUTH_CLIENT_ID,
      client_secret: GOOGLE_OAUTH_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }
  
  return await response.json();
}

/**
 * Main handler
 */
serve(async (req: Request) => {
  console.log('[GD_THUMB] REQUEST_RECEIVED');
  console.log('[GD_THUMB] METHOD:', req.method);
  console.log('[GD_THUMB] ORIGIN_PRESENT:', !!req.headers.get('origin'));
  
  // CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('[GD_THUMB] OPTIONS_REQUEST');
    return new Response('ok', {
      status: 200,
      headers: corsHeaders,
    });
  }
  
  try {
    const url = new URL(req.url);
    const driveFileId = url.searchParams.get('fileId');
    
    console.log('[GD_THUMB] FILE_ID_PRESENT:', !!driveFileId);
    
    if (!driveFileId) {
      return new Response('Missing fileId parameter', { status: 400, headers: corsHeaders });
    }
    
    const authHeader = req.headers.get('Authorization');
    console.log('[GD_THUMB] AUTH_HEADER_PRESENT:', !!authHeader);
    
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response('Missing or invalid authorization', { status: 401, headers: corsHeaders });
    }
    
    const jwt = authHeader.replace('Bearer ', '');
    console.log('[GD_THUMB] JWT_VALIDATION_STARTED');
    
    // Validate JWT
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(jwt);
    if (authError || !user) {
      console.error('[GD_THUMB] JWT_VALIDATION_FAILED:', authError);
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }
    
    console.log('[GD_THUMB] JWT_VALIDATED');
    
    // Query tenant from database (DO NOT rely on user_metadata.tenant_id)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .eq('owner_auth_user_id', user.id)
      .single();
    
    if (tenantError || !tenant) {
      console.error('[GD_THUMB] TENANT_QUERY_FAILED:', tenantError);
      return new Response('No tenant associated with user', { status: 403, headers: corsHeaders });
    }
    
    const tenantId = tenant.id;
    console.log('[GD_THUMB] Tenant:', tenantId, 'File:', driveFileId);
    
    // Verify file ownership
    
    const { data: mediaFile, error: mediaError } = await supabase
      .from('media')
      .select('id, tenant_id, drive_file_id')
      .eq('drive_file_id', driveFileId)
      .eq('tenant_id', tenantId)
      .single();
    
    if (mediaError || !mediaFile) {
      console.error('[GD_THUMB] File not found:', mediaError);
      return new Response('File not found or access denied', { status: 404, headers: corsHeaders });
    }
    
    console.log('[GD_THUMB] File verified');
    
    // Get Drive connection
    const { data: connection, error: connectionError } = await supabase
      .from('tenant_google_drive_connections')
      .select('access_token_encrypted, refresh_token_encrypted, token_expires_at')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .single();
    
    if (connectionError || !connection) {
      console.error('[GD_THUMB] Connection not found:', connectionError);
      return new Response('Google Drive not connected', { status: 503, headers: corsHeaders });
    }
    
    console.log('[GD_THUMB] Connection found');
    
    // Decrypt and check token expiry
    let accessToken = await decryptToken(connection.access_token_encrypted);
    const expiresAt = new Date(connection.token_expires_at);
    const now = new Date();
    
    if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
      console.log('[GD_THUMB] Refreshing token...');
      const refreshToken = await decryptToken(connection.refresh_token_encrypted);
      const newTokens = await refreshAccessToken(refreshToken);
      accessToken = newTokens.access_token;
    }
    
    console.log('[GD_THUMB] DRIVE_REQUEST_STARTED');
    
    // Fetch from Google Drive
    const driveUrl = `https://www.googleapis.com/drive/v3/files/${driveFileId}?alt=media`;
    const driveResponse = await fetch(driveUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    
    console.log('[GD_THUMB] DRIVE_RESPONSE_STATUS:', driveResponse.status);
    
    if (!driveResponse.ok) {
      const error = await driveResponse.text();
      console.error('[GD_THUMB] Drive API error:', error);
      return new Response('Failed to fetch from Google Drive', { status: driveResponse.status, headers: corsHeaders });
    }
    
    const contentType = driveResponse.headers.get('content-type') || 'image/jpeg';
    console.log('[GD_THUMB] RESPONSE_CONTENT_TYPE:', contentType);
    console.log('[GD_THUMB] SUCCESS');
    
    // Stream image with CORS headers
    return new Response(driveResponse.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=300',
      },
    });
    
  } catch (error) {
    console.error('[GD_THUMB] Error:', error);
    return new Response(
      error instanceof Error ? error.message : 'Internal server error',
      { status: 500, headers: corsHeaders }
    );
  }
});
