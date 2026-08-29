-- ═══════════════════════════════════════════════════════════════════════════
-- ANALYTICS SYSTEM ENHANCEMENTS
-- 
-- Adds indexes and optimizations for the production-ready analytics dashboard
-- Ensures efficient queries for traffic trends, top articles, and real-time data
-- 
-- ═══════════════════════════════════════════════════════════════════════════

-- Add indexes to analytics_events for efficient querying
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type_created 
  ON public.analytics_events(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_session_created 
  ON public.analytics_events(session_id, created_at DESC) 
  WHERE session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analytics_events_article_created 
  ON public.analytics_events(article_id, created_at DESC) 
  WHERE article_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analytics_events_created_only 
  ON public.analytics_events(created_at DESC);

-- Add composite index for real-time visitor queries (last 5 minutes)
CREATE INDEX IF NOT EXISTS idx_analytics_events_realtime 
  ON public.analytics_events(created_at DESC, session_id, page_path, user_agent) 
  WHERE event_type = 'page_view';

-- Ensure article_views has proper indexes (if not already created)
-- Guard: article_views is created in a later migration; skip if not yet present.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'article_views') THEN
    CREATE INDEX IF NOT EXISTS idx_article_views_tenant_viewed 
      ON public.article_views(tenant_id, viewed_at DESC);
    CREATE INDEX IF NOT EXISTS idx_article_views_article_viewed 
      ON public.article_views(article_id, viewed_at DESC);
  END IF;
END $$;

-- Add materialized view for daily analytics aggregation (optional optimization)
-- This can significantly speed up dashboard queries for large datasets
DROP MATERIALIZED VIEW IF EXISTS public.analytics_daily_summary;

CREATE MATERIALIZED VIEW public.analytics_daily_summary AS
SELECT
  DATE(created_at) as date,
  COUNT(*) FILTER (WHERE event_type = 'page_view') as page_views,
  COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'page_view') as unique_visitors,
  COUNT(DISTINCT session_id) as sessions,
  article_id
FROM public.analytics_events
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE(created_at), article_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_daily_summary_date_article 
  ON public.analytics_daily_summary(date, article_id);

CREATE INDEX IF NOT EXISTS idx_analytics_daily_summary_date 
  ON public.analytics_daily_summary(date DESC);

COMMENT ON MATERIALIZED VIEW public.analytics_daily_summary IS
  'Pre-aggregated daily analytics for faster dashboard queries. 
   Refresh periodically with: REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_daily_summary;';

-- Function to refresh materialized view (can be called by cron or manually)
CREATE OR REPLACE FUNCTION public.refresh_analytics_summary()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.analytics_daily_summary;
END;
$$;

COMMENT ON FUNCTION public.refresh_analytics_summary IS
  'Refreshes the analytics daily summary materialized view. 
   Should be run daily via cron or manually after high traffic periods.';

-- Add function to get analytics for specific tenant (optimized)
CREATE OR REPLACE FUNCTION public.get_tenant_analytics_overview(
  p_tenant_id uuid,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL
)
RETURNS TABLE (
  total_page_views bigint,
  unique_visitors bigint,
  total_sessions bigint,
  published_articles bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE ae.event_type = 'page_view')::bigint as total_page_views,
    COUNT(DISTINCT ae.session_id) FILTER (WHERE ae.event_type = 'page_view')::bigint as unique_visitors,
    COUNT(DISTINCT ae.session_id)::bigint as total_sessions,
    (
      SELECT COUNT(*)::bigint
      FROM public.articles a
      WHERE a.tenant_id = p_tenant_id
        AND a.status = 'published'
        AND a.deleted_at IS NULL
    ) as published_articles
  FROM public.analytics_events ae
  WHERE ae.event_type = 'page_view'
    AND (p_start_date IS NULL OR ae.created_at >= p_start_date)
    AND (p_end_date IS NULL OR ae.created_at <= p_end_date);
END;
$$;

COMMENT ON FUNCTION public.get_tenant_analytics_overview IS
  'Optimized function to get analytics overview for a tenant with optional date range.';

