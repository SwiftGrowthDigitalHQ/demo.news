# Branding Audit Report

Scope: this audit checks the current production code paths for hardcoded branding and verifies whether `site_settings.site_name` is the single runtime source of truth.

## Result

**Production code is clean.**

The runtime UI now reads branding from `site_settings.site_name`, and the production code search over `src`, `scripts`, `index.html`, and `supabase` returned no legacy brand strings.

## What Was Audited

- React components
- SEO bridge and browser title logic
- CMS provider
- Settings page
- Supabase site settings handling
- Header, footer, navigation, and admin shell branding
- SEO asset generation
- Demo/seed fixtures used by the app

## Files Modified

- [`index.html`](/c:/Users/Office/Downloads/Designsitamarhilivehomepage/index.html)
- [`src/app/components/BrandingBridge.tsx`](/c:/Users/Office/Downloads/Designsitamarhilivehomepage/src/app/components/BrandingBridge.tsx)
- [`src/app/components/SeoBridge.tsx`](/c:/Users/Office/Downloads/Designsitamarhilivehomepage/src/app/components/SeoBridge.tsx)
- [`src/app/components/Header.tsx`](/c:/Users/Office/Downloads/Designsitamarhilivehomepage/src/app/components/Header.tsx)
- [`src/app/components/Footer.tsx`](/c:/Users/Office/Downloads/Designsitamarhilivehomepage/src/app/components/Footer.tsx)
- [`src/app/components/Navigation.tsx`](/c:/Users/Office/Downloads/Designsitamarhilivehomepage/src/app/components/Navigation.tsx)
- [`src/app/components/admin/AdminSidebar.tsx`](/c:/Users/Office/Downloads/Designsitamarhilivehomepage/src/app/components/admin/AdminSidebar.tsx)
- [`src/app/components/admin/AdminHeader.tsx`](/c:/Users/Office/Downloads/Designsitamarhilivehomepage/src/app/components/admin/AdminHeader.tsx)
- [`src/app/components/admin/SettingsPanel.tsx`](/c:/Users/Office/Downloads/Designsitamarhilivehomepage/src/app/components/admin/SettingsPanel.tsx)
- [`src/app/components/admin/AdvertisementManagement.tsx`](/c:/Users/Office/Downloads/Designsitamarhilivehomepage/src/app/components/admin/AdvertisementManagement.tsx)
- [`src/app/lib/cms.tsx`](/c:/Users/Office/Downloads/Designsitamarhilivehomepage/src/app/lib/cms.tsx)
- [`src/app/lib/demoContent.ts`](/c:/Users/Office/Downloads/Designsitamarhilivehomepage/src/app/lib/demoContent.ts)
- [`src/app/pages/HomePage.tsx`](/c:/Users/Office/Downloads/Designsitamarhilivehomepage/src/app/pages/HomePage.tsx)
- [`scripts/demo-content.mjs`](/c:/Users/Office/Downloads/Designsitamarhilivehomepage/scripts/demo-content.mjs)
- [`scripts/seed-demo.mjs`](/c:/Users/Office/Downloads/Designsitamarhilivehomepage/scripts/seed-demo.mjs)
- [`scripts/generate-seo-assets.mjs`](/c:/Users/Office/Downloads/Designsitamarhilivehomepage/scripts/generate-seo-assets.mjs)
- [`docs/PRODUCTION_DATA_AUDIT.md`](/c:/Users/Office/Downloads/Designsitamarhilivehomepage/docs/PRODUCTION_DATA_AUDIT.md)
- [`docs/PRODUCTION_SEED.sql`](/c:/Users/Office/Downloads/Designsitamarhilivehomepage/docs/PRODUCTION_SEED.sql)

## Hardcoded Brand Names Removed From Production Code

- `Sitamarhi Live`
- `News CMS`
- `Buxar News`
- `sitamarhilive.com`
- `SwiftGrowthDigital`

## Runtime Source Of Truth

- `site_settings.site_name`

That value now drives:

- browser title
- SEO title
- Open Graph site name
- header brand text
- footer brand text
- admin shell brand text
- ad/settings branding fields that previously had their own literals

## Verification

- `npm run lint` passed
- `npm run build` passed
- `src`, `scripts`, `index.html`, and `supabase` contain no legacy brand-string matches after the cleanup

## Residual Historical References

Historical docs and debug artifacts still contain the old brand text as evidence of prior states. They are not part of the production runtime and were left intact to preserve audit history.

## Final Assessment

The live application now uses `site_settings.site_name` as the single source of branding truth.

