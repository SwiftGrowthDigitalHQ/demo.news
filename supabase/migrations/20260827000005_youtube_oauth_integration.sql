-- ═══════════════════════════════════════════════════════════════════════════
-- YOUTUBE INTEGRATION - OAUTH FLOW (Phase 1)
-- ═══════════════════════════════════════════════════════════════════════════
-- Redesign: Replace API key authentication with Google OAuth 2.0 flow
-- User clicks "Connect YouTube" → Google OAuth consent → Automatic channel detection
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. DROP OLD YOUTUBE_CREDENTIALS TABLE (API key based)
-- ─────────────────────────────────────────────────────────────────────────────

DROP TABLE IF EXISTS public.youtube_credentials CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. CREATE YOUTUBE_CONNECTIONS TABLE (OAuth based)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.youtube_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Google account identification
  google_account_email TEXT NOT NULL,
  google_account_id TEXT NOT NULL,
  
  -- YouTube channel information
  channel_id TEXT NOT NULL,
  channel_title TEXT NOT NULL,
  channel_handle TEXT,
  channel_description TEXT,
  channel_thumbnail_url TEXT,
  channel_banner_url TEXT,
  channel_url TEXT NOT NULL,
  
  -- Channel statistics (cached)
  subscriber_count TEXT,
  video_count TEXT,
  view_count TEXT,
  
  -- OAuth tokens (ENCRYPTED - NEVER expose to frontend)
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  granted_scopes TEXT NOT NULL, -- Comma-separated list of granted scopes
  
  -- Connection status
  status TEXT NOT NULL DEFAULT 'active' 
    CHECK (status IN ('active', 'error', 'disconnected', 'expired', 'revoked')),
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  
  -- Audit fields
  connected_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  
  CONSTRAINT youtube_connections_unique_tenant UNIQUE (tenant_id),
  CONSTRAINT youtube_connections_unique_channel UNIQUE (channel_id, tenant_id)
);

COMMENT ON TABLE public.youtube_connections IS 
  'Stores OAuth credentials and channel information for tenant YouTube connections.
   OAuth tokens are encrypted at rest using AES-256-GCM.
   SECURITY: access_token_encrypted and refresh_token_encrypted MUST NEVER be selected by frontend.
   Tokens are only decrypted server-side in Edge Functions.';

COMMENT ON COLUMN public.youtube_connections.google_account_email IS 
  'Email of the Google account that authorized YouTube access. Displayed to users.';

COMMENT ON COLUMN public.youtube_connections.google_account_id IS 
  'Google user ID (sub claim from OAuth token).';

COMMENT ON COLUMN public.youtube_connections.channel_id IS 
  'YouTube channel ID (format: UC... 24 characters). Auto-detected after OAuth.';

COMMENT ON COLUMN public.youtube_connections.channel_handle IS 
  'YouTube channel custom handle (format: @username). May be null for channels without handles.';

COMMENT ON COLUMN public.youtube_connections.access_token_encrypted IS 
  'Encrypted Google OAuth access token. NEVER expose to frontend. Decrypted only in Edge Functions.';

COMMENT ON COLUMN public.youtube_connections.refresh_token_encrypted IS 
  'Encrypted Google OAuth refresh token. Used to obtain new access tokens when expired.';

COMMENT ON COLUMN public.youtube_connections.token_expires_at IS 
  'Timestamp when access_token expires. Triggers automatic token refresh.';

COMMENT ON COLUMN public.youtube_connections.granted_scopes IS 
  'OAuth scopes granted by user (e.g., "youtube.readonly"). Used to verify permissions.';

COMMENT ON COLUMN public.youtube_connections.status IS 
  'Connection status:
   - active: Connection working normally
   - error: Temporary API error (retry possible)
   - expired: Access token expired (will auto-refresh)
   - revoked: User revoked authorization (requires reconnection)
   - disconnected: Tenant disconnected (soft delete)';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. INDEXES FOR PERFORMANCE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_youtube_connections_tenant_id 
  ON public.youtube_connections(tenant_id) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_youtube_connections_channel_id 
  ON public.youtube_connections(channel_id) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_youtube_connections_status 
  ON public.youtube_connections(status) 
  WHERE deleted_at IS NULL AND status != 'active';

CREATE INDEX IF NOT EXISTS idx_youtube_connections_token_expiry 
  ON public.youtube_connections(token_expires_at) 
  WHERE deleted_at IS NULL AND status = 'active';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. UPDATED_AT TRIGGER
-- ─────────────────────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS youtube_connections_updated_at ON public.youtube_connections;

CREATE TRIGGER youtube_connections_updated_at
  BEFORE UPDATE ON public.youtube_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. RLS POLICIES
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.youtube_connections ENABLE ROW LEVEL SECURITY;

