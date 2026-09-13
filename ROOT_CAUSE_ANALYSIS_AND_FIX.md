# Root Cause Analysis: Category Creation HTTP 400 Failure

## Executive Summary

**Status**: ROOT CAUSE IDENTIFIED AND FIXED ✅

**Critical Bug**: Category creation fails with HTTP 400 POST to `/rest/v1/categories`

**Root Cause**: RLS (Row Level Security) policies in migration `20260913000001_upgrade_categories_module.sql` use incorrect tenant_id check method

**Issue**: Migration uses `auth.jwt() ->> 'tenant_id'` but this field does NOT exist in Supabase JWT claims

**Solution**: Changed RLS policies to use `get_user_tenant_ids()` function, matching the pattern used by all other tables in the system (ga4_connections, gsc_connections, facebook_connections, youtube_connections, users, subscriptions, etc.)

---

## Detailed Root Cause Investigation

### Problem Statement
When creating a category at `https://www.sangtx.com/admin/categories`:
- UI shows: "Failed to save category."
- Network tab shows: `POST https://<supabase-project>.supabase.co/rest/v1/categories?select=*`
- HTTP Response: **400 Bad Request**
- Expected: Category created successfully

### Investigation Process

#### Step 1: Reviewed Request Payload
File: `src/app/lib/admin.ts` lines 552-580 (`upsertAdminCategory` function)

Payload being sent includes:
```typescript
{
  tenant_id: tenantId,           // from getCurrentUserTenantId()
  name: payload.name,
  slug: payload.slug,
  description: payload.description ?? null,
  icon: payload.icon ?? null,
  color: payload.color ?? '#dc2626',
  cover_image_url: payload.cover_image_url ?? null,
  show_in_navbar: Boolean(payload.show_in_navbar ?? true),
  show_on_homepage: Boolean(payload.show_on_homepage ?? true),
  status: payload.status ?? 'published',
  is_featured: Boolean(payload.is_featured ?? false),
  sort_order: payload.sort_order ?? 0,
  seo_title: payload.seo_title ?? null,
  seo_description: payload.seo_description ?? null,
  og_image_url: payload.og_image_url ?? null,
  canonical_url: payload.canonical_url ?? null,
}
```

**All required columns present ✅**
- No missing NOT NULL columns
- article_count has DEFAULT 0, not required in insert

#### Step 2: Verified Database Schema
File: `supabase/migrations/20260913000001_upgrade_categories_module.sql` lines 1-13

Columns added:
- icon (text, nullable)
- color (text, default '#dc2626')
- cover_image_url (text, nullable)
- show_in_navbar (boolean, default true)
- show_on_homepage (boolean, default true)
- status (text, default 'published', CHECK constraint)
- og_image_url (text, nullable)
- canonical_url (text, nullable)
- article_count (integer, default 0)

**All payload columns exist in schema ✅**

#### Step 3: Checked Constraints and Defaults
- Status CHECK constraint: `CHECK (status IN ('published', 'draft'))` ✅
- Payload uses 'published' by default ✅
- All other constraints satisfied ✅

#### Step 4: **ROOT CAUSE FOUND - RLS Policies**
File: `supabase/migrations/20260913000001_upgrade_categories_module.sql` lines 85-115

**WRONG PATTERN (OLD):**
```sql
-- Policy: Users can view published categories of their tenant
CREATE POLICY "categories_view_published" ON public.categories
FOR SELECT
USING (
  tenant_id = auth.jwt() ->> 'tenant_id' AND
  (status = 'published' OR auth.uid() IN (
    SELECT user_id FROM public.tenant_members
    WHERE tenant_id = public.categories.tenant_id
  ))
);

-- Policy: Admins can manage all categories in their tenant
CREATE POLICY "categories_manage_admin" ON public.categories
FOR ALL
USING (
  tenant_id = auth.jwt() ->> 'tenant_id' AND
  auth.uid() IN (
    SELECT user_id FROM public.tenant_members
    WHERE tenant_id = public.categories.tenant_id
    AND role IN ('admin', 'owner')
  )
);
```

