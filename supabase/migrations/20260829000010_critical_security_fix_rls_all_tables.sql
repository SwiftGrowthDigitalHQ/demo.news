-- ═══════════════════════════════════════════════════════════════════════════
-- CRITICAL SECURITY FIX - COMPREHENSIVE RLS FOR ALL TENANT TABLES
-- 
-- This migration adds/fixes RLS policies for ALL tenant-scoped tables
-- to prevent cross-tenant data access.
-- 
-- SECURITY VULNERABILITIES FIXED:
-- 1. Footer tables had NO RLS (any user could access any tenant's footer)
-- 2. Custom pages had NO RLS
-- 3. Custom domains had NO RLS  
-- 4. Several plugin tables had NO RLS
-- 5. Tenant memberships needed proper isolation
-- 
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- HELPER: Ensure get_user_tenant_ids() function exists
-- ═══════════════════════════════════════════════════════════════════════════

-- This function should already exist from 20260824000001_multi_tenant_architecture.sql
-- But we'll create it if missing to be safe

CREATE OR REPLACE FUNCTION public.get_user_tenant_ids()
RETURNS TABLE(tenant_id UUID)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tm.tenant_id
  FROM public.tenant_memberships tm
  WHERE tm.auth_user_id = auth.uid()
  UNION
  SELECT t.id
  FROM public.tenants t
  WHERE t.owner_auth_user_id = auth.uid()
  AND t.deleted_at IS NULL;
$$;

COMMENT ON FUNCTION public.get_user_tenant_ids() IS 
  'Returns all tenant IDs the current authenticated user belongs to or owns.';

-- ═══════════════════════════════════════════════════════════════════════════
-- FOOTER SETTINGS RLS (CRITICAL - WAS COMPLETELY MISSING)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.tenant_footer_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_read_own_footer_settings" ON public.tenant_footer_settings;
CREATE POLICY "tenant_read_own_footer_settings" ON public.tenant_footer_settings
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

DROP POLICY IF EXISTS "tenant_manage_own_footer_settings" ON public.tenant_footer_settings;
CREATE POLICY "tenant_manage_own_footer_settings" ON public.tenant_footer_settings
  FOR ALL
  USING (
    deleted_at IS NULL
    AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  )
  WITH CHECK (
    tenant_id IN (SELECT public.get_user_tenant_ids())
    OR public.is_super_admin()
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- FOOTER SOCIAL LINKS RLS (CRITICAL - WAS COMPLETELY MISSING)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.tenant_footer_social_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_read_own_footer_social" ON public.tenant_footer_social_links;
CREATE POLICY "tenant_read_own_footer_social" ON public.tenant_footer_social_links
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

DROP POLICY IF EXISTS "tenant_manage_own_footer_social" ON public.tenant_footer_social_links;
CREATE POLICY "tenant_manage_own_footer_social" ON public.tenant_footer_social_links
  FOR ALL
  USING (
    deleted_at IS NULL
    AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  )
  WITH CHECK (
    tenant_id IN (SELECT public.get_user_tenant_ids())
    OR public.is_super_admin()
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- FOOTER COLUMNS RLS (CRITICAL - WAS COMPLETELY MISSING)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.tenant_footer_columns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_read_own_footer_columns" ON public.tenant_footer_columns;
CREATE POLICY "tenant_read_own_footer_columns" ON public.tenant_footer_columns
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

DROP POLICY IF EXISTS "tenant_manage_own_footer_columns" ON public.tenant_footer_columns;
CREATE POLICY "tenant_manage_own_footer_columns" ON public.tenant_footer_columns
  FOR ALL
  USING (
    deleted_at IS NULL
    AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  )
  WITH CHECK (
    tenant_id IN (SELECT public.get_user_tenant_ids())
    OR public.is_super_admin()
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- FOOTER LINKS RLS (CRITICAL - WAS COMPLETELY MISSING)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.tenant_footer_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_read_own_footer_links" ON public.tenant_footer_links;
CREATE POLICY "tenant_read_own_footer_links" ON public.tenant_footer_links
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

DROP POLICY IF EXISTS "tenant_manage_own_footer_links" ON public.tenant_footer_links;
CREATE POLICY "tenant_manage_own_footer_links" ON public.tenant_footer_links
  FOR ALL
  USING (
    deleted_at IS NULL
    AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  )
  WITH CHECK (
    tenant_id IN (SELECT public.get_user_tenant_ids())
    OR public.is_super_admin()
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- CUSTOM PAGES RLS (CRITICAL - WAS COMPLETELY MISSING)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.tenant_custom_pages ENABLE ROW LEVEL SECURITY;

-- Public can read ENABLED custom pages
DROP POLICY IF EXISTS "public_read_custom_pages" ON public.tenant_custom_pages;
CREATE POLICY "public_read_custom_pages" ON public.tenant_custom_pages
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND enabled = TRUE
  );

-- Tenant members can read all their own pages
DROP POLICY IF EXISTS "tenant_read_own_custom_pages" ON public.tenant_custom_pages;
CREATE POLICY "tenant_read_own_custom_pages" ON public.tenant_custom_pages
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

-- Tenant members can manage their own pages
DROP POLICY IF EXISTS "tenant_manage_own_custom_pages" ON public.tenant_custom_pages;
CREATE POLICY "tenant_manage_own_custom_pages" ON public.tenant_custom_pages
  FOR ALL
  USING (
    deleted_at IS NULL
    AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  )
  WITH CHECK (
    tenant_id IN (SELECT public.get_user_tenant_ids())
    OR public.is_super_admin()
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- CUSTOM DOMAINS RLS
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.tenant_domains ENABLE ROW LEVEL SECURITY;

-- Public can read verified domains (needed for domain routing)
DROP POLICY IF EXISTS "public_read_verified_domains" ON public.tenant_domains;
CREATE POLICY "public_read_verified_domains" ON public.tenant_domains
  FOR SELECT
  USING (
    status IN ('approved', 'verified', 'connected')
    AND deleted_at IS NULL
  );

-- Tenant members can read their own domains
DROP POLICY IF EXISTS "tenant_read_own_domains" ON public.tenant_domains;
CREATE POLICY "tenant_read_own_domains" ON public.tenant_domains
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

-- Tenant members can manage their own domains
DROP POLICY IF EXISTS "tenant_manage_own_domains" ON public.tenant_domains;
CREATE POLICY "tenant_manage_own_domains" ON public.tenant_domains
  FOR ALL
  USING (
    deleted_at IS NULL
    AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  )
  WITH CHECK (
    tenant_id IN (SELECT public.get_user_tenant_ids())
    OR public.is_super_admin()
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- TENANT PLUGINS RLS
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.tenant_plugins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_read_own_plugins" ON public.tenant_plugins;
CREATE POLICY "tenant_read_own_plugins" ON public.tenant_plugins
  FOR SELECT
  USING (
    tenant_id IN (SELECT public.get_user_tenant_ids())
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "tenant_manage_own_plugins" ON public.tenant_plugins;
CREATE POLICY "tenant_manage_own_plugins" ON public.tenant_plugins
  FOR ALL
  USING (
    tenant_id IN (SELECT public.get_user_tenant_ids())
    OR public.is_super_admin()
  )
  WITH CHECK (
    tenant_id IN (SELECT public.get_user_tenant_ids())
    OR public.is_super_admin()
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- TENANT SEO DEFAULTS RLS
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.tenant_seo_defaults ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_read_own_seo_defaults" ON public.tenant_seo_defaults;
CREATE POLICY "tenant_read_own_seo_defaults" ON public.tenant_seo_defaults
  FOR SELECT
  USING (
    tenant_id IN (SELECT public.get_user_tenant_ids())
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "tenant_manage_own_seo_defaults" ON public.tenant_seo_defaults;
CREATE POLICY "tenant_manage_own_seo_defaults" ON public.tenant_seo_defaults
  FOR ALL
  USING (
    tenant_id IN (SELECT public.get_user_tenant_ids())
    OR public.is_super_admin()
  )
  WITH CHECK (
    tenant_id IN (SELECT public.get_user_tenant_ids())
    OR public.is_super_admin()
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- GOOGLE DRIVE CONNECTIONS RLS
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.tenant_google_drive_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_read_own_gdrive" ON public.tenant_google_drive_connections;
CREATE POLICY "tenant_read_own_gdrive" ON public.tenant_google_drive_connections
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

DROP POLICY IF EXISTS "tenant_manage_own_gdrive" ON public.tenant_google_drive_connections;
CREATE POLICY "tenant_manage_own_gdrive" ON public.tenant_google_drive_connections
  FOR ALL
  USING (
    deleted_at IS NULL
    AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  )
  WITH CHECK (
    tenant_id IN (SELECT public.get_user_tenant_ids())
    OR public.is_super_admin()
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- YOUTUBE CONNECTIONS RLS
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.youtube_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_read_own_youtube" ON public.youtube_connections;
CREATE POLICY "tenant_read_own_youtube" ON public.youtube_connections
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

DROP POLICY IF EXISTS "tenant_manage_own_youtube" ON public.youtube_connections;
CREATE POLICY "tenant_manage_own_youtube" ON public.youtube_connections
  FOR ALL
  USING (
    deleted_at IS NULL
    AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  )
  WITH CHECK (
    tenant_id IN (SELECT public.get_user_tenant_ids())
    OR public.is_super_admin()
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- YOUTUBE VIDEO CACHE RLS
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.youtube_video_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_read_own_youtube_cache" ON public.youtube_video_cache;
CREATE POLICY "tenant_read_own_youtube_cache" ON public.youtube_video_cache
  FOR SELECT
  USING (
    tenant_id IN (SELECT public.get_user_tenant_ids())
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "tenant_manage_own_youtube_cache" ON public.youtube_video_cache;
CREATE POLICY "tenant_manage_own_youtube_cache" ON public.youtube_video_cache
  FOR ALL
  USING (
    tenant_id IN (SELECT public.get_user_tenant_ids())
    OR public.is_super_admin()
  )
  WITH CHECK (
    tenant_id IN (SELECT public.get_user_tenant_ids())
    OR public.is_super_admin()
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- GA4 CONNECTIONS RLS
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.ga4_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_read_own_ga4" ON public.ga4_connections;
CREATE POLICY "tenant_read_own_ga4" ON public.ga4_connections
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

DROP POLICY IF EXISTS "tenant_manage_own_ga4" ON public.ga4_connections;
CREATE POLICY "tenant_manage_own_ga4" ON public.ga4_connections
  FOR ALL
  USING (
    deleted_at IS NULL
    AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  )
  WITH CHECK (
    tenant_id IN (SELECT public.get_user_tenant_ids())
    OR public.is_super_admin()
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- GOOGLE SEARCH CONSOLE CONNECTIONS RLS
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.google_search_console_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_read_own_gsc" ON public.google_search_console_connections;
CREATE POLICY "tenant_read_own_gsc" ON public.google_search_console_connections
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

DROP POLICY IF EXISTS "tenant_manage_own_gsc" ON public.google_search_console_connections;
CREATE POLICY "tenant_manage_own_gsc" ON public.google_search_console_connections
  FOR ALL
  USING (
    deleted_at IS NULL
    AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  )
  WITH CHECK (
    tenant_id IN (SELECT public.get_user_tenant_ids())
    OR public.is_super_admin()
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- FACEBOOK CONNECTIONS RLS
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.facebook_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_read_own_facebook" ON public.facebook_connections;
CREATE POLICY "tenant_read_own_facebook" ON public.facebook_connections
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

DROP POLICY IF EXISTS "tenant_manage_own_facebook" ON public.facebook_connections;
CREATE POLICY "tenant_manage_own_facebook" ON public.facebook_connections
  FOR ALL
  USING (
    deleted_at IS NULL
    AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  )
  WITH CHECK (
    tenant_id IN (SELECT public.get_user_tenant_ids())
    OR public.is_super_admin()
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- FACEBOOK PUBLISH HISTORY RLS
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.facebook_publish_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_read_own_fb_history" ON public.facebook_publish_history;
CREATE POLICY "tenant_read_own_fb_history" ON public.facebook_publish_history
  FOR SELECT
  USING (
    tenant_id IN (SELECT public.get_user_tenant_ids())
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "tenant_manage_own_fb_history" ON public.facebook_publish_history;
CREATE POLICY "tenant_manage_own_fb_history" ON public.facebook_publish_history
  FOR ALL
  USING (
    tenant_id IN (SELECT public.get_user_tenant_ids())
    OR public.is_super_admin()
  )
  WITH CHECK (
    tenant_id IN (SELECT public.get_user_tenant_ids())
    OR public.is_super_admin()
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- SEO SETTINGS RLS (IF NOT ALREADY PROTECTED)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.seo_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_read_own_seo_settings" ON public.seo_settings;
CREATE POLICY "tenant_read_own_seo_settings" ON public.seo_settings
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

DROP POLICY IF EXISTS "tenant_manage_own_seo_settings" ON public.seo_settings;
CREATE POLICY "tenant_manage_own_seo_settings" ON public.seo_settings
  FOR ALL
  USING (
    deleted_at IS NULL
    AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  )
  WITH CHECK (
    tenant_id IN (SELECT public.get_user_tenant_ids())
    OR public.is_super_admin()
  );

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES (FOR TESTING - DO NOT RUN IN PRODUCTION)
-- ═══════════════════════════════════════════════════════════════════════════

-- Run these manually to verify RLS is working:
/*
-- 1. Verify RLS is enabled on all tables
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE '%tenant%'
ORDER BY tablename;

-- 2. List all RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3. Test cross-tenant access (should return 0 rows if working)
-- Login as Tenant A, try to access Tenant B data:
SELECT COUNT(*) FROM public.tenant_footer_settings WHERE tenant_id = '<tenant_b_id>';
-- Expected: 0 rows

-- 4. Test own tenant access (should return data)
SELECT COUNT(*) FROM public.tenant_footer_settings WHERE tenant_id IN (SELECT public.get_user_tenant_ids());
-- Expected: >= 1 row
*/
