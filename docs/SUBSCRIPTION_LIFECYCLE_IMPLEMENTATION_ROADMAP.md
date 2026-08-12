# Subscription Lifecycle Implementation Roadmap

## 📋 Overview

This document provides a complete implementation roadmap for the SangTX subscription + payment + access lifecycle system.

**Status**: Database migration created ✅  
**Remaining**: TypeScript implementation needed

---

## 🗂️ Implementation Phases

### Phase 1: Core Subscription Service ✅ MIGRATION CREATED
**File**: `supabase/migrations/20260812000003_subscription_lifecycle_complete.sql`

**Functions Created**:
- `get_tenant_subscription_status(tenant_id)` - Authoritative status calculation
- `can_access_tenant_admin(tenant_id)` - Admin access check
- `can_publish_content(tenant_id)` - Publishing permission check
- `can_access_website(tenant_id)` - Public website access check
- `can_use_android_app(tenant_id)` - Android app access check
- `update_expired_subscriptions()` - Batch status updater
- `approve_subscription_payment(payment_id, user_id)` - Payment approval
- `reject_payment(payment_id, reason, user_id)` - Payment rejection

**Fields Added**:
- `tenants.android_payment_id` - Reference to Android payment
- `tenants.android_app_enabled` - Boolean flag
- `tenant_payments.payment_type` - 'subscription' | 'android_app'

**Status Values**:
- TRIAL, ACTIVE, PAYMENT_PENDING, PAYMENT_DUE, PAST_DUE, SUSPENDED, EXPIRED, CANCELLED

---

### Phase 2: TypeScript Subscription Service
**File**: `src/app/lib/subscriptionService.ts` (TO CREATE)

```typescript
// Core types
export type SubscriptionStatus = 
  | 'TRIAL' | 'ACTIVE' | 'PAYMENT_PENDING' | 'PAYMENT_DUE' 
  | 'PAST_DUE' | 'SUSPENDED' | 'EXPIRED' | 'CANCELLED';

export type PaymentType = 'subscription' | 'android_app';

// Get current subscription status (calls database function)
export async function getTenantSubscriptionStatus(tenantId: string): Promise<SubscriptionStatus>

// Access control checks
export async function canAccessTenantAdmin(tenantId: string): Promise<boolean>
export async function canPublishContent(tenantId: string): Promise<boolean>
export async function canAccessWebsite(tenantId: string): Promise<boolean>
export async function canUseAndroidApp(tenantId: string): Promise<boolean>

// Payment submission
export async function submitPayment(params: {
  tenantId: string;
  plan?: 'monthly' | 'yearly';
  paymentType: PaymentType;
  amount: number;
  utr: string;
  paymentDate: string;
  screenshot?: File;
  notes?: string;
}): Promise<{ success: boolean; paymentId?: string; error?: string }>

// Get tenant payments
export async function getTenantPayments(tenantId: string): Promise<TenantPayment[]>

// Get payment details
export async function getPaymentDetails(paymentId: string): Promise<TenantPayment | null>

// Trial information
export async function getTrialInfo(tenantId: string): Promise<{
  isInTrial: boolean;
  trialEndsAt: string | null;
  daysRemaining: number;
}>
```

**Estimated Lines**: ~400

---

### Phase 3: Customer Billing Page
**File**: `src/app/pages/SubscriptionPage.tsx` (TO CREATE)

**Route**: `/admin/subscription`

**Sections**:
1. **Current Plan Card**
   - Plan type (Monthly ₹499 / Yearly ₹5,599)
   - Status badge with color coding
   - Next billing date
   - Trial countdown if applicable

2. **Android App Add-on Card**
   - Status (Not Requested / Active)
   - Price: ₹3,000 one-time
   - Request/Payment button

3. **Payment Due Section** (if applicable)
   - Amount due
   - Due date
   - UPI payment form
   - Payment instructions

4. **Payment History Table**
   - Date, Amount, Type, Status, UTR
   - View details button
   - Download receipt (future)

5. **UPI Payment Modal**
   - UPI ID: 9229721835-2@ibl (with copy button)
   - Payment instructions
   - UTR input
   - Payment date picker
   - Screenshot upload
   - Notes textarea
   - Submit button

**Estimated Lines**: ~600

---

### Phase 4: Super Admin Customer Creation
**File**: `src/app/components/superadmin/CustomerCreationWizard.tsx` (TO CREATE)

**Steps**:
1. **Basic Information**
   - Publication name
   - Slug (auto-generated, editable)
   - Language selection
   - Description/tagline

2. **Owner Details**
   - Owner name
   - Email
   - Phone
   - Create auth account checkbox

3. **Contact & Branding**
   - Contact phone/email
   - Address, city, district, state, pin
   - Logo upload
   - Primary/secondary colors

4. **Subscription Plan**
   - Monthly ₹499 / Yearly ₹5,599
   - Android App add-on checkbox (₹3,000)
   - Trial duration (default 7 days, adjustable)

5. **Review & Create**
   - Summary of all details
   - Create button

