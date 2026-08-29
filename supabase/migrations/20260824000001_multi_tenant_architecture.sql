-- ═══════════════════════════════════════════════════════════════════════════
-- MULTI-TENANT ARCHITECTURE MIGRATION
-- Adds tenant_id columns to all tenant-scoped tables
-- Legacy data remains NULL for manual review
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 1: ADD TENANT_ID COLUMNS (NULLABLE)
-- ─────────────────────────────────────────────────────────────────────────────

-- Add tenant_id to site_settings
alter table public.site_settings 
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;

comment on column public.site_settings.tenant_id is 
  'Tenant that owns these settings. NULL = legacy/unassigned data requiring manual review.';

-- Add tenant_id to articles
alter table public.articles 
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;

comment on column public.articles.tenant_id is 
  'Tenant that owns this article. NULL = legacy/unassigned data requiring manual review.';

-- Add tenant_id to categories
alter table public.categories 
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;

comment on column public.categories.tenant_id is 
  'Tenant that owns this category. NULL = legacy/unassigned data requiring manual review.';

-- Add tenant_id to breaking_news
alter table public.breaking_news 
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;

comment on column public.breaking_news.tenant_id is 
  'Tenant that owns this breaking news. NULL = legacy/unassigned data requiring manual review.';

-- Add tenant_id to advertisements
alter table public.advertisements 
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;

comment on column public.advertisements.tenant_id is 
  'Tenant that owns this advertisement. NULL = legacy/unassigned data requiring manual review.';

-- Add tenant_id to media
alter table public.media 
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;

comment on column public.media.tenant_id is 
  'Tenant that owns this media file. NULL = legacy/unassigned data requiring manual review.';

-- Add tenant_id to reporters
alter table public.reporters 
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;

comment on column public.reporters.tenant_id is 
  'Tenant that owns this reporter profile. NULL = legacy/unassigned data requiring manual review.';

-- Add tenant_id to notifications
alter table public.notifications 
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;

comment on column public.notifications.tenant_id is 
  'Tenant that owns this notification. NULL = legacy/unassigned data requiring manual review.';

-- Add tenant_id to campaigns
alter table public.campaigns 
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;

comment on column public.campaigns.tenant_id is 
  'Tenant that owns this campaign. NULL = legacy/unassigned data requiring manual review.';

-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 2: CREATE INDEXES FOR PERFORMANCE
-- ─────────────────────────────────────────────────────────────────────────────

create index if not exists idx_site_settings_tenant_id 
  on public.site_settings(tenant_id) where deleted_at is null;

create index if not exists idx_articles_tenant_id 
  on public.articles(tenant_id) where deleted_at is null;

create index if not exists idx_categories_tenant_id 
  on public.categories(tenant_id) where deleted_at is null;

create index if not exists idx_breaking_news_tenant_id 
  on public.breaking_news(tenant_id) where deleted_at is null;

create index if not exists idx_advertisements_tenant_id 
  on public.advertisements(tenant_id) where deleted_at is null;

create index if not exists idx_media_tenant_id 
  on public.media(tenant_id) where deleted_at is null;

create index if not exists idx_reporters_tenant_id 
  on public.reporters(tenant_id) where deleted_at is null;

create index if not exists idx_notifications_tenant_id 
  on public.notifications(tenant_id) where deleted_at is null;

create index if not exists idx_campaigns_tenant_id 
  on public.campaigns(tenant_id) where deleted_at is null;

-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 3: ADD UNIQUE CONSTRAINTS
-- ─────────────────────────────────────────────────────────────────────────────

-- Each tenant should have exactly one site_settings record
-- NULL tenant_id (legacy data) is allowed to remain
create unique index if not exists idx_site_settings_tenant_unique
  on public.site_settings(tenant_id) 
  where deleted_at is null and tenant_id is not null;

comment on index public.idx_site_settings_tenant_unique is 
  'Ensures each tenant has at most one active site_settings record. NULL tenant_id excluded to allow legacy data.';

-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 4: LEGACY DATA MARKER
-- ─────────────────────────────────────────────────────────────────────────────

-- All existing data now has tenant_id = NULL
-- This is INTENTIONAL - manual review required
-- Do NOT backfill automatically

comment on table public.site_settings is 
  'Site configuration per tenant. Rows with tenant_id = NULL are legacy/unassigned data awaiting manual review.';

comment on table public.articles is 
  'Published articles per tenant. Rows with tenant_id = NULL are legacy/unassigned data awaiting manual review.';

comment on table public.categories is 
  'Content categories per tenant. Rows with tenant_id = NULL are legacy/unassigned data awaiting manual review.';

-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 5: CREATE TENANT MEMBERSHIP BACKFILL
-- ─────────────────────────────────────────────────────────────────────────────

-- Backfill tenant owners into tenant_memberships
-- Only if they don't already exist (idempotent)
-- IMPORTANT: tenant_memberships has ONLY: id, tenant_id, auth_user_id, role
insert into public.tenant_memberships (tenant_id, auth_user_id, role)
select 
  t.id as tenant_id,
  t.owner_auth_user_id as auth_user_id,
  'owner' as role
from public.tenants t
where t.deleted_at is null
  and t.owner_auth_user_id is not null
  and not exists (
    select 1 
    from public.tenant_memberships tm
    where tm.tenant_id = t.id 
      and tm.auth_user_id = t.owner_auth_user_id
  );

comment on table public.tenant_memberships is 
  'User membership in tenants. Establishes which users can access which tenant data.';

-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 6: CREATE HELPER FUNCTIONS FOR RLS
-- ─────────────────────────────────────────────────────────────────────────────

-- Get current user's tenant memberships
create or replace function public.get_user_tenant_ids()
returns table(tenant_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select tm.tenant_id
  from public.tenant_memberships tm
  where tm.auth_user_id = auth.uid();
$$;

comment on function public.get_user_tenant_ids() is 
  'Returns all tenant IDs the current authenticated user belongs to.';

-- Check if user is member of specific tenant
create or replace function public.is_tenant_member(check_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tenant_memberships tm
    where tm.auth_user_id = auth.uid()
      and tm.tenant_id = check_tenant_id
  );
$$;

comment on function public.is_tenant_member(uuid) is 
  'Checks if current user is a member of the specified tenant.';

-- Check if user is super admin (existing function - ensure it exists)
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    join public.roles r on r.id = u.role_id
    where u.auth_user_id = auth.uid()
      and r.slug = 'super_admin'
      and u.deleted_at is null
      and r.deleted_at is null
  );
$$;

comment on function public.is_super_admin() is 
  'Checks if current user has super_admin role (platform-wide access).';

commit;
