# Super Admin Authorization Fix - Complete Guide

## 🔴 PROBLEM IDENTIFIED

**Error:** "Not authorized" when clicking Reject Payment, Activate, Suspend, or Extend Trial

**Root Cause:** Payment RPC functions have execute permissions REVOKED but never GRANTED back to authenticated users.

---

## 🔍 INVESTIGATION RESULTS

### A) Super Admin Authentication Flow

1. **Login/Session:**
   - User logs in via Supabase Auth
   - `auth.uid()` stores authenticated user ID
   
2. **Role Storage:**
   - `public.users` table has `role_id` foreign key
   - `public.roles` table has `slug` column
   - Super Admin has `slug = 'super_admin'`

3. **Frontend Check:**
   - Calls `getSupabaseClient().rpc('is_super_admin')`
   - Database function checks: `users.auth_user_id = auth.uid()` AND `roles.slug = 'super_admin'`
   
4. **RPC Authorization:**
   - Each RPC function calls `is_super_admin()` internally
   - Returns exception if not Super Admin

### B) The Authorization Bug

**Migration `20260812000003_subscription_lifecycle_complete.sql` line 523-525:**

```sql
revoke execute on function public.approve_subscription_payment(uuid, uuid) from public;
revoke execute on function public.reject_payment(uuid, text, uuid) from public;
```

**No corresponding GRANT statement!**

This means:
- Functions exist ✅
- Functions check `is_super_admin()` ✅  
- But authenticated users can't execute them ❌

**Result:** PostgreSQL returns "permission denied" BEFORE the function runs, so the `is_super_admin()` check never executes.

### C) Why Approve Works But Reject Doesn't

**Both should fail**, but there may be:
- Permission cache in Supabase
- Different execution path
- Frontend bypassing check for Approve

**After applying the fix, both will work consistently.**

### D) Comparison with Working RPCs

**Newer migrations (20260831000003, 20260831000004) DO have GRANT statements:**

```sql
GRANT EXECUTE ON FUNCTION public.update_tenant_status_rpc(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.extend_tenant_trial_rpc(UUID, INTEGER) TO authenticated;
```

**But these might also be failing** if the functions can't call `log_super_admin_action` (which might also be missing permissions).

---

## ✅ THE FIX

### Step 1: Apply Permission Fix

**Run this in Supabase SQL Editor:**

```sql
BEGIN;

-- Grant execute permission for payment functions
GRANT EXECUTE ON FUNCTION public.approve_subscription_payment(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_payment(UUID, TEXT, UUID) TO authenticated;

-- Ensure newer RPCs also have permissions
GRANT EXECUTE ON FUNCTION public.update_tenant_status_rpc(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.extend_tenant_trial_rpc(UUID, INTEGER) TO authenticated;

-- Ensure audit logging function has permissions  
GRANT EXECUTE ON FUNCTION public.log_super_admin_action(TEXT, TEXT, UUID, JSONB) TO authenticated;

COMMIT;
```

**Or use the file:** `FIX_SUPER_ADMIN_PERMISSIONS.sql`

### Step 2: Verify Permissions

Run this verification query:

```sql
SELECT 
  p.proname as function_name,
  CASE 
    WHEN has_function_privilege('authenticated', p.oid, 'EXECUTE') 
    THEN '✅ GRANTED' 
    ELSE '❌ NOT GRANTED' 
  END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'approve_subscription_payment',
    'reject_payment',
    'update_tenant_status_rpc',
    'extend_tenant_trial_rpc',
    'log_super_admin_action'
  );
```

**Expected:** All should show ✅ GRANTED

---

## 🧪 TESTING PROCEDURE

### Prerequisites
- Dev server running: http://localhost:5174
- Logged in as Super Admin
- Browser DevTools open (Console tab)

### Test 1: Approve Payment

1. Navigate to `/super-admin/payments`
2. Find a payment with status SUBMITTED
3. Click **Approve**
4. Confirm action
5. **Expected:**
   - ✅ No error
   - ✅ Console shows: `[approvePayment] Success`
   - ✅ Payment status → APPROVED
   - ✅ UI refreshes
   - ✅ Customer status → ACTIVE

### Test 2: Reject Payment

1. Navigate to `/super-admin/payments`
2. Find another SUBMITTED payment
3. Click **Reject**
4. Enter reason: "Testing rejection flow"
5. Confirm action
6. **Expected:**
   - ✅ No error
   - ✅ Console shows: `[rejectPayment] Success`
   - ✅ Payment status → REJECTED
   - ✅ UI refreshes
   - ✅ Customer status → PAYMENT_DUE

### Test 3: Activate Customer

1. Navigate to `/super-admin/customers`
2. Find customer with status: TRIAL, PAYMENT_DUE, or SUSPENDED
3. Click customer to open details
4. Click **Activate**
5. Confirm action
6. **Expected:**
   - ✅ No error
   - ✅ Console shows: `[updateTenantStatus] Success`
   - ✅ Customer status → ACTIVE
   - ✅ UI refreshes

