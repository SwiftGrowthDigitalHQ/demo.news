-- ═══════════════════════════════════════════════════════════════════════════
-- PAYMENT SYSTEM READ-ONLY INVESTIGATION
-- DO NOT MODIFY ANY DATA — INVESTIGATION ONLY
-- ═══════════════════════════════════════════════════════════════════════════
--
-- PURPOSE:
-- Understand WHY "Fake News" tenant has subscription_status = 'PAYMENT_PENDING'
-- without a corresponding tenant_payments record.
--
-- IMPORTANT: This script makes NO changes to the database.
-- ═══════════════════════════════════════════════════════════════════════════

\echo '═══════════════════════════════════════════════════════════════════════════'
\echo 'INVESTIGATION 1: Fake News Tenant Complete Details'
\echo '═══════════════════════════════════════════════════════════════════════════'

SELECT 
  id,
  slug,
  name,
  status,
  subscription_status,
  subscription_plan,
  subscription_started_at,
  subscription_ends_at,
  trial_started_at,
  trial_ends_at,
  current_period_start,
  current_period_end,
  owner_id,
  owner_auth_user_id,
  contact_email,
  contact_phone,
  language,
  requested_plan,
  plan_change_status,
  plan_change_submitted_at,
  created_at,
  updated_at,
  deleted_at
FROM public.tenants
WHERE slug = 'fake-news';

\echo ''
\echo '═══════════════════════════════════════════════════════════════════════════'
\echo 'INVESTIGATION 2: All Payment Records for Fake News (tenant_payments table)'
\echo '═══════════════════════════════════════════════════════════════════════════'

-- Get tenant ID first
WITH fake_news_tenant AS (
  SELECT id FROM public.tenants WHERE slug = 'fake-news'
)
SELECT 
  tp.id,
  tp.tenant_id,
  tp.plan,
  tp.amount,
  tp.currency,
  tp.method,
  tp.upi_id_used,
  tp.utr,
  tp.payment_date,
  tp.screenshot_url,
  tp.notes,
  tp.status,
  tp.rejection_reason,
  tp.reviewed_by,
  tp.reviewed_at,
  tp.period_start,
  tp.period_end,
  tp.payment_type,
  tp.submitted_at,
  tp.created_at,
  tp.updated_at
FROM public.tenant_payments tp
INNER JOIN fake_news_tenant fnt ON tp.tenant_id = fnt.id
ORDER BY tp.submitted_at DESC;

\echo ''
\echo '═══════════════════════════════════════════════════════════════════════════'
\echo 'INVESTIGATION 3: Check for Legacy Payment Tables'
\echo '═══════════════════════════════════════════════════════════════════════════'

-- Check what payment-related tables exist in the database
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (
    table_name LIKE '%payment%' 
    OR table_name LIKE '%subscription%'
    OR table_name LIKE '%order%'
    OR table_name LIKE '%invoice%'
  )
ORDER BY table_name;

\echo ''
\echo '═══════════════════════════════════════════════════════════════════════════'
\echo 'INVESTIGATION 4: Check Legacy Payments Table (if exists)'
\echo '═══════════════════════════════════════════════════════════════════════════'

-- Check if old "payments" table exists and has records
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'payments'
  ) THEN
    RAISE NOTICE 'Legacy payments table exists. Checking for records...';
  ELSE
    RAISE NOTICE 'No legacy payments table found.';
  END IF;
END $$;

-- If it exists, query it
SELECT 
  p.id,
  p.subscription_id,
  p.amount,
  p.currency,
  p.status,
  p.payment_method,
  p.transaction_id,
  p.created_at,
  s.email as subscription_email
FROM public.payments p
LEFT JOIN public.subscriptions s ON p.subscription_id = s.id
WHERE s.email LIKE '%fake%' OR s.email LIKE '%sonu%'
ORDER BY p.created_at DESC
LIMIT 10;

\echo ''
\echo '═══════════════════════════════════════════════════════════════════════════'
\echo 'INVESTIGATION 5: Check Subscriptions Table (if exists)'
\echo '═══════════════════════════════════════════════════════════════════════════'

