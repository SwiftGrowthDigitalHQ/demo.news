-- ═══════════════════════════════════════════════════════════════════════════
-- SangTX Complete Subscription + Payment + Access Lifecycle
-- Implements full business logic for trial, payment, expiry, and access control
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ─── 1. Update subscription status values ────────────────────────────────────
-- Add PAST_DUE and EXPIRED to subscription_status if not already present
-- TRIAL → customer in 7-day trial
-- ACTIVE → paid and current
-- PAYMENT_PENDING → payment submitted, awaiting approval
-- PAYMENT_DUE → trial expired or subscription expired, payment needed
-- PAST_DUE → payment overdue, grace period
-- SUSPENDED → manually suspended by super admin
-- EXPIRED → subscription ended, no payment received
-- CANCELLED → customer voluntarily cancelled

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'tenants_subscription_status_check'
  ) then
    alter table public.tenants
      add constraint tenants_subscription_status_check
      check (subscription_status in (
        'TRIAL', 'ACTIVE', 'PAYMENT_PENDING', 'PAYMENT_DUE', 
        'PAST_DUE', 'SUSPENDED', 'EXPIRED', 'CANCELLED'
      ));
  end if;
end $$;

-- ─── 2. Add Android payment tracking fields ──────────────────────────────────
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tenants'
      and column_name = 'android_payment_id'
  ) then
    alter table public.tenants
      add column android_payment_id uuid references public.tenant_payments(id),
      add column android_app_enabled boolean not null default false;
  end if;
end $$;

-- ─── 3. Add payment type field to tenant_payments ────────────────────────────
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tenant_payments'
      and column_name = 'payment_type'
  ) then
    alter table public.tenant_payments
      add column payment_type text not null default 'subscription';
  end if;
end $$;

-- Add check constraint for payment_type
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'tenant_payments_payment_type_check'
  ) then
    alter table public.tenant_payments
      add constraint tenant_payments_payment_type_check
      check (payment_type in ('subscription', 'android_app'));
  end if;
end $$;

