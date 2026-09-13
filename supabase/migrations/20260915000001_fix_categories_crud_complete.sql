-- ═══════════════════════════════════════════════════════════════════════════
-- FIX CATEGORIES CRUD - COMPLETE TENANT ISOLATION
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- Issue: Multiple conflicting RLS policies for categories table
-- - Migration 20260824000002 created: public_read, tenant_read, tenant_manage (FOR ALL)
-- - Migration 20260913000001 created: categories_read, categories_insert, 
--   categories_update_delete, categories_delete (separate)
-- - Migration 20260913 did NOT drop old policies, creating conflicts
-- - Result: UPDATE operations fail with 403
--
-- Fix: Drop ALL old policies and create a single, correct set
-- - SELECT: public (deleted), tenant reads, admin reads
-- - INSERT: tenant admin only, must set tenant_id to own tenant
-- - UPDATE: tenant admin only, cannot change tenant_id
-- - DELETE: tenant admin only
--
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- DROP ALL EXISTING CATEGORIES POLICIES
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "public_read_categories" ON public.categories CASCADE;
DROP POLICY IF EXISTS "tenant_read_own_categories" ON public.categories CASCADE;
DROP POLICY IF EXISTS "tenant_manage_own_categories" ON public.categories CASCADE;
DROP POLICY IF EXISTS "categories_view_published" ON public.categories CASCADE;
DROP POLICY IF EXISTS "categories_manage_admin" ON public.categories CASCADE;
DROP POLICY IF EXISTS "categories_read_own_tenant" ON public.categories CASCADE;
DROP POLICY IF EXISTS "categories_insert_own_tenant" ON public.categories CASCADE;
DROP POLICY IF EXISTS "categories_update_delete_own_tenant" ON public.categories CASCADE;
DROP POLICY IF EXISTS "categories_delete_own_tenant" ON public.categories CASCADE;
DROP POLICY IF EXISTS "categories_manage_own_tenant" ON public.categories CASCADE;
DROP POLICY IF EXISTS "manage categories" ON public.categories CASCADE;

-- ═══════════════════════════════════════════════════════════════════════════
-- CREATE NEW CATEGORIES POLICIES - CLEAN, CORRECT, TENANT-ISOLATED
-- ═══════════════════════════════════════════════════════════════════════════

-- SELECT: Public can read published categories from valid tenants
-- Also: Tenant admins can read all their own categories
CREATE POLICY "categories_select_public" ON public.categories
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND (
      -- Public read: published, non-legacy categories
      (status = 'published' AND tenant_id IS NOT NULL)
      OR
      -- Tenant admin read: all own categories
      (tenant_id IN (SELECT public.get_user_tenant_ids()))
      OR
      -- Super admin read: all categories
      (public.is_super_admin())
    )
  );

-- INSERT: Only tenant admins can create categories in their own tenant
-- Enforces tenant_id must match user's tenant
CREATE POLICY "categories_insert_tenant" ON public.categories
  FOR INSERT
  WITH CHECK (
    tenant_id IN (SELECT public.get_user_tenant_ids())
    OR public.is_super_admin()
  );

-- UPDATE: Only tenant admins can update their own categories
-- Prevents changing tenant_id to another tenant
-- Protects all columns including tenant_id itself
CREATE POLICY "categories_update_tenant" ON public.categories
  FOR UPDATE
  USING (
    deleted_at IS NULL
    AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  )
  WITH CHECK (
    -- After update, tenant_id must still be user's tenant (cannot change it)
    -- Unless super admin
    tenant_id IN (SELECT public.get_user_tenant_ids())
    OR public.is_super_admin()
  );

-- DELETE: Only tenant admins can delete their own categories
-- Uses soft delete (deleted_at) via application logic, but allow hard delete if needed
CREATE POLICY "categories_delete_tenant" ON public.categories
  FOR DELETE
  USING (
    deleted_at IS NULL
    AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- ENSURE AUDIT_LOGS INSERT POLICY EXISTS (NON-BLOCKING IF ALREADY EXISTS)
-- ═══════════════════════════════════════════════════════════════════════════

-- Check if policy already exists before creating
-- Using DO block to make it idempotent
DO $$
BEGIN
  -- Try to create the policy if it doesn't exist
  -- If it already exists, PostgreSQL will NOT error in this context
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'audit_logs' 
    AND policyname = 'audit_logs_insert_authenticated'
  ) THEN
    CREATE POLICY "audit_logs_insert_authenticated" ON public.audit_logs
      FOR INSERT
      WITH CHECK (
        tenant_id IN (SELECT public.get_user_tenant_ids())
        OR public.is_super_admin()
        OR (tenant_id IS NULL AND public.is_super_admin())
      );
  END IF;
END $$;

COMMIT;
