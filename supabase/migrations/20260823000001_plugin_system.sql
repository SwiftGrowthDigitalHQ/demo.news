-- =====================================================
-- PLUGIN MANAGEMENT SYSTEM
-- =====================================================
-- Create tenant-aware plugin configuration system
-- Each tenant has independent plugin state/configuration
-- =====================================================

-- ── Table: tenant_plugins ────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_plugins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plugin_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  configuration JSONB NOT NULL DEFAULT '{}',
  installed_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure one row per tenant per plugin
  CONSTRAINT tenant_plugins_unique UNIQUE (tenant_id, plugin_key)
);

-- ── Indexes ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tenant_plugins_tenant_id ON tenant_plugins(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_plugins_plugin_key ON tenant_plugins(plugin_key);
CREATE INDEX IF NOT EXISTS idx_tenant_plugins_enabled ON tenant_plugins(tenant_id, enabled);

-- ── RLS Policies ─────────────────────────────────────
ALTER TABLE tenant_plugins ENABLE ROW LEVEL SECURITY;

-- Admin/Owner can read their tenant's plugins
CREATE POLICY "Admins can read tenant plugins"
  ON tenant_plugins FOR SELECT
  USING (
    tenant_id IN (
      SELECT id FROM tenants WHERE owner_auth_user_id = auth.uid()
    )
  );

-- Admin/Owner can insert plugins for their tenant
CREATE POLICY "Admins can insert tenant plugins"
  ON tenant_plugins FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT id FROM tenants WHERE owner_auth_user_id = auth.uid()
    )
  );

-- Admin/Owner can update their tenant's plugins
CREATE POLICY "Admins can update tenant plugins"
  ON tenant_plugins FOR UPDATE
  USING (
    tenant_id IN (
      SELECT id FROM tenants WHERE owner_auth_user_id = auth.uid()
    )
  );

-- Admin/Owner can delete their tenant's plugins
CREATE POLICY "Admins can delete tenant plugins"
  ON tenant_plugins FOR DELETE
  USING (
    tenant_id IN (
      SELECT id FROM tenants WHERE owner_auth_user_id = auth.uid()
    )
  );

-- ── Trigger: Update updated_at ──────────────────────
CREATE OR REPLACE FUNCTION update_tenant_plugins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenant_plugins_updated_at
  BEFORE UPDATE ON tenant_plugins
  FOR EACH ROW
  EXECUTE FUNCTION update_tenant_plugins_updated_at();

-- ── Comments ─────────────────────────────────────────
COMMENT ON TABLE tenant_plugins IS 'Tenant-specific plugin activation and configuration';
COMMENT ON COLUMN tenant_plugins.plugin_key IS 'Unique plugin identifier (e.g., "google-drive", "seo-manager")';
COMMENT ON COLUMN tenant_plugins.enabled IS 'Whether the plugin is currently active';
COMMENT ON COLUMN tenant_plugins.configuration IS 'Plugin-specific configuration JSON (e.g., API keys, settings)';
COMMENT ON COLUMN tenant_plugins.installed_version IS 'Currently installed plugin version';
