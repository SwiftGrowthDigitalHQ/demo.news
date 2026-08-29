/**
 * YouTube Connection Management
 * 
 * Handles connection operations:
 * - GET /status: Get connection status and channel info
 * - POST /sync: Sync channel data and latest videos
 * - POST /disconnect: Disconnect YouTube (soft delete)
 * - POST /select-channel: Complete connection after multiple channel selection
 * 
 * Security:
 * - Validates JWT authentication
 * - Enforces tenant isolation
 * - Never exposes OAuth tokens to frontend
 * - Decrypts tokens only when needed for API calls
 * - Auto-refreshes expired tokens
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const GOOGLE_OAUTH_CLIENT_ID = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID') || '';
const GOOGLE_OAUTH_CLIENT_SECRET = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET') || '';
const YOUTUBE_ENCRYPTION_KEY = Deno.env.get('YOUTUBE_ENCRYPTION_KEY') || '';
const FRONTEND_URL = Deno.env.get('SITE_URL') || 'http://localhost:5173';

interface YouTubeVideo {
  id: string;
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    thumbnails: {
      default?: { url: string };
      medium?: { url: string };
      high?: { url: string };
    };
  };
  statistics: {
    viewCount: string;
    likeCount: string;
    commentCount: string;
  };
  contentDetails: {
    duration: string;
  };
}

/**
 * AES-256-GCM decryption using Web Crypto API
 */
async function decryptToken(encryptedToken: string): Promise<string> {
  const combined = Uint8Array.from(atob(encryptedToken), c => c.charCodeAt(0));
  
  // Extract IV (first 12 bytes) and encrypted data
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);
  
  // Import decryption key
  const keyData = Uint8Array.from(atob(YOUTUBE_ENCRYPTION_KEY), c => c.charCodeAt(0));
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
  
  // Convert to string
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Encrypt token (for storing refreshed tokens)
 */
async function encryptToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const keyData = Uint8Array.from(atob(YOUTUBE_ENCRYPTION_KEY), c => c.charCodeAt(0));
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

/**
 * Get tenant ID from authenticated user
 */
async function getTenantIdFromAuth(authToken: string): Promise<string | null> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  const { data: { user }, error } = await supabase.auth.getUser(authToken);
  
  if (error || !user) {
    console.error('[YouTube Connection] Auth error:', error);
    return null;
  }
  
  // Get tenant membership
  const { data } = await supabase
    .from('tenant_memberships')
    .select('tenant_id')
    .eq('auth_user_id', user.id)
    .limit(1)
    .maybeSingle();
  
  return data?.tenant_id || null;
}

/**
 * Refresh expired access token
 */
async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
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
    console.error('[YouTube Connection] Token refresh failed:', error);
    throw new Error('Failed to refresh access token');
  }
  
  return await response.json();
}

/**
 * Get valid access token (refresh if expired)
 */
