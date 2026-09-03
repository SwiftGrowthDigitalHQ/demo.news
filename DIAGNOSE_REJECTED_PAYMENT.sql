-- ═══════════════════════════════════════════════════════════════════════════
-- DIAGNOSE REJECTED PAYMENT - ACTUAL PRODUCTION STATE
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Find tenant with rejected Yearly payment
WITH tenant_data AS (
  SELECT 
    t.id,
    t.slug,
    t.name,
    t.subscription_status,
    t.subscription_plan,
    t.requested_plan,
    t.plan_change_status,
    t.plan_change_submitted_at,
    t.subscription_starts_at,
    t.subscription_ends_at,
    t.current_period_start,
    t.current_period_end,
    t.owner_auth_user_id,
    t.created_at,
    t.updated_at
  FROM public.tenants t
  WHERE t.deleted_at IS NULL
    AND t.name ILIKE '%fake%news%' -- The affected tenant
  LIMIT 1
),
payment_data AS (
  SELECT 
    p.id,
    p.tenant_id,
    p.plan,
    p.amount,
    p.status,
    p.rejection_reason,
    p.payment_type,
    p.period_start,
    p.period_end,
    p.created_at,
    p.reviewed_at,
    p.updated_at
  FROM public.tenant_payments p
  WHERE p.status = 'REJECTED'
    AND p.tenant_id IN (SELECT id FROM tenant_data)
  ORDER BY p.created_at DESC
  LIMIT 1
)
SELECT 
  '=== TENANT STATE ===' as section,
  (SELECT to_jsonb(tenant_data) FROM tenant_data) as tenant_state,
  '=== REJECTED PAYMENT ===' as section2,
  (SELECT to_jsonb(payment_data) FROM payment_data) as payment_state;

-- ═══════════════════════════════════════════════════════════════════════════

-- 2. Check all payments for this tenant (last 5)
SELECT 
  tp.id,
  tp.plan,
  tp.amount,
  tp.status,
  tp.rejection_reason,
  tp.period_start,
  tp.period_end,
  tp.created_at,
  tp.reviewed_at,
  'Payment ' || row_number() OVER (ORDER BY tp.created_at DESC) as payment_num
FROM public.tenant_payments tp
JOIN public.tenants t ON t.id = tp.tenant_id
WHERE t.deleted_at IS NULL
  AND t.name ILIKE '%fake%news%'
ORDER BY tp.created_at DESC
LIMIT 5;

-- ═══════════════════════════════════════════════════════════════════════════

-- 3. Verify if reject_payment() function exists and its current implementation
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
WHERE p.proname = 'reject_payment'
  AND p.pronamespace = 'public'::regnamespace;

-- ═══════════════════════════════════════════════════════════════════════════

-- 4. Verify if approve_subscription_payment() clears plan_change_status
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
WHERE p.proname = 'approve_subscription_payment'
  AND p.pronamespace = 'public'::regnamespace;

-- ═══════════════════════════════════════════════════════════════════════════

-- 5. Check subscription_status and plan_change_status correlation
SELECT 
  t.slug,
  t.subscription_status,
  t.subscription_plan,
  t.requested_plan,
  t.plan_change_status,
  COUNT(tp.id) as rejected_payment_count,
  MAX(tp.rejection_reason) as latest_rejection_reason
FROM public.tenants t
LEFT JOIN public.tenant_payments tp ON tp.tenant_id = t.id AND tp.status = 'REJECTED'
WHERE t.deleted_at IS NULL
  AND t.plan_change_status = 'pending'  -- Stale pending states
GROUP BY t.id, t.slug, t.subscription_status, t.subscription_plan, t.requested_plan, t.plan_change_status
ORDER BY t.created_at DESC
LIMIT 10;
