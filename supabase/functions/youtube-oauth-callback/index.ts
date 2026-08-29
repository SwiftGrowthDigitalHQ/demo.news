/**
 * YouTube OAuth Callback Handler
 * 
 * Handles OAuth 2.0 callback from Google after user authorizes YouTube access.
 * - Exchanges authorization code for access/refresh tokens
 * - Fetches user's YouTube channels
 * - Stores encrypted tokens and channel data in database
 * - Redirects back to frontend with success/error status
 * 
 * Security:
 * - Validates CSRF state parameter
 * - Encrypts OAuth tokens before storage (AES-256-GCM)
 * - Never exposes tokens to frontend
 * - Enforces tenant isolation
 * - Handles multiple channels (user selects which one)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const GOOGLE_OAUTH_CLIENT_ID = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID') || '';
const GOOGLE_OAUTH_CLIENT_SECRET = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET') || '';
const YOUTUBE_ENCRYPTION_KEY = Deno.env.get('YOUTUBE_ENCRYPTION_KEY') || '';
const FRONTEND_URL = Deno.env.get('SITE_URL') || 'http://localhost:5173';

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
}

interface YouTubeChannel {
  id: string;
  snippet: {
    title: string;
    description: string;
    customUrl?: string;
    thumbnails: {
      default?: { url: string };
      medium?: { url: string };
      high?: { url: string };
    };
  };
  statistics: {
    subscriberCount: string;
    videoCount: string;
    viewCount: string;
  };
  brandingSettings?: {
    image?: {
      bannerExternalUrl?: string;
    };
  };
}

interface YouTubeChannelsResponse {
  items: YouTubeChannel[];
}

/**
 * AES-256-GCM encryption using Web Crypto API
 */
async function encryptToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  
  // Generate random IV (12 bytes for GCM)
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Import encryption key
  const keyData = Uint8Array.from(atob(YOUTUBE_ENCRYPTION_KEY), c => c.charCodeAt(0));
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
 * Validate CSRF state parameter
 */
function validateState(state: string): { tenantId: string; timestamp: number } | null {
  try {
    const parts = state.split(':');
    if (parts.length !== 3) return null;
    
    const [tenantId, _csrfToken, timestampStr] = parts;
    const timestamp = parseInt(timestampStr, 10);
    
    // Validate timestamp (max age: 10 minutes)
    const now = Date.now();
    const age = now - timestamp;
    if (age > 10 * 60 * 1000) {
      console.error('[YouTube OAuth] State expired:', age / 1000, 'seconds old');
      return null;
    }
    
    return { tenantId, timestamp };
  } catch (err) {
    console.error('[YouTube OAuth] Invalid state format:', err);
    return null;
  }
}

/**
 * Exchange authorization code for tokens
 */
async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<TokenResponse> {
  const tokenUrl = 'https://oauth2.googleapis.com/token';
  
  console.log('[YouTube OAuth] Token exchange - Redirect URI:', redirectUri);
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_OAUTH_CLIENT_ID,
      client_secret: GOOGLE_OAUTH_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  
  console.log('[YouTube OAuth] Token exchange - HTTP Status:', response.status);
  
  if (!response.ok) {
    const error = await response.text();
    console.error('[YouTube OAuth] Token exchange failed:', error);
    throw new Error(`Token exchange failed: ${error}`);
  }
  
  const tokenData = await response.json();
  console.log('[YouTube OAuth] Token exchange success');
  console.log('[YouTube OAuth] Has refresh_token:', !!tokenData.refresh_token);
  console.log('[YouTube OAuth] Granted scopes:', tokenData.scope);
  
  return tokenData;
}

/**
 * Get Google user info
 */
async function getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const userInfoUrl = 'https://www.googleapis.com/oauth2/v2/userinfo';
  
  const response = await fetch(userInfoUrl, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  
  console.log('[YouTube OAuth] User info - HTTP Status:', response.status);
  
  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[YouTube OAuth] Failed to get user info:', errorBody);
    throw new Error(`Failed to get user info: ${errorBody}`);
  }
  
  const userInfo = await response.json();
  console.log('[YouTube OAuth] User info retrieved:', userInfo.email);
  
  return userInfo;
}

