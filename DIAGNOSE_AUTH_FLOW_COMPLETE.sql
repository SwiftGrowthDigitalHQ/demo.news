-- ═══════════════════════════════════════════════════════════════════════════
-- COMPLETE AUTHORIZATION FLOW DIAGNOSTIC
-- Run this while logged in as Super Admin to trace the entire auth chain
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. CHECK CURRENT AUTHENTICATION ──────────────────────────────────────────
SELECT 
  'CURRENT AUTH SESSION' AS check_type,
  auth.uid() AS current_auth_uid,
  current_user AS pg_user,
  current_setting('request.jwt.claims', true)::json->>'email' AS jwt_email,
  current_setting('request.jwt.claims', true)::json->>'role' AS jwt_role;

-- ─── 2. CHECK IF AUTH.UID() MATCHES A USER RECORD ────────────────────────────
SELECT 
  'USER LOOKUP BY AUTH.UID()' AS check_type,
  u.id AS user_table_id,
  u.auth_user_id,
  u.email,
  u.full_name,
  u.role_id,
  u.deleted_at,
  CASE 
    WHEN u.id IS NULL THEN '❌ NO USER RECORD FOUND'
    WHEN u.deleted_at IS NOT NULL THEN '❌ USER IS DELETED'
    ELSE '✅ USER RECORD EXISTS'
  END AS status
FROM public.users u
WHERE u.auth_user_id = auth.uid();

-- ─── 3. CHECK USER'S ROLE ─────────────────────────────────────────────────────
SELECT 
  'USER ROLE CHECK' AS check_type,
  u.id AS user_id,
  u.email,
  r.id AS role_id,
  r.slug AS role_slug,
  r.name AS role_name,
  CASE 
    WHEN r.slug = 'super_admin' THEN '✅ IS SUPER ADMIN'
    WHEN r.slug = 'admin' THEN '⚠️ IS ADMIN (NOT SUPER ADMIN)'
    WHEN r.slug IS NULL THEN '❌ NO ROLE FOUND'
    ELSE '⚠️ OTHER ROLE: ' || r.slug
  END AS role_status
FROM public.users u
LEFT JOIN public.roles r ON r.id = u.role_id
WHERE u.auth_user_id = auth.uid()
  AND u.deleted_at IS NULL;

-- ─── 4. CHECK ROLES TABLE HAS super_admin ROLE ───────────────────────────────
SELECT 
  'SUPER_ADMIN ROLE EXISTS?' AS check_type,
  r.id,
  r.slug,
  r.name,
  r.permissions,
  CASE 
    WHEN r.slug = 'super_admin' THEN '✅ ROLE EXISTS'
    ELSE '❌ ROLE MISSING'
  END AS status
FROM public.roles r
WHERE r.slug = 'super_admin';

-- ─── 5. TEST is_super_admin() FUNCTION DIRECTLY ──────────────────────────────
SELECT 
  'is_super_admin() RESULT' AS check_type,
  public.is_super_admin() AS function_returns,
  CASE 
    WHEN public.is_super_admin() = true THEN '✅ FUNCTION RETURNS TRUE'
    WHEN public.is_super_admin() = false THEN '❌ FUNCTION RETURNS FALSE'
    ELSE '❌ FUNCTION RETURNS NULL'
  END AS status;

-- ─── 6. CHECK WHICH USERS HAVE SUPER_ADMIN ROLE ──────────────────────────────
SELECT 
  'ALL SUPER ADMIN USERS' AS check_type,
  u.id,
  u.auth_user_id,
  u.email,
  u.full_name,
  r.slug AS role,
  u.created_at,
  u.deleted_at,
  CASE 
    WHEN u.auth_user_id = auth.uid() THEN '👤 THIS IS YOU'
    ELSE ''
  END AS is_current_user
FROM public.users u
JOIN public.roles r ON r.id = u.role_id
WHERE r.slug = 'super_admin'
ORDER BY 
  CASE WHEN u.auth_user_id = auth.uid() THEN 0 ELSE 1 END,
  u.created_at DESC;

-- ─── 7. CHECK IF RLS IS BLOCKING USER LOOKUP ─────────────────────────────────
-- This bypasses RLS to see if the record exists at all
SELECT 
  'RLS BYPASS CHECK (ADMIN ONLY)' AS check_type,
  EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_user_id = auth.uid()
      AND deleted_at IS NULL
  ) AS user_exists_in_table;

