-- ═══════════════════════════════════════════════════════════════════════════
-- PAYMENT APPROVAL BUG DIAGNOSTIC
-- Investigating "Not authorized" error when Super Admin approves/rejects payments
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. CHECK SUPER ADMIN FUNCTION EXISTS ────────────────────────────────────
SELECT 
  'is_super_admin()' AS function_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = 'is_super_admin'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END AS status;

-- ─── 2. CHECK PAYMENT APPROVAL/REJECT FUNCTIONS EXIST ────────────────────────
SELECT 
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  CASE 
    WHEN p.prosecdef THEN '✅ SECURITY DEFINER'
    ELSE '❌ NOT SECURITY DEFINER'
  END AS security,
  CASE
    WHEN has_function_privilege('authenticated', p.oid, 'EXECUTE') THEN '✅ GRANTED'
    ELSE '❌ NOT GRANTED'
  END AS authenticated_can_execute
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' 
  AND p.proname IN ('approve_subscription_payment', 'reject_payment')
ORDER BY p.proname;

-- ─── 3. CHECK IF PERMISSION FIX MIGRATION WAS APPLIED ────────────────────────
SELECT 
  name,
  executed_at
FROM supabase_migrations.schema_migrations
WHERE name = '20260901000002_fix_super_admin_rpc_permissions'
ORDER BY executed_at DESC;

-- ─── 4. CHECK SUPER ADMIN USER EXISTS ────────────────────────────────────────
SELECT 
  u.id,
  u.auth_user_id,
  u.email,
  u.full_name,
  r.slug AS role,
  r.id AS role_id,
  u.deleted_at
FROM public.users u
JOIN public.roles r ON r.id = u.role_id
WHERE r.slug = 'super_admin'
  AND u.deleted_at IS NULL;

-- ─── 5. CHECK CURRENT AUTH USER (Run this when logged in as Super Admin) ─────
SELECT 
  auth.uid() AS current_auth_user_id,
  auth.jwt() -> 'email' AS current_email;

-- ─── 6. TEST is_super_admin() FUNCTION (Run when logged in as Super Admin) ───
SELECT public.is_super_admin() AS am_i_super_admin;

-- ─── 7. CHECK PAYMENT RECORDS WITH SUBMITTED STATUS ──────────────────────────
SELECT 
  tp.id AS payment_id,
  tp.tenant_id,
  t.name AS tenant_name,
  t.slug AS tenant_slug,
  tp.plan,
  tp.amount,
  tp.utr,
  tp.status,
  tp.submitted_at,
  t.subscription_status AS tenant_subscription_status
FROM public.tenant_payments tp
JOIN public.tenants t ON t.id = tp.tenant_id
WHERE tp.status = 'SUBMITTED'
ORDER BY tp.submitted_at DESC;

-- ─── 8. CHECK TENANTS WITH PAYMENT_PENDING STATUS ───────────────────────────
SELECT 
  t.id AS tenant_id,
  t.slug,
  t.name,
  t.subscription_status,
  t.subscription_plan,
  t.created_at,
  tp.id AS payment_record_id,
  tp.utr,
  tp.status AS payment_status
FROM public.tenants t
LEFT JOIN public.tenant_payments tp ON tp.tenant_id = t.id AND tp.status = 'SUBMITTED'
WHERE t.subscription_status = 'PAYMENT_PENDING'
  AND t.deleted_at IS NULL
ORDER BY t.created_at DESC;

-- ─── 9. CHECK RLS POLICIES ON TENANT_PAYMENTS ───────────────────────────────
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'tenant_payments'
ORDER BY policyname;

-- ─── 10. CHECK RLS POLICIES ON TENANTS ──────────────────────────────────────
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'tenants'
  AND policyname LIKE '%super_admin%'
ORDER BY policyname;

-- ═══════════════════════════════════════════════════════════════════════════
-- EXPECTED RESULTS
-- ═══════════════════════════════════════════════════════════════════════════
--
-- 1. is_super_admin() should exist (✅)
-- 2. approve_subscription_payment() and reject_payment() should:
--    - Exist (✅)
--    - Be SECURITY DEFINER (✅)
--    - Have EXECUTE granted to authenticated (✅)
-- 3. Migration 20260901000002 should have been executed
-- 4. At least one super_admin user should exist
-- 5. When logged in as Super Admin:
--    - auth.uid() should return your auth_user_id
--    - is_super_admin() should return true
-- 6. Submitted payments should appear in tenant_payments table
-- 7. Tenants with PAYMENT_PENDING status should exist
--
-- ═══════════════════════════════════════════════════════════════════════════
-- IF PERMISSION FIX MIGRATION NOT APPLIED
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Run these GRANT statements manually:
--
-- GRANT EXECUTE ON FUNCTION public.approve_subscription_payment(UUID, UUID) TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.reject_payment(UUID, TEXT, UUID) TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.update_tenant_status_rpc(UUID, TEXT, TEXT) TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.extend_tenant_trial_rpc(UUID, INTEGER) TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.log_super_admin_action(TEXT, TEXT, UUID, JSONB) TO authenticated;
--
-- ═══════════════════════════════════════════════════════════════════════════
