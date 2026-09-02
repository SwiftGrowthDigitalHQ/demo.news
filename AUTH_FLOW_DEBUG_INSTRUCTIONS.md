# Authorization Flow Debug Instructions

**Status:** EXECUTE permissions confirmed GRANTED ✅  
**Issue:** "Not authorized" error still occurs  
**Next Step:** Trace the complete authorization chain

---

## Step 1: Run Database Diagnostic (CRITICAL)

Open Supabase SQL Editor and run:

```sql
-- File: DIAGNOSE_AUTH_FLOW_COMPLETE.sql
```

This will show you:
1. Your current `auth.uid()`
2. Whether a user record exists for that auth_user_id
3. What role that user has
4. Whether `is_super_admin()` returns TRUE or FALSE
5. All super admin users in the system

**Look for these specific failures:**

### Failure A: `auth.uid()` is NULL
**Symptom:** Check 1 shows `current_auth_uid` = NULL  
**Cause:** Not logged in or session expired  
**Fix:** Re-login to the application

### Failure B: No user record found
**Symptom:** Check 2 shows "❌ NO USER RECORD FOUND"  
**Cause:** Auth user exists but no matching `users.auth_user_id`  
**Fix:** 
```sql
-- Find your auth user ID first (from Supabase Auth dashboard)
-- Then update the users table:
UPDATE public.users 
SET auth_user_id = 'YOUR_AUTH_UID_HERE'
WHERE email = 'your-super-admin-email@example.com';
```

### Failure C: User has wrong role
**Symptom:** Check 3 shows role_slug = 'admin' or 'editor' (not 'super_admin')  
**Cause:** User exists but has wrong role assigned  
**Fix:**
```sql
UPDATE public.users 
SET role_id = (SELECT id FROM public.roles WHERE slug = 'super_admin')
WHERE auth_user_id = 'YOUR_AUTH_UID_HERE';
```

### Failure D: User has NULL role
**Symptom:** Check 3 shows role_slug = NULL  
**Cause:** User's `role_id` is NULL or points to non-existent role  
**Fix:**
```sql
-- First check if super_admin role exists
SELECT * FROM public.roles WHERE slug = 'super_admin';

-- If it doesn't exist, create it:
INSERT INTO public.roles (slug, name, permissions)
VALUES ('super_admin', 'Super Administrator', '["*"]');

-- Then assign it to your user:
UPDATE public.users 
SET role_id = (SELECT id FROM public.roles WHERE slug = 'super_admin')
WHERE auth_user_id = 'YOUR_AUTH_UID_HERE';
```

### Failure E: super_admin role doesn't exist
**Symptom:** Check 4 returns no rows  
**Cause:** The super_admin role is missing from roles table  
**Fix:**
```sql
INSERT INTO public.roles (slug, name, permissions, deleted_at)
VALUES ('super_admin', 'Super Administrator', '["*"]', NULL)
ON CONFLICT (slug) DO NOTHING;
```

### Failure F: is_super_admin() returns FALSE
**Symptom:** Check 5 shows "❌ FUNCTION RETURNS FALSE"  
**But:** Checks 2-4 all look correct  
**Cause:** RLS policy blocking the query inside `is_super_admin()`  
**Debug:** Compare Check 7 (bypasses RLS) with Check 5 (uses RLS)  
**Fix:** May need to adjust RLS policies on users table

---

## Step 2: Check Frontend Console Logs

After running the SQL diagnostic, deploy the updated frontend code and test:

1. Open Browser DevTools → Console
2. Login as Super Admin
3. Go to `/super-admin/payments`
4. Click **Approve** or **Reject** on a payment
5. Watch the console output

### Expected Console Output (Success):

```
[getSuperAdminUser] Auth user ID: abc123... Email: admin@example.com
[getSuperAdminUser] User record found: { user_id: '...', email: '...', role_id: '...', role: 'super_admin' }
[getSuperAdminUser] ✅ User is Super Admin
[approvePayment] Authorized as Super Admin: { user_id: '...', email: '...', payment_id: '...' }
[approvePayment] Calling approve_subscription_payment RPC
[approvePayment] Success
```

### Diagnostic Console Output (Failure Scenarios):

#### Scenario 1: No auth user
```
[getSuperAdminUser] No authenticated user
[approvePayment] Authorization failed - not a Super Admin
```
**Fix:** Login again

#### Scenario 2: User record not found (with inner join)
```
[getSuperAdminUser] Auth user ID: abc123... Email: admin@example.com
[getSuperAdminUser] No user record found with roles!inner
[getSuperAdminUser] User exists but role_id is: null
[getSuperAdminUser] User may have NULL role_id or role record doesn't exist
[approvePayment] Authorization failed - not a Super Admin
```
**Fix:** Assign super_admin role to user (see SQL above)

#### Scenario 3: User has wrong role
```
[getSuperAdminUser] Auth user ID: abc123... Email: admin@example.com
[getSuperAdminUser] User record found: { user_id: '...', email: '...', role_id: '...', role: 'admin' }
[getSuperAdminUser] User has role: admin but needs super_admin
[approvePayment] Authorization failed - not a Super Admin
```
**Fix:** Update user's role_id to super_admin role (see SQL above)

