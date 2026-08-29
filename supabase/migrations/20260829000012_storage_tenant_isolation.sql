-- ═══════════════════════════════════════════════════════════════════════════
-- STORAGE BUCKET TENANT ISOLATION
-- 
-- CRITICAL SECURITY FIX:
-- Original storage policies allowed ANY authenticated user to read ALL media
-- This migration enforces tenant isolation in storage.objects
-- 
-- STORAGE STRUCTURE:
-- Files are stored with path: {tenant_id}/{filename}
-- This allows RLS to check tenant ownership via path prefix
-- 
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- DROP INSECURE STORAGE POLICIES
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "public read media bucket" ON storage.objects;
DROP POLICY IF EXISTS "manage media bucket uploads" ON storage.objects;
DROP POLICY IF EXISTS "manage media bucket updates" ON storage.objects;
DROP POLICY IF EXISTS "manage media bucket deletes" ON storage.objects;

-- ═══════════════════════════════════════════════════════════════════════════
-- CREATE TENANT-ISOLATED STORAGE POLICIES
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- HELPER FUNCTION: Extract tenant_id from storage path
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_tenant_id_from_storage_path(object_path text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  tenant_uuid text;
BEGIN
  -- Path format: {tenant_id}/folder/file.ext
  -- Extract first path segment
  tenant_uuid := split_part(object_path, '/', 1);
  
  -- Validate UUID format
  IF tenant_uuid ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN tenant_uuid::uuid;
  ELSE
    RETURN NULL;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.get_tenant_id_from_storage_path(text) IS 
  'Extracts tenant_id from storage object path. Returns NULL if path does not start with valid UUID.';

-- ─────────────────────────────────────────────────────────────────────────────
-- SELECT POLICY - Tenant members can read their own tenant's media
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "media_select_own_tenant" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'media'
    AND (
      -- Users can read media from their own tenant
      public.get_tenant_id_from_storage_path(name) IN (SELECT public.get_user_tenant_ids())
      -- Super admin can read all
      OR public.is_super_admin()
      -- Public can read media if the path doesn't start with tenant UUID (legacy public assets)
      OR (
        public.get_tenant_id_from_storage_path(name) IS NULL
        AND auth.uid() IS NULL  -- Anonymous
      )
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- INSERT POLICY - Users can upload only to their tenant's folder
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "media_insert_own_tenant" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'media'
    AND auth.uid() IS NOT NULL  -- Must be authenticated
    AND (
      -- Must upload to their own tenant's folder
      public.get_tenant_id_from_storage_path(name) IN (SELECT public.get_user_tenant_ids())
      -- Super admin can upload anywhere
      OR public.is_super_admin()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- UPDATE POLICY - Users can update only their tenant's files
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "media_update_own_tenant" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'media'
    AND auth.uid() IS NOT NULL
    AND (
      public.get_tenant_id_from_storage_path(name) IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  )
  WITH CHECK (
    bucket_id = 'media'
    AND auth.uid() IS NOT NULL
    AND (
      public.get_tenant_id_from_storage_path(name) IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- DELETE POLICY - Users can delete only their tenant's files
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "media_delete_own_tenant" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'media'
    AND auth.uid() IS NOT NULL
    AND (
      public.get_tenant_id_from_storage_path(name) IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- UPDATE MEDIA TABLE TO ENFORCE tenant_id CONSISTENCY
-- ═══════════════════════════════════════════════════════════════════════════

-- Add constraint to ensure file_path starts with tenant_id
-- Applied as NOT VALID so existing rows are exempt; only new rows must comply.
-- Storage isolation is enforced at the API level via the policies above.

ALTER TABLE public.media DROP CONSTRAINT IF EXISTS media_path_tenant_consistency;

-- NOTE: NOT VALID means existing rows are not checked; only future inserts/updates.
-- This is safe because existing media is already uploaded and the storage
-- bucket policies enforce tenant isolation for new uploads.
ALTER TABLE public.media ADD CONSTRAINT media_path_tenant_consistency
  CHECK (
    tenant_id IS NULL  -- Legacy files OK
    OR file_path LIKE tenant_id::text || '/%'  -- New files must have tenant_id prefix
  ) NOT VALID;

COMMENT ON CONSTRAINT media_path_tenant_consistency ON public.media IS
  'Ensures file_path starts with tenant_id for storage isolation. Legacy (tenant_id IS NULL) files are exempt.';

-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION NOTES
-- ═══════════════════════════════════════════════════════════════════════════

COMMENT ON POLICY "media_select_own_tenant" ON storage.objects IS
  'Users can read media ONLY from their own tenant. Anonymous can read legacy public files (no tenant prefix).';

COMMENT ON POLICY "media_insert_own_tenant" ON storage.objects IS
  'Users can upload ONLY to their tenant folder: {tenant_id}/path/file.ext';

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICATION & TESTING
-- ═══════════════════════════════════════════════════════════════════════════

/*
STORAGE PATH STRUCTURE:
✅ Tenant A uploads → {tenant_a_uuid}/images/logo.png
✅ Tenant B uploads → {tenant_b_uuid}/images/logo.png
❌ Tenant A CANNOT read {tenant_b_uuid}/images/logo.png
✅ Tenant A CAN read {tenant_a_uuid}/images/logo.png

TESTING:
1. Login as Tenant A user
2. Try to read storage.objects WHERE name LIKE '{tenant_b_uuid}/%'
   → Should return 0 rows
3. Try to INSERT with name = '{tenant_b_uuid}/test.png'
   → Should fail with RLS violation
4. Try to read storage.objects WHERE name LIKE '{tenant_a_uuid}/%'
   → Should succeed

LEGACY COMPATIBILITY:
Files without tenant_id prefix (legacy public files) remain accessible to anonymous users.
New uploads MUST include tenant_id prefix.

APPLICATION CODE CHANGES REQUIRED:
When uploading files, the application MUST:
1. Get current user's tenant_id
2. Upload to path: `{tenant_id}/{folder}/{filename}`
3. Store in media table with tenant_id and file_path both set correctly

Example:
  tenant_id: "123e4567-e89b-12d3-a456-426614174000"
  file_path: "123e4567-e89b-12d3-a456-426614174000/articles/hero-image.jpg"
  storage_bucket: "media"
*/
