/**
 * SangTX Manual UPI Payment System — HARDENED
 *
 * Security model:
 *  - Plan prices come from the DB (payment_config). Never from the client.
 *  - Payment submissions call submit_payment_rpc() (SECURITY DEFINER RPC).
 *    The RPC validates the amount server-side, prevents double-submission,
 *    deduplicates by UTR, and atomically sets subscription_status.
 *  - The tenant can never directly INSERT or UPDATE tenant_payments rows.
 *  - approvePayment / rejectPayment use server-side RPCs that check
 *    is_super_admin() inside the DB — they cannot be called by a tenant.
 *  - No secret credentials appear anywhere in this file.
 *
 * Payment state machine (tenant.subscription_status):
 *   TRIAL ──────────────────────────────────────────────────────────────────┐
 *     └─ trial_ends_at passes → PAYMENT_DUE                                │
 *   PAYMENT_DUE ──────────────────────────────────────────────────────────►┤
 *     └─ customer submits UTR → PAYMENT_PENDING (set by RPC, not client)   │
 *   PAYMENT_PENDING                                                         │
 *     ├─ super admin approves → ACTIVE ──────────────────────────────────►┤
 *     └─ super admin rejects  → PAYMENT_DUE (customer can resubmit)       │
 *   ACTIVE                                                                 │
 *     └─ current_period_end passes → PAYMENT_DUE                         ◄┘
 *   PAST_DUE / EXPIRED / SUSPENDED / CANCELLED — terminal until admin acts
 */
import { getSupabaseClient } from '../../lib/supabase';

// ── Plan configuration (used for UI display only — price is always from DB) ──
export const PLANS = {
  monthly: { id: 'monthly', label: 'Monthly', price: 499,  currency: 'INR', intervalMonths: 1 },
  yearly:  { id: 'yearly',  label: 'Yearly',  price: 5599, currency: 'INR', intervalMonths: 12 },
} as const;

export type PlanId = keyof typeof PLANS;

// ── Subscription statuses (must stay in sync with DB check constraint) ────────
export type SubscriptionStatus =
  | 'TRIAL'
  | 'PAYMENT_DUE'
  | 'PAYMENT_PENDING'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'EXPIRED'
  | 'SUSPENDED'
  | 'CANCELLED';

export type PaymentStatus = 'SUBMITTED' | 'APPROVED' | 'REJECTED';

// ── Types ─────────────────────────────────────────────────────────────────────
export type TenantRow = {
  id: string;
  slug: string;
  name: string;
  language: string;
  contact_email: string | null;
  contact_phone: string | null;
  subscription_status: SubscriptionStatus;
  subscription_plan: PlanId;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  subscription_started_at: string | null;
  subscription_ends_at: string | null;
  owner_auth_user_id: string | null;
  created_at: string;
  // Plan-change tracking (added in migration 20260831000100)
  requested_plan: PlanId | null;
  plan_change_status: 'none' | 'pending' | 'approved' | 'rejected';
  plan_change_submitted_at: string | null;
};

export type PaymentRow = {
  id: string;
  tenant_id: string;
  plan: PlanId;
  amount: number;
  currency: string;
  method: string;
  upi_id_used: string;
  utr: string | null;
  payment_date: string | null;
  screenshot_url: string | null;
  notes: string | null;
  status: PaymentStatus;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  period_start: string | null;
  period_end: string | null;
  submitted_at: string;
  created_at: string;
  updated_at: string;
  // joined in listAllPayments()
  tenant_name?: string;
  tenant_slug?: string;
};

export type PaymentConfig = {
  id: string;
  upi_id: string;
  merchant_name: string;
  currency: string;
  monthly_price: number;
  yearly_price: number;
  trial_days: number;
  grace_period_days: number;
  android_app_addon_price?: number;
};

// ── RPC result from submit_payment_rpc ────────────────────────────────────────
type SubmitPaymentRpcResult = {
  success: boolean;
  payment_id: string;
  amount: number;
  status: string;
};

function client() {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
}

// ── Build a UPI deep-link URI for mobile UPI apps ─────────────────────────────
/** All fields come from server-fetched PaymentConfig — never from client input */
export function buildUpiUri(amount: number, upiId: string, merchantName: string): string {
  const params = new URLSearchParams({
    pa: upiId,
    pn: merchantName,
    am: String(amount),
    cu: 'INR',
    tn: 'SangTX Subscription',
  });
  return `upi://pay?${params.toString()}`;
}

// ── Load payment config from DB ───────────────────────────────────────────────
export async function loadPaymentConfig(): Promise<PaymentConfig> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) return defaultConfig();
    const { data } = await supabase
      .from('payment_config')
      .select('*')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();
    if (!data) return defaultConfig();
    return data as PaymentConfig;
  } catch {
    return defaultConfig();
  }
}

