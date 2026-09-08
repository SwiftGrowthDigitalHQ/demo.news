-- Migration: Activate XML Sitemap Plugin for Production
-- Date: 2026-09-08
-- Purpose: Enable XML sitemap generation and SEO configuration for live deployment
-- Status: Production-ready, safe to apply

-- 1. Ensure tenant_plugins table exists with required structure
CREATE TABLE IF NOT EXISTS public.tenant_plugins (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plugin_name TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, plugin_name)
);

-- 2. Create index for efficient plugin lookups
CREATE INDEX IF NOT EXISTS idx_tenant_plugins_tenant_id_enabled
  ON public.tenant_plugins(tenant_id, is_enabled);

-- 3. Enable xml_sitemap plugin for primary tenant (sangtx)
-- First, ensure the tenant exists
INSERT INTO public.tenant_plugins (tenant_id, plugin_name, is_enabled, config)
SELECT 
  t.id,
  'xml_sitemap' AS plugin_name,
  TRUE AS is_enabled,
  jsonb_build_object(
    'enabled', true,
    'canonical_base_url', 'https://sangtx.com',
    'include_homepage', true,
    'include_categories', true,
    'include_articles', true,
    'max_urls_per_sitemap', 50000,
    'cache_ttl_seconds', 3600,
    'last_updated', NOW()::text
  ) AS config
FROM public.tenants t
WHERE t.slug = 'sangtx'
ON CONFLICT (tenant_id, plugin_name) 
DO UPDATE SET 
  is_enabled = TRUE,
  config = jsonb_build_object(
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

-- 4. Create or update function to get sitemap configuration
CREATE OR REPLACE FUNCTION public.get_sitemap_config(p_tenant_id UUID)
RETURNS JSONB AS $$
BEGIN
  RETURN COALESCE(
    (SELECT config FROM public.tenant_plugins 
     WHERE tenant_id = p_tenant_id 
     AND plugin_name = 'xml_sitemap' 
     AND is_enabled = TRUE
     LIMIT 1),
    jsonb_build_object(
      'enabled', false,
      'canonical_base_url', ''
    )
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- 5. Create or update function to get sitemap data (published articles only)
CREATE OR REPLACE FUNCTION public.get_sitemap_data(
  p_tenant_id UUID,
  p_type TEXT DEFAULT 'articles',
  p_limit INT DEFAULT 50000,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  url_path TEXT,
  last_modified TIMESTAMP WITH TIME ZONE,
  change_frequency TEXT,
  priority NUMERIC
) AS $$
BEGIN
  IF p_type = 'articles' THEN
    RETURN QUERY
    SELECT 
      '/article/' || a.slug AS url_path,
      COALESCE(a.updated_at, a.created_at) AS last_modified,
      'weekly'::TEXT AS change_frequency,
      0.8::NUMERIC AS priority
    FROM public.articles a
    WHERE a.tenant_id = p_tenant_id
    AND a.status = 'published'
    AND a.deleted_at IS NULL
    ORDER BY a.updated_at DESC NULLS LAST
    LIMIT p_limit
    OFFSET p_offset;
  
  ELSIF p_type = 'categories' THEN
    RETURN QUERY
    SELECT 
      '/category/' || c.slug AS url_path,
      COALESCE(c.updated_at, c.created_at) AS last_modified,
      'weekly'::TEXT AS change_frequency,
      0.7::NUMERIC AS priority
    FROM public.categories c
    WHERE c.tenant_id = p_tenant_id
    AND c.deleted_at IS NULL
    ORDER BY c.updated_at DESC NULLS LAST
    LIMIT p_limit
    OFFSET p_offset;
  
  ELSIF p_type = 'homepage' THEN
    RETURN QUERY
    SELECT 
      '/' AS url_path,
      NOW() AS last_modified,
      'daily'::TEXT AS change_frequency,
      1.0::NUMERIC AS priority;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- 6. Create index on articles for sitemap queries
CREATE INDEX IF NOT EXISTS idx_articles_tenant_status_deleted
  ON public.articles(tenant_id, status, deleted_at)
  WHERE status = 'published' AND deleted_at IS NULL;

-- 7. Create index on categories for sitemap queries
CREATE INDEX IF NOT EXISTS idx_categories_tenant_deleted
  ON public.categories(tenant_id, deleted_at)
  WHERE deleted_at IS NULL;

-- 8. Grant permissions for Edge Function to access these functions
GRANT EXECUTE ON FUNCTION public.get_sitemap_config(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_sitemap_data(UUID, TEXT, INT, INT) TO anon, authenticated, service_role;

-- 9. Add comments for documentation
COMMENT ON TABLE public.tenant_plugins IS 'Manages feature flags and plugin configurations per tenant';
COMMENT ON FUNCTION public.get_sitemap_config(UUID) IS 'Retrieves sitemap configuration for a tenant';
COMMENT ON FUNCTION public.get_sitemap_data(UUID, TEXT, INT, INT) IS 'Retrieves sitemap data (articles, categories, homepage) for a tenant';

-- 10. Verify migration applied successfully
-- This will be used for post-deployment verification
DO $$
DECLARE
  v_plugin_exists BOOLEAN;
  v_function_exists BOOLEAN;
BEGIN
  -- Check if xml_sitemap plugin is enabled for sangtx tenant
  SELECT EXISTS(
    SELECT 1 FROM public.tenant_plugins tp
    JOIN public.tenants t ON tp.tenant_id = t.id
    WHERE t.slug = 'sangtx'
    AND tp.plugin_name = 'xml_sitemap'
    AND tp.is_enabled = TRUE
  ) INTO v_plugin_exists;
  
  -- Check if required functions exist
  SELECT EXISTS(
    SELECT 1 FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND routine_name = 'get_sitemap_data'
  ) INTO v_function_exists;
  
  IF v_plugin_exists THEN
    RAISE NOTICE 'XML Sitemap Plugin activated for sangtx tenant';
  ELSE
    RAISE WARNING 'XML Sitemap Plugin activation may have failed';
  END IF;
  
  IF v_function_exists THEN
    RAISE NOTICE 'Sitemap functions created successfully';
  ELSE
    RAISE WARNING 'Sitemap functions may not exist';
  END IF;
END
$$;
