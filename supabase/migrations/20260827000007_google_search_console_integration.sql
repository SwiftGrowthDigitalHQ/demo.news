-- ============================================================================
-- Google Search Console Integration - OAuth-based Connection
-- ============================================================================
-- This migration creates the infrastructure for Google Search Console OAuth
-- integration with automatic property discovery and tenant isolation.
--
-- Customer Experience:
-- 1. Click "Connect Google Search Console"
-- 2. Sign in with Google
-- 3. Authorize read-only Search Console access
-- 4. System automatically detects verified properties
-- 5. Customer selects their website (if multiple)
-- 6. Connection saved securely
--
-- NO manual API key, NO technical configuration required.
-- ============================================================================

-- ============================================================================
-- Table: google_search_console_connections
-- ============================================================================
-- Stores OAuth connections for Google Search Console per tenant.
-- Tokens are encrypted at rest using AES-256-GCM.
-- Strict tenant isolation via RLS.
-- ============================================================================

CREATE TABLE IF NOT EXISTS google_search_console_connections (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Google Account Info
  google_account_email TEXT NOT NULL,
  google_account_id TEXT,
  
  -- Search Console Property Info
  property_url TEXT NOT NULL, -- e.g., 'https://example.com/' or 'sc-domain:example.com'
  property_type TEXT NOT NULL CHECK (property_type IN ('URL_PREFIX', 'DOMAIN')),
  permission_level TEXT, -- 'siteOwner', 'siteFullUser', 'siteRestrictedUser'
  
  -- OAuth Tokens (Encrypted)
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  granted_scopes TEXT NOT NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'error', 'revoked')),
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  
  -- Metadata
  connected_by_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  -- Constraints
  UNIQUE(tenant_id, property_url)
);

-- Indexes
CREATE INDEX idx_gsc_connections_tenant ON google_search_console_connections(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_gsc_connections_status ON google_search_console_connections(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_gsc_connections_property ON google_search_console_connections(property_url);

-- ============================================================================
-- Table: google_search_console_analytics
-- ============================================================================
-- Caches Search Console performance data to avoid excessive API calls.
-- Data is synced periodically or on-demand via "Sync Now".
-- ============================================================================

CREATE TABLE IF NOT EXISTS google_search_console_analytics (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES google_search_console_connections(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Date Range
  date_start DATE NOT NULL,
  date_end DATE NOT NULL,
  
  -- Summary Metrics
  total_clicks BIGINT NOT NULL DEFAULT 0,
  total_impressions BIGINT NOT NULL DEFAULT 0,
  average_ctr DECIMAL(10, 4), -- Click-through rate (%)
  average_position DECIMAL(10, 2), -- Average search position
  
  -- Metadata
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(connection_id, date_start, date_end)
);

-- Indexes
CREATE INDEX idx_gsc_analytics_connection ON google_search_console_analytics(connection_id);
CREATE INDEX idx_gsc_analytics_tenant ON google_search_console_analytics(tenant_id);
CREATE INDEX idx_gsc_analytics_date_range ON google_search_console_analytics(date_start, date_end);

-- ============================================================================
-- Table: google_search_console_queries
-- ============================================================================
-- Stores top search queries with performance metrics.
-- ============================================================================

CREATE TABLE IF NOT EXISTS google_search_console_queries (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES google_search_console_connections(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Date Range
  date_start DATE NOT NULL,
  date_end DATE NOT NULL,
  
  -- Query Data
  query TEXT NOT NULL,
  clicks BIGINT NOT NULL DEFAULT 0,
  impressions BIGINT NOT NULL DEFAULT 0,
  ctr DECIMAL(10, 4), -- Click-through rate (%)
  position DECIMAL(10, 2), -- Average position
  
  -- Metadata
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(connection_id, date_start, date_end, query)
);

-- Indexes
CREATE INDEX idx_gsc_queries_connection ON google_search_console_queries(connection_id);
CREATE INDEX idx_gsc_queries_tenant ON google_search_console_queries(tenant_id);
CREATE INDEX idx_gsc_queries_clicks ON google_search_console_queries(clicks DESC);
CREATE INDEX idx_gsc_queries_impressions ON google_search_console_queries(impressions DESC);

-- ============================================================================
-- Table: google_search_console_pages
-- ============================================================================
-- Stores top pages with performance metrics.
-- ============================================================================

CREATE TABLE IF NOT EXISTS google_search_console_pages (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES google_search_console_connections(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Date Range
  date_start DATE NOT NULL,
  date_end DATE NOT NULL,
  
  -- Page Data
  page_url TEXT NOT NULL,
  clicks BIGINT NOT NULL DEFAULT 0,
  impressions BIGINT NOT NULL DEFAULT 0,
  ctr DECIMAL(10, 4), -- Click-through rate (%)
  position DECIMAL(10, 2), -- Average position
  
  -- Metadata
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(connection_id, date_start, date_end, page_url)
);

-- Indexes
CREATE INDEX idx_gsc_pages_connection ON google_search_console_pages(connection_id);
CREATE INDEX idx_gsc_pages_tenant ON google_search_console_pages(tenant_id);
CREATE INDEX idx_gsc_pages_clicks ON google_search_console_pages(clicks DESC);
CREATE INDEX idx_gsc_pages_impressions ON google_search_console_pages(impressions DESC);

-- ============================================================================
-- RLS Policies - Tenant Isolation
-- ============================================================================
-- Customers can ONLY access their own tenant's Search Console data.
-- Service role can manage all data (for background sync, admin operations).
-- ============================================================================

-- Enable RLS
ALTER TABLE google_search_console_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_search_console_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_search_console_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_search_console_pages ENABLE ROW LEVEL SECURITY;

-- Helper function: Get user's tenant IDs
CREATE OR REPLACE FUNCTION get_user_tenant_ids()
RETURNS TABLE(tenant_id UUID)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT tenant_id 
  FROM tenant_memberships 
  WHERE auth_user_id = auth.uid()
$$;

-- Connections: Tenant members can read their own tenant's connection
CREATE POLICY tenant_read_own_gsc_connection
  ON google_search_console_connections
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (SELECT get_user_tenant_ids())
    AND deleted_at IS NULL
  );

-- Service role can manage all connections
CREATE POLICY service_role_manage_gsc_connections
  ON google_search_console_connections
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Analytics: Tenant members can read their own data
CREATE POLICY tenant_read_own_gsc_analytics
  ON google_search_console_analytics
  FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT get_user_tenant_ids()));

-- Service role can manage all analytics
CREATE POLICY service_role_manage_gsc_analytics
  ON google_search_console_analytics
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Queries: Tenant members can read their own data
CREATE POLICY tenant_read_own_gsc_queries
  ON google_search_console_queries
  FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT get_user_tenant_ids()));

