# ROOT CAUSE ANALYSIS: Rejected Payment Still Shows "Under Review"

## Problem Statement

Customer sees:
- "Your request to switch to Yearly is under review. Please wait for verification."

But payment history shows:
- Status: **REJECTED**
- Rejection reason: "UTR WRONG"
- Current subscription: Monthly ₹499 ACTIVE

This is inconsistent and confusing for the customer.

---

## Root Cause: THE MIGRATION WAS NEVER APPLIED

### Timeline

1. **20260812000003_subscription_lifecycle_complete.sql** (Aug 12)
   - Initial implementation of reject_payment()
   - **BUG:** Does NOT update plan_change_status
   - Only updates: subscription_status = 'PAYMENT_DUE'
   - **Result:** plan_change_status remains 'pending'

2. **20260902000001_fix_subscription_lifecycle.sql** (Sep 2, 11:41 AM)
   - Our fix created and committed
   - Tries to fix reject_payment() with CREATE OR REPLACE
   - **BUT:** Migration was NEVER applied to production database

3. **Now (Sep 3)**
   - Production database still has the OLD buggy version from Aug 12
   - Frontend code reads plan_change_status = 'pending' from DB
   - Shows "under review" message

---

## Current Database State

**Production reject_payment() function (from 20260812000003):**
```sql
-- Update tenant status if it was PAYMENT_PENDING
UPDATE public.tenants
SET subscription_status = 'PAYMENT_DUE'
WHERE id = v_payment.tenant_id
  AND subscription_status = 'PAYMENT_PENDING';
-- ❌ Does NOT update plan_change_status
-- ❌ plan_change_status remains 'pending'
```

**What should happen (our fix in 20260902000001):**
```sql
-- Update tenant status if it was PAYMENT_PENDING
UPDATE public.tenants
SET 
  subscription_status = 'PAYMENT_DUE',
  plan_change_status = 'rejected',  -- ✅ NEW
  updated_at = now()
WHERE id = v_payment.tenant_id
  AND subscription_status = 'PAYMENT_PENDING';
```

---

## Why The Inconsistency Exists

### Flow for Rejected Yearly Upgrade Request

1. Customer submits Yearly ₹5,599 payment
2. System calls `mark_plan_change_pending(tenant_id, 'yearly')`
   - Sets: requested_plan = 'yearly', plan_change_status = 'pending'
3. Admin rejects payment with reason "UTR WRONG"
4. System calls `reject_payment(payment_id, 'UTR WRONG', admin_id)`
   - ✅ Sets: payment.status = 'REJECTED'
   - ✅ Sets: subscription_status = 'PAYMENT_DUE'
   - ❌ **DOES NOT SET:** plan_change_status = 'rejected'
   - ❌ **REMAINS:** plan_change_status = 'pending'

### Database State After Rejection

```
Tenant State:
  subscription_status = 'PAYMENT_DUE' ✅ (Correct)
  subscription_plan = 'monthly' ✅ (Unchanged, correct)
  requested_plan = 'yearly' ✅ (Still there, shows what was requested)
  plan_change_status = 'pending' ❌ (STALE - should be 'rejected')

Payment State:
  status = 'REJECTED' ✅
  rejection_reason = 'UTR WRONG' ✅
  plan = 'yearly' ✅
```

### UI Rendering Logic

**SubscriptionDashboard.tsx:**
```tsx
const changePending = tenant.plan_change_status === 'pending';
const changeRejected = tenant.plan_change_status === 'rejected';

if (changePending) {
  return <div>"Your request to switch to Yearly is under review..."</div>;
}

if (changeRejected) {
  return <div>"Your Yearly upgrade request was rejected"</div>;
}
```

**Current state:**
- changePending = true ← From stale 'pending' status
- changeRejected = false
- **Result:** Shows "under review" ❌

**After fix:**
- changePending = false
- changeRejected = true
- **Result:** Shows "rejected" ✅

---

## The Real Fix

### Previous Fix (Not Applied)

File: `supabase/migrations/20260902000001_fix_subscription_lifecycle.sql`

- ✅ Created
- ✅ Committed (commit 424b53c)
- ✅ Pushed to GitHub
- ❌ **NEVER applied to production database**

### New Comprehensive Fix

File: `supabase/migrations/20260903000001_fix_rejected_payment_lifecycle.sql`

**What it does:**

1. **Updates `reject_payment()` function**
   - Adds: `plan_change_status = 'rejected'`
   - Keeps: `requested_plan` (for UI display)
   - Result: Rejected payment state is now correct

