-- ═══════════════════════════════════════════════════════════════════════════
-- MULTI-TENANT RLS POLICIES
-- Enforces tenant isolation at database level
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- DROP EXISTING POLICIES (REBUILD FROM SCRATCH)
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "public read site settings" on public.site_settings;
drop policy if exists "manage site settings" on public.site_settings;
drop policy if exists "public read articles" on public.articles;
drop policy if exists "manage articles" on public.articles;
drop policy if exists "public read categories" on public.categories;
drop policy if exists "manage categories" on public.categories;
drop policy if exists "public read breaking news" on public.breaking_news;
drop policy if exists "manage breaking news" on public.breaking_news;
drop policy if exists "public read ads" on public.advertisements;
drop policy if exists "manage ads" on public.advertisements;
drop policy if exists "public read media" on public.media;
drop policy if exists "manage media" on public.media;
drop policy if exists "manage reporters" on public.reporters;
drop policy if exists "manage notifications" on public.notifications;
drop policy if exists "manage campaigns" on public.campaigns;

-- ─────────────────────────────────────────────────────────────────────────────
-- SITE_SETTINGS POLICIES
-- ─────────────────────────────────────────────────────────────────────────────

create policy "tenant_read_own_site_settings" on public.site_settings
  for select
  using (
    deleted_at is null
    and (
      -- User can read their own tenant's settings
      tenant_id in (select public.get_user_tenant_ids())
      -- Super admin can read all including legacy (NULL)
      or public.is_super_admin()
    )
  );