-- Tenant members can read their own connection (but NOT the encrypted tokens)
-- WARNING: Frontend must NEVER SELECT access_token_encrypted or refresh_token_encrypted
DROP POLICY IF EXISTS "tenant_read_own_youtube_connection" ON public.youtube_connections;

CREATE POLICY "tenant_read_own_youtube_connection" 
  ON public.youtube_connections
  FOR SELECT USING (
    deleted_at IS NULL
    AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

COMMENT ON POLICY "tenant_read_own_youtube_connection" ON public.youtube_connections IS 
  'Tenant members and super admin can read connection metadata.
   CRITICAL: Frontend queries MUST NOT include access_token_encrypted or refresh_token_encrypted columns.
   Use column selection: SELECT id, status, channel_title, ... (never SELECT *)';

-- Only service role can insert/update/delete (OAuth flow handled by Edge Functions)
DROP POLICY IF EXISTS "service_role_manage_youtube_connections" ON public.youtube_connections;

CREATE POLICY "service_role_manage_youtube_connections" 
  ON public.youtube_connections
  FOR ALL
  USING (false); -- Block all authenticated/anon access, service role bypasses RLS

COMMENT ON POLICY "service_role_manage_youtube_connections" ON public.youtube_connections IS 
  'Only service role (Edge Functions) can insert/update/delete connections.
   This ensures OAuth tokens are never exposed to frontend and tenant isolation is enforced server-side.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. YOUTUBE_VIDEO_CACHE TABLE (cached videos for performance)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.youtube_video_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL,
  
  -- Video metadata
  video_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT NOT NULL,
  thumbnail_high_url TEXT,
  published_at TIMESTAMPTZ NOT NULL,
  duration TEXT, -- ISO 8601 duration (e.g., PT4M13S)
  
  -- Video statistics
  view_count TEXT,
  like_count TEXT,
  comment_count TEXT,
  
  -- URLs
  video_url TEXT NOT NULL,
  embed_url TEXT NOT NULL,
  
  -- Cache metadata
  cached_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT youtube_video_cache_unique_video UNIQUE (tenant_id, video_id)
);

COMMENT ON TABLE public.youtube_video_cache IS 
  'Caches YouTube video metadata to avoid repeated API calls.
   Updated during manual sync or automatic scheduled sync.
   Reduces YouTube API quota consumption.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_youtube_video_cache_tenant_id 
  ON public.youtube_video_cache(tenant_id);

CREATE INDEX IF NOT EXISTS idx_youtube_video_cache_channel_id 
  ON public.youtube_video_cache(channel_id);

CREATE INDEX IF NOT EXISTS idx_youtube_video_cache_published 
  ON public.youtube_video_cache(published_at DESC);

-- RLS
ALTER TABLE public.youtube_video_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_read_own_youtube_videos" ON public.youtube_video_cache;

