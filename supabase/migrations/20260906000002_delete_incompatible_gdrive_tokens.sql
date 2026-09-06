-- Delete all old Google Drive connections with incompatible token encryption
-- These tokens were encrypted with padEnd() method
-- New functions decrypt with atob() method → incompatibility
-- Users must reconnect to get new tokens with correct encryption

BEGIN;

-- Get count before deletion
DO $$
DECLARE
  old_count integer;
BEGIN
  SELECT COUNT(*) INTO old_count
  FROM tenant_google_drive_connections
  WHERE deleted_at IS NULL;
  
  RAISE NOTICE '[GDRIVE FIX] Deleting % old incompatible connections', old_count;
END $$;

-- HARD DELETE all active connections
DELETE FROM tenant_google_drive_connections
WHERE deleted_at IS NULL;

-- Verify deletion
DO $$
DECLARE
  remaining_count integer;
BEGIN
  SELECT COUNT(*) INTO remaining_count
  FROM tenant_google_drive_connections;
  
  RAISE NOTICE '[GDRIVE FIX] Remaining connections: % (should be 0)', remaining_count;
  RAISE NOTICE '[GDRIVE FIX] SUCCESS - Users must reconnect Google Drive. New tokens will be encrypted with correct AES-256-GCM method.';
END $$;

COMMIT;
