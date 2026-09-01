-- ═══════════════════════════════════════════════════════════════════════════
-- PAYMENT SYSTEM FIX
-- Reset orphaned PAYMENT_PENDING tenants that have no corresponding payment record
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ROOT CAUSE:
-- Some tenants have subscription_status = 'PAYMENT_PENDING' but no corresponding
-- row in tenant_payments with status = 'SUBMITTED'.
--
-- This happens when:
-- 1. Manual SQL UPDATE set the status without creating payment record
-- 2. Tenant was created before tenant_payments table existed
-- 3. Data migration didn't follow proper payment flow
-- 4. Testing/seeding used incorrect data
--
-- PROPER FLOW:
-- - Customer submits payment via SubscriptionDashboard
-- - submitPayment() calls submit_payment_rpc() (SECURITY DEFINER)
-- - RPC atomically:
--   a) Inserts row into tenant_payments with status='SUBMITTED'
--   b) Updates tenants.subscription_status = 'PAYMENT_PENDING'
-- - Both operations succeed or both roll back (atomic transaction)
--
-- ORPHANED STATE:
-- - tenant.subscription_status = 'PAYMENT_PENDING' (✓ exists)
-- - tenant_payments row with status='SUBMITTED' (✗ MISSING)
-- → Super Admin Payments page shows "No payments found"
--
-- FIX:
-- Reset orphaned tenants from PAYMENT_PENDING → PAYMENT_DUE
-- Customer must then submit payment through proper UI flow
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── Step 1: Identify orphaned PAYMENT_PENDING tenants ────────────────────────
-- These tenants claim they submitted payment but have no payment record

WITH orphaned_tenants AS (
  SELECT 
    t.id,
    t.slug,
    t.name,
    t.subscription_status,
    t.subscription_plan,
    t.trial_ends_at,
    t.subscription_ends_at,
    t.created_at,
    COUNT(tp.id) as payment_count
  FROM public.tenants t
  LEFT JOIN public.tenant_payments tp 
    ON t.id = tp.tenant_id 
    AND tp.status = 'SUBMITTED'
  WHERE t.subscription_status = 'PAYMENT_PENDING'
    AND t.deleted_at IS NULL
  GROUP BY t.id, t.slug, t.name, t.subscription_status, t.subscription_plan, 
           t.trial_ends_at, t.subscription_ends_at, t.created_at
  HAVING COUNT(tp.id) = 0  -- No SUBMITTED payment records
)
SELECT 
  id,
  slug,
  name,
  subscription_status,
  subscription_plan,
  payment_count,
  'ORPHANED: PAYMENT_PENDING status but no payment record' as issue
FROM orphaned_tenants;

-- ── Step 2: Reset orphaned tenants to PAYMENT_DUE ─────────────────────────────
-- This allows customers to submit payment through the proper flow

UPDATE public.tenants
SET 
  subscription_status = 'PAYMENT_DUE',
  updated_at = now()
WHERE id IN (
  SELECT t.id
  FROM public.tenants t
  LEFT JOIN public.tenant_payments tp 
    ON t.id = tp.tenant_id 
    AND tp.status = 'SUBMITTED'
  WHERE t.subscription_status = 'PAYMENT_PENDING'
    AND t.deleted_at IS NULL
  GROUP BY t.id
  HAVING COUNT(tp.id) = 0
)
RETURNING 
  id,
  slug,
  name,
  subscription_status as new_status,
  'Reset from PAYMENT_PENDING to PAYMENT_DUE' as action;

-- ── Step 3: Verify fix ────────────────────────────────────────────────────────
-- Check that no orphaned PAYMENT_PENDING tenants remain

SELECT 
  COUNT(*) as remaining_orphaned_tenants,
  'Should be 0 after fix' as expected
FROM public.tenants t
LEFT JOIN public.tenant_payments tp 
  ON t.id = tp.tenant_id 
  AND tp.status = 'SUBMITTED'
WHERE t.subscription_status = 'PAYMENT_PENDING'
  AND t.deleted_at IS NULL
GROUP BY t.id
HAVING COUNT(tp.id) = 0;

-- ── Step 4: Show all tenants that now need payment ────────────────────────────
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
WHERE subscription_status = 'PAYMENT_DUE'
  AND deleted_at IS NULL
ORDER BY created_at DESC;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- POST-FIX INSTRUCTIONS
-- ═══════════════════════════════════════════════════════════════════════════
--
-- 1. Run this script against your Supabase database
-- 2. Verify Step 3 returns 0 orphaned tenants
-- 3. Notify affected customers (shown in Step 4) to submit payment via:
--    → Login to their account
--    → Navigate to /admin/subscription
--    → Click "Submit Payment for Verification"
--    → Fill in UPI transaction details
--    → Submit
-- 4. Verify payment appears in Super Admin Payments page (/super-admin/payments)
-- 5. Approve or reject payment as super admin
--
-- IMPORTANT:
-- - Do NOT manually INSERT payment records
-- - Do NOT manually set subscription_status = 'PAYMENT_PENDING'
-- - Always use the submit_payment_rpc() function through the UI
-- - This ensures data consistency and audit logging
--
-- ═══════════════════════════════════════════════════════════════════════════
