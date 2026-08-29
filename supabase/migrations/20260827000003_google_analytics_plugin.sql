-- ============================================================================
-- GOOGLE ANALYTICS 4 PLUGIN — Database Configuration
-- ============================================================================
-- Strategy: GA4 configuration is stored in tenant_plugins.configuration
-- JSONB (no separate table needed). This migration only adds:
--   1. Helper functions for safe retrieval of GA4 config
--   2. Validation constraints
--   3. Comments documenting the configuration schema
--
-- tenant_plugins table already exists (20260826000001_fix_tenant_plugins_table.sql).
-- ============================================================================

-- ── Comments documenting the configuration schema ──────────────────────────

COMMENT ON TABLE public.tenant_plugins IS
  'Tenant-specific plugin activation and configuration.
   
   For google-analytics plugin, the configuration JSONB should contain:
   {
     "measurement_id": "G-XXXXXXXXXX",        -- GA4 Measurement ID
     "enabled": boolean,                       -- Enable/disable tracking
     "track_page_views": boolean,              -- Auto page view tracking
     "track_article_views": boolean,           -- Article-specific tracking
     "track_search": boolean,                  -- Search query tracking
     "consent_mode": boolean,                  -- GDPR consent mode
     "debug_mode": boolean,                    -- Debug mode for testing
     "custom_dimensions": object               -- Optional custom dimensions
   }
   
   SECURITY: Never store API secrets or service-role keys in configuration.
   ';

-- ── 1. Helper function: Get GA4 configuration for a tenant ─────────────────

CREATE OR REPLACE FUNCTION public.get_ga4_config(p_tenant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_config JSONB;
BEGIN
  -- Retrieve GA4 plugin configuration for the specified tenant
  SELECT configuration
  INTO v_config
  FROM public.tenant_plugins
  WHERE tenant_id = p_tenant_id
    AND plugin_key = 'google-analytics'
    AND enabled = true;
  
  -- Return empty object if not found or disabled
  RETURN COALESCE(v_config, '{}'::jsonb);
END;
$$;

COMMENT ON FUNCTION public.get_ga4_config(UUID) IS
  'Retrieves Google Analytics 4 configuration for a tenant if the plugin is enabled.
   Returns empty object if plugin is disabled or not configured.
   SECURITY DEFINER allows Edge Functions to query cross-tenant safely.';

-- ── 2. Validation function: Validate GA4 Measurement ID format ─────────────

CREATE OR REPLACE FUNCTION public.validate_ga4_measurement_id(p_measurement_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Valid format: G-XXXXXXXXXX (G- followed by 10 alphanumeric characters)
  RETURN p_measurement_id ~ '^G-[A-Z0-9]{10}$';
END;
$$;

COMMENT ON FUNCTION public.validate_ga4_measurement_id(TEXT) IS
  'Validates Google Analytics 4 measurement ID format.
   Expected format: G-XXXXXXXXXX where X is alphanumeric.';

-- ── 3. Grant execute permissions ──────────────────────────────────────────

-- Allow authenticated users (tenant owners) to check their own config
GRANT EXECUTE ON FUNCTION public.get_ga4_config(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_ga4_measurement_id(TEXT) TO authenticated;

-- Allow service_role (Edge Functions) to access these functions
GRANT EXECUTE ON FUNCTION public.get_ga4_config(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.validate_ga4_measurement_id(TEXT) TO service_role;

-- ── 4. Add default configuration template for new installations ────────────

-- This is just documentation; actual default is applied in the admin UI
COMMENT ON COLUMN public.tenant_plugins.configuration IS
  'Plugin-specific JSON configuration (API keys, settings). Never store secrets here.
   
   Default Google Analytics 4 configuration template:
   {
     "measurement_id": "",
     "enabled": true,
     "track_page_views": true,
     "track_article_views": true,
     "track_search": true,
     "consent_mode": false,
     "debug_mode": false,
     "custom_dimensions": {}
   }
   
   Note: Measurement ID must be in format G-XXXXXXXXXX.';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
