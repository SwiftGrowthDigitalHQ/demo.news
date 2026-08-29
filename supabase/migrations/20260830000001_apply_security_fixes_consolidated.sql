-- ═══════════════════════════════════════════════════════════════════════════
-- CONSOLIDATED SECURITY FIX MIGRATION
-- This migration consolidates all security fixes into one safe migration
-- Uses DROP IF EXISTS to safely handle existing objects
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 1: FOOTER TABLES RLS (from 20260829000010)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.tenant_footer_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_footer_social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_footer_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_footer_links ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "tenant_read_own_footer_settings" ON public.tenant_footer_settings;
DROP POLICY IF EXISTS "tenant_manage_own_footer_settings" ON public.tenant_footer_settings;
DROP POLICY IF EXISTS "tenant_read_own_footer_social" ON public.tenant_footer_social_links;
DROP POLICY IF EXISTS "tenant_manage_own_footer_social" ON public.tenant_footer_social_links;
DROP POLICY IF EXISTS "tenant_read_own_footer_columns" ON public.tenant_footer_columns;
DROP POLICY IF EXISTS "tenant_manage_own_footer_columns" ON public.tenant_footer_columns;
DROP POLICY IF EXISTS "tenant_read_own_footer_links" ON public.tenant_footer_links;
DROP POLICY IF EXISTS "tenant_manage_own_footer_links" ON public.tenant_footer_links;

-- Create new policies
CREATE POLICY "tenant_read_own_footer_settings" ON public.tenant_footer_settings
  FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin());

CREATE POLICY "tenant_manage_own_footer_settings" ON public.tenant_footer_settings
  FOR ALL USING (tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin())
  WITH CHECK (tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin());

CREATE POLICY "tenant_read_own_footer_social" ON public.tenant_footer_social_links
  FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin());

CREATE POLICY "tenant_manage_own_footer_social" ON public.tenant_footer_social_links
  FOR ALL USING (tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin())
  WITH CHECK (tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin());

CREATE POLICY "tenant_read_own_footer_columns" ON public.tenant_footer_columns
  FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin());

CREATE POLICY "tenant_manage_own_footer_columns" ON public.tenant_footer_columns
  FOR ALL USING (tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin())
  WITH CHECK (tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin());

CREATE POLICY "tenant_read_own_footer_links" ON public.tenant_footer_links
  FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin());

CREATE POLICY "tenant_manage_own_footer_links" ON public.tenant_footer_links
  FOR ALL USING (tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin())
  WITH CHECK (tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin());

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 2: CUSTOM PAGES & DOMAINS RLS
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.tenant_custom_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_domains ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_read_own_custom_pages" ON public.tenant_custom_pages;
DROP POLICY IF EXISTS "tenant_manage_own_custom_pages" ON public.tenant_custom_pages;
DROP POLICY IF EXISTS "public_read_enabled_custom_pages" ON public.tenant_custom_pages;
DROP POLICY IF EXISTS "tenant_read_own_domains" ON public.tenant_domains;
DROP POLICY IF EXISTS "tenant_manage_own_domains" ON public.tenant_domains;
DROP POLICY IF EXISTS "public_read_verified_domains" ON public.tenant_domains;

CREATE POLICY "tenant_read_own_custom_pages" ON public.tenant_custom_pages
  FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin());

CREATE POLICY "tenant_manage_own_custom_pages" ON public.tenant_custom_pages
  FOR ALL USING (tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin())
  WITH CHECK (tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin());

CREATE POLICY "public_read_enabled_custom_pages" ON public.tenant_custom_pages
  FOR SELECT USING (enabled = true AND deleted_at IS NULL);

CREATE POLICY "tenant_read_own_domains" ON public.tenant_domains
  FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin());

CREATE POLICY "tenant_manage_own_domains" ON public.tenant_domains
  FOR ALL USING (tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin())
  WITH CHECK (tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin());

CREATE POLICY "public_read_verified_domains" ON public.tenant_domains
  FOR SELECT USING (status IN ('approved', 'verified', 'connected') AND deleted_at IS NULL);

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 3: PLUGIN TABLES RLS
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.tenant_plugins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_seo_defaults ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_read_own_plugins" ON public.tenant_plugins;
DROP POLICY IF EXISTS "tenant_manage_own_plugins" ON public.tenant_plugins;
DROP POLICY IF EXISTS "tenant_read_own_seo" ON public.tenant_seo_defaults;
DROP POLICY IF EXISTS "tenant_manage_own_seo" ON public.tenant_seo_defaults;

