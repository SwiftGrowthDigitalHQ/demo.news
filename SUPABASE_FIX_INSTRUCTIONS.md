# 🔧 Supabase Database Fix Required

## Problem
Article creation is failing with HTTP 400 error:
```
Error Code: 42702
Message: "column reference \"category_id\" is ambiguous"
Details: "It could refer to either a PL/pgSQL variable or a table column."
```

## Root Cause
The database trigger function `update_category_article_count()` has an ambiguous column reference where the function parameter `category_id` shadows the table column `category_id`.

## Solution

### Step 1: Go to Supabase Dashboard
1. Open https://app.supabase.com/
2. Select your project: `csuocfxbucohfvowfwtq`
3. Navigate to: **SQL Editor**

### Step 2: Run the Fix SQL

Copy and paste this entire SQL statement into the Supabase SQL Editor and click **Run**:

```sql
-- Fix: Qualify column references to remove ambiguity
CREATE OR REPLACE FUNCTION public.update_category_article_count(category_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.categories
  SET article_count = (
    SELECT COUNT(*) FROM public.articles
    WHERE articles.category_id = $1 AND articles.deleted_at IS NULL
  )
  WHERE id = $1;
END;
$$;
```

### Step 3: Verify the Fix
1. Go back to http://localhost:5173/admin/news
2. Click "New Article"
3. Fill in:
   - **Title**: Test Article
   - **Slug**: test-article
   - **Category**: Bihar News
   - **Content**: Some content here (at least one line)
   - **Excerpt**: (LEAVE EMPTY - this is now optional!)
4. Click "Save Article"
5. Should now return HTTP 200 ✅ (not 400)

## What Changed
- Before: `WHERE category_id = $1` ❌ Ambiguous - could refer to parameter or column
- After: `WHERE articles.category_id = $1` ✅ Clear - refers to articles table column

## Files Updated
- ✅ Frontend: NewsManagement.tsx - excerpt now optional
- ✅ Backend: admin.ts - handles empty excerpt
- ✅ Migration file: 20260913000001_upgrade_categories_module.sql - fixed trigger function
- ⏳ Database: Needs this SQL to be executed in Supabase

---

**After you run this SQL, articles will save successfully!**
