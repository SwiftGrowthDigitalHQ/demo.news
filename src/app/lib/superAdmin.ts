import { getSupabaseClient } from '../../lib/supabase';

// ═══════════════════════════════════════════════════════════════════════════
// SUPER ADMIN DATA ACCESS LAYER
// For SangTX platform owner only — manages ALL customer tenants
// ═══════════════════════════════════════════════════════════════════════════

// ─── AUTHORIZATION LEVELS ────────────────────────────────────────────────────

export type AuthLevel = 'NOT_AUTHENTICATED' | 'CUSTOMER' | 'CUSTOMER_ADMIN' | 'SUPER_ADMIN';

export type AuthLevelResult =
  | { kind: 'authorization_result'; level: AuthLevel }
  | { kind: 'rpc_error'; message: string }
  | { kind: 'no_result'; message: string };

// ─── TYPES ───────────────────────────────────────────────────────────────────

export type TenantSubscriptionStatus =
  | 'TRIAL'
  | 'PAYMENT_DUE'
  | 'PAYMENT_PENDING'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'SUSPENDED'
  | 'EXPIRED'
  | 'CANCELLED';

export type SubscriptionPlan = 'monthly' | 'yearly';

export type AndroidAppStatus = 
  | 'NOT_REQUESTED'
  | 'REQUESTED'
  | 'IN_PROGRESS'
  | 'READY'
  | 'ACTIVE';

export type PaymentStatus = 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  tagline: string | null;
  about: string | null;
  language: string;
  
  // Contact
  contact_phone: string | null;
  contact_email: string | null;
  address: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  pin: string | null;
  
  // Branding
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string;
  secondary_color: string;
  
  // SEO
  seo_title: string | null;
  seo_description: string | null;
  
  // Social
  social_links: Record<string, string>;
  
  // Subscription
  subscription_status: TenantSubscriptionStatus;
  subscription_plan: SubscriptionPlan;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  subscription_started_at: string | null;
  subscription_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  grace_period_days: number;
  suspended_at: string | null;
  
  // Android App
  android_app_status: AndroidAppStatus;
  android_app_package_name: string | null;
  android_app_activated_at: string | null;
  
  // Ownership
  owner_auth_user_id: string | null;
  owner_email: string | null;
  owner_name: string | null;
  
  // Audit
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface TenantPayment {
  id: string;
  tenant_id: string;
  plan: SubscriptionPlan;
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
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  period_start: string | null;
  period_end: string | null;
  submitted_at: string;
  created_at: string;
  updated_at: string;
  
  // Joined data
  tenant_name?: string;
  tenant_slug?: string;
}