/**
 * Fallback config used only when payment_config table is unreachable.
 * These values must match what is in the database.
 * WARNING: If DB prices are changed by the Super Admin, this fallback becomes
 * stale. The UI should always prefer the DB-fetched config.
 */
function defaultConfig(): PaymentConfig {
  return {
    id: '',
    upi_id: '9229721835-2@ibl',
    merchant_name: 'SangTX',
    currency: 'INR',
    monthly_price: PLANS.monthly.price,
    yearly_price: PLANS.yearly.price,
    trial_days: 7,
    grace_period_days: 3,
    android_app_addon_price: 3000,
  };
}

/** Get the correct plan price from DB-fetched config */
export function getPlanPrice(config: PaymentConfig, plan: PlanId): number {
  return plan === 'yearly' ? config.yearly_price : config.monthly_price;
}

// ── Customer: load own tenant ─────────────────────────────────────────────────
//
// SECURITY: Uses get_my_tenant_with_status() SECURITY DEFINER RPC instead of a
// direct table SELECT. The RPC returns the tenant row with subscription_status
// replaced by the SERVER-COMPUTED value from get_tenant_subscription_status().
// This means an expired trial tenant immediately sees PAYMENT_DUE instead of
// TRIAL — even if the stored column has not yet been updated by the background
// job. The client cannot influence the returned status in any way.
export async function loadMyTenant(_authUserId: string): Promise<TenantRow | null> {
  const supabase = client();
  const { data, error } = await supabase.rpc('get_my_tenant_with_status');
  if (error) throw error;
  // The RPC returns a row set; take the first (and only) row
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return row as TenantRow;
}

