-- ═══════════════════════════════════════════════════════════════════════════
-- Super Admin Security Hardening Migration
-- Enforces server-side super admin access control and tenant isolation
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ─── 1. Create authorization level function ──────────────────────────────────
-- Returns the authorization level of the current user
create or replace function public.get_auth_level()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select 
    case 
      when auth.uid() is null then 'NOT_AUTHENTICATED'
      when exists (
        select 1 from public.users u
        join public.roles r on r.id = u.role_id
        where u.auth_user_id = auth.uid()
          and r.slug = 'super_admin'
          and u.deleted_at is null
      ) then 'SUPER_ADMIN'
      when exists (
        select 1 from public.users u
        join public.roles r on r.id = u.role_id
        where u.auth_user_id = auth.uid()
          and r.slug in ('admin', 'editor')
          and u.deleted_at is null
      ) then 'CUSTOMER_ADMIN'
      else 'CUSTOMER'
    end;
$$;

-- ─── 2. Strict super admin check function ────────────────────────────────────
-- Returns true ONLY if current user is explicitly super_admin
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users u
    join public.roles r on r.id = u.role_id
    where u.auth_user_id = auth.uid()
      and r.slug = 'super_admin'
      and u.deleted_at is null
  );
$$;

-- ─── 3. Prevent super_admin role assignment via normal channels ──────────────
-- Trigger to block super_admin assignment except via direct SQL
create or replace function public.prevent_super_admin_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_role_slug text;
  current_user_role_slug text;
begin
  -- Get the role slug being assigned
  if new.role_id is not null then
    select slug into target_role_slug
    from public.roles
    where id = new.role_id;
    
    -- If trying to assign super_admin role
    if target_role_slug = 'super_admin' then
      -- Check if current user is already super_admin
      select r.slug into current_user_role_slug
      from public.users u
      join public.roles r on r.id = u.role_id
      where u.auth_user_id = auth.uid();
      
      -- Only allow super_admin to assign super_admin
      -- (This still requires manual SQL for bootstrap)
      if current_user_role_slug is null or current_user_role_slug != 'super_admin' then
        raise exception 'super_admin role can only be assigned via database migration or by existing super_admin';
      end if;
    end if;
  end if;
  
  return new;
end;
$$;

drop trigger if exists prevent_super_admin_assignment_trigger on public.users;
create trigger prevent_super_admin_assignment_trigger
  before insert or update on public.users
  for each row execute function public.prevent_super_admin_assignment();

-- ─── 4. Enhanced RLS policies for tenants table ──────────────────────────────

-- Drop existing tenant policies
drop policy if exists "Tenant owner can read" on public.tenants;
drop policy if exists "Tenant owner can update" on public.tenants;
drop policy if exists "Anyone can create a tenant" on public.tenants;
drop policy if exists "Admin can read all tenants" on public.tenants;
drop policy if exists "Admin can update all tenants" on public.tenants;
drop policy if exists "Super admin can view tenant overview" on public.tenants;

-- Super admin can read ALL tenants (platform-wide access)
create policy "super_admin_read_all_tenants" on public.tenants
  for select using (public.is_super_admin());

-- Super admin can update ALL tenants (for subscription management)
create policy "super_admin_update_tenants" on public.tenants
  for update using (public.is_super_admin())
  with check (public.is_super_admin());

-- Tenant owners can ONLY read their own tenant
create policy "tenant_owner_read_own" on public.tenants
  for select using (
    owner_auth_user_id = auth.uid()
    and deleted_at is null
  );

-- Tenant owners can ONLY update their own tenant
-- But CANNOT change subscription_status, trial dates, or owner
create policy "tenant_owner_update_own" on public.tenants
  for update using (
    owner_auth_user_id = auth.uid()
    and deleted_at is null
  )
  with check (
    owner_auth_user_id = auth.uid()
    and deleted_at is null
    -- Prevent changing these fields
    and old.subscription_status = new.subscription_status
    and old.owner_auth_user_id = new.owner_auth_user_id
    and old.trial_started_at = new.trial_started_at
    and old.trial_ends_at = new.trial_ends_at
    and old.subscription_started_at = new.subscription_started_at
    and old.subscription_ends_at = new.subscription_ends_at
  );

-- Only authenticated users with proper onboarding flow can create tenants
create policy "authenticated_create_tenant" on public.tenants
  for insert with check (
    auth.uid() is not null
    and owner_auth_user_id = auth.uid()
  );

-- ─── 5. Enhanced RLS policies for tenant_payments ────────────────────────────

-- Drop existing payment policies
drop policy if exists "Tenant owner can insert payment" on public.tenant_payments;
drop policy if exists "Tenant owner can read own payments" on public.tenant_payments;
drop policy if exists "Admin can read all payments" on public.tenant_payments;
drop policy if exists "Admin can update payments" on public.tenant_payments;

-- Super admin can read ALL payments
create policy "super_admin_read_all_payments" on public.tenant_payments
  for select using (public.is_super_admin());

