import { getSupabaseClient } from '../../lib/supabase';

// ═══════════════════════════════════════════════════════════════════════════
// SUBSCRIPTION SERVICE
// Centralized subscription and access control service
// Uses database functions for authoritative status calculations
// ═══════════════════════════════════════════════════════════════════════════

// ─── TYPES ───────────────────────────────────────────────────────────────────

export type SubscriptionStatus =
  | 'TRIAL'
  | 'ACTIVE'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_DUE'
  | 'PAST_DUE'
  | 'SUSPENDED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'NOT_FOUND';

export type PaymentType = 'subscription' | 'android_app';
export type PaymentStatus = 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export interface SubscriptionDetails {
  status: SubscriptionStatus;
  plan: 'monthly' | 'yearly';
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  subscriptionStartedAt: string | null;
  subscriptionEndsAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  gracePeriodDays: number;
  androidAppEnabled: boolean;
  androidAppStatus: string;
}

export interface PaymentRecord {
  id: string;
  tenantId: string;
  paymentType: PaymentType;
  plan: string | null;
  amount: number;
  currency: string;
  method: string;
  upiIdUsed: string;
  utr: string | null;
  paymentDate: string | null;
  screenshotUrl: string | null;
  notes: string | null;
  status: PaymentStatus;
  rejectionReason: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface TrialInfo {
  isInTrial: boolean;
  trialEndsAt: string | null;
  daysRemaining: number;
  expired: boolean;
}

export interface AccessPermissions {
  canAccessAdmin: boolean;
  canPublish: boolean;
  canAccessWebsite: boolean;
  canUseAndroidApp: boolean;
}

// ─── SUBSCRIPTION STATUS ─────────────────────────────────────────────────────

/**
 * Get current subscription status for a tenant
 * Uses database function for authoritative calculation
 */
export async function getTenantSubscriptionStatus(
  tenantId: string
): Promise<SubscriptionStatus> {
  const supabase = await getSupabaseClient();
  if (!supabase) return 'NOT_FOUND';

  const { data, error } = await supabase.rpc('get_tenant_subscription_status', {
    p_tenant_id: tenantId,
  });

  if (error) {
    console.error('Error getting tenant subscription status:', error);
    return 'NOT_FOUND';
  }

  return (data as SubscriptionStatus) || 'NOT_FOUND';
}

/**
 * Get complete subscription details for a tenant
 */
export async function getSubscriptionDetails(
  tenantId: string
): Promise<SubscriptionDetails | null> {
  const supabase = await getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('tenants')
    .select(
      `
      subscription_status,
      subscription_plan,
      trial_started_at,
      trial_ends_at,
      subscription_started_at,
      subscription_ends_at,
      current_period_start,
      current_period_end,
      grace_period_days,
      android_app_enabled,
      android_app_status
    `
    )
    .eq('id', tenantId)
    .is('deleted_at', null)
    .single();

  if (error || !data) {
    console.error('Error getting subscription details:', error);
    return null;
  }

  // Get computed status from database function
  const status = await getTenantSubscriptionStatus(tenantId);

  return {
    status,
    plan: data.subscription_plan as 'monthly' | 'yearly',
    trialStartedAt: data.trial_started_at,
    trialEndsAt: data.trial_ends_at,
    subscriptionStartedAt: data.subscription_started_at,
    subscriptionEndsAt: data.subscription_ends_at,
    currentPeriodStart: data.current_period_start,
    currentPeriodEnd: data.current_period_end,
    gracePeriodDays: data.grace_period_days || 3,
    androidAppEnabled: data.android_app_enabled || false,
    androidAppStatus: data.android_app_status || 'NOT_REQUESTED',
  };
}

// ─── ACCESS CONTROL ──────────────────────────────────────────────────────────

/**
 * Check if user can access tenant admin panel
 * Uses database function for server-side enforcement
 */
export async function canAccessTenantAdmin(tenantId: string): Promise<boolean> {
  const supabase = await getSupabaseClient();
  if (!supabase) return false;

  const { data, error } = await supabase.rpc('can_access_tenant_admin', {
    p_tenant_id: tenantId,
  });

  if (error) {
    console.error('Error checking admin access:', error);
    return false;
  }

  return data === true;
}

/**
 * Check if user can publish content
 * Uses database function for server-side enforcement
 */
export async function canPublishContent(tenantId: string): Promise<boolean> {
  const supabase = await getSupabaseClient();
  if (!supabase) return false;

  const { data, error } = await supabase.rpc('can_publish_content', {
    p_tenant_id: tenantId,
  });

  if (error) {
    console.error('Error checking publish access:', error);
    return false;
  }

  return data === true;
}

/**
 * Check if public website can be accessed
 * Uses database function for server-side enforcement
 */
export async function canAccessWebsite(tenantId: string): Promise<boolean> {
  const supabase = await getSupabaseClient();
  if (!supabase) return false;

  const { data, error } = await supabase.rpc('can_access_website', {
    p_tenant_id: tenantId,
  });

  if (error) {
    console.error('Error checking website access:', error);
    return false;
  }

  return data === true;
}

/**
 * Check if Android app can be used
 * Uses database function for server-side enforcement
 */
export async function canUseAndroidApp(tenantId: string): Promise<boolean> {
  const supabase = await getSupabaseClient();
  if (!supabase) return false;

  const { data, error } = await supabase.rpc('can_use_android_app', {
    p_tenant_id: tenantId,
  });

  if (error) {
    console.error('Error checking Android access:', error);
    return false;
  }

  return data === true;
}

/**
 * Get all access permissions at once
 */
export async function getAccessPermissions(
  tenantId: string
): Promise<AccessPermissions> {
  const [adminAccess, publishAccess, websiteAccess, androidAccess] =
    await Promise.all([
      canAccessTenantAdmin(tenantId),
      canPublishContent(tenantId),
      canAccessWebsite(tenantId),
      canUseAndroidApp(tenantId),
    ]);

  return {
    canAccessAdmin: adminAccess,
    canPublish: publishAccess,
    canAccessWebsite: websiteAccess,
    canUseAndroidApp: androidAccess,
  };
}

// ─── TRIAL INFORMATION ───────────────────────────────────────────────────────

/**
 * Get trial information and remaining days
 */
export async function getTrialInfo(tenantId: string): Promise<TrialInfo> {
  const details = await getSubscriptionDetails(tenantId);

  if (!details || !details.trialEndsAt) {
    return {
      isInTrial: false,
      trialEndsAt: null,
      daysRemaining: 0,
      expired: false,
    };
  }

  const isInTrial = details.status === 'TRIAL';
  const trialEnd = new Date(details.trialEndsAt);
  const now = new Date();
  const msRemaining = trialEnd.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
  const expired = now > trialEnd;

  return {
    isInTrial,
    trialEndsAt: details.trialEndsAt,
    daysRemaining,
    expired,
  };
}

// ─── PAYMENT HISTORY ─────────────────────────────────────────────────────────

/**
 * Get payment history for a tenant
 */
export async function getPaymentHistory(tenantId: string): Promise<PaymentRecord[]> {
  const supabase = await getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('tenant_payments')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('submitted_at', { ascending: false });

  if (error) {
    console.error('Error getting payment history:', error);
    return [];
  }

  return (data || []).map((payment: any) => ({
    id: payment.id,
    tenantId: payment.tenant_id,
    paymentType: payment.payment_type as PaymentType,
    plan: payment.plan,
    amount: payment.amount,
    currency: payment.currency,
    method: payment.method,
    upiIdUsed: payment.upi_id_used,
    utr: payment.utr,
    paymentDate: payment.payment_date,
    screenshotUrl: payment.screenshot_url,
    notes: payment.notes,
    status: payment.status as PaymentStatus,
    rejectionReason: payment.rejection_reason,
    reviewedBy: payment.reviewed_by,
    reviewedAt: payment.reviewed_at,
    periodStart: payment.period_start,
    periodEnd: payment.period_end,
    submittedAt: payment.submitted_at,
    createdAt: payment.created_at,
    updatedAt: payment.updated_at,
  }));
}

/**
 * Get pending payment for a tenant (if any)
 */
export async function getPendingPayment(
  tenantId: string
): Promise<PaymentRecord | null> {
  const supabase = await getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('tenant_payments')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'SUBMITTED')
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    tenantId: data.tenant_id,
    paymentType: data.payment_type as PaymentType,
    plan: data.plan,
    amount: data.amount,
    currency: data.currency,
    method: data.method,
    upiIdUsed: data.upi_id_used,
    utr: data.utr,
    paymentDate: data.payment_date,
    screenshotUrl: data.screenshot_url,
    notes: data.notes,
    status: data.status as PaymentStatus,
    rejectionReason: data.rejection_reason,
    reviewedBy: data.reviewed_by,
    reviewedAt: data.reviewed_at,
    periodStart: data.period_start,
    periodEnd: data.period_end,
    submittedAt: data.submitted_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

// ─── PAYMENT CONFIG ──────────────────────────────────────────────────────────

export interface PaymentConfig {
  upiId: string;
  merchantName: string;
  currency: string;
  monthlyPrice: number;
  yearlyPrice: number;
  androidAppAddonPrice: number;
  trialDays: number;
  gracePeriodDays: number;
}

/**
 * Get payment configuration
 */
export async function getPaymentConfig(): Promise<PaymentConfig | null> {
  const supabase = await getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('payment_config')
    .select('*')
    .eq('is_active', true)
    .single();

  if (error || !data) {
    console.error('Error getting payment config:', error);
    return null;
  }

  return {
    upiId: data.upi_id,
    merchantName: data.merchant_name,
    currency: data.currency,
    monthlyPrice: data.monthly_price,
    yearlyPrice: data.yearly_price,
    androidAppAddonPrice: data.android_app_addon_price || 3000,
    trialDays: data.trial_days,
    gracePeriodDays: data.grace_period_days,
  };
}

// ─── HELPER FUNCTIONS ────────────────────────────────────────────────────────

/**
 * Check if subscription is active (TRIAL or ACTIVE)
 */
export async function isSubscriptionActive(tenantId: string): Promise<boolean> {
  const status = await getTenantSubscriptionStatus(tenantId);
  return status === 'TRIAL' || status === 'ACTIVE';
}

/**
 * Check if subscription needs payment
 */
export async function needsPayment(tenantId: string): Promise<boolean> {
  const status = await getTenantSubscriptionStatus(tenantId);
  return status === 'PAYMENT_DUE' || status === 'PAST_DUE' || status === 'EXPIRED';
}

/**
 * Check if subscription is in a restricted state
 */
export async function isRestricted(tenantId: string): Promise<boolean> {
  const status = await getTenantSubscriptionStatus(tenantId);
  return (
    status === 'SUSPENDED' ||
    status === 'EXPIRED' ||
    status === 'CANCELLED' ||
    status === 'PAST_DUE'
  );
}

/**
 * Get user-friendly status message
 */
export function getStatusMessage(status: SubscriptionStatus): string {
  const messages: Record<SubscriptionStatus, string> = {
    TRIAL: 'Free Trial Active',
    ACTIVE: 'Subscription Active',
    PAYMENT_PENDING: 'Payment Under Review',
    PAYMENT_DUE: 'Payment Required',
    PAST_DUE: 'Payment Overdue',
    SUSPENDED: 'Account Suspended',
    EXPIRED: 'Subscription Expired',
    CANCELLED: 'Subscription Cancelled',
    NOT_FOUND: 'Status Unknown',
  };

  return messages[status] || 'Unknown Status';
}

/**
 * Get status badge color
 */
export function getStatusColor(status: SubscriptionStatus): string {
  const colors: Record<SubscriptionStatus, string> = {
    TRIAL: 'bg-blue-100 text-blue-700',
    ACTIVE: 'bg-green-100 text-green-700',
    PAYMENT_PENDING: 'bg-amber-100 text-amber-700',
    PAYMENT_DUE: 'bg-orange-100 text-orange-700',
    PAST_DUE: 'bg-red-100 text-red-700',
    SUSPENDED: 'bg-red-100 text-red-700',
    EXPIRED: 'bg-slate-100 text-slate-700',
    CANCELLED: 'bg-slate-100 text-slate-700',
    NOT_FOUND: 'bg-slate-100 text-slate-500',
  };

  return colors[status] || 'bg-slate-100 text-slate-500';
}