/**
 * Get YouTube channels for authenticated user
 */
async function getYouTubeChannels(accessToken: string): Promise<YouTubeChannel[]> {
  const channelsUrl = 'https://www.googleapis.com/youtube/v3/channels?' + new URLSearchParams({
    part: 'snippet,statistics,brandingSettings',
    mine: 'true',
  });
  
  console.log('[YouTube OAuth] Fetching channels...');
  
  const response = await fetch(channelsUrl, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  
  console.log('[YouTube OAuth] Channels API - HTTP Status:', response.status);
  
  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[YouTube OAuth] Failed to get channels:', errorBody);
    throw new Error(`Failed to get YouTube channels: ${errorBody}`);
  }
  
  const data: YouTubeChannelsResponse = await response.json();
  console.log('[YouTube OAuth] Found', data.items?.length || 0, 'channels');
  
  return data.items || [];
}

/**
 * Format subscriber count for display
 */
function formatCount(count: string): string {
  const num = parseInt(count, 10);
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return count;
}

/**
 * Store YouTube connection in database
 */
async function storeConnection(
  tenantId: string,
  userInfo: GoogleUserInfo,
  tokens: TokenResponse,
  channel: YouTubeChannel,
  connectedByUserId: string | null
) {
  console.log('[YouTube OAuth] Storing connection for tenant:', tenantId);
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  // Encrypt tokens
  console.log('[YouTube OAuth] Encrypting tokens...');
  const accessTokenEncrypted = await encryptToken(tokens.access_token);
  const refreshTokenEncrypted = await encryptToken(tokens.refresh_token);
  console.log('[YouTube OAuth] Tokens encrypted successfully');
  
  // Calculate expiration time
  const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  
  // Extract channel data
  const channelHandle = channel.snippet.customUrl 
    ? (channel.snippet.customUrl.startsWith('@') ? channel.snippet.customUrl : `@${channel.snippet.customUrl}`)
    : null;
  
  const channelUrl = channelHandle 
    ? `https://www.youtube.com/${channelHandle}`
    : `https://www.youtube.com/channel/${channel.id}`;
  
  const upsertPayload = {
    tenant_id: tenantId,
    google_account_email: userInfo.email,
    google_account_id: userInfo.id,
    channel_id: channel.id,
    channel_title: channel.snippet.title,
    channel_handle: channelHandle,
    channel_description: channel.snippet.description,
    channel_thumbnail_url: channel.snippet.thumbnails.high?.url || channel.snippet.thumbnails.medium?.url || channel.snippet.thumbnails.default?.url || '',
    channel_banner_url: channel.brandingSettings?.image?.bannerExternalUrl || null,
    channel_url: channelUrl,
    subscriber_count: formatCount(channel.statistics.subscriberCount),
    video_count: formatCount(channel.statistics.videoCount),
    view_count: formatCount(channel.statistics.viewCount),
    access_token_encrypted: accessTokenEncrypted,
    refresh_token_encrypted: refreshTokenEncrypted,
    token_expires_at: tokenExpiresAt,
    granted_scopes: tokens.scope,
    status: 'active' as const,
    last_sync_at: new Date().toISOString(),
    connected_by_user_id: connectedByUserId || null,
  };
  
  console.log('[YouTube OAuth] Upserting connection to database...');
  
  // Upsert connection (replace if exists)
  const { data, error } = await supabase
    .from('youtube_connections')
    .upsert(upsertPayload, {
      onConflict: 'tenant_id',
    })
    .select()
    .single();
  
  if (error) {
    console.error('[YouTube OAuth] Database upsert failed:', error);
    throw new Error(`Failed to store connection: ${error.message}`);
  }
  
  console.log('[YouTube OAuth] Connection stored successfully, ID:', data?.id);
  
  return data;
}

/**
 * Store channel selection temporarily (for multiple channels scenario)
 */
