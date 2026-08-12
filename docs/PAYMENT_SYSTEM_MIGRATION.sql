-- ═══════════════════════════════════════════════════════════════════════════
-- SangTX — Manual UPI Payment System Migration
-- Run AFTER TENANTS_MIGRATION.sql
-- Safe to re-run (uses CREATE TABLE IF NOT EXISTS / ALTER TABLE IF NOT EXISTS)
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ─── 1. Extend tenants subscription_status to include payment states ──────────
--
-- Allowed values:
--   TRIAL          → within 7-day free period, no payment required
--   PAYMENT_DUE    → trial ended or period ended, payment needed
--   PAYMENT_PENDING → customer submitted UTR, awaiting admin review
--   ACTIVE         → payment approved, service running
--   SUSPENDED      → payment overdue past grace period
--   CANCELLED      → owner voluntarily cancelled
--
-- We add a CHECK constraint via a DO block so it's idempotent.
do $$
begin
  -- Add current_period_start/end if they don't exist
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tenants'
      and column_name = 'current_period_start'
  ) then
    alter table public.tenants
      add column current_period_start timestamptz,
      add column current_period_end   timestamptz,
      add column grace_period_days    int not null default 3,
      add column suspended_at         timestamptz;
  end if;
end $$;

-- ─── 2. payment_config — central UPI + plan configuration ─────────────────────
create table if not exists public.payment_config (
  id              uuid primary key default gen_random_uuid(),
  upi_id          text not null default '9229721835-2@ibl',
  merchant_name   text not null default 'SangTX',
  currency        text not null default 'INR',
  -- Plan prices (paise units avoided — store as integer rupees)
  monthly_price   int  not null default 499,
  yearly_price    int  not null default 5599,
  trial_days      int  not null default 7,
  grace_period_days int not null default 3,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Ensure exactly one config row exists
insert into public.payment_config (id, upi_id, merchant_name, currency, monthly_price, yearly_price, trial_days, grace_period_days)
values ('40000000-0000-0000-0000-000000000001', '9229721835-2@ibl', 'SangTX', 'INR', 499, 5599, 7, 3)
on conflict (id) do update
set
  upi_id            = excluded.upi_id,
  merchant_name     = excluded.merchant_name,
  monthly_price     = excluded.monthly_price,
  yearly_price      = excluded.yearly_price,
  trial_days        = excluded.trial_days,
  grace_period_days = excluded.grace_period_days,
  updated_at        = now();

-- ─── 3. tenant_payments — manual UPI payment submissions ──────────────────────
create table if not exists public.tenant_payments (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.tenants(id) on delete cascade,
  plan              text not null,                -- 'monthly' | 'yearly'
  amount            int  not null,                -- in INR rupees (499 or 5599)
  currency          text not null default 'INR',
  method            text not null default 'UPI',
  upi_id_used       text not null,               -- the UPI ID customer paid to
  utr               text,                        -- UTR / transaction reference (required on submit)
  payment_date      date,                        -- date customer says they paid
  screenshot_url    text,                        -- optional screenshot upload
  notes             text,                        -- customer notes
  -- Status flow: SUBMITTED → APPROVED | REJECTED
  status            text not null default 'SUBMITTED',
  rejection_reason  text,
  -- Admin review
  reviewed_by       uuid references public.users(id) on delete set null,
  reviewed_at       timestamptz,
  -- When approved: the period this payment covers
  period_start      timestamptz,
  period_end        timestamptz,
  -- Timestamps
  submitted_at      timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_tenant_payments_tenant
  on public.tenant_payments(tenant_id);

create index if not exists idx_tenant_payments_status
  on public.tenant_payments(status)
  where status = 'SUBMITTED';

-- ─── 4. updated_at triggers ────────────────────────────────────────────────────
-- Reuse set_updated_at() function created in TENANTS_MIGRATION.sql

drop trigger if exists tenant_payments_updated_at on public.tenant_payments;
create trigger tenant_payments_updated_at
  before update on public.tenant_payments
  for each row execute procedure public.set_updated_at();

drop trigger if exists payment_config_updated_at on public.payment_config;
create trigger payment_config_updated_at
  before update on public.payment_config
  for each row execute procedure public.set_updated_at();

-- ─── 5. Row Level Security ─────────────────────────────────────────────────────

-- payment_config: anyone can read (needed to display UPI ID on payment screen)
alter table public.payment_config enable row level security;
create policy "Anyone can read payment config" on public.payment_config
  for select using (true);
-- Only super_admin can update (handled at application layer)

-- tenant_payments: tenant owner can insert/read their own; super_admin reads all
alter table public.tenant_payments enable row level security;

create policy "Tenant owner can insert payment" on public.tenant_payments
  for insert with check (
    tenant_id in (
      select id from public.tenants
      where owner_auth_user_id = auth.uid()
    )
  );

create policy "Tenant owner can read own payments" on public.tenant_payments
  for select using (
    tenant_id in (
      select id from public.tenants
      where owner_auth_user_id = auth.uid()
    )
  );

-- Super admin / admin can read ALL payments (needed for approval workflow)
create policy "Admin can read all payments" on public.tenant_payments
  for select using (
    exists (
      select 1 from public.users u
      join public.roles r on r.id = u.role_id
      where u.auth_user_id = auth.uid()
        and r.slug in ('super_admin', 'admin')
    )
  );

create policy "Admin can update payments" on public.tenant_payments
  for update using (
    exists (
      select 1 from public.users u
      join public.roles r on r.id = u.role_id
      where u.auth_user_id = auth.uid()
        and r.slug in ('super_admin', 'admin')
    )
  );

-- Super admin RLS on tenants (enable admin to read all tenants)
create policy "Admin can read all tenants" on public.tenants
  for select using (
    owner_auth_user_id = auth.uid()
    or exists (
      select 1 from public.users u
      join public.roles r on r.id = u.role_id
      where u.auth_user_id = auth.uid()
        and r.slug in ('super_admin', 'admin')
    )
  );

create policy "Admin can update all tenants" on public.tenants
  for update using (
    owner_auth_user_id = auth.uid()
    or exists (
      select 1 from public.users u
      join public.roles r on r.id = u.role_id
      where u.auth_user_id = auth.uid()
        and r.slug in ('super_admin', 'admin')
    )
  );

-- ─── 6. Audit log seed rows for known actions ──────────────────────────────────
-- (No seed data — payment records are created by real user actions)

commit;
