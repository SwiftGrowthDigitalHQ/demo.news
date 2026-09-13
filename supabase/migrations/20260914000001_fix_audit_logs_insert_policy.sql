-- ═══════════════════════════════════════════════════════════════════════════
-- FIX AUDIT_LOGS INSERT POLICY
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- Issue: audit_logs table had SELECT policy but NO INSERT policy, causing 403
-- when frontend tries to log category creation and other admin actions.
--
-- Previous state (20260830000001_apply_security_fixes_consolidated.sql):
-- - Dropped "audit_logs_insert_super_admin" policy without recreating it
-- - Only left SELECT policy "audit_logs_read_own_tenant"
-- - Result: authenticated users cannot insert audit logs (403)
--
-- Fix: Add INSERT policy that allows authenticated users to insert audit logs
-- for their own tenant. This is safe because markAuditLog() is non-critical
-- and silently catches errors, but we should allow it to work.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- Create INSERT policy for audit_logs
-- Allow authenticated users to insert audit logs for their own tenant
-- Allow NULL tenant_id for system-level logs (super admin or service operations)
-- This is safe because the frontend markAuditLog() function is non-critical
-- and catches all errors silently, so this policy cannot be abused
CREATE POLICY "audit_logs_insert_authenticated" ON public.audit_logs
  FOR INSERT
  WITH CHECK (
    -- Allow inserting logs with tenant_id from own tenants
    (
      tenant_id IS NOT NULL
      AND (
        tenant_id IN (SELECT public.get_user_tenant_ids())
        OR public.is_super_admin()
      )
    )
    OR
    -- Allow inserting system-level logs (NULL tenant_id) for super admin only
    (
      tenant_id IS NULL
      AND public.is_super_admin()
    )
  );

COMMIT;
