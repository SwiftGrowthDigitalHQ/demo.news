-- ═══════════════════════════════════════════════════════════════════════════
-- PAYMENT SYSTEM HARDENING
--
-- Fixes found by security audit:
--
-- 1. tenant_payments table was never created by any migration.
--    The application code assumed it existed, causing silent runtime failures.
--
-- 2. Payment amount was never validated server-side at INSERT time.
--    A customer could submit any amount they wished through a direct API call
--    or browser DevTools and the row would be accepted.
--
-- 3. submitPayment() in payment.ts did a direct client INSERT followed by a
--    direct client UPDATE of tenants.subscription_status. The WITH CHECK on
--    the "tenant_owner_update_own" RLS policy silently blocked the status
--    update, so subscription_status NEVER reached PAYMENT_PENDING. The customer
--    kept seeing the payment form even after submitting. This migration
--    introduces submit_payment_rpc() (SECURITY DEFINER) that does both
--    operations atomically inside the database, bypassing RLS safely.
--
-- 4. No idempotency guard: a customer could submit the same UTR number twice,
--    or double-click and create duplicate SUBMITTED rows. The RPC prevents this.
--
-- 5. approvePayment() in payment.ts did direct client UPDATEs on both
--    tenant_payments and tenants. This relies entirely on the super admin RLS
--    policy. The existing approve_subscription_payment() DB function is correct
--    (SECURITY DEFINER, checks is_super_admin()), but the client-side
--    approvePayment() bypassed it. Fixed in payment.ts to use only the RPC.
--
-- 6. The "provision-customer" Supabase Edge Function directory was empty,
--    causing provisionCustomer() to always fail silently. Added in Task 5.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────
-- 1.  CREATE tenant_payments TABLE (was missing from all prior migrations)
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.tenant_payments (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  -- Plan that was paid for
  plan             TEXT        NOT NULL
                               CHECK (plan IN ('monthly', 'yearly')),

  -- Amount stored in smallest integer of currency (paise would need *100, but
  -- existing code stores rupees as numeric — keep as numeric for compatibility)
  amount           NUMERIC(10,2) NOT NULL
                               CHECK (amount > 0),

  currency         TEXT        NOT NULL DEFAULT 'INR',
  method           TEXT        NOT NULL DEFAULT 'UPI',

  -- UPI metadata
  upi_id_used      TEXT,
  utr              TEXT,
  payment_date     DATE,
  screenshot_url   TEXT,
  notes            TEXT,

  -- Status machine: only these transitions are meaningful
  --   SUBMITTED → APPROVED | REJECTED
  --   REJECTED  → (customer may create a new SUBMITTED row)
  status           TEXT        NOT NULL DEFAULT 'SUBMITTED'
                               CHECK (status IN ('SUBMITTED', 'APPROVED', 'REJECTED')),

  rejection_reason TEXT,

  -- Reviewer (set by approve/reject RPC functions only)
  reviewed_by      UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at      TIMESTAMPTZ,

  -- Subscription period granted when APPROVED
  period_start     TIMESTAMPTZ,
  period_end       TIMESTAMPTZ,

  -- Payment type (subscription vs android one-off)
  payment_type     TEXT        NOT NULL DEFAULT 'subscription'
                               CHECK (payment_type IN ('subscription', 'android_app')),

  submitted_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique UTR per tenant: prevents the same bank reference being reused
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_payments_utr_unique
  ON public.tenant_payments(tenant_id, utr)
  WHERE utr IS NOT NULL AND utr <> '';

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_tenant_payments_tenant_status
  ON public.tenant_payments(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_tenant_payments_status
  ON public.tenant_payments(status);

CREATE INDEX IF NOT EXISTS idx_tenant_payments_submitted_at
  ON public.tenant_payments(submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_tenant_payments_type_status
  ON public.tenant_payments(payment_type, status);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_tenant_payments_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS set_tenant_payments_updated_at ON public.tenant_payments;
CREATE TRIGGER set_tenant_payments_updated_at
  BEFORE UPDATE ON public.tenant_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_payments_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- 2.  RLS ON tenant_payments
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE public.tenant_payments ENABLE ROW LEVEL SECURITY;

-- Drop any older policies (idempotent re-run)
DROP POLICY IF EXISTS "super_admin_read_all_payments"      ON public.tenant_payments;
DROP POLICY IF EXISTS "super_admin_update_payments"         ON public.tenant_payments;
DROP POLICY IF EXISTS "tenant_owner_insert_own_payment"     ON public.tenant_payments;
DROP POLICY IF EXISTS "tenant_owner_read_own_payments"      ON public.tenant_payments;
DROP POLICY IF EXISTS "Tenant owner can insert payment"     ON public.tenant_payments;
DROP POLICY IF EXISTS "Tenant owner can read own payments"  ON public.tenant_payments;
DROP POLICY IF EXISTS "Admin can read all payments"         ON public.tenant_payments;
DROP POLICY IF EXISTS "Admin can update payments"           ON public.tenant_payments;

-- Super admin: full read + write
CREATE POLICY "super_admin_all_payments" ON public.tenant_payments
  FOR ALL
  USING  (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Tenant owner: read own records only — NO direct INSERT or UPDATE
CREATE POLICY "tenant_owner_read_own_payments" ON public.tenant_payments
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT id FROM public.tenants
      WHERE owner_auth_user_id = auth.uid()
        AND deleted_at IS NULL
    )
  );

-- NOTE: There is intentionally NO INSERT policy for tenant owners here.
-- All payment submissions go through submit_payment_rpc() (SECURITY DEFINER)
-- which validates the amount server-side and is the only permitted insert path.
-- Direct client-side INSERTs will be rejected by missing RLS policy.

COMMENT ON TABLE public.tenant_payments IS
  'One row per customer payment submission. Customers submit via the
   submit_payment_rpc() SECURITY DEFINER function which validates the amount
   against payment_config. Only super admin can approve/reject via
   approve_subscription_payment() and reject_payment() RPCs.';

-- ─────────────────────────────────────────────────────────────────────────
-- 3.  submit_payment_rpc — SERVER-SIDE PAYMENT SUBMISSION
--
--     Replaces the two-step client INSERT + UPDATE pattern in payment.ts.
--     Runs as SECURITY DEFINER so it can:
--       a) read payment_config to get the authoritative plan price
--       b) validate the expected amount
--       c) insert the payment row with the correct amount
--       d) atomically set tenant.subscription_status = 'PAYMENT_PENDING'
--       e) prevent duplicate SUBMITTED rows for the same tenant
--       f) deduplicate by UTR (same UTR cannot be submitted twice)
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.submit_payment_rpc(
  p_tenant_id    UUID,
  p_plan         TEXT,
  p_upi_id_used  TEXT,
  p_utr          TEXT,
  p_payment_date DATE,
  p_notes        TEXT   DEFAULT NULL,
  p_payment_type TEXT   DEFAULT 'subscription'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_auth_uid UUID;
  v_config         RECORD;
  v_expected_amount NUMERIC(10,2);
  v_payment_id     UUID;
  v_existing_submitted INT;
  v_utr_clean      TEXT;
BEGIN
  -- ── 1. Caller must be the tenant owner ────────────────────────────────
  SELECT owner_auth_user_id INTO v_owner_auth_uid
  FROM   public.tenants
  WHERE  id          = p_tenant_id
    AND  deleted_at  IS NULL;

  IF v_owner_auth_uid IS NULL THEN
    RAISE EXCEPTION 'tenant_not_found';
  END IF;

  IF v_owner_auth_uid <> auth.uid() THEN
    RAISE EXCEPTION 'not_tenant_owner';
  END IF;

  -- ── 2. Validate plan ──────────────────────────────────────────────────
  IF p_plan NOT IN ('monthly', 'yearly') THEN
    RAISE EXCEPTION 'invalid_plan';
  END IF;

  -- ── 3. Validate payment type ──────────────────────────────────────────
  IF p_payment_type NOT IN ('subscription', 'android_app') THEN
    RAISE EXCEPTION 'invalid_payment_type';
  END IF;

  -- ── 4. Fetch authoritative amount from payment_config ────────────────
  --     Amount is NEVER trusted from the client.
  SELECT *
  INTO   v_config
  FROM   public.payment_config
  WHERE  is_active = true
  LIMIT  1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment_config_unavailable';
  END IF;

  IF p_payment_type = 'subscription' THEN
    v_expected_amount := CASE p_plan
      WHEN 'monthly' THEN v_config.monthly_price
      WHEN 'yearly'  THEN v_config.yearly_price
    END;
  ELSIF p_payment_type = 'android_app' THEN
    v_expected_amount := v_config.android_app_addon_price;
  END IF;

  IF v_expected_amount IS NULL OR v_expected_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_configured_price';
  END IF;

  -- ── 5. Validate UTR ───────────────────────────────────────────────────
  v_utr_clean := btrim(COALESCE(p_utr, ''));
  IF v_utr_clean = '' THEN
    RAISE EXCEPTION 'utr_required';
  END IF;

  -- Prevent duplicate UTR for this tenant
  IF EXISTS (
    SELECT 1 FROM public.tenant_payments
    WHERE  tenant_id = p_tenant_id
      AND  utr       = v_utr_clean
  ) THEN
    RAISE EXCEPTION 'utr_already_submitted';
  END IF;

  -- ── 6. Prevent double-submission (already SUBMITTED row pending) ──────
  IF p_payment_type = 'subscription' THEN
    SELECT COUNT(*) INTO v_existing_submitted
    FROM   public.tenant_payments
    WHERE  tenant_id    = p_tenant_id
      AND  status       = 'SUBMITTED'
      AND  payment_type = 'subscription';

    IF v_existing_submitted > 0 THEN
      RAISE EXCEPTION 'payment_already_pending';
    END IF;
  END IF;

  -- ── 7. Insert payment row with server-determined amount ───────────────
  INSERT INTO public.tenant_payments (
    tenant_id,
    plan,
    amount,          -- ← authoritative server value, NOT from client
    currency,
    method,
    upi_id_used,
    utr,
    payment_date,
    notes,
    status,
    payment_type,
    submitted_at
  )
  VALUES (
    p_tenant_id,
    p_plan,
    v_expected_amount,
    'INR',
    'UPI',
    btrim(COALESCE(p_upi_id_used, '')),
    v_utr_clean,
    COALESCE(p_payment_date, CURRENT_DATE),
    NULLIF(btrim(COALESCE(p_notes, '')), ''),
    'SUBMITTED',
    p_payment_type,
    now()
  )
  RETURNING id INTO v_payment_id;

  -- ── 8. Atomically update tenant status to PAYMENT_PENDING ─────────────
  --     This runs inside SECURITY DEFINER so it bypasses the
  --     tenant_owner_update_own RLS WITH CHECK that blocks this field.
  IF p_payment_type = 'subscription' THEN
    UPDATE public.tenants
    SET    subscription_status = 'PAYMENT_PENDING'
    WHERE  id = p_tenant_id
      AND  subscription_status IN ('PAYMENT_DUE', 'TRIAL', 'PAST_DUE', 'EXPIRED');
    -- NOTE: if the tenant is already ACTIVE or PAYMENT_PENDING we don't
    -- change status — the payment record is still recorded for history.
  END IF;

  -- ── 9. Audit log ──────────────────────────────────────────────────────
  INSERT INTO public.audit_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  SELECT
    u.id,
    'payment.submitted',
    'tenant_payments',
    v_payment_id,
    jsonb_build_object(
      'tenant_id',    p_tenant_id,
      'plan',         p_plan,
      'amount',       v_expected_amount,
      'payment_type', p_payment_type,
      'utr',          v_utr_clean
    )
  FROM public.users u
  WHERE u.auth_user_id = auth.uid()
    AND u.deleted_at IS NULL
  LIMIT 1;

  RETURN jsonb_build_object(
    'success',    true,
    'payment_id', v_payment_id,
    'amount',     v_expected_amount,
    'status',     'SUBMITTED'
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Re-raise as a structured error so the client gets a clean message
    RAISE EXCEPTION '%', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.submit_payment_rpc IS
  'Authoritative server-side payment submission.
   - Verifies caller is the tenant owner
   - Reads the OFFICIAL plan price from payment_config (amount is NEVER trusted from client)
   - Prevents duplicate SUBMITTED rows for the same tenant
   - Prevents UTR reuse within the same tenant
   - Atomically sets tenant.subscription_status = PAYMENT_PENDING
   - Records an audit log entry
   Called by payment.ts:submitPayment(). Direct client INSERTs to
   tenant_payments are blocked by missing RLS INSERT policy.';

-- Grant execute to authenticated users (RLS on calling user inside function)
GRANT EXECUTE ON FUNCTION public.submit_payment_rpc(UUID,TEXT,TEXT,TEXT,DATE,TEXT,TEXT)
  TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 4.  ENSURE approve_subscription_payment & reject_payment RPCs EXIST
--     (from migration 20260812000003; re-create here as safety fallback
--      in case that migration was not applied to the live database)
-- ─────────────────────────────────────────────────────────────────────────

-- NOTE: Both functions already include is_super_admin() checks, so they
-- are safe to call only by super admins. We don't redefine them here —
-- we rely on migration 20260812000003 having been applied.
-- If it wasn't applied, applying THIS migration alone won't help — the
-- operator must run: supabase db push --include-all

-- ─────────────────────────────────────────────────────────────────────────
-- 5.  TENANT STATUS GUARD: ensure no client can directly UPDATE
--     subscription_status to any payment-privileged value via the REST API
-- ─────────────────────────────────────────────────────────────────────────

-- The existing "tenant_owner_update_own" policy in 20260812000002 already
-- has: old.subscription_status = new.subscription_status
-- So tenant owners CANNOT change subscription_status through direct REST.
-- This is confirmed. No additional change needed here.

-- ─────────────────────────────────────────────────────────────────────────
-- 6.  REVOKE direct table permissions from anon/authenticated for
--     tenant_payments (belt-and-suspenders on top of RLS)
-- ─────────────────────────────────────────────────────────────────────────

REVOKE ALL ON public.tenant_payments FROM anon;
-- Keep SELECT/INSERT for authenticated so RLS can filter; full writes go
-- via SECURITY DEFINER RPCs only.
REVOKE UPDATE, DELETE ON public.tenant_payments FROM authenticated;

COMMIT;