CREATE POLICY "tenant_read_own_youtube_videos" 
  ON public.youtube_video_cache
  FOR SELECT USING (
    tenant_id IN (SELECT public.get_user_tenant_ids())
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "service_role_manage_youtube_videos" ON public.youtube_video_cache;

CREATE POLICY "service_role_manage_youtube_videos" 
  ON public.youtube_video_cache
  FOR ALL
  USING (false); -- Service role only

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. HELPER FUNCTIONS
-- ─────────────────────────────────────────────────────────────────────────────

-- Get tenant's YouTube connection status
CREATE OR REPLACE FUNCTION public.get_youtube_connection_status(p_tenant_id UUID)
RETURNS TABLE(
  connected BOOLEAN,
  status TEXT,
  google_account_email TEXT,
  channel_title TEXT,
  channel_handle TEXT,
  subscriber_count TEXT,
  video_count TEXT,
  view_count TEXT,
  last_sync_at TIMESTAMPTZ,
  last_error TEXT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE WHEN yc.id IS NOT NULL THEN TRUE ELSE FALSE END AS connected,
    yc.status,
    yc.google_account_email,
    yc.channel_title,
    yc.channel_handle,
    yc.subscriber_count,
    yc.video_count,
    yc.view_count,
    yc.last_sync_at,
    yc.last_error
  FROM public.youtube_connections yc
  WHERE yc.tenant_id = p_tenant_id
    AND yc.deleted_at IS NULL
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_youtube_connection_status(UUID) IS 
  'Returns YouTube connection status and channel metadata for a tenant.
   Does NOT expose OAuth tokens.
   Safe for frontend consumption.';

GRANT EXECUTE ON FUNCTION public.get_youtube_connection_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_youtube_connection_status(UUID) TO service_role;

-- Get cached videos for a tenant
CREATE OR REPLACE FUNCTION public.get_youtube_cached_videos(
  p_tenant_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
  video_id TEXT,
  title TEXT,
  description TEXT,
  thumbnail_url TEXT,
  published_at TIMESTAMPTZ,
  video_url TEXT,
  view_count TEXT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    yvc.video_id,
    yvc.title,
    yvc.description,
    yvc.thumbnail_url,
    yvc.published_at,
    yvc.video_url,
    yvc.view_count
  FROM public.youtube_video_cache yvc
  WHERE yvc.tenant_id = p_tenant_id
  ORDER BY yvc.published_at DESC
  LIMIT p_limit;
$$;

COMMENT ON FUNCTION public.get_youtube_cached_videos(UUID, INTEGER) IS 
  'Returns cached YouTube videos for a tenant, ordered by published date.
   Used by frontend to display latest videos without API calls.';

GRANT EXECUTE ON FUNCTION public.get_youtube_cached_videos(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_youtube_cached_videos(UUID, INTEGER) TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. UPDATE TENANT_PLUGINS CONFIGURATION SCHEMA
-- ─────────────────────────────────────────────────────────────────────────────

COMMENT ON TABLE public.tenant_plugins IS
  'For youtube-integration plugin, the configuration JSONB should now contain:
   {
     "display_settings": {
       "show_channel_stats": boolean,
       "show_latest_videos": boolean,
       "latest_videos_limit": number (1-50),
       "show_video_thumbnails": boolean,
       "show_video_titles": boolean,
       "show_video_dates": boolean,
       "show_video_descriptions": boolean,
       "show_view_counts": boolean
     },
     "sync_settings": {
       "auto_sync": boolean,
       "sync_interval": number (seconds, default 3600)
     },
     "widget_settings": {
       "widget_title": string,
       "widget_layout": "grid" | "list" | "carousel",
       "videos_per_row": number (for grid layout)
     }
   }
   
   IMPORTANT CHANGES FROM PREVIOUS VERSION:
   - Channel information (channel_id, channel_title, etc.) is NO LONGER stored here
   - Channel data is now in youtube_connections table
   - API keys are NO LONGER used (OAuth tokens in youtube_connections)
   - Configuration now focuses on display/sync preferences only
   - Last sync data is in youtube_connections, not configuration
   
   SECURITY: OAuth tokens are NEVER stored in configuration.
   They are in youtube_connections table, encrypted, service-role only.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. MIGRATION HELPER: Clean up old API key data
-- ─────────────────────────────────────────────────────────────────────────────

-- Remove old API key configuration from existing tenant_plugins
-- Keep display settings if they exist
DO $$
DECLARE
  plugin_record RECORD;
  new_config JSONB;
BEGIN
  FOR plugin_record IN 
    SELECT id, configuration 
    FROM public.tenant_plugins 
    WHERE plugin_key = 'youtube-integration'
      AND configuration IS NOT NULL
  LOOP
    -- Extract only display/sync settings, discard channel/API key data
    new_config := jsonb_build_object(
      'display_settings', COALESCE(
        plugin_record.configuration->'display_settings',
        jsonb_build_object(
          'show_channel_stats', true,
          'show_latest_videos', true,
          'latest_videos_limit', 5,
          'show_video_thumbnails', true,
          'show_video_titles', true,
          'show_video_dates', true
        )
      ),
      'sync_settings', COALESCE(
        plugin_record.configuration->'sync_settings',
        jsonb_build_object(
          'auto_sync', false,
          'sync_interval', 3600
        )
      )
    );
    
    -- Update configuration
    UPDATE public.tenant_plugins
    SET configuration = new_config
    WHERE id = plugin_record.id;
    
    RAISE NOTICE 'Migrated youtube-integration config for tenant_plugins.id = %', plugin_record.id;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. VALIDATION FUNCTIONS (Reuse from previous migration)
-- ─────────────────────────────────────────────────────────────────────────────

-- These functions are already created in the previous migration
-- Just ensure they exist and grant permissions

GRANT EXECUTE ON FUNCTION public.validate_youtube_channel_id(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_youtube_channel_id(TEXT) TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_youtube_handle(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_youtube_handle(TEXT) TO service_role;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION COMPLETE
-- ═══════════════════════════════════════════════════════════════════════════
-- Next steps:
-- 1. Deploy Edge Functions: youtube-oauth-start, youtube-oauth-callback, youtube-connection
-- 2. Update frontend: YouTubeIntegrationManager.tsx to use OAuth flow
-- 3. Create client library: src/app/lib/youtube.ts
-- 4. Add environment variables: GOOGLE_OAUTH_CLIENT_ID, YOUTUBE_ENCRYPTION_KEY
-- ═══════════════════════════════════════════════════════════════════════════
