-- ═══════════════════════════════════════════════════════════════════════════
-- SUPER ADMIN AUTHORIZATION DIAGNOSTIC
-- Run this in Supabase SQL Editor to diagnose authorization issues
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Check if is_super_admin() function exists ────────────────────────────
SELECT 
  'is_super_admin() function' as check_name,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status,
  COUNT(*) as count
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'is_super_admin';

-- ─── 2. Check if get_auth_level() function exists ────────────────────────────
SELECT 
  'get_auth_level() function' as check_name,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status,
  COUNT(*) as count
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'get_auth_level';

-- ─── 3. Check if log_super_admin_action() function exists ────────────────────
SELECT 
  'log_super_admin_action() function' as check_name,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status,
  COUNT(*) as count
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'log_super_admin_action';

-- ─── 4. Check roles table and super_admin role ───────────────────────────────
SELECT 
  'super_admin role' as check_name,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status,
  COUNT(*) as count
FROM public.roles
WHERE slug = 'super_admin';

-- ─── 5. Check current user's auth info ───────────────────────────────────────
SELECT 
  'Current auth.uid()' as check_name,
  auth.uid() as value;

-- ─── 6. Check if current user exists in users table ──────────────────────────
SELECT 
  'Current user in users table' as check_name,
  u.id as user_id,
  u.full_name,
  u.email,
  r.slug as role_slug,
  r.id as role_id,
  u.deleted_at
FROM public.users u
LEFT JOIN public.roles r ON r.id = u.role_id
WHERE u.auth_user_id = auth.uid();

-- ─── 7. Test is_super_admin() function ───────────────────────────────────────
SELECT 
  'is_super_admin() result' as check_name,
  public.is_super_admin() as result,
  CASE 
    WHEN public.is_super_admin() = true THEN '✅ TRUE'
    WHEN public.is_super_admin() = false THEN '❌ FALSE'
    ELSE '⚠️ NULL/ERROR'
  END as status;

-- ─── 8. Test get_auth_level() function ───────────────────────────────────────
SELECT 
  'get_auth_level() result' as check_name,
  public.get_auth_level() as result;

-- ─── 9. Check RPC functions used by actions ──────────────────────────────────
SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  CASE 
    WHEN p.prosecdef THEN '✅ SECURITY DEFINER'
    ELSE '⚠️ Not SECURITY DEFINER'
  END as security
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'reject_payment',
    'approve_subscription_payment',
    'update_tenant_status_rpc',
    'extend_tenant_trial_rpc'
  )
ORDER BY p.proname;

-- ─── 10. List all users with super_admin role ────────────────────────────────
SELECT 
  u.id,
  u.auth_user_id,
  u.email,
  u.full_name,
  r.slug as role,
  u.created_at,
  u.deleted_at,
  CASE 
    WHEN u.deleted_at IS NULL THEN '✅ ACTIVE'
    ELSE '❌ DELETED'
  END as status
FROM public.users u
JOIN public.roles r ON r.id = u.role_id
WHERE r.slug = 'super_admin'
ORDER BY u.created_at DESC;
