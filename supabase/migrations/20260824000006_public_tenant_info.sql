-- ═══════════════════════════════════════════════════════════════════════════
-- PUBLIC TENANT INFO - SECURE IMPLEMENTATION
-- Provides anonymous-safe tenant configuration WITHOUT exposing secrets
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECURITY DEFINER FUNCTION: GET PUBLIC TENANT INFO
-- ─────────────────────────────────────────────────────────────────────────────

-- This function bypasses RLS via SECURITY DEFINER to read site_settings
-- but returns ONLY explicitly approved public-safe fields
-- Anonymous users CANNOT directly SELECT site_settings OR tenants
-- They can ONLY call this function with a specific tenant slug

create or replace function public.get_public_tenant_info(p_tenant_slug text)
returns table(
  tenant_id uuid,
  tenant_slug text,
  tenant_name text,
  site_name text,
  logo_url text,
  contact_email text,
  social_links jsonb,
  footer_text text,
  theme_primary_color text,
  theme_secondary_color text,
  theme_logo text,
  theme_favicon text,
  theme_tagline text,
  theme_site_url text,
  theme_breaking_ticker boolean,
  theme_dark_mode boolean
)
language plpgsql
stable
security definer
-- Hardened search_path: only trusted pg_catalog + explicit public schema
set search_path = pg_catalog, public
as $$
begin
  -- Validate input
  if p_tenant_slug is null or length(trim(p_tenant_slug)) = 0 then
    return;
  end if;

  -- SECURITY DEFINER allows reading tenants + site_settings despite RLS
  -- But we explicitly return ONLY approved columns for a SINGLE tenant
  -- Returns at most 1 row per call
  return query
  select
    t.id as tenant_id,
    t.slug as tenant_slug,
    t.name as tenant_name,
    s.site_name,
    s.logo_url,
    s.contact_email,
    s.social_links,
    s.footer_text,
    -- Extract ONLY safe theme fields from jsonb
    -- NEVER expose: smtp_*, api_*, fcm_*, openai_*, backup_*, storage_*, credentials
    (s.theme_config->>'primary_color')::text as theme_primary_color,
    (s.theme_config->>'secondary_color')::text as theme_secondary_color,
    (s.theme_config->>'logo')::text as theme_logo,
    (s.theme_config->>'favicon')::text as theme_favicon,
    (s.theme_config->>'tagline')::text as theme_tagline,
    (s.theme_config->>'site_url')::text as theme_site_url,
    coalesce((s.theme_config->>'breaking_ticker')::boolean, false) as theme_breaking_ticker,
    coalesce((s.theme_config->>'dark_mode')::boolean, false) as theme_dark_mode
  from public.tenants t
  left join public.site_settings s 
    on s.tenant_id = t.id 
    and s.deleted_at is null
  where t.slug = p_tenant_slug
    and t.deleted_at is null
  limit 1;
  
  return;
end;
$$;

comment on function public.get_public_tenant_info(text) is 
  'SECURITY DEFINER function that returns public-safe tenant configuration by slug. '
  'Anonymous-accessible. NEVER exposes secrets, API keys, SMTP credentials, or admin config. '
  'Returns zero rows if tenant does not exist or is deleted. '
  'Returns at most 1 row per call. Hardened search_path for SECURITY DEFINER safety.';

-- ─────────────────────────────────────────────────────────────────────────────
-- SET FUNCTION OWNER (SECURITY DEFINER SAFETY)
-- ─────────────────────────────────────────────────────────────────────────────

-- Attempt to set owner to postgres (trusted superuser)
-- If this fails in Supabase environment, it will be detected by verification
do $$
begin
  begin
    alter function public.get_public_tenant_info(text) owner to postgres;
    raise notice 'SUCCESS: Function owner set to postgres';
  exception
    when insufficient_privilege then
      raise warning 'WARNING: Cannot set function owner to postgres - insufficient privilege';
    when others then
      raise warning 'WARNING: Cannot set function owner: %', sqlerrm;
  end;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- EXPLICIT LEAST-PRIVILEGE FUNCTION PERMISSIONS
-- ─────────────────────────────────────────────────────────────────────────────

-- Remove any implicit PUBLIC execute access
revoke execute on function public.get_public_tenant_info(text) from public;

-- Grant explicit execute to ONLY anon and authenticated roles
grant execute on function public.get_public_tenant_info(text) to anon;
grant execute on function public.get_public_tenant_info(text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- REVOKE ANONYMOUS DIRECT SELECT ON SENSITIVE TABLES
-- ─────────────────────────────────────────────────────────────────────────────

-- Anonymous users must NOT have direct SELECT privilege (not just RLS-blocked)
-- They must use ONLY the get_public_tenant_info() function

revoke select on table public.site_settings from anon;
revoke select on table public.tenants from anon;

-- Authenticated users keep their RLS-controlled access
comment on table public.site_settings is
  'Site configuration per tenant. Contains secrets. '
  'Anonymous users have NO SELECT privilege. '
  'Authenticated tenant members access via RLS policies.';

comment on table public.tenants is
  'Tenant registry. Anonymous users have NO SELECT privilege. '
  'Public tenant lookup via get_public_tenant_info(slug) function only.';

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFY SITE_SETTINGS REMAINS PROTECTED
-- ─────────────────────────────────────────────────────────────────────────────

-- Ensure no public policy exists on site_settings
-- Migration 20260824000005 already removed public access
-- This is defensive verification

do $$
begin
  if exists (
    select 1 
    from pg_policies 
    where schemaname = 'public' 
      and tablename = 'site_settings' 
      and policyname like '%public%'
  ) then
    raise exception 'SECURITY ERROR: Public policy detected on site_settings. Aborting migration.';
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- REMOVE PUBLIC ACCESS TO TENANTS TABLE
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop any public policies on tenants
drop policy if exists "public_read_tenant_basic_info" on public.tenants;
drop policy if exists "public_read_tenant_info" on public.tenants;

-- Ensure RLS is enabled on tenants
alter table public.tenants enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFY NO PUBLIC_TENANT_INFO VIEW EXISTS
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop old insecure view if it exists
drop view if exists public.public_tenant_info;

commit;
