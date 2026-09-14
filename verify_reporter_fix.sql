-- Verification script for reporter tenant isolation fix
-- Run this in Supabase SQL editor to verify the fix is properly deployed

-- 1. CHECK IF RPC FUNCTION EXISTS
SELECT 
  routine_name,
  routine_type,
  security_type,
  sql_security
FROM information_schema.routines
WHERE routine_name = 'get_tenant_reporters'
  AND routine_schema = 'public'
  AND routine_type = 'FUNCTION';

-- 2. CHECK FUNCTION DEFINITION AND SECURITY
SELECT 
  prosrc as function_body
FROM pg_proc
WHERE proname = 'get_tenant_reporters'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 3. CHECK FUNCTION PERMISSIONS (should be SECURITY DEFINER)
SELECT 
  p.proname,
  p.prosecdef as is_security_definer
FROM pg_proc p
WHERE p.proname = 'get_tenant_reporters'
  AND p.pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 4. CHECK RLS POLICIES ON REPORTERS TABLE
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  qual as policy_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'reporters'
ORDER BY policyname;

-- 5. VERIFY public_read_reporters POLICY IS DROPPED
SELECT 
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'reporters'
  AND policyname = 'public_read_reporters';
-- Expected: 0 (policy should be dropped)

-- 6. TEST RPC FUNCTION WITH SAMPLE DATA
-- Test get_tenant_reporters for 'fake-news' tenant
SELECT 
  id,
  full_name,
  slug,
  tenant_id,
  status,
  deleted_at
FROM public.get_tenant_reporters('fake-news')
LIMIT 10;

-- Test get_tenant_reporters for 'fake-news2' tenant
SELECT 
  id,
  full_name,
  slug,
  tenant_id,
  status,
  deleted_at
FROM public.get_tenant_reporters('fake-news2')
LIMIT 10;

-- 7. VERIFY TENANT IDs ARE DIFFERENT
SELECT 
  t1.id as fake_news_id,
  t2.id as fake_news2_id,
  CASE WHEN t1.id != t2.id THEN 'PASS: Different tenant IDs' ELSE 'FAIL: Same tenant IDs' END as result
FROM (SELECT id FROM public.tenants WHERE slug = 'fake-news' AND deleted_at IS NULL LIMIT 1) t1,
     (SELECT id FROM public.tenants WHERE slug = 'fake-news2' AND deleted_at IS NULL LIMIT 1) t2;

-- 8. VERIFY NO DIRECT SELECT IS POSSIBLE FOR ANONYMOUS ON REPORTERS
-- This would fail or return no rows if RLS is properly configured
-- SELECT COUNT(*) FROM public.reporters; -- Should be blocked for anon user

-- 9. CHECK FUNCTION GRANTS
SELECT 
  grantee,
  privilege_type
FROM information_schema.role_usage_grants
WHERE object_schema = 'public'
  AND object_name = 'get_tenant_reporters'
ORDER BY grantee;
