/**
 * YouTube Integration Client Library
 * 
 * Handles OAuth flow initiation, connection status, sync, and disconnect operations.
 * Follows the same pattern as Google Drive integration for consistency.
 * 
 * SECURITY:
 * - Never exposes OAuth tokens to frontend
 * - All sensitive operations go through Edge Functions
 * - Tenant membership validated server-side
 */

import { getSupabaseClient } from '../../lib/supabase';

export interface YouTubeConnectionStatus {
  connected: boolean;
  connection: {
    id: string;
    status: string;
    google_account_email: string;
    channel_id: string;
    channel_title: string;
    channel_handle: string | null;
    channel_url: string;
    channel_thumbnail_url: string;
    subscriber_count: string;
    video_count: string;
    view_count: string;
    last_sync_at: string | null;
    last_error: string | null;
  } | null;
}

export interface YouTubeSyncResult {
  success: boolean;
  channel: {
    subscriber_count: string;
    video_count: string;
    view_count: string;
  };
  videos: Array<{
    video_id: string;
    title: string;
    description: string;
    thumbnail_url: string;
    published_at: string;
    video_url: string;
    view_count: string;
  }>;
  synced_at: string;
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
 * Initiate YouTube OAuth flow
 * 
 * Calls youtube-oauth-start Edge Function to generate OAuth URL,
 * then redirects browser to Google consent screen.
 */
export async function connectYouTube(): Promise<void> {
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
  
  // Generate CSRF token for local validation
  const csrfToken = crypto.randomUUID();
  sessionStorage.setItem('youtube_csrf_token', csrfToken);
  sessionStorage.setItem('youtube_csrf_tenant', tenantId);
  
  // Call Edge Function to get OAuth URL
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/youtube-oauth-start`,
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
    throw new Error(error.error || 'Failed to initiate YouTube OAuth');
  }
  
  const result = await response.json();
  
  if (!result.success || !result.oauth_url) {
    throw new Error('Failed to generate OAuth URL');
  }
  
  // Redirect to Google OAuth
  window.location.href = result.oauth_url;
}

/**
 * Get YouTube connection status for current tenant
 * 
 * Returns connection information including channel details and statistics.
 * Does NOT include OAuth tokens (those are server-side only).
 */
export async function getYouTubeConnectionStatus(): Promise<YouTubeConnectionStatus> {
  const supabase = await getSupabaseClient();
  
  if (!supabase) {
    return {
      connected: false,
      connection: null,
    };
  }
  
  // Get session token
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }
  
  // Call Edge Function
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/youtube-connection/status`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    console.error('[YouTube] Failed to get connection status:', error);
    return {
      connected: false,
      connection: null,
    };
  }
  
  const result = await response.json();
  return {
    connected: result.connected,
    connection: result.connection,
  };
}

/**
 * Sync YouTube channel data and latest videos
 * 
 * Fetches updated channel statistics and recent videos from YouTube API.
 * Results are cached in database to avoid repeated API calls.
 * 
 * @param videosLimit - Number of latest videos to fetch (default: 10)
 */
export async function syncYouTubeChannel(videosLimit: number = 10): Promise<YouTubeSyncResult> {
  const supabase = await getSupabaseClient();
  
  if (!supabase) {
    throw new Error('Supabase not configured');
  }
  
  // Get session token
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }
  
  // Call Edge Function
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/youtube-connection/sync`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ videos_limit: videosLimit }),
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || error.details || 'Failed to sync YouTube channel');
  }
  
  return await response.json();
}

/**
 * Disconnect YouTube for current tenant
 * 
 * Soft-deletes the connection (can be reconnected later).
 * Cached videos are also deleted.
 */
export async function disconnectYouTube(): Promise<void> {
  const supabase = await getSupabaseClient();
  
  if (!supabase) {
    throw new Error('Supabase not configured');
  }
  
  // Get session token
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }
  
  // Call Edge Function
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/youtube-connection/disconnect`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to disconnect YouTube');
  }
}

/**
 * Get cached videos for current tenant
 * 
 * Returns videos from local cache (youtube_video_cache table).
 * Much faster than API calls and doesn't consume quota.
 */
export async function getCachedVideos(limit: number = 10): Promise<Array<{
  video_id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  published_at: string;
  video_url: string;
  view_count: string;
}>> {
  const tenantId = await getCurrentTenantId();
  const supabase = await getSupabaseClient();
  
  if (!supabase) {
    return [];
  }
  
  // Query cached videos directly from database
  const { data, error } = await supabase
    .from('youtube_video_cache')
    .select('video_id, title, description, thumbnail_url, published_at, video_url, view_count')
    .eq('tenant_id', tenantId)
    .order('published_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('[YouTube] Failed to get cached videos:', error);
    return [];
  }
  
  return data || [];
}

/**
 * Check if OAuth callback was successful
 * 
 * Called on page load to detect OAuth redirect parameters.
 * Returns success/error status and clears CSRF tokens.
 */
export function checkYouTubeOAuthCallback(): { 
  success: boolean; 
  error: string | null;
  selectChannel: string | null;
} {
  const params = new URLSearchParams(window.location.search);
  
  // Check for success
  if (params.get('youtube_success') === 'true') {
    // Clear CSRF tokens
    sessionStorage.removeItem('youtube_csrf_token');
    sessionStorage.removeItem('youtube_csrf_tenant');
    return { success: true, error: null, selectChannel: null };
  }
  
  // Check for channel selection (multiple channels)
  const selectChannel = params.get('youtube_select_channel');
  if (selectChannel) {
    return { success: false, error: null, selectChannel };
  }
  
  // Check for error
  const error = params.get('youtube_error');
  if (error) {
    // Clear CSRF tokens
    sessionStorage.removeItem('youtube_csrf_token');
    sessionStorage.removeItem('youtube_csrf_tenant');
    return { success: false, error, selectChannel: null };
  }
  
  return { success: false, error: null, selectChannel: null };
}

/**
 * Get display-friendly error message
 */
export function getYouTubeErrorMessage(errorCode: string): string {
  const errorMessages: Record<string, string> = {
    'access_denied': 'You cancelled the YouTube authorization. Click "Connect YouTube" to try again.',
    'invalid_callback': 'Invalid OAuth callback. Please try connecting again.',
    'invalid_state': 'Security validation failed. Please try connecting again.',
    'no_channel': 'No YouTube channel found for this Google account. Make sure you have a YouTube channel.',
    'connection_failed': 'Failed to connect YouTube. Please check your internet connection and try again.',
  };
  
  return errorMessages[errorCode] || 'An error occurred while connecting YouTube. Please try again.';
}
