-- ═══════════════════════════════════════════════════════════════════════════
-- Fix Super Admin RPC Permissions
-- Grant execute permissions to authenticated users for payment action RPCs
-- ═══════════════════════════════════════════════════════════════════════════
--
-- PROBLEM:
-- The payment functions (approve_subscription_payment, reject_payment) had
-- execute permissions REVOKED from public but were never GRANTED to authenticated.
-- This caused "Not authorized" errors even for Super Admin users.
--
-- The functions themselves check is_super_admin() internally for authorization,
-- but users must be able to EXECUTE the function first to reach that check.
--
-- SOLUTION:
-- Grant EXECUTE permission to authenticated role for all Super Admin RPC functions.
-- The internal is_super_admin() check still ensures only Super Admins can succeed.
--
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. Grant execute permission for payment approval ────────────────────────
-- Function already exists from 20260812000003_subscription_lifecycle_complete.sql
-- It checks is_super_admin() internally
GRANT EXECUTE ON FUNCTION public.approve_subscription_payment(UUID, UUID) 
  TO authenticated;

-- ─── 2. Grant execute permission for payment rejection ───────────────────────
-- Function already exists from 20260812000003_subscription_lifecycle_complete.sql
-- It checks is_super_admin() internally
GRANT EXECUTE ON FUNCTION public.reject_payment(UUID, TEXT, UUID) 
  TO authenticated;

-- ─── 3. Verify newer RPCs still have their grants ────────────────────────────
-- These were created with GRANT statements, but we ensure they're present

-- update_tenant_status_rpc (from 20260831000003_payment_final_hardening.sql)
GRANT EXECUTE ON FUNCTION public.update_tenant_status_rpc(UUID, TEXT, TEXT) 
  TO authenticated;

-- extend_tenant_trial_rpc (from 20260831000004_extend_trial_rpc.sql)
GRANT EXECUTE ON FUNCTION public.extend_tenant_trial_rpc(UUID, INTEGER) 
  TO authenticated;

-- ─── 4. Grant execute permission for log_super_admin_action ──────────────────
-- Function was created in 20260901000001_fix_log_super_admin_action.sql
-- This might already have GRANT, but we ensure it
GRANT EXECUTE ON FUNCTION public.log_super_admin_action(TEXT, TEXT, UUID, JSONB) 
  TO authenticated;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECURITY NOTE
-- ═══════════════════════════════════════════════════════════════════════════
--
-- These GRANT statements are SAFE because:
--
-- 1. All functions are SECURITY DEFINER
-- 2. All functions check is_super_admin() internally before any action
-- 3. The GRANT only allows authenticated users to CALL the function
-- 4. The function itself rejects non-super-admin callers
--
-- Without these GRANTs:
-- - PostgreSQL returns "permission denied" immediately
-- - The function never executes
-- - The is_super_admin() check never runs
-- - Even valid Super Admins get "Not authorized"
--
-- With these GRANTs:
-- - Authenticated users can call the function
-- - The function executes and checks is_super_admin()
-- - Only Super Admins pass the check
-- - Regular users get "only super_admin can..." exception
--
-- This is the standard pattern for SECURITY DEFINER functions with
-- role-based authorization checks.
--
-- ═══════════════════════════════════════════════════════════════════════════
