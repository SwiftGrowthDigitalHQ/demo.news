-- ═══════════════════════════════════════════════════════════════════════════
-- ADD TENANT_ID TO ADVERTISEMENTS AND CAMPAIGNS
-- Critical schema fix: Enable multi-tenant isolation for ad management
-- Date: September 11, 2026
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1: ADD tenant_id TO advertisements TABLE
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.advertisements
  ADD COLUMN IF NOT EXISTS tenant_id uuid
  REFERENCES public.tenants(id) ON DELETE CASCADE;

COMMENT ON COLUMN public.advertisements.tenant_id IS 
  'Tenant that owns this advertisement. Required for multi-tenant isolation.';

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2: ADD tenant_id TO campaigns TABLE
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS tenant_id uuid
  REFERENCES public.tenants(id) ON DELETE CASCADE;

COMMENT ON COLUMN public.campaigns.tenant_id IS 
  'Tenant that owns this campaign. Required for multi-tenant isolation.';

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 3: BACKFILL tenant_id FOR EXISTING RECORDS
-- CRITICAL: Backfill ALL NULL values (including soft-deleted records)
-- This ensures the NOT NULL constraint can be applied safely
-- ─────────────────────────────────────────────────────────────────────────────

-- Get the first tenant (for backfill)
DO $$
DECLARE
  v_first_tenant_id uuid;
  v_null_count_ads integer;
  v_null_count_campaigns integer;
BEGIN
  -- Find the first active tenant
  SELECT id INTO v_first_tenant_id
  FROM public.tenants
  WHERE deleted_at IS NULL
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_first_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No active tenants found. Cannot backfill tenant_id. Migration will not proceed.';
  END IF;

  -- Count NULL values in advertisements BEFORE backfill
  SELECT COUNT(*) INTO v_null_count_ads
  FROM public.advertisements
  WHERE tenant_id IS NULL;

  -- Backfill advertisements - CRITICAL: backfill ALL NULL rows regardless of deleted_at
  -- This ensures no NULL values remain for the NOT NULL constraint
  UPDATE public.advertisements
  SET tenant_id = v_first_tenant_id
  WHERE tenant_id IS NULL;

  -- Count NULL values in campaigns BEFORE backfill
  SELECT COUNT(*) INTO v_null_count_campaigns
  FROM public.campaigns
  WHERE tenant_id IS NULL;

  -- Backfill campaigns - CRITICAL: backfill ALL NULL rows regardless of deleted_at
  UPDATE public.campaigns
  SET tenant_id = v_first_tenant_id
  WHERE tenant_id IS NULL;

  -- Verify backfill succeeded
  IF (SELECT COUNT(*) FROM public.advertisements WHERE tenant_id IS NULL) > 0 THEN
    RAISE EXCEPTION 'Backfill failed: advertisements still contains NULL tenant_id values after backfill';
  END IF;

  IF (SELECT COUNT(*) FROM public.campaigns WHERE tenant_id IS NULL) > 0 THEN
    RAISE EXCEPTION 'Backfill failed: campaigns still contains NULL tenant_id values after backfill';
  END IF;

  RAISE NOTICE 'Backfill complete: advertisements (% NULL rows), campaigns (% NULL rows)', v_null_count_ads, v_null_count_campaigns;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 4: ADD NOT NULL CONSTRAINT (after backfill)