export interface PaymentConfig {
  id: string;
  upi_id: string;
  merchant_name: string;
  currency: string;
  monthly_price: number;
  yearly_price: number;
  trial_days: number;
  grace_period_days: number;
  android_app_addon_price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlatformMetrics {
  total_customers: number;
  active_customers: number;
  trial_customers: number;
  suspended_customers: number;
  cancelled_customers: number;
  payment_due_customers: number;
  payment_pending_customers: number;
  
  monthly_revenue: number;
  yearly_revenue: number;
  total_revenue: number;
  
  new_customers_this_month: number;
  churned_this_month: number;
  
  expiring_soon: number; // within 7 days
  overdue: number; // past grace period
  
  android_app_requests: number;
  android_apps_active: number;
}

export interface AuditLog {
  id: string;
  actor_user_id: string | null;
  actor_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

// ─── AUTHENTICATION ──────────────────────────────────────────────────────────

/**
 * Get current user's authorization level
 * Uses database function for server-side enforcement
 */
export async function getAuthLevel(): Promise<AuthLevelResult> {
  const supabase = await getSupabaseClient();
  if (!supabase) {
    return { kind: 'no_result', message: 'Supabase is not configured.' };
  }
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { kind: 'authorization_result', level: 'NOT_AUTHENTICATED' };
  
  const { data, error } = await supabase.rpc('get_auth_level');
  if (error) {
    if (import.meta.env.DEV) {
      console.info('[super-admin] Authorization check failed', {
        authUserId: user.id,
        error: error.message,
      });
    }
    return { kind: 'rpc_error', message: error.message };
  }

  if (typeof data !== 'string' || !['NOT_AUTHENTICATED', 'CUSTOMER', 'CUSTOMER_ADMIN', 'SUPER_ADMIN'].includes(data)) {
    if (import.meta.env.DEV) {
      console.info('[super-admin] Authorization check returned no usable result', {
        authUserId: user.id,
        authorizationResult: data ?? null,
      });
    }
    return { kind: 'no_result', message: 'The authorization service returned an invalid result.' };
  }

  if (import.meta.env.DEV) {
    console.info('[super-admin] Authorization check completed', {
      authUserId: user.id,
      authorizationResult: data,
    });
  }
  
  return { kind: 'authorization_result', level: data as AuthLevel };
}

/**
 * Check if current user has super_admin role
 * Uses database function for server-side enforcement
 */
export async function isSuperAdmin(): Promise<boolean> {
  const supabase = await getSupabaseClient();
  if (!supabase) return false;
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  
  // Call database function (server-side check)
  const { data, error } = await supabase.rpc('is_super_admin');
  
  if (error) {
    console.error('Error checking super admin status:', error);
    return false;
  }
  
  return data === true;
}

/**
 * Get current super admin user details
 */
export async function getSuperAdminUser() {
  const supabase = await getSupabaseClient();
  if (!supabase) return null;
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  const { data } = await supabase
    .from('users')
    .select('id, full_name, email, avatar_url, roles!inner(slug)')
    .eq('auth_user_id', user.id)
    .eq('deleted_at', null)
    .maybeSingle();
  
  return data;
}

// ─── PLATFORM METRICS ────────────────────────────────────────────────────────

export async function getPlatformMetrics(): Promise<PlatformMetrics | null> {
  const supabase = await getSupabaseClient();
  if (!supabase) return null;
  
  // Get tenant counts by status
  const { data: tenants } = await supabase
    .from('tenants')
    .select('subscription_status, subscription_plan, subscription_ends_at, android_app_status, created_at')
    .is('deleted_at', null);
  
  if (!tenants) return null;
  
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  let total_customers = tenants.length;
  let active_customers = 0;
  let trial_customers = 0;
  let suspended_customers = 0;
  let cancelled_customers = 0;
  let payment_due_customers = 0;
  let payment_pending_customers = 0;
  let expiring_soon = 0;
  let overdue = 0;
  let android_app_requests = 0;
  let android_apps_active = 0;
  let new_customers_this_month = 0;
  
  tenants.forEach(t => {
    // Status counts
    if (t.subscription_status === 'ACTIVE') active_customers++;
    else if (t.subscription_status === 'TRIAL') trial_customers++;
    else if (t.subscription_status === 'SUSPENDED') suspended_customers++;
    else if (t.subscription_status === 'CANCELLED') cancelled_customers++;
    else if (t.subscription_status === 'PAYMENT_DUE') payment_due_customers++;
    else if (t.subscription_status === 'PAYMENT_PENDING') payment_pending_customers++;
    
    // Expiring soon
    if (t.subscription_ends_at) {
      const endsAt = new Date(t.subscription_ends_at);
      if (endsAt >= now && endsAt <= sevenDaysFromNow) {
        expiring_soon++;
      }
      if (endsAt < now && t.subscription_status !== 'SUSPENDED' && t.subscription_status !== 'CANCELLED') {
        overdue++;
      }
    }
    
    // Android apps
    if (t.android_app_status === 'REQUESTED' || t.android_app_status === 'IN_PROGRESS') {
      android_app_requests++;
    }
    if (t.android_app_status === 'ACTIVE') {
      android_apps_active++;
    }
    
    // New customers this month
    if (new Date(t.created_at) >= startOfMonth) {
      new_customers_this_month++;
    }
  });
  
  // Get payment data for revenue
  const { data: payments } = await supabase
    .from('tenant_payments')
    .select('amount, status, period_start')
    .eq('status', 'APPROVED');
  
  let monthly_revenue = 0;
  let yearly_revenue = 0;
  let total_revenue = 0;
  
  if (payments) {
    payments.forEach(p => {
      total_revenue += p.amount;
      // Approximate monthly vs yearly based on amount (monthly ₹499, yearly ₹5599)
      if (p.amount >= 5000) {
        yearly_revenue += p.amount;
      } else {
        monthly_revenue += p.amount;
      }
    });
  }
  
  // Churn calculation (cancelled this month)
  const { count: churned_this_month } = await supabase
    .from('tenants')
    .select('id', { count: 'exact', head: true })
    .eq('subscription_status', 'CANCELLED')
    .gte('updated_at', startOfMonth.toISOString());
  
  return {
    total_customers,
    active_customers,
    trial_customers,
    suspended_customers,
    cancelled_customers,
    payment_due_customers,
    payment_pending_customers,
    monthly_revenue,
    yearly_revenue,
    total_revenue,
    new_customers_this_month,
    churned_this_month: churned_this_month || 0,
    expiring_soon,
    overdue,
    android_app_requests,
    android_apps_active,
  };
}

// ─── TENANT MANAGEMENT ───────────────────────────────────────────────────────

export async function getAllTenants(filters?: {
  status?: TenantSubscriptionStatus;
  search?: string;
  sortBy?: 'created_at' | 'name' | 'subscription_ends_at';
  sortOrder?: 'asc' | 'desc';
}): Promise<Tenant[]> {
  const supabase = await getSupabaseClient();
  if (!supabase) return [];
  
  let query = supabase
    .from('tenants')
    .select(`
      *,
      users!tenants_owner_auth_user_id_fkey(
        email,
        full_name
      )
    `)
    .is('deleted_at', null);
  
  if (filters?.status) {
    query = query.eq('subscription_status', filters.status);
  }
  
  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,slug.ilike.%${filters.search}%,contact_email.ilike.%${filters.search}%`);
  }
  
  const sortBy = filters?.sortBy || 'created_at';
  const sortOrder = filters?.sortOrder || 'desc';
  query = query.order(sortBy, { ascending: sortOrder === 'asc' });
  
  const { data, error } = await query;
  
  if (error || !data) return [];
  
  // Map joined user data
  return data.map((t: any) => ({
    ...t,
    owner_email: t.users?.email || null,
    owner_name: t.users?.full_name || null,
  }));
}

export async function getTenantById(id: string): Promise<Tenant | null> {
  const supabase = await getSupabaseClient();
  if (!supabase) return null;
  
  const { data, error } = await supabase
    .from('tenants')
    .select(`
      *,
      users!tenants_owner_auth_user_id_fkey(
        email,
        full_name
      )
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();
  
  if (error || !data) return null;
  
  const result: any = data;
  
  return {
    ...result,
    owner_email: result.users?.email || null,
    owner_name: result.users?.full_name || null,
  };
}

export async function createTenant(tenant: {
  slug: string;
  name: string;
  description?: string;
  tagline?: string;
  language: string;
  contact_email?: string;
  contact_phone?: string;
  owner_auth_user_id: string;
  subscription_plan: SubscriptionPlan;
  primary_color?: string;
  secondary_color?: string;
  trial_days?: number;
}): Promise<{ success: boolean; tenant?: Tenant; error?: string }> {
  const supabase = await getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase not configured' };
  
  const config = await getPaymentConfig();
  if (!config) return { success: false, error: 'Payment config not found' };
  
  const now = new Date();
  const trialDays = tenant.trial_days || config.trial_days;
  const trialEnds = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);
  
