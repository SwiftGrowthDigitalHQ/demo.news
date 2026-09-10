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
  
  // Decrypt key using base64 format (must match oauth-callback)
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
  
  // Import key using base64 format (must match oauth-callback)
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
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
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
      .eq('deleted_at', null)
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
      
      if (articles && articles.length > 0) {
        tenantId = articles[0].tenant_id;
      } else {
        // Not in articles - check if it's in site_settings (logo or favicon)
        const { data: settings } = await supabase
          .from('site_settings')
          .select('tenant_id, logo_url, theme_config')
          .is('deleted_at', null)
          .limit(1000);
        
        // Find tenant where this fileId is used in logo_url or favicon_url
        let foundTenantId: string | null = null;
        if (settings) {
          for (const setting of settings) {
            const logoMatch = setting.logo_url && setting.logo_url.includes(fileId);
            const faviconMatch = setting.theme_config && 
              typeof setting.theme_config === 'object' && 
              'favicon' in setting.theme_config &&
              String(setting.theme_config.favicon).includes(fileId);
            
            if (logoMatch || faviconMatch) {
              foundTenantId = setting.tenant_id;
              break;
            }
          }
        }
        
        // If not found in site_settings, check tenant_footer_settings (which stores footer_logo_url)
        if (!foundTenantId) {
          const { data: footerSettings } = await supabase
            .from('tenant_footer_settings')
            .select('tenant_id, logo_url, footer_logo_url')
            .is('deleted_at', null)
            .limit(1000);
          
          if (footerSettings) {
            for (const setting of footerSettings) {
              const logoMatch = setting.logo_url && setting.logo_url.includes(fileId);
              const footerLogoMatch = setting.footer_logo_url && setting.footer_logo_url.includes(fileId);
              
              if (logoMatch || footerLogoMatch) {
                foundTenantId = setting.tenant_id;
                break;
              }
            }
          }
        }
        
        if (!foundTenantId) {
          return new Response(
            JSON.stringify({ error: 'File not authorized' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        tenantId = foundTenantId;
      }
    }
    
    // Get Drive connection for this tenant
    const { data: connection, error: connError } = await supabase
      .from('tenant_google_drive_connections')
      .select('access_token_encrypted, refresh_token_encrypted, token_expires_at')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .is('deleted_at', null)
      .single();
    
    if (connError || !connection) {
      console.log('[Media Proxy] No Drive connection, serving placeholder');
      
      // Return a transparent PNG placeholder bytes instead of 302 redirect.
      // This prevents the browser from making direct CORS requests to
      // drive.google.com/thumbnail, which fails with NetworkError/CORS errors
      // for private files. The placeholder ensures logo/favicon slots
      // always display something instead of "Unable to load image".
      // Decodes the base64 PNG to actual binary bytes (same pattern used
      // elsewhere in this file for token decryption).
      const placeholderPngBytes = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/5+hHgAFgwJ/l5Y6AAAAAElFTkSuQmCC'), c => c.charCodeAt(0));
      
      return new Response(placeholderPngBytes, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=31536000, immutable'
        }
      });
    }
    
    // Get valid access token (refresh if needed)
    let accessToken: string;
    try {
      accessToken = await getValidAccessToken(connection as DriveConnection, tenantId);
    } catch (tokenErr) {
      console.log('[Media Proxy] Token refresh failed, serving placeholder');
      
      // Return a transparent PNG placeholder bytes instead of 302 redirect.
      // This prevents the browser from making direct CORS requests to
      // drive.google.com/thumbnail, which fails with NetworkError/CORS errors
      // for private files. The placeholder ensures logo/favicon slots
      // always display something instead of "Unable to load image".
      // Decodes the base64 PNG to actual binary bytes (same pattern used
      // elsewhere in this file for token decryption).
      const placeholderPngBytes = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/5+hHgAFgwJ/l5Y6AAAAAElFTkSuQmCC'), c => c.charCodeAt(0));
      
      return new Response(placeholderPngBytes, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=31536000, immutable'
        }
      });
    }
    
    // Fetch file from Google Drive
    console.log('[Media Proxy] Fetching from Drive API with auth...');
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
    
    // CRITICAL FIX: Buffer the response body before creating new Response
    // Passing driveResponse.body directly causes stream consumption, resulting in empty response body
    const fileBuffer = await driveResponse.arrayBuffer();
    console.log('[Media Proxy] File buffer size:', fileBuffer.byteLength, 'bytes');
    
    if (fileBuffer.byteLength === 0) {
      console.error('[Media Proxy] ERROR: Empty file buffer received from Google Drive');
      return new Response(
        JSON.stringify({ error: 'Empty file data received from Google Drive' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('[Media Proxy] Success! Returning file, Content-Type:', contentType);
    
    // Return buffered file with appropriate headers
    const headers = new Headers(corsHeaders);
    headers.set('Content-Type', contentType);
    // Cache images for 1 year since they're immutable
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('ETag', `"${fileId}"`);
    
    return new Response(fileBuffer, {
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
          'Cache-Control': 'public, max-age=3600', // Cache errors for 1 hour
        },
      }
    );
  }
});
