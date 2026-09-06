-- CRITICAL FIX: Remove all old incompatible Google Drive connections
-- These connections have tokens encrypted with the old padEnd() method
-- They cannot be decrypted with the new atob() method
-- Solution: Delete them completely so users must reconnect with new OAuth

BEGIN;

-- Get count before deletion (for audit)
DO $$
DECLARE
  deleted_count integer;
BEGIN
  SELECT COUNT(*) INTO deleted_count
  FROM tenant_google_drive_connections
  WHERE deleted_at IS NULL;
  
  RAISE NOTICE 'Before fix: % active Google Drive connections', deleted_count;
END $$;

-- HARD DELETE all connections (not soft delete)
-- This forces users to reconnect and get fresh tokens with correct encryption
DELETE FROM tenant_google_drive_connections
WHERE deleted_at IS NULL;

-- Verify deletion
DO $$
DECLARE
  remaining_count integer;
BEGIN
  SELECT COUNT(*) INTO remaining_count
  FROM tenant_google_drive_connections;
  
  RAISE NOTICE 'After fix: % total connection records (should be 0 if all were active before)';
  RAISE NOTICE 'All old incompatible connections removed. Users must reconnect to get new tokens with correct AES-256-GCM encryption.';
END $$;

COMMIT;