-- ─── 4. Authoritative subscription status calculation function ───────────────
create or replace function public.get_tenant_subscription_status(p_tenant_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tenant record;
  v_now timestamptz := now();
begin
  select 
    subscription_status,
    trial_ends_at,
    subscription_ends_at,
    current_period_end,
    grace_period_days
  into v_tenant
  from public.tenants
  where id = p_tenant_id
    and deleted_at is null;
  
  if not found then
    return 'NOT_FOUND';
  end if;
  
  -- Manual states take precedence
  if v_tenant.subscription_status = 'SUSPENDED' then
    return 'SUSPENDED';
  end if;
  
  if v_tenant.subscription_status = 'CANCELLED' then
    return 'CANCELLED';
  end if;
  
  if v_tenant.subscription_status = 'PAYMENT_PENDING' then
    return 'PAYMENT_PENDING';
  end if;
  
  -- Trial logic
  if v_tenant.subscription_status = 'TRIAL' then
    if v_tenant.trial_ends_at is not null and v_tenant.trial_ends_at > v_now then
      return 'TRIAL';  -- Still in trial
    else
      return 'PAYMENT_DUE';  -- Trial expired
    end if;
  end if;
  
  -- Active subscription logic
  if v_tenant.subscription_status = 'ACTIVE' then
    if v_tenant.subscription_ends_at is not null then
      if v_tenant.subscription_ends_at > v_now then
        return 'ACTIVE';  -- Still active
      elsif v_tenant.grace_period_days > 0 and 
            v_tenant.subscription_ends_at + (v_tenant.grace_period_days || ' days')::interval > v_now then
        return 'PAST_DUE';  -- In grace period
      else
        return 'EXPIRED';  -- Past grace period
      end if;
    else
      return 'ACTIVE';  -- No end date set (shouldn't happen, but handle gracefully)
    end if;
  end if;
  
  -- Default/fallback
  if v_tenant.subscription_status = 'PAYMENT_DUE' then
    return 'PAYMENT_DUE';
  end if;
  
  if v_tenant.subscription_status = 'PAST_DUE' then
    return 'PAST_DUE';
  end if;
  
  if v_tenant.subscription_status = 'EXPIRED' then
    return 'EXPIRED';
  end if;
  
  return v_tenant.subscription_status;
end;
$$;

-- ─── 5. Access control functions ─────────────────────────────────────────────

-- Can access tenant admin panel
create or replace function public.can_access_tenant_admin(p_tenant_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_status text;
  v_is_super_admin boolean;
begin
  -- Super admin always has access
  v_is_super_admin := public.is_super_admin();
  if v_is_super_admin then
    return true;
  end if;
  
  -- Get current status
  v_status := public.get_tenant_subscription_status(p_tenant_id);
  
  -- Allow access for these statuses (customer can always access billing/support)
  return v_status in ('TRIAL', 'ACTIVE', 'PAYMENT_PENDING', 'PAYMENT_DUE', 'PAST_DUE');
end;
$$;

-- Can publish articles and manage content
create or replace function public.can_publish_content(p_tenant_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_status text;
  v_is_super_admin boolean;
begin
  -- Super admin always has access
  v_is_super_admin := public.is_super_admin();
  if v_is_super_admin then
    return true;
  end if;
  
  v_status := public.get_tenant_subscription_status(p_tenant_id);
  
  -- Can only publish during trial and active subscription
  return v_status in ('TRIAL', 'ACTIVE');
end;
$$;

-- Can access public website
create or replace function public.can_access_website(p_tenant_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  v_status := public.get_tenant_subscription_status(p_tenant_id);
  
  -- Website accessible during trial and active subscription
  return v_status in ('TRIAL', 'ACTIVE');
end;
$$;

-- Can use Android app
create or replace function public.can_use_android_app(p_tenant_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tenant record;
  v_status text;
begin
  select 
    android_app_enabled,
    android_app_status
  into v_tenant
  from public.tenants
  where id = p_tenant_id
    and deleted_at is null;
  
  if not found then
    return false;
  end if;
  
  -- Android must be enabled and active
  if not v_tenant.android_app_enabled or v_tenant.android_app_status != 'ACTIVE' then
    return false;
  end if;
  
  -- Must have valid subscription
  v_status := public.get_tenant_subscription_status(p_tenant_id);
  return v_status in ('TRIAL', 'ACTIVE');
end;
$$;

-- ─── 6. Automatic subscription status updater ────────────────────────────────
-- Function to update expired subscriptions (run periodically or on-demand)
create or replace function public.update_expired_subscriptions()
returns table(tenant_id uuid, old_status text, new_status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant record;
  v_computed_status text;
begin
  for v_tenant in
    select id, subscription_status
    from public.tenants
    where deleted_at is null
      and subscription_status not in ('SUSPENDED', 'CANCELLED')
  loop
    v_computed_status := public.get_tenant_subscription_status(v_tenant.id);
    
    -- Update if status changed
    if v_computed_status != v_tenant.subscription_status then
      update public.tenants
      set subscription_status = v_computed_status
      where id = v_tenant.id;
      
      tenant_id := v_tenant.id;
      old_status := v_tenant.subscription_status;
      new_status := v_computed_status;
      return next;
    end if;
  end loop;
end;
$$;

-- ─── 7. Enhanced payment approval function ───────────────────────────────────
create or replace function public.approve_subscription_payment(
  p_payment_id uuid,
  p_reviewed_by_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment record;
  v_tenant record;
  v_period_start timestamptz;
  v_period_end timestamptz;
  v_result jsonb;
begin
  -- Verify super admin
  if not public.is_super_admin() then
    raise exception 'only super_admin can approve payments';
  end if;
  
  -- Get payment details
  select * into v_payment
  from public.tenant_payments
  where id = p_payment_id;
  
  if not found then
    raise exception 'payment not found';
  end if;
  
  if v_payment.status != 'SUBMITTED' then
    raise exception 'payment already processed';
  end if;
  
  -- Get tenant
  select * into v_tenant
  from public.tenants
  where id = v_payment.tenant_id;
  
  if not found then
    raise exception 'tenant not found';
  end if;
  
  -- Calculate period based on payment type
  if v_payment.payment_type = 'subscription' then
    v_period_start := now();
    
    -- Set period end based on plan
    if v_payment.plan = 'monthly' then
      v_period_end := v_period_start + interval '1 month';
    elsif v_payment.plan = 'yearly' then
      v_period_end := v_period_start + interval '1 year';
    else
      raise exception 'invalid subscription plan';
    end if;
    
    -- Update payment record
    update public.tenant_payments
    set 
      status = 'APPROVED',
      reviewed_by = p_reviewed_by_user_id,
      reviewed_at = now(),
      period_start = v_period_start,
      period_end = v_period_end
    where id = p_payment_id;
    
    -- Update tenant subscription
    update public.tenants
    set
      subscription_status = 'ACTIVE',
      subscription_plan = v_payment.plan,
      subscription_started_at = coalesce(subscription_started_at, v_period_start),
      subscription_ends_at = v_period_end,
      current_period_start = v_period_start,
      current_period_end = v_period_end
    where id = v_payment.tenant_id;
    
    -- Log audit
    perform public.log_super_admin_action(
      'payment_approved',
      'tenant_payment',
      p_payment_id,
      jsonb_build_object(
        'tenant_id', v_payment.tenant_id,
        'tenant_slug', v_tenant.slug,
        'amount', v_payment.amount,
        'plan', v_payment.plan,
        'period_start', v_period_start,
        'period_end', v_period_end
      )
    );
    
    v_result := jsonb_build_object(
      'success', true,
      'payment_type', 'subscription',
      'period_start', v_period_start,
      'period_end', v_period_end
    );
    
  elsif v_payment.payment_type = 'android_app' then
    -- Android app is one-time payment
    update public.tenant_payments
    set 
      status = 'APPROVED',
      reviewed_by = p_reviewed_by_user_id,
      reviewed_at = now()
    where id = p_payment_id;
    
    -- Activate Android app
    update public.tenants
    set
      android_app_enabled = true,
      android_app_status = 'ACTIVE',
      android_app_activated_at = now(),
      android_payment_id = p_payment_id
    where id = v_payment.tenant_id;
    
    -- Log audit
    perform public.log_super_admin_action(
      'android_payment_approved',
      'tenant_payment',
      p_payment_id,
      jsonb_build_object(
        'tenant_id', v_payment.tenant_id,
        'tenant_slug', v_tenant.slug,
        'amount', v_payment.amount
      )
    );
    
    v_result := jsonb_build_object(
      'success', true,
      'payment_type', 'android_app'
    );
  else
    raise exception 'invalid payment type';
  end if;
  
  return v_result;
end;
$$;

-- ─── 8. Payment rejection function ───────────────────────────────────────────
create or replace function public.reject_payment(
  p_payment_id uuid,
  p_rejection_reason text,
  p_reviewed_by_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment record;
  v_tenant record;
begin
  -- Verify super admin
  if not public.is_super_admin() then
    raise exception 'only super_admin can reject payments';
  end if;
  
  -- Get payment
  select * into v_payment
  from public.tenant_payments
  where id = p_payment_id;
  
  if not found then
    raise exception 'payment not found';
  end if;
  
  if v_payment.status != 'SUBMITTED' then
    raise exception 'payment already processed';
  end if;
  
  -- Get tenant
  select * into v_tenant
  from public.tenants
  where id = v_payment.tenant_id;
  
  -- Update payment
  update public.tenant_payments
  set
    status = 'REJECTED',
    rejection_reason = p_rejection_reason,
    reviewed_by = p_reviewed_by_user_id,
    reviewed_at = now()
  where id = p_payment_id;
  
  -- Update tenant status if it was PAYMENT_PENDING
  update public.tenants
  set subscription_status = 'PAYMENT_DUE'
  where id = v_payment.tenant_id
    and subscription_status = 'PAYMENT_PENDING';
  
  -- Log audit
  perform public.log_super_admin_action(
    'payment_rejected',
    'tenant_payment',
    p_payment_id,
    jsonb_build_object(
      'tenant_id', v_payment.tenant_id,
      'tenant_slug', v_tenant.slug,
      'amount', v_payment.amount,
      'reason', p_rejection_reason
    )
  );
  
  return jsonb_build_object('success', true);
end;
$$;

-- ─── 9. Indexes for performance ──────────────────────────────────────────────
create index if not exists idx_tenant_payments_type_status
  on public.tenant_payments(payment_type, status);

create index if not exists idx_tenants_status_ends_at
  on public.tenants(subscription_status, subscription_ends_at)
  where deleted_at is null;

-- ─── 10. Grant execute permissions ───────────────────────────────────────────
grant execute on function public.get_tenant_subscription_status(uuid) to authenticated;
grant execute on function public.can_access_tenant_admin(uuid) to authenticated;
grant execute on function public.can_publish_content(uuid) to authenticated;
grant execute on function public.can_access_website(uuid) to authenticated;
grant execute on function public.can_use_android_app(uuid) to authenticated;

-- Only super admin can execute these
revoke execute on function public.update_expired_subscriptions() from public;
revoke execute on function public.approve_subscription_payment(uuid, uuid) from public;
revoke execute on function public.reject_payment(uuid, text, uuid) from public;


commit;