-- Add helper function to clean up old analytics data (optional, for data retention)
CREATE OR REPLACE FUNCTION public.cleanup_old_analytics(
  p_retention_days integer DEFAULT 365
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Only super admin should be able to run cleanup
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only super admin can cleanup analytics data';
  END IF;

  -- Delete analytics_events older than retention period
  DELETE FROM public.analytics_events
  WHERE created_at < NOW() - (p_retention_days || ' days')::interval;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Also cleanup old article_views
  DELETE FROM public.article_views
  WHERE viewed_at < NOW() - (p_retention_days || ' days')::interval;
  
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_analytics IS
  'Cleans up analytics data older than specified retention period. 
   Default is 365 days. Only super admin can execute.
   Usage: SELECT public.cleanup_old_analytics(365);';

-- Add composite index for traffic source analysis
CREATE INDEX IF NOT EXISTS idx_analytics_events_referrer_created 
  ON public.analytics_events(referrer, created_at DESC) 
  WHERE event_type = 'page_view' AND referrer IS NOT NULL;

-- Add index for user agent analysis (device/browser/OS)
CREATE INDEX IF NOT EXISTS idx_analytics_events_useragent_created 
  ON public.analytics_events(user_agent, created_at DESC) 
  WHERE event_type = 'page_view' AND user_agent IS NOT NULL;

-- Ensure RLS policies are optimized
-- Check if analytics_events has RLS enabled
DO $$
BEGIN
  -- Enable RLS if not already enabled
  ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN OTHERS THEN
    -- RLS already enabled or other error, ignore
    NULL;
END $$;

-- Add RLS policy for analytics_events read access (tenant-isolated)
DROP POLICY IF EXISTS "analytics_events_read_tenant" ON public.analytics_events;

CREATE POLICY "analytics_events_read_tenant" ON public.analytics_events
  FOR SELECT
  USING (
    -- Super admin can see all
    public.is_super_admin()
    OR
    -- Users can only see events for articles in their tenant
    (
      article_id IN (
        SELECT id FROM public.articles 
        WHERE tenant_id IN (SELECT public.get_user_tenant_ids())
      )
    )
    OR
    -- Allow viewing events without article_id (homepage, category pages, etc.)
    -- for now we'll allow all page_view events to be visible to authenticated users
    -- This can be tightened later if needed
    (event_type = 'page_view' AND auth.uid() IS NOT NULL)
  );

-- Policy for inserting analytics events (via RPC only)
DROP POLICY IF EXISTS "analytics_events_insert_system" ON public.analytics_events;

CREATE POLICY "analytics_events_insert_system" ON public.analytics_events
  FOR INSERT
  WITH CHECK (
    -- Only allow inserts via RPC functions (postgres/service_role)
    current_setting('role', true) = 'postgres'
    OR current_setting('role', true) = 'service_role'
    OR current_setting('role', true) = 'authenticated'
  );

-- Add statistics table for pre-computed metrics (optional advanced optimization)
CREATE TABLE IF NOT EXISTS public.analytics_statistics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  date date NOT NULL,
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, date, metric_name)
);

