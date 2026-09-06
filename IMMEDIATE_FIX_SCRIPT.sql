-- ============================================================================
-- IMMEDIATE FIX: Remove old incompatible Google Drive connections
-- ============================================================================
-- 
-- PROBLEM: Existing connections have tokens encrypted with padEnd() method
-- New functions try to decrypt with atob() method → incompatibility
-- 
-- SOLUTION: Delete all old connections so users must reconnect
-- New OAuth flow will encrypt tokens with correct atob() method
--
-- EXECUTION: Run this SQL in Supabase dashboard SQL editor
-- Project: csuocfxbucohfvowfwtq
--
-- ============================================================================

-- 1. List all connections BEFORE deletion (for audit)
SELECT 
  id,
  tenant_id,
  status,
  deleted_at,
  google_account_email,
  created_at
FROM tenant_google_drive_connections
ORDER BY created_at DESC;

-- 2. Count connections by status
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN deleted_at IS NULL THEN 1 END) as active,
  COUNT(CASE WHEN deleted_at IS NOT NULL THEN 1 END) as soft_deleted
FROM tenant_google_drive_connections;

-- 3. HARD DELETE - Remove all active connections
-- This forces users to reconnect and get new tokens with correct encryption
DELETE FROM tenant_google_drive_connections
WHERE deleted_at IS NULL;

-- 4. Verify deletion
SELECT 
  COUNT(*) as remaining_connections
FROM tenant_google_drive_connections;

-- 5. Verify media records still exist (they should)
SELECT 
  COUNT(*) as total_media,
  COUNT(CASE WHEN storage_provider = 'google_drive' THEN 1 END) as google_drive_media,
  COUNT(CASE WHEN storage_provider = 'supabase' THEN 1 END) as supabase_media
FROM media
WHERE deleted_at IS NULL;

-- ============================================================================
-- EXPECTED RESULT:
-- - Query 2: Should show N active connections (before deletion)
-- - Query 4: Should show 0 connections (after deletion)
-- - Query 5: Should show media records with storage_provider='google_drive' still exist
--
-- NEXT STEP:
-- - User must click "Connect Google Drive" in Media Library UI
-- - OAuth flow will create new connection with correct token encryption
-- - Upload will work with new tokens
-- ============================================================================
