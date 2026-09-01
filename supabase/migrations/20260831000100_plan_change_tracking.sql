-- ═══════════════════════════════════════════════════════════════════════════
-- PLAN CHANGE TRACKING
--
-- Adds three columns to the tenants table so the subscription dashboard can
-- show "Switch to Yearly / Switch to Monthly" state without ambiguity.
--
-- Design decision: plan switching uses the EXISTING payment flow.
-- A customer who wants to switch from monthly → yearly simply submits a new
-- payment for the 'yearly' plan via submit_payment_rpc() (the same RPC used
-- for normal subscriptions). When the super-admin approves it via
-- approve_subscription_payment(), that function already sets:
--   tenants.subscription_plan = v_payment.plan   (the new plan)
--   tenants.subscription_status = 'ACTIVE'
-- So no new approve/reject RPCs are required for plan switching.
--
-- The three new columns are used only for display/UX:
--   requested_plan           — which plan the customer intends to switch to
--   plan_change_status       — none | pending | approved | rejected
--   plan_change_submitted_at — when the switch request was made
--
-- The approve_subscription_payment() RPC resets these automatically via
-- the trigger / cleanup below.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. Add columns (idempotent) ───────────────────────────────────────────────
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS requested_plan          TEXT
    CHECK (requested_plan IN ('monthly', 'yearly')),
  ADD COLUMN IF NOT EXISTS plan_change_status      TEXT NOT NULL DEFAULT 'none'
    CHECK (plan_change_status IN ('none', 'pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS plan_change_submitted_at TIMESTAMPTZ;

COMMENT ON COLUMN public.tenants.requested_plan IS
  'Plan the tenant wants to switch to (monthly/yearly). NULL when no switch pending.';
COMMENT ON COLUMN public.tenants.plan_change_status IS
  'none=no pending switch, pending=payment submitted awaiting review,
   approved=admin approved, rejected=admin rejected.';
COMMENT ON COLUMN public.tenants.plan_change_submitted_at IS
  'When the plan-switch payment was submitted. NULL when no switch pending.';

-- ── 2. Index for admin queries ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tenants_plan_change_status
  ON public.tenants(plan_change_status)
  WHERE plan_change_status <> 'none' AND deleted_at IS NULL;

-- ── 3. Extend get_my_tenant_with_status() to return the new columns ──────────
-- Drop and recreate so the RETURNS TABLE definition includes the new fields.
DROP FUNCTION IF EXISTS public.get_my_tenant_with_status();

CREATE OR REPLACE FUNCTION public.get_my_tenant_with_status()
RETURNS TABLE (
  id                       UUID,
  slug                     TEXT,
  name                     TEXT,
  language                 TEXT,
  contact_email            TEXT,
  contact_phone            TEXT,
  subscription_status      TEXT,
  subscription_plan        TEXT,
  trial_started_at         TIMESTAMPTZ,
  trial_ends_at            TIMESTAMPTZ,
  current_period_start     TIMESTAMPTZ,
  current_period_end       TIMESTAMPTZ,
  subscription_started_at  TIMESTAMPTZ,
  subscription_ends_at     TIMESTAMPTZ,
  owner_auth_user_id       UUID,
  created_at               TIMESTAMPTZ,
  -- new plan-switch columns
  requested_plan           TEXT,
  plan_change_status       TEXT,
  plan_change_submitted_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.slug,
    t.name,
    t.language,
    t.contact_email,
    t.contact_phone,
    public.get_tenant_subscription_status(t.id)::TEXT  AS subscription_status,
    t.subscription_plan,
    t.trial_started_at,
    t.trial_ends_at,
    t.current_period_start,
    t.current_period_end,
    t.subscription_started_at,
    t.subscription_ends_at,
    t.owner_auth_user_id,
    t.created_at,
    t.requested_plan,
    t.plan_change_status,
    t.plan_change_submitted_at
  FROM public.tenants t
  WHERE t.owner_auth_user_id = auth.uid()
    AND t.deleted_at IS NULL
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION public.get_my_tenant_with_status IS
  'Returns the calling user''s tenant with computed subscription_status and
   plan-change tracking fields. Used by SubscriptionDashboard.tsx.';

GRANT EXECUTE ON FUNCTION public.get_my_tenant_with_status()
  TO authenticated;

-- ── 4. Helper RPC: mark a plan-change request as submitted ──────────────────
-- Called after submit_payment_rpc() succeeds so the dashboard knows the
-- customer's intent without re-reading the payments table on every load.
-- Security: caller must own the tenant (checked via auth.uid() join).
CREATE OR REPLACE FUNCTION public.mark_plan_change_pending(
  p_tenant_id  UUID,
  p_new_plan   TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner UUID;
BEGIN
  -- Verify caller owns this tenant
  SELECT owner_auth_user_id INTO v_owner
  FROM   public.tenants
  WHERE  id = p_tenant_id AND deleted_at IS NULL;

  IF v_owner IS NULL OR v_owner <> auth.uid() THEN
    RAISE EXCEPTION 'mark_plan_change_pending: not tenant owner';
  END IF;

  IF p_new_plan NOT IN ('monthly', 'yearly') THEN
    RAISE EXCEPTION 'mark_plan_change_pending: invalid plan';
  END IF;

  UPDATE public.tenants
  SET    requested_plan            = p_new_plan,
         plan_change_status        = 'pending',
         plan_change_submitted_at  = now()
  WHERE  id = p_tenant_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_plan_change_pending(UUID, TEXT)
  TO authenticated;

-- ── 5. Helper RPC: clear plan-change state (called after admin action) ───────
-- approve_subscription_payment() already updates subscription_plan.
-- This companion clears the plan_change tracking columns atomically.
-- Only super-admin may call this.
CREATE OR REPLACE FUNCTION public.clear_plan_change_state(
  p_tenant_id  UUID,
  p_new_status TEXT  -- 'approved' or 'rejected'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'clear_plan_change_state: super_admin only';
  END IF;

  IF p_new_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'clear_plan_change_state: invalid status';
  END IF;

  UPDATE public.tenants
  SET    plan_change_status        = p_new_status,
         plan_change_submitted_at  = CASE WHEN p_new_status = 'approved' THEN NULL ELSE plan_change_submitted_at END,
         requested_plan            = CASE WHEN p_new_status = 'approved' THEN NULL ELSE requested_plan END
  WHERE  id = p_tenant_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.clear_plan_change_state(UUID, TEXT)
  TO authenticated;

COMMIT;