  const { data, error } = await supabase
    .from('tenants')
    .insert({
      slug: tenant.slug,
      name: tenant.name,
      description: tenant.description || null,
      tagline: tenant.tagline || null,
      language: tenant.language,
      contact_email: tenant.contact_email || null,
      contact_phone: tenant.contact_phone || null,
      primary_color: tenant.primary_color || '#dc2626',
      secondary_color: tenant.secondary_color || '#0f172a',
      owner_auth_user_id: tenant.owner_auth_user_id,
      subscription_status: 'TRIAL',
      subscription_plan: tenant.subscription_plan,
      trial_started_at: now.toISOString(),
      trial_ends_at: trialEnds.toISOString(),
      android_app_status: 'NOT_REQUESTED',
    })
    .select()
    .single();
  
  if (error) return { success: false, error: error.message };
  
  // Log audit
  await logAuditEvent('tenant_created', 'tenant', data.id, {
    tenant_slug: tenant.slug,
    tenant_name: tenant.name,
    subscription_plan: tenant.subscription_plan,
  });
  
  return { success: true, tenant: data as Tenant };
}

export interface CustomerProvisioningInput {
  ownerName: string; email: string; phone?: string; name: string; slug: string;
  tagline?: string; description?: string; address?: string; socialLinks?: Record<string, string>;
  language: 'en' | 'hi' | 'bho'; plan: SubscriptionPlan; androidRequested: boolean;
}

/** Calls the authenticated server-side invitation flow. No password or Auth ID is accepted from the browser. */
export async function provisionCustomer(input: CustomerProvisioningInput): Promise<{ success: boolean; tenant?: Tenant; error?: string }> {
  const supabase = await getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase not configured' };
  const { data, error } = await supabase.functions.invoke('provision-customer', { body: input });
  return error || data?.error ? { success: false, error: data?.error || error?.message } : { success: true, tenant: data.tenant as Tenant };
}

export async function updateTenantStatus(
  tenantId: string,
  status: TenantSubscriptionStatus,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase not configured' };
  
  const updates: Record<string, unknown> = {
    subscription_status: status,
  };
  
  if (status === 'SUSPENDED') {
    updates.suspended_at = new Date().toISOString();
  }
  
  const { error } = await supabase
    .from('tenants')
    .update(updates)
    .eq('id', tenantId);
  
  if (error) return { success: false, error: error.message };
  
  await logAuditEvent('tenant_status_changed', 'tenant', tenantId, {
    new_status: status,
    reason: reason || null,
  });
  
  return { success: true };
}

export async function reactivateTenant(tenantId: string): Promise<{ success: boolean; restoredStatus?: string; error?: string }> {
  const supabase = await getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase not configured' };
  const { data, error } = await supabase.rpc('reactivate_tenant', { p_tenant_id: tenantId });
  return error ? { success: false, error: error.message } : { success: true, restoredStatus: data as string };
}

export async function extendTenantTrial(
  tenantId: string,
  additionalDays: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase not configured' };
  
  const tenant = await getTenantById(tenantId);
  if (!tenant) return { success: false, error: 'Tenant not found' };
  
  const currentEnd = tenant.trial_ends_at ? new Date(tenant.trial_ends_at) : new Date();
  const newEnd = new Date(currentEnd.getTime() + additionalDays * 24 * 60 * 60 * 1000);
  
  const { error } = await supabase
    .from('tenants')
    .update({
      trial_ends_at: newEnd.toISOString(),
      subscription_status: 'TRIAL',
    })
    .eq('id', tenantId);
  
  if (error) return { success: false, error: error.message };
  
  await logAuditEvent('trial_extended', 'tenant', tenantId, {
    additional_days: additionalDays,
    new_trial_end: newEnd.toISOString(),
  });
  
  return { success: true };
}

export async function updateAndroidAppStatus(
  tenantId: string,
  status: AndroidAppStatus,
  packageName?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase not configured' };
  
  const updates: Record<string, unknown> = {
    android_app_status: status,
  };
  
  if (packageName) {
    updates.android_app_package_name = packageName;
  }
  
  if (status === 'ACTIVE') {
    updates.android_app_activated_at = new Date().toISOString();
  }
  
  const { error } = await supabase
    .from('tenants')
    .update(updates)
    .eq('id', tenantId);
  
  if (error) return { success: false, error: error.message };
  
  await logAuditEvent('android_app_status_changed', 'tenant', tenantId, {
    new_status: status,
    package_name: packageName || null,
  });
  
  return { success: true };
}

// ─── PAYMENT MANAGEMENT ──────────────────────────────────────────────────────

export async function getAllPayments(filters?: {
  status?: PaymentStatus;
  tenantId?: string;
  sortBy?: 'submitted_at' | 'amount';
  sortOrder?: 'asc' | 'desc';
}): Promise<TenantPayment[]> {
  const supabase = await getSupabaseClient();
  if (!supabase) return [];
  
  let query = supabase
    .from('tenant_payments')
    .select(`
      *,
      tenants!inner(name, slug),
      users!tenant_payments_reviewed_by_fkey(full_name)
    `);
  
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  
  if (filters?.tenantId) {
    query = query.eq('tenant_id', filters.tenantId);
  }
  
  const sortBy = filters?.sortBy || 'submitted_at';
  const sortOrder = filters?.sortOrder || 'desc';
  query = query.order(sortBy, { ascending: sortOrder === 'asc' });
  
  const { data, error } = await query;
  
  if (error || !data) return [];
  
  return data.map((p: any) => ({
    ...p,
    tenant_name: p.tenants?.name || null,
    tenant_slug: p.tenants?.slug || null,
    reviewed_by_name: p.users?.full_name || null,
  }));
}

export async function approvePayment(
  paymentId: string,
  _periodMonths: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase not configured' };
  
  const admin = await getSuperAdminUser();
  if (!admin) return { success: false, error: 'Not authorized' };
  
  const { error } = await supabase.rpc('approve_subscription_payment', { p_payment_id: paymentId, p_reviewed_by_user_id: admin.id });
  return error ? { success: false, error: error.message } : { success: true };
}

export async function rejectPayment(
  paymentId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase not configured' };
  
  const admin = await getSuperAdminUser();
  if (!admin) return { success: false, error: 'Not authorized' };
  
  if (!reason.trim()) return { success: false, error: 'A rejection reason is required' };
  const { error } = await supabase.rpc('reject_payment', { p_payment_id: paymentId, p_reason: reason.trim(), p_reviewed_by_user_id: admin.id });
  return error ? { success: false, error: error.message } : { success: true };
}

// ─── PAYMENT CONFIG ──────────────────────────────────────────────────────────

export async function getPaymentConfig(): Promise<PaymentConfig | null> {
  const supabase = await getSupabaseClient();
  if (!supabase) return null;
  
  const { data, error } = await supabase
    .from('payment_config')
    .select('*')
    .eq('is_active', true)
    .maybeSingle();
  
  if (error || !data) return null;
  
  return data as PaymentConfig;
}

export async function updatePaymentConfig(config: {
  upi_id?: string;
  merchant_name?: string;
  monthly_price?: number;
  yearly_price?: number;
  trial_days?: number;
  grace_period_days?: number;
  android_app_addon_price?: number;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase not configured' };
  
  const { error } = await supabase
    .from('payment_config')
    .update(config)
    .eq('is_active', true);
  
  if (error) return { success: false, error: error.message };
  
  await logAuditEvent('payment_config_updated', 'payment_config', null, config);
  
  return { success: true };
}

// ─── AUDIT LOGGING ───────────────────────────────────────────────────────────

/**
 * Log a super admin action using server-side function
 * Automatically tracks actor and IP address
 */
export async function logAuditEvent(
  action: string,
  entityType: string,
  entityId: string | null,
  metadata: Record<string, unknown>
): Promise<void> {
  const supabase = await getSupabaseClient();
  if (!supabase) return;
  
  // Use database function for secure logging
  const { error } = await supabase.rpc('log_super_admin_action', {
    p_action: action,
    p_entity_type: entityType,
    p_entity_id: entityId,
    p_metadata: metadata,
  });
  
  if (error) {
    console.error('Error logging audit event:', error);
  }
}

export async function getAuditLogs(filters?: {
  entityType?: string;
  entityId?: string;
  limit?: number;
}): Promise<AuditLog[]> {
  const supabase = await getSupabaseClient();
  if (!supabase) return [];
  
  let query = supabase
    .from('audit_logs')
    .select(`
      *,
      users(full_name)
    `)
    .order('created_at', { ascending: false });
  
  if (filters?.entityType) {
    query = query.eq('entity_type', filters.entityType);
  }
  
  if (filters?.entityId) {
    query = query.eq('entity_id', filters.entityId);
  }
  
  if (filters?.limit) {
    query = query.limit(filters.limit);
  } else {
    query = query.limit(100);
  }
  
  const { data, error } = await query;
  
  if (error || !data) return [];
  
  return data.map((log: any) => ({
    ...log,
    actor_name: log.users?.full_name || null,
  }));
}

// ─── TENANT CONTENT OVERVIEW ────────────────────────────────────────────────

export async function getTenantContentStats(tenantId: string): Promise<{
  articles_count: number;
  published_articles: number;
  draft_articles: number;
  categories_count: number;
  media_count: number;
  users_count: number;
} | null> {
  const supabase = await getSupabaseClient();
  if (!supabase) return null;
  
  // Note: This assumes articles/categories/etc have tenant_id column
  // If using RLS-based isolation instead, this may need adjustment
  
  const { count: articles_count } = await supabase
    .from('articles')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null);
  
  const { count: published_articles } = await supabase
    .from('articles')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'published')
    .is('deleted_at', null);
  
  const { count: draft_articles } = await supabase
    .from('articles')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'draft')
    .is('deleted_at', null);
  
  const { count: categories_count } = await supabase
    .from('categories')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null);
  
  const { count: media_count } = await supabase
    .from('media')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null);
  
  const { count: users_count } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null);
  
  return {
    articles_count: articles_count || 0,
    published_articles: published_articles || 0,
    draft_articles: draft_articles || 0,
    categories_count: categories_count || 0,
    media_count: media_count || 0,
    users_count: users_count || 0,
  };
}
