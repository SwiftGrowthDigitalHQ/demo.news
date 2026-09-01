-- ═══════════════════════════════════════════════════════════════════════════
-- QUICK ANALYTICS SCHEMA VERIFICATION
-- Run this first to verify the database state
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Check articles table columns
SELECT 'Articles table columns:' AS check;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'articles'
ORDER BY ordinal_position;

-- 2. Check if tenant_id exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'articles' 
              AND column_name = 'tenant_id'
        ) THEN '✓ tenant_id EXISTS'
        ELSE '✗ tenant_id MISSING - migration needed'
    END AS tenant_id_status;

-- 3. Check analytics tables exist
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'analytics_events')
        THEN '✓ analytics_events exists'
        ELSE '✗ analytics_events MISSING'
    END AS analytics_events_status;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'article_views')
        THEN '✓ article_views exists'
        ELSE '✗ article_views MISSING'
    END AS article_views_status;

-- 4. Count data
SELECT 
    (SELECT COUNT(*) FROM articles) AS total_articles,
    (SELECT COUNT(*) FROM articles WHERE status = 'published') AS published_articles,
    (SELECT COUNT(*) FROM analytics_events) AS analytics_events,
    (SELECT COUNT(*) FROM article_views) AS article_views;

-- 5. Test query (same as application uses)
SELECT 'Testing article query...' AS test;
SELECT id, title, slug, publish_at, status
FROM articles 
WHERE status = 'published' 
  AND deleted_at IS NULL
LIMIT 3;
