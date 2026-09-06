-- Reset Google Drive Connections for Encryption Key Fix
-- Date: September 5, 2026
-- Reason: Existing encrypted tokens cannot be decrypted with current GDRIVE_ENCRYPTION_KEY
-- 
-- This migration soft-deletes all existing Google Drive connections.
-- Users will need to reconnect Google Drive to upload files again.
-- New tokens will be encrypted with the current GDRIVE_ENCRYPTION_KEY.

BEGIN;

-- Soft-delete all active Google Drive connections
UPDATE public.tenant_google_drive_connections
SET 
  deleted_at = NOW(),
  status = 'disconnected',
  last_error = 'Connection reset for encryption key compatibility. Please reconnect Google Drive.'
WHERE 
  deleted_at IS NULL
  AND status = 'active';

-- Log the operation
INSERT INTO public.audit_logs (
  tenant_id,
  user_id,
  action,
  entity_type,
  entity_id,
  metadata,
  ip_address,
  user_agent,
  created_at
) VALUES (
  NULL,
  NULL,
  'system.gdrive_connections_reset',
  'tenant_google_drive_connections',
  NULL,
  jsonb_build_object(
    'reason', 'Encryption key compatibility issue - tokens cannot be decrypted',
    'action', 'Soft-deleted all active connections',
    'users_affected', (SELECT COUNT(*) FROM public.tenant_google_drive_connections WHERE deleted_at IS NULL AND status = 'active')
  ),
  '127.0.0.1',
  'Supabase Migration',
  NOW()
);

COMMIT;
