# Branding Fix Report

Scope: this report summarizes the branding cleanup and the runtime behavior after the fix.

## Before

The repository contained multiple branding sources:

- `Sitamarhi Live`
- `News CMS`
- `Buxar News`
- hardcoded site URLs and email domains
- a separate ad-brand literal on the homepage
- demo fixtures that embedded site branding directly

That made the app inconsistent and violated the single-source-of-truth rule.

## After

The runtime branding now comes from `site_settings.site_name` only.

Implemented changes:

- browser title generation now waits for the live site settings
- SEO bridge uses the live site name for titles, Open Graph, Twitter, and canonical metadata
- header, footer, navigation, and admin shell read the live site name directly
- the settings page writes `site_name` as the authoritative brand value
- ad/settings screens no longer bootstrap their own site-brand literals
- demo fixtures and seed scripts were normalized to remove the old site identity
- the SEO asset generator no longer defaults to the old domain

## Evidence

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

## Removed Brand Strings

- `Sitamarhi Live`
- `News CMS`
- `Buxar News`
- `sitamarhilive.com`
- `SwiftGrowthDigital`

## Verification

- `npm run lint` passed
- `npm run build` passed
- the production code search over `src`, `scripts`, `index.html`, and `supabase` returned no legacy brand strings

## Remaining Notes

Historical docs and debug artifacts still preserve older branding for audit trail purposes. They do not affect runtime branding.

## Final Status

Runtime branding is now controlled by `site_settings.site_name`.

