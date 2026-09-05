-- ═══════════════════════════════════════════════════════════════════════════
-- FIX GOOGLE DRIVE RECONNECT - READ POLICY SOFT-DELETE CHECK
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- ROOT CAUSE:
-- The RLS SELECT policy "tenant_read_own_gdrive_connection" had:
--   deleted_at IS NULL
-- 
-- This caused the OAuth callback Edge Function's query to FAIL when trying to
-- find an existing soft-deleted connection record:
--   .select('id, deleted_at')
--   .eq('tenant_id', tenantId)
--   .single()
-- 
-- The Edge Function receives no rows (PGRST116 error), thinks it's a NEW
-- connection, and attempts INSERT instead of UPDATE.
--
-- The INSERT then fails silently due to unique constraint on tenant_id, but
-- the error handling may not catch this properly in all cases, leaving the
-- old soft-deleted record unchanged with deleted_at still populated.
-- 
-- FIX:
-- Remove "deleted_at IS NULL" from the SELECT policy so the Edge Function
-- can find soft-deleted records and UPDATE them on reconnect.
-- 
-- SECURITY:
-- The SELECT policy still enforces:
-- - tenant_id in (get_user_tenant_ids()) - only user's tenant
-- - OR is_super_admin() - super admin access
-- 
-- The deleted_at field is audit information, not a security boundary.
-- Soft-deleted records should be visible to authorized users for audit purposes.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- Drop the old READ policy that was blocking soft-deleted record selection
drop policy if exists "tenant_read_own_gdrive_connection" on public.tenant_google_drive_connections;

-- Create new policy without the deleted_at check
-- This allows Edge Function to find soft-deleted records for update on reconnect
create policy "tenant_read_own_gdrive_connection" 
  on public.tenant_google_drive_connections
  for select using (
    (
      tenant_id in (select public.get_user_tenant_ids())
      or public.is_super_admin()
    )
  );

comment on policy "tenant_read_own_gdrive_connection" on public.tenant_google_drive_connections is 
  'Tenant members and super admin can read connection metadata (including soft-deleted). Soft-delete filtering is application-level, not RLS-level.';

commit;
