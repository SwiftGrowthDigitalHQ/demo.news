-- ═══════════════════════════════════════════════════════════════════════════
-- FACEBOOK PUBLISHER - OAUTH FLOW (Phase 1)
-- ═══════════════════════════════════════════════════════════════════════════
-- Customer-friendly Facebook Page publishing via OAuth 2.0
-- User clicks "Connect Facebook" → Facebook OAuth consent → Page selection → Publish articles
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. CREATE FACEBOOK_CONNECTIONS TABLE (OAuth based)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.facebook_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Facebook user identification (person who connected)
  facebook_user_id TEXT NOT NULL,
  facebook_user_name TEXT,
  facebook_user_email TEXT,
  
  -- Facebook Page information
  facebook_page_id TEXT NOT NULL,
  facebook_page_name TEXT NOT NULL,
  facebook_page_username TEXT, -- @username or vanity URL
  facebook_page_category TEXT,
  facebook_page_image_url TEXT,
  facebook_page_url TEXT NOT NULL,
  
  -- OAuth tokens (ENCRYPTED - NEVER expose to frontend)
  access_token_encrypted TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ, -- NULL if long-lived token
  granted_permissions TEXT, -- Comma-separated list of granted permissions
  
  -- Connection status
  status TEXT NOT NULL DEFAULT 'active' 
    CHECK (status IN ('active', 'error', 'disconnected', 'expired', 'revoked')),
  last_used_at TIMESTAMPTZ,
  last_error TEXT,
  
  -- Audit fields
  connected_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  
  CONSTRAINT facebook_connections_unique_tenant UNIQUE (tenant_id),
  CONSTRAINT facebook_connections_unique_page UNIQUE (facebook_page_id, tenant_id)
);

COMMENT ON TABLE public.facebook_connections IS 
  'Stores OAuth credentials and Page information for tenant Facebook connections.
   OAuth tokens are encrypted at rest using AES-256-GCM.
   SECURITY: access_token_encrypted MUST NEVER be selected by frontend.
   Tokens are only decrypted server-side in Edge Functions.';

COMMENT ON COLUMN public.facebook_connections.facebook_user_id IS 
  'Facebook user ID of the person who authorized the connection.';

COMMENT ON COLUMN public.facebook_connections.facebook_page_id IS 
  'Facebook Page ID. Used for publishing posts via Graph API.';

COMMENT ON COLUMN public.facebook_connections.access_token_encrypted IS 
  'Encrypted Facebook Page access token. NEVER expose to frontend. Decrypted only in Edge Functions.';

COMMENT ON COLUMN public.facebook_connections.token_expires_at IS 
  'Token expiration timestamp. NULL for long-lived tokens (60 days). Meta tokens should be refreshed periodically.';

COMMENT ON COLUMN public.facebook_connections.granted_permissions IS 
  'Facebook permissions granted by user (e.g., "pages_show_list,pages_read_engagement,pages_manage_posts").';

COMMENT ON COLUMN public.facebook_connections.status IS 
  'Connection status:
   - active: Connection working normally
   - error: Temporary API error (retry possible)
   - expired: Access token expired (requires reconnection)
   - revoked: User revoked authorization (requires reconnection)
   - disconnected: Tenant disconnected (soft delete)';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. CREATE FACEBOOK_PUBLISH_HISTORY TABLE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.facebook_publish_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  facebook_connection_id UUID NOT NULL REFERENCES public.facebook_connections(id) ON DELETE CASCADE,
  
  -- Facebook Page and Post information
  facebook_page_id TEXT NOT NULL,
  facebook_post_id TEXT, -- NULL if publish failed
  post_url TEXT, -- Direct link to the Facebook post
  
  -- Publication status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'published', 'failed', 'cancelled')),
  error_message TEXT,
  
  -- Post content metadata (for debugging/history)
  post_title TEXT,
  post_excerpt TEXT,
  post_image_url TEXT,
  article_url TEXT,
  
  -- Timestamps
  published_at TIMESTAMPTZ, -- NULL until successfully published
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT facebook_publish_history_unique_article_page UNIQUE (tenant_id, article_id, facebook_page_id)
);

COMMENT ON TABLE public.facebook_publish_history IS 
  'Tracks Facebook publishing history for articles.
   Prevents duplicate publishing and provides audit trail.';

COMMENT ON COLUMN public.facebook_publish_history.status IS 
  'Publication status:
   - pending: Queued or in progress
   - published: Successfully published to Facebook
   - failed: Publishing failed (see error_message)
   - cancelled: Manually cancelled by user';

