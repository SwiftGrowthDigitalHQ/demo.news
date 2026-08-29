-- ============================================================================
-- YOUTUBE INTEGRATION PLUGIN — Database Configuration
-- ============================================================================
-- Strategy: YouTube configuration is stored in tenant_plugins.configuration
-- JSONB (no separate table needed). This migration adds:
--   1. Helper functions for safe retrieval of YouTube config
--   2. Validation constraints
--   3. Secure storage structure for API credentials
--   4. Comments documenting the configuration schema
--
-- Security: YouTube API keys are stored in a separate secure table with
-- encryption at rest, NOT in the public configuration JSONB.
-- ============================================================================

-- ── 1. Secure YouTube credentials table ────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.youtube_credentials (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID        NOT NULL UNIQUE
                               REFERENCES public.tenants(id) ON DELETE CASCADE,
  api_key_encrypted TEXT       NOT NULL,  -- Encrypted YouTube Data API key
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT youtube_credentials_tenant_unique UNIQUE (tenant_id)
);

-- ── 2. Enable RLS on credentials table ─────────────────────────────────────

ALTER TABLE public.youtube_credentials ENABLE ROW LEVEL SECURITY;

-- Tenant owners can read/write their own credentials (via service role only)
-- Regular anon/authenticated queries are blocked - only Edge Functions should access
DROP POLICY IF EXISTS "youtube_credentials_service_only" ON public.youtube_credentials;

CREATE POLICY "youtube_credentials_service_only"
  ON public.youtube_credentials
  FOR ALL
  USING (false);  -- Block all direct access - only service role via Edge Functions

-- ── 3. Comments documenting the configuration schema ────────────────────────

COMMENT ON TABLE public.youtube_credentials IS
  'Encrypted YouTube Data API credentials per tenant.
   Access restricted to service role (Edge Functions only).
   Frontend never reads this table directly.';

COMMENT ON COLUMN public.youtube_credentials.api_key_encrypted IS
  'Encrypted YouTube Data API v3 key. Decrypted server-side only.';

COMMENT ON TABLE public.tenant_plugins IS
  'For youtube-integration plugin, the configuration JSONB should contain:
   {
     "channel_id": "UC...",               -- YouTube channel ID
     "channel_handle": "@handle",         -- Channel custom handle
     "channel_title": "Channel Name",     -- Channel display name
     "channel_url": "https://youtube.com/@handle",
     "api_mode": "api_key",              -- Authentication method
     "auto_sync": boolean,                -- Enable automatic sync
     "sync_interval": 3600,               -- Sync interval in seconds
     "show_subscriber_count": boolean,
     "show_video_count": boolean,
     "show_channel_stats": boolean,
     "show_latest_videos": boolean,
     "latest_videos_limit": 5,            -- Number of videos to display
     "show_video_thumbnails": boolean,
     "show_video_titles": boolean,
     "show_video_dates": boolean,
     "last_sync_at": "timestamp",         -- Last successful sync
     "last_sync_status": "success|error",
     "cached_stats": {                    -- Cached channel statistics
       "subscriber_count": "1.2M",
       "video_count": "150",
       "view_count": "10M"
     },
     "cached_videos": [                   -- Cached latest videos
       {
         "video_id": "xxx",
         "title": "Video Title",
         "description": "...",
         "thumbnail_url": "https://...",
         "published_at": "timestamp",
         "view_count": "1000"
       }
     ]
   }
   
   SECURITY: YouTube API key is NEVER stored in configuration.
   It is stored encrypted in youtube_credentials table.';

-- ── 4. Helper function: Get YouTube configuration for a tenant ─────────────

CREATE OR REPLACE FUNCTION public.get_youtube_config(p_tenant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_config JSONB;
BEGIN
  -- Retrieve YouTube plugin configuration for the specified tenant
  SELECT configuration
  INTO v_config
  FROM public.tenant_plugins
  WHERE tenant_id = p_tenant_id
    AND plugin_key = 'youtube-integration'
    AND enabled = true;
  
  -- Return empty object if not found or disabled
  RETURN COALESCE(v_config, '{}'::jsonb);
END;
$$;

COMMENT ON FUNCTION public.get_youtube_config(UUID) IS
  'Retrieves YouTube Integration configuration for a tenant if the plugin is enabled.
   Returns empty object if plugin is disabled or not configured.
   Does NOT return API credentials (those are in separate secure table).
   SECURITY DEFINER allows Edge Functions to query cross-tenant safely.';

-- ── 5. Validation function: Validate YouTube Channel ID format ─────────────

CREATE OR REPLACE FUNCTION public.validate_youtube_channel_id(p_channel_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Valid YouTube channel ID format: UC followed by 22 alphanumeric/underscore/hyphen characters
  -- Total length: 24 characters
  RETURN p_channel_id ~ '^UC[A-Za-z0-9_-]{22}$';
END;
$$;

COMMENT ON FUNCTION public.validate_youtube_channel_id(TEXT) IS
  'Validates YouTube channel ID format.
   Expected format: UC followed by 22 characters (total 24 chars).
   Example: UCuAXFkgsw1L7xaCfnd5JJOw';

-- ── 6. Validation function: Validate YouTube Handle format ─────────────────

CREATE OR REPLACE FUNCTION public.validate_youtube_handle(p_handle TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Valid YouTube handle format: @ followed by 3-30 alphanumeric characters, dots, underscores
  RETURN p_handle ~ '^@[A-Za-z0-9._]{3,30}$';
END;
$$;

COMMENT ON FUNCTION public.validate_youtube_handle(TEXT) IS
  'Validates YouTube channel handle format.
   Expected format: @ followed by 3-30 characters.
   Example: @TechChannel';

-- ── 7. Grant execute permissions ────────────────────────────────────────────

-- Allow authenticated users (tenant owners) to check their own config
GRANT EXECUTE ON FUNCTION public.get_youtube_config(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_youtube_channel_id(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_youtube_handle(TEXT) TO authenticated;

-- Allow service_role (Edge Functions) to access these functions
GRANT EXECUTE ON FUNCTION public.get_youtube_config(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.validate_youtube_channel_id(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.validate_youtube_handle(TEXT) TO service_role;

-- Service role needs access to credentials table
GRANT ALL ON public.youtube_credentials TO service_role;

-- ── 8. Indexes for performance ──────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_youtube_credentials_tenant_id
  ON public.youtube_credentials(tenant_id);

-- ── 9. Updated_at trigger for credentials ───────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_youtube_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS youtube_credentials_updated_at ON public.youtube_credentials;

CREATE TRIGGER youtube_credentials_updated_at
  BEFORE UPDATE ON public.youtube_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_youtube_credentials_updated_at();

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
