# Simple Step-by-Step: Fix Categories HTTP 400 Error

## What's Wrong
Your production Supabase is missing the schema columns and has incorrect RLS policies.

Error: `Column "status" does not exist`

## What You Need to Do

### Step 1: Go to Supabase Dashboard
Open this link in your browser:
```
https://app.supabase.com/project/csuocfxbucohfvowfwtq/sql/new
```

(If you're not logged in, log in with your account)

### Step 2: Copy the Migration SQL
Open this file in your editor:
```
COMPLETE_MIGRATION_TO_RUN_IN_SUPABASE.sql
```

Select ALL the SQL code and copy it.

### Step 3: Paste into Supabase SQL Editor
1. In Supabase SQL Editor, click in the text area
2. Paste the entire SQL code
3. Click the blue "Run" button

### Step 4: Wait for Success
You should see:
```
Success. No rows returned.
```

If you see errors, report them.

### Step 5: Test Category Creation
1. Go to: https://www.sangtx.com/admin/categories
2. Click "New Category"
3. Enter:
   - Name: `Politics`
   - Slug: `politics`
4. Click "Save"
5. **Should work now** ✅

---

## Expected Result

After running the migration:

✅ Create category: Works (no HTTP 400)
✅ Edit category: Works
✅ Delete category: Works
✅ Restore category: Works
✅ Navbar shows category: Works
✅ Category page loads: Works

---

## If It Doesn't Work

Report:
1. The exact error message from Supabase
2. Whether the SQL Editor showed "Success" or an error
3. Whether you're still getting the "Failed to save category" error

---

## The File to Copy

File: `COMPLETE_MIGRATION_TO_RUN_IN_SUPABASE.sql`

This file contains:
- ✅ All missing columns (status, icon, color, cover_image_url, etc.)
- ✅ All indexes for performance
- ✅ All utility functions
- ✅ All triggers for article counts
- ✅ CORRECT RLS policies (using get_user_tenant_ids() instead of auth.jwt())

That's it. Just run this one SQL migration and the categories will work.

---

## After Migration Works

Run locally:
```bash
npm run build
npm run typecheck
npx eslint src/app/lib/categoriesApi.ts
```

Report the results.

---

**That's all you need to do. The code is already fixed in your repo. Just run the SQL migration in Supabase.**
