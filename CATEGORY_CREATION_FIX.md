# 🔧 Category Creation HTTP 409 Error - FIXED

## Problem
**Error**: HTTP 409 - `duplicate key value violates unique constraint "categories_slug_key"`

When trying to create a category with name "Technology", the POST fails with:
```
{
  "code": "23505",
  "message": "duplicate key value violates unique constraint \"categories_slug_key\""
}
```

## Root Cause
The `categories` table in the database has a **GLOBAL unique constraint on `slug`** instead of a **tenant-scoped** constraint.

**Migration `20260613000100`** defined categories with:
```sql
slug text not null unique  -- ❌ WRONG: Global constraint
```

But categories should be tenant-isolated, so each tenant should be able to have their own "technology" category.

## Solution
Created new migration: **`20260914000002_fix_categories_unique_constraint.sql`**

This migration:
1. **Drops** the global unique constraint on `slug`
2. **Creates** a composite unique constraint on `(tenant_id, slug)`
3. **Ensures** each tenant can have independent category slugs

```sql
ALTER TABLE public.categories 
DROP CONSTRAINT categories_slug_key;

ALTER TABLE public.categories
ADD CONSTRAINT categories_tenant_slug_unique UNIQUE (tenant_id, slug);
```

## After Fix
- ✅ Tenant A can have category slug: `technology`
- ✅ Tenant B can ALSO have category slug: `technology`
- ✅ Within the same tenant, slug must still be unique
- ✅ No more HTTP 409 conflicts

## What to Do

### Run in Supabase SQL Editor:
```sql
-- Execute the migration in Supabase Dashboard > SQL Editor:

BEGIN;

ALTER TABLE public.categories 
DROP CONSTRAINT IF EXISTS categories_slug_key;

ALTER TABLE public.categories
ADD CONSTRAINT categories_tenant_slug_unique UNIQUE (tenant_id, slug);

DROP INDEX IF EXISTS idx_categories_slug;
CREATE INDEX IF NOT EXISTS idx_categories_tenant_slug 
ON public.categories(tenant_id, slug)
WHERE deleted_at IS NULL;

COMMIT;
```

### Test After Fix
1. Go to http://localhost:5173/admin/categories
2. Click "New Category"
3. Enter:
   - Name: "Technology"
   - Slug: will auto-populate as "technology"
4. Click "Save Category"
5. Should now return HTTP 200 ✅ (not 409)

## Files
- **Migration**: `supabase/migrations/20260914000002_fix_categories_unique_constraint.sql`
- **Documentation**: `CATEGORY_CREATION_FIX.md`

---

**Status**: Ready to deploy. Migration file created. Needs execution in Supabase.
