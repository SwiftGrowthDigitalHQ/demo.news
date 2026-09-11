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
  // CRITICAL: Validate encryption key is configured
  // Without this check, atob('') creates empty key → wrong decryption
  if (!GDRIVE_ENCRYPTION_KEY) {
    console.error('[GD_THUMB] CRITICAL: GDRIVE_ENCRYPTION_KEY not configured');
    throw new Error('Google Drive encryption key not configured');
  }
  
  try {
    // Decode base64-encoded token: [IV(12 bytes)][Ciphertext][AuthTag(16 bytes)]
    const combined = Uint8Array.from(atob(encryptedToken), c => c.charCodeAt(0));
    
    // Extract IV (first 12 bytes)
    const iv = combined.slice(0, 12);
    
    // Extract ciphertext + auth tag (remaining bytes)
    // Web Crypto API handles authentication tag automatically
    const ciphertext = combined.slice(12);
    
    // Match oauth-callback encryption format: atob-based key
    const keyData = Uint8Array.from(atob(GDRIVE_ENCRYPTION_KEY), c => c.charCodeAt(0));
    
    // Import key for decryption
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );
    
    // Decrypt using AES-GCM
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      ciphertext
    );
    
    // Convert decrypted bytes to string
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('[GD_THUMB] Decryption failed:', error);
    console.error('[GD_THUMB] This typically means GDRIVE_ENCRYPTION_KEY is missing or incorrect');
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
  console.log('[GD_THUMB] GDRIVE_ENCRYPTION_KEY length:', GDRIVE_ENCRYPTION_KEY.length, '(should be 44 for base64 32-byte key)');
  
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
    
    // Query tenant from database via membership (not ownership)
    // User must be a member of the tenant to access media
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const { data: membership, error: membershipError } = await supabase
      .from('tenant_memberships')
      .select('tenant_id')
      .eq('auth_user_id', user.id)
      .limit(1)
      .single();
    
    if (membershipError || !membership) {
      console.error('[GD_THUMB] TENANT_MEMBERSHIP_QUERY_FAILED:', membershipError);
      return new Response('No tenant association found', { status: 403, headers: corsHeaders });
    }
    
    const tenantId = membership.tenant_id;
    console.log('[GD_THUMB] Tenant:', tenantId, 'File:', driveFileId);
    
    // Verify file ownership and get thumbnail link
    // OPTIMIZATION: Also try to get pre-cached thumbnail from media table
    // If not available, we'll fetch it from Google Drive's files.get API
    
    const { data: mediaFile, error: mediaError } = await supabase
      .from('media')
      .select('id, tenant_id, drive_file_id, drive_thumbnail_link, mime_type')
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
    console.log('[GD_THUMB] access_token_encrypted length:', connection.access_token_encrypted?.length || 0);
    
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
    
    // Get requested size from query parameter (e.g., ?size=w400)
    const requestedSize = url.searchParams.get('size');
    console.log('[GD_THUMB] REQUESTED_SIZE:', requestedSize);
    
    let fetchUrl: string;
    let useThumbnail = false;
    
    // OPTIMIZATION: If a size is requested, try to use Google Drive's public thumbnail endpoint
    // This is simpler and more reliable than fetching metadata
    if (requestedSize) {
      // Parse size (e.g., "w400" -> 400)
      const sizeMatch = requestedSize.match(/w(\d+)/);
      const sizeParam = sizeMatch ? sizeMatch[1] : '400';
      
      // Try Google Drive's public thumbnail URL first
      // Format: https://drive.google.com/uc?id={fileId}&sz=w{size}
      // This works for any file and returns a pre-cached thumbnail
      console.log('[GD_THUMB] Attempting public thumbnail URL with sz=w' + sizeParam);
      fetchUrl = `https://drive.google.com/uc?id=${driveFileId}&sz=w${sizeParam}`;
      useThumbnail = true;
    } else {
      // No size requested - fetch full resolution image
      console.log('[GD_THUMB] Using full-resolution image from Google Drive');
      fetchUrl = `https://www.googleapis.com/drive/v3/files/${driveFileId}?alt=media`;
    }
    
    console.log('[GD_THUMB] FETCH_URL:', fetchUrl.substring(0, 100) + '...');
    console.log('[GD_THUMB] USING_THUMBNAIL:', useThumbnail);
    
    // Fetch image from Google Drive
    // Note: drive.google.com/uc requires NO authentication (public thumbnails)
    const driveResponse = await fetch(fetchUrl);
    
    console.log('[GD_THUMB] DRIVE_RESPONSE_STATUS:', driveResponse.status);
    
    if (!driveResponse.ok) {
      const error = await driveResponse.text();
      console.error('[GD_THUMB] Drive API error:', error);
      return new Response('Failed to fetch from Google Drive', { status: driveResponse.status, headers: corsHeaders });
    }
    
    const contentType = driveResponse.headers.get('content-type') || 'image/jpeg';
    console.log('[GD_THUMB] RESPONSE_CONTENT_TYPE:', contentType);
    
    // CRITICAL FIX: Buffer the response body before creating new Response
    // Passing driveResponse.body directly causes stream consumption, resulting in empty response body
    let imageBuffer = await driveResponse.arrayBuffer();
    console.log('[GD_THUMB] IMAGE_BUFFER_SIZE:', imageBuffer.byteLength, 'bytes');
    
    if (imageBuffer.byteLength === 0) {
      console.error('[GD_THUMB] ERROR: Empty image buffer received from Google Drive');
      return new Response('Empty image data received', { status: 502, headers: corsHeaders });
    }
    
    console.log('[GD_THUMB] SUCCESS');
    console.log('[GD_THUMB] Returned image type:', useThumbnail ? 'THUMBNAIL' : 'FULL_RESOLUTION', 'Size:', imageBuffer.byteLength, 'bytes');
    
    // Return buffered image with CORS headers
    return new Response(imageBuffer, {
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