2. **Updates `approve_subscription_payment()` function**
   - Adds: Clear plan_change_status when approved
   - Sets: `plan_change_status = 'none'`
   - Sets: `requested_plan = NULL`
   - Result: Approved payment properly clears state

3. **Fixes existing stale rejected payments**
   - Finds: Tenants with plan_change_status = 'pending' AND REJECTED payments
   - Fixes: Updates plan_change_status = 'rejected'
   - Preserves: Payment rejection reason, current subscription

---

## Deployment Steps

### Step 1: Apply New Migration

```bash
# Connect to Supabase and run:
# supabase/migrations/20260903000001_fix_rejected_payment_lifecycle.sql
```

This will:
- ✅ Fix the reject_payment() function
- ✅ Fix the approve_subscription_payment() function
- ✅ Clear all existing stale rejected payment states

### Step 2: Rebuild Frontend (No Changes Needed)

```bash
npm run build
```

The frontend code was already updated in commit 424b53c to handle 'rejected' status.

### Step 3: Deploy

Deploy the built `dist/` folder.

### Step 4: Verify in Browser

1. Hard refresh: Ctrl+Shift+R
2. Check the affected customer account
3. Should now see: "Your Yearly upgrade request was rejected"
4. Not: "Your request is under review"

---

## After The Fix

### Database State

```
Tenant:
  subscription_status = 'PAYMENT_DUE'
  subscription_plan = 'monthly'
  requested_plan = 'yearly'
  plan_change_status = 'rejected' ✅ (Fixed from 'pending')

Payment:
  status = 'REJECTED'
  rejection_reason = 'UTR WRONG'
```

### UI Display

```
Customer sees:

❌ "Your Yearly upgrade request was rejected"

Rejection reason: UTR WRONG

🔄 "Try Again" button
```

### Customer Options

1. Click "Try Again" to submit new payment
2. Or provide correct UTR and submit again
3. Admin approves new payment
4. Subscription updates to Yearly with correct expiry

---

## Why This Wasn't Caught Earlier

1. **Migration created but not applied** - Created locally, committed, pushed
2. **No automated deployment** - Migration sits in git, never reaches database
3. **Manual application required** - User must apply migration via Supabase dashboard
4. **Different environments** - Local dev ≠ Production

---

## Lessons Learned

1. **Test migration in production after deployment**
   - Check function implementation with: `pg_get_functiondef()`
   - Verify behavior with: test queries

2. **Monitor stale data**
   - After rejection, check: plan_change_status is updated
   - After approval, check: plan_change_status is cleared

3. **Frontend + Backend sync**
   - UI expects: plan_change_status = 'rejected' after rejection
   - Backend must provide this: reject_payment() must set it

---

## Migration Details

### Migration File

**File:** `supabase/migrations/20260903000001_fix_rejected_payment_lifecycle.sql`

**Size:** ~300 lines

**Changes:**
1. CREATE OR REPLACE FUNCTION reject_payment()
2. CREATE OR REPLACE FUNCTION approve_subscription_payment()
3. UPDATE stale rejected plan-change states (data cleanup)

**Safety:**
- ✅ Within transaction (BEGIN/COMMIT)
- ✅ Idempotent (CREATE OR REPLACE)
- ✅ Only updates stale records matching criteria
- ✅ Preserves rejection reason
- ✅ Preserves current subscription

### Verification Query

After migration applied, run:

```sql
-- Should return empty (no stale states remaining)
SELECT 
  t.slug,
  t.subscription_status,
  t.plan_change_status,
  p.status as payment_status
FROM public.tenants t
LEFT JOIN public.tenant_payments p ON p.tenant_id = t.id AND p.status = 'REJECTED'
WHERE t.deleted_at IS NULL
  AND t.plan_change_status = 'pending'
  AND p.id IS NOT NULL;
```

---

## Summary

| Item | Before Fix | After Fix |
|------|-----------|-----------|
| **reject_payment() updates plan_change_status** | ❌ No | ✅ Yes |
| **plan_change_status after rejection** | 'pending' (stale) | 'rejected' |
| **UI message after rejection** | "under review" (wrong) | "rejected" (correct) |
| **Customer can see rejection reason** | ❌ No | ✅ Yes |
| **Customer can retry payment** | ❌ Can't, thinks pending | ✅ Can, sees "Try Again" |
| **Existing stale records** | Not cleaned | ✅ Fixed |

---

**Status: READY TO DEPLOY**

⚠️ **CRITICAL:** Previous migration (20260902000001) is being superseded. We're creating a new, more comprehensive migration (20260903000001) that also includes data cleanup for existing broken records.
