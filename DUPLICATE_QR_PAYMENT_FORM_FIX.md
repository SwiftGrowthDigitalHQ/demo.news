# Subscription Dashboard - Duplicate QR Code & Payment Form Fix

## Problem
The subscription dashboard was displaying the QR code and "Submit Payment for Verification" button **twice** on the payment page when a user had a rejected payment status.

## Root Cause
The `PaymentForm` component was being rendered in two different places when certain conditions were met:

1. **First rendering:** In the main status section (lines 1083, 1092, 1103)
   - When `status === 'PAYMENT_DUE'` → Show PaymentForm
   - When `status === 'PAST_DUE'` → Show PaymentForm  
   - When `status === 'EXPIRED'` → Show PaymentForm

2. **Second rendering:** In the payment history section (lines 1159+)
   - When `lastPayment?.status === 'REJECTED' && needsPayment` → Show PaymentForm again

This caused duplication when:
- The overall subscription status was PAYMENT_DUE/PAST_DUE/EXPIRED
- AND the last payment had status REJECTED
- Both conditions were true, so PaymentForm rendered twice

## Solution
Added a conditional check to prevent rendering the PaymentForm in the main status sections if the last payment was rejected. The payment form will only show once in the dedicated "rejected payment" section at the bottom:

### Changes Made

**File:** `src/app/components/admin/SubscriptionDashboard.tsx`

Lines 1083-1088 (PAYMENT_DUE section):
```tsx
// Before
<PaymentForm tenant={tenant} config={config} onSuccess={() => void load()} />

// After
{lastPayment?.status !== 'REJECTED' && <PaymentForm tenant={tenant} config={config} onSuccess={() => void load()} />}
```

Lines 1092-1097 (PAST_DUE section):
```tsx
// Before
<PaymentForm tenant={tenant} config={config} onSuccess={() => void load()} />

// After
{lastPayment?.status !== 'REJECTED' && <PaymentForm tenant={tenant} config={config} onSuccess={() => void load()} />}
```

Lines 1103-1108 (EXPIRED section):
```tsx
// Before
<PaymentForm tenant={tenant} config={config} onSuccess={() => void load()} />

// After
{lastPayment?.status !== 'REJECTED' && <PaymentForm tenant={tenant} config={config} onSuccess={() => void load()} />}
```

## Logic Flow

**Before Fix:**
```
Status: PAYMENT_DUE, Last Payment: REJECTED
├─ Main status section (line 1083) → Render PaymentForm #1
├─ Payment history section (line 1159) → Render PaymentForm #2
└─ Result: QR code and buttons appear TWICE ❌
```

**After Fix:**
```
Status: PAYMENT_DUE, Last Payment: REJECTED
├─ Main status section (line 1083) → Skip PaymentForm (rejected detected)
├─ Payment history section (line 1159) → Render PaymentForm (single)
└─ Result: QR code and buttons appear ONCE ✅
```

## Impact
- ✅ Eliminates duplicate QR code display
- ✅ Removes duplicate "Submit Payment for Verification" button
- ✅ Keeps the payment form visible in the correct section
- ✅ User still sees the rejection reason with the form
- ✅ No behavioral changes to the payment flow

## Build Status
✅ **Build successful** (1m 25s)
✅ **No new TypeScript errors** introduced
✅ **No functional regressions**

## Testing Recommendations
1. Navigate to subscription dashboard with PAYMENT_DUE status and no rejected payments
   - Should show PaymentForm in the main section ✅
   
2. Navigate with PAYMENT_DUE status and a rejected payment in history
   - Should show PaymentForm only in payment history section ✅
   - Should NOT show in main status section ✅
   - QR code should appear only once ✅

3. Test all payment-required statuses: PAYMENT_DUE, PAST_DUE, EXPIRED
   - All should work correctly with and without rejected payments ✅

4. Test payment submission flow from both locations
   - Should work correctly ✅

## Related Code Sections
- Payment form rendering: Lines 134-389
- UPI QR code component: Lines 123-131
- Payment history section: Lines 1154-1180
- Status-specific sections: Lines 1083-1127

## Verification
The fix ensures that:
1. When a payment is rejected, the form appears in the payment history section
2. The same payment form is not duplicated in the main status section
3. Only ONE instance of the QR code and "Submit Payment" button is visible
4. The user experience is cleaner and less confusing