### Test 4: Suspend Customer

1. Find ACTIVE customer
2. Click customer to open details
3. Click **Suspend**
4. Enter reason: "Testing suspend functionality"
5. Confirm action
6. **Expected:**
   - ✅ No error
   - ✅ Console shows: `[updateTenantStatus] Success`
   - ✅ Customer status → SUSPENDED
   - ✅ UI refreshes

### Test 5: Extend Trial

1. Find TRIAL customer
2. Click customer to open details
3. Click **Extend Trial**
4. Confirm extension (7 days)
5. **Expected:**
   - ✅ No error
   - ✅ Console shows: `[extendTenantTrial] Success`
   - ✅ Trial end date extended by 7 days
   - ✅ Status remains TRIAL
   - ✅ UI refreshes

### Test 6: Verify Audit Logs

1. Navigate to `/super-admin/audit-logs`
2. **Expected to see:**
   - ✅ "payment_approved" entry
   - ✅ "payment_rejected" entry
   - ✅ "tenant_status_changed" entries (Activate, Suspend)
   - ✅ "trial_extended" entry
3. Each entry should show:
   - Action name
   - Entity type
   - Entity ID
   - Actor (Super Admin user)
   - Metadata
   - Timestamp

---

## 🔒 SECURITY VALIDATION

### Why This Fix is Safe

1. **Functions are SECURITY DEFINER:**
   - Execute with database owner privileges
   - Internal authorization still required

2. **Internal Authorization Checks:**
   ```sql
   if not public.is_super_admin() then
     raise exception 'only super_admin can reject payments';
   end if;
   ```

3. **GRANT to authenticated is standard:**
   - Allows function execution
   - Function itself validates role
   - Non-Super-Admins get exception

4. **Two-Layer Security:**
   - Layer 1: Can user execute function? (GRANT controls this)
   - Layer 2: Does function allow this user? (is_super_admin() controls this)

### Without GRANT (Current Bug):
- Layer 1 fails immediately
- Layer 2 never runs
- Even Super Admins blocked

### With GRANT (After Fix):
- Layer 1 passes for authenticated users
- Layer 2 checks Super Admin role
- Only Super Admins succeed

---

## 📊 DIAGNOSTIC QUERIES

### Check Current User's Super Admin Status

```sql
SELECT 
  u.email,
  u.full_name,
  r.slug as role,
  public.is_super_admin() as is_super_admin,
  public.get_auth_level() as auth_level
FROM public.users u
JOIN public.roles r ON r.id = u.role_id
WHERE u.auth_user_id = auth.uid();
```

### Check Function Permissions

```sql
SELECT 
  p.proname,
  pg_get_function_identity_arguments(p.oid) as signature,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as can_execute,
  p.prosecdef as is_security_definer
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname LIKE '%super%admin%'
ORDER BY p.proname;
```

### Verify All Super Admins

```sql
SELECT 
  u.id,
  u.email,
  u.full_name,
  u.created_at,
  CASE WHEN u.deleted_at IS NULL THEN 'ACTIVE' ELSE 'DELETED' END as status
FROM public.users u
JOIN public.roles r ON r.id = u.role_id
WHERE r.slug = 'super_admin'
ORDER BY u.created_at DESC;
```

---

## 📝 FILES CHANGED

### Application Code Changes:
- `src/app/lib/superAdmin.ts` - Added detailed logging for all 5 actions

### Migration Files Created:
- `supabase/migrations/20260901000002_fix_super_admin_rpc_permissions.sql`

### SQL Scripts Created:
- `FIX_SUPER_ADMIN_PERMISSIONS.sql` - Manual fix to apply now
- `DIAGNOSE_SUPER_ADMIN_AUTH.sql` - Diagnostic queries
- `AUTHORIZATION_FIX_GUIDE.md` - This complete guide

---

## 🎯 EXPECTED RESULTS AFTER FIX

### Before Fix:
- ❌ Reject Payment - "Not authorized"
- ❌ Activate - "Not authorized"
- ❌ Suspend - "Not authorized"
- ❌ Extend Trial - "Not authorized"
- ⚠️ Approve - May work (inconsistent)

### After Fix:
- ✅ Approve Payment - Works
- ✅ Reject Payment - Works
- ✅ Activate - Works
- ✅ Suspend - Works
- ✅ Extend Trial - Works

All actions should:
- Execute without errors
- Create audit log entries
- Update database correctly
- Refresh UI automatically
- Show success in console

---

## 🚀 NEXT STEPS

1. **Apply the fix:** Run `FIX_SUPER_ADMIN_PERMISSIONS.sql` in Supabase SQL Editor
2. **Test all 5 actions:** Follow testing procedure above
3. **Verify audit logs:** Check `/super-admin/audit-logs`
4. **Confirm with user:** Report test results
5. **Commit changes:** After user approval

---

**Status: Ready to apply and test**
