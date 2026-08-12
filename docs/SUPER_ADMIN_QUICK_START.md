# Super Admin Quick Start Guide

## 🚀 Getting Started with Super Admin Panel

### ⚠️ IMPORTANT: Security Notice

The Super Admin system is now **hardened with server-side security enforcement**. You **CANNOT** become a super admin through:
- Registration form  
- Customer onboarding  
- Profile updates  
- API requests  

Super admin role can **ONLY** be assigned via:
- **Initial bootstrap** (SQL migration)
- **Existing super admin** (if they choose to create another)

---

## Step-by-Step Setup

### Step 1: Run Security Hardening Migration

Open Supabase SQL Editor and run BOTH migrations in order:

```sql
-- File 1: supabase/migrations/20260812000001_super_admin_extensions.sql
-- This adds Android app fields and other super admin features

-- File 2: supabase/migrations/20260812000002_super_admin_security_hardening.sql
-- This adds security enforcement and RLS policies
```

Or from command line:
```bash
supabase db push
```

---

### Step 2: Create Super Admin Role (if not exists)

```sql
-- Check if super_admin role exists
SELECT * FROM roles WHERE slug = 'super_admin';

-- If not found, create it
INSERT INTO roles (name, slug, description, is_system)
VALUES ('Super Admin', 'super_admin', 'Platform owner with full control', true);
```

---

### Step 3: Bootstrap Your First Super Admin

**⚠️ CRITICAL**: This is a **ONE-TIME** operation. Use with care.

#### Method 1: Using Bootstrap Function (Recommended)
```sql
-- In Supabase SQL Editor ONLY (not via API)
SELECT public.bootstrap_super_admin('your@email.com');

-- Should return: true
```

#### Method 2: Manual SQL (if Method 1 fails)
```sql
-- Step A: Find your auth user ID
SELECT id as auth_user_id, email FROM auth.users WHERE email = 'your@email.com';
-- Copy the auth_user_id

-- Step B: Find super_admin role ID
SELECT id as role_id FROM roles WHERE slug = 'super_admin';
-- Copy the role_id

-- Step C: Update your user (replace with actual IDs)
UPDATE users 
SET role_id = '<role_id_from_step_B>'
WHERE auth_user_id = '<auth_user_id_from_step_A>';
```

**Example with actual IDs**:
```sql
-- If your role_id is: 123e4567-e89b-12d3-a456-426614174000
-- And your auth_user_id is: 789e4567-e89b-12d3-a456-426614174999

UPDATE users 
SET role_id = '123e4567-e89b-12d3-a456-426614174000'
WHERE auth_user_id = '789e4567-e89b-12d3-a456-426614174999';
```

---

### Step 4: Verify Authorization Level

```sql
-- Check your authorization level
SELECT public.get_auth_level();
-- Should return: 'SUPER_ADMIN'

-- Or check directly
SELECT public.is_super_admin();
-- Should return: true
```

---

### Step 5: Access Super Admin Panel

1. **Login** to your SangTX account
2. Navigate to: **`/super-admin`**
3. You should see the Super Admin Dashboard

---

## � Security Features

### Server-Side Enforcement
- ✅ Authorization checked via database functions
- ✅ Cannot be bypassed with browser devtools
- ✅ RLS policies enforce access control
- ✅ Audit logging automatic

### Protection Against
- ❌ Customer attempting to become super admin
- ❌ Role elevation via profile update
- ❌ Tenant A accessing Tenant B data
- ❌ Self-approval of payments
- ❌ Bypassing subscription checks

---

## �🔍 What You'll See

### Dashboard View (`/super-admin`)
- **Platform Metrics**: Total customers, active, trial, revenue
- **Status Breakdown**: Payment due, pending, suspended, cancelled
- **Revenue**: Monthly, yearly, total revenue
- **Alerts**: Expiring subscriptions, overdue accounts

