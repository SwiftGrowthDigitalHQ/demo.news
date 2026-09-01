-- ============================================================================
-- Google Analytics 4 - Simple Configuration (Domain + Measurement ID)
-- ============================================================================
-- 
-- This migration adds simple GA4 configuration fields to tenant_plugins.
-- Customers enter their website domain and GA4 Measurement ID directly.
-- NO OAuth required. NO external API calls needed.
-- 
-- Features:
-- - Simple domain + measurement ID configuration
-- - Stored in existing tenant_plugins table (configuration JSONB)
-- - Full tenant isolation via RLS
-- - Validation functions for domain and measurement ID format
-- - Works on localhost and production
-- 
-- Usage:
--   INSERT INTO tenant_plugins (tenant_id, plugin_key, enabled, configuration)
--   VALUES (
--     'tenant-uuid',
--     'google-analytics',
--     true,
--     '{"domain": "example.com", "measurement_id": "G-XXXXXXXXXX"}'::jsonb
--   );
-- ============================================================================

-- ============================================================================
-- VALIDATION FUNCTIONS
-- ============================================================================

-- Validate GA4 Measurement ID format (G-XXXXXXXXXX)
CREATE OR REPLACE FUNCTION validate_ga4_measurement_id(measurement_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Must match pattern: G- followed by exactly 10 alphanumeric characters
  RETURN measurement_id ~ '^G-[A-Z0-9]{10}$';
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

-- Validate domain format
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

-- ============================================================================
-- HELPER FUNCTIONS FOR GA4 CONFIGURATION
-- ============================================================================

-- Get GA4 configuration for a tenant
CREATE OR REPLACE FUNCTION get_tenant_ga4_config(p_tenant_id UUID)
RETURNS TABLE (
  enabled BOOLEAN,
  domain TEXT,
  measurement_id TEXT,
  configured BOOLEAN,
  tracking_active BOOLEAN
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
    tp.configuration->>'measurement_id' AS measurement_id,
    (
      tp.configuration ? 'domain' 
      AND tp.configuration ? 'measurement_id'
      AND validate_domain(tp.configuration->>'domain')
      AND validate_ga4_measurement_id(tp.configuration->>'measurement_id')
    ) AS configured,
    (
      tp.enabled 
      AND tp.configuration ? 'domain'
      AND tp.configuration ? 'measurement_id'
      AND validate_domain(tp.configuration->>'domain')
      AND validate_ga4_measurement_id(tp.configuration->>'measurement_id')
    ) AS tracking_active
  FROM tenant_plugins tp
  WHERE tp.tenant_id = p_tenant_id
    AND tp.plugin_key = 'google-analytics'
  LIMIT 1;
  
  -- If no configuration exists, return defaults
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      false AS enabled,
      NULL::TEXT AS domain,
      NULL::TEXT AS measurement_id,
      false AS configured,
      false AS tracking_active;
  END IF;
END;
$$;

-- Save GA4 configuration for a tenant
CREATE OR REPLACE FUNCTION save_tenant_ga4_config(
  p_tenant_id UUID,
  p_domain TEXT,
  p_measurement_id TEXT,
  p_enable BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_normalized_domain TEXT;
  v_result JSONB;
BEGIN
  -- Validate inputs
  IF p_domain IS NULL OR TRIM(p_domain) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Domain is required'
    );
  END IF;
  
  IF p_measurement_id IS NULL OR TRIM(p_measurement_id) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Measurement ID is required'
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
  
  -- Validate measurement ID format
  IF NOT validate_ga4_measurement_id(p_measurement_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid Measurement ID format. Must be G-XXXXXXXXXX (G- followed by 10 characters)'
    );
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
    'google-analytics',
    p_enable,
    jsonb_build_object(
      'domain', v_normalized_domain,
      'measurement_id', UPPER(TRIM(p_measurement_id))
    )
  )
  ON CONFLICT (tenant_id, plugin_key) 
  DO UPDATE SET
    enabled = p_enable,
    configuration = jsonb_build_object(
      'domain', v_normalized_domain,
      'measurement_id', UPPER(TRIM(p_measurement_id))
    ),
    updated_at = now();
  
  -- Return success with normalized values
  RETURN jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'domain', v_normalized_domain,
      'measurement_id', UPPER(TRIM(p_measurement_id)),
      'enabled', p_enable,
      'tracking_active', p_enable
    )
  );
END;
$$;

-- Disable GA4 tracking for a tenant
CREATE OR REPLACE FUNCTION disable_tenant_ga4(p_tenant_id UUID)
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
      'error', 'Unauthorized: You do not have permission to configure this tenant'
    );
  END IF;
  
  -- Update enabled flag to false
  UPDATE tenant_plugins
  SET enabled = false, updated_at = now()
  WHERE tenant_id = p_tenant_id
    AND plugin_key = 'google-analytics';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Google Analytics not configured for this tenant'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Google Analytics tracking disabled'
  );
END;
$$;

-- Disconnect (delete) GA4 configuration for a tenant
CREATE OR REPLACE FUNCTION disconnect_tenant_ga4(p_tenant_id UUID)
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
      'error', 'Unauthorized: You do not have permission to configure this tenant'
    );
  END IF;
  
  -- Delete the configuration
  DELETE FROM tenant_plugins
  WHERE tenant_id = p_tenant_id
    AND plugin_key = 'google-analytics';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Google Analytics not configured for this tenant'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Google Analytics configuration removed'
  );
END;
$$;

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT EXECUTE ON FUNCTION validate_ga4_measurement_id(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_domain(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION normalize_domain(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_tenant_ga4_config(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION save_tenant_ga4_config(UUID, TEXT, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION disable_tenant_ga4(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION disconnect_tenant_ga4(UUID) TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION validate_ga4_measurement_id(TEXT) IS 
  'Validates GA4 Measurement ID format (G-XXXXXXXXXX)';

COMMENT ON FUNCTION validate_domain(TEXT) IS 
  'Validates domain format (example.com, subdomain.example.com, or localhost)';

COMMENT ON FUNCTION normalize_domain(TEXT) IS 
  'Normalizes domain by removing protocol, www prefix, and trailing slash';

COMMENT ON FUNCTION get_tenant_ga4_config(UUID) IS 
  'Retrieves GA4 configuration for a tenant including validation status';

COMMENT ON FUNCTION save_tenant_ga4_config(UUID, TEXT, TEXT, BOOLEAN) IS 
  'Saves GA4 domain and measurement ID configuration with validation';

COMMENT ON FUNCTION disable_tenant_ga4(UUID) IS 
  'Disables GA4 tracking without removing configuration';

COMMENT ON FUNCTION disconnect_tenant_ga4(UUID) IS 
  'Completely removes GA4 configuration for a tenant';

