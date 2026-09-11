/**
 * Google Drive Thumbnail Proxy
 * 
 * NOTE: P0 KNOWN LIMITATION
 * Current environment (Supabase Edge Functions on Deno) lacks image processing capabilities.
 * This function currently returns FULL RESOLUTION images instead of thumbnails.
 * 
 * Root causes:
 * - Google Drive /uc?id=...&sz=w400 endpoint ignores size parameter (returns full res)
 * - Google Drive thumbnailLink also returns full resolution
 * - Supabase Edge Functions (Deno) have no native image libraries
 * - WASM image libraries (Squoosh) not compatible in this environment
 * 
 * P0 Status: FAIL
 * Current: 2,766,898 bytes
 * Required: < 300,000 bytes (~90% reduction needed)
 * 
 * Solution paths:
 * 1. Implement Squoosh WASM (compatible but adds latency)
 * 2. Stream through external CDN with resizing (imgix, Cloudinary, etc)
 * 3. Migrate platform to one with image processing (Vercel, AWS Lambda, GCP)
 * 
 * This function proxies Google Drive images through authenticated requests.
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

/**
 * IMPLEMENTATION ATTEMPT: Use imgix for server-side image resizing
 * 
 * Strategy:
 * 1. Pass full-resolution Google Drive URL through imgix CDN for resizing
 * 2. imgix is a proven image optimization service (no setup required, free tier available)
 * 3. Cache resized version in browser with Cache-Control headers
 * 
 * This workaround adds ~100ms latency but achieves < 300KB thumbnails
 */

async function getResizedImageViaImgix(
  imageUrl: string,
  width: number = 400
): Promise<Response | null> {
  try {
    // imgix free tier (limited but works for POC)
    // Note: This requires imgix account - NOT VIABLE without setup
    console.log('[GD_THUMB] imgix resizing not configured (requires account setup)');
    return null;
  } catch (error) {
    console.error('[GD_THUMB] imgix attempt failed:', error);
    return null;
  }
}

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
  if (!GDRIVE_ENCRYPTION_KEY) {
    console.error('[GD_THUMB] CRITICAL: GDRIVE_ENCRYPTION_KEY not configured');
    throw new Error('Google Drive encryption key not configured');
  }
  
  try {
    const combined = Uint8Array.from(atob(encryptedToken), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const keyData = Uint8Array.from(atob(GDRIVE_ENCRYPTION_KEY), c => c.charCodeAt(0));
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      ciphertext
    );
    
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
    
    // Query tenant from database via membership
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
    
    // Verify file ownership
    const { data: mediaFile, error: mediaError } = await supabase
      .from('media')
      .select('id, tenant_id, drive_file_id, mime_type')
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
    
    // Fetch full resolution image from authenticated API
    const fetchUrl = `https://www.googleapis.com/drive/v3/files/${driveFileId}?alt=media`;
    console.log('[GD_THUMB] FETCH_URL: Google Drive API (authenticated)');
    
    const driveResponse = await fetch(fetchUrl, {
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
    
    // Buffer the response body
    let imageBuffer = await driveResponse.arrayBuffer();
    console.log('[GD_THUMB] FETCHED_IMAGE_SIZE:', imageBuffer.byteLength, 'bytes');
    
    if (imageBuffer.byteLength === 0) {
      console.error('[GD_THUMB] ERROR: Empty image buffer received from Google Drive');
      return new Response('Empty image data received', { status: 502, headers: corsHeaders });
    }
    
    // P0 STATUS: FAIL - Cannot resize in current environment
    console.log('[GD_THUMB] P0_STATUS: FAIL - Returning full resolution image');
    console.log('[GD_THUMB] Reason: Supabase Edge Functions lack image processing');
    console.log('[GD_THUMB] Expected:', '< 300 KB');
    console.log('[GD_THUMB] Actual:', imageBuffer.byteLength, 'bytes');
    
    // Return original image with warning headers
    return new Response(imageBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=300',
        'X-Thumbnail-Status': 'FAIL - Original image returned, resizing not implemented',
        'X-Expected-Size': '< 300 KB',
        'X-Actual-Size': imageBuffer.byteLength.toString(),
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

