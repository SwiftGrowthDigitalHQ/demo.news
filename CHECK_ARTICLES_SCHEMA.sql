-- ═══════════════════════════════════════════════════════════════════════════
-- CHECK ARTICLES TABLE SCHEMA
-- Verify if tenant_id column exists
-- ═══════════════════════════════════════════════════════════════════════════

-- Check columns in articles table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'articles'
ORDER BY ordinal_position;

-- Check if tenant_id column specifically exists
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'articles' 
      AND column_name = 'tenant_id'
) AS tenant_id_exists;

-- Check indexes on articles table
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'articles'
  AND schemaname = 'public';
