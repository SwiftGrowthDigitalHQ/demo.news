-- ═══════════════════════════════════════════════════════════════════════════
-- ADD DELETED_AT COLUMN TO TENANT_MEMBERSHIPS
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- ISSUE:
-- - Production admin page fails with: "column tenant_memberships.deleted_at does not exist"
-- - Migration 20260824000004_auto_tenant_context.sql expects deleted_at
-- - Frontend queries (admin.ts) require deleted_at for soft-delete filtering
-- 
-- FIX:
-- - Add missing deleted_at column for soft-delete support
-- - Create index for query performance
-- - All existing rows will have deleted_at = NULL (active memberships)
-- - No data loss or modification
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- Add deleted_at column for soft-delete support
ALTER TABLE public.tenant_memberships
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

COMMENT ON COLUMN public.tenant_memberships.deleted_at IS 
  'Soft delete timestamp. NULL = active membership.';

-- Create index for queries filtering by deleted_at
-- This improves performance for the common query pattern:
-- .is('deleted_at', null)
CREATE INDEX IF NOT EXISTS idx_tenant_memberships_deleted_at
  ON public.tenant_memberships(deleted_at) 
  WHERE deleted_at IS NULL;

COMMIT;