CREATE POLICY "tenant_read_own_plugins" ON public.tenant_plugins
  FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin());

CREATE POLICY "tenant_manage_own_plugins" ON public.tenant_plugins
  FOR ALL USING (tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin())
  WITH CHECK (tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin());

CREATE POLICY "tenant_read_own_seo" ON public.tenant_seo_defaults
  FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin());

CREATE POLICY "tenant_manage_own_seo" ON public.tenant_seo_defaults
  FOR ALL USING (tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin())
  WITH CHECK (tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin());

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 4: OAUTH/INTEGRATION TABLES RLS
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable RLS
DO $$
BEGIN
  -- Google Drive
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tenant_google_drive_connections') THEN
    EXECUTE 'ALTER TABLE public.tenant_google_drive_connections ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "tenant_read_own_gdrive" ON public.tenant_google_drive_connections';
    EXECUTE 'DROP POLICY IF EXISTS "tenant_manage_own_gdrive" ON public.tenant_google_drive_connections';
    EXECUTE 'CREATE POLICY "tenant_read_own_gdrive" ON public.tenant_google_drive_connections FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin())';
    EXECUTE 'CREATE POLICY "tenant_manage_own_gdrive" ON public.tenant_google_drive_connections FOR ALL USING (tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin()) WITH CHECK (tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin())';
  END IF;

  -- YouTube
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'youtube_connections') THEN
    EXECUTE 'ALTER TABLE public.youtube_connections ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "tenant_read_own_youtube" ON public.youtube_connections';
    EXECUTE 'DROP POLICY IF EXISTS "tenant_manage_own_youtube" ON public.youtube_connections';
    EXECUTE 'CREATE POLICY "tenant_read_own_youtube" ON public.youtube_connections FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin())';
    EXECUTE 'CREATE POLICY "tenant_manage_own_youtube" ON public.youtube_connections FOR ALL USING (tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin()) WITH CHECK (tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin())';
  END IF;

  -- YouTube Video Cache
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'youtube_video_cache') THEN
    EXECUTE 'ALTER TABLE public.youtube_video_cache ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "tenant_read_own_youtube_cache" ON public.youtube_video_cache';
    EXECUTE 'DROP POLICY IF EXISTS "tenant_manage_own_youtube_cache" ON public.youtube_video_cache';
    EXECUTE 'CREATE POLICY "tenant_read_own_youtube_cache" ON public.youtube_video_cache FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin())';
    EXECUTE 'CREATE POLICY "tenant_manage_own_youtube_cache" ON public.youtube_video_cache FOR ALL USING (tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin()) WITH CHECK (tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin())';
  END IF;

  -- GA4
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ga4_connections') THEN
    EXECUTE 'ALTER TABLE public.ga4_connections ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "tenant_read_own_ga4" ON public.ga4_connections';
    EXECUTE 'DROP POLICY IF EXISTS "tenant_manage_own_ga4" ON public.ga4_connections';
    EXECUTE 'CREATE POLICY "tenant_read_own_ga4" ON public.ga4_connections FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin())';
    EXECUTE 'CREATE POLICY "tenant_manage_own_ga4" ON public.ga4_connections FOR ALL USING (tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin()) WITH CHECK (tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin())';
  END IF;

  -- Google Search Console
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'google_search_console_connections') THEN
    EXECUTE 'ALTER TABLE public.google_search_console_connections ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "tenant_read_own_gsc" ON public.google_search_console_connections';
    EXECUTE 'DROP POLICY IF EXISTS "tenant_manage_own_gsc" ON public.google_search_console_connections';
    EXECUTE 'CREATE POLICY "tenant_read_own_gsc" ON public.google_search_console_connections FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin())';
    EXECUTE 'CREATE POLICY "tenant_manage_own_gsc" ON public.google_search_console_connections FOR ALL USING (tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin()) WITH CHECK (tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin())';
  END IF;

  -- Facebook
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'facebook_connections') THEN
    EXECUTE 'ALTER TABLE public.facebook_connections ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "tenant_read_own_facebook" ON public.facebook_connections';
    EXECUTE 'DROP POLICY IF EXISTS "tenant_manage_own_facebook" ON public.facebook_connections';
    EXECUTE 'CREATE POLICY "tenant_read_own_facebook" ON public.facebook_connections FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin())';
    EXECUTE 'CREATE POLICY "tenant_manage_own_facebook" ON public.facebook_connections FOR ALL USING (tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin()) WITH CHECK (tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin())';
  END IF;

  -- Facebook Publish History
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'facebook_publish_history') THEN
    EXECUTE 'ALTER TABLE public.facebook_publish_history ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "tenant_read_own_fb_history" ON public.facebook_publish_history';
    EXECUTE 'DROP POLICY IF EXISTS "tenant_manage_own_fb_history" ON public.facebook_publish_history';
    EXECUTE 'CREATE POLICY "tenant_read_own_fb_history" ON public.facebook_publish_history FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin())';
    EXECUTE 'CREATE POLICY "tenant_manage_own_fb_history" ON public.facebook_publish_history FOR ALL USING (tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin()) WITH CHECK (tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin())';
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 5: SYSTEM TABLES RLS (from 20260829000011)
-- ═══════════════════════════════════════════════════════════════════════════

