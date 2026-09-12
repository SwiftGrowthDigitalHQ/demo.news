-- ═══════════════════════════════════════════════════════════════════════════
-- ADD MOBILE_BANNER_URL FOR RESPONSIVE ADVERTISEMENT IMAGES
-- Enables separate desktop and mobile image URLs for responsive ads
-- Date: September 12, 2026
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- ADD mobile_banner_url COLUMN TO advertisements TABLE
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.advertisements
  ADD COLUMN IF NOT EXISTS mobile_banner_url TEXT NULL;

COMMENT ON COLUMN public.advertisements.mobile_banner_url IS 
  'Mobile-optimized image URL for responsive ads. Used on mobile viewports for Homepage and Article placements. Falls back to banner_url if NULL. Sidebar placements always use banner_url.';

-- ─────────────────────────────────────────────────────────────────────────────
-- DOCUMENTATION: MOBILE_BANNER_URL RULES
-- ─────────────────────────────────────────────────────────────────────────────

-- PLACEMENT SUPPORT:
--
-- ✓ HOMEPAGE (supports mobile_banner_url):
--   - Homepage — Top Banner
--   - Homepage — Mid Banner
--   - Homepage — Footer Banner
--
-- ✓ ARTICLE PAGE (supports mobile_banner_url):
--   - Article — Top Banner
--   - Article — Mid Banner
--   - Article — Sidebar
--
-- ✗ SIDEBAR (DOES NOT support mobile_banner_url):
--   - Sidebar 1 — Top
--   - Sidebar 2 — Upper Middle
--   - Sidebar 3 — Middle
--   - Sidebar 4 — Lower Middle
--   - Sidebar 5 — Bottom
--
-- SIDEBAR BEHAVIOR:
--   - Sidebar placements always use banner_url on all viewports
--   - mobile_banner_url is ignored for Sidebar placements
--   - This ensures sidebar ads maintain consistent appearance
--
-- IMAGE SOURCE RESOLUTION (Frontend SmartAd):
--
-- Homepage/Article on Mobile:
--   1. Check if mobile_banner_url exists
--   2. If yes: use mobile_banner_url
--   3. If no: fall back to banner_url
--
-- Homepage/Article on Desktop:
--   - Always use banner_url (desktop image)
--
-- Sidebar (Any viewport):
--   - Always use banner_url (ignore mobile_banner_url)
--
-- TENANT ISOLATION:
--   - mobile_banner_url belongs to same advertisement row
--   - Tenant filtering via tenant_id applies to entire row
--   - Never load mobile images from another tenant
--
-- TRACKING:
--   - One advertisement = one ad_id
--   - Impressions/clicks tracked once per ad_id
--   - Multiple image URLs do not create duplicate tracking
--
-- ADMIN UI:
--   - Homepage/Article: show both Desktop Image URL and Mobile Image URL fields
--   - Sidebar: show only Image URL field (single image)
--   - Mobile Image URL is optional (defaults to banner_url)
--   - Desktop Image URL is required
--
-- BACKWARD COMPATIBILITY:
--   - Existing advertisements have mobile_banner_url = NULL
--   - Fallback to banner_url ensures no broken images
--   - Existing sidebar ads work unchanged

-- END OF MIGRATION