COMMENT ON COLUMN public.facebook_publish_history.facebook_post_id IS 
  'Facebook Post ID returned by Graph API. Format: {page-id}_{post-id}';

COMMENT ON COLUMN public.facebook_publish_history.post_url IS 
  'Direct URL to view the post on Facebook. Generated from post_id.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. INDEXES FOR PERFORMANCE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_facebook_connections_tenant_id 
  ON public.facebook_connections(tenant_id) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_facebook_connections_page_id 
  ON public.facebook_connections(facebook_page_id) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_facebook_connections_status 
  ON public.facebook_connections(status) 
  WHERE deleted_at IS NULL AND status != 'active';

CREATE INDEX IF NOT EXISTS idx_facebook_publish_history_tenant_id 
  ON public.facebook_publish_history(tenant_id);

CREATE INDEX IF NOT EXISTS idx_facebook_publish_history_article_id 
  ON public.facebook_publish_history(article_id);

CREATE INDEX IF NOT EXISTS idx_facebook_publish_history_status 
  ON public.facebook_publish_history(status) 
  WHERE status != 'published';

CREATE INDEX IF NOT EXISTS idx_facebook_publish_history_published_at 
  ON public.facebook_publish_history(published_at DESC NULLS LAST);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. UPDATED_AT TRIGGERS
-- ─────────────────────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS facebook_connections_updated_at ON public.facebook_connections;

CREATE TRIGGER facebook_connections_updated_at
  BEFORE UPDATE ON public.facebook_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS facebook_publish_history_updated_at ON public.facebook_publish_history;

CREATE TRIGGER facebook_publish_history_updated_at
  BEFORE UPDATE ON public.facebook_publish_history
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. RLS POLICIES
-- ─────────────────────────────────────────────────────────────────────────────

-- facebook_connections table
ALTER TABLE public.facebook_connections ENABLE ROW LEVEL SECURITY;

-- Tenant members can read their own connection (but NOT the encrypted token)
DROP POLICY IF EXISTS "tenant_read_own_facebook_connection" ON public.facebook_connections;

