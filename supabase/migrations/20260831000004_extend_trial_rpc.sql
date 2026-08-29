-- ═══════════════════════════════════════════════════════════════════════════
-- extend_tenant_trial_rpc — SECURITY DEFINER wrapper for trial extension
--
-- Closes the last remaining direct .update() on tenants.subscription_status
-- in superAdmin.ts:extendTenantTrial(). That function directly wrote
--   { trial_ends_at: ..., subscription_status: 'TRIAL' }
-- relying solely on the super_admin_update_tenants RLS policy. This RPC
-- instead verifies is_super_admin() at the DB level, calculates the new
-- trial_ends_at server-side, and writes an immutable audit log.
--
-- Called by: superAdmin.ts:extendTenantTrial()
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

CREATE OR REPLACE FUNCTION public.extend_tenant_trial_rpc(
  p_tenant_id      UUID,
  p_additional_days INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_trial_end  TIMESTAMPTZ;
  v_new_trial_end      TIMESTAMPTZ;
BEGIN
  -- ── 1. Verify caller is super admin ───────────────────────────────────────
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'extend_tenant_trial_rpc: caller is not super_admin';
  END IF;

  -- ── 2. Validate input ─────────────────────────────────────────────────────
  IF p_additional_days IS NULL OR p_additional_days < 1 THEN
    RAISE EXCEPTION 'extend_tenant_trial_rpc: p_additional_days must be >= 1';
  END IF;

  IF p_additional_days > 365 THEN
    RAISE EXCEPTION 'extend_tenant_trial_rpc: p_additional_days must be <= 365';
  END IF;

  -- ── 3. Read current trial end date ────────────────────────────────────────
  SELECT trial_ends_at INTO v_current_trial_end
  FROM   public.tenants
  WHERE  id = p_tenant_id
    AND  deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'extend_tenant_trial_rpc: tenant not found';
  END IF;

  -- Extend from current trial_ends_at, or from now() if it has already expired
  v_new_trial_end := GREATEST(COALESCE(v_current_trial_end, now()), now())
                     + (p_additional_days || ' days')::INTERVAL;

  -- ── 4. Update tenant ──────────────────────────────────────────────────────
  UPDATE public.tenants
  SET    trial_ends_at       = v_new_trial_end,
         subscription_status = 'TRIAL'
  WHERE  id = p_tenant_id;

  -- ── 5. Audit log ──────────────────────────────────────────────────────────
  PERFORM public.log_super_admin_action(
    'trial_extended',
    'tenants',
    p_tenant_id,
    jsonb_build_object(
      'additional_days',  p_additional_days,
      'old_trial_end',    v_current_trial_end,
      'new_trial_end',    v_new_trial_end
    )
  );

  RETURN jsonb_build_object(
    'success',       true,
    'new_trial_end', v_new_trial_end
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION '%', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.extend_tenant_trial_rpc IS
  'SECURITY DEFINER wrapper for extending a tenant trial period.
   Verifies is_super_admin() at DB level, validates input, calculates new
   trial_ends_at server-side (client cannot supply a date), resets
   subscription_status to TRIAL, and writes an immutable audit log.
   Called by superAdmin.ts:extendTenantTrial().';

GRANT EXECUTE ON FUNCTION public.extend_tenant_trial_rpc(UUID, INTEGER)
  TO authenticated;

COMMIT;