-- Add tenant_id columns if not exist
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.analytics_events ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_tags ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "users_read_self" ON public.users;
DROP POLICY IF EXISTS "users_read_own_tenant" ON public.users;
DROP POLICY IF EXISTS "users_manage_super_admin" ON public.users;
DROP POLICY IF EXISTS "roles_read_all_authenticated" ON public.roles;
DROP POLICY IF EXISTS "roles_manage_super_admin" ON public.roles;
DROP POLICY IF EXISTS "permissions_read_all_authenticated" ON public.permissions;
DROP POLICY IF EXISTS "permissions_manage_super_admin" ON public.permissions;
DROP POLICY IF EXISTS "role_permissions_read_all_authenticated" ON public.role_permissions;
DROP POLICY IF EXISTS "role_permissions_manage_super_admin" ON public.role_permissions;
DROP POLICY IF EXISTS "subscriptions_read_own_tenant" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_manage_own_tenant" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_insert_public" ON public.subscriptions;
DROP POLICY IF EXISTS "payments_read_super_admin" ON public.payments;
DROP POLICY IF EXISTS "payments_manage_super_admin" ON public.payments;
DROP POLICY IF EXISTS "audit_logs_read_own_tenant" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert_super_admin" ON public.audit_logs;
DROP POLICY IF EXISTS "analytics_events_read_own_tenant" ON public.analytics_events;
DROP POLICY IF EXISTS "analytics_events_insert_system" ON public.analytics_events;
DROP POLICY IF EXISTS "article_tags_read_via_article" ON public.article_tags;
DROP POLICY IF EXISTS "article_tags_manage_via_article" ON public.article_tags;

-- Create policies
CREATE POLICY "users_read_self" ON public.users FOR SELECT USING (auth.uid() = auth_user_id);
CREATE POLICY "users_read_own_tenant" ON public.users FOR SELECT USING (deleted_at IS NULL AND (tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin()));
CREATE POLICY "users_manage_super_admin" ON public.users FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "roles_read_all_authenticated" ON public.roles FOR SELECT USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);
CREATE POLICY "roles_manage_super_admin" ON public.roles FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "permissions_read_all_authenticated" ON public.permissions FOR SELECT USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);
CREATE POLICY "permissions_manage_super_admin" ON public.permissions FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "role_permissions_read_all_authenticated" ON public.role_permissions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "role_permissions_manage_super_admin" ON public.role_permissions FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "subscriptions_read_own_tenant" ON public.subscriptions FOR SELECT USING (deleted_at IS NULL AND (tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin()));
CREATE POLICY "subscriptions_manage_own_tenant" ON public.subscriptions FOR ALL USING (deleted_at IS NULL AND (tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin())) WITH CHECK (tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin());
CREATE POLICY "subscriptions_insert_public" ON public.subscriptions FOR INSERT WITH CHECK (tenant_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.deleted_at IS NULL));