**Functions**:
```typescript
export async function createCustomerTenant(params: {
  name: string;
  slug: string;
  language: string;
  description?: string;
  tagline?: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string;
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
  city?: string;
  district?: string;
  state?: string;
  pin?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  subscriptionPlan: 'monthly' | 'yearly';
  androidAppEnabled: boolean;
  trialDays: number;
}): Promise<{ success: boolean; tenantId?: string; error?: string }>
```

**Estimated Lines**: ~700

---

### Phase 5: Enhanced Super Admin Dashboard
**File**: Update `src/app/components/superadmin/SuperAdminDashboard.tsx`

**New KPIs**:
- Monthly subscribers count
- Yearly subscribers count
- Android customers count
- Revenue breakdown (monthly/yearly/android)
- Pending payments count
- Expiring soon (7 days)
- Past due count

**New Sections**:
- "Payment Due Today" table
- "Expiring in 7 Days" table
- Revenue chart (optional, future)

**Estimated Lines**: +200 to existing file

---

### Phase 6: Access Control Guards
**File**: `src/app/lib/accessControl.tsx` (TO CREATE)

```typescript
// React hook for subscription access
export function useSubscriptionAccess(tenantId?: string) {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [canPublish, setCanPublish] = useState(false);
  const [canAccessAdmin, setCanAccessAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // ... implementation
  
  return {
    status,
    canPublish,
    canAccessAdmin,
    canAccessWebsite,
    loading,
    isExpired,
    isPastDue,
    isPaymentPending,
  };
}

// Higher-order component for protecting routes
export function withSubscriptionAccess<P extends object>(
  Component: React.ComponentType<P>,
  requiredAccess: 'admin' | 'publish' | 'website'
) {
  return function ProtectedComponent(props: P) {
    const access = useSubscriptionAccess();
    
    if (access.loading) {
      return <LoadingScreen />;
    }
    
    if (!access[`can${capitalize(requiredAccess)}`]) {
      return <AccessRestrictedPage status={access.status} />;
    }
    
    return <Component {...props} />;
  };
}
```

**Estimated Lines**: ~300

---

### Phase 7: Public Website Expiry Page
**File**: `src/app/pages/ServiceUnavailablePage.tsx` (TO CREATE)

**Display When**:
- `can_access_website(tenant_id)` returns false
- Status is EXPIRED, PAST_DUE, or SUSPENDED

**Content**:
- Publication logo and name
- "Service Temporarily Unavailable" message
- Clear explanation based on status
- Contact information
- Payment instructions (if PAST_DUE)

**Integration Point**:
Update tenant router in `App.tsx` to check subscription status before rendering public pages.

**Estimated Lines**: ~200

---

### Phase 8: Update Payment Approval UI
**Files to Update**:
- `src/app/components/superadmin/PaymentApprovalPanel.tsx`

**Enhancements**:
- Add payment type filter (Subscription / Android App)
- Show payment type badge
- Different approval flow for Android payments
- Show tenant current subscription when approving
- Confirmation dialog with impact preview

**Estimated Lines**: +150 to existing file

---

### Phase 9: Customer Management Enhancements
**Files to Update**:
- `src/app/components/superadmin/CustomerManagement.tsx`

**Enhancements**:
- Add "Create Customer" button → opens CustomerCreationWizard
- Show more accurate subscription status
- Add "Extend Trial" quick action
- Add "Manual Payment" quick action
- Show days until expiry/past due
- Color-coded status badges

**Estimated Lines**: +200 to existing file

---

## 📊 Implementation Statistics

| Phase | Component | Lines | Priority | Status |
|-------|-----------|-------|----------|--------|
| 1 | Database Migration | 400 | CRITICAL | ✅ Done |
| 2 | Subscription Service | 400 | CRITICAL | ⏳ Pending |
| 3 | Customer Billing Page | 600 | HIGH | ⏳ Pending |
| 4 | Customer Creation | 700 | HIGH | ⏳ Pending |
| 5 | Dashboard Enhancement | 200 | MEDIUM | ⏳ Pending |
| 6 | Access Guards | 300 | CRITICAL | ⏳ Pending |
| 7 | Expiry Page | 200 | HIGH | ⏳ Pending |
| 8 | Payment UI Updates | 150 | MEDIUM | ⏳ Pending |
| 9 | Customer Mgmt Updates | 200 | MEDIUM | ⏳ Pending |
| **TOTAL** | **9 Components** | **~3,150** | | **1/9 Done** |

---

## 🎯 Recommended Implementation Order

### Sprint 1: Core Functionality (CRITICAL)
1. ✅ Database migration
2. ⏳ Subscription Service (`subscriptionService.ts`)
3. ⏳ Access Guards (`accessControl.tsx`)
4. ⏳ Customer Billing Page (`SubscriptionPage.tsx`)

**Outcome**: Customers can view subscription, submit payments, access restricted

---

### Sprint 2: Super Admin Tools (HIGH PRIORITY)
5. ⏳ Customer Creation Wizard
6. ⏳ Payment Approval Updates
7. ⏳ Dashboard Enhancements

**Outcome**: Super admin can create customers, approve payments with full workflow

---

### Sprint 3: Polish & UX (MEDIUM PRIORITY)
8. ⏳ Expiry Page
9. ⏳ Customer Management Updates
10. ⏳ Testing & Bug Fixes

