-- ═══════════════════════════════════════════════════════════════════════════
-- Super Admin Extensions Migration
-- Adds missing fields for full Super Admin feature set
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ─── 1. Add Android App fields to tenants table ──────────────────────────────
do $$
begin
  -- Add android_app_status if it doesn't exist
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tenants'
      and column_name = 'android_app_status'
  ) then
    alter table public.tenants
      add column android_app_status text not null default 'NOT_REQUESTED',
      add column android_app_package_name text,
      add column android_app_activated_at timestamptz;
  end if;
end $$;

-- Add check constraint for android_app_status
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'tenants_android_app_status_check'
  ) then
    alter table public.tenants
      add constraint tenants_android_app_status_check
      check (android_app_status in ('NOT_REQUESTED', 'REQUESTED', 'IN_PROGRESS', 'READY', 'ACTIVE'));
  end if;
end $$;

-- ─── 2. Extend payment_config with android_app_addon_price ───────────────────
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'payment_config'
      and column_name = 'android_app_addon_price'
  ) then
    alter table public.payment_config
      add column android_app_addon_price int not null default 3000;
  end if;
end $$;

-- Update existing payment config row
update public.payment_config
set android_app_addon_price = 3000
where android_app_addon_price is null or android_app_addon_price = 0;

-- ─── 3. Create indexes for performance ────────────────────────────────────────
create index if not exists idx_tenants_subscription_status
  on public.tenants(subscription_status)
  where deleted_at is null;

create index if not exists idx_tenants_subscription_ends_at
  on public.tenants(subscription_ends_at)
  where deleted_at is null and subscription_status in ('ACTIVE', 'TRIAL');

create index if not exists idx_tenants_android_app_status
  on public.tenants(android_app_status)
  where deleted_at is null and android_app_status in ('REQUESTED', 'IN_PROGRESS');

create index if not exists idx_tenant_payments_tenant_status
  on public.tenant_payments(tenant_id, status);

-- ─── 4. Create helper view for super admin dashboard ──────────────────────────
create or replace view public.super_admin_tenant_overview as
select
  t.id,
  t.slug,
  t.name,
  t.subscription_status,
  t.subscription_plan,
  t.subscription_ends_at,
  t.trial_ends_at,
  t.android_app_status,
  t.created_at,
  u.email as owner_email,
  u.full_name as owner_name,
  coalesce(article_counts.total, 0) as articles_count,
  coalesce(article_counts.published, 0) as published_articles,
  case
    when t.subscription_status = 'TRIAL' and t.trial_ends_at < now() + interval '7 days' then true
    when t.subscription_status = 'ACTIVE' and t.subscription_ends_at < now() + interval '7 days' then true
    else false
  end as expiring_soon,
  case
    when t.subscription_ends_at < now() and t.subscription_status not in ('SUSPENDED', 'CANCELLED') then true
    else false
  end as is_overdue
from public.tenants t
left join auth.users u on u.id = t.owner_auth_user_id
left join lateral (
  select
    count(*) filter (where deleted_at is null) as total,
    count(*) filter (where status = 'published' and deleted_at is null) as published
  from public.articles
  -- Note: Assumes single-tenant mode or RLS filtering
) article_counts on true
where t.deleted_at is null;

-- Grant access to authenticated users (will be filtered by RLS)
grant select on public.super_admin_tenant_overview to authenticated;

-- ─── 5. Add RLS policy for super_admin_tenant_overview ───────────────────────
alter view public.super_admin_tenant_overview set (security_barrier = true);

create policy "Super admin can view tenant overview" on public.tenants
  for select using (
    exists (
      select 1 from public.users u
      join public.roles r on r.id = u.role_id
      where u.auth_user_id = auth.uid()
        and r.slug = 'super_admin'
        and u.deleted_at is null
    )
  );

commit;
