# Testing Payment Approval Fix

## Quick Test Guide

### Prerequisites

1. ✅ Database fix applied (`FIX_PAYMENT_APPROVAL_BUG.sql` run in Supabase)
2. ✅ Frontend fix deployed (payment.ts line 362 updated)
3. ✅ Logged in as Super Admin
4. ✅ At least one payment with SUBMITTED status exists

---

## Test 1: Approve Payment

### Steps
1. Navigate to: `http://localhost:5173/super-admin/payments`
2. You should see payments with status "Pending"
3. Find the payment for "Fake News" or any other tenant
4. Click the green **"Approve"** button
5. Confirm the action when prompted

### Expected Result
✅ Success message appears  
✅ Payment status changes to "APPROVED"  
✅ Payment disappears from "Pending" tab  
✅ Payment appears in "Approved" tab  
✅ Tenant subscription status becomes "ACTIVE"  
✅ Dashboard counters update

### If It Fails
- **Error: "permission denied for function approve_subscription_payment"**
  - Cause: Database GRANT not applied
  - Fix: Run `FIX_PAYMENT_APPROVAL_BUG.sql` in Supabase SQL Editor

- **Error: "only super_admin can approve payments"**
  - Cause: User is not Super Admin
  - Fix: Login as Super Admin (check email has super_admin role)

- **Error: "payment not found" or "payment already processed"**
  - Cause: Payment already approved/rejected
  - Fix: Find a different payment with SUBMITTED status

---

## Test 2: Reject Payment

### Steps
1. Navigate to: `http://localhost:5173/super-admin/payments`
2. Find a payment with status "Pending"
3. Click the red **"Reject"** button
4. Enter rejection reason: "Test rejection - verifying fix"
5. Click OK/Confirm

### Expected Result
✅ Success message appears  
✅ Payment status changes to "REJECTED"  
✅ Rejection reason is saved  
✅ Payment disappears from "Pending" tab  
✅ Payment appears in "Rejected" tab  
✅ Tenant subscription status remains inactive  
✅ Dashboard counters update

### If It Fails
- **Error: "permission denied for function reject_payment"**
  - Cause: Database GRANT not applied
  - Fix: Run `FIX_PAYMENT_APPROVAL_BUG.sql`

- **Error: "function reject_payment(uuid, uuid, text) does not exist"**
  - Cause: Frontend parameter fix not deployed
  - Fix: Verify payment.ts line 362 has `p_rejection_reason`
  - Rebuild and redeploy: `npm run build`

- **Error: "only super_admin can reject payments"**
  - Cause: User is not Super Admin
  - Fix: Login as Super Admin

---

## Test 3: Browser Console Check

### Steps
1. Open browser Developer Tools (F12)
2. Go to Console tab
3. Perform approve or reject action
4. Check console logs

### Expected Console Output (Approve)
```
[approvePayment] Authorized as Super Admin: { user_id: '...', email: '...', payment_id: '...' }
[approvePayment] Calling approve_subscription_payment RPC
[approvePayment] Success
```

### Expected Console Output (Reject)
```
[rejectPayment] Authorized as Super Admin: { user_id: '...', email: '...', payment_id: '...' }
[rejectPayment] Calling reject_payment RPC
[rejectPayment] Success
```

### If You See Errors
- **"RPC error: permission denied"**
  - Database GRANT not applied
  - Run the SQL fix

- **"RPC error: function does not exist"**
  - Parameter name mismatch
  - Check payment.ts line 362

- **"Authorization failed - not a Super Admin"**
  - User not logged in as Super Admin
  - Check authentication

---

## Test 4: Database Verification

### Check Applied Migration
```sql
SELECT name, executed_at
FROM supabase_migrations.schema_migrations
WHERE name = '20260901000002_fix_super_admin_rpc_permissions'
ORDER BY executed_at DESC;
```

**Expected:** One row with recent timestamp  
**If empty:** Migration not applied, run manual GRANT

---

### Check Function Permissions
```sql
SELECT 
  p.proname,
  CASE
    WHEN has_function_privilege('authenticated', p.oid, 'EXECUTE') 
    THEN '✅ GRANTED'
    ELSE '❌ NOT GRANTED'
  END AS status
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' 
  AND p.proname IN ('approve_subscription_payment', 'reject_payment');
```

**Expected:**
```
proname                      | status
-----------------------------|----------
approve_subscription_payment | ✅ GRANTED
reject_payment               | ✅ GRANTED
```

**If NOT GRANTED:** Run `FIX_PAYMENT_APPROVAL_BUG.sql`

---