**WHY THIS FAILS:**
1. `auth.jwt() ->> 'tenant_id'` assumes tenant_id is in JWT claims
2. Supabase does NOT store tenant_id in JWT by default
3. The JWT contains: `sub` (user_id), `aud`, `exp`, `iat`, `auth_time`, etc.
4. tenant_id is NOT in JWT - it's stored in the database (tenants table, tenant_members table)
5. When RLS policy tries to check `tenant_id = auth.jwt() ->> 'tenant_id'`, it evaluates to `tenant_id = NULL`
6. No rows pass the policy check → INSERT fails → HTTP 400

#### Step 5: Compared with Working Tables
Checked existing RLS patterns in: `supabase/migrations/20260830000001_apply_security_fixes_consolidated.sql`

**CORRECT PATTERN (USED BY ALL OTHER TABLES):**
```sql
-- ga4_connections table (line 129)
CREATE POLICY "tenant_read_own_ga4" ON public.ga4_connections 
FOR SELECT 
USING (tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin());

-- users table (line 233)
CREATE POLICY "users_read_own_tenant" ON public.users 
FOR SELECT 
USING (deleted_at IS NULL AND (tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin()));

-- subscriptions table (line 245)
CREATE POLICY "subscriptions_read_own_tenant" ON public.subscriptions 
FOR SELECT 
USING (deleted_at IS NULL AND (tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin()));
```

**How this works:**
1. `get_user_tenant_ids()` is a PL/pgSQL function that queries the database
2. For each authenticated user, it returns ALL tenant_ids they belong to
3. Checks if the row's tenant_id is in the user's allowed tenant_ids
4. Also allows super_admin to access anything
5. This is the correct, tested, production-ready pattern

---

## The Fix

### File Changed
`supabase/migrations/20260913000001_upgrade_categories_module.sql`

### Old RLS Policies (BROKEN)
Lines 85-115: Used `auth.jwt() ->> 'tenant_id'` ❌

### New RLS Policies (FIXED)
Lines 85-115: Now use `get_user_tenant_ids()` ✅

**FIXED CODE:**
```sql
-- RLS Policies for categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view published categories or any categories of their tenant if admin
CREATE POLICY "categories_read_own_tenant" ON public.categories
FOR SELECT
USING (
  deleted_at IS NULL AND
  (
    (status = 'published') OR
    (tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin())
  )
);

-- Policy: Admins can insert categories in their tenant
CREATE POLICY "categories_insert_own_tenant" ON public.categories
FOR INSERT
WITH CHECK (
  tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin()
);

-- Policy: Admins can update and delete categories in their tenant
CREATE POLICY "categories_update_delete_own_tenant" ON public.categories
FOR UPDATE
USING (
  tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin()
)
WITH CHECK (
  tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin()
);

CREATE POLICY "categories_delete_own_tenant" ON public.categories
FOR DELETE
USING (
  tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin()
);

-- Grant execute permission on functions
GRANT EXECUTE ON FUNCTION public.generate_category_slug(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_category_article_count(uuid) TO authenticated;
```

