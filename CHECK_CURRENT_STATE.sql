-- Check current state before applying fix

-- 1. Check tenants with pending plan change
SELECT 
  id,
  slug,
  name,
  subscription_status,
  subscription_plan,
  requested_plan,
  plan_change_status,
  plan_change_submitted_at,
  subscription_ends_at
FROM public.tenants
WHERE plan_change_status != 'none'
  AND deleted_at IS NULL
ORDER BY plan_change_submitted_at DESC;

-- 2. Check rejected payments and tenant state
SELECT 
  tp.id AS payment_id,
  tp.created_at AS payment_created,
  tp.status AS payment_status,
  tp.rejection_reason,
  tp.plan AS payment_plan,
  tp.amount,
  t.slug AS tenant_slug,
  t.subscription_status,
  t.subscription_plan AS current_plan,
  t.requested_plan,
  t.plan_change_status,
  t.subscription_ends_at
FROM public.tenant_payments tp
JOIN public.tenants t ON t.id = tp.tenant_id
WHERE tp.status = 'REJECTED'
  AND t.deleted_at IS NULL
ORDER BY tp.created_at DESC
LIMIT 5;

-- 3. Check tenants manually set to ACTIVE without valid subscription_ends_at
SELECT 
  id,
  slug,
  name,
  subscription_status,
  subscription_plan,
  subscription_ends_at,
  current_period_end,
  CASE 
    WHEN subscription_ends_at IS NULL THEN 'NO EXPIRY SET'
    WHEN subscription_ends_at < now() THEN 'EXPIRED'
    ELSE 'VALID'
  END AS expiry_status
FROM public.tenants
WHERE subscription_status = 'ACTIVE'
  AND deleted_at IS NULL
ORDER BY subscription_ends_at NULLS FIRST
LIMIT 10;
