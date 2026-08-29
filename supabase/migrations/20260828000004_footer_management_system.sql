-- ═══════════════════════════════════════════════════════════════════════════
-- FOOTER MANAGEMENT SYSTEM FOR MULTI-TENANT SAAS
-- Complete dynamic footer configuration per tenant
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: tenant_footer_settings
-- Main footer configuration per tenant
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.tenant_footer_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Brand
  brand_name TEXT,
  tagline TEXT,
  description TEXT,
  logo_url TEXT,
  footer_logo_url TEXT,
  
  -- Copyright
  copyright_text TEXT,
  powered_by_text TEXT,
  powered_by_url TEXT,
  
  -- Contact Information
  contact_enabled BOOLEAN DEFAULT true,
  contact_title TEXT DEFAULT 'Editorial Office',
  contact_address TEXT,
  contact_city TEXT,
  contact_state TEXT,
  contact_country TEXT,
  contact_postal_code TEXT,
  contact_maps_url TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  contact_whatsapp TEXT,
  contact_hours TEXT,
  
  -- App Downloads
  show_google_play BOOLEAN DEFAULT true,
  google_play_url TEXT,
  google_play_button_text TEXT DEFAULT 'Google Play',
  show_app_store BOOLEAN DEFAULT true,
  app_store_url TEXT,
  app_store_button_text TEXT DEFAULT 'App Store',
  
  -- Newsletter
  newsletter_enabled BOOLEAN DEFAULT true,
  newsletter_title TEXT DEFAULT 'Newsletter Subscription',
  newsletter_description TEXT,
  newsletter_placeholder TEXT DEFAULT 'Enter your email',
  newsletter_button_text TEXT DEFAULT 'Subscribe',
  
  -- Advertisement
  footer_ad_enabled BOOLEAN DEFAULT false,
  footer_ad_title TEXT,
  footer_ad_description TEXT,
  footer_ad_image_url TEXT,
  footer_ad_button_text TEXT,
  footer_ad_button_url TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

COMMENT ON TABLE public.tenant_footer_settings IS 'Main footer configuration per tenant';

CREATE INDEX IF NOT EXISTS idx_tenant_footer_settings_tenant ON public.tenant_footer_settings(tenant_id) WHERE deleted_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: tenant_footer_social_links
-- Social media links with manual follower counts
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.tenant_footer_social_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Social Platform
  platform TEXT NOT NULL CHECK (platform IN (
    'facebook', 'twitter', 'instagram', 'youtube', 
    'telegram', 'whatsapp', 'linkedin', 'threads', 'pinterest'
  )),
  platform_name TEXT NOT NULL,
  profile_url TEXT NOT NULL,
  
  -- Manual Follower Count
  follower_count TEXT,
  follower_label TEXT DEFAULT 'Followers',
  
  -- Display
  enabled BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

COMMENT ON TABLE public.tenant_footer_social_links IS 'Social media links with manual follower counts';
COMMENT ON COLUMN public.tenant_footer_social_links.follower_count IS 'Manual follower count (e.g., 245K, 1.2M, 25,500)';

CREATE INDEX IF NOT EXISTS idx_footer_social_tenant ON public.tenant_footer_social_links(tenant_id, enabled, sort_order) WHERE deleted_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: tenant_footer_columns
-- Dynamic footer columns
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.tenant_footer_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Column
  title TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

COMMENT ON TABLE public.tenant_footer_columns IS 'Dynamic footer columns per tenant';

CREATE INDEX IF NOT EXISTS idx_footer_columns_tenant ON public.tenant_footer_columns(tenant_id, enabled, sort_order) WHERE deleted_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: tenant_footer_links
-- Links within footer columns
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.tenant_footer_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  column_id UUID NOT NULL REFERENCES public.tenant_footer_columns(id) ON DELETE CASCADE,
  
  -- Link
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  is_external BOOLEAN DEFAULT false,
  open_new_tab BOOLEAN DEFAULT false,
  enabled BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

COMMENT ON TABLE public.tenant_footer_links IS 'Links within footer columns';

CREATE INDEX IF NOT EXISTS idx_footer_links_column ON public.tenant_footer_links(column_id, enabled, sort_order) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_footer_links_tenant ON public.tenant_footer_links(tenant_id) WHERE deleted_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS POLICIES
-- ─────────────────────────────────────────────────────────────────────────────

-- tenant_footer_settings
ALTER TABLE public.tenant_footer_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read footer settings" ON public.tenant_footer_settings;
CREATE POLICY "Allow public read footer settings"
  ON public.tenant_footer_settings FOR SELECT
  TO anon, authenticated
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Tenant owners manage own footer" ON public.tenant_footer_settings;
CREATE POLICY "Tenant owners manage own footer"
  ON public.tenant_footer_settings FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_memberships
      WHERE auth_user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND deleted_at IS NULL
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_memberships
      WHERE auth_user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS "Super admins full footer access" ON public.tenant_footer_settings;
CREATE POLICY "Super admins full footer access"
  ON public.tenant_footer_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.roles r ON r.id = u.role_id
      WHERE u.auth_user_id = auth.uid()
      AND r.slug = 'super_admin'
      AND u.deleted_at IS NULL
    )
  );

