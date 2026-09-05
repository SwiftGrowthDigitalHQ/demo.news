-- ═══════════════════════════════════════════════════════════════════════════
-- FIX GOOGLE DRIVE RECONNECT RLS POLICY
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- ROOT CAUSE: 
-- The RLS policy "tenant_manage_own_gdrive_connection" had "deleted_at is null"
-- in its USING clause, which blocked UPDATE operations on soft-deleted records.
-- 
-- When a user disconnects Google Drive, the record is soft-deleted (deleted_at=NOW()).
-- When they reconnect, the .update() call on the soft-deleted row was blocked by RLS.
-- 
-- FIX:
-- Remove "deleted_at is null" from the RLS USING clause to allow updates on 
-- all connection records (both active and soft-deleted).
-- 
-- SECURITY:
-- The policy still requires:
-- - User is a member of the tenant, AND user has manage_settings permission
-- - OR user is a super admin
-- These checks are sufficient; deleted_at is an audit field, not a security boundary.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- Drop the old policy that was blocking reconnects
drop policy if exists "tenant_manage_own_gdrive_connection" on public.tenant_google_drive_connections;

-- Create new policy without the deleted_at is null check
-- This allows reconnects to update soft-deleted connection records
create policy "tenant_manage_own_gdrive_connection" 
  on public.tenant_google_drive_connections
  for all using (
    (
      tenant_id in (select public.get_user_tenant_ids())
      and public.has_permission('manage_settings')
    )
    or public.is_super_admin()
  )
  with check (
    (
      tenant_id in (select public.get_user_tenant_ids())
      and public.has_permission('manage_settings')
    )
    or public.is_super_admin()
  );

comment on policy "tenant_manage_own_gdrive_connection" on public.tenant_google_drive_connections is 
  'Tenant admins with manage_settings permission and super admin can insert/update/delete connections, including reconnects on soft-deleted records.';

commit;
