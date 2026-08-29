-- ═══════════════════════════════════════════════════════════════════════════
-- CUSTOM DOMAINS SYSTEM FOR MULTI-TENANT SAAS
-- Allows customers to connect their own domains to their tenant websites
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- CREATE TENANT_DOMAINS TABLE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.tenant_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  domain TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'verified', 'connected')),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  verification_status TEXT DEFAULT 'not_verified' CHECK (verification_status IN ('not_verified', 'pending', 'verified', 'failed')),
  verification_token TEXT,
  ssl_status TEXT DEFAULT 'pending' CHECK (ssl_status IN ('pending', 'provisioning', 'active', 'failed')),
  
  -- Approval workflow
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rejected_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rejection_reason TEXT,
  
  -- Metadata
  dns_configured BOOLEAN DEFAULT false,
  last_verification_check TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

COMMENT ON TABLE public.tenant_domains IS 'Custom domains for tenant websites';
COMMENT ON COLUMN public.tenant_domains.domain IS 'Normalized domain (lowercase, no protocol)';
COMMENT ON COLUMN public.tenant_domains.status IS 'pending=requested, approved=admin approved, rejected=denied, verified=DNS verified, connected=fully active';
COMMENT ON COLUMN public.tenant_domains.is_primary IS 'Primary domain for this tenant (only one per tenant)';
COMMENT ON COLUMN public.tenant_domains.verification_token IS 'Token for DNS verification';
COMMENT ON COLUMN public.tenant_domains.ssl_status IS 'SSL certificate provisioning status';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tenant_domains_tenant_id ON public.tenant_domains(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tenant_domains_domain ON public.tenant_domains(domain) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tenant_domains_status ON public.tenant_domains(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tenant_domains_primary ON public.tenant_domains(tenant_id, is_primary) WHERE deleted_at IS NULL AND is_primary = true;

-- ─────────────────────────────────────────────────────────────────────────────
-- ENSURE ONLY ONE PRIMARY DOMAIN PER TENANT
-- ─────────────────────────────────────────────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_domains_one_primary_per_tenant
  ON public.tenant_domains(tenant_id)
  WHERE is_primary = true AND deleted_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS POLICIES
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.tenant_domains ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow ANONYMOUS users to SELECT domains for public routing
DROP POLICY IF EXISTS "Allow anonymous read of active domains" ON public.tenant_domains;
CREATE POLICY "Allow anonymous read of active domains"
  ON public.tenant_domains
  FOR SELECT
  TO anon, authenticated
  USING (
    deleted_at IS NULL 
    AND status IN ('approved', 'verified', 'connected')
  );

-- Policy 2: Tenant owners/admins can view their own domain requests
-- Uses tenant_memberships to check ownership
DROP POLICY IF EXISTS "Tenant owners can view own domains" ON public.tenant_domains;
CREATE POLICY "Tenant owners can view own domains"
  ON public.tenant_domains
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_memberships
      WHERE auth_user_id = auth.uid() 
      AND role IN ('owner', 'admin')
      AND deleted_at IS NULL
    )
  );

-- Policy 3: Tenant owners can insert domain requests
DROP POLICY IF EXISTS "Tenant owners can request domains" ON public.tenant_domains;
CREATE POLICY "Tenant owners can request domains"
  ON public.tenant_domains
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_memberships
      WHERE auth_user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND deleted_at IS NULL
    )
    AND status = 'pending'
  );

-- Policy 4: Tenant owners can update their pending requests (to cancel/delete)
DROP POLICY IF EXISTS "Tenant owners can update pending domains" ON public.tenant_domains;
CREATE POLICY "Tenant owners can update pending domains"
  ON public.tenant_domains
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_memberships
      WHERE auth_user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND deleted_at IS NULL
    )
    AND status = 'pending'
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_memberships
      WHERE auth_user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND deleted_at IS NULL
    )
  );

