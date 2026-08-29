-- ═══════════════════════════════════════════════════════════════════════════
-- SYSTEM TABLES RLS POLICIES
-- 
-- Adds RLS for core platform tables:
-- - users (tenant-scoped + super admin access)
-- - roles (platform-wide read, super admin write)
-- - permissions (platform-wide read, super admin write)
-- - subscriptions (newsletter subscriptions per tenant)
-- - payments (super admin only)
-- - audit_logs (super admin + own tenant)
-- - push_subscribers (per tenant)
-- - notification_logs (per tenant)
-- - analytics_events (per tenant)
-- - article_tags (per tenant via article relationship)
-- 
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- USERS TABLE RLS
-- Users must see only their own tenant's users (unless super admin)
-- ═══════════════════════════════════════════════════════════════════════════

-- First, add tenant_id to users if not exists
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

COMMENT ON COLUMN public.users.tenant_id IS 
  'Tenant this user belongs to. NULL = legacy/super admin users.';

CREATE INDEX IF NOT EXISTS idx_users_tenant_id 
  ON public.users(tenant_id) WHERE deleted_at IS NULL;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can see themselves
DROP POLICY IF EXISTS "users_read_self" ON public.users;
CREATE POLICY "users_read_self" ON public.users
  FOR SELECT
  USING (
    auth.uid() = auth_user_id
  );

-- Users can see other users in their tenant
DROP POLICY IF EXISTS "users_read_own_tenant" ON public.users;
CREATE POLICY "users_read_own_tenant" ON public.users
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

-- Only super admin can create/update/delete users
DROP POLICY IF EXISTS "users_manage_super_admin" ON public.users;
CREATE POLICY "users_manage_super_admin" ON public.users
  FOR ALL
  USING (
    public.is_super_admin()
  )
  WITH CHECK (
    public.is_super_admin()
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- ROLES TABLE RLS
-- Roles are platform-wide (super admin manages)
-- All authenticated users can READ roles (needed for UI)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all roles
DROP POLICY IF EXISTS "roles_read_all_authenticated" ON public.roles;
CREATE POLICY "roles_read_all_authenticated" ON public.roles
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND deleted_at IS NULL
  );

-- Only super admin can manage roles
DROP POLICY IF EXISTS "roles_manage_super_admin" ON public.roles;
CREATE POLICY "roles_manage_super_admin" ON public.roles
  FOR ALL
  USING (
    public.is_super_admin()
  )
  WITH CHECK (
    public.is_super_admin()
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- PERMISSIONS TABLE RLS
-- Permissions are platform-wide (super admin manages)
-- All authenticated users can READ permissions (needed for UI)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all permissions
DROP POLICY IF EXISTS "permissions_read_all_authenticated" ON public.permissions;
CREATE POLICY "permissions_read_all_authenticated" ON public.permissions
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND deleted_at IS NULL
  );

-- Only super admin can manage permissions
DROP POLICY IF EXISTS "permissions_manage_super_admin" ON public.permissions;
CREATE POLICY "permissions_manage_super_admin" ON public.permissions
  FOR ALL
  USING (
    public.is_super_admin()
  )
  WITH CHECK (
    public.is_super_admin()
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- ROLE_PERMISSIONS TABLE RLS (junction table)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all role_permissions
DROP POLICY IF EXISTS "role_permissions_read_all_authenticated" ON public.role_permissions;
CREATE POLICY "role_permissions_read_all_authenticated" ON public.role_permissions
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
  );

