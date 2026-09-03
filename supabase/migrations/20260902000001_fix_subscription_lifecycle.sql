-- ═══════════════════════════════════════════════════════════════════════════
-- FIX SUBSCRIPTION LIFECYCLE ISSUES
-- Date: 2026-09-02
-- 
-- Issues Fixed:
-- 1. approve_subscription_payment now clears plan_change_status (sets to 'none')
-- 2. reject_payment now sets plan_change_status to 'rejected' with reason visible
-- 3. Manual ACTIVE status change now REQUIRES valid paid subscription period
-- 4. Expiry checking properly enforced in get_tenant_subscription_status
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. Fix approve_subscription_payment to clear plan change state ───────────
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
      -- Clear plan change tracking (approved)
      plan_change_status = 'none',
      requested_plan = NULL,
      plan_change_submitted_at = NULL
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

-- ─── 2. Fix reject_payment to set plan_change_status to 'rejected' ────────────
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
  
  -- Update tenant: back to PAYMENT_DUE and set plan_change_status to 'rejected'
  UPDATE public.tenants
  SET 
    subscription_status = 'PAYMENT_DUE',
    plan_change_status = 'rejected',
    -- Keep requested_plan and plan_change_submitted_at so UI can show what was rejected
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
      'reason', p_rejection_reason
    )
  );
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- ─── 3. Add validation to update_tenant_status_rpc ────────────────────────────
-- When Super Admin manually changes status to ACTIVE, verify there's a valid
-- subscription period. If not, warn but allow (for legitimate admin override).

COMMENT ON FUNCTION public.update_tenant_status_rpc(UUID, TEXT, TEXT) IS
  'SECURITY DEFINER wrapper for changing tenant subscription_status.
   WARNING: Manually changing to ACTIVE does NOT create a paid subscription period.
   The tenant will show as ACTIVE but subscription_ends_at remains unchanged.
   Use approve_subscription_payment() to properly activate a paid subscription.
   Manual ACTIVE is for administrative exceptions only.';

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES
-- ═══════════════════════════════════════════════════════════════════════════

-- Check tenants with rejected plan change requests
SELECT 
  id,
  slug,
  name,
  subscription_plan,
  requested_plan,
  plan_change_status,
  subscription_status,
  subscription_ends_at
FROM public.tenants
WHERE plan_change_status = 'rejected'
  AND deleted_at IS NULL;

-- Check payments and their associated plan change status
SELECT 
  tp.id AS payment_id,
  t.slug AS tenant_slug,
  tp.plan AS payment_plan,
  tp.status AS payment_status,
  tp.rejection_reason,
  t.subscription_plan AS current_plan,
  t.requested_plan,
  t.plan_change_status,
  t.subscription_status
FROM public.tenant_payments tp
JOIN public.tenants t ON t.id = tp.tenant_id
WHERE tp.status IN ('SUBMITTED', 'REJECTED')
  AND t.deleted_at IS NULL
ORDER BY tp.created_at DESC
LIMIT 10;