#### Scenario 4: RPC call fails after authorization
```
[getSuperAdminUser] Auth user ID: abc123... Email: admin@example.com
[getSuperAdminUser] ✅ User is Super Admin
[approvePayment] Authorized as Super Admin: { ... }
[approvePayment] Calling approve_subscription_payment RPC
[approvePayment] RPC error: { code: '...', message: 'only super_admin can approve payments', ... }
```
**This means:** Frontend authorization passed, but database `is_super_admin()` check failed  
**Cause:** Possible mismatch between frontend auth session and database session  
**Fix:** 
1. Check if RLS is blocking the `is_super_admin()` function's query
2. Compare SQL diagnostic Check 5 (function result) with Check 8 (manual check)
3. May need to adjust `is_super_admin()` function or RLS policies

---

## Step 3: Deploy and Test

```bash
cd "/media/sonu/New Volume2/E DRIVE/demo.news/demo.news"

# Build
npm run build

# Deploy
vercel --prod
# OR commit and push for CI/CD
```

---

## Step 4: Verify Database Changes (If Applied)

After applying any SQL fixes, verify:

```sql
-- Check your user has super_admin role
SELECT 
  u.id,
  u.auth_user_id,
  u.email,
  r.slug AS role
FROM public.users u
LEFT JOIN public.roles r ON r.id = u.role_id
WHERE u.email = 'YOUR_EMAIL_HERE'
  AND u.deleted_at IS NULL;

-- Expected: role = 'super_admin'
```

---

## Step 5: Test Payment Actions

1. Login as Super Admin
2. Go to: `http://localhost:5173/super-admin/payments` (or production URL)
3. Click **Approve** on a pending payment
4. Watch console for diagnostic output
5. Verify payment status changes in database:

```sql
SELECT 
  tp.id,
  t.name,
  tp.status,
  tp.reviewed_by,
  tp.reviewed_at,
  t.subscription_status
FROM public.tenant_payments tp
JOIN public.tenants t ON t.id = tp.tenant_id
WHERE tp.id = 'PAYMENT_ID_YOU_JUST_APPROVED'
ORDER BY tp.updated_at DESC;

-- Expected: status = 'APPROVED', subscription_status = 'ACTIVE'
```

---

## Common Root Causes

### 1. Auth User ID Mismatch
**Problem:** `users.auth_user_id` doesn't match Supabase Auth `user.id`  
**Symptoms:** SQL diagnostic Check 2 shows no user found  
**Solution:** Update `auth_user_id` column

### 2. NULL or Invalid role_id
**Problem:** User record exists but `role_id` is NULL or points to deleted/missing role  
**Symptoms:** SQL diagnostic Check 3 shows NULL role  
**Solution:** Assign super_admin role

### 3. Wrong Role Assigned
**Problem:** User has 'admin', 'editor', etc. but not 'super_admin'  
**Symptoms:** SQL diagnostic Check 3 shows wrong role slug  
**Solution:** Update to super_admin role

### 4. RLS Policy Blocking is_super_admin()
**Problem:** RLS on users table blocks the query inside `is_super_admin()`  
**Symptoms:** Check 5 returns FALSE but Check 7 (bypasses RLS) shows user exists  
**Solution:** Adjust RLS policies or make `is_super_admin()` use SECURITY DEFINER

### 5. Frontend Using Different Supabase Client
**Problem:** Frontend and database are using different auth sessions  
**Symptoms:** Frontend says "authorized" but database RPC fails  
**Solution:** Ensure consistent Supabase client initialization

---

## Files Changed in This Update

**Modified:**
- `src/app/lib/superAdmin.ts` - Added comprehensive logging to `getSuperAdminUser()`

**Created:**
- `DIAGNOSE_AUTH_FLOW_COMPLETE.sql` - Complete authorization diagnostic queries
- `AUTH_FLOW_DEBUG_INSTRUCTIONS.md` - This file

---

## What NOT to Do

❌ Do NOT bypass `is_super_admin()` check  
❌ Do NOT return TRUE unconditionally  
❌ Do NOT disable RLS  
❌ Do NOT hardcode user IDs  
❌ Do NOT remove authorization checks  

✅ DO find and fix the root cause  
✅ DO preserve all security checks  
✅ DO use diagnostic logging  
✅ DO validate with real database queries  

---

## Success Criteria

The fix is successful when:

1. ✅ SQL diagnostic shows `is_super_admin()` returns TRUE
2. ✅ Frontend console shows "✅ User is Super Admin"
3. ✅ Frontend console shows "Success" after approve/reject
4. ✅ Database payment status updates to APPROVED/REJECTED
5. ✅ Tenant subscription activates on approval
6. ✅ Non-super-admin users still cannot approve/reject
7. ✅ No "Not authorized" errors

---

## Next Steps After Identifying Root Cause

1. Apply the appropriate SQL fix from this document
2. Deploy the updated frontend code (already includes diagnostic logging)
3. Test with real Super Admin account
4. Verify database changes persist
5. Test with non-admin account to ensure authorization still works
6. Document the exact root cause found
7. Remove or reduce diagnostic logging if desired (optional)

---

**Instructions Created:** 2026-09-02  
**Status:** Ready for diagnosis  
**Action Required:** Run DIAGNOSE_AUTH_FLOW_COMPLETE.sql while logged in as Super Admin

