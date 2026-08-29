/**
 * Google Drive File Delete Handler
 * 
 * Deletes files from customer's Google Drive and soft-deletes media records.
 * 
 * Security:
 * - Validates tenant membership
 * - Validates media ownership
 * - Never allows cross-tenant deletion
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const GDRIVE_ENCRYPTION_KEY = Deno.env.get('GDRIVE_ENCRYPTION_KEY') || '';

/**
 * Decrypt token
 */
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
  
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
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
 * Delete file from Google Drive
 */
async function deleteFromDrive(accessToken: string, fileId: string): Promise<void> {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );
  
  if (!response.ok) {
    // 404 is acceptable (file already deleted)
    if (response.status === 404) {
      console.log('[Delete] File already deleted from Drive:', fileId);
      return;
    }
    
    const error = await response.text();
    throw new Error(`Drive delete failed: ${error}`);
  }
  
  console.log('[Delete] File deleted from Drive:', fileId);
}

/**
 * Main handler
 */
serve(async (req: Request) => {
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
    
    // Parse request body
    const body = await req.json();
    const mediaId = body.media_id;
    
    if (!mediaId) {
      return new Response(
        JSON.stringify({ error: 'Missing media_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get media record
    const { data: media, error: mediaError } = await supabase
      .from('media')
      .select('id, tenant_id, storage_provider, drive_file_id, file_name')
      .eq('id', mediaId)
      .is('deleted_at', null)
      .single();
    
    if (mediaError || !media) {
      return new Response(
        JSON.stringify({ error: 'Media not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate tenant membership
    const isMember = await validateTenantMembership(user.id, media.tenant_id);
    if (!isMember) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Not authorized to delete this media' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // If Google Drive media, delete from Drive
    if (media.storage_provider === 'google_drive' && media.drive_file_id) {
      // Get Drive connection
      const { data: connection, error: connError } = await supabase
        .from('tenant_google_drive_connections')
        .select('access_token_encrypted, status')
        .eq('tenant_id', media.tenant_id)
        .is('deleted_at', null)
        .single();
      
      if (connError || !connection) {
        console.warn('[Delete] No Drive connection, skipping Drive deletion');
      } else if (connection.status !== 'active') {
        console.warn('[Delete] Drive connection not active, skipping Drive deletion');
      } else {
        try {
          const accessToken = await decryptToken(connection.access_token_encrypted);
          await deleteFromDrive(accessToken, media.drive_file_id);
        } catch (driveError) {
          console.error('[Delete] Failed to delete from Drive:', driveError);
          // Continue with database deletion even if Drive delete fails
        }
      }
    }
    
    // Soft delete from database
    const { error: deleteError } = await supabase
      .from('media')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', mediaId);
    
    if (deleteError) {
      console.error('[Delete] Error deleting media record:', deleteError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete media record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('[Delete] Successfully deleted media:', mediaId);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Media deleted',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
    
  } catch (err) {
    console.error('[Delete] Error:', err);
    
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Delete failed' }),
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
