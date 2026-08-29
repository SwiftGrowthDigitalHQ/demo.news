-- =====================================================
-- SEO MANAGER PLUGIN - DATABASE SCHEMA
-- =====================================================
-- Adds tenant-scoped SEO defaults and configuration
-- Existing seo_settings table is for per-page overrides
-- This migration adds tenant-level SEO defaults
-- =====================================================

-- ── Add tenant_id to existing seo_settings (for per-page overrides) ──
ALTER TABLE public.seo_settings
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Create index for tenant-based queries
CREATE INDEX IF NOT EXISTS idx_seo_settings_tenant_id ON public.seo_settings(tenant_id);

-- Update RLS policies for tenant isolation on seo_settings
DROP POLICY IF EXISTS "public read seo settings" ON public.seo_settings;
DROP POLICY IF EXISTS "manage seo settings" ON public.seo_settings;

-- Public can read tenant-specific SEO settings
CREATE POLICY "tenant_seo_settings_read"
  ON public.seo_settings FOR SELECT
  USING (deleted_at IS NULL);

-- Admins can manage their tenant's SEO settings
CREATE POLICY "tenant_seo_settings_manage"
  ON public.seo_settings FOR ALL
  USING (
    tenant_id IN (
      SELECT id FROM public.tenants WHERE owner_auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT id FROM public.tenants WHERE owner_auth_user_id = auth.uid()
    )
  );

-- ── Create tenant_seo_defaults table (SEO Manager configuration) ──
CREATE TABLE IF NOT EXISTS public.tenant_seo_defaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- General SEO
  site_title TEXT,
  site_description TEXT,
  site_keywords TEXT,
  canonical_base_url TEXT,
  default_author TEXT,
  default_language TEXT DEFAULT 'en',
  default_locale TEXT DEFAULT 'en_US',
  default_image_url TEXT,
  
  -- Robots Configuration
  robots_index BOOLEAN NOT NULL DEFAULT true,
  robots_follow BOOLEAN NOT NULL DEFAULT true,
  robots_archive BOOLEAN NOT NULL DEFAULT true,
  robots_snippet BOOLEAN NOT NULL DEFAULT true,
  robots_max_image_preview TEXT DEFAULT 'large', -- 'none', 'standard', 'large'
  robots_max_snippet INTEGER DEFAULT -1, -- -1 means no limit
  
  -- Category/Tag Indexing
  category_indexing BOOLEAN NOT NULL DEFAULT true,
  tag_indexing BOOLEAN NOT NULL DEFAULT true,
  author_indexing BOOLEAN NOT NULL DEFAULT true,
  
  -- Open Graph Defaults
  og_site_name TEXT,
  og_type TEXT DEFAULT 'website',
  og_title TEXT,
  og_description TEXT,
  og_image TEXT,
  og_image_width INTEGER,
  og_image_height INTEGER,
  
  -- Twitter/X Defaults
  twitter_card TEXT DEFAULT 'summary_large_image', -- 'summary', 'summary_large_image', 'app', 'player'
  twitter_site TEXT, -- @username
  twitter_creator TEXT, -- @username
  twitter_title TEXT,
  twitter_description TEXT,
  twitter_image TEXT,
  
  -- Advanced Settings
  show_publication_schema BOOLEAN NOT NULL DEFAULT true,
  show_breadcrumb_schema BOOLEAN NOT NULL DEFAULT true,
  show_article_schema BOOLEAN NOT NULL DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT tenant_seo_defaults_unique_tenant UNIQUE (tenant_id)
);

-- ── Indexes ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tenant_seo_defaults_tenant_id ON public.tenant_seo_defaults(tenant_id);

-- ── RLS Policies ─────────────────────────────────────
ALTER TABLE public.tenant_seo_defaults ENABLE ROW LEVEL SECURITY;

-- Public can read tenant SEO defaults (needed for rendering public pages)
CREATE POLICY "tenant_seo_defaults_public_read"
  ON public.tenant_seo_defaults FOR SELECT
  USING (true);

-- Tenant owner/admin can manage their SEO defaults
CREATE POLICY "tenant_seo_defaults_owner_manage"
  ON public.tenant_seo_defaults FOR ALL
  USING (
    tenant_id IN (
      SELECT id FROM public.tenants WHERE owner_auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT id FROM public.tenants WHERE owner_auth_user_id = auth.uid()
    )
  );

-- ── Trigger: Update updated_at ──────────────────────
CREATE OR REPLACE FUNCTION update_tenant_seo_defaults_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenant_seo_defaults_updated_at
  BEFORE UPDATE ON public.tenant_seo_defaults
  FOR EACH ROW
  EXECUTE FUNCTION update_tenant_seo_defaults_updated_at();

-- ── Helper Function: Get Tenant SEO Defaults ────────
CREATE OR REPLACE FUNCTION public.get_tenant_seo_defaults(p_tenant_id UUID)
RETURNS TABLE (
  site_title TEXT,
  site_description TEXT,
  canonical_base_url TEXT,
  robots_index BOOLEAN,
  robots_follow BOOLEAN,
  og_title TEXT,
  og_description TEXT,
  og_image TEXT,
  twitter_title TEXT,
  twitter_description TEXT,
  twitter_image TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tsd.site_title,
    tsd.site_description,
    tsd.canonical_base_url,
    tsd.robots_index,
    tsd.robots_follow,
    tsd.og_title,
    tsd.og_description,
    tsd.og_image,
    tsd.twitter_title,
    tsd.twitter_description,
    tsd.twitter_image
  FROM public.tenant_seo_defaults tsd
  WHERE tsd.tenant_id = p_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Comments ─────────────────────────────────────────
COMMENT ON TABLE public.tenant_seo_defaults IS 'SEO Manager plugin - tenant-level default SEO configuration';
COMMENT ON COLUMN public.tenant_seo_defaults.robots_index IS 'Allow search engines to index site (false = noindex)';
COMMENT ON COLUMN public.tenant_seo_defaults.robots_follow IS 'Allow search engines to follow links (false = nofollow)';
COMMENT ON COLUMN public.tenant_seo_defaults.canonical_base_url IS 'Base URL for canonical links (e.g., https://example.com)';
COMMENT ON COLUMN public.tenant_seo_defaults.default_image_url IS 'Fallback image for pages without specific images';

-- ── Initialize SEO defaults for existing tenants ────
-- Safe INSERT: one row per tenant, no cross-join.
-- Uses site_settings name when available via a proper subquery.
INSERT INTO public.tenant_seo_defaults (tenant_id, site_title, site_description, robots_index, robots_follow)
SELECT
  t.id,
  COALESCE(
    (SELECT ss.site_name FROM public.site_settings ss
     WHERE ss.tenant_id = t.id AND ss.deleted_at IS NULL
     ORDER BY ss.created_at DESC LIMIT 1),
    t.name,
    'My News Site'
  ),
  'Your trusted source for news and updates',
  true,
  true
FROM public.tenants t
WHERE t.deleted_at IS NULL
ON CONFLICT (tenant_id) DO NOTHING;