-- Policy 5: Super admins have full access
-- Check if user has super_admin role via users/roles tables
DROP POLICY IF EXISTS "Super admins full access to domains" ON public.tenant_domains;
CREATE POLICY "Super admins full access to domains"
  ON public.tenant_domains
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.roles r ON r.id = u.role_id
      WHERE u.auth_user_id = auth.uid()
      AND r.slug = 'super_admin'
      AND u.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.roles r ON r.id = u.role_id
      WHERE u.auth_user_id = auth.uid()
      AND r.slug = 'super_admin'
      AND u.deleted_at IS NULL
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- HELPER FUNCTIONS
-- ─────────────────────────────────────────────────────────────────────────────

-- Function: Get tenant by custom domain (for hostname-based routing)
CREATE OR REPLACE FUNCTION public.get_tenant_by_domain(p_domain TEXT)
RETURNS TABLE (
  tenant_id UUID,
  tenant_slug TEXT,
  domain TEXT,
  is_primary BOOLEAN
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    td.tenant_id,
    t.slug AS tenant_slug,
    td.domain,
    td.is_primary
  FROM public.tenant_domains td
  JOIN public.tenants t ON t.id = td.tenant_id
  WHERE 
    td.domain = LOWER(TRIM(p_domain))
    AND td.deleted_at IS NULL
    AND td.status IN ('approved', 'verified', 'connected')
    AND t.deleted_at IS NULL
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION public.get_tenant_by_domain IS 'Resolve tenant from custom domain for public routing';

-- Grant execute to anon for public routing
GRANT EXECUTE ON FUNCTION public.get_tenant_by_domain TO anon, authenticated;

-- Function: Normalize domain
CREATE OR REPLACE FUNCTION public.normalize_domain(p_domain TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Convert to lowercase
  p_domain := LOWER(TRIM(p_domain));
  
  -- Remove protocol
  p_domain := REGEXP_REPLACE(p_domain, '^https?://', '', 'i');
  
  -- Remove trailing slash
  p_domain := REGEXP_REPLACE(p_domain, '/$', '');
  
  -- Remove www. (optional - decide based on your strategy)
  -- p_domain := REGEXP_REPLACE(p_domain, '^www\.', '');
  
  RETURN p_domain;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGERS
-- ─────────────────────────────────────────────────────────────────────────────

-- Trigger: Auto-normalize domain before insert/update
CREATE OR REPLACE FUNCTION public.tenant_domains_normalize_domain()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.domain := public.normalize_domain(NEW.domain);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tenant_domains_normalize_domain_trigger ON public.tenant_domains;
CREATE TRIGGER tenant_domains_normalize_domain_trigger
  BEFORE INSERT OR UPDATE ON public.tenant_domains
  FOR EACH ROW
  EXECUTE FUNCTION public.tenant_domains_normalize_domain();

-- Trigger: Generate verification token
CREATE OR REPLACE FUNCTION public.tenant_domains_generate_token()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.verification_token IS NULL THEN
    NEW.verification_token := encode(gen_random_bytes(32), 'hex');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tenant_domains_generate_token_trigger ON public.tenant_domains;
CREATE TRIGGER tenant_domains_generate_token_trigger
  BEFORE INSERT ON public.tenant_domains
  FOR EACH ROW
  EXECUTE FUNCTION public.tenant_domains_generate_token();

-- Trigger: Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.tenant_domains_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tenant_domains_updated_at_trigger ON public.tenant_domains;
CREATE TRIGGER tenant_domains_updated_at_trigger
  BEFORE UPDATE ON public.tenant_domains
  FOR EACH ROW
  EXECUTE FUNCTION public.tenant_domains_updated_at();

-- Trigger: Ensure only one primary domain per tenant
CREATE OR REPLACE FUNCTION public.tenant_domains_enforce_single_primary()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_primary = true THEN
    -- Unset other primary domains for this tenant
    UPDATE public.tenant_domains
    SET is_primary = false
    WHERE tenant_id = NEW.tenant_id
      AND id != NEW.id
      AND is_primary = true
      AND deleted_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tenant_domains_enforce_single_primary_trigger ON public.tenant_domains;
CREATE TRIGGER tenant_domains_enforce_single_primary_trigger
  BEFORE INSERT OR UPDATE ON public.tenant_domains
  FOR EACH ROW
  WHEN (NEW.is_primary = true)
  EXECUTE FUNCTION public.tenant_domains_enforce_single_primary();
