-- VERIFY AND FIX Categories RLS Policies
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- Issue: Categories DELETE/UPDATE operations return HTTP 403
-- 
-- Root cause investigation: After migration 20260915, the DELETE operation 
-- still fails with RLS 403. This migration will:
-- 
-- 1. Drop ALL old policies that might be conflicting
-- 2. Ensure only ONE UPDATE policy exists: categories_update_tenant
-- 3. Verify the policy logic is correct
-- 
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- DROP ALL OLD POLICIES - COMPREHENSIVE
-- ═══════════════════════════════════════════════════════════════════════════

-- From initial schema (20260613)
DROP POLICY IF EXISTS "public read active categories" ON public.categories CASCADE;
DROP POLICY IF EXISTS "manage categories" ON public.categories CASCADE;

-- From multi-tenant (20260824)
DROP POLICY IF EXISTS "public_read_categories" ON public.categories CASCADE;
DROP POLICY IF EXISTS "tenant_read_own_categories" ON public.categories CASCADE;
DROP POLICY IF EXISTS "tenant_manage_own_categories" ON public.categories CASCADE;

-- From previous fixes (20260913, variations)
DROP POLICY IF EXISTS "categories_view_published" ON public.categories CASCADE;
DROP POLICY IF EXISTS "categories_manage_admin" ON public.categories CASCADE;
DROP POLICY IF EXISTS "categories_read_own_tenant" ON public.categories CASCADE;
DROP POLICY IF EXISTS "categories_insert_own_tenant" ON public.categories CASCADE;
DROP POLICY IF EXISTS "categories_update_delete_own_tenant" ON public.categories CASCADE;
DROP POLICY IF EXISTS "categories_delete_own_tenant" ON public.categories CASCADE;
DROP POLICY IF EXISTS "categories_manage_own_tenant" ON public.categories CASCADE;

-- From 20260915 (in case they exist)
DROP POLICY IF EXISTS "categories_select_public" ON public.categories CASCADE;
DROP POLICY IF EXISTS "categories_insert_tenant" ON public.categories CASCADE;
DROP POLICY IF EXISTS "categories_update_tenant" ON public.categories CASCADE;
DROP POLICY IF EXISTS "categories_delete_tenant" ON public.categories CASCADE;

-- ═══════════════════════════════════════════════════════════════════════════
-- CREATE CORRECT RLS POLICIES - SINGLE SOURCE OF TRUTH
-- ═══════════════════════════════════════════════════════════════════════════

-- Ensure RLS is enabled
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- SELECT: Public can read published categories, admins can read all their own
CREATE POLICY "categories_select_public" ON public.categories
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND (
      (status = 'published' AND tenant_id IS NOT NULL)
      OR
      (tenant_id IN (SELECT public.get_user_tenant_ids()))
      OR
      (public.is_super_admin())
    )
  );

-- INSERT: Only tenant admins can create in their tenant
CREATE POLICY "categories_insert_tenant" ON public.categories
  FOR INSERT
  WITH CHECK (
    tenant_id IN (SELECT public.get_user_tenant_ids())
    OR public.is_super_admin()
  );

-- UPDATE: Only tenant admins can update their own categories
-- CRITICAL: Must allow UPDATE of deleted_at column for soft delete
-- USING: Row must be fresh (not yet soft-deleted) AND belong to user's tenant
-- WITH CHECK: After update, tenant_id must remain in user's tenant (immutable)
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
    tenant_id IN (SELECT public.get_user_tenant_ids())
    OR public.is_super_admin()
  );

-- DELETE: Only tenant admins can delete their own categories (hard delete)
-- Uses same logic as UPDATE for consistency
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
-- Verify audit_logs INSERT policy exists
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
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
