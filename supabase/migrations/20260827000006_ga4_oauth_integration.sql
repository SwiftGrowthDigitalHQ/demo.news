-- Google Analytics 4 OAuth Integration
-- 
-- This migration creates the infrastructure for OAuth-based GA4 integration.
-- Customers connect via Google OAuth instead of manually entering Measurement IDs.
-- 
-- Features:
-- - Automatic GA4 property detection
-- - Automatic Measurement ID retrieval
-- - Secure OAuth token storage (encrypted)
-- - Tenant isolation
-- - Property matching by domain

-- ============================================================================
-- GA4 CONNECTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS ga4_connections (
  -- Primary identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Google account info
  google_account_email TEXT NOT NULL,
  google_account_id TEXT NOT NULL,
  
  -- GA4 Account info
  analytics_account_id TEXT, -- e.g., "123456789"
  analytics_account_name TEXT,
  
  -- GA4 Property info
  property_id TEXT NOT NULL, -- e.g., "properties/123456789"
  property_name TEXT NOT NULL, -- Display name
  property_display_name TEXT, -- User-friendly name
  
  -- GA4 Web Data Stream info
  data_stream_id TEXT NOT NULL, -- e.g., "dataStreams/123456789"
  data_stream_name TEXT,
  data_stream_type TEXT DEFAULT 'WEB_DATA_STREAM',
  data_stream_url TEXT, -- Website URL
  
  -- The critical Measurement ID
  measurement_id TEXT NOT NULL, -- e.g., "G-XXXXXXXXXX"
  
  -- OAuth tokens (encrypted at application level)
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  granted_scopes TEXT NOT NULL,
  
  -- Connection metadata
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disconnected', 'error')),
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  connected_by_user_id UUID REFERENCES auth.users(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT unique_tenant_ga4_connection UNIQUE (tenant_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_ga4_connections_tenant_id 
  ON ga4_connections(tenant_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_ga4_connections_status 
  ON ga4_connections(status) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_ga4_connections_measurement_id 
  ON ga4_connections(measurement_id) WHERE deleted_at IS NULL;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE ga4_connections ENABLE ROW LEVEL SECURITY;

-- Tenant members can read their own GA4 connection metadata (NOT tokens)
-- RLS prevents reading encrypted tokens from the client
CREATE POLICY "tenant_read_own_ga4_connection"
  ON ga4_connections
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT get_user_tenant_ids()
    )
    AND deleted_at IS NULL
  );

-- Only service role can insert/update/delete GA4 connections
-- This ensures token encryption happens server-side only
CREATE POLICY "service_role_manage_ga4_connections"
  ON ga4_connections
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get GA4 connection status for a tenant
-- Returns safe metadata without exposing encrypted tokens
CREATE OR REPLACE FUNCTION get_ga4_connection_status(p_tenant_id UUID)
RETURNS TABLE (
  connected BOOLEAN,
  connection_id UUID,
  google_account_email TEXT,
  analytics_account_name TEXT,
  property_name TEXT,
  property_display_name TEXT,
  data_stream_url TEXT,
  measurement_id TEXT,
  status TEXT,
  last_sync_at TIMESTAMPTZ,
  last_error TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    true AS connected,
    gc.id AS connection_id,
    gc.google_account_email,
    gc.analytics_account_name,
    gc.property_name,
    gc.property_display_name,
    gc.data_stream_url,
    gc.measurement_id,
    gc.status,
    gc.last_sync_at,
    gc.last_error
  FROM ga4_connections gc
  WHERE gc.tenant_id = p_tenant_id
    AND gc.deleted_at IS NULL
    AND gc.status = 'active'
  LIMIT 1;
  
  -- If no active connection, return disconnected status
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      false AS connected,
      NULL::UUID AS connection_id,
      NULL::TEXT AS google_account_email,
      NULL::TEXT AS analytics_account_name,
      NULL::TEXT AS property_name,
      NULL::TEXT AS property_display_name,
      NULL::TEXT AS data_stream_url,
      NULL::TEXT AS measurement_id,
      NULL::TEXT AS status,
      NULL::TIMESTAMPTZ AS last_sync_at,
      NULL::TEXT AS last_error;
  END IF;
END;
$$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE ga4_connections IS 'Stores OAuth-based Google Analytics 4 connections per tenant with encrypted tokens';
COMMENT ON COLUMN ga4_connections.measurement_id IS 'GA4 Measurement ID (e.g., G-XXXXXXXXXX) automatically detected from Web Data Stream';
COMMENT ON COLUMN ga4_connections.access_token_encrypted IS 'Encrypted OAuth access token (AES-256-GCM)';
COMMENT ON COLUMN ga4_connections.refresh_token_encrypted IS 'Encrypted OAuth refresh token (AES-256-GCM)';
COMMENT ON COLUMN ga4_connections.property_id IS 'GA4 property resource name (e.g., properties/123456789)';
COMMENT ON COLUMN ga4_connections.data_stream_id IS 'GA4 data stream resource name (e.g., properties/123456789/dataStreams/987654321)';

-- Grant execute permission on helper function
GRANT EXECUTE ON FUNCTION get_ga4_connection_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_ga4_connection_status(UUID) TO service_role;