-- Only super admin can manage role_permissions
DROP POLICY IF EXISTS "role_permissions_manage_super_admin" ON public.role_permissions;
CREATE POLICY "role_permissions_manage_super_admin" ON public.role_permissions
  FOR ALL
  USING (
    public.is_super_admin()
  )
  WITH CHECK (
    public.is_super_admin()
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- SUBSCRIPTIONS TABLE RLS (Newsletter subscribers)
-- Each tenant has their own subscriber list
-- ═══════════════════════════════════════════════════════════════════════════

-- Add tenant_id to subscriptions if not exists
ALTER TABLE public.subscriptions 
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

COMMENT ON COLUMN public.subscriptions.tenant_id IS 
  'Tenant this newsletter subscription belongs to.';

CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_id 
  ON public.subscriptions(tenant_id) WHERE deleted_at IS NULL;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Tenant members can read their own subscribers
DROP POLICY IF EXISTS "subscriptions_read_own_tenant" ON public.subscriptions;
CREATE POLICY "subscriptions_read_own_tenant" ON public.subscriptions
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

-- Tenant members can manage their own subscribers
DROP POLICY IF EXISTS "subscriptions_manage_own_tenant" ON public.subscriptions;
CREATE POLICY "subscriptions_manage_own_tenant" ON public.subscriptions
  FOR ALL
  USING (
    deleted_at IS NULL
    AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  )
  WITH CHECK (
    tenant_id IN (SELECT public.get_user_tenant_ids())
    OR public.is_super_admin()
  );

-- Anonymous can INSERT new subscriptions (public signup form)
-- But they MUST provide a valid tenant_id
DROP POLICY IF EXISTS "subscriptions_insert_public" ON public.subscriptions;
CREATE POLICY "subscriptions_insert_public" ON public.subscriptions
  FOR INSERT
  WITH CHECK (
    tenant_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.deleted_at IS NULL)
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- PAYMENTS TABLE RLS
-- Payments are SUPER ADMIN ONLY (platform billing)
-- Tenants do NOT see payments
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Only super admin can read payments
DROP POLICY IF EXISTS "payments_read_super_admin" ON public.payments;
CREATE POLICY "payments_read_super_admin" ON public.payments
  FOR SELECT
  USING (
    public.is_super_admin()
  );

-- Only super admin can manage payments
DROP POLICY IF EXISTS "payments_manage_super_admin" ON public.payments;
CREATE POLICY "payments_manage_super_admin" ON public.payments
  FOR ALL
  USING (
    public.is_super_admin()
  )
  WITH CHECK (
    public.is_super_admin()
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- AUDIT_LOGS TABLE RLS
-- Super admin sees all logs
-- Tenant admin sees only their tenant's logs
-- ═══════════════════════════════════════════════════════════════════════════

-- Add tenant_id to audit_logs if not exists
ALTER TABLE public.audit_logs 
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

COMMENT ON COLUMN public.audit_logs.tenant_id IS 
  'Tenant this audit log belongs to. NULL = platform-level action.';

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id 
  ON public.audit_logs(tenant_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at 
  ON public.audit_logs(created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can read logs for their tenant
DROP POLICY IF EXISTS "audit_logs_read_own_tenant" ON public.audit_logs;
CREATE POLICY "audit_logs_read_own_tenant" ON public.audit_logs
  FOR SELECT
  USING (
    tenant_id IN (SELECT public.get_user_tenant_ids())
    OR public.is_super_admin()
    OR (tenant_id IS NULL AND public.is_super_admin()) -- Platform logs
  );

-- Only super admin can insert audit logs (or system triggers)
DROP POLICY IF EXISTS "audit_logs_insert_super_admin" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_super_admin" ON public.audit_logs
  FOR INSERT
  WITH CHECK (
    public.is_super_admin()
    OR current_setting('role', true) = 'postgres' -- Allow system triggers
  );

-- Audit logs are IMMUTABLE (no update/delete)
-- No UPDATE or DELETE policies = no one can modify history

-- ═══════════════════════════════════════════════════════════════════════════
-- PUSH_SUBSCRIBERS TABLE RLS (if exists)
-- ═══════════════════════════════════════════════════════════════════════════

-- Check if push_subscribers table exists and add policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'push_subscribers') THEN
    
    -- Add tenant_id if not exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'push_subscribers' 
        AND column_name = 'tenant_id'
    ) THEN
      ALTER TABLE public.push_subscribers 
        ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
      
      CREATE INDEX idx_push_subscribers_tenant_id 
        ON public.push_subscribers(tenant_id);
    END IF;
    
    -- Enable RLS
    EXECUTE 'ALTER TABLE public.push_subscribers ENABLE ROW LEVEL SECURITY';
    
    -- Drop existing policies
    EXECUTE 'DROP POLICY IF EXISTS "push_subscribers_read_own_tenant" ON public.push_subscribers';
    EXECUTE 'DROP POLICY IF EXISTS "push_subscribers_manage_own_tenant" ON public.push_subscribers';
    
    -- Create policies
    EXECUTE '
      CREATE POLICY "push_subscribers_read_own_tenant" ON public.push_subscribers
        FOR SELECT
        USING (
          tenant_id IN (SELECT public.get_user_tenant_ids())
          OR public.is_super_admin()
        )
    ';
    
    EXECUTE '
      CREATE POLICY "push_subscribers_manage_own_tenant" ON public.push_subscribers
        FOR ALL
        USING (
          tenant_id IN (SELECT public.get_user_tenant_ids())
          OR public.is_super_admin()
        )
        WITH CHECK (
          tenant_id IN (SELECT public.get_user_tenant_ids())
          OR public.is_super_admin()
        )
    ';
    
    RAISE NOTICE 'RLS enabled for push_subscribers';
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- NOTIFICATION_LOGS TABLE RLS (if exists)
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notification_logs') THEN
    
    -- Add tenant_id if not exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'notification_logs' 
        AND column_name = 'tenant_id'
    ) THEN
      ALTER TABLE public.notification_logs 
        ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
      
      CREATE INDEX idx_notification_logs_tenant_id 
        ON public.notification_logs(tenant_id);
    END IF;
    
    -- Enable RLS
    EXECUTE 'ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY';
    
    -- Drop existing policies
    EXECUTE 'DROP POLICY IF EXISTS "notification_logs_read_own_tenant" ON public.notification_logs';
    
    -- Create policies
    EXECUTE '
      CREATE POLICY "notification_logs_read_own_tenant" ON public.notification_logs
        FOR SELECT
        USING (
          tenant_id IN (SELECT public.get_user_tenant_ids())
          OR public.is_super_admin()
        )
    ';
    
    -- Logs are typically immutable (no UPDATE/DELETE policies)
    
    RAISE NOTICE 'RLS enabled for notification_logs';
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- ANALYTICS_EVENTS TABLE RLS
-- Analytics are per-tenant
-- ═══════════════════════════════════════════════════════════════════════════

-- Add tenant_id to analytics_events if not exists
ALTER TABLE public.analytics_events 
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

COMMENT ON COLUMN public.analytics_events.tenant_id IS 
  'Tenant this analytics event belongs to.';

CREATE INDEX IF NOT EXISTS idx_analytics_events_tenant_id 
  ON public.analytics_events(tenant_id);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Tenant members can read their own analytics
DROP POLICY IF EXISTS "analytics_events_read_own_tenant" ON public.analytics_events;
CREATE POLICY "analytics_events_read_own_tenant" ON public.analytics_events
  FOR SELECT
  USING (
    tenant_id IN (SELECT public.get_user_tenant_ids())
    OR public.is_super_admin()
  );

-- System/Edge Functions can INSERT analytics (public write for tracking)
DROP POLICY IF EXISTS "analytics_events_insert_system" ON public.analytics_events;
CREATE POLICY "analytics_events_insert_system" ON public.analytics_events
  FOR INSERT
  WITH CHECK (
    tenant_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.deleted_at IS NULL)
  );