### Customers Tab
- **Search/Filter**: Find customers by name, slug, email, or status
- **Customer Table**: Full list with status, plan, expiry
- **Actions**: View details, activate, suspend, extend trial, cancel

### Payments Tab
- **Pending Queue**: Payments awaiting your approval
- **Approve/Reject**: Review UTR, notes, screenshots
- **History**: View approved and rejected payments

### Settings Tab
- **UPI Configuration**: Update UPI ID and merchant name
- **Pricing**: Set monthly, yearly, android addon prices
- **Trial Period**: Configure trial and grace period duration

### Audit Logs Tab
- **Full Trail**: Every super admin action logged
- **Filter**: By entity type (tenant, payment, config)
- **Details**: Actor, timestamp, metadata

---

## 💡 Common Tasks

### Approve a Payment
1. Go to **Payments** tab
2. Click **Approve** on a pending payment
3. Confirm the action
4. ✅ Customer subscription activated automatically

### Suspend a Customer
1. Go to **Customers** tab
2. Find customer, click **View Details**
3. Click **Suspend** button
4. Enter reason (e.g., "Payment overdue")
5. ✅ Customer access immediately suspended

### Extend a Trial
1. Go to **Customers** tab
2. Find customer, click **View Details**
3. Click **Extend Trial**
4. Enter number of days (e.g., 7)
5. ✅ Trial period extended

### Update Platform Pricing
1. Go to **Settings** tab
2. Modify prices (monthly/yearly/android addon)
3. Click **Save Settings**
4. Confirm the change
5. ✅ New pricing applied to future subscriptions

---

## 🆘 Troubleshooting

### "Access Denied" Error
**Problem**: You're not assigned the super_admin role  
**Solution**: Run Step 3 again to bootstrap the role

### "Supabase not configured" Error
**Problem**: Missing Supabase environment variables  
**Solution**: Check `.env` file has:
```env
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Dashboard Metrics Not Loading
**Problem**: Database migration not run  
**Solution**: Run Step 1 to apply both migrations

### Cannot See Any Customers
**Problem**: No tenants created yet  
**Solution**: Use onboarding flow (`/onboarding`) to create test tenant

### Bootstrap Function Returns Error
**Problem**: User or role doesn't exist  
**Solution**: 
1. Verify user is registered in auth.users
2. Verify super_admin role exists in roles table
3. Use Method 2 (Manual SQL) as fallback

---

## 🔐 Security Best Practices

### DO
✅ Keep super admin credentials **extremely secure**  
✅ Use a strong, unique password  
✅ Enable 2FA on your email account  
✅ Regularly review audit logs  
✅ Limit super admin access to single user  
✅ Document any emergency procedures  

### DON'T
❌ Share super admin credentials  
❌ Create multiple super admins unnecessarily  
❌ Login to super admin on public WiFi  
❌ Store credentials in browser  
❌ Use super admin for daily operations  
❌ Bypass security measures  

---

## 📞 Support

For issues or questions, refer to:
- `docs/SUPER_ADMIN_SECURITY_HARDENING_REPORT.md` - Complete security documentation
- `docs/SUPER_ADMIN_IMPLEMENTATION_REPORT.md` - Full technical documentation
- `docs/TENANTS_MIGRATION.sql` - Tenant schema
- `docs/PAYMENT_SYSTEM_MIGRATION.sql` - Payment system schema

---

## 🎯 What's Next?

After accessing super admin:
1. **Review Dashboard** - Check platform metrics
2. **Verify Customers** - Ensure no unauthorized tenants
3. **Check Payments** - Review any pending approvals
4. **Configure Settings** - Verify pricing and UPI settings
5. **Review Audit Logs** - Check for any unusual activity
6. **Test Customer Flow** - Create a test tenant via onboarding
7. **Document Procedures** - Write internal processes for your team

---

**Last Updated**: August 12, 2026  
**Version**: 2.0.0 (Security Hardened)  
**Status**: Production-Ready 🔐
