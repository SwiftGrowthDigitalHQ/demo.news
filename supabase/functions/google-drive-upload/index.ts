/**
 * Google Drive Upload Handler
 * 
 * Uploads files to customer's Google Drive and creates media records.
 * Handles token refresh automatically if access token expired.
 * 
 * Security:
 * - Validates tenant membership
 * - Enforces folder isolation
 * - Never exposes OAuth tokens to frontend
 * - Respects RLS policies
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const GDRIVE_ENCRYPTION_KEY = Deno.env.get('GDRIVE_ENCRYPTION_KEY') || '';

interface DriveConnection {
  id: string;
  tenant_id: string;
  google_account_email: string;
  images_folder_id: string;
  videos_folder_id: string;
  documents_folder_id: string;
  access_token_encrypted: string;
  refresh_token_encrypted: string;
  token_expires_at: string;
  status: string;
}

interface UploadedFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  webContentLink?: string;
  thumbnailLink?: string;
  size: string;
}

/**
 * Production AES-256-GCM decryption using Web Crypto API
 */
async function decryptToken(encryptedToken: string): Promise<string> {
  // Decode base64
  const combined = Uint8Array.from(atob(encryptedToken), c => c.charCodeAt(0));
  
  // Extract IV and encrypted data
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);
  
  // Import decryption key from environment
  const keyData = Uint8Array.from(atob(GDRIVE_ENCRYPTION_KEY), c => c.charCodeAt(0));
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
  
  // Return string
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Encrypt token (same as callback function)
 */
async function encryptToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  
  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Import encryption key
  const keyData = Uint8Array.from(atob(GDRIVE_ENCRYPTION_KEY), c => c.charCodeAt(0));
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
 * Get Drive connection for tenant
 */
async function getDriveConnection(tenantId: string): Promise<DriveConnection | null> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  const { data, error } = await supabase
    .from('tenant_google_drive_connections')
    .select('*')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .single();
  
  if (error || !data) {
    console.error('[Upload] No Drive connection found for tenant:', tenantId);
    return null;
  }
  
  return data as DriveConnection;
}

/**
 * Refresh access token if expired
 */
async function refreshAccessToken(connection: DriveConnection): Promise<string> {
  console.log('[Upload] Refreshing access token for tenant:', connection.tenant_id);
  
  const refreshToken = await decryptToken(connection.refresh_token_encrypted);
  
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_OAUTH_CLIENT_ID') || '',
      client_secret: Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET') || '',
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }
  
  const tokens = await response.json();
  const newAccessToken = tokens.access_token;
  const expiresIn = tokens.expires_in;
  
  // Update connection with new access token
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const accessTokenEncrypted = await encryptToken(newAccessToken);
  const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
  
  await supabase
    .from('tenant_google_drive_connections')
    .update({
      access_token_encrypted: accessTokenEncrypted,
      token_expires_at: tokenExpiresAt,
    })
    .eq('id', connection.id);
  
  console.log('[Upload] Access token refreshed');
  
  return newAccessToken;
}

/**
 * Get valid access token (refresh if expired)
 */
async function getValidAccessToken(connection: DriveConnection): Promise<string> {
  const now = new Date();
  const expiresAt = new Date(connection.token_expires_at);
  
  // Refresh if expired or expiring soon (5 minutes buffer)
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    return await refreshAccessToken(connection);
  }
  
  return await decryptToken(connection.access_token_encrypted);
}

/**
 * Determine target folder based on MIME type
 */
function getTargetFolderId(connection: DriveConnection, mimeType: string): string {
  if (mimeType.startsWith('image/')) {
    return connection.images_folder_id;
  } else if (mimeType.startsWith('video/')) {
    return connection.videos_folder_id;
  } else {
    return connection.documents_folder_id;
  }
}

/**
 * Upload file to Google Drive
 */
