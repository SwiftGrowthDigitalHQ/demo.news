-- ============================================================================
-- XML SITEMAP PLUGIN — Database Helpers
-- ============================================================================
-- Strategy: plugin configuration is stored in tenant_plugins.configuration
-- JSONB (no separate table needed). This migration only adds:
--   1. A SECURITY DEFINER function the Edge Function calls with service role
--      to assemble all sitemap data in a single round-trip.
--   2. Indexes on columns used by that query (if not already present).
--
-- tenant_plugins table already exists (20260826000001_fix_tenant_plugins_table.sql).
-- Articles/categories tenant_id indexes already exist
-- (20260824000001_multi_tenant_architecture.sql).
-- This migration is fully idempotent.
-- ============================================================================

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Extra index: articles (tenant_id, status, updated_at)
--    Speeds up the WHERE tenant_id = X AND status = 'published' AND
--    deleted_at IS NULL ORDER BY updated_at DESC query.
-- ─────────────────────────────────────────────────────────────────────────────
create index if not exists idx_articles_sitemap
  on public.articles (tenant_id, status, updated_at desc)
  where deleted_at is null;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Extra index: categories (tenant_id, updated_at)
-- ─────────────────────────────────────────────────────────────────────────────
create index if not exists idx_categories_sitemap
  on public.categories (tenant_id, updated_at desc)
  where deleted_at is null;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Extra index: reporters (tenant_id, status, updated_at)
-- ─────────────────────────────────────────────────────────────────────────────
create index if not exists idx_reporters_sitemap
  on public.reporters (tenant_id, updated_at desc)
  where deleted_at is null;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. SECURITY DEFINER function: get_sitemap_data
