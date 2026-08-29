-- ============================================================================
-- FIX: tenant_plugins table creation
-- ----------------------------------------------------------------------------
-- Why this migration exists:
--   The original plugin system migration (20260823000001_plugin_system.sql)
--   references tenants(id) via a foreign key, but the tenants table is only
--   created in 20260824000001_multi_tenant_architecture.sql.
--   Running the migrations in timestamp order therefore caused the plugin
--   system migration to fail with:
--       relation "tenants" does not exist
--   As a result, tenant_plugins was never created in the database.
--
--   Additionally, 20260823000001_plugin_system.sql shares its timestamp with
--   20260823000001_assign_admin_role_helper.sql. Supabase CLI only applies one
--   file per unique timestamp prefix, so the plugin table was skipped a second
--   time by the timestamp collision.
--
-- This migration is idempotent: every statement uses IF NOT EXISTS / OR REPLACE
-- so it is safe to run on any database state, including one that already has
-- the table from a previous manual run.
-- ============================================================================

-- ── 1. Create table (now that public.tenants exists) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.tenant_plugins (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID        NOT NULL
                               REFERENCES public.tenants(id) ON DELETE CASCADE,
  plugin_key       TEXT        NOT NULL,
  enabled          BOOLEAN     NOT NULL DEFAULT false,
  configuration    JSONB       NOT NULL DEFAULT '{}',
  installed_version TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT tenant_plugins_unique UNIQUE (tenant_id, plugin_key)
);

-- ── 2. Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tenant_plugins_tenant_id
  ON public.tenant_plugins(tenant_id);

CREATE INDEX IF NOT EXISTS idx_tenant_plugins_plugin_key
  ON public.tenant_plugins(plugin_key);

CREATE INDEX IF NOT EXISTS idx_tenant_plugins_enabled
  ON public.tenant_plugins(tenant_id, enabled);

-- ── 3. Enable RLS ────────────────────────────────────────────────────────────
ALTER TABLE public.tenant_plugins ENABLE ROW LEVEL SECURITY;

-- ── 4. RLS policies (drop first so re-running is safe) ───────────────────────
DROP POLICY IF EXISTS "tenant_plugins_select" ON public.tenant_plugins;
DROP POLICY IF EXISTS "tenant_plugins_insert" ON public.tenant_plugins;
DROP POLICY IF EXISTS "tenant_plugins_update" ON public.tenant_plugins;
DROP POLICY IF EXISTS "tenant_plugins_delete" ON public.tenant_plugins;

-- Existing names from the original migration – also drop those
DROP POLICY IF EXISTS "Admins can read tenant plugins"   ON public.tenant_plugins;
DROP POLICY IF EXISTS "Admins can insert tenant plugins" ON public.tenant_plugins;
DROP POLICY IF EXISTS "Admins can update tenant plugins" ON public.tenant_plugins;
DROP POLICY IF EXISTS "Admins can delete tenant plugins" ON public.tenant_plugins;

-- SELECT: tenant owner can read their own plugins
CREATE POLICY "tenant_plugins_select"
  ON public.tenant_plugins
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT id FROM public.tenants
      WHERE owner_auth_user_id = auth.uid()
        AND deleted_at IS NULL
    )
  );

-- INSERT: tenant owner can create plugin rows for their own tenant
CREATE POLICY "tenant_plugins_insert"
  ON public.tenant_plugins
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT id FROM public.tenants
      WHERE owner_auth_user_id = auth.uid()
        AND deleted_at IS NULL
    )
  );

-- UPDATE: tenant owner can update their own plugin rows
CREATE POLICY "tenant_plugins_update"
  ON public.tenant_plugins
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT id FROM public.tenants
      WHERE owner_auth_user_id = auth.uid()
        AND deleted_at IS NULL
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT id FROM public.tenants
      WHERE owner_auth_user_id = auth.uid()
        AND deleted_at IS NULL
    )
  );

-- DELETE: tenant owner can delete their own plugin rows
CREATE POLICY "tenant_plugins_delete"
  ON public.tenant_plugins
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT id FROM public.tenants
      WHERE owner_auth_user_id = auth.uid()
        AND deleted_at IS NULL
    )
  );

-- ── 5. updated_at trigger ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_tenant_plugins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tenant_plugins_updated_at ON public.tenant_plugins;

CREATE TRIGGER tenant_plugins_updated_at
  BEFORE UPDATE ON public.tenant_plugins
  FOR EACH ROW
  EXECUTE FUNCTION public.update_tenant_plugins_updated_at();

-- ── 6. Comments ──────────────────────────────────────────────────────────────
COMMENT ON TABLE  public.tenant_plugins IS
  'Tenant-specific plugin activation and configuration. One row per (tenant, plugin_key).';
COMMENT ON COLUMN public.tenant_plugins.plugin_key IS
  'Registry identifier matching Plugin.key in pluginRegistry.ts (e.g. "seo-manager").';
COMMENT ON COLUMN public.tenant_plugins.enabled IS
  'true = plugin is active for this tenant; false = installed but inactive.';
COMMENT ON COLUMN public.tenant_plugins.configuration IS
  'Plugin-specific JSON configuration (API keys, settings). Never store secrets here.';
