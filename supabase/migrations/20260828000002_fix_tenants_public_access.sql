-- ═══════════════════════════════════════════════════════════════════════════
-- FIX TENANTS TABLE PUBLIC ACCESS
-- Enable anonymous users to read tenant slugs for public website routing
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- Enable RLS on tenants table (if not already enabled)
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow anonymous read of tenants" ON public.tenants;
DROP POLICY IF EXISTS "Allow anonymous read of active tenant slugs" ON public.tenants;
DROP POLICY IF EXISTS "Allow authenticated read of active tenant slugs" ON public.tenants;

-- Create new policy: Allow anonymous and authenticated users to read tenant info
-- This is SAFE because:
-- 1. Only non-deleted tenants are exposed
-- 2. No sensitive data like passwords/keys are in this table
-- 3. Public routing requires knowing tenant slugs
CREATE POLICY "Allow public read of tenant slugs"
  ON public.tenants
  FOR SELECT
  TO anon, authenticated
  USING (deleted_at IS NULL);

-- Grant explicit SELECT permission to anon and authenticated roles
GRANT SELECT ON public.tenants TO anon;
GRANT SELECT ON public.tenants TO authenticated;

COMMIT;
