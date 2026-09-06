-- ============================================================================
-- DIRECT FIX: Delete all old incompatible Google Drive tokens
-- ============================================================================

-- Before: Show what exists
SELECT 
  id,
  tenant_id,
  status,
  deleted_at,
  google_account_email,
  CASE 
    WHEN access_token_encrypted IS NOT NULL THEN 'YES'
    ELSE 'NO'
  END as has_token,
  LENGTH(access_token_encrypted) as token_length,
  created_at,
  updated_at
FROM tenant_google_drive_connections
ORDER BY created_at DESC;

-- Delete ALL old connections (hard delete - not soft delete)
-- This forces users to reconnect via OAuth with new token encryption
DELETE FROM tenant_google_drive_connections
WHERE deleted_at IS NULL;

-- Verify deletion
SELECT COUNT(*) as connections_remaining FROM tenant_google_drive_connections;

-- Media records should still exist (files in Google Drive not deleted)
SELECT 
  COUNT(*) as total_media,
  COUNT(CASE WHEN storage_provider = 'google_drive' THEN 1 END) as google_drive_files
FROM media
WHERE deleted_at IS NULL;