-- Service role can manage all queries
CREATE POLICY service_role_manage_gsc_queries
  ON google_search_console_queries
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Pages: Tenant members can read their own data
CREATE POLICY tenant_read_own_gsc_pages
  ON google_search_console_pages
  FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT get_user_tenant_ids()));

-- Service role can manage all pages
CREATE POLICY service_role_manage_gsc_pages
  ON google_search_console_pages
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Get connection status (safe - never exposes tokens)
CREATE OR REPLACE FUNCTION get_gsc_connection_status()
RETURNS TABLE(
  connection_id UUID,
  tenant_id UUID,
  google_account_email TEXT,
  property_url TEXT,
  property_type TEXT,
  permission_level TEXT,
  status TEXT,
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    id,
    tenant_id,
    google_account_email,
    property_url,
    property_type,
    permission_level,
    status,
    last_sync_at,
    last_error,
    created_at
  FROM google_search_console_connections
  WHERE tenant_id IN (SELECT get_user_tenant_ids())
    AND deleted_at IS NULL
    AND status = 'active'
  LIMIT 1;
$$;

-- Update connection timestamp
CREATE OR REPLACE FUNCTION update_gsc_connection_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER gsc_connections_updated_at
  BEFORE UPDATE ON google_search_console_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_gsc_connection_updated_at();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE google_search_console_connections IS 'OAuth connections for Google Search Console with encrypted tokens';
COMMENT ON TABLE google_search_console_analytics IS 'Cached Search Console performance data (summary metrics)';
COMMENT ON TABLE google_search_console_queries IS 'Top search queries with performance metrics';
COMMENT ON TABLE google_search_console_pages IS 'Top pages with performance metrics';

COMMENT ON COLUMN google_search_console_connections.access_token_encrypted IS 'AES-256-GCM encrypted access token';
COMMENT ON COLUMN google_search_console_connections.refresh_token_encrypted IS 'AES-256-GCM encrypted refresh token';
COMMENT ON COLUMN google_search_console_connections.property_url IS 'URL-prefix (https://example.com/) or Domain (sc-domain:example.com)';
COMMENT ON COLUMN google_search_console_connections.property_type IS 'URL_PREFIX or DOMAIN property type';