**Outcome**: Professional UX for expired subscriptions, complete testing

---

## 🔧 Quick Start Code Snippets

### Subscription Service Example

```typescript
// src/app/lib/subscriptionService.ts
import { getSupabaseClient } from '../../lib/supabase';

export async function getTenantSubscriptionStatus(
  tenantId: string
): Promise<SubscriptionStatus> {
  const supabase = await getSupabaseClient();
  if (!supabase) throw new Error('Supabase not configured');
  
  const { data, error } = await supabase.rpc('get_tenant_subscription_status', {
    p_tenant_id: tenantId,
  });
  
  if (error) throw error;
  
  return data as SubscriptionStatus;
}

export async function canPublishContent(tenantId: string): Promise<boolean> {
  const supabase = await getSupabaseClient();
  if (!supabase) return false;
  
  const { data, error } = await supabase.rpc('can_publish_content', {
    p_tenant_id: tenantId,
  });
  
  if (error) return false;
  
  return data === true;
}

export async function submitPayment(params: {
  tenantId: string;
  paymentType: 'subscription' | 'android_app';
  plan?: 'monthly' | 'yearly';
  amount: number;
  utr: string;
  paymentDate: string;
  screenshotUrl?: string;
  notes?: string;
}): Promise<{ success: boolean; paymentId?: string; error?: string }> {
  const supabase = await getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase not configured' };
  
  const { data, error } = await supabase
    .from('tenant_payments')
    .insert({
      tenant_id: params.tenantId,
      payment_type: params.paymentType,
      plan: params.plan || null,
      amount: params.amount,
      utr: params.utr,
      payment_date: params.paymentDate,
      screenshot_url: params.screenshotUrl || null,
      notes: params.notes || null,
      upi_id_used: '9229721835-2@ibl',
      status: 'SUBMITTED',
    })
    .select('id')
    .single();
  
  if (error) return { success: false, error: error.message };
  
  // Update tenant status to PAYMENT_PENDING
  await supabase
    .from('tenants')
    .update({ subscription_status: 'PAYMENT_PENDING' })
    .eq('id', params.tenantId);
  
  return { success: true, paymentId: data.id };
}
```

---

## 🧪 Testing Checklist

Once implemented, test this workflow:

### Trial Flow
- [ ] Create new customer with 7-day trial
- [ ] Verify trial_started_at and trial_ends_at set correctly
- [ ] Verify customer can access admin
- [ ] Verify customer can publish articles
- [ ] Verify public website works
- [ ] Verify trial countdown shows correctly
- [ ] Wait for trial to expire (or manually adjust dates)
- [ ] Verify status changes to PAYMENT_DUE

### Payment Flow
- [ ] Customer sees "Payment Due" message
- [ ] Customer can submit payment with UTR
- [ ] Payment appears in Super Admin panel as SUBMITTED
- [ ] Super Admin can view payment details
- [ ] Super Admin approves payment
- [ ] Subscription becomes ACTIVE
- [ ] subscription_ends_at set correctly (now + 1 month/year)
- [ ] Customer regains full access

### Expiry Flow
- [ ] Wait for subscription to expire (or adjust dates)
- [ ] Status becomes PAST_DUE (if in grace period)
- [ ] Customer sees restricted access
- [ ] Eventually becomes EXPIRED
- [ ] Public website shows expiry page
- [ ] Customer can still access billing to submit payment

### Rejection Flow
- [ ] Customer submits payment
- [ ] Super Admin rejects with reason
- [ ] Customer sees rejection message
- [ ] Customer can submit new payment
- [ ] Previous payment preserved in history

### Android App Flow
- [ ] Customer requests Android app add-on
- [ ] Customer submits ₹3,000 payment
- [ ] Payment type = 'android_app'
- [ ] Super Admin approves
- [ ] android_app_enabled = true
- [ ] android_app_status = 'ACTIVE'
- [ ] Android not recurring

### Access Control
- [ ] TRIAL: full access
- [ ] ACTIVE: full access
- [ ] PAYMENT_PENDING: admin access, no publishing
- [ ] PAYMENT_DUE: admin access, no publishing, website down
- [ ] PAST_DUE: restricted
- [ ] EXPIRED: website down, admin billing only
- [ ] SUSPENDED: no access
- [ ] CANCELLED: no access

### Audit Logging
- [ ] Customer creation logged
- [ ] Payment submission logged
- [ ] Payment approval logged
- [ ] Payment rejection logged
- [ ] Trial extension logged
- [ ] Subscription activation logged
- [ ] Android activation logged

---

## 📝 Next Steps

1. **Review Migration**: Run the database migration in a test environment
2. **Implement Phase 2**: Create `subscriptionService.ts`
3. **Implement Phase 3**: Create customer billing page
4. **Implement Phase 6**: Create access control guards
5. **Test Core Flow**: Trial → Payment → Approval → Active
6. **Continue with remaining phases**

---

**Created**: August 12, 2026  
**Status**: Roadmap Complete, Implementation Pending  
**Estimated Total Time**: 2-3 days for complete implementation
