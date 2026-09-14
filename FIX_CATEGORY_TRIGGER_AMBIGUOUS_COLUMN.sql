-- FIX: Ambiguous column reference in update_category_article_count function
-- Error: "column reference \"category_id\" is ambiguous"
-- Root Cause: Function parameter 'category_id' shadows table column 'category_id'
-- Solution: Qualify the column reference to disambiguate

-- Run this SQL in Supabase SQL Editor to fix the trigger function

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

-- Verify the fix by testing article creation
-- After running this SQL, articles can be created/updated without HTTP 400 errors