-- Check if there's a separate subscriptions table
SELECT 
  id,
  email,
  status,
  plan,
  amount,
  created_at,
  updated_at
FROM public.subscriptions
WHERE email LIKE '%fake%' OR email LIKE '%sonu%'
ORDER BY created_at DESC
LIMIT 10;

\echo ''
\echo '═══════════════════════════════════════════════════════════════════════════'
\echo 'INVESTIGATION 6: All Tenants with PAYMENT_PENDING Status'
\echo '═══════════════════════════════════════════════════════════════════════════'

SELECT 
  t.id,
  t.slug,
  t.name,
  t.subscription_status,
  t.subscription_plan,
  t.created_at,
  COUNT(tp.id) as payment_count,
  MAX(tp.submitted_at) as latest_payment_date,
  MAX(tp.status) as latest_payment_status
FROM public.tenants t
LEFT JOIN public.tenant_payments tp ON t.id = tp.tenant_id
WHERE t.subscription_status = 'PAYMENT_PENDING'
  AND t.deleted_at IS NULL
GROUP BY t.id, t.slug, t.name, t.subscription_status, t.subscription_plan, t.created_at
ORDER BY t.created_at DESC;

\echo ''
\echo '═══════════════════════════════════════════════════════════════════════════'
\echo 'INVESTIGATION 7: Check submit_payment_rpc Function Definition'
\echo '═══════════════════════════════════════════════════════════════════════════'

SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'submit_payment_rpc';

\echo ''
\echo '═══════════════════════════════════════════════════════════════════════════'
\echo 'INVESTIGATION 8: Check for Triggers on tenants Table'
\echo '═══════════════════════════════════════════════════════════════════════════'

SELECT 
  tgname as trigger_name,
  tgtype,
  tgenabled,
  pg_get_triggerdef(oid) as trigger_definition
FROM pg_trigger
WHERE tgrelid = 'public.tenants'::regclass
  AND tgisinternal = false
ORDER BY tgname;

\echo ''
\echo '═══════════════════════════════════════════════════════════════════════════'
\echo 'INVESTIGATION 9: Check for Triggers on tenant_payments Table'
\echo '═══════════════════════════════════════════════════════════════════════════'

SELECT 
  tgname as trigger_name,
  tgtype,
  tgenabled,
  pg_get_triggerdef(oid) as trigger_definition
FROM pg_trigger
WHERE tgrelid = 'public.tenant_payments'::regclass
  AND tgisinternal = false
ORDER BY tgname;

\echo ''
\echo '═══════════════════════════════════════════════════════════════════════════'
\echo 'INVESTIGATION 10: Check Audit Logs for Fake News Tenant'
\echo '═══════════════════════════════════════════════════════════════════════════'

-- Check if audit_logs table exists and has payment-related entries
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'audit_logs'
  ) THEN
    RAISE NOTICE 'Audit logs table exists. Checking for Fake News records...';
  ELSE
    RAISE NOTICE 'No audit_logs table found.';
  END IF;
END $$;

WITH fake_news_tenant AS (
  SELECT id FROM public.tenants WHERE slug = 'fake-news'
)
SELECT 
  al.id,
  al.actor_user_id,
  al.action,
  al.entity_type,
  al.entity_id,
  al.metadata,
  al.created_at
FROM public.audit_logs al
WHERE (
  al.entity_type = 'tenants' 
  AND al.entity_id IN (SELECT id::text FROM fake_news_tenant)
)
OR (
  al.entity_type = 'tenant_payments'
  AND al.metadata::jsonb->>'tenant_id' IN (SELECT id::text FROM fake_news_tenant)
)
OR (
  al.action LIKE '%payment%'
  AND al.metadata::jsonb->>'tenant_id' IN (SELECT id::text FROM fake_news_tenant)
)
ORDER BY al.created_at DESC
LIMIT 50;

\echo ''
\echo '═══════════════════════════════════════════════════════════════════════════'
\echo 'INVESTIGATION 11: Check RLS Policies on tenant_payments'
\echo '═══════════════════════════════════════════════════════════════════════════'

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'tenant_payments'
ORDER BY policyname;