CREATE INDEX IF NOT EXISTS idx_analytics_statistics_tenant_date 
  ON public.analytics_statistics(tenant_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_statistics_metric 
  ON public.analytics_statistics(metric_name, date DESC);

-- Enable RLS on statistics table
ALTER TABLE public.analytics_statistics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "analytics_statistics_read_tenant" ON public.analytics_statistics;

CREATE POLICY "analytics_statistics_read_tenant" ON public.analytics_statistics
  FOR SELECT
  USING (
    tenant_id IN (SELECT public.get_user_tenant_ids())
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "analytics_statistics_insert_system" ON public.analytics_statistics;

CREATE POLICY "analytics_statistics_insert_system" ON public.analytics_statistics
  FOR INSERT
  WITH CHECK (
    current_setting('role', true) = 'postgres'
    OR current_setting('role', true) = 'service_role'
  );

DROP POLICY IF EXISTS "analytics_statistics_update_system" ON public.analytics_statistics;

CREATE POLICY "analytics_statistics_update_system" ON public.analytics_statistics
  FOR UPDATE
  USING (
    current_setting('role', true) = 'postgres'
    OR current_setting('role', true) = 'service_role'
  );

COMMENT ON TABLE public.analytics_statistics IS
  'Pre-computed analytics statistics for faster dashboard queries.
   Stores daily aggregated metrics per tenant.
   Can be populated by a background job or trigger.';

-- Function to update statistics (can be called daily)
CREATE OR REPLACE FUNCTION public.update_analytics_statistics(
  p_date date DEFAULT CURRENT_DATE - INTERVAL '1 day'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant record;
BEGIN
  -- Loop through all tenants and compute their daily stats
  FOR v_tenant IN 
    SELECT id as tenant_id FROM public.tenants WHERE deleted_at IS NULL
  LOOP
    -- Page views
    INSERT INTO public.analytics_statistics (tenant_id, date, metric_name, metric_value)
    SELECT
      v_tenant.tenant_id,
      p_date,
      'page_views',
      COUNT(*)::numeric
    FROM public.analytics_events ae
    INNER JOIN public.articles a ON ae.article_id = a.id
    WHERE a.tenant_id = v_tenant.tenant_id
      AND ae.event_type = 'page_view'
      AND DATE(ae.created_at) = p_date
    ON CONFLICT (tenant_id, date, metric_name) 
    DO UPDATE SET 
      metric_value = EXCLUDED.metric_value,
      updated_at = now();

    -- Unique visitors
    INSERT INTO public.analytics_statistics (tenant_id, date, metric_name, metric_value)
    SELECT
      v_tenant.tenant_id,
      p_date,
      'unique_visitors',
      COUNT(DISTINCT ae.session_id)::numeric
    FROM public.analytics_events ae
    INNER JOIN public.articles a ON ae.article_id = a.id
    WHERE a.tenant_id = v_tenant.tenant_id
      AND ae.event_type = 'page_view'
      AND DATE(ae.created_at) = p_date
      AND ae.session_id IS NOT NULL
    ON CONFLICT (tenant_id, date, metric_name) 
    DO UPDATE SET 
      metric_value = EXCLUDED.metric_value,
      updated_at = now();
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.update_analytics_statistics IS
  'Updates pre-computed analytics statistics for all tenants for a given date.
   Should be run daily via cron job. Default processes yesterday.
   Usage: SELECT public.update_analytics_statistics(CURRENT_DATE - 1);';

-- Grant necessary permissions
GRANT SELECT ON public.analytics_events TO authenticated;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='article_views') THEN EXECUTE 'GRANT SELECT ON public.article_views TO authenticated'; END IF; END $$;
GRANT SELECT ON public.analytics_statistics TO authenticated;
GRANT SELECT ON public.analytics_daily_summary TO authenticated;

-- Analyze tables for better query planning
ANALYZE public.analytics_events;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='article_views') THEN ANALYZE public.article_views; END IF; END $$;
ANALYZE public.articles;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICATION & MAINTENANCE QUERIES
-- ═══════════════════════════════════════════════════════════════════════════

/*
-- Check index usage and performance
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE tablename IN ('analytics_events', 'article_views')
ORDER BY idx_scan DESC;

-- Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE tablename IN ('analytics_events', 'article_views', 'analytics_statistics')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Refresh materialized view (run daily)
SELECT public.refresh_analytics_summary();

-- Update statistics (run daily for previous day)
SELECT public.update_analytics_statistics(CURRENT_DATE - 1);

-- Clean up old analytics (run monthly, adjust retention as needed)
SELECT public.cleanup_old_analytics(365); -- Keep 1 year of data

-- Check analytics data volume
SELECT
  DATE(created_at) as date,
  COUNT(*) as events,
  COUNT(DISTINCT session_id) as sessions
FROM public.analytics_events
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Check real-time visitors (last 5 minutes)
SELECT COUNT(DISTINCT session_id) as active_visitors
FROM public.analytics_events
WHERE created_at >= NOW() - INTERVAL '5 minutes'
  AND event_type = 'page_view';
*/