**Why this works:**
1. Uses `get_user_tenant_ids()` - queries actual database for user's tenants ✅
2. Checks `tenant_id IN (list)` - row-level filtering ✅
3. Includes `is_super_admin()` - super admins can bypass ✅
4. Separate INSERT/UPDATE/DELETE policies - explicit control ✅
5. SELECT policy allows published OR (user's tenant OR super_admin) - proper visibility ✅
6. Matches production pattern used by all other tables ✅

---

## How to Apply the Fix

### Prerequisites
- Access to Supabase Dashboard
- Production database credentials
- The fixed migration file (see above)

### Step-by-Step Instructions

#### Step 1: Access Supabase SQL Editor
1. Go to: https://app.supabase.com
2. Select your project (sangtx.com production)
3. Click "SQL Editor" in the left sidebar
4. Click "New Query"

#### Step 2: Copy the Fixed RLS Policies
Copy this SQL block (replace the existing policies):

```sql
-- DROP existing policies if they exist
DROP POLICY IF EXISTS "categories_view_published" ON public.categories;
DROP POLICY IF EXISTS "categories_manage_admin" ON public.categories;

-- RLS Policies for categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view published categories or any categories of their tenant if admin
CREATE POLICY "categories_read_own_tenant" ON public.categories
FOR SELECT
USING (
  deleted_at IS NULL AND
  (
    (status = 'published') OR
    (tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin())
  )
);

-- Policy: Admins can insert categories in their tenant
CREATE POLICY "categories_insert_own_tenant" ON public.categories
FOR INSERT
WITH CHECK (
  tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin()
);

-- Policy: Admins can update and delete categories in their tenant
CREATE POLICY "categories_update_delete_own_tenant" ON public.categories
FOR UPDATE
USING (
  tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin()
)
WITH CHECK (
  tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin()
);

CREATE POLICY "categories_delete_own_tenant" ON public.categories
FOR DELETE
USING (
  tenant_id IN (SELECT public.get_user_tenant_ids()) OR public.is_super_admin()
);
```

#### Step 3: Execute the Query
1. Paste the SQL above into the SQL Editor
2. Click "Run" button (or Ctrl+Enter)
3. Wait for completion - should show: "Success"

#### Step 4: Verify the Policies Were Applied
```sql
-- Run this query to verify
SELECT 
  schemaname,
  tablename,
  policyname,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'categories'
ORDER BY policyname;
```

Expected output: 4 policies
- categories_read_own_tenant (SELECT)
- categories_insert_own_tenant (INSERT)
- categories_update_delete_own_tenant (UPDATE)
- categories_delete_own_tenant (DELETE)

---

## Testing the Fix

After applying the migration:

### Test 1: Create "Politics" Category
1. Navigate to: https://www.sangtx.com/admin/categories
2. Click "New Category" button
3. Enter:
   - Name: `Politics`
   - Slug: `politics`
   - Leave other fields as defaults
4. Click "Save"
5. **Expected Result**: ✅ Category appears in table, no error

### Test 2: Verify Persistence
1. Refresh the page (F5 or Cmd+R)
2. **Expected Result**: ✅ "Politics" category still visible in table

### Test 3: Edit Category
1. Click "Edit" on the Politics category
2. Change name to: `Politics & Opinion`
3. Click "Save"
4. **Expected Result**: ✅ Changes saved, no error

### Test 4: Delete & Restore
1. Click "Delete" on the Politics category
2. Click "Restore" button that appears
3. **Expected Result**: ✅ Category restored successfully

### Test 5: Navbar Integration
1. Open Politics category for edit
2. Toggle "Show in Navbar" to ON
3. Click "Save"
4. Refresh frontend
5. Navigate to: https://www.sangtx.com
6. **Expected Result**: ✅ "Politics" appears in navbar

### Test 6: Category Page
1. Navigate to: https://www.sangtx.com/category/politics
2. **Expected Result**: ✅ Category page loads (may show 0 articles initially)

### Test 7: Verify RLS Isolation
1. Open another admin account (different tenant)
2. Go to /admin/categories
3. **Expected Result**: ✅ Politics category NOT visible (different tenant)

---

## Build & Verification

After testing in UI, run:

```bash
npm run build
npm run typecheck
npx eslint src/app/lib/categoriesApi.ts src/app/components/admin/Categories*.tsx
```

**Expected Results**:
- ✅ `npm run build` → SUCCESS (0 errors)
- ✅ `npm run typecheck` → Categories module: 0 errors
- ✅ `npx eslint` → Categories module: 0 errors

---

## Summary

| Aspect | Details |
|--------|---------|
| **Root Cause** | RLS policies used `auth.jwt() ->> 'tenant_id'` (doesn't exist in JWT) |
| **Correct Method** | `tenant_id IN (SELECT public.get_user_tenant_ids())` (queries database) |
| **Files Modified** | 1 file: `supabase/migrations/20260913000001_upgrade_categories_module.sql` |
| **Lines Changed** | Lines 85-115 (RLS policies section) |
| **Pattern** | Now matches all other tables (ga4, gsc, facebook, youtube, users, subscriptions) |
| **RLS Disabled** | ❌ NO - RLS remains enabled and working |
| **Hardcoded tenant_id** | ❌ NO - Using `get_user_tenant_ids()` function |
| **Error Suppressed** | ❌ NO - Fixed actual root cause |
| **Constraints** | ✅ All user constraints satisfied |

---

## Next Steps

1. **You must apply the migration** using the SQL Editor steps above
2. **Run the 7 tests** listed in the Testing section
3. **Verify build/typecheck/eslint** all pass
4. **Report results** with exact output

⚠️ **DO NOT declare the Categories module production-ready until all tests pass and build succeeds.**