\echo ''
\echo '═══════════════════════════════════════════════════════════════════════════'
\echo 'INVESTIGATION 12: Check Foreign Key Relationships'
\echo '═══════════════════════════════════════════════════════════════════════════'

SELECT
  tc.table_name, 
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  tc.constraint_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'tenant_payments'
  AND tc.table_schema = 'public';

\echo ''
\echo '═══════════════════════════════════════════════════════════════════════════'
\echo 'INVESTIGATION 13: Check for Related Functions That Modify Subscription Status'
\echo '═══════════════════════════════════════════════════════════════════════════'

SELECT 
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  CASE 
    WHEN prosecdef THEN 'SECURITY DEFINER'
    ELSE 'SECURITY INVOKER'
  END as security_mode
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND (
    p.proname LIKE '%payment%'
    OR p.proname LIKE '%subscription%'
    OR p.proname LIKE '%tenant%status%'
  )
ORDER BY p.proname;

\echo ''
\echo '═══════════════════════════════════════════════════════════════════════════'
\echo 'INVESTIGATION 14: Check Migration History'
\echo '═══════════════════════════════════════════════════════════════════════════'

-- Check which migrations have been applied
SELECT 
  version,
  name,
  executed_at
FROM supabase_migrations.schema_migrations
WHERE name LIKE '%payment%' 
   OR name LIKE '%subscription%'
   OR name LIKE '%tenant%'
ORDER BY executed_at DESC
LIMIT 20;

\echo ''
\echo '═══════════════════════════════════════════════════════════════════════════'
\echo 'INVESTIGATION 15: Count All Payments by Status'
\echo '═══════════════════════════════════════════════════════════════════════════'

SELECT 
  status,
  COUNT(*) as count,
  MIN(submitted_at) as oldest_submission,
  MAX(submitted_at) as newest_submission
FROM public.tenant_payments
GROUP BY status
ORDER BY status;

\echo ''
\echo '═══════════════════════════════════════════════════════════════════════════'
\echo 'INVESTIGATION 16: Check Fake News Tenant Owner Details'
\echo '═══════════════════════════════════════════════════════════════════════════'

WITH fake_news_tenant AS (
  SELECT 
    id,
    owner_id,
    owner_auth_user_id,
    slug,
    name
  FROM public.tenants 
  WHERE slug = 'fake-news'
)
SELECT 
  fnt.slug as tenant_slug,
  fnt.name as tenant_name,
  fnt.owner_id,
  fnt.owner_auth_user_id,
  u.id as user_id,
  u.email as user_email,
  u.full_name,
  up.role_slug,
  up.owned_tenant_id,
  up.owned_tenant_slug
FROM fake_news_tenant fnt
LEFT JOIN public.users u ON fnt.owner_auth_user_id = u.auth_user_id
LEFT JOIN public.user_profiles up ON u.id = up.user_id;

\echo ''
\echo '═══════════════════════════════════════════════════════════════════════════'
\echo 'INVESTIGATION 17: Check if tenant_payments Table Was Recently Created'
\echo '═══════════════════════════════════════════════════════════════════════════'

SELECT 
  version,
  name,
  executed_at
FROM supabase_migrations.schema_migrations
WHERE name LIKE '%payment_system_hardening%'
   OR name LIKE '%payment_final_hardening%'
   OR name LIKE '%tenant_payments%'
ORDER BY executed_at DESC;

\echo ''
\echo '═══════════════════════════════════════════════════════════════════════════'
\echo 'INVESTIGATION COMPLETE'
\echo '═══════════════════════════════════════════════════════════════════════════'
\echo ''
\echo 'NEXT STEPS:'
\echo '1. Review all investigation results above'
\echo '2. Determine root cause of PAYMENT_PENDING without payment record'
\echo '3. Check if this is a data migration issue'
\echo '4. Check if this is a manual SQL update'
\echo '5. Check if payment flow is atomic'
\echo '6. Decide on appropriate fix'
\echo '7. Get approval before modifying any data'
\echo ''
\echo '═══════════════════════════════════════════════════════════════════════════'
