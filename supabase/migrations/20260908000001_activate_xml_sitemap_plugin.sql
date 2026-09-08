-- Migration: Activate XML Sitemap Plugin for Production
-- Date: 2026-09-08
-- Purpose: Enable XML sitemap generation and SEO configuration for live deployment
-- Status: Production-ready, safe to apply
-- Schema: Uses existing tenant_plugins table from 20260826000001_fix_tenant_plugins_table.sql

BEGIN;

-- ============================================================================
-- 1. Enable xml-sitemap plugin for sangtx tenant
-- ============================================================================
-- The tenant_plugins table already exists with columns:
--   - id UUID (PRIMARY KEY)
--   - tenant_id UUID
--   - plugin_key TEXT (e.g., 'xml-sitemap')
--   - enabled BOOLEAN
--   - configuration JSONB
--   - installed_version TEXT
--   - created_at TIMESTAMPTZ
--   - updated_at TIMESTAMPTZ
--   - UNIQUE(tenant_id, plugin_key)

INSERT INTO public.tenant_plugins (tenant_id, plugin_key, enabled, configuration)
SELECT 
  t.id,
  'xml-sitemap' AS plugin_key,
  TRUE AS enabled,
  jsonb_build_object(
    'enabled', true,
    'canonical_base_url', 'https://sangtx.com',
    'include_homepage', true,
    'include_categories', true,
    'include_articles', true,
    'max_urls_per_sitemap', 50000,
    'cache_ttl_seconds', 3600,
    'last_updated', NOW()::text
  ) AS configuration
FROM public.tenants t
WHERE t.slug = 'sangtx'
  AND t.deleted_at IS NULL
ON CONFLICT (tenant_id, plugin_key) 
DO UPDATE SET 
  enabled = TRUE,
  configuration = jsonb_build_object(
    'enabled', true,
    'canonical_base_url', 'https://sangtx.com',
    'include_homepage', true,
    'include_categories', true,
    'include_articles', true,
    'max_urls_per_sitemap', 50000,
    'cache_ttl_seconds', 3600,
    'last_updated', NOW()::text
  ),
  updated_at = NOW();

-- ============================================================================
-- 2. Create indexes on articles/categories for sitemap queries
-- ============================================================================
-- These indexes speed up the WHERE clauses used by get_sitemap_data()

CREATE INDEX IF NOT EXISTS idx_articles_tenant_status_deleted
  ON public.articles(tenant_id, status, updated_at DESC)
  WHERE status = 'published' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_categories_tenant_deleted
  ON public.categories(tenant_id, updated_at DESC)
  WHERE deleted_at IS NULL;

-- ============================================================================
-- 3. Verify migration applied successfully
-- ============================================================================
-- This will output results in post-migration logs
DO $$
DECLARE
  v_plugin_row_count INT;
  v_plugin_enabled BOOLEAN;
  v_canonical_url TEXT;
BEGIN
  -- Check if xml-sitemap plugin is enabled for sangtx tenant
  SELECT COUNT(*), bool_or(enabled), MAX(configuration->>'canonical_base_url')
  INTO v_plugin_row_count, v_plugin_enabled, v_canonical_url
  FROM public.tenant_plugins tp
  JOIN public.tenants t ON tp.tenant_id = t.id
  WHERE t.slug = 'sangtx'
    AND tp.plugin_key = 'xml-sitemap';
  
  IF v_plugin_row_count > 0 AND v_plugin_enabled = TRUE THEN
    RAISE NOTICE 'XML Sitemap Plugin activated for sangtx tenant (canonical_url: %)', v_canonical_url;
  ELSE
    RAISE WARNING 'XML Sitemap Plugin activation may have failed (rows: %, enabled: %)', v_plugin_row_count, v_plugin_enabled;
  END IF;
END
$$;

COMMIT;
