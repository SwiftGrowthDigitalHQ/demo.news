-- ═══════════════════════════════════════════════════════════════════════════
-- ANALYTICS PAGE FIX - DATABASE VERIFICATION & REPAIR
-- ═══════════════════════════════════════════════════════════════════════════
-- Run this in Supabase SQL Editor to verify and fix the database state
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1: VERIFY ARTICLES TABLE SCHEMA
-- ─────────────────────────────────────────────────────────────────────────────

SELECT 'Checking articles table schema...' AS step;

-- Check if tenant_id column exists in articles table
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'articles' 
              AND column_name = 'tenant_id'
        ) THEN '✓ tenant_id column EXISTS in articles table'
        ELSE '✗ tenant_id column MISSING from articles table - MIGRATION NEEDED'
    END AS tenant_id_status;

-- Show all columns in articles table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'articles'
ORDER BY ordinal_position;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2: CHECK EXISTING DATA
-- ─────────────────────────────────────────────────────────────────────────────

SELECT 'Checking existing articles data...' AS step;

-- Count articles by tenant_id status (only if column exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'articles' 
          AND column_name = 'tenant_id'
    ) THEN
        RAISE NOTICE 'Articles with tenant_id: %', (SELECT COUNT(*) FROM articles WHERE tenant_id IS NOT NULL);
        RAISE NOTICE 'Articles without tenant_id (legacy): %', (SELECT COUNT(*) FROM articles WHERE tenant_id IS NULL);
        RAISE NOTICE 'Total articles: %', (SELECT COUNT(*) FROM articles);
    ELSE
        RAISE NOTICE 'tenant_id column does not exist - migration not applied yet';
    END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 3: VERIFY ANALYTICS TABLES
-- ─────────────────────────────────────────────────────────────────────────────

SELECT 'Checking analytics tables...' AS step;

-- Check analytics_events table
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
              AND table_name = 'analytics_events'
        ) THEN '✓ analytics_events table exists'
        ELSE '✗ analytics_events table MISSING'
    END AS analytics_events_status;

-- Check article_views table
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
              AND table_name = 'article_views'
        ) THEN '✓ article_views table exists'
        ELSE '✗ article_views table MISSING'
    END AS article_views_status;

-- Count analytics data
SELECT 
    (SELECT COUNT(*) FROM analytics_events) AS analytics_events_count,
    (SELECT COUNT(*) FROM article_views) AS article_views_count;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 4: VERIFY RLS POLICIES
-- ─────────────────────────────────────────────────────────────────────────────

SELECT 'Checking RLS policies...' AS step;

-- Check RLS policies on articles table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('articles', 'analytics_events', 'article_views')
ORDER BY tablename, policyname;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 5: VERIFY INDEXES
-- ─────────────────────────────────────────────────────────────────────────────

SELECT 'Checking indexes...' AS step;

-- Check indexes on articles table
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('articles', 'analytics_events', 'article_views')
  AND schemaname = 'public'
ORDER BY tablename, indexname;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 6: TEST ANALYTICS QUERY (SAFE READ-ONLY)
-- ─────────────────────────────────────────────────────────────────────────────

SELECT 'Testing analytics query...' AS step;

-- Test query similar to what the application runs
-- This will fail if tenant_id doesn't exist
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'articles' 
          AND column_name = 'tenant_id'
    ) THEN
        -- Test query with tenant_id filter
        RAISE NOTICE 'Testing article query with tenant_id filter...';
        PERFORM id, title, slug, publish_at, tenant_id
        FROM articles 
        WHERE status = 'published' 
          AND deleted_at IS NULL
        LIMIT 5;
        RAISE NOTICE '✓ Query with tenant_id succeeded';
    ELSE
        RAISE NOTICE '⚠ Skipping query test - tenant_id column missing';
    END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- DIAGNOSIS SUMMARY
-- ─────────────────────────────────────────────────────────────────────────────

SELECT 'Diagnosis complete!' AS step;

SELECT 
    'If tenant_id column is MISSING, run migration: 20260824000001_multi_tenant_architecture.sql' AS action_required;

SELECT 
    'If tenant_id column EXISTS, the application code fixes should resolve the issue' AS resolution;

SELECT 
    'Application fixes applied:
    1. getAnalyticsOverview() - conditional tenant_id filter
    2. getTopArticles() - conditional tenant_id filter
    Both functions now handle NULL tenant_id gracefully' AS code_changes;