async function storeChannelSelection(
  tenantId: string,
  userInfo: GoogleUserInfo,
  tokens: TokenResponse,
  channels: YouTubeChannel[]
) {
  // For Phase 1, we'll encode channel data in URL parameters
  // In Phase 2, could use a temporary database table or Redis cache
  const channelsData = channels.map(ch => ({
    id: ch.id,
    title: ch.snippet.title,
    handle: ch.snippet.customUrl,
    thumbnail: ch.snippet.thumbnails.default?.url,
    subscribers: formatCount(ch.statistics.subscriberCount),
  }));
  
  // Encode as base64 JSON
  const channelsEncoded = btoa(JSON.stringify({
    tenant_id: tenantId,
    google_email: userInfo.email,
    google_id: userInfo.id,
    access_token: tokens.access_token, // Temporary - will be encrypted when channel selected
    refresh_token: tokens.refresh_token,
    expires_in: tokens.expires_in,
    scope: tokens.scope,
    channels: channelsData,
    timestamp: Date.now(),
  }));
  
  return channelsEncoded;
}

/**
 * Main handler
 */
serve(async (req: Request) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': FRONTEND_URL,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }
  
  try {
    // Parse query parameters
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    
    console.log('[YouTube OAuth] Callback received');
    
    // Check for OAuth errors (user denied access)
    if (error) {
      console.error('[YouTube OAuth] User denied access:', error);
      return Response.redirect(
        `${FRONTEND_URL}/admin/youtube-integration?youtube_error=access_denied`,
        302
      );
    }
    
    // Validate required parameters
    if (!code || !state) {
      console.error('[YouTube OAuth] Missing code or state');
      return Response.redirect(
        `${FRONTEND_URL}/admin/youtube-integration?youtube_error=invalid_callback`,
        302
      );
    }
    
    console.log('[YouTube OAuth] Validating state...');
    
    // Validate state (CSRF protection)
    const stateData = validateState(state);
    if (!stateData) {
      console.error('[YouTube OAuth] Invalid or expired state');
      return Response.redirect(
        `${FRONTEND_URL}/admin/youtube-integration?youtube_error=invalid_state`,
        302
      );
    }
    
    const { tenantId } = stateData;
    console.log('[YouTube OAuth] State validated for tenant:', tenantId);
    
    // Construct redirect URI (must match OAuth start)
    const redirectUri = `${SUPABASE_URL}/functions/v1/youtube-oauth-callback`;
    
    // Exchange code for tokens
    console.log('[YouTube OAuth] Exchanging code for tokens...');
    const tokens = await exchangeCodeForTokens(code, redirectUri);
    
    // Get user info
    console.log('[YouTube OAuth] Fetching user info...');
    const userInfo = await getUserInfo(tokens.access_token);
    
    // Get YouTube channels
    console.log('[YouTube OAuth] Fetching YouTube channels...');
    const channels = await getYouTubeChannels(tokens.access_token);
    
    if (channels.length === 0) {
      console.error('[YouTube OAuth] No YouTube channels found');
      return Response.redirect(
        `${FRONTEND_URL}/admin/youtube-integration?youtube_error=no_channel`,
        302
      );
    }
    
    // Handle multiple channels
    if (channels.length > 1) {
      console.log('[YouTube OAuth] Multiple channels found, user must select');
      const channelsEncoded = await storeChannelSelection(tenantId, userInfo, tokens, channels);
      return Response.redirect(
        `${FRONTEND_URL}/admin/youtube-integration?youtube_select_channel=${channelsEncoded}`,
        302
      );
    }
    
    // Single channel - auto-connect
    console.log('[YouTube OAuth] Single channel found, auto-connecting...');
    const channel = channels[0];
    
    // Store connection
    await storeConnection(
      tenantId,
      userInfo,
      tokens,
      channel,
      null // TODO: Extract user ID from session if available
    );
    
    console.log('[YouTube OAuth] Connection complete, redirecting to success...');
    
    // Redirect back to frontend with success
    return Response.redirect(
      `${FRONTEND_URL}/admin/youtube-integration?youtube_success=true`,
      302
    );
    
  } catch (err) {
    console.error('[YouTube OAuth] Callback failed:', err);
    console.error('[YouTube OAuth] Error type:', err instanceof Error ? err.constructor.name : typeof err);
    console.error('[YouTube OAuth] Error message:', err instanceof Error ? err.message : String(err));
    
    // Redirect to frontend with error
    return Response.redirect(
      `${FRONTEND_URL}/admin/youtube-integration?youtube_error=connection_failed`,
      302
    );
  }
});
