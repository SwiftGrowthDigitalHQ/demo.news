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

This happens especially when you:
1. Created category "Technology"
2. Deleted it
3. Try to create it again - **ERROR!**

## Root Cause
**Two issues combined**:

1. **Global unique constraint on slug**: The table had `slug text not null unique` (global, not tenant-scoped)
2. **Constraint includes soft-deleted rows**: Even though the row is marked `deleted_at`, it still counts toward the unique constraint

Result: You cannot reuse a slug even after soft-deleting a category.

## Solution
Created new migration: **`20260914000002_fix_categories_unique_constraint.sql`**

This migration:
1. **Drops** the global unique constraint on `slug`
2. **Creates a UNIQUE INDEX** (not constraint) on `(tenant_id, slug) WHERE deleted_at IS NULL`
3. **Critical**: The `WHERE deleted_at IS NULL` clause excludes soft-deleted rows

### Why UNIQUE INDEX instead of UNIQUE constraint?
- PostgreSQL `UNIQUE` constraints cannot have `WHERE` clauses
- `UNIQUE INDEX` can have `WHERE` clauses for partial uniqueness
- This allows deleted categories to be recreated with the same slug

### Results
- ✅ Different tenants can have category slug "technology"
- ✅ Can delete and recreate category with same slug
- ✅ Uniqueness enforced only on non-deleted rows

## Execute This SQL in Supabase

Go to **Supabase Dashboard → SQL Editor** and run:

```sql
BEGIN;

-- Drop old global unique constraint
ALTER TABLE public.categories 
DROP CONSTRAINT IF EXISTS categories_slug_key;

-- Create unique index scoped to (tenant_id, slug) for non-deleted rows
CREATE UNIQUE INDEX categories_tenant_slug_unique 
ON public.categories(tenant_id, slug)
WHERE deleted_at IS NULL;

-- Create regular index for query performance
CREATE INDEX IF NOT EXISTS idx_categories_tenant_slug_all 
ON public.categories(tenant_id, slug);

COMMIT;
```

## Test After Fix

1. Go to http://localhost:5173/admin/categories
2. Click "New Category"
3. Enter:
   - Name: "Technology"
   - Slug: will auto-populate as "technology"
4. Click "Save Category"
5. Should return **HTTP 200 ✅** (not 409)
6. Delete the category
7. Create it again - should work! ✅

## Files
- **Migration**: `supabase/migrations/20260914000002_fix_categories_unique_constraint.sql`
- **Documentation**: `CATEGORY_CREATION_FIX.md`

---

**Status**: Migration ready. Awaiting Supabase SQL execution.
