-- ═══════════════════════════════════════════════════════════════════════════
-- ADD SUPER ADMIN TO DEFAULT TENANT
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ISSUE:
-- - Super admin user (auth_user_id: 8ccc9470-a851-4f33-a313-42358d34cbb4)
-- - Cannot access /admin/media because:
--   1. Does not own any tenant
--   2. Has no membership in any tenant
--   3. Cannot get tenant context required for admin page
--
-- SOLUTION:
-- - Add super admin as member of default 'fake-news' tenant
-- - Grants access to /admin/media for operational purposes
-- - Role: 'owner' (consistent with tenant ownership architecture)
-- - Preserves tenant isolation for other tenants
-- - Does not modify tenant ownership (stays NULL)
--
-- SAFETY:
-- - Idempotent: uses INSERT ... ON CONFLICT DO NOTHING
-- - No existing data modified
-- - Super admin already has platform-wide database access via RLS
-- - This only affects /admin route access (uses same RLS rules)
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- Get the fake-news tenant ID (created in migration 20260828000001)
-- This will be the operational tenant for admin/testing access
WITH fake_news_tenant AS (
  SELECT id 
  FROM public.tenants
  WHERE slug = 'fake-news' 
    AND deleted_at IS NULL
  LIMIT 1
)

-- Add super admin to tenant_memberships if not already present
INSERT INTO public.tenant_memberships (tenant_id, auth_user_id, role)
SELECT 
  t.id,
  '8ccc9470-a851-4f33-a313-42358d34cbb4'::uuid,
  'owner'
FROM fake_news_tenant t
ON CONFLICT (tenant_id, auth_user_id) DO NOTHING;

COMMIT;