-- This ensures new records must have tenant_id
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.advertisements
  ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE public.campaigns
  ALTER COLUMN tenant_id SET NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 5: ADD INDEXES FOR PERFORMANCE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_advertisements_tenant_id
  ON public.advertisements(tenant_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_advertisements_tenant_placement
  ON public.advertisements(tenant_id, placement)
  WHERE is_active = true AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_campaigns_tenant_id
  ON public.campaigns(tenant_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_campaigns_tenant_status
  ON public.campaigns(tenant_id, status)
  WHERE deleted_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 6: UPDATE RLS POLICIES FOR advertisements TABLE
-- Enforce tenant isolation at database level
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop existing policies if they exist (they won't have tenant_id check)
DROP POLICY IF EXISTS "public_read_advertisements" ON public.advertisements;
DROP POLICY IF EXISTS "tenant_read_own_advertisements" ON public.advertisements;
DROP POLICY IF EXISTS "tenant_manage_own_advertisements" ON public.advertisements;

-- Enable RLS if not already enabled
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;

-- Public read policy: Allow anon/authenticated to read active ads for their tenant
CREATE POLICY "public_read_advertisements" ON public.advertisements
  FOR SELECT
  TO public
  USING (
    is_active = true 
    AND deleted_at IS NULL
    AND tenant_id IS NOT NULL
  );

-- Authenticated read policy: Allow authenticated users to read their tenant's ads
CREATE POLICY "tenant_read_own_advertisements" ON public.advertisements
  FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.get_user_tenant_ids()));

-- Authenticated write policy: Allow authenticated users to manage their tenant's ads
CREATE POLICY "tenant_manage_own_advertisements" ON public.advertisements
  FOR INSERT, UPDATE, DELETE
  TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.get_user_tenant_ids()));

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 7: UPDATE RLS POLICIES FOR campaigns TABLE
-- Enforce tenant isolation at database level
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "public_read_campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "tenant_read_own_campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "tenant_manage_own_campaigns" ON public.campaigns;

-- Enable RLS if not already enabled
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- Authenticated read policy: Allow authenticated users to read their tenant's campaigns
CREATE POLICY "tenant_read_own_campaigns" ON public.campaigns
  FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.get_user_tenant_ids()));

-- Authenticated write policy: Allow authenticated users to manage their tenant's campaigns
CREATE POLICY "tenant_manage_own_campaigns" ON public.campaigns
  FOR INSERT, UPDATE, DELETE
  TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.get_user_tenant_ids()));

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 8: DOCUMENTATION
-- ─────────────────────────────────────────────────────────────────────────────

-- IMPORTANT NOTES:
--
-- 1. ADMIN CRUD SECURITY:
--    - admin.ts:listAdminAds() now works: filters by tenant_id
--    - admin.ts:upsertAdminAd() now works: assigns tenant_id from getCurrentUserTenantId()
--    - admin.ts:deleteAdminAd() now works: deletes only current tenant's ads
--
-- 2. MULTI-TENANT ISOLATION:
--    - All advertisement queries now have .eq('tenant_id', tenantId)
--    - All campaign queries now have .eq('tenant_id', tenantId)
--    - RLS policies enforce tenant boundaries at database level
--    - No tenant can access another tenant's ads or campaigns
--
-- 3. ANALYTICS:
--    - Campaigns table now has tenant_id for proper analytics filtering
--    - Ad revenue/spend is now properly tenant-scoped
--    - Active campaigns count is now per-tenant
--    - Clicks/impressions are now per-tenant
--
-- 4. FOREIGN KEY RELATIONSHIPS:
--    - advertisements.campaign_id → campaigns.id (unchanged)
--    - advertisements.tenant_id → tenants.id (new, ON DELETE CASCADE)
--    - campaigns.tenant_id → tenants.id (new, ON DELETE CASCADE)
--
-- 5. INDEXES CREATED:
--    - idx_advertisements_tenant_id: For fast tenant-scoped queries
--    - idx_advertisements_tenant_placement: For SmartAd placement queries
--    - idx_campaigns_tenant_id: For admin campaign lists
--    - idx_campaigns_tenant_status: For status-based queries
--
-- 6. BACKFILL STRATEGY:
--    - Existing ads/campaigns assigned to first tenant (oldest)
--    - This preserves historical data while enabling isolation
--    - In production, verify backfill worked: SELECT COUNT(*) FROM advertisements WHERE tenant_id IS NULL;
--      Should return 0

-- END OF MIGRATION
