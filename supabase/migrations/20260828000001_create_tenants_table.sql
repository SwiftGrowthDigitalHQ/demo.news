-- ═══════════════════════════════════════════════════════════════════════════
-- CREATE TENANTS TABLE
-- Missing core table required for multi-tenant architecture
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- CREATE TENANTS TABLE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

COMMENT ON TABLE public.tenants IS 'Multi-tenant organizations/news sites';
COMMENT ON COLUMN public.tenants.slug IS 'URL-safe unique identifier used in routes';
COMMENT ON COLUMN public.tenants.name IS 'Display name of the tenant';
COMMENT ON COLUMN public.tenants.status IS 'Tenant status: active, suspended, or inactive';
COMMENT ON COLUMN public.tenants.owner_id IS 'User who owns/created this tenant';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants(slug) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_status ON public.tenants(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_owner ON public.tenants(owner_id) WHERE deleted_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS POLICIES FOR PUBLIC TENANT DISCOVERY
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow ANONYMOUS users to read active tenant slugs (for public routing)
CREATE POLICY "Allow anonymous read of active tenant slugs"
  ON public.tenants
  FOR SELECT
  TO anon
  USING (deleted_at IS NULL AND status = 'active');

-- Policy 2: Allow AUTHENTICATED users to read active tenant slugs
CREATE POLICY "Allow authenticated read of active tenant slugs"
  ON public.tenants
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL AND status = 'active');

-- Policy 3: Allow super admins full access
CREATE POLICY "Allow super admin full access to tenants"
  ON public.tenants
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role_slug = 'super_admin'
      AND user_profiles.deleted_at IS NULL
    )
  );

-- Policy 4: Allow tenant owners to read/update their own tenant
CREATE POLICY "Allow tenant owners to manage their tenant"
  ON public.tenants
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- ADD OWNED_TENANT COLUMNS TO USER_PROFILES
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS owned_tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS owned_tenant_slug TEXT;

COMMENT ON COLUMN public.user_profiles.owned_tenant_id IS 'Tenant owned by this user (for tenant admins)';
COMMENT ON COLUMN public.user_profiles.owned_tenant_slug IS 'Cached tenant slug for faster lookups';

CREATE INDEX IF NOT EXISTS idx_user_profiles_owned_tenant 
  ON public.user_profiles(owned_tenant_id) WHERE deleted_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- INSERT DEFAULT TENANT (fake-news)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.tenants (slug, name, status, created_at, updated_at)
VALUES ('fake-news', 'Fake News', 'active', now(), now())
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- UPDATE TRIGGER FOR UPDATED_AT
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_tenants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_tenants_updated_at();

COMMIT;
