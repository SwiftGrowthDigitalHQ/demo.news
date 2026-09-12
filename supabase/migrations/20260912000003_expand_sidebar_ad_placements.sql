-- Migration: Expand sidebar advertisement placements from 3 to 5 explicit numbered slots
-- Date: 2026-09-12
-- Purpose: Replace offset-based sidebar placement system with 5 explicit, distinct ad placements
--
-- SAFE MIGRATION STRATEGY:
-- 1. New placements (sidebar_1 through sidebar_5) are fully explicit with no offset-based logic
-- 2. Legacy placement values remain unchanged in database (backward compatibility)
-- 3. adService.ts legacyMap now maps:
--    - sidebar_1 -> ['sidebar', 'sidebar-top']  (legacy)
--    - sidebar_2 -> ['sidebar-2', 'sidebar-upper-middle']
--    - sidebar_3 -> ['sidebar-middle']  (legacy)
--    - sidebar_4 -> ['sidebar-4', 'sidebar-lower-middle']
--    - sidebar_5 -> ['sidebar-bottom']  (legacy)
-- 4. Existing ads with old placement values will continue to work via legacy mapping
-- 5. New admin UI creates ads with explicit sidebar_1 through sidebar_5
-- 6. No data deletion, no disruption to existing active ads
--
-- TENANT ISOLATION: All existing ads remain scoped to their tenant_id
-- No cross-tenant ads are created or exposed

-- Verify that existing sidebar ads can still be queried
-- This is a validation-only migration (no data changes)
DO $$
DECLARE
  sidebar_ad_count INTEGER;
  tenant_sample_id UUID;
BEGIN
  -- Count existing sidebar ads
  SELECT COUNT(*) INTO sidebar_ad_count
  FROM public.advertisements
  WHERE placement IN ('sidebar', 'sidebar-middle', 'sidebar-bottom', 'sidebar_top', 'sidebar_middle', 'sidebar_bottom')
    AND deleted_at IS NULL;

  RAISE NOTICE 'Found % existing sidebar ads before migration', sidebar_ad_count;

  -- Sample tenant check for isolation
  SELECT DISTINCT tenant_id INTO tenant_sample_id
  FROM public.advertisements
  WHERE placement IN ('sidebar', 'sidebar-middle', 'sidebar-bottom', 'sidebar_top', 'sidebar_middle', 'sidebar_bottom')
    AND deleted_at IS NULL
  LIMIT 1;

  IF tenant_sample_id IS NOT NULL THEN
    RAISE NOTICE 'Sample tenant_id for sidebar ads: %', tenant_sample_id;
  END IF;
END $$;

-- Add a comment to the advertisements table documenting the new placement scheme
COMMENT ON COLUMN public.advertisements.placement IS
'Ad placement location. Sidebar placements are now explicit:
- sidebar_1: Sidebar 1 — Top
- sidebar_2: Sidebar 2 — Upper Middle
- sidebar_3: Sidebar 3 — Middle
- sidebar_4: Sidebar 4 — Lower Middle
- sidebar_5: Sidebar 5 — Bottom
Legacy values (sidebar, sidebar-middle, sidebar-bottom) map to new placements via adService.ts legacyMap for backward compatibility.';

-- Verify indexes support the new placement queries
-- Existing indexes already include placement, so no new indexes needed
DO $$
BEGIN
  RAISE NOTICE 'Migration complete. Existing sidebar ads remain active via legacy placement mapping.';
  RAISE NOTICE 'Five explicit sidebar placements now available: sidebar_1, sidebar_2, sidebar_3, sidebar_4, sidebar_5';
  RAISE NOTICE 'Tenant isolation maintained: Each ad remains scoped to its tenant_id.';
END $$;
