-- ═══════════════════════════════════════════════════════════════════════════
-- DIAGNOSTIC: PRODUCTION TENANT OWNER SCHEMA AND USER RELATIONSHIP
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- Purpose: Verify the actual production state without modifying anything
-- Auth User: 8ccc9470-a851-4f33-a313-42358d34cbb4
-- Issue: Schema mismatch between migrations (owner_id) and code (owner_auth_user_id)
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. CHECK ACTUAL SCHEMA: What columns exist in public.tenants?
-- ─────────────────────────────────────────────────────────────────────────────

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'tenants'
  AND column_name LIKE '%owner%'
ORDER BY ordinal_position;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. GET ALL TENANTS (to check what actually exists)
-- ─────────────────────────────────────────────────────────────────────────────

SELECT 
  id,
  slug,
  name,
  status,
  deleted_at,
  (SELECT column_name FROM information_schema.columns 
   WHERE table_name='tenants' AND column_name='owner_id' LIMIT 1) as has_owner_id,
  (SELECT column_name FROM information_schema.columns 
   WHERE table_name='tenants' AND column_name='owner_auth_user_id' LIMIT 1) as has_owner_auth_user_id
FROM public.tenants
WHERE deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 10;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. TRY TO GET OWNER INFO (will work if column exists)
-- ─────────────────────────────────────────────────────────────────────────────

-- If owner_id column exists:
SELECT 
  id,
  slug,
  name,
  owner_id,
  status,
  deleted_at
FROM public.tenants
WHERE deleted_at IS NULL
LIMIT 5;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. CHECK CURRENT USER'S TENANT OWNERSHIP (via owner_id)
-- ─────────────────────────────────────────────────────────────────────────────

SELECT 
  id,
  slug,
  name,
  owner_id,
  status,
  deleted_at,
  (owner_id = '8ccc9470-a851-4f33-a313-42358d34cbb4'::uuid) as is_current_user
FROM public.tenants
WHERE deleted_at IS NULL
  AND owner_id = '8ccc9470-a851-4f33-a313-42358d34cbb4'::uuid;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. CHECK TENANT_MEMBERSHIPS FOR CURRENT USER
-- ─────────────────────────────────────────────────────────────────────────────

SELECT 
  id,
  tenant_id,
  auth_user_id,
  role,
  deleted_at,
  created_at
FROM public.tenant_memberships
WHERE auth_user_id = '8ccc9470-a851-4f33-a313-42358d34cbb4'::uuid
ORDER BY created_at DESC;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. COUNT TOTAL TENANTS AND MEMBERSHIPS
-- ─────────────────────────────────────────────────────────────────────────────

SELECT 
  (SELECT COUNT(*) FROM public.tenants WHERE deleted_at IS NULL) as total_active_tenants,
  (SELECT COUNT(*) FROM public.tenant_memberships WHERE deleted_at IS NULL) as total_active_memberships,
  (SELECT COUNT(*) FROM public.tenant_memberships WHERE auth_user_id = '8ccc9470-a851-4f33-a313-42358d34cbb4'::uuid AND deleted_at IS NULL) as current_user_memberships;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. CHECK IF ANY TENANT OWNER_ID POINTS TO THIS USER
-- ─────────────────────────────────────────────────────────────────────────────

SELECT 
  COUNT(*) as matching_owner_id_count
FROM public.tenants
WHERE deleted_at IS NULL
  AND owner_id = '8ccc9470-a851-4f33-a313-42358d34cbb4'::uuid;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. SHOW MIGRATION APPLICATION STATUS
-- ─────────────────────────────────────────────────────────────────────────────

SELECT 
  version,
  executed_at
FROM _supabase_migrations
WHERE version LIKE '202608%' OR version LIKE '202609%'
ORDER BY version DESC
LIMIT 5;
