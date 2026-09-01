-- ============================================================================
-- Google Search Console - Simplified Configuration
-- ============================================================================
--
-- This migration creates a simplified GSC configuration system that:
-- 1. Uses existing tenant_plugins table for configuration
-- 2. Stores domain and connection status
-- 3. Provides functions for configuration management
-- 4. Works on localhost and production without complexity
--
-- Configuration stored in tenant_plugins.configuration:
-- {
--   "domain": "example.com",
--   "site_url": "https://example.com/",  
--   "connected": true,
--   "last_verified": "2026-08-27T10:00:00Z"
-- }
-- ============================================================================

-- ============================================================================
-- DOMAIN VALIDATION FUNCTIONS
-- ============================================================================

-- Validate domain format (reuse from GA4 if exists, otherwise create)
CREATE OR REPLACE FUNCTION validate_domain(domain TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  normalized TEXT;
BEGIN
  IF domain IS NULL OR TRIM(domain) = '' THEN
    RETURN false;
  END IF;
  
  normalized := normalize_domain(domain);
  
  -- Basic domain validation: must contain at least one dot or be localhost
  IF normalized = 'localhost' THEN
    RETURN true;
  END IF;
  
  -- Must contain at least one dot and valid characters
  RETURN normalized ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$';
END;
$$;

-- Normalize domain (remove protocol, www, trailing slash)
CREATE OR REPLACE FUNCTION normalize_domain(domain TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  normalized TEXT;
BEGIN
  -- Convert to lowercase
  normalized := LOWER(TRIM(domain));
  
  -- Remove protocol (http://, https://)
  normalized := regexp_replace(normalized, '^https?://', '');
  
  -- Remove www. prefix
  normalized := regexp_replace(normalized, '^www\.', '');
  
  -- Remove trailing slash
  normalized := regexp_replace(normalized, '/$', '');
  
  -- Remove any remaining path
  normalized := split_part(normalized, '/', 1);
  
  RETURN normalized;
END;
$$;

-- ============================================================================
-- GSC CONFIGURATION FUNCTIONS
-- ============================================================================

-- Get GSC configuration for a tenant
CREATE OR REPLACE FUNCTION get_tenant_gsc_config(p_tenant_id UUID)
RETURNS TABLE (
  enabled BOOLEAN,
  domain TEXT,
  site_url TEXT,
  connected BOOLEAN,
  last_verified TIMESTAMPTZ,
  configured BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tp.enabled,
    tp.configuration->>'domain' AS domain,
    tp.configuration->>'site_url' AS site_url,
    COALESCE((tp.configuration->>'connected')::BOOLEAN, false) AS connected,
    CASE 
      WHEN tp.configuration ? 'last_verified' THEN 
        (tp.configuration->>'last_verified')::TIMESTAMPTZ
      ELSE NULL
    END AS last_verified,
    (
      tp.configuration ? 'domain' 
      AND tp.configuration ? 'site_url'
      AND validate_domain(tp.configuration->>'domain')
    ) AS configured
  FROM tenant_plugins tp
  WHERE tp.tenant_id = p_tenant_id
    AND tp.plugin_key = 'google-search-console'
  LIMIT 1;
  
  -- If no configuration exists, return defaults
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      false AS enabled,
      NULL::TEXT AS domain,
      NULL::TEXT AS site_url,
      false AS connected,
      NULL::TIMESTAMPTZ AS last_verified,
      false AS configured;
  END IF;
END;
$$;

-- Save GSC domain configuration
CREATE OR REPLACE FUNCTION save_tenant_gsc_domain(
  p_tenant_id UUID,
  p_domain TEXT,
  p_site_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_normalized_domain TEXT;
  v_site_url TEXT;
BEGIN
  -- Validate inputs
  IF p_domain IS NULL OR TRIM(p_domain) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Domain is required'
    );
  END IF;
  
  -- Normalize domain
  v_normalized_domain := normalize_domain(p_domain);
  
  -- Validate domain format
  IF NOT validate_domain(v_normalized_domain) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid domain format. Use format: example.com or subdomain.example.com'
    );
  END IF;
  
  -- Construct site URL if not provided
  IF p_site_url IS NULL OR TRIM(p_site_url) = '' THEN
    IF v_normalized_domain = 'localhost' THEN
      v_site_url := 'http://localhost:5173/';
    ELSE
      v_site_url := 'https://' || v_normalized_domain || '/';
    END IF;
  ELSE
    v_site_url := TRIM(p_site_url);
    -- Ensure trailing slash
    IF v_site_url !~ '/$' THEN
      v_site_url := v_site_url || '/';
    END IF;
  END IF;
  
  -- Verify tenant exists and user has access
  IF NOT EXISTS (
    SELECT 1 FROM tenants 
    WHERE id = p_tenant_id 
      AND owner_auth_user_id = auth.uid()
      AND deleted_at IS NULL
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: You do not have permission to configure this tenant'
    );
  END IF;
  
  -- Insert or update tenant_plugins row
  INSERT INTO tenant_plugins (tenant_id, plugin_key, enabled, configuration)
  VALUES (
    p_tenant_id,
    'google-search-console',
    true,  -- Enable on save
    jsonb_build_object(
      'domain', v_normalized_domain,
      'site_url', v_site_url,
      'connected', false,  -- Will be set to true after OAuth
      'last_verified', NULL
    )
  )
  ON CONFLICT (tenant_id, plugin_key) 
  DO UPDATE SET
    enabled = true,
    configuration = jsonb_build_object(
      'domain', v_normalized_domain,
      'site_url', v_site_url,
      'connected', EXCLUDED.configuration->>'connected',  -- Preserve connection status
      'last_verified', EXCLUDED.configuration->>'last_verified'
    ),
    updated_at = now();
  
  -- Return success with normalized values
  RETURN jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'domain', v_normalized_domain,
      'site_url', v_site_url,
      'enabled', true
    )
  );
END;
$$;

-- Mark GSC as connected (after OAuth success)
CREATE OR REPLACE FUNCTION mark_gsc_connected(
  p_tenant_id UUID,
  p_connected BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config JSONB;
BEGIN
  -- Verify tenant exists and user has access
  IF NOT EXISTS (
    SELECT 1 FROM tenants 
    WHERE id = p_tenant_id 
      AND owner_auth_user_id = auth.uid()
      AND deleted_at IS NULL
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized'
    );
  END IF;
  
  -- Get current configuration
  SELECT configuration INTO v_config
  FROM tenant_plugins
  WHERE tenant_id = p_tenant_id
    AND plugin_key = 'google-search-console';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'GSC not configured. Please save domain first.'
    );
  END IF;
  
  -- Update connection status
  UPDATE tenant_plugins
  SET 
    configuration = v_config || jsonb_build_object(
      'connected', p_connected,
      'last_verified', CASE WHEN p_connected THEN now() ELSE NULL END
    ),
    updated_at = now()
  WHERE tenant_id = p_tenant_id
    AND plugin_key = 'google-search-console';
  
  RETURN jsonb_build_object(
    'success', true,
    'message', CASE WHEN p_connected THEN 'Connected' ELSE 'Disconnected' END
  );
END;
$$;

-- Disable GSC
CREATE OR REPLACE FUNCTION disable_tenant_gsc(p_tenant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify tenant exists and user has access
  IF NOT EXISTS (
    SELECT 1 FROM tenants 
    WHERE id = p_tenant_id 
      AND owner_auth_user_id = auth.uid()
      AND deleted_at IS NULL
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized'
    );
  END IF;
  
  -- Update enabled flag to false
  UPDATE tenant_plugins
  SET enabled = false, updated_at = now()
  WHERE tenant_id = p_tenant_id
    AND plugin_key = 'google-search-console';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Google Search Console not configured'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Google Search Console disabled'
  );
END;
$$;

-- Disconnect (remove) GSC configuration
CREATE OR REPLACE FUNCTION disconnect_tenant_gsc(p_tenant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify tenant exists and user has access
  IF NOT EXISTS (
    SELECT 1 FROM tenants 
    WHERE id = p_tenant_id 
      AND owner_auth_user_id = auth.uid()
      AND deleted_at IS NULL
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized'
    );
  END IF;
  
  -- Delete the configuration
  DELETE FROM tenant_plugins
  WHERE tenant_id = p_tenant_id
    AND plugin_key = 'google-search-console';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Google Search Console not configured'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Google Search Console disconnected'
  );
END;
$$;

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT EXECUTE ON FUNCTION validate_domain(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION normalize_domain(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_tenant_gsc_config(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION save_tenant_gsc_domain(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_gsc_connected(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION disable_tenant_gsc(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION disconnect_tenant_gsc(UUID) TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION get_tenant_gsc_config(UUID) IS 
  'Retrieves GSC configuration for a tenant including validation status';

COMMENT ON FUNCTION save_tenant_gsc_domain(UUID, TEXT, TEXT) IS 
  'Saves GSC domain configuration with validation';

COMMENT ON FUNCTION mark_gsc_connected(UUID, BOOLEAN) IS 
  'Marks GSC as connected/disconnected after OAuth flow';

COMMENT ON FUNCTION disable_tenant_gsc(UUID) IS 
  'Disables GSC without removing configuration';

COMMENT ON FUNCTION disconnect_tenant_gsc(UUID) IS 
  'Completely removes GSC configuration';