// ── Customer: load own payment history ────────────────────────────────────────
export async function loadMyPayments(tenantId: string): Promise<PaymentRow[]> {
  const supabase = client();
  const { data, error } = await supabase
    .from('tenant_payments')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('submitted_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as PaymentRow[];
}

// ── Customer: submit a manual UPI payment ─────────────────────────────────────
//
// SECURITY: This function calls submit_payment_rpc() — a SECURITY DEFINER
// function in the database. The RPC:
//   1. Verifies the caller is the tenant owner (auth.uid() check)
//   2. Reads the OFFICIAL price from payment_config — amount is NOT accepted
//      from this client call
//   3. Prevents duplicate SUBMITTED rows for the same tenant
//   4. Prevents UTR reuse within the same tenant
//   5. Atomically sets tenant.subscription_status = 'PAYMENT_PENDING'
//   6. Writes an audit log entry
//
// Direct INSERT to tenant_payments is blocked by RLS (no INSERT policy).
export async function submitPayment(payload: {
  tenantId: string;
  plan: PlanId;
  upiIdUsed: string;
  utr: string;
  paymentDate: string;  // ISO date string YYYY-MM-DD
  notes?: string | null;
  paymentType?: 'subscription' | 'android_app';
}): Promise<{ paymentId: string; amount: number }> {
  const supabase = client();

  const { data, error } = await supabase.rpc('submit_payment_rpc', {
    p_tenant_id:    payload.tenantId,
    p_plan:         payload.plan,
    p_upi_id_used:  payload.upiIdUsed,
    p_utr:          payload.utr.trim(),
    p_payment_date: payload.paymentDate,
    p_notes:        payload.notes ?? null,
    p_payment_type: payload.paymentType ?? 'subscription',
  });

  if (error) {
    // Map DB error codes to user-readable messages
    const msg = error.message ?? '';
    if (msg.includes('utr_already_submitted'))   throw new Error('This UTR has already been submitted. Please check your payment history.');
    if (msg.includes('payment_already_pending')) throw new Error('A payment is already under review. Please wait for it to be processed.');
    if (msg.includes('utr_required'))            throw new Error('UTR number is required.');
    if (msg.includes('not_tenant_owner'))        throw new Error('Unauthorized: you do not own this tenant.');
    if (msg.includes('tenant_not_found'))        throw new Error('Tenant not found.');
    if (msg.includes('invalid_plan'))            throw new Error('Invalid subscription plan.');
    if (msg.includes('payment_config_unavailable')) throw new Error('Payment configuration is temporarily unavailable. Please try again later.');
    throw new Error(msg || 'Failed to submit payment. Please try again.');
  }

  const result = data as SubmitPaymentRpcResult;
  return { paymentId: result.payment_id, amount: result.amount };
}

// ── Admin: load all tenants (super admin only — filtered by RLS) ──────────────
export async function listAllTenants(): Promise<TenantRow[]> {
  const supabase = client();
  const { data, error } = await supabase
    .from('tenants')
    .select(`
      id, slug, name, language, contact_email, contact_phone,
      subscription_status, subscription_plan,
      trial_started_at, trial_ends_at,
      current_period_start, current_period_end,
      subscription_started_at, subscription_ends_at,
      owner_auth_user_id, created_at
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as TenantRow[];
}

// ── Admin: load all payments (super admin only — filtered by RLS) ─────────────
export async function listAllPayments(
  statusFilter?: PaymentStatus | 'ALL',
): Promise<PaymentRow[]> {
  const supabase = client();
  let q = supabase
    .from('tenant_payments')
    .select(`
      *,
      tenant:tenants!tenant_payments_tenant_id_fkey(name, slug)
    `)
    .order('submitted_at', { ascending: false });

  if (statusFilter && statusFilter !== 'ALL') {
    q = q.eq('status', statusFilter);
  }

  const { data, error } = await q;
  if (error) throw error;

  return (data ?? []).map((row: Record<string, unknown>) => {
    const tenant = row.tenant as Record<string, unknown> | null;
    return {
      ...row,
      tenant_name: String(tenant?.name ?? ''),
      tenant_slug: String(tenant?.slug ?? ''),
    } as PaymentRow;
  });
}

// ── Admin: approve a payment ───────────────────────────────────────────────────
//
// SECURITY: Uses approve_subscription_payment() RPC (SECURITY DEFINER).
// That function checks is_super_admin() inside the DB — it will throw if the
// caller is not a super admin. Period dates are calculated server-side.
// This client function does NOT do any direct UPDATEs to tenant_payments or
// tenants rows.
export async function approvePayment(payload: {
  paymentId: string;
  reviewerUserId: string;
}): Promise<void> {
  const supabase = client();
  const { error } = await supabase.rpc('approve_subscription_payment', {
    p_payment_id:          payload.paymentId,
    p_reviewed_by_user_id: payload.reviewerUserId,
  });
  if (error) throw new Error(error.message || 'Failed to approve payment.');
}

// ── Admin: reject a payment ────────────────────────────────────────────────────
//
// SECURITY: Uses reject_payment() RPC (SECURITY DEFINER).
// Checks is_super_admin() inside the DB.
export async function rejectPayment(payload: {
  paymentId: string;
  reviewerUserId: string;
  reason: string;
}): Promise<void> {
  if (!payload.reason.trim()) {
    throw new Error('A rejection reason is required.');
  }
  const supabase = client();
  const { error } = await supabase.rpc('reject_payment', {
    p_payment_id:          payload.paymentId,
    p_reason:              payload.reason.trim(),
    p_reviewed_by_user_id: payload.reviewerUserId,
  });
  if (error) throw new Error(error.message || 'Failed to reject payment.');
}

// updatePaymentConfig is intentionally NOT exported from payment.ts.
// Platform payment configuration (UPI ID, prices) must only be changed
// through superAdmin.ts:updatePaymentConfig() which is called exclusively
// from PlatformSettingsPanel.tsx (super-admin-only). Exporting it here
// would create a second code path with no additional security value.
// See: supabase/migrations/20260831000003_payment_final_hardening.sql

// ── Admin: manually set tenant subscription status ────────────────────────────
//
// SECURITY: Uses update_tenant_status_rpc() SECURITY DEFINER function which
// verifies is_super_admin() inside the DB. A non-super-admin calling this
// will get a DB-level error, not a silent no-op.
export async function adminSetTenantStatus(payload: {
  tenantId: string;
  status: SubscriptionStatus;
  actorUserId: string;
  notes?: string;
}): Promise<void> {
  const supabase = client();
  const { error } = await supabase.rpc('update_tenant_status_rpc', {
    p_tenant_id:  payload.tenantId,
    p_new_status: payload.status,
    p_reason:     payload.notes ?? null,
  });
  if (error) throw new Error(error.message);
}

// ── Customer: mark a plan-change request as pending ──────────────────────────
// Called immediately after submit_payment_rpc() succeeds for a plan switch.
// Records the intent in the tenants table so the dashboard can show the
// "plan change pending" state without re-querying tenant_payments.
export async function markPlanChangePending(tenantId: string, newPlan: PlanId): Promise<void> {
  const supabase = client();
  const { error } = await supabase.rpc('mark_plan_change_pending', {
    p_tenant_id: tenantId,
    p_new_plan:  newPlan,
  });
  if (error) throw new Error(error.message || 'Failed to record plan change request.');
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Returns days remaining in trial. Returns 0 when expired. Never negative. */
export function trialDaysRemaining(trialEndsAt: string | null): number {
  if (!trialEndsAt) return 0;
  const ms = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

/** Returns days remaining until period end. Returns 0 when expired. Never negative. */
export function periodDaysRemaining(periodEnd: string | null): number {
  if (!periodEnd) return 0;
  const ms = new Date(periodEnd).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}