-- Analytics are immutable (no UPDATE/DELETE)

-- ═══════════════════════════════════════════════════════════════════════════
-- ARTICLE_TAGS TABLE RLS
-- Tags belong to articles, inherit tenant isolation via article relationship
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.article_tags ENABLE ROW LEVEL SECURITY;

-- Users can read tags for articles in their tenant
DROP POLICY IF EXISTS "article_tags_read_via_article" ON public.article_tags;
CREATE POLICY "article_tags_read_via_article" ON public.article_tags
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.articles a
      WHERE a.id = article_tags.article_id
        AND a.deleted_at IS NULL
        AND (
          a.tenant_id IN (SELECT public.get_user_tenant_ids())
          OR public.is_super_admin()
        )
    )
  );

-- Users can manage tags for their tenant's articles
DROP POLICY IF EXISTS "article_tags_manage_via_article" ON public.article_tags;
CREATE POLICY "article_tags_manage_via_article" ON public.article_tags
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.articles a
      WHERE a.id = article_tags.article_id
        AND a.deleted_at IS NULL
        AND (
          a.tenant_id IN (SELECT public.get_user_tenant_ids())
          OR public.is_super_admin()
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.articles a
      WHERE a.id = article_tags.article_id
        AND a.deleted_at IS NULL
        AND (
          a.tenant_id IN (SELECT public.get_user_tenant_ids())
          OR public.is_super_admin()
        )
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- API_REQUEST_LIMITS TABLE RLS
-- Rate limiting per tenant
-- ═══════════════════════════════════════════════════════════════════════════

-- Add tenant_id to api_request_limits if not exists
ALTER TABLE public.api_request_limits 
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

COMMENT ON COLUMN public.api_request_limits.tenant_id IS 
  'Tenant this rate limit applies to. NULL = platform-wide limit.';

CREATE INDEX IF NOT EXISTS idx_api_request_limits_tenant_id 
  ON public.api_request_limits(tenant_id);

ALTER TABLE public.api_request_limits ENABLE ROW LEVEL SECURITY;

-- System functions can manage rate limits (typically SECURITY DEFINER functions)
DROP POLICY IF EXISTS "api_request_limits_system_manage" ON public.api_request_limits;
CREATE POLICY "api_request_limits_system_manage" ON public.api_request_limits
  FOR ALL
  USING (
    public.is_super_admin()
    OR current_setting('role', true) = 'postgres'
  )
  WITH CHECK (
    public.is_super_admin()
    OR current_setting('role', true) = 'postgres'
  );

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICATION NOTES
-- ═══════════════════════════════════════════════════════════════════════════

/*
TABLES NOW PROTECTED:
✅ users - tenant-scoped + super admin
✅ roles - platform-wide read, super admin write
✅ permissions - platform-wide read, super admin write
✅ role_permissions - platform-wide read, super admin write
✅ subscriptions - per tenant + public insert
✅ payments - super admin only
✅ audit_logs - per tenant + super admin (immutable)
✅ push_subscribers - per tenant (if exists)
✅ notification_logs - per tenant (if exists)
✅ analytics_events - per tenant + public insert (immutable)
✅ article_tags - via article relationship
✅ api_request_limits - system-managed

TEST QUERIES (run as Tenant A user):
-- Should fail (access Tenant B data):
SELECT * FROM users WHERE tenant_id = '<tenant_b_id>';
SELECT * FROM subscriptions WHERE tenant_id = '<tenant_b_id>';
SELECT * FROM analytics_events WHERE tenant_id = '<tenant_b_id>';

-- Should succeed (own tenant):
SELECT * FROM users WHERE tenant_id IN (SELECT get_user_tenant_ids());
SELECT * FROM subscriptions WHERE tenant_id IN (SELECT get_user_tenant_ids());
*/