CREATE POLICY "tenant_read_own_facebook_connection" 
  ON public.facebook_connections
  FOR SELECT USING (
    deleted_at IS NULL
    AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

COMMENT ON POLICY "tenant_read_own_facebook_connection" ON public.facebook_connections IS 
  'Tenant members and super admin can read connection metadata.
   CRITICAL: Frontend queries MUST NOT include access_token_encrypted column.
   Use column selection: SELECT id, status, facebook_page_name, ... (never SELECT *)';

-- Only service role can insert/update/delete (OAuth flow handled by Edge Functions)
DROP POLICY IF EXISTS "service_role_manage_facebook_connections" ON public.facebook_connections;

CREATE POLICY "service_role_manage_facebook_connections" 
  ON public.facebook_connections
  FOR ALL
  USING (false); -- Block all authenticated/anon access, service role bypasses RLS

COMMENT ON POLICY "service_role_manage_facebook_connections" ON public.facebook_connections IS 
  'Only service role (Edge Functions) can insert/update/delete connections.
   Ensures OAuth tokens never exposed to frontend and tenant isolation enforced server-side.';

-- facebook_publish_history table
ALTER TABLE public.facebook_publish_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_read_own_facebook_history" ON public.facebook_publish_history;

CREATE POLICY "tenant_read_own_facebook_history" 
  ON public.facebook_publish_history
  FOR SELECT USING (
    tenant_id IN (SELECT public.get_user_tenant_ids())
    OR public.is_super_admin()
  );

COMMENT ON POLICY "tenant_read_own_facebook_history" ON public.facebook_publish_history IS 
  'Tenant members and super admin can read their own publishing history.';

DROP POLICY IF EXISTS "service_role_manage_facebook_history" ON public.facebook_publish_history;

CREATE POLICY "service_role_manage_facebook_history" 
  ON public.facebook_publish_history
  FOR ALL
  USING (false); -- Service role only

COMMENT ON POLICY "service_role_manage_facebook_history" ON public.facebook_publish_history IS 
  'Only service role (Edge Functions) can insert/update publishing history.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. HELPER FUNCTIONS
-- ─────────────────────────────────────────────────────────────────────────────

-- Get tenant's Facebook connection status
CREATE OR REPLACE FUNCTION public.get_facebook_connection_status(p_tenant_id UUID)
RETURNS TABLE(
  connected BOOLEAN,
  status TEXT,
  facebook_user_name TEXT,
  facebook_user_email TEXT,
  facebook_page_id TEXT,
  facebook_page_name TEXT,
  facebook_page_username TEXT,
  facebook_page_url TEXT,
  facebook_page_image_url TEXT,
  last_used_at TIMESTAMPTZ,
  last_error TEXT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE WHEN fc.id IS NOT NULL THEN TRUE ELSE FALSE END AS connected,
    fc.status,
    fc.facebook_user_name,
    fc.facebook_user_email,
    fc.facebook_page_id,
    fc.facebook_page_name,
    fc.facebook_page_username,
    fc.facebook_page_url,
    fc.facebook_page_image_url,
    fc.last_used_at,
    fc.last_error
  FROM public.facebook_connections fc
  WHERE fc.tenant_id = p_tenant_id
    AND fc.deleted_at IS NULL
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_facebook_connection_status(UUID) IS 
  'Returns Facebook connection status and Page metadata for a tenant.
   Does NOT expose OAuth tokens.
   Safe for frontend consumption.';

GRANT EXECUTE ON FUNCTION public.get_facebook_connection_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_facebook_connection_status(UUID) TO service_role;

-- Get publishing history for a tenant
CREATE OR REPLACE FUNCTION public.get_facebook_publish_history(
  p_tenant_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE(
  id UUID,
  article_id UUID,
  article_title TEXT,
  facebook_page_name TEXT,
  facebook_post_id TEXT,
  post_url TEXT,
  status TEXT,
  error_message TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    fph.id,
    fph.article_id,
    a.title AS article_title,
    fc.facebook_page_name,
    fph.facebook_post_id,
    fph.post_url,
    fph.status,
    fph.error_message,
    fph.published_at,
    fph.created_at
  FROM public.facebook_publish_history fph
  INNER JOIN public.articles a ON a.id = fph.article_id
  INNER JOIN public.facebook_connections fc ON fc.id = fph.facebook_connection_id
  WHERE fph.tenant_id = p_tenant_id
  ORDER BY fph.created_at DESC
  LIMIT p_limit;
$$;

COMMENT ON FUNCTION public.get_facebook_publish_history(UUID, INTEGER) IS 
  'Returns Facebook publishing history for a tenant with article details.';

GRANT EXECUTE ON FUNCTION public.get_facebook_publish_history(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_facebook_publish_history(UUID, INTEGER) TO service_role;

-- Check if article already published to Facebook Page
CREATE OR REPLACE FUNCTION public.is_article_published_to_facebook(
  p_tenant_id UUID,
  p_article_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1
    FROM public.facebook_publish_history
    WHERE tenant_id = p_tenant_id
      AND article_id = p_article_id
      AND status = 'published'
    LIMIT 1
  );
$$;

COMMENT ON FUNCTION public.is_article_published_to_facebook(UUID, UUID) IS 
  'Checks if article has already been successfully published to Facebook.
   Used to prevent duplicate publishing.';

GRANT EXECUTE ON FUNCTION public.is_article_published_to_facebook(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_article_published_to_facebook(UUID, UUID) TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. UPDATE TENANT_PLUGINS CONFIGURATION SCHEMA
-- ─────────────────────────────────────────────────────────────────────────────

COMMENT ON TABLE public.tenant_plugins IS
  'For facebook-publisher plugin, the configuration JSONB should contain:
   {
     "publishing_settings": {
       "default_behavior": "ask" | "automatic" | "never",
       "include_featured_image": boolean (default: true),
       "post_format": "title_excerpt_url" | "title_url" | "custom"
     },
     "post_template": {
       "include_title": boolean (default: true),
       "include_excerpt": boolean (default: true),
       "excerpt_length": number (default: 150),
       "include_url": boolean (always true),
       "custom_template": string (optional)
     }
   }
   
   IMPORTANT:
   - Page connection data is in facebook_connections table, NOT here
   - OAuth tokens are NEVER stored in configuration
   - Configuration focuses on publishing preferences only
   
   SECURITY: OAuth tokens are NEVER stored in configuration.
   They are in facebook_connections table, encrypted, service-role only.';

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION COMPLETE
-- ═══════════════════════════════════════════════════════════════════════════
-- Next steps:
-- 1. Deploy Edge Functions: facebook-oauth-start, facebook-oauth-callback, 
--    facebook-connection, facebook-publish
-- 2. Update frontend: FacebookPublisherManager.tsx
-- 3. Create client library: src/app/lib/facebook.ts
-- 4. Add environment variables: META_APP_ID, META_APP_SECRET, FB_ENCRYPTION_KEY
-- 5. Configure Meta Developer App with correct OAuth redirect URI
-- 6. Request required permissions: pages_show_list, pages_read_engagement, 
--    pages_manage_posts
-- ═══════════════════════════════════════════════════════════════════════════
