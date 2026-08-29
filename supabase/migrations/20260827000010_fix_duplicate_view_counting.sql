-- ═══════════════════════════════════════════════════════════════════════════
-- FIX: DUPLICATE VIEW COUNTING PREVENTION
-- 
-- ISSUE: Same session can increment views_count multiple times due to:
-- - React re-renders causing useEffect to run multiple times
-- - Page refreshes within same session
-- - Component remounts
-- 
-- SOLUTION: Add database-level deduplication:
-- - Check if session_id already viewed this article in last 30 seconds
-- - Only increment views_count if it's a new/distinct view
-- - Still record in analytics_events for all tracking
-- 
-- This ensures:
-- - One page load = one view count increment
-- - Multiple opens from same session within 30s = same view
-- - New visit after 30s = legitimate new view
-- - Prevents accidental double-counting
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.track_analytics_event(
  p_event_type text,
  p_page_path text DEFAULT NULL,
  p_article_id uuid DEFAULT NULL,
  p_category_id uuid DEFAULT NULL,
  p_session_id text DEFAULT NULL,
  p_referrer text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_id uuid;
  actor_id uuid;
  normalized_event_type text := btrim(coalesce(p_event_type, ''));
  normalized_session_id text := btrim(coalesce(p_session_id, ''));
  recent_view_exists boolean;
BEGIN
  IF normalized_event_type = '' THEN
    RAISE EXCEPTION 'event_type is required';
  END IF;
  
  IF normalized_session_id = '' THEN
    RAISE EXCEPTION 'session_id is required';
  END IF;
  
  IF p_page_path IS NOT NULL AND char_length(p_page_path) > 500 THEN
    RAISE EXCEPTION 'page_path is too long';
  END IF;
  
  -- RATE LIMITING
  PERFORM public.bump_request_limit('analytics_event', normalized_session_id, date_trunc('minute', now()), 120);
  
  -- GET ACTOR ID
  SELECT id INTO actor_id
  FROM public.users
  WHERE auth_user_id = auth.uid()
    AND deleted_at IS NULL
  LIMIT 1;
  
  -- INSERT ANALYTICS EVENT (always record for tracking purposes)
  INSERT INTO public.analytics_events (
    event_type,
    page_path,
    article_id,
    category_id,
    user_id,
    session_id,
    referrer,
    user_agent,
    metadata
  )
  VALUES (
    normalized_event_type,
    NULLIF(btrim(p_page_path), ''),
    p_article_id,
    p_category_id,
    actor_id,
    normalized_session_id,
    NULLIF(btrim(p_referrer), ''),
    NULLIF(btrim(p_user_agent), ''),
    COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO inserted_id;
  
  -- INCREMENT ARTICLE VIEWS (with deduplication)
  IF normalized_event_type = 'page_view' AND p_article_id IS NOT NULL THEN
    
    -- Check if this session already viewed this article in the last 30 seconds
    SELECT EXISTS (
      SELECT 1
      FROM public.article_views
      WHERE article_id = p_article_id
        AND session_id = normalized_session_id
        AND viewed_at > (now() - interval '30 seconds')
      LIMIT 1
    ) INTO recent_view_exists;
    
    -- Only increment views_count if this is a NEW/DISTINCT view
    IF NOT recent_view_exists THEN
      -- Increment the article's views_count
      UPDATE public.articles
      SET views_count = views_count + 1
      WHERE id = p_article_id
        AND tenant_id IN (SELECT public.get_user_tenant_ids())
        AND deleted_at IS NULL;
      
      -- Store the view in article_views table for deduplication check
      INSERT INTO public.article_views (
        article_id,
        session_id,
        page_path,
        referrer,
        user_agent,
        viewed_at
      )
      VALUES (
        p_article_id,
        normalized_session_id,
        NULLIF(btrim(p_page_path), ''),
        NULLIF(btrim(p_referrer), ''),
        NULLIF(btrim(p_user_agent), ''),
        now()
      );
    END IF;
  END IF;
  
  RETURN inserted_id;
END;
$$;

COMMENT ON FUNCTION public.track_analytics_event IS
  'Records analytics events and increments article views for page_view events with deduplication.
   When event_type = ''page_view'' and article_id is provided:
   - Always records in analytics_events for tracking
   - Only increments articles.views_count if session hasn''t viewed this article in last 30 seconds
   - Prevents duplicate counting from page refreshes, React re-renders, or rapid reloads
   - Allows legitimate new views after 30 second window';

-- ═══════════════════════════════════════════════════════════════════════════
-- UPDATE article_views TABLE CONSTRAINT
-- ═══════════════════════════════════════════════════════════════════════════

-- Remove old ON CONFLICT DO NOTHING logic (was too permissive)
-- We now handle deduplication explicitly in the function above

-- Guard: article_views table is created in 20260830000002_fix_article_views_tracking.sql
-- If it already exists (re-run scenario), apply the comment and index.
-- If it doesn't exist yet, skip gracefully — the later migration will create them.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'article_views'
  ) THEN
    COMMENT ON TABLE public.article_views IS
      'Detailed per-view record for articles with 30-second deduplication window.
       Used to prevent duplicate view counting from same session within short timeframe.
       One row per distinct view (session + article + 30s window).
       Enables detailed analytics and view pattern analysis.';

    CREATE INDEX IF NOT EXISTS idx_article_views_dedup 
      ON public.article_views(article_id, session_id, viewed_at DESC);
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICATION
-- ═══════════════════════════════════════════════════════════════════════════

/*
-- TEST DEDUPLICATION:

-- 1. Get an article ID
SELECT id, slug, title, views_count FROM articles WHERE status = 'published' LIMIT 1;

-- 2. Track same article twice rapidly (should only increment once)
SELECT public.track_analytics_event(
  'page_view', 
  '/article/test-slug', 
  'article-id-here', 
  null, 
  'test-session-123', 
  null, 
  'Mozilla/5.0'
);

SELECT public.track_analytics_event(
  'page_view', 
  '/article/test-slug', 
  'article-id-here', 
  null, 
  'test-session-123', 
  null, 
  'Mozilla/5.0'
);

-- 3. Check views_count (should be +1, not +2)
SELECT id, slug, title, views_count FROM articles WHERE id = 'article-id-here';

-- 4. Check article_views (should have 1 row for this session)
SELECT * FROM article_views 
WHERE article_id = 'article-id-here' 
  AND session_id = 'test-session-123';

-- 5. Wait 31 seconds and track again (should increment)
-- ... wait ...
SELECT public.track_analytics_event(
  'page_view', 
  '/article/test-slug', 
  'article-id-here', 
  null, 
  'test-session-123', 
  null, 
  'Mozilla/5.0'
);

-- Check views_count again (should be +2 now)
SELECT id, slug, title, views_count FROM articles WHERE id = 'article-id-here';
*/
