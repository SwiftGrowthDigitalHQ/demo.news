/**
 * Media Proxy - Serves Google Drive images publicly using server-side authentication
 * 
 * Proxies media files from Google Drive using stored tenant credentials.
 * Allows public article pages to display private Google Drive images.
 * 
 * Usage: /media-proxy/{GOOGLE_DRIVE_FILE_ID}
 * 
 * Security:
 * - Only serves files referenced in articles or media table
 * - Uses tenant's Google Drive credentials server-side
 * - Never exposes access tokens to client
 * - Validates file authorization before serving
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const GDRIVE_ENCRYPTION_KEY = Deno.env.get('GDRIVE_ENCRYPTION_KEY') || '';

interface DriveConnection {
  access_token_encrypted: string;
  refresh_token_encrypted: string;
  token_expires_at: string;
}

async function decryptToken(encryptedToken: string): Promise<string> {
  const combined = Uint8Array.from(atob(encryptedToken), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);
  
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
    encrypted
  );
  
  return new TextDecoder().decode(decrypted);
}

async function encryptToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const keyData = Uint8Array.from(atob(GDRIVE_ENCRYPTION_KEY), c => c.charCodeAt(0));
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

async function refreshAccessToken(connection: DriveConnection, tenantId: string): Promise<string> {
  const refreshToken = await decryptToken(connection.refresh_token_encrypted);
  
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_OAUTH_CLIENT_ID') || '',
      client_secret: Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET') || '',
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Token refresh failed: ${await response.text()}`);
  }
  
  const tokens = await response.json();
  const newAccessToken = tokens.access_token;
  const expiresIn = tokens.expires_in;
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const accessTokenEncrypted = await encryptToken(newAccessToken);
  const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
  
  await supabase
    .from('tenant_google_drive_connections')
    .update({
      access_token_encrypted: accessTokenEncrypted,
      token_expires_at: tokenExpiresAt,
    })
    .eq('tenant_id', tenantId);
  
  return newAccessToken;
}

async function getValidAccessToken(connection: DriveConnection, tenantId: string): Promise<string> {
  const now = new Date();
  const expiresAt = new Date(connection.token_expires_at);
  
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    return await refreshAccessToken(connection, tenantId);
  }
  
  return await decryptToken(connection.access_token_encrypted);
}

serve(async (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  
  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const fileId = pathParts[pathParts.length - 1];
    
    if (!fileId) {
      return new Response(
        JSON.stringify({ error: 'File ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('[Media Proxy] Fetching file:', fileId);
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Try to find file in media table first
    const { data: media } = await supabase
      .from('media')
      .select('tenant_id, mime_type')
      .eq('drive_file_id', fileId)
      .single();
    
    let tenantId: string;
    let mimeType: string | null = null;
    
    if (media) {
      tenantId = media.tenant_id;
      mimeType = media.mime_type;
    } else {
      // Not in media table - check if it's referenced in articles
      const { data: articles } = await supabase
        .from('articles')
        .select('tenant_id')
        .like('featured_image', `%${fileId}%`)
        .limit(1);
      
      if (!articles || articles.length === 0) {
        return new Response(
          JSON.stringify({ error: 'File not authorized' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      tenantId = articles[0].tenant_id;
    }
    
    // Get Drive connection for this tenant
    const { data: connection, error: connError } = await supabase
      .from('tenant_google_drive_connections')
      .select('access_token_encrypted, refresh_token_encrypted, token_expires_at')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single();
    
    if (connError || !connection) {
      console.error('[Media Proxy] No Drive connection:', connError);
      return new Response(
        JSON.stringify({ error: 'Drive connection not found' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get valid access token (refresh if needed)
    const accessToken = await getValidAccessToken(connection as DriveConnection, tenantId);
    
    // Fetch file from Google Drive
    console.log('[Media Proxy] Fetching from Drive API...');
    const driveResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );
    
    if (!driveResponse.ok) {
      const errorText = await driveResponse.text();
      console.error('[Media Proxy] Drive fetch failed:', driveResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch from Drive', details: errorText }),
        { status: driveResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Determine content type
    const contentType = mimeType || driveResponse.headers.get('content-type') || 'image/jpeg';
    
    console.log('[Media Proxy] Success! Streaming file, Content-Type:', contentType);
    
    // Stream the file with appropriate headers
    const headers = new Headers(corsHeaders);
    headers.set('Content-Type', contentType);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    
    return new Response(driveResponse.body, {
      status: 200,
      headers,
    });
    
  } catch (err) {
    console.error('[Media Proxy] Error:', err);
    
    return new Response(
      JSON.stringify({ 
        error: err instanceof Error ? err.message : 'Proxy failed',
        stack: err instanceof Error ? err.stack : undefined
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