-- ─── 8. MANUAL is_super_admin() QUERY (DEBUG) ────────────────────────────────
-- This is exactly what is_super_admin() does internally
SELECT 
  'MANUAL is_super_admin LOGIC' AS check_type,
  EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    WHERE u.auth_user_id = auth.uid()
      AND r.slug = 'super_admin'
      AND u.deleted_at IS NULL
  ) AS manual_check_result;

-- ─── 9. CHECK USERS TABLE RLS POLICIES ───────────────────────────────────────
SELECT 
  'USERS TABLE RLS POLICIES' AS check_type,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'users'
ORDER BY policyname;

-- ─── 10. VERIFY FUNCTION DEFINITIONS ─────────────────────────────────────────
SELECT 
  'FUNCTION DEFINITIONS' AS check_type,
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  CASE WHEN p.prosecdef THEN '✅ SECURITY DEFINER' ELSE '❌ NOT SECURITY DEFINER' END AS security,
  CASE WHEN p.provolatile = 'i' THEN 'IMMUTABLE'
       WHEN p.provolatile = 's' THEN 'STABLE'
       ELSE 'VOLATILE' END AS volatility
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' 
  AND p.proname IN ('is_super_admin', 'approve_subscription_payment', 'reject_payment')
ORDER BY p.proname;

-- ─── 11. CHECK TENANT_PAYMENTS TABLE FOR TEST DATA ───────────────────────────
SELECT 
  'PENDING PAYMENTS' AS check_type,
  tp.id AS payment_id,
  t.name AS tenant_name,
  tp.amount,
  tp.plan,
  tp.status,
  tp.submitted_at
FROM public.tenant_payments tp
JOIN public.tenants t ON t.id = tp.tenant_id
WHERE tp.status = 'SUBMITTED'
ORDER BY tp.submitted_at DESC
LIMIT 5;

-- ═══════════════════════════════════════════════════════════════════════════
-- INTERPRETATION GUIDE
-- ═══════════════════════════════════════════════════════════════════════════
--
-- EXPECTED RESULTS FOR WORKING SUPER ADMIN:
--
-- Check 1: current_auth_uid should be a valid UUID
-- Check 2: Should find exactly ONE user record with status '✅ USER RECORD EXISTS'
-- Check 3: role_slug should be 'super_admin' with status '✅ IS SUPER ADMIN'
-- Check 4: super_admin role should exist in roles table
-- Check 5: is_super_admin() should return TRUE with '✅ FUNCTION RETURNS TRUE'
-- Check 6: Should show current user in the list with '👤 THIS IS YOU'
-- Check 7: user_exists_in_table should be TRUE
-- Check 8: manual_check_result should be TRUE
-- Check 9: Should show RLS policies (if any)
-- Check 10: All 3 functions should be SECURITY DEFINER
-- Check 11: Should show pending payments ready for approval
--
-- ═══════════════════════════════════════════════════════════════════════════
-- COMMON FAILURE SCENARIOS
-- ═══════════════════════════════════════════════════════════════════════════
--
-- SCENARIO A: auth.uid() returns NULL
--   → User is not logged in or session expired
--   → Fix: Re-login to Supabase
--
-- SCENARIO B: User record not found (Check 2 returns nothing)
--   → auth.uid() exists but no matching users.auth_user_id
--   → Possible cause: User was created before auth_user_id column existed
--   → Fix: UPDATE users SET auth_user_id = '...' WHERE email = '...'
--
-- SCENARIO C: User found but no role (Check 3 shows NULL role)
--   → User record exists but role_id is NULL or invalid
--   → Fix: UPDATE users SET role_id = (SELECT id FROM roles WHERE slug = 'super_admin')
--
-- SCENARIO D: User has wrong role (Check 3 shows role_slug = 'admin')
--   → User has a role but it's not 'super_admin'
--   → Fix: UPDATE users SET role_id = (SELECT id FROM roles WHERE slug = 'super_admin')
--
-- SCENARIO E: super_admin role doesn't exist (Check 4 returns nothing)
--   → roles table is missing the super_admin role
--   → Fix: INSERT INTO roles (slug, name, permissions) VALUES ('super_admin', 'Super Administrator', '["*"]')
--
-- SCENARIO F: is_super_admin() returns FALSE but everything looks correct
--   → Possible RLS policy blocking the query inside is_super_admin()
--   → Check: Compare Check 7 (bypasses RLS) with Check 5 (uses RLS)
--   → Fix: Adjust RLS policies on users table
--
-- SCENARIO G: Function returns TRUE but RPC still fails
--   → Error is happening AFTER is_super_admin() check
--   → Could be: payment not found, wrong payment_type, missing columns
--   → Check frontend console for exact error message
--
-- ═══════════════════════════════════════════════════════════════════════════