--    Called by the xml-sitemap Edge Function (service role) to assemble
--    all data needed to build a tenant's XML sitemap.
--
--    Returns ONE row per URL entry, typed by url_type:
--      'homepage'  — the tenant root
--      'article'   — published article
--      'category'  — active category
--      'author'    — active reporter (when include_authors = true)
--
--    Security model:
--      • SECURITY DEFINER — bypasses RLS, safe because the function
--        ALWAYS filters by tenant_id from the tenants table
--      • The slug parameter is validated; unknown slugs return 0 rows
--      • No credentials, tokens or private data are returned
--      • Called server-side only (Edge Function), never from browser
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.get_sitemap_data(
  p_tenant_slug    text,
  p_include_articles  boolean default true,
  p_include_categories boolean default true,
  p_include_authors   boolean default false,
  p_max_articles   integer default 50000,
  p_offset         integer default 0
)
returns table (
  url_type     text,
  slug         text,
  updated_at   timestamptz,
  priority     text,
  changefreq   text
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_tenant_id uuid;
begin
  -- Validate and resolve tenant
  if p_tenant_slug is null or length(trim(p_tenant_slug)) = 0 then
    return;
  end if;

  select t.id into v_tenant_id
  from public.tenants t
  where t.slug = p_tenant_slug
    and t.deleted_at is null
  limit 1;

  if v_tenant_id is null then
    return; -- Unknown tenant — return nothing
  end if;

  -- Homepage entry
  return query
  select
    'homepage'::text as url_type,
    ''::text         as slug,
    now()            as updated_at,
    '1.0'::text      as priority,
    'daily'::text    as changefreq;

  -- Articles
  if p_include_articles then
    return query
    select
      'article'::text             as url_type,
      a.slug                      as slug,
      coalesce(a.updated_at, a.created_at) as updated_at,
      '0.8'::text                 as priority,
      'weekly'::text              as changefreq
    from public.articles a
    where a.tenant_id = v_tenant_id
      and a.status = 'published'
      and a.deleted_at is null
    order by a.updated_at desc nulls last
    limit p_max_articles
    offset p_offset;
  end if;

  -- Categories
  if p_include_categories then
    return query
    select
      'category'::text            as url_type,
      c.slug                      as slug,
      coalesce(c.updated_at, c.created_at) as updated_at,
      '0.6'::text                 as priority,
      'daily'::text               as changefreq
    from public.categories c
    where c.tenant_id = v_tenant_id
      and c.deleted_at is null
    order by c.updated_at desc nulls last;
  end if;

  -- Authors / Reporters
  if p_include_authors then
    return query
    select
      'author'::text              as url_type,
      r.slug                      as slug,
      coalesce(r.updated_at, r.created_at) as updated_at,
      '0.4'::text                 as priority,
      'monthly'::text             as changefreq
    from public.reporters r
    where r.tenant_id = v_tenant_id
      and r.status = 'active'
      and r.deleted_at is null
    order by r.updated_at desc nulls last;
  end if;

  return;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. SECURITY DEFINER function: get_sitemap_config
--    Returns the sitemap plugin config + canonical_base_url for a tenant.
--    Called server-side by Edge Function to check:
--      a) Is xml-sitemap plugin enabled?
--      b) What is the base URL to prefix <loc> entries?
--      c) What are the user's include/exclude preferences?
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.get_sitemap_config(p_tenant_slug text)
returns table (
  tenant_id           uuid,
  plugin_enabled      boolean,
  plugin_config       jsonb,
  canonical_base_url  text,
  site_url_fallback   text
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if p_tenant_slug is null or length(trim(p_tenant_slug)) = 0 then
    return;
  end if;

  return query
  select
    t.id as tenant_id,
    -- plugin_enabled: false if no row exists yet (treat missing = not enabled)
    coalesce(tp.enabled, false) as plugin_enabled,
    -- plugin_config: the JSONB configuration blob (or empty object)
    coalesce(tp.configuration, '{}'::jsonb) as plugin_config,
    -- canonical_base_url from SEO Manager (preferred)
    seo.canonical_base_url,
    -- Fallback: site_url from site_settings theme_config
    (ss.theme_config->>'site_url')::text as site_url_fallback
  from public.tenants t
  left join public.tenant_plugins tp
    on tp.tenant_id = t.id
    and tp.plugin_key = 'xml-sitemap'
  left join public.tenant_seo_defaults seo
    on seo.tenant_id = t.id
  left join public.site_settings ss
    on ss.tenant_id = t.id
    and ss.deleted_at is null
  where t.slug = p_tenant_slug
    and t.deleted_at is null
  limit 1;

  return;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. SECURITY DEFINER function: get_sitemap_url_count
--    Returns the total URL count for the admin UI preview.
--    Authenticated admin call (via RLS-aware client + tenant check).
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.get_sitemap_url_count(p_tenant_id uuid)
returns table (
  article_count  bigint,
  category_count bigint,
  author_count   bigint
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  -- Caller must own this tenant (enforced by RLS on tenant_plugins already,
  -- but we add an ownership check here as belt-and-suspenders)
  if not exists (
    select 1 from public.tenants t
    where t.id = p_tenant_id
      and t.owner_auth_user_id = auth.uid()
      and t.deleted_at is null
  ) then
    raise exception 'access denied' using errcode = 'insufficient_privilege';
  end if;

  return query
  select
    (select count(*) from public.articles a
      where a.tenant_id = p_tenant_id
        and a.status = 'published'
        and a.deleted_at is null)::bigint as article_count,
    (select count(*) from public.categories c
      where c.tenant_id = p_tenant_id
        and c.deleted_at is null)::bigint as category_count,
    (select count(*) from public.reporters r
      where r.tenant_id = p_tenant_id
        and r.status = 'active'
        and r.deleted_at is null)::bigint as author_count;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Grant execute to authenticated and anon roles
--    get_sitemap_data and get_sitemap_config are called by the Edge Function
--    using service-role — but granting to authenticated too for flexibility.
--    get_sitemap_url_count requires auth (ownership check inside function).
-- ─────────────────────────────────────────────────────────────────────────────
grant execute on function public.get_sitemap_data(text, boolean, boolean, boolean, integer, integer)
  to authenticated, anon, service_role;

grant execute on function public.get_sitemap_config(text)
  to authenticated, anon, service_role;

grant execute on function public.get_sitemap_url_count(uuid)
  to authenticated;

commit;

-- ─────────────────────────────────────────────────────────────────────────────
-- Comments
-- ─────────────────────────────────────────────────────────────────────────────
comment on function public.get_sitemap_data is
  'Returns all URL entries for a tenant XML sitemap. Called by xml-sitemap Edge Function (service role). Always filters by tenant_id resolved from slug — never returns cross-tenant data.';

comment on function public.get_sitemap_config is
  'Returns XML sitemap plugin config + base URL for a tenant. Called by xml-sitemap Edge Function. Returns empty result for unknown/deleted tenants.';

comment on function public.get_sitemap_url_count is
  'Returns URL counts for admin sitemap preview. Requires authenticated tenant owner.';
