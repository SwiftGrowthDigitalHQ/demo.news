-- ═══════════════════════════════════════════════════════════════════════════
-- FIX SUPER ADMIN RPC PERMISSIONS
-- Run this in Supabase SQL Editor to fix "Not authorized" errors
-- ═══════════════════════════════════════════════════════════════════════════
--
-- PROBLEM: Payment actions return "Not authorized" even for Super Admin
-- ROOT CAUSE: Functions have execute permissions revoked but not granted back
--
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- Grant execute permission for payment functions
GRANT EXECUTE ON FUNCTION public.approve_subscription_payment(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_payment(UUID, TEXT, UUID) TO authenticated;

-- Ensure newer RPCs also have permissions
GRANT EXECUTE ON FUNCTION public.update_tenant_status_rpc(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.extend_tenant_trial_rpc(UUID, INTEGER) TO authenticated;

-- Ensure audit logging function has permissions
GRANT EXECUTE ON FUNCTION public.log_super_admin_action(TEXT, TEXT, UUID, JSONB) TO authenticated;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICATION
-- ═══════════════════════════════════════════════════════════════════════════

-- Check function permissions
SELECT 
  p.proname as function_name,
  pg_catalog.pg_get_function_arguments(p.oid) as arguments,
  CASE 
    WHEN has_function_privilege('authenticated', p.oid, 'EXECUTE') 
    THEN '✅ GRANTED' 
    ELSE '❌ NOT GRANTED' 
  END as authenticated_can_execute
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'approve_subscription_payment',
    'reject_payment',
    'update_tenant_status_rpc',
    'extend_tenant_trial_rpc',
    'log_super_admin_action'
  )
ORDER BY p.proname;