### Check Super Admin User
```sql
SELECT 
  u.email,
  u.full_name,
  r.slug
FROM users u
JOIN roles r ON r.id = u.role_id
WHERE r.slug = 'super_admin'
  AND u.deleted_at IS NULL;
```

**Expected:** At least one user with super_admin role  
**If empty:** No Super Admin exists - create one

---

### Check Pending Payments
```sql
SELECT 
  tp.id,
  t.name AS tenant_name,
  tp.amount,
  tp.plan,
  tp.utr,
  tp.status,
  tp.submitted_at
FROM tenant_payments tp
JOIN tenants t ON t.id = tp.tenant_id
WHERE tp.status = 'SUBMITTED'
ORDER BY tp.submitted_at DESC
LIMIT 5;
```

**Expected:** List of payments ready for approval  
**If empty:** Create a test payment first

---

## Test 5: End-to-End Workflow

### Complete Payment Flow Test

1. **Create Payment** (as tenant admin)
   - Login as tenant admin
   - Navigate to subscription dashboard
   - Submit a payment (use test UTR)
   - Verify status becomes PAYMENT_PENDING

2. **Review Payment** (as Super Admin)
   - Login as Super Admin
   - Navigate to `/super-admin/payments`
   - Verify payment appears in Pending tab
   - Verify all payment details are correct

3. **Approve Payment** (as Super Admin)
   - Click Approve button
   - Verify success
   - Check payment moved to Approved tab
   - Check tenant subscription became ACTIVE

4. **Verify Customer Access** (as tenant admin)
   - Login as tenant admin
   - Verify full platform access
   - Verify subscription shows active
   - Verify no payment prompts

5. **Check Audit Trail** (as Super Admin)
   - Navigate to `/super-admin/audit`
   - Verify payment approval logged
   - Verify correct timestamp and actor

---

## Troubleshooting Guide

### Error: "Not authorized"

**Possible Causes:**

1. **Database permissions not granted**
   - Run: `FIX_PAYMENT_APPROVAL_BUG.sql`
   - Verify: Function permissions query above

2. **User is not Super Admin**
   - Check: Super Admin user query above
   - Verify: `SELECT is_super_admin()` returns true

3. **Wrong parameter name**
   - Check: payment.ts line 362
   - Should be: `p_rejection_reason` not `p_reason`

4. **Function doesn't exist**
   - Check: Migration 20260812000003 applied
   - Verify: `\df approve_subscription_payment` in psql

---

### Error: "function does not exist"

**This specific error means:**
- PostgreSQL cannot find a function with the exact signature you're calling
- Usually caused by wrong parameter names or types

**For reject_payment:**
- Check parameter names match:
  - `p_payment_id` (UUID)
  - `p_rejection_reason` (TEXT) ← not `p_reason`
  - `p_reviewed_by_user_id` (UUID)

**Fix:**
- Update payment.ts line 362
- Rebuild and redeploy

---

### Error: "permission denied"

**This specific error means:**
- Function exists
- User is authenticated
- But authenticated role lacks EXECUTE permission

**Fix:**
- Run GRANT statements in `FIX_PAYMENT_APPROVAL_BUG.sql`

---

## Success Criteria

### All Tests Pass When:

✅ Approve payment works without errors  
✅ Reject payment works without errors  
✅ Payment status updates in database  
✅ Tenant subscription activates on approval  
✅ Tenant subscription does NOT activate on rejection  
✅ Dashboard counters are accurate  
✅ Audit logs record all actions  
✅ Non-admin users cannot approve/reject  
✅ Console shows success logs  
✅ Database queries show correct permissions  
✅ No "Not authorized" errors  
✅ No "permission denied" errors  
✅ No "function does not exist" errors  

---

## Quick Checklist

Before testing:
- [ ] Database fix SQL run in Supabase
- [ ] Frontend code updated (payment.ts line 362)
- [ ] Frontend rebuilt and deployed
- [ ] Browser cache cleared
- [ ] Logged in as Super Admin
- [ ] Test payment with SUBMITTED status exists

After testing:
- [ ] Approve works
- [ ] Reject works
- [ ] Console logs clean
- [ ] Database queries pass
- [ ] No error messages
- [ ] Data consistency verified

---

## Next Steps After Successful Testing

1. ✅ Mark bug as RESOLVED
2. ✅ Document fix in changelog
3. ✅ Notify team of fix
4. ✅ Monitor production for 24 hours
5. ✅ Remove diagnostic files (optional)
6. ✅ Update Super Admin user guide (if exists)

---

**Testing Guide Created:** 2026-09-02  
**For Bug:** Payment Approval "Not Authorized"  
**Fix Status:** Applied and ready for testing  
**Expected Outcome:** All payment actions work correctly ✅