create policy "tenant_manage_own_site_settings" on public.site_settings
  for all
  using (
    deleted_at is null
    and (
      -- User can manage their own tenant's settings
      tenant_id in (select public.get_user_tenant_ids())
      -- Super admin can manage all including legacy
      or public.is_super_admin()
    )
  )
  with check (
    -- On insert/update, tenant_id must be user's tenant or super admin
    tenant_id in (select public.get_user_tenant_ids())
    or public.is_super_admin()
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- ARTICLES POLICIES
-- ─────────────────────────────────────────────────────────────────────────────

-- Public can read published articles from tenants (but NOT NULL/legacy)
create policy "public_read_published_articles" on public.articles
  for select
  using (
    deleted_at is null
    and status = 'published'
    and tenant_id is not null  -- Exclude legacy
  );

-- Tenant members can read all their tenant's articles
create policy "tenant_read_own_articles" on public.articles
  for select
  using (
    deleted_at is null
    and (
      tenant_id in (select public.get_user_tenant_ids())
      or public.is_super_admin()
    )
  );

-- Tenant members can manage their own tenant's articles
create policy "tenant_manage_own_articles" on public.articles
  for all
  using (
    deleted_at is null
    and (
      tenant_id in (select public.get_user_tenant_ids())
      or public.is_super_admin()
    )
  )
  with check (
    tenant_id in (select public.get_user_tenant_ids())
    or public.is_super_admin()
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- CATEGORIES POLICIES
-- ─────────────────────────────────────────────────────────────────────────────

-- Public can read categories (but NOT NULL/legacy)
create policy "public_read_categories" on public.categories
  for select
  using (
    deleted_at is null
    and tenant_id is not null  -- Exclude legacy
  );

-- Tenant members can read all their tenant's categories
create policy "tenant_read_own_categories" on public.categories
  for select
  using (
    deleted_at is null
    and (
      tenant_id in (select public.get_user_tenant_ids())
      or public.is_super_admin()
    )
  );

-- Tenant members can manage their own tenant's categories
create policy "tenant_manage_own_categories" on public.categories
  for all
  using (
    deleted_at is null
    and (
      tenant_id in (select public.get_user_tenant_ids())
      or public.is_super_admin()
    )
  )
  with check (
    tenant_id in (select public.get_user_tenant_ids())
    or public.is_super_admin()
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- BREAKING_NEWS POLICIES
-- ─────────────────────────────────────────────────────────────────────────────

-- Public can read active breaking news (but NOT NULL/legacy)
create policy "public_read_breaking_news" on public.breaking_news
  for select
  using (
    deleted_at is null
    and is_active = true
    and tenant_id is not null  -- Exclude legacy
  );

-- Tenant members can read all their tenant's breaking news
create policy "tenant_read_own_breaking_news" on public.breaking_news
  for select
  using (
    deleted_at is null
    and (
      tenant_id in (select public.get_user_tenant_ids())
      or public.is_super_admin()
    )
  );

-- Tenant members can manage their own tenant's breaking news
create policy "tenant_manage_own_breaking_news" on public.breaking_news
  for all
  using (
    deleted_at is null
    and (
      tenant_id in (select public.get_user_tenant_ids())
      or public.is_super_admin()
    )
  )
  with check (
    tenant_id in (select public.get_user_tenant_ids())
    or public.is_super_admin()
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- ADVERTISEMENTS POLICIES
-- ─────────────────────────────────────────────────────────────────────────────

-- Public can read active ads (but NOT NULL/legacy)
create policy "public_read_advertisements" on public.advertisements
  for select
  using (
    deleted_at is null
    and is_active = true
    and tenant_id is not null  -- Exclude legacy
  );

-- Tenant members can read all their tenant's ads
create policy "tenant_read_own_advertisements" on public.advertisements
  for select
  using (
    deleted_at is null
    and (
      tenant_id in (select public.get_user_tenant_ids())
      or public.is_super_admin()
    )
  );

-- Tenant members can manage their own tenant's ads
create policy "tenant_manage_own_advertisements" on public.advertisements
  for all
  using (
    deleted_at is null
    and (
      tenant_id in (select public.get_user_tenant_ids())
      or public.is_super_admin()
    )
  )
  with check (
    tenant_id in (select public.get_user_tenant_ids())
    or public.is_super_admin()
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- MEDIA POLICIES
-- ─────────────────────────────────────────────────────────────────────────────

-- Tenant members can read their own tenant's media
create policy "tenant_read_own_media" on public.media
  for select
  using (
    deleted_at is null
    and (
      tenant_id in (select public.get_user_tenant_ids())
      or public.is_super_admin()
    )
  );

-- Tenant members can manage their own tenant's media
create policy "tenant_manage_own_media" on public.media
  for all
  using (
    deleted_at is null
    and (
      tenant_id in (select public.get_user_tenant_ids())
      or public.is_super_admin()
    )
  )
  with check (
    tenant_id in (select public.get_user_tenant_ids())
    or public.is_super_admin()
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- REPORTERS POLICIES
-- ─────────────────────────────────────────────────────────────────────────────

-- Tenant members can read their own tenant's reporters
create policy "tenant_read_own_reporters" on public.reporters
  for select
  using (
    deleted_at is null
    and (
      tenant_id in (select public.get_user_tenant_ids())
      or public.is_super_admin()
    )
  );

-- Tenant members can manage their own tenant's reporters
create policy "tenant_manage_own_reporters" on public.reporters
  for all
  using (
    deleted_at is null
    and (
      tenant_id in (select public.get_user_tenant_ids())
      or public.is_super_admin()
    )
  )
  with check (
    tenant_id in (select public.get_user_tenant_ids())
    or public.is_super_admin()
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- NOTIFICATIONS POLICIES
-- ─────────────────────────────────────────────────────────────────────────────

-- Tenant members can read their own tenant's notifications
create policy "tenant_read_own_notifications" on public.notifications
  for select
  using (
    deleted_at is null
    and (
      tenant_id in (select public.get_user_tenant_ids())
      or public.is_super_admin()
    )
  );

-- Tenant members can manage their own tenant's notifications
create policy "tenant_manage_own_notifications" on public.notifications
  for all
  using (
    deleted_at is null
    and (
      tenant_id in (select public.get_user_tenant_ids())
      or public.is_super_admin()
    )
  )
  with check (
    tenant_id in (select public.get_user_tenant_ids())
    or public.is_super_admin()
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- CAMPAIGNS POLICIES
-- ─────────────────────────────────────────────────────────────────────────────

-- Tenant members can read their own tenant's campaigns
create policy "tenant_read_own_campaigns" on public.campaigns
  for select
  using (
    deleted_at is null
    and (
      tenant_id in (select public.get_user_tenant_ids())
      or public.is_super_admin()
    )
  );

-- Tenant members can manage their own tenant's campaigns
create policy "tenant_manage_own_campaigns" on public.campaigns
  for all
  using (
    deleted_at is null
    and (
      tenant_id in (select public.get_user_tenant_ids())
      or public.is_super_admin()
    )
  )
  with check (
    tenant_id in (select public.get_user_tenant_ids())
    or public.is_super_admin()
  );

commit;
