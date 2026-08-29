-- ═══════════════════════════════════════════════════════════════════════════
-- FIX: ARTICLE VIEWS TRACKING
-- 
-- BUG: track_analytics_event only records analytics events but does NOT
-- increment articles.views_count, causing dashboard to show "0 views"
-- 
-- FIX: Modify the RPC to increment views_count when event_type = 'page_view'
-- and article_id is provided.
-- 
-- This ensures:
-- - Public article page views increase the article's views_count
-- - Dashboard "Total Views" shows real data
-- - News Management shows actual view counts per article
-- - Analytics chart connects to real article views
-- 
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
  
  -- INSERT ANALYTICS EVENT
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
  
  -- CRITICAL FIX: Increment article views_count for page_view events
  -- This ensures dashboard and news management show REAL view counts
  IF normalized_event_type = 'page_view' AND p_article_id IS NOT NULL THEN
    -- Increment the article's views_count
    UPDATE public.articles
    SET views_count = views_count + 1
    WHERE id = p_article_id
      AND tenant_id IN (SELECT public.get_user_tenant_ids())
      AND deleted_at IS NULL;
    
    -- Also store the view in a separate article_views table for detailed analytics
    -- (This prevents race conditions on high-traffic articles)
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
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN inserted_id;
END;
$$;

COMMENT ON FUNCTION public.track_analytics_event IS
  'Records analytics events and increments article views for page_view events.
   When event_type = ''page_view'' and article_id is provided, automatically increments
   articles.views_count to track real article view counts.
   Used by public article pages, category pages, and homepage to track real engagement.';

-- ═══════════════════════════════════════════════════════════════════════════
-- CREATE ARTICLE_VIEWS TABLE FOR DETAILED VIEW TRACKING
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.article_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  page_path text,
  referrer text,
  user_agent text,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_article_views_article_id ON public.article_views(article_id);
CREATE INDEX IF NOT EXISTS idx_article_views_session_id ON public.article_views(session_id);
CREATE INDEX IF NOT EXISTS idx_article_views_viewed_at ON public.article_views(viewed_at DESC);

COMMENT ON TABLE public.article_views IS
  'Detailed per-view record for articles. 
   One row per page view (deduplicated by session_id for same article in short time).
   Used for detailed analytics and view pattern analysis.';

COMMENT ON COLUMN public.article_views.article_id IS
  'Article being viewed. Tenant isolation enforced by article RLS policies.';

COMMENT ON COLUMN public.article_views.session_id IS
  'Session ID for deduplication. Multiple views from same session in short time are counted once.';

-- Add tenant_id to article_views for easier tenant-based queries
ALTER TABLE public.article_views
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

COMMENT ON COLUMN public.article_views.tenant_id IS
  'Tenant this view belongs to. Derived from article.tenant_id via trigger.';

-- Create trigger to automatically set tenant_id from article
CREATE OR REPLACE FUNCTION public.set_article_views_tenant_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT tenant_id INTO NEW.tenant_id
  FROM public.articles
  WHERE id = NEW.article_id
  LIMIT 1;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_article_views_tenant_id ON public.article_views;
CREATE TRIGGER set_article_views_tenant_id
  BEFORE INSERT ON public.article_views
  FOR EACH ROW
  EXECUTE FUNCTION public.set_article_views_tenant_id();

-- Enable RLS on article_views
ALTER TABLE public.article_views ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "article_views_read_own_tenant" ON public.article_views;
DROP POLICY IF EXISTS "article_views_insert_system" ON public.article_views;

-- Create RLS policies
CREATE POLICY "article_views_read_own_tenant" ON public.article_views
  FOR SELECT
  USING (
    tenant_id IN (SELECT public.get_user_tenant_ids())
    OR public.is_super_admin()
  );

-- System/RPC can insert views
CREATE POLICY "article_views_insert_system" ON public.article_views
  FOR INSERT
  WITH CHECK (
    current_setting('role', true) = 'postgres'
    OR current_setting('role', true) = 'service_role'
  );

-- Create function to get article view statistics (for dashboard)
CREATE OR REPLACE FUNCTION public.get_article_view_stats()
RETURNS TABLE (
  total_views bigint,
  articles_with_views bigint,
  avg_views_per_article numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(a.views_count), 0) AS total_views,
    COUNT(DISTINCT CASE WHEN a.views_count > 0 THEN a.id END) AS articles_with_views,
    COALESCE(AVG(a.views_count::numeric), 0) AS avg_views_per_article
  FROM public.articles a
  WHERE a.tenant_id IN (SELECT public.get_user_tenant_ids())
    AND a.deleted_at IS NULL;
END;
$$;

COMMENT ON FUNCTION public.get_article_view_stats IS
  'Returns article view statistics for the current tenant. Used by dashboard.';

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES
-- ═══════════════════════════════════════════════════════════════════════════

/*
-- Before fix:
-- Open an article → analytics_events gets record, articles.views_count stays 0
-- Dashboard shows "Total Views: 0" even though article was opened

-- After fix:
-- Open an article → analytics_events gets record AND articles.views_count increments
-- Dashboard shows "Total Views: X" where X = actual article views
-- News Management shows real view count per article

-- TEST:
-- 1. Find an article ID
SELECT id, slug, title, views_count FROM articles WHERE tenant_id IN (SELECT get_user_tenant_ids()) LIMIT 5;

-- 2. Open the article via public website (or simulate with RPC)
-- SELECT public.track_analytics_event('page_view', '/article/test-slug', 'article-id-here', ...);

-- 3. Check if views_count incremented
SELECT id, slug, title, views_count FROM articles WHERE id = 'article-id-here';
*/