async function getValidAccessToken(connectionId: string, tenantId: string): Promise<string> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  // Get connection with tokens
  const { data: connection, error } = await supabase
    .from('youtube_connections')
    .select('access_token_encrypted, refresh_token_encrypted, token_expires_at')
    .eq('id', connectionId)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .single();
  
  if (error || !connection) {
    throw new Error('Connection not found');
  }
  
  // Check if token is expired
  const expiresAt = new Date(connection.token_expires_at);
  const now = new Date();
  const isExpired = expiresAt <= now;
  
  if (!isExpired) {
    // Token still valid, decrypt and return
    return await decryptToken(connection.access_token_encrypted);
  }
  
  // Token expired, refresh it
  console.log('[YouTube Connection] Access token expired, refreshing...');
  const refreshToken = await decryptToken(connection.refresh_token_encrypted);
  const newTokens = await refreshAccessToken(refreshToken);
  
  // Encrypt and store new access token
  const newAccessTokenEncrypted = await encryptToken(newTokens.access_token);
  const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000).toISOString();
  
  await supabase
    .from('youtube_connections')
    .update({
      access_token_encrypted: newAccessTokenEncrypted,
      token_expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', connectionId);
  
  console.log('[YouTube Connection] Access token refreshed successfully');
  
  return newTokens.access_token;
}

/**
 * Format count for display
 */
function formatCount(count: string): string {
  const num = parseInt(count, 10);
  if (isNaN(num)) return count;
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return count;
}

/**
 * Sync channel data and videos
 */
async function syncChannel(tenantId: string, videosLimit: number = 10): Promise<any> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  // Get connection
  const { data: connection, error: connError } = await supabase
    .from('youtube_connections')
    .select('*')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .single();
  
  if (connError || !connection) {
    throw new Error('YouTube not connected');
  }
  
  // Get valid access token (will refresh if expired)
  const accessToken = await getValidAccessToken(connection.id, tenantId);
  
  // Fetch channel statistics
  console.log('[YouTube Connection] Syncing channel data...');
  const channelUrl = 'https://www.googleapis.com/youtube/v3/channels?' + new URLSearchParams({
    part: 'statistics,snippet,brandingSettings',
    id: connection.channel_id,
  });
  
  const channelResponse = await fetch(channelUrl, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  
  if (!channelResponse.ok) {
    const error = await channelResponse.text();
    console.error('[YouTube Connection] Channel fetch failed:', error);
    throw new Error('Failed to fetch channel data');
  }
  
  const channelData = await channelResponse.json();
  const channel = channelData.items?.[0];
  
  if (!channel) {
    throw new Error('Channel not found');
  }
  
  // Update channel statistics
  await supabase
    .from('youtube_connections')
    .update({
      subscriber_count: formatCount(channel.statistics.subscriberCount),
      video_count: formatCount(channel.statistics.videoCount),
      view_count: formatCount(channel.statistics.viewCount),
      channel_description: channel.snippet.description,
      channel_thumbnail_url: channel.snippet.thumbnails.high?.url || connection.channel_thumbnail_url,
      channel_banner_url: channel.brandingSettings?.image?.bannerExternalUrl || connection.channel_banner_url,
      last_sync_at: new Date().toISOString(),
      status: 'active',
      last_error: null,
    })
    .eq('id', connection.id);
  
  // Fetch latest videos
  console.log('[YouTube Connection] Syncing latest videos...');
  const searchUrl = 'https://www.googleapis.com/youtube/v3/search?' + new URLSearchParams({
    part: 'snippet',
    channelId: connection.channel_id,
    maxResults: String(videosLimit),
    order: 'date',
    type: 'video',
  });
  
  const searchResponse = await fetch(searchUrl, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  
  if (!searchResponse.ok) {
    const error = await searchResponse.text();
    console.error('[YouTube Connection] Video search failed:', error);
    // Don't throw - channel sync succeeded
    return {
      success: true,
      channel: {
        subscriber_count: formatCount(channel.statistics.subscriberCount),
        video_count: formatCount(channel.statistics.videoCount),
        view_count: formatCount(channel.statistics.viewCount),
      },
      videos: [],
      synced_at: new Date().toISOString(),
    };
  }
  
  const searchData = await searchResponse.json();
  const videoIds = searchData.items?.map((item: any) => item.id.videoId).filter(Boolean) || [];
  
  let videos: any[] = [];
  
  if (videoIds.length > 0) {
    // Fetch video details (statistics, duration)
    const videosUrl = 'https://www.googleapis.com/youtube/v3/videos?' + new URLSearchParams({
      part: 'snippet,statistics,contentDetails',
      id: videoIds.join(','),
    });
    
    const videosResponse = await fetch(videosUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    
    if (videosResponse.ok) {
      const videosData = await videosResponse.json();
      videos = videosData.items || [];
      
      // Cache videos in database
      const videoRecords = videos.map((video: YouTubeVideo) => ({
        tenant_id: tenantId,
        channel_id: connection.channel_id,
        video_id: video.id,
        title: video.snippet.title,
        description: video.snippet.description,
        thumbnail_url: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.medium?.url || video.snippet.thumbnails.default?.url || '',
        thumbnail_high_url: video.snippet.thumbnails.high?.url,
        published_at: video.snippet.publishedAt,
        duration: video.contentDetails.duration,
        view_count: formatCount(video.statistics.viewCount),
        like_count: formatCount(video.statistics.likeCount || '0'),
        comment_count: formatCount(video.statistics.commentCount || '0'),
        video_url: `https://www.youtube.com/watch?v=${video.id}`,
        embed_url: `https://www.youtube.com/embed/${video.id}`,
        cached_at: new Date().toISOString(),
      }));
      
      // Delete old cached videos for this tenant
      await supabase
        .from('youtube_video_cache')
        .delete()
        .eq('tenant_id', tenantId);
      
      // Insert new cached videos
      if (videoRecords.length > 0) {
        await supabase
          .from('youtube_video_cache')
          .insert(videoRecords);
      }
    }
  }
  
  console.log('[YouTube Connection] Sync complete:', videos.length, 'videos');
  
  return {
    success: true,
    channel: {
      subscriber_count: formatCount(channel.statistics.subscriberCount),
      video_count: formatCount(channel.statistics.videoCount),
      view_count: formatCount(channel.statistics.viewCount),
    },
    videos: videos.map((video: YouTubeVideo) => ({
      video_id: video.id,
      title: video.snippet.title,
      description: video.snippet.description,
      thumbnail_url: video.snippet.thumbnails.medium?.url || video.snippet.thumbnails.default?.url,
      published_at: video.snippet.publishedAt,
      video_url: `https://www.youtube.com/watch?v=${video.id}`,
      view_count: formatCount(video.statistics.viewCount),
    })),
    synced_at: new Date().toISOString(),
  };
}

/**
 * Disconnect YouTube
 */
async function disconnectYouTube(tenantId: string): Promise<void> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  // Soft delete connection
  const { error } = await supabase
    .from('youtube_connections')
    .update({
      status: 'disconnected',
      deleted_at: new Date().toISOString(),
    })
    .eq('tenant_id', tenantId)
    .is('deleted_at', null);
  
  if (error) {
    console.error('[YouTube Connection] Disconnect failed:', error);
    throw new Error('Failed to disconnect YouTube');
  }
  
  // Delete cached videos
  await supabase
    .from('youtube_video_cache')
    .delete()
    .eq('tenant_id', tenantId);
  
  console.log('[YouTube Connection] Disconnected for tenant:', tenantId);
}

/**
 * Main handler
 */
serve(async (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': FRONTEND_URL,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  
  try {
    // Get authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const authToken = authHeader.replace('Bearer ', '');
    const tenantId = await getTenantIdFromAuth(authToken);
    
    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated or no tenant membership' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const url = new URL(req.url);
    const action = url.pathname.split('/').pop();
    
    // GET /status - Get connection status
    if (req.method === 'GET' && action === 'status') {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      const { data: connection } = await supabase
        .from('youtube_connections')
        .select('id, status, google_account_email, channel_id, channel_title, channel_handle, channel_url, channel_thumbnail_url, subscriber_count, video_count, view_count, last_sync_at, last_error')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .maybeSingle();
      
      return new Response(
        JSON.stringify({
          success: true,
          connected: !!connection,
          connection: connection || null,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // POST /sync - Sync channel and videos
    if (req.method === 'POST' && action === 'sync') {
      const body = await req.json();
      const videosLimit = body.videos_limit || 10;
      
      const result = await syncChannel(tenantId, videosLimit);
      
      return new Response(
        JSON.stringify(result),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // POST /disconnect - Disconnect YouTube
    if (req.method === 'POST' && action === 'disconnect') {
      await disconnectYouTube(tenantId);
      
      return new Response(
        JSON.stringify({ success: true, message: 'YouTube disconnected successfully' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (err) {
    console.error('[YouTube Connection] Error:', err);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
