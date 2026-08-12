/**
 * SangTX Manual UPI Payment System
 *
 * All pricing, UPI config, and payment DB operations live here.
 * Components must NEVER hardcode plan prices or the UPI ID.
 *
 * Payment flow:
 *   TRIAL → PAYMENT_DUE → (customer submits) → PAYMENT_PENDING
 *   → (admin approves) → ACTIVE
 *   → (admin rejects)  → PAYMENT_DUE (customer can resubmit)
 *   ACTIVE → (period ends) → PAYMENT_DUE
 *   PAYMENT_DUE + grace expired → SUSPENDED
 */
import { getSupabaseClient } from '../../lib/supabase';

// ── Plan configuration ────────────────────────────────────────────────────────
export const PLANS = {
  monthly: { id: 'monthly', label: 'Monthly', price: 499, currency: 'INR', intervalMonths: 1 },
  yearly:  { id: 'yearly',  label: 'Yearly',  price: 5599, currency: 'INR', intervalMonths: 12 },
} as const;

export type PlanId = keyof typeof PLANS;

// ── UPI config (single source of truth — also loaded from DB) ─────────────────
export const DEFAULT_UPI_CONFIG = {
  upiId: '9229721835-2@ibl',
  merchantName: 'SangTX',
  currency: 'INR',
} as const;

/** Build a UPI payment URI for deep-linking into UPI apps */
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

// ── Subscription status ───────────────────────────────────────────────────────
export type SubscriptionStatus =
  | 'TRIAL'
  | 'PAYMENT_DUE'
  | 'PAYMENT_PENDING'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'CANCELLED';

// ── Payment status ────────────────────────────────────────────────────────────
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
  owner_auth_user_id: string | null;
  created_at: string;
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
  // joined
  tenant_name?: string;
  tenant_slug?: string;
  reviewer_name?: string;
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
};

function client() {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
}

// ── Load payment config from DB (with fallback to defaults) ───────────────────
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

function defaultConfig(): PaymentConfig {
  return {
    id: '',
    upi_id: DEFAULT_UPI_CONFIG.upiId,
    merchant_name: DEFAULT_UPI_CONFIG.merchantName,
    currency: 'INR',
    monthly_price: PLANS.monthly.price,
    yearly_price: PLANS.yearly.price,
    trial_days: 7,
    grace_period_days: 3,
  };
}

/** Get the correct price for a plan from DB config */
export function getPlanPrice(config: PaymentConfig, plan: PlanId): number {
  return plan === 'yearly' ? config.yearly_price : config.monthly_price;
}

