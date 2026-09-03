-- ═══════════════════════════════════════════════════════════════════════════
-- FIX REJECTED PAYMENT LIFECYCLE
-- Date: 2026-09-03
-- Issue: reject_payment() not updating plan_change_status, leaving "under review"
--
-- Root Cause:
-- - reject_payment() in 20260812000003 only updates subscription_status
-- - Does NOT update plan_change_status (remains 'pending')
-- - UI checks plan_change_status === 'pending' and shows "under review"
-- - Result: Rejected payment still shows as pending
--
-- Fix:
-- 1. Update reject_payment() to set plan_change_status = 'rejected'
-- 2. Update approve_subscription_payment() to clear plan_change_status
-- 3. Clear existing stale rejected payments
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. FIX reject_payment() - Set plan_change_status to 'rejected' ─────────────
CREATE OR REPLACE FUNCTION public.reject_payment(
  p_payment_id uuid,
  p_rejection_reason text,
  p_reviewed_by_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment record;
  v_tenant record;
BEGIN
  -- Verify super admin
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'only super_admin can reject payments';
  END IF;
  
  -- Get payment
  SELECT * INTO v_payment
  FROM public.tenant_payments
  WHERE id = p_payment_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment not found';
  END IF;
  
  IF v_payment.status != 'SUBMITTED' THEN
    RAISE EXCEPTION 'payment already processed';
  END IF;
  
  -- Get tenant
  SELECT * INTO v_tenant
  FROM public.tenants
  WHERE id = v_payment.tenant_id;
  
  -- Update payment
  UPDATE public.tenant_payments
  SET
    status = 'REJECTED',
    rejection_reason = p_rejection_reason,
    reviewed_by = p_reviewed_by_user_id,
    reviewed_at = now()
  WHERE id = p_payment_id;
  
  -- Update tenant status if it was PAYMENT_PENDING
  UPDATE public.tenants
  SET 
    subscription_status = 'PAYMENT_DUE',
    -- NEW: Set plan_change_status to 'rejected' (was: left as 'pending')
    plan_change_status = 'rejected',
    -- Keep requested_plan so UI can show what was rejected
    -- Clear the submitted timestamp as this request is now rejected
    updated_at = now()
  WHERE id = v_payment.tenant_id
    AND subscription_status = 'PAYMENT_PENDING';
  
  -- Log audit
  PERFORM public.log_super_admin_action(
    'payment_rejected',
    'tenant_payment',
    p_payment_id,
    jsonb_build_object(
      'tenant_id', v_payment.tenant_id,
      'tenant_slug', v_tenant.slug,
      'amount', v_payment.amount,
      'plan', v_payment.plan,
      'reason', p_rejection_reason
    )
  );
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- ─── 2. FIX approve_subscription_payment() - Clear plan_change_status ──────────
CREATE OR REPLACE FUNCTION public.approve_subscription_payment(
  p_payment_id uuid,
  p_reviewed_by_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment record;
  v_tenant record;
  v_period_start timestamptz;
  v_period_end timestamptz;
  v_result jsonb;
BEGIN
  -- Verify super admin
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'only super_admin can approve payments';
  END IF;
  
  -- Get payment details
  SELECT * INTO v_payment
  FROM public.tenant_payments
  WHERE id = p_payment_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment not found';
  END IF;
  
  IF v_payment.status != 'SUBMITTED' THEN
    RAISE EXCEPTION 'payment already processed';
  END IF;
  
  -- Get tenant
  SELECT * INTO v_tenant
  FROM public.tenants
  WHERE id = v_payment.tenant_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'tenant not found';
  END IF;
  
  -- Calculate period based on payment type
  IF v_payment.payment_type = 'subscription' THEN
    v_period_start := now();
    
    -- Set period end based on plan
    IF v_payment.plan = 'monthly' THEN
      v_period_end := v_period_start + interval '1 month';
    ELSIF v_payment.plan = 'yearly' THEN
      v_period_end := v_period_start + interval '1 year';
    ELSE
      RAISE EXCEPTION 'invalid subscription plan';
    END IF;
    
    -- Update payment record
    UPDATE public.tenant_payments
    SET 
      status = 'APPROVED',
      reviewed_by = p_reviewed_by_user_id,
      reviewed_at = now(),
      period_start = v_period_start,
      period_end = v_period_end
    WHERE id = p_payment_id;
    
    -- Update tenant subscription
    UPDATE public.tenants
    SET
      subscription_status = 'ACTIVE',
      subscription_plan = v_payment.plan,
      subscription_started_at = coalesce(subscription_started_at, v_period_start),
      subscription_ends_at = v_period_end,
      current_period_start = v_period_start,
      current_period_end = v_period_end,
      -- NEW: Clear plan change tracking (payment approved)
      plan_change_status = 'none',
      requested_plan = NULL,
      plan_change_submitted_at = NULL,
      updated_at = now()
    WHERE id = v_payment.tenant_id;
    
    -- Log audit
    PERFORM public.log_super_admin_action(
      'payment_approved',
      'tenant_payment',
      p_payment_id,
      jsonb_build_object(
        'tenant_id', v_payment.tenant_id,
        'tenant_slug', v_tenant.slug,
        'amount', v_payment.amount,
        'plan', v_payment.plan,
        'period_start', v_period_start,
        'period_end', v_period_end
      )
    );
    
    v_result := jsonb_build_object(
      'success', true,
      'payment_type', 'subscription',
      'period_start', v_period_start,
      'period_end', v_period_end
    );
    
  ELSIF v_payment.payment_type = 'android_app' THEN
    -- Android app is one-time payment
    UPDATE public.tenant_payments
    SET 
      status = 'APPROVED',
      reviewed_by = p_reviewed_by_user_id,
      reviewed_at = now()
    WHERE id = p_payment_id;
    
    -- Activate Android app
    UPDATE public.tenants
    SET
      android_app_enabled = true,
      android_app_status = 'ACTIVE',
      android_app_activated_at = now(),
      android_payment_id = p_payment_id
    WHERE id = v_payment.tenant_id;
    
    -- Log audit
    PERFORM public.log_super_admin_action(
      'android_payment_approved',
      'tenant_payment',
      p_payment_id,
      jsonb_build_object(
        'tenant_id', v_payment.tenant_id,
        'tenant_slug', v_tenant.slug,
        'amount', v_payment.amount
      )
    );
    
    v_result := jsonb_build_object(
      'success', true,
      'payment_type', 'android_app'
    );
  ELSE
    RAISE EXCEPTION 'invalid payment type';
  END IF;
  
  RETURN v_result;
END;
$$;

-- ─── 3. Clear existing stale rejected payment plan-change states ──────────────
-- For tenants with plan_change_status = 'pending' but a REJECTED payment exists
UPDATE public.tenants t
SET 
  plan_change_status = 'rejected',
  updated_at = now()
WHERE t.deleted_at IS NULL
  AND t.plan_change_status = 'pending'
  AND t.subscription_status = 'PAYMENT_DUE'
  AND EXISTS (
    SELECT 1 
    FROM public.tenant_payments p
    WHERE p.tenant_id = t.id
      AND p.status = 'REJECTED'
      AND p.plan = t.requested_plan
      AND p.created_at > t.plan_change_submitted_at - interval '1 day'
      AND p.created_at < t.plan_change_submitted_at + interval '1 day'
  );

-- Count how many were fixed
SELECT 
  COUNT(*) as fixed_count,
  'Tenants with stale rejected payment states cleared' as description
FROM public.tenants t
WHERE t.deleted_at IS NULL
  AND t.plan_change_status = 'rejected';

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICATION: Check the fix
-- ═══════════════════════════════════════════════════════════════════════════

-- Should show no pending plan_change_status with rejected payments
SELECT 
  t.slug,
  t.subscription_status,
  t.plan_change_status,
  t.requested_plan,
  p.status as payment_status,
  p.rejection_reason,
  'ISSUE IF FOUND' as warning
FROM public.tenants t
LEFT JOIN public.tenant_payments p ON p.tenant_id = t.id AND p.status = 'REJECTED'
WHERE t.deleted_at IS NULL
  AND t.plan_change_status = 'pending'  -- Should be none after fix
  AND p.id IS NOT NULL
LIMIT 5;