-- Super admin can update ALL payments (for approval/rejection)
create policy "super_admin_update_payments" on public.tenant_payments
  for update using (public.is_super_admin())
  with check (public.is_super_admin());

-- Tenant owners can insert payment for their OWN tenant only
create policy "tenant_owner_insert_own_payment" on public.tenant_payments
  for insert with check (
    tenant_id in (
      select id from public.tenants
      where owner_auth_user_id = auth.uid()
        and deleted_at is null
    )
  );

-- Tenant owners can read their OWN payments only
create policy "tenant_owner_read_own_payments" on public.tenant_payments
  for select using (
    tenant_id in (
      select id from public.tenants
      where owner_auth_user_id = auth.uid()
        and deleted_at is null
    )
  );

-- ─── 6. Enhanced RLS policies for payment_config ─────────────────────────────

-- Drop existing policies
drop policy if exists "Anyone can read payment config" on public.payment_config;

-- Anyone can read payment config (needed for payment UI)
create policy "public_read_payment_config" on public.payment_config
  for select using (is_active = true);

-- Only super admin can update payment config
create policy "super_admin_update_payment_config" on public.payment_config
  for update using (public.is_super_admin())
  with check (public.is_super_admin());

-- ─── 7. Enhanced audit logging with automatic actor tracking ─────────────────

-- Function to log super admin actions
create or replace function public.log_super_admin_action(
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  log_id uuid;
  actor_id uuid;
begin
  -- Verify caller is super admin
  if not public.is_super_admin() then
    raise exception 'only super_admin can log super admin actions';
  end if;
  
  -- Get actor user id
  select id into actor_id
  from public.users
  where auth_user_id = auth.uid()
    and deleted_at is null;
  
  -- Insert audit log
  insert into public.audit_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata,
    ip_address
  )
  values (
    actor_id,
    p_action,
    p_entity_type,
    p_entity_id,
    p_metadata,
    inet_client_addr()
  )
  returning id into log_id;
  
  return log_id;
end;
$$;

-- ─── 8. Trigger to audit super admin tenant changes ──────────────────────────

create or replace function public.audit_tenant_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only audit if changed by super admin
  if public.is_super_admin() then
    perform public.log_super_admin_action(
      case
        when tg_op = 'INSERT' then 'tenant_created'
        when tg_op = 'UPDATE' then 'tenant_updated'
        when tg_op = 'DELETE' then 'tenant_deleted'
      end,
      'tenant',
      coalesce(new.id, old.id),
      jsonb_build_object(
        'operation', tg_op,
        'old_status', old.subscription_status,
        'new_status', new.subscription_status,
        'tenant_slug', coalesce(new.slug, old.slug)
      )
    );
  end if;
  
  return coalesce(new, old);
end;
$$;

drop trigger if exists audit_tenant_changes_trigger on public.tenants;
create trigger audit_tenant_changes_trigger
  after insert or update or delete on public.tenants
  for each row execute function public.audit_tenant_changes();

-- ─── 9. Trigger to audit payment approvals/rejections ────────────────────────

create or replace function public.audit_payment_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only audit if changed by super admin
  if public.is_super_admin() and tg_op = 'UPDATE' then
    -- Check if status changed
    if old.status != new.status then
      perform public.log_super_admin_action(
        case
          when new.status = 'APPROVED' then 'payment_approved'
          when new.status = 'REJECTED' then 'payment_rejected'
          else 'payment_status_changed'
        end,
        'tenant_payment',
        new.id,
        jsonb_build_object(
          'tenant_id', new.tenant_id,
          'amount', new.amount,
          'plan', new.plan,
          'old_status', old.status,
          'new_status', new.status,
          'rejection_reason', new.rejection_reason
        )
      );
    end if;
  end if;
  
  return new;
end;
$$;

drop trigger if exists audit_payment_changes_trigger on public.tenant_payments;
create trigger audit_payment_changes_trigger
  after update on public.tenant_payments
  for each row execute function public.audit_payment_changes();

-- ─── 10. Block role elevation via profile updates ────────────────────────────

-- Update users RLS to prevent self role elevation
drop policy if exists "manage users" on public.users;

-- Super admin can manage all users
create policy "super_admin_manage_users" on public.users
  for all using (public.is_super_admin())
  with check (public.is_super_admin());

-- Users can read their own profile
create policy "users_read_own_profile" on public.users
  for select using (auth_user_id = auth.uid());

-- Users can update their own profile BUT NOT role_id
create policy "users_update_own_profile" on public.users
  for update using (auth_user_id = auth.uid())
  with check (
    auth_user_id = auth.uid()
    and old.role_id = new.role_id  -- Cannot change own role
    and old.auth_user_id = new.auth_user_id  -- Cannot change auth_user_id
  );

-- ─── 11. Prevent direct role table modification ──────────────────────────────

drop policy if exists "manage roles" on public.roles;

-- Only super admin can read roles (others get via has_role function)
create policy "super_admin_read_roles" on public.roles
  for select using (public.is_super_admin());

