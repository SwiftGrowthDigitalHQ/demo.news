-- ═══════════════════════════════════════════════════════════════════════════
-- SangTX Tenants Migration
-- Run this in the Supabase SQL editor BEFORE deploying the onboarding flow.
-- Creates the `tenants` table for customer-created news platforms.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ─── tenants ──────────────────────────────────────────────────────────────────
create table if not exists public.tenants (
  id                    uuid primary key default gen_random_uuid(),
  slug                  text unique not null,           -- URL slug: e.g. "aaj-tak"
  name                  text not null,                  -- Brand name: "Aaj Tak"
  description           text,
  tagline               text,
  about                 text,
  language              text not null default 'hi',     -- 'en' | 'hi' | 'bho'
  -- Contact
  contact_phone         text,
  contact_email         text,
  address               text,
  city                  text,
  district              text,
  state                 text,
  pin                   text,
  -- Branding
  logo_url              text,
  favicon_url           text,
  primary_color         text not null default '#dc2626',
  secondary_color       text not null default '#0f172a',
  -- SEO
  seo_title             text,
  seo_description       text,
  -- Social
  social_links          jsonb not null default '{}',
  -- Subscription
  subscription_status   text not null default 'TRIAL',  -- TRIAL | ACTIVE | EXPIRED | CANCELLED
  subscription_plan     text not null default 'monthly', -- 'monthly' | 'yearly'
  trial_started_at      timestamptz,
  trial_ends_at         timestamptz,
  subscription_started_at timestamptz,
  subscription_ends_at  timestamptz,
  -- Ownership
  owner_auth_user_id    uuid references auth.users(id) on delete set null,
  -- Audit
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz
);

-- ─── Index on slug for fast routing lookups ───────────────────────────────────
create index if not exists idx_tenants_slug on public.tenants(slug)
  where deleted_at is null;

-- ─── Index on owner for auth-gated dashboard ─────────────────────────────────
create index if not exists idx_tenants_owner on public.tenants(owner_auth_user_id)
  where deleted_at is null;

-- ─── updated_at auto-update trigger ──────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tenants_updated_at on public.tenants;
create trigger tenants_updated_at
  before update on public.tenants
  for each row execute procedure public.set_updated_at();

-- ─── Row Level Security ───────────────────────────────────────────────────────
alter table public.tenants enable row level security;

-- Owner can read their own tenant
create policy "Tenant owner can read" on public.tenants
  for select using (owner_auth_user_id = auth.uid());

-- Owner can update their own tenant
create policy "Tenant owner can update" on public.tenants
  for update using (owner_auth_user_id = auth.uid());

-- Anyone can insert (onboarding creates the row immediately after auth.signUp)
create policy "Anyone can create a tenant" on public.tenants
  for insert with check (true);

-- Super admins can read all tenants (adjust role check to your setup)
-- create policy "Super admin reads all" on public.tenants
--   for select using (
--     exists (
--       select 1 from public.users u
--       join public.roles r on r.id = u.role_id
--       where u.auth_user_id = auth.uid() and r.slug = 'super_admin'
--     )
--   );

commit;
