-- ═══════════════════════════════════════════════════════════════════════════
-- PAYMENT SYSTEM DIAGNOSTIC
-- Check if "Fake News" tenant has PAYMENT_PENDING status and corresponding
-- payment record in tenant_payments table
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Check "Fake News" tenant basic info ──────────────────────────────────
SELECT 
  id,
  slug,
  name,
  subscription_status,
  subscription_plan,
  trial_ends_at,
  subscription_ends_at,
  created_at
FROM public.tenants
WHERE slug = 'fake-news'
  AND deleted_at IS NULL;

-- ── 2. Check if tenant_payments table exists ────────────────────────────────
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'tenant_payments';

-- ── 3. Check all payment records for "Fake News" tenant ─────────────────────
SELECT 
  tp.id,
  tp.tenant_id,
  tp.plan,
  tp.amount,
  tp.status,
  tp.utr,
  tp.payment_date,
  tp.submitted_at,
  tp.created_at,
  t.name as tenant_name,
  t.slug as tenant_slug,
  t.subscription_status as tenant_subscription_status
FROM public.tenant_payments tp
LEFT JOIN public.tenants t ON tp.tenant_id = t.id
WHERE t.slug = 'fake-news'
ORDER BY tp.submitted_at DESC;

-- ── 4. Check ALL payment records in tenant_payments (if any exist) ──────────
SELECT 
  COUNT(*) as total_payments,
  COUNT(*) FILTER (WHERE status = 'SUBMITTED') as submitted_count,
  COUNT(*) FILTER (WHERE status = 'APPROVED') as approved_count,
  COUNT(*) FILTER (WHERE status = 'REJECTED') as rejected_count
FROM public.tenant_payments;

-- ── 5. Check if there are any payments at all ───────────────────────────────
SELECT 
  tp.id,
  tp.tenant_id,
  t.name as tenant_name,
  t.slug as tenant_slug,
  tp.plan,
  tp.amount,
  tp.status,
  tp.submitted_at
FROM public.tenant_payments tp
LEFT JOIN public.tenants t ON tp.tenant_id = t.id
ORDER BY tp.submitted_at DESC
LIMIT 10;

-- ── 6. Check RLS policies on tenant_payments ────────────────────────────────
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
WHERE tablename = 'tenant_payments';

-- ── 7. Check current user role and permissions ──────────────────────────────
SELECT 
  auth.uid() as current_auth_uid,
  current_user as current_db_user,
  session_user as session_user;

-- ── 8. Test is_super_admin() function ────────────────────────────────────────
SELECT public.is_super_admin() as is_current_user_super_admin;

-- ── 9. Check all tenants with PAYMENT_PENDING status ────────────────────────
SELECT 
  t.id,
  t.slug,
  t.name,
  t.subscription_status,
  t.subscription_plan,
  COUNT(tp.id) as payment_count,
  MAX(tp.submitted_at) as latest_payment_submitted
FROM public.tenants t
LEFT JOIN public.tenant_payments tp ON t.id = tp.tenant_id
WHERE t.subscription_status = 'PAYMENT_PENDING'
  AND t.deleted_at IS NULL
GROUP BY t.id, t.slug, t.name, t.subscription_status, t.subscription_plan
ORDER BY t.created_at DESC;

-- ═══════════════════════════════════════════════════════════════════════════
-- EXPECTED RESULTS
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Query 1: Should return "Fake News" tenant with subscription_status = 'PAYMENT_PENDING'
-- Query 2: Should return tenant_payments table (exists)
-- Query 3: Should return payment record(s) for "Fake News" IF payment was actually submitted
-- Query 4: Should show counts of all payments by status
-- Query 5: Should show all recent payments across all tenants
-- Query 6: Should show RLS policies including "super_admin_all_payments"
-- Query 7: Should return current user session info
-- Query 8: Should return TRUE if logged in as super admin
-- Query 9: Should show ALL tenants with PAYMENT_PENDING and their payment counts
--
-- ROOT CAUSE POSSIBILITIES:
--
-- A. Payment record DOES NOT exist for "Fake News"
--    → subscription_status was set to PAYMENT_PENDING but no payment row inserted
--    → FIX: Payment creation flow is broken, needs repair
--
-- B. Payment record EXISTS but RLS blocks it
--    → super_admin_all_payments policy missing or misconfigured
--    → is_super_admin() returns false for current user
--    → FIX: RLS policy or user role assignment
--
-- C. Payment record EXISTS but JOIN fails
--    → Foreign key mismatch between tenant_payments.tenant_id and tenants.id
--    → FIX: Data integrity issue
--
-- D. Status enum mismatch
--    → Payment status is not 'SUBMITTED' but something else
--    → FIX: Update query filter or fix data
--
-- ═══════════════════════════════════════════════════════════════════════════
