/**
 * Google Drive Integration Client Library
 * 
 * Handles OAuth flow initiation, connection status, and Drive operations.
 * 
 * SECURITY:
 * - Never exposes OAuth tokens to frontend
 * - All sensitive operations go through Edge Functions
 * - Tenant membership validated server-side
 */

import { getSupabaseClient } from '../../lib/supabase';

export interface DriveConnectionStatus {
  connected: boolean;
  status: string | null;
  google_account_email: string | null;
  last_error: string | null;
}

/**
 * Get current user's tenant ID from tenant_memberships
 */
async function getCurrentTenantId(): Promise<string> {
  const supabase = await getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase not configured');
  }
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }
  
  // Get user's tenant membership
  const { data, error } = await supabase
    .from('tenant_memberships')
    .select('tenant_id')
    .eq('auth_user_id', user.id)
    .limit(1)
    .single();
  
  if (error || !data) {
    throw new Error('No tenant membership found');
  }
  
  return data.tenant_id;
}

/**
 * Generate Google OAuth URL and redirect
 */
export async function connectGoogleDrive(): Promise<void> {
  const tenantId = await getCurrentTenantId();
  
  // Generate CSRF token
  const csrfToken = crypto.randomUUID();
  sessionStorage.setItem('gdrive_csrf_token', csrfToken);
  sessionStorage.setItem('gdrive_csrf_tenant', tenantId);
  
  // Generate state parameter: tenantId:csrfToken:timestamp
  const state = `${tenantId}:${csrfToken}:${Date.now()}`;
  
  // Get OAuth config from environment
  const clientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const redirectUri = `${supabaseUrl}/functions/v1/google-drive-oauth-callback`;
  
  if (!clientId) {
    throw new Error('Google OAuth client ID not configured');
  }
  
  // Build OAuth URL
  // Scopes: openid, email, profile for user identity + drive.file for file access
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile https://www.googleapis.com/auth/drive.file',
    state: state,
    access_type: 'offline',
    prompt: 'consent',
  });
  
  const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  
  // Redirect to Google OAuth
  window.location.href = oauthUrl;
}

/**
 * Get Drive connection status for current tenant
 */
export async function getDriveConnectionStatus(): Promise<DriveConnectionStatus> {
  const tenantId = await getCurrentTenantId();
  const supabase = await getSupabaseClient();
  if (!supabase) {
    return {
      connected: false,
      status: null,
      google_account_email: null,
      last_error: 'Supabase not configured',
    };
  }
  
  // Direct query to tenant_google_drive_connections table
  const { data, error } = await supabase
    .from('tenant_google_drive_connections')
    .select('status, google_account_email, last_error')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .single();
  
  if (error) {
    // No connection found is not an error
    if (error.code === 'PGRST116') {
      return {
        connected: false,
        status: null,
        google_account_email: null,
        last_error: null,
      };
    }
    
    console.error('[GoogleDrive] Error getting connection status:', error);
    return {
      connected: false,
      status: null,
      google_account_email: null,
      last_error: error.message,
    };
  }
  
  if (!data) {
    return {
      connected: false,
      status: null,
      google_account_email: null,
      last_error: null,
    };
  }
  
  return {
    connected: data.status === 'active',
    status: data.status,
    google_account_email: data.google_account_email,
    last_error: data.last_error,
  };
}

/**
 * Disconnect Google Drive for current tenant
 */
export async function disconnectGoogleDrive(): Promise<void> {
  const tenantId = await getCurrentTenantId();
  const supabase = await getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase not configured');
  }
  
  // Get session token
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }
  
  // Call disconnect Edge Function
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-drive-disconnect`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tenant_id: tenantId }),
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to disconnect Google Drive');
  }
}

/**
 * Upload file to Google Drive
 */
export async function uploadToGoogleDrive(
  file: File,
  options?: { alt_text?: string; caption?: string }
): Promise<{
  id: string;
  drive_file_id: string;
  drive_web_url: string;
  file_name: string;
  mime_type: string;
  file_size: number;
}> {
  const tenantId = await getCurrentTenantId();
  const supabase = await getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase not configured');
  }
  
  // Get session token
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }
  
  // Validate file
  validateFile(file);
  
  // Create form data
  const formData = new FormData();
  formData.append('file', file);
  formData.append('tenant_id', tenantId);
  if (options?.alt_text) formData.append('alt_text', options.alt_text);
  if (options?.caption) formData.append('caption', options.caption);
  
  // Upload via Edge Function
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-drive-upload`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: formData,
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Upload failed');
  }
  
  const result = await response.json();
  return result.media;
}

/**
 * Delete file from Google Drive
 */
export async function deleteFromGoogleDrive(mediaId: string): Promise<void> {
  const supabase = await getSupabaseClient();
  if (!supabase) {
    throw new Error('Failed to initialize Supabase client');
  }
  
  // Get session token
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }
  
  // Call delete Edge Function
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-drive-delete`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ media_id: mediaId }),
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Delete failed');
  }
}

/**
 * Validate file before upload
 */
function validateFile(file: File): void {
  // Max file size: 100MB
  const MAX_SIZE = 100 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error('File size exceeds 100MB limit');
  }
  
  // Allowed MIME types
  const allowedTypes = [
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    // Videos
    'video/mp4',
    'video/webm',
    'video/quicktime',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    // Text
    'text/plain',
    'text/csv',
  ];
  
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`File type ${file.type} not allowed`);
  }
  
  // Block dangerous extensions
  const dangerousExtensions = [
    '.exe', '.bat', '.cmd', '.sh', '.app', '.com',
    '.scr', '.vbs', '.js', '.jar', '.dll', '.msi',
  ];
  
  const fileName = file.name.toLowerCase();
  for (const ext of dangerousExtensions) {
    if (fileName.endsWith(ext)) {
      throw new Error(`File extension ${ext} not allowed for security reasons`);
    }
  }
}

/**
 * Check if OAuth callback was successful
 */
export function checkOAuthCallback(): { success: boolean; error: string | null } {
  const params = new URLSearchParams(window.location.search);
  
  if (params.get('gdrive_success') === 'true') {
    // Clear CSRF tokens
    sessionStorage.removeItem('gdrive_csrf_token');
    sessionStorage.removeItem('gdrive_csrf_tenant');
    return { success: true, error: null };
  }
  
  const error = params.get('gdrive_error');
  if (error) {
    return { success: false, error };
  }
  
  return { success: false, error: null };
}