// ── Customer: load own tenant ─────────────────────────────────────────────────
export async function loadMyTenant(authUserId: string): Promise<TenantRow | null> {
  const supabase = client();
  const { data, error } = await supabase
    .from('tenants')
    .select('id, slug, name, language, contact_email, contact_phone, subscription_status, subscription_plan, trial_started_at, trial_ends_at, current_period_start, current_period_end, owner_auth_user_id, created_at')
    .eq('owner_auth_user_id', authUserId)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw error;
  return data as TenantRow | null;
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
export async function submitPayment(payload: {
  tenantId: string;
  plan: PlanId;
  amount: number;          // server-determined, NOT trusted from client directly
  upiIdUsed: string;
  utr: string;
  paymentDate: string;     // ISO date string
  screenshotUrl?: string | null;
  notes?: string | null;
}): Promise<PaymentRow> {
  const supabase = client();

  // Insert payment record
  const { data, error } = await supabase
    .from('tenant_payments')
    .insert({
      tenant_id:      payload.tenantId,
      plan:           payload.plan,
      amount:         payload.amount,
      currency:       'INR',
      method:         'UPI',
      upi_id_used:    payload.upiIdUsed,
      utr:            payload.utr.trim(),
      payment_date:   payload.paymentDate,
      screenshot_url: payload.screenshotUrl ?? null,
      notes:          payload.notes ?? null,
      status:         'SUBMITTED',
    })
    .select('*')
    .single();

  if (error) throw error;

  // Update tenant status to PAYMENT_PENDING
  await supabase
    .from('tenants')
    .update({ subscription_status: 'PAYMENT_PENDING' })
    .eq('id', payload.tenantId);

  return data as PaymentRow;
}

// ── Admin: load all tenants ────────────────────────────────────────────────────
export async function listAllTenants(): Promise<TenantRow[]> {
  const supabase = client();
  const { data, error } = await supabase
    .from('tenants')
    .select('id, slug, name, language, contact_email, contact_phone, subscription_status, subscription_plan, trial_started_at, trial_ends_at, current_period_start, current_period_end, owner_auth_user_id, created_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as TenantRow[];
}

// ── Admin: load all pending/submitted payments ─────────────────────────────────
export async function listAllPayments(statusFilter?: PaymentStatus | 'ALL'): Promise<PaymentRow[]> {
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
export async function approvePayment(payload: {
  paymentId: string;
  reviewerUserId: string;
}): Promise<void> {
  const supabase = client();

  // 1. Load payment record
  const { data: payment, error: payErr } = await supabase
    .from('tenant_payments')
    .select('*')
    .eq('id', payload.paymentId)
    .single();
  if (payErr || !payment) throw payErr ?? new Error('Payment not found.');

  const p = payment as PaymentRow;
  if (p.status !== 'SUBMITTED') throw new Error(`Payment is ${p.status}, cannot approve.`);

  // 2. Calculate new subscription period
  const periodStart = new Date();
  const periodEnd = new Date(periodStart);
  if (p.plan === 'yearly') {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  }

  const now = new Date().toISOString();

  // 3. Update payment record
  await supabase
    .from('tenant_payments')
    .update({
      status:       'APPROVED',
      reviewed_by:  payload.reviewerUserId,
      reviewed_at:  now,
      period_start: periodStart.toISOString(),
      period_end:   periodEnd.toISOString(),
    })
    .eq('id', payload.paymentId);

  // 4. Update tenant subscription
  await supabase
    .from('tenants')
    .update({
      subscription_status:    'ACTIVE',
      current_period_start:   periodStart.toISOString(),
      current_period_end:     periodEnd.toISOString(),
    })
    .eq('id', p.tenant_id);

  // 5. Audit log
  await supabase.from('audit_logs').insert({
    actor_user_id: payload.reviewerUserId,
    action:        'payment.approved',
    entity_type:   'tenant_payments',
    entity_id:     payload.paymentId,
    metadata: {
      tenant_id: p.tenant_id,
      plan:      p.plan,
      amount:    p.amount,
      utr:       p.utr,
      period_end: periodEnd.toISOString(),
    },
  });
}

// ── Admin: reject a payment ────────────────────────────────────────────────────
export async function rejectPayment(payload: {
  paymentId: string;
  reviewerUserId: string;
  reason: string;
}): Promise<void> {
  const supabase = client();

  const { data: payment, error: payErr } = await supabase
    .from('tenant_payments')
    .select('*')
    .eq('id', payload.paymentId)
    .single();
  if (payErr || !payment) throw payErr ?? new Error('Payment not found.');

  const p = payment as PaymentRow;
  const now = new Date().toISOString();

  await supabase
    .from('tenant_payments')
    .update({
      status:           'REJECTED',
      rejection_reason: payload.reason.trim(),
      reviewed_by:      payload.reviewerUserId,
      reviewed_at:      now,
    })
    .eq('id', payload.paymentId);

  // Revert tenant to PAYMENT_DUE so they can resubmit
  await supabase
    .from('tenants')
    .update({ subscription_status: 'PAYMENT_DUE' })
    .eq('id', p.tenant_id);

  await supabase.from('audit_logs').insert({
    actor_user_id: payload.reviewerUserId,
    action:        'payment.rejected',
    entity_type:   'tenant_payments',
    entity_id:     payload.paymentId,
    metadata: { tenant_id: p.tenant_id, reason: payload.reason },
  });
}

// ── Admin: manually change tenant subscription status ─────────────────────────
export async function adminSetTenantStatus(payload: {
  tenantId: string;
  status: SubscriptionStatus;
  actorUserId: string;
  notes?: string;
}): Promise<void> {
  const supabase = client();

  const update: Record<string, unknown> = { subscription_status: payload.status };
  if (payload.status === 'SUSPENDED') update.suspended_at = new Date().toISOString();

  await supabase.from('tenants').update(update).eq('id', payload.tenantId);

  await supabase.from('audit_logs').insert({
    actor_user_id: payload.actorUserId,
    action:        `tenant.status.${payload.status.toLowerCase()}`,
    entity_type:   'tenants',
    entity_id:     payload.tenantId,
    metadata:      { notes: payload.notes ?? null, new_status: payload.status },
  });
}

// ── Admin: update payment config (UPI ID etc.) ────────────────────────────────
export async function updatePaymentConfig(updates: Partial<Pick<PaymentConfig, 'upi_id' | 'merchant_name' | 'monthly_price' | 'yearly_price' | 'grace_period_days' | 'trial_days'>>): Promise<void> {
  const supabase = client();
  await supabase
    .from('payment_config')
    .update(updates)
    .eq('id', '40000000-0000-0000-0000-000000000001');
}

// ── Helpers ────────────────────────────────────────────────────────────────────
/** Returns days remaining in trial (0 if expired) */
export function trialDaysRemaining(trialEndsAt: string | null): number {
  if (!trialEndsAt) return 0;
  const ms = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

/** Returns days until period end (0 if expired) */
export function periodDaysRemaining(periodEnd: string | null): number {
  if (!periodEnd) return 0;
  const ms = new Date(periodEnd).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}