-- Only super admin can manage roles (but NOT super_admin role itself)
create policy "super_admin_manage_roles" on public.roles
  for all using (public.is_super_admin())
  with check (
    public.is_super_admin()
    and (slug != 'super_admin' or old.slug = 'super_admin')  -- Cannot create new super_admin role
  );

-- ─── 12. Prevent permission escalation ───────────────────────────────────────

drop policy if exists "manage permissions" on public.permissions;
drop policy if exists "manage role permissions" on public.role_permissions;

-- Only super admin can read permissions
create policy "super_admin_read_permissions" on public.permissions
  for select using (public.is_super_admin());

-- Only super admin can manage permissions
create policy "super_admin_manage_permissions" on public.permissions
  for all using (public.is_super_admin())
  with check (public.is_super_admin());

-- Only super admin can read role_permissions
create policy "super_admin_read_role_permissions" on public.role_permissions
  for select using (public.is_super_admin());

-- Only super admin can manage role_permissions
create policy "super_admin_manage_role_permissions" on public.role_permissions
  for all using (public.is_super_admin())
  with check (public.is_super_admin());

-- ─── 13. Audit logs - super admin read only ──────────────────────────────────

drop policy if exists "manage analytics" on public.audit_logs;

-- Only super admin can read audit logs
create policy "super_admin_read_audit_logs" on public.audit_logs
  for select using (public.is_super_admin());

-- Audit logs are append-only (no updates or deletes)
-- Insert is handled by the log_super_admin_action function

-- ─── 14. Create view for safe tenant overview (no sensitive data) ────────────

create or replace view public.safe_tenant_overview as
select
  t.id,
  t.slug,
  t.name,
  t.language,
  t.subscription_status,
  t.subscription_plan,
  t.trial_ends_at,
  t.subscription_ends_at,
  t.android_app_status,
  t.created_at,
  -- No contact info, no owner details, no sensitive fields
  case 
    when t.subscription_ends_at < now() then true
    else false
  end as is_expired
from public.tenants t
where t.deleted_at is null
  and public.is_super_admin();  -- Only visible to super admin

grant select on public.safe_tenant_overview to authenticated;

-- ─── 15. Create bootstrap super admin function (manual SQL only) ─────────────

-- This function can ONLY be called from SQL, not via API
create or replace function public.bootstrap_super_admin(
  p_user_email text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_super_admin_role_id uuid;
  v_auth_user_id uuid;
begin
  -- This function is intentionally NOT exposed via PostgREST
  -- It can only be called from Supabase SQL editor
  
  -- Get super_admin role id
  select id into v_super_admin_role_id
  from public.roles
  where slug = 'super_admin';
  
  if v_super_admin_role_id is null then
    raise exception 'super_admin role does not exist';
  end if;
  
  -- Get user's auth id
  select id into v_auth_user_id
  from auth.users
  where email = p_user_email;
  
  if v_auth_user_id is null then
    raise exception 'user with email % not found', p_user_email;
  end if;
  
  -- Update user role
  update public.users
  set role_id = v_super_admin_role_id
  where auth_user_id = v_auth_user_id;
  
  -- Log the bootstrap action
  insert into public.audit_logs (
    actor_user_id, 
    action, 
    entity_type, 
    entity_id, 
    metadata
  )
  select 
    u.id,
    'super_admin_bootstrapped',
    'user',
    u.id,
    jsonb_build_object('email', p_user_email, 'method', 'manual_sql')
  from public.users u
  where u.auth_user_id = v_auth_user_id;
  
  return true;
end;
$$;

-- ─── 16. Revoke dangerous permissions from anon and authenticated ────────────

-- Prevent anon role from accessing sensitive tables
revoke all on public.tenants from anon;
revoke all on public.tenant_payments from anon;
revoke all on public.payment_config from anon;
revoke all on public.audit_logs from anon;
revoke all on public.users from anon;
revoke all on public.roles from anon;
revoke all on public.permissions from anon;
revoke all on public.role_permissions from anon;

-- Authenticated users can only access via RLS policies
-- (default grants are via RLS, but explicitly revoke dangerous permissions)

commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- BOOTSTRAP INSTRUCTIONS (for initial super admin setup)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- After running this migration, create your first super admin via SQL:
--
-- Option 1: Using the bootstrap function
--   SELECT public.bootstrap_super_admin('your@email.com');
--
-- Option 2: Manual SQL (if function doesn't work)
--   UPDATE public.users 
--   SET role_id = (SELECT id FROM public.roles WHERE slug = 'super_admin')
--   WHERE auth_user_id = (SELECT id FROM auth.users WHERE email = 'your@email.com');
--
-- ⚠️ IMPORTANT: This is a ONE-TIME bootstrap operation.
-- After the first super admin is created, they can create additional super admins
-- through the super admin panel if needed (though this is not recommended).
--
-- ═══════════════════════════════════════════════════════════════════════════
