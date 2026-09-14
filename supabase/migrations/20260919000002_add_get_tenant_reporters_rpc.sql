-- Create RPC function to allow public access to reporters for a specific tenant
-- This replaces the permissive public_read_reporters policy
-- and ensures tenant isolation by accepting tenant_slug as parameter

begin;

create or replace function public.get_tenant_reporters(p_tenant_slug text)
returns table(
  id uuid,
  full_name text,
  slug text,
  bio text,
  specialty text,
  avatar_url text,
  user_id uuid,
  status text,
  tenant_id uuid
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  -- Validate input
  if p_tenant_slug is null or length(trim(p_tenant_slug)) = 0 then
    return;
  end if;

  -- SECURITY DEFINER allows bypassing RLS to join with tenants table
  -- but we explicitly filter to ONLY the requested tenant
  -- Returns at most 1 tenant's reporters
  return query
  select
    r.id,
    r.full_name,
    r.slug,
    r.bio,
    r.specialty,
    r.avatar_url,
    r.user_id,
    r.status,
    r.tenant_id
  from public.reporters r
  inner join public.tenants t on t.id = r.tenant_id
  where t.slug = p_tenant_slug
    and r.deleted_at is null
    and r.status = 'active'
    and t.deleted_at is null
  order by r.created_at desc;
  
  return;
end;
$$;

comment on function public.get_tenant_reporters(text) is
  'Returns active reporters for a specific tenant, identified by slug. '
  'Anonymous-accessible. Ensures tenant isolation by accepting tenant_slug parameter. '
  'Returns zero rows if tenant does not exist. '
  'Replaces permissive public_read_reporters policy.';

-- Grant execute permission to anon and authenticated roles
revoke execute on function public.get_tenant_reporters(text) from public;
grant execute on function public.get_tenant_reporters(text) to anon;
grant execute on function public.get_tenant_reporters(text) to authenticated;

commit;
