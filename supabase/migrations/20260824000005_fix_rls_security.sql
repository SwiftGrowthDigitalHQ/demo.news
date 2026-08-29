-- ═══════════════════════════════════════════════════════════════════════════
-- FIX RLS SECURITY - COMPLETE TENANT ISOLATION
-- Addresses missing public policies and hardens existing rules
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- FIX 1: ADD MISSING PUBLIC READ POLICY FOR MEDIA
-- ─────────────────────────────────────────────────────────────────────────────

-- Media should be publicly accessible when referenced by published articles
-- But NEVER expose legacy tenant_id = NULL media
drop policy if exists "public_read_media" on public.media;

create policy "public_read_media" on public.media
  for select
  using (
    deleted_at is null
    and tenant_id is not null  -- CRITICAL: Exclude legacy NULL tenant media
  );

comment on policy "public_read_media" on public.media is 
  'Public can view media files for tenant content. Legacy NULL tenant media is hidden.';

-- ─────────────────────────────────────────────────────────────────────────────
-- FIX 2: HARDEN SITE_SETTINGS - NO PUBLIC ACCESS TO SECRETS
-- ─────────────────────────────────────────────────────────────────────────────

-- Site settings contain API keys, SMTP credentials, etc.
-- PUBLIC should NEVER read site_settings directly
-- Only authenticated tenant members or super admin

drop policy if exists "public_read_site_settings" on public.site_settings;
drop policy if exists "tenant_read_own_site_settings" on public.site_settings;

-- Only authenticated tenant members can read their settings
create policy "tenant_read_own_site_settings" on public.site_settings
  for select
  using (
    deleted_at is null
    and (
      tenant_id in (select public.get_user_tenant_ids())
      or public.is_super_admin()
    )
  );

comment on policy "tenant_read_own_site_settings" on public.site_settings is 
  'Only authenticated tenant members and super admin can read site settings. NO public access to protect API keys and secrets.';

-- ─────────────────────────────────────────────────────────────────────────────
-- FIX 3: VERIFY ALL PUBLIC POLICIES EXCLUDE NULL TENANT_ID
-- ─────────────────────────────────────────────────────────────────────────────

-- Already correct in existing migration:
-- - public_read_published_articles: has tenant_id is not null ✓
-- - public_read_categories: has tenant_id is not null ✓  
-- - public_read_breaking_news: has tenant_id is not null ✓
-- - public_read_advertisements: has tenant_id is not null ✓
-- - public_read_media: NOW has tenant_id is not null ✓

-- ─────────────────────────────────────────────────────────────────────────────
-- FIX 4: ADD REPORTERS PUBLIC READ (IF INTENDED FOR PUBLIC DISPLAY)
-- ─────────────────────────────────────────────────────────────────────────────

-- If reporter bylines should be publicly visible on articles
drop policy if exists "public_read_reporters" on public.reporters;

create policy "public_read_reporters" on public.reporters
  for select
  using (
    deleted_at is null
    and tenant_id is not null  -- Exclude legacy
    -- Optional: add is_public flag check if you add that column
  );

comment on policy "public_read_reporters" on public.reporters is 
  'Public can view reporter profiles for attribution. Legacy NULL tenant reporters are hidden.';

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICATION: ENSURE RLS IS ENABLED ON ALL TENANT TABLES
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.site_settings enable row level security;
alter table public.articles enable row level security;
alter table public.categories enable row level security;
alter table public.breaking_news enable row level security;
alter table public.advertisements enable row level security;
alter table public.media enable row level security;
alter table public.reporters enable row level security;
alter table public.notifications enable row level security;
alter table public.campaigns enable row level security;

commit;
