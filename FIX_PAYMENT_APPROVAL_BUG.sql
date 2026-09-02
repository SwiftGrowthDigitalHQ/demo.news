-- ═══════════════════════════════════════════════════════════════════════════
-- FIX PAYMENT APPROVAL "NOT AUTHORIZED" BUG
-- Emergency Fix for Super Admin Payment Approve/Reject Actions
-- Date: 2026-09-02
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. Grant EXECUTE permissions to authenticated users ─────────────────────
-- These functions check is_super_admin() internally, but users need
-- EXECUTE permission to call them in the first place.

GRANT EXECUTE ON FUNCTION public.approve_subscription_payment(UUID, UUID) 
  TO authenticated;

GRANT EXECUTE ON FUNCTION public.reject_payment(UUID, TEXT, UUID) 
  TO authenticated;

GRANT EXECUTE ON FUNCTION public.update_tenant_status_rpc(UUID, TEXT, TEXT) 
  TO authenticated;

GRANT EXECUTE ON FUNCTION public.extend_tenant_trial_rpc(UUID, INTEGER) 
  TO authenticated;

GRANT EXECUTE ON FUNCTION public.log_super_admin_action(TEXT, TEXT, UUID, JSONB) 
  TO authenticated;

-- ─── 2. Verify the grants were applied ───────────────────────────────────────

SELECT 
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  CASE
    WHEN has_function_privilege('authenticated', p.oid, 'EXECUTE') THEN '✅ GRANTED'
    ELSE '❌ NOT GRANTED'
  END AS authenticated_can_execute
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' 
  AND p.proname IN (
    'approve_subscription_payment',
    'reject_payment',
    'update_tenant_status_rpc',
    'extend_tenant_trial_rpc',
    'log_super_admin_action'
  )
ORDER BY p.proname;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- INSTRUCTIONS
-- ═══════════════════════════════════════════════════════════════════════════
--
-- 1. Run this SQL in Supabase SQL Editor
-- 2. Verify all functions show "✅ GRANTED"
-- 3. Test payment approval/rejection in Super Admin UI
--
-- This fix addresses the database-level permission issue.
-- The frontend parameter name fix is in a separate file.
--
-- ═══════════════════════════════════════════════════════════════════════════