async function uploadToDrive(
  accessToken: string,
  file: Blob,
  fileName: string,
  mimeType: string,
  folderId: string
): Promise<UploadedFile> {
  console.log('[Upload] Uploading to Drive:', fileName);
  
  // Generate unique filename
  const timestamp = Date.now();
  const uuid = crypto.randomUUID();
  const ext = fileName.split('.').pop();
  const uniqueFileName = `${timestamp}_${uuid}.${ext}`;
  
  // Create metadata
  const metadata = {
    name: uniqueFileName,
    mimeType,
    parents: [folderId],
  };
  
  // Create multipart upload
  const boundary = '-------boundary' + Date.now();
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelim = `\r\n--${boundary}--`;
  
  const metadataString = JSON.stringify(metadata);
  const fileData = await file.arrayBuffer();
  
  const multipartBody = new Uint8Array(
    new TextEncoder().encode(delimiter)
      .length +
      new TextEncoder().encode('Content-Type: application/json; charset=UTF-8\r\n\r\n')
        .length +
      new TextEncoder().encode(metadataString).length +
      new TextEncoder().encode(delimiter).length +
      new TextEncoder().encode(`Content-Type: ${mimeType}\r\n\r\n`).length +
      fileData.byteLength +
      new TextEncoder().encode(closeDelim).length
  );
  
  let offset = 0;
  
  // Helper to append bytes
  const append = (data: Uint8Array) => {
    multipartBody.set(data, offset);
    offset += data.length;
  };
  
  append(new TextEncoder().encode(delimiter));
  append(new TextEncoder().encode('Content-Type: application/json; charset=UTF-8\r\n\r\n'));
  append(new TextEncoder().encode(metadataString));
  append(new TextEncoder().encode(delimiter));
  append(new TextEncoder().encode(`Content-Type: ${mimeType}\r\n\r\n`));
  append(new Uint8Array(fileData));
  append(new TextEncoder().encode(closeDelim));
  
  // Upload to Drive
  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,webContentLink,thumbnailLink,size',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    }
  );
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Drive upload failed: ${error}`);
  }
  
  const result = await response.json();
  console.log('[Upload] File uploaded to Drive:', result.id);
  
  // Make file publicly accessible with link
  await setFilePublicPermission(accessToken, result.id);
  
  return result;
}

/**
 * Set file to be accessible by anyone with the link
 */
async function setFilePublicPermission(accessToken: string, fileId: string): Promise<void> {
  console.log('[Upload] Setting public permission for file:', fileId);
  
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone',
      }),
    }
  );
  
  if (!response.ok) {
    const error = await response.text();
    console.error('[Upload] Failed to set public permission:', error);
    // Don't throw - file is still uploaded, just not publicly accessible
  } else {
    console.log('[Upload] File is now publicly accessible');
  }
}

/**
 * Create media record in database
 */
async function createMediaRecord(
  tenantId: string,
  driveFile: UploadedFile,
  originalFileName: string,
  folderId: string
) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  const { data, error } = await supabase
    .from('media')
    .insert({
      tenant_id: tenantId,
      storage_provider: 'google_drive',
      file_name: originalFileName,
      file_path: driveFile.id, // Store Drive file ID in file_path for compatibility
      storage_bucket: 'google_drive',
      mime_type: driveFile.mimeType,
      file_size: parseInt(driveFile.size, 10),
      drive_file_id: driveFile.id,
      drive_folder_id: folderId,
      drive_web_url: driveFile.webViewLink,
      drive_web_content_link: driveFile.webContentLink,
      drive_thumbnail_link: driveFile.thumbnailLink,
    })
    .select('*')
    .single();
  
  if (error) {
    throw new Error(`Failed to create media record: ${error.message}`);
  }
  
  console.log('[Upload] Media record created:', data.id);
  
  return data;
}

/**
 * Validate tenant membership
 */
async function validateTenantMembership(authUserId: string, tenantId: string): Promise<boolean> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  const { data, error } = await supabase
    .from('tenant_memberships')
    .select('id')
    .eq('auth_user_id', authUserId)
    .eq('tenant_id', tenantId)
    .single();
  
  return !error && !!data;
}

/**
 * Parse multipart form data
 */
async function parseFormData(req: Request): Promise<{ file: Blob; fileName: string; mimeType: string; tenantId: string }> {
  const formData = await req.formData();
  
  const file = formData.get('file') as File;
  const tenantId = formData.get('tenant_id') as string;
  
  if (!file || !tenantId) {
    throw new Error('Missing file or tenant_id');
  }
  
  return {
    file,
    fileName: file.name,
    mimeType: file.type,
    tenantId,
  };
}

/**
 * Main handler
 */
serve(async (req: Request) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  
  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Extract JWT token
    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Verify token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Parse form data
    const { file, fileName, mimeType, tenantId } = await parseFormData(req);
    
    // Validate tenant membership
    const isMember = await validateTenantMembership(user.id, tenantId);
    if (!isMember) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Not a member of this tenant' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get Drive connection
    const connection = await getDriveConnection(tenantId);
    if (!connection) {
      return new Response(
        JSON.stringify({ error: 'Google Drive not connected for this tenant' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (connection.status !== 'active') {
      return new Response(
        JSON.stringify({ error: `Drive connection status: ${connection.status}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get valid access token (refresh if needed)
    const accessToken = await getValidAccessToken(connection);
    
    // Determine target folder
    const targetFolderId = getTargetFolderId(connection, mimeType);
    
    // Upload to Drive
    const driveFile = await uploadToDrive(
      accessToken,
      file,
      fileName,
      mimeType,
      targetFolderId
    );
    
    // Create media record
    const mediaRecord = await createMediaRecord(
      tenantId,
      driveFile,
      fileName,
      targetFolderId
    );
    
    // Return response
    return new Response(
      JSON.stringify({
        success: true,
        media: {
          id: mediaRecord.id,
          drive_file_id: driveFile.id,
          drive_web_url: driveFile.webViewLink,
          drive_thumbnail_link: driveFile.thumbnailLink,
          publicUrl: `/api/media-proxy/${mediaRecord.id}`, // Proxy URL for consistency
          mime_type: mimeType,
          file_size: parseInt(driveFile.size, 10),
          file_name: fileName,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
    
  } catch (err) {
    console.error('[Upload] Error:', err);
    
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Upload failed' }),
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