CREATE POLICY "payments_read_super_admin" ON public.payments FOR SELECT USING (public.is_super_admin());
CREATE POLICY "payments_manage_super_admin" ON public.payments FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "audit_logs_read_own_tenant" ON public.audit_logs FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin() OR (tenant_id IS NULL AND public.is_super_admin()));

CREATE POLICY "analytics_events_read_own_tenant" ON public.analytics_events FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin());
CREATE POLICY "analytics_events_insert_system" ON public.analytics_events FOR INSERT WITH CHECK (tenant_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.deleted_at IS NULL));

CREATE POLICY "article_tags_read_via_article" ON public.article_tags FOR SELECT USING (EXISTS (SELECT 1 FROM public.articles a WHERE a.id = article_tags.article_id AND a.deleted_at IS NULL AND (a.tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin())));
CREATE POLICY "article_tags_manage_via_article" ON public.article_tags FOR ALL USING (EXISTS (SELECT 1 FROM public.articles a WHERE a.id = article_tags.article_id AND a.deleted_at IS NULL AND (a.tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin()))) WITH CHECK (EXISTS (SELECT 1 FROM public.articles a WHERE a.id = article_tags.article_id AND a.deleted_at IS NULL AND (a.tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin())));

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 6: STORAGE TENANT ISOLATION (from 20260829000012)
-- ═══════════════════════════════════════════════════════════════════════════

-- Drop insecure storage policies
DROP POLICY IF EXISTS "public read media bucket" ON storage.objects;
DROP POLICY IF EXISTS "manage media bucket uploads" ON storage.objects;
DROP POLICY IF EXISTS "manage media bucket updates" ON storage.objects;
DROP POLICY IF EXISTS "manage media bucket deletes" ON storage.objects;
DROP POLICY IF EXISTS "media_select_own_tenant" ON storage.objects;
DROP POLICY IF EXISTS "media_insert_own_tenant" ON storage.objects;
DROP POLICY IF EXISTS "media_update_own_tenant" ON storage.objects;
DROP POLICY IF EXISTS "media_delete_own_tenant" ON storage.objects;

-- Create helper function for path extraction
CREATE OR REPLACE FUNCTION public.get_tenant_id_from_storage_path(object_path text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  tenant_uuid text;
BEGIN
  tenant_uuid := split_part(object_path, '/', 1);
  IF tenant_uuid ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN tenant_uuid::uuid;
  ELSE
    RETURN NULL;
  END IF;
END;
$$;

-- Create secure storage policies
CREATE POLICY "media_select_own_tenant" ON storage.objects FOR SELECT USING (
  bucket_id = 'media' AND (
    public.get_tenant_id_from_storage_path(name) IN (SELECT public.get_user_tenant_ids())
    OR public.is_super_admin()
    OR (public.get_tenant_id_from_storage_path(name) IS NULL AND auth.uid() IS NULL)
  )
);

CREATE POLICY "media_insert_own_tenant" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'media' AND auth.uid() IS NOT NULL AND (
    public.get_tenant_id_from_storage_path(name) IN (SELECT public.get_user_tenant_ids())
    OR public.is_super_admin()
  )
);

CREATE POLICY "media_update_own_tenant" ON storage.objects FOR UPDATE USING (
  bucket_id = 'media' AND auth.uid() IS NOT NULL AND (
    public.get_tenant_id_from_storage_path(name) IN (SELECT public.get_user_tenant_ids())
    OR public.is_super_admin()
  )
) WITH CHECK (
  bucket_id = 'media' AND auth.uid() IS NOT NULL AND (
    public.get_tenant_id_from_storage_path(name) IN (SELECT public.get_user_tenant_ids())
    OR public.is_super_admin()
  )
);

CREATE POLICY "media_delete_own_tenant" ON storage.objects FOR DELETE USING (
  bucket_id = 'media' AND auth.uid() IS NOT NULL AND (
    public.get_tenant_id_from_storage_path(name) IN (SELECT public.get_user_tenant_ids())
    OR public.is_super_admin()
  )
);

COMMIT;

-- Verification queries
DO $$
BEGIN
  RAISE NOTICE 'Security migration completed successfully';
  RAISE NOTICE 'Verify RLS is enabled on all tables with: SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = ''public'' AND tablename LIKE ''%%tenant%%'';';
END $$;
