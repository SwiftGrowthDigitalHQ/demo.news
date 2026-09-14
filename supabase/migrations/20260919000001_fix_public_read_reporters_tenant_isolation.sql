-- CRITICAL FIX: Enforce tenant isolation on reporters public read policy
-- 
-- ROOT CAUSE: The "public_read_reporters" policy from migration 20260824000005
-- allows anonymous users to read ALL reporters from ALL tenants.
-- It checks ONLY: deleted_at is null and tenant_id is not null
-- It does NOT check tenant_id value itself.
--
-- Since public/anonymous users don't have a tenant context, they should NOT
-- be able to read individual reporters directly. Reporters must be read through
-- the tenant-scoped CMS context or via authenticated-only access.
--
-- FIX: Drop the permissive "public_read_reporters" policy.
-- This forces all reporter access through tenant-aware policies:
-- - "tenant_read_own_reporters": authenticated users see their tenant's reporters
-- - "tenant_manage_own_reporters": authenticated users can manage their tenant's reporters
--
-- For public display (e.g., on /fake-news/about page), use an RPC function
-- that takes tenant_slug as parameter and returns only that tenant's reporters.

begin;

-- Drop the non-tenant-aware public read policy
-- This was supposed to allow public attribution bylines, but it creates
-- a cross-tenant data leak
drop policy if exists "public_read_reporters" on public.reporters;

-- Verify tenant-aware policies remain active
-- (created in 20260824000002_multi_tenant_rls_policies.sql)
-- - tenant_read_own_reporters
-- - tenant_manage_own_reporters

-- If a future feature requires public reporter display, create an RPC like:
-- create or replace function public.get_tenant_reporters(p_tenant_slug text)
-- returns table(...) as $$
--   select * from public.reporters
--   where tenant_id = (select id from tenants where slug = p_tenant_slug)
--   and deleted_at is null
--   and status = 'active'
-- $$ security definer;

commit;
