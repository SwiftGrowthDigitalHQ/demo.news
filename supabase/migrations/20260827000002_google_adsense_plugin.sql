-- ============================================================================
-- GOOGLE ADSENSE PLUGIN — Database Configuration
-- ============================================================================
-- Strategy: AdSense configuration is stored in tenant_plugins.configuration
-- JSONB (no separate table needed). This migration only adds:
--   1. Helper functions for safe retrieval of AdSense config
--   2. Validation constraints
--   3. Comments documenting the configuration schema
--
-- tenant_plugins table already exists (20260826000001_fix_tenant_plugins_table.sql).
-- ============================================================================

-- ── Comments documenting the configuration schema ──────────────────────────

COMMENT ON TABLE public.tenant_plugins IS
  'Tenant-specific plugin activation and configuration.
   
   For google-adsense plugin, the configuration JSONB should contain:
   {
     "publisher_id": "ca-pub-XXXXXXXXXXXXXXXX",  -- Google AdSense Publisher ID
     "auto_ads_enabled": boolean,                 -- Enable Auto Ads
     "responsive_ads": boolean,                   -- Enable responsive ad units
     "ads_txt_enabled": boolean,                  -- Enable ads.txt generation
     "test_mode": boolean,                        -- Test mode (uses test ad client)
     "placements": {
       "header": { "enabled": boolean, "slot": "optional-slot-id" },
       "before_article": { "enabled": boolean, "slot": "optional-slot-id" },
       "after_article_title": { "enabled": boolean, "slot": "optional-slot-id" },
       "in_article": { "enabled": boolean, "slot": "optional-slot-id" },
       "after_article": { "enabled": boolean, "slot": "optional-slot-id" },
       "between_articles": { "enabled": boolean, "slot": "optional-slot-id" },
       "sidebar": { "enabled": boolean, "slot": "optional-slot-id" },
       "footer": { "enabled": boolean, "slot": "optional-slot-id" },
       "mobile": { "enabled": boolean, "slot": "optional-slot-id" }
     },
     "default_ad_format": "auto"|"display"|"in-article"|"in-feed"
   }
   
   NOTE: Ad slot IDs are optional. Leave empty to use Auto Ads.
   SECURITY: Never store OAuth secrets or service-role keys in configuration.
   ';

-- ── 1. Helper function: Get AdSense configuration for a tenant ─────────────

CREATE OR REPLACE FUNCTION public.get_adsense_config(p_tenant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_config JSONB;
BEGIN
  -- Retrieve AdSense plugin configuration for the specified tenant
  SELECT configuration
  INTO v_config
  FROM public.tenant_plugins
  WHERE tenant_id = p_tenant_id
    AND plugin_key = 'google-adsense'
    AND enabled = true;
  
  -- Return empty object if not found or disabled
  RETURN COALESCE(v_config, '{}'::jsonb);
END;
$$;

COMMENT ON FUNCTION public.get_adsense_config(UUID) IS
  'Retrieves Google AdSense configuration for a tenant if the plugin is enabled.
   Returns empty object if plugin is disabled or not configured.
   SECURITY DEFINER allows Edge Functions to query cross-tenant safely.';

-- ── 2. Helper function: Get ads.txt content for a tenant ───────────────────

CREATE OR REPLACE FUNCTION public.get_adsense_ads_txt(p_tenant_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_config JSONB;
  v_publisher_id TEXT;
BEGIN
  -- Get AdSense configuration
  SELECT configuration
  INTO v_config
  FROM public.tenant_plugins
  WHERE tenant_id = p_tenant_id
    AND plugin_key = 'google-adsense'
    AND enabled = true;
  
  -- Extract publisher_id
  v_publisher_id := v_config->>'publisher_id';
  
  -- Return formatted ads.txt if publisher ID exists and ads.txt is enabled
  IF v_publisher_id IS NOT NULL AND 
     v_publisher_id != '' AND 
     COALESCE((v_config->>'ads_txt_enabled')::boolean, false) = true THEN
    -- Extract just the publisher number from ca-pub-XXXXXXXXXXXXXXXX
    v_publisher_id := REGEXP_REPLACE(v_publisher_id, '^ca-pub-', '');
    RETURN FORMAT('google.com, pub-%s, DIRECT, f08c47fec0942fa0', v_publisher_id);
  END IF;
  
  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.get_adsense_ads_txt(UUID) IS
  'Generates ads.txt content for a tenant based on their AdSense publisher ID.
   Returns NULL if plugin is disabled or publisher ID is not configured.
   Format: google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0';

-- ── 3. Validation function: Validate publisher ID format ───────────────────

CREATE OR REPLACE FUNCTION public.validate_adsense_publisher_id(p_publisher_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Valid format: ca-pub-XXXXXXXXXXXXXXXX (16 digits)
  RETURN p_publisher_id ~ '^ca-pub-[0-9]{16}$';
END;
$$;

COMMENT ON FUNCTION public.validate_adsense_publisher_id(TEXT) IS
  'Validates Google AdSense publisher ID format.
   Expected format: ca-pub-XXXXXXXXXXXXXXXX where X is a digit.';

-- ── 4. Grant execute permissions ──────────────────────────────────────────

-- Allow authenticated users (tenant owners) to check their own config
GRANT EXECUTE ON FUNCTION public.get_adsense_config(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_adsense_ads_txt(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_adsense_publisher_id(TEXT) TO authenticated;

-- Allow service_role (Edge Functions) to access these functions
GRANT EXECUTE ON FUNCTION public.get_adsense_config(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_adsense_ads_txt(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.validate_adsense_publisher_id(TEXT) TO service_role;

-- ── 5. Add default placements template for new installations ────────────────

-- This is just documentation; actual default is applied in the admin UI
COMMENT ON COLUMN public.tenant_plugins.configuration IS
  'Plugin-specific JSON configuration (API keys, settings). Never store secrets here.
   
   Default Google AdSense placements template:
   {
     "placements": {
       "header": { "enabled": false, "slot": "" },
       "before_article": { "enabled": false, "slot": "" },
       "after_article_title": { "enabled": false, "slot": "" },
       "in_article": { "enabled": false, "slot": "" },
       "after_article": { "enabled": true, "slot": "" },
       "between_articles": { "enabled": false, "slot": "" },
       "sidebar": { "enabled": true, "slot": "" },
       "footer": { "enabled": false, "slot": "" },
       "mobile": { "enabled": true, "slot": "" }
     }
   }
   
   Note: Slot IDs are optional - leave empty to use Auto Ads.';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
