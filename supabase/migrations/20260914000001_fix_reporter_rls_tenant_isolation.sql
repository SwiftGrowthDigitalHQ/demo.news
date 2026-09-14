-- Fix: Drop the old non-tenant-aware reporter RLS policy
-- 
-- CRITICAL BUG: The "public read active reporters" policy from the initial schema
-- does NOT check tenant_id. This allows RLS to return ALL reporters from ALL tenants
-- regardless of the .eq('tenant_id', tenantId) filter in the application query.
--
-- RLS policies take precedence: if any policy allows access, the query succeeds.
-- The old policy allowed access based ONLY on (deleted_at is null and status = 'active')
-- without checking tenant isolation.
--
-- This migration drops the old broken policy and ensures only the tenant-aware
-- policies from fix_rls_security.sql are active.

begin;

-- Drop the old non-tenant-aware public read policy
drop policy if exists "public read active reporters" on public.reporters;

-- Verify that the tenant-aware policies exist
-- These are created in 20260824000005_fix_rls_security.sql
-- and 20260824000002_multi_tenant_rls_policies.sql

-- The following policies must be active:
-- 1. "public_read_reporters" - allows public read of reporters with tenant_id not null
-- 2. "tenant_read_own_reporters" - allows authenticated users to read their tenant's reporters
-- 3. "tenant_manage_own_reporters" - allows authenticated users to manage their tenant's reporters

commit;