-- tenant_footer_social_links
ALTER TABLE public.tenant_footer_social_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read social links" ON public.tenant_footer_social_links;
CREATE POLICY "Allow public read social links"
  ON public.tenant_footer_social_links FOR SELECT
  TO anon, authenticated
  USING (deleted_at IS NULL AND enabled = true);

DROP POLICY IF EXISTS "Tenant owners manage social links" ON public.tenant_footer_social_links;
CREATE POLICY "Tenant owners manage social links"
  ON public.tenant_footer_social_links FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_memberships
      WHERE auth_user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Super admins full social links access" ON public.tenant_footer_social_links;
CREATE POLICY "Super admins full social links access"
  ON public.tenant_footer_social_links FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.roles r ON r.id = u.role_id
      WHERE u.auth_user_id = auth.uid()
      AND r.slug = 'super_admin'
      AND u.deleted_at IS NULL
    )
  );

-- tenant_footer_columns
ALTER TABLE public.tenant_footer_columns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read footer columns" ON public.tenant_footer_columns;
CREATE POLICY "Allow public read footer columns"
  ON public.tenant_footer_columns FOR SELECT
  TO anon, authenticated
  USING (deleted_at IS NULL AND enabled = true);

DROP POLICY IF EXISTS "Tenant owners manage footer columns" ON public.tenant_footer_columns;
CREATE POLICY "Tenant owners manage footer columns"
  ON public.tenant_footer_columns FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_memberships
      WHERE auth_user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Super admins full columns access" ON public.tenant_footer_columns;
CREATE POLICY "Super admins full columns access"
  ON public.tenant_footer_columns FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.roles r ON r.id = u.role_id
      WHERE u.auth_user_id = auth.uid()
      AND r.slug = 'super_admin'
      AND u.deleted_at IS NULL
    )
  );

-- tenant_footer_links
ALTER TABLE public.tenant_footer_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read footer links" ON public.tenant_footer_links;
CREATE POLICY "Allow public read footer links"
  ON public.tenant_footer_links FOR SELECT
  TO anon, authenticated
  USING (deleted_at IS NULL AND enabled = true);

DROP POLICY IF EXISTS "Tenant owners manage footer links" ON public.tenant_footer_links;
CREATE POLICY "Tenant owners manage footer links"
  ON public.tenant_footer_links FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_memberships
      WHERE auth_user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Super admins full links access" ON public.tenant_footer_links;
CREATE POLICY "Super admins full links access"
  ON public.tenant_footer_links FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.roles r ON r.id = u.role_id
      WHERE u.auth_user_id = auth.uid()
      AND r.slug = 'super_admin'
      AND u.deleted_at IS NULL
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGERS
-- ─────────────────────────────────────────────────────────────────────────────

-- Updated_at triggers for all tables

CREATE OR REPLACE FUNCTION public.update_tenant_footer_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tenant_footer_settings_updated_at ON public.tenant_footer_settings;
CREATE TRIGGER tenant_footer_settings_updated_at
  BEFORE UPDATE ON public.tenant_footer_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_tenant_footer_settings_updated_at();

CREATE OR REPLACE FUNCTION public.update_tenant_footer_social_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tenant_footer_social_links_updated_at ON public.tenant_footer_social_links;
CREATE TRIGGER tenant_footer_social_links_updated_at
  BEFORE UPDATE ON public.tenant_footer_social_links
  FOR EACH ROW
  EXECUTE FUNCTION public.update_tenant_footer_social_links_updated_at();

CREATE OR REPLACE FUNCTION public.update_tenant_footer_columns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tenant_footer_columns_updated_at ON public.tenant_footer_columns;
CREATE TRIGGER tenant_footer_columns_updated_at
  BEFORE UPDATE ON public.tenant_footer_columns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_tenant_footer_columns_updated_at();

CREATE OR REPLACE FUNCTION public.update_tenant_footer_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tenant_footer_links_updated_at ON public.tenant_footer_links;
CREATE TRIGGER tenant_footer_links_updated_at
  BEFORE UPDATE ON public.tenant_footer_links
  FOR EACH ROW
  EXECUTE FUNCTION public.update_tenant_footer_links_updated_at();


-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: tenant_custom_pages
-- Custom pages that can be linked from footer
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.tenant_custom_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Page Details
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content TEXT NOT NULL,
  
  -- SEO
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT,
  
  -- Status
  enabled BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  UNIQUE(tenant_id, slug)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tenant_custom_pages_tenant ON public.tenant_custom_pages(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tenant_custom_pages_slug ON public.tenant_custom_pages(tenant_id, slug) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tenant_custom_pages_sort ON public.tenant_custom_pages(tenant_id, sort_order) WHERE deleted_at IS NULL AND enabled = true;

-- RLS Policies
ALTER TABLE public.tenant_custom_pages ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read their tenant's pages
CREATE POLICY tenant_custom_pages_select_own ON public.tenant_custom_pages
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users WHERE id = auth.uid()
    )
    AND deleted_at IS NULL
  );

-- Authenticated users can insert to their tenant
CREATE POLICY tenant_custom_pages_insert_own ON public.tenant_custom_pages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Authenticated users can update their tenant's pages
CREATE POLICY tenant_custom_pages_update_own ON public.tenant_custom_pages
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Anonymous users can read enabled pages
CREATE POLICY tenant_custom_pages_select_public ON public.tenant_custom_pages
  FOR SELECT
  TO anon
  USING (enabled = true AND deleted_at IS NULL);
