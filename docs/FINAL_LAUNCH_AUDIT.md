# Final Production Readiness Audit

Scope: this audit is based on the actual code in the repository, not the marketing copy or prior readiness notes.

## Launch Readiness Score

**58%**

The app builds successfully, but there are still production blockers in SEO, security, storage setup, and several public-facing workflows.

## Critical Issues

- **The site is hard-blocked from search indexing.** `index.html` ships with `meta name="robots" content="noindex, nofollow"`, which prevents the newsroom from being indexed at all. That is a production blocker for a news product. Evidence: `index.html:8-10`.
- **Sensitive configuration can be exposed to every visitor.** `site_settings` is publicly readable, and the admin settings UI stores API-style values in `theme_config`, including `openai_key`, `fcm_key`, and the AdSense and analytics IDs. Because the browser loads `theme_config` through `CmsProvider`, those values are effectively public. Evidence: `supabase/migrations/20260613000100_initial_schema.sql:279-288`, `supabase/migrations/20260613000100_initial_schema.sql:580-583`, `src/app/components/admin/SettingsPanel.tsx:123-127`, `src/app/components/admin/SettingsPanel.tsx:160-185`.
- **Media storage is not self-provisioned in the database layer.** The deployment guide says the `media` bucket must be created manually and made public, but the SQL migration does not create the bucket or its storage policies. That means a fresh deployment is incomplete unless extra manual Supabase steps are performed. Evidence: `docs/DEPLOYMENT_GUIDE.md:13`, `supabase/migrations/20260613000100_initial_schema.sql:137-145`.

## High Priority Issues

- **SEO is only partially implemented.** `BrandingBridge` updates `document.title`, favicon, apple touch icon, and theme color, but there is no route-specific meta management for article/category/search pages, no Open Graph tags, no Twitter tags, and no canonical URLs being written per route. Evidence: `src/app/components/BrandingBridge.tsx:19-43`, `index.html:8-10`.
- **Mobile navigation is broken or incomplete.** The header renders a mobile menu button, but there is no click handler, so the icon does nothing on small screens. Evidence: `src/app/components/Header.tsx:84-85`.
- **Pagination controls are placeholders.** Both category and search pages render `PaginationPrevious` and `PaginationNext` with `href="#"`, so the controls do not actually paginate anything. Evidence: `src/app/pages/CategoryPage.tsx:76-88`, `src/app/pages/SearchPage.tsx:118-127`.
- **Analytics are not production-grade.** The analytics writer only stores `event_type`, `page_path`, `article_id`, `category_id`, and `metadata`; it does not populate `session_id`, `referrer`, or `user_agent` even though the table has those columns. The overview dashboard also fabricates revenue using formulas instead of real ad/subscription accounting. Evidence: `src/app/lib/admin.ts:118-120`, `src/app/lib/admin.ts:579-593`, `src/app/components/admin/OverviewDashboard.tsx:110-115`, `src/app/components/admin/OverviewDashboard.tsx:253-262`.
- **Anonymous write access can be abused.** `analytics_events` and `subscriptions` both allow public inserts, which makes spam and data pollution trivial unless rate limiting or edge validation is added. Evidence: `supabase/migrations/20260613000100_initial_schema.sql:635-641`.
- **The public ad system is mostly decorative.** The public site renders hard-coded `AdBanner` props, while the admin ad manager shows placement matrices, revenue estimates, and placeholder states that are not tied to real delivery logic on the frontend. Evidence: `src/app/components/AdBanner.tsx:1-133`, `src/app/pages/HomePage.tsx:197-199`, `src/app/pages/HomePage.tsx:232-261`, `src/app/components/admin/AdvertisementManagement.tsx:111-119`, `src/app/components/admin/AdvertisementManagement.tsx:437-789`.

## Medium Priority Issues

- **There is no global error boundary.** Most modules handle their own load errors, but there is no top-level error boundary or app-level fallback to keep the site from white-screening on unexpected runtime failures.
- **Loading states are inconsistent.** The CMS provider exposes `loading` and `error`, but the public pages do not consistently render a dedicated loading or failure state for content fetch failures. Search also fetches asynchronously and can briefly show an empty result state while the request is in flight. Evidence: `src/app/lib/cms.tsx:309-408`, `src/app/pages/SearchPage.tsx:20-31`, `src/app/pages/SearchPage.tsx:88-90`.
- **Media upload validation is weak.** The UI claims support for JPG, PNG, MP4, and PDF up to 100MB, but `uploadAdminMedia` does not validate file type or size before upload. Evidence: `src/app/components/admin/MediaLibrary.tsx:193-197`, `src/app/lib/admin.ts:360-377`.
- **The app lacks a test and lint gate.** `package.json` only defines `build`, `dev`, and `seed:demo`; there is no `test` or `lint` script to enforce QA before deployment. Evidence: `package.json:7-9`.
- **Android readiness is future work, not current readiness.** There is no manifest, service worker, offline support, or dedicated API layer for an Android client. The app is a browser SPA talking straight to Supabase from the client. Evidence: `index.html:1-10`, `src/lib/supabase.ts:1-25`, no manifest or service worker files in the repo.

## Low Priority Issues

- **Comments, sharing, and newsletter signup are UI-only.** The article page renders inputs and buttons for comments and sharing, and the homepage/footer render newsletter signup controls, but there is no persistence path behind them. Evidence: `src/app/pages/ArticlePage.tsx:166-207`, `src/app/pages/HomePage.tsx:292-299`, `src/app/components/Footer.tsx:1-109`.
- **Some admin revenue and KPI labels are estimated placeholders.** The dashboard is useful for operator visibility, but some figures are derived or synthetic rather than sourced from a billing ledger. Evidence: `src/app/components/admin/OverviewDashboard.tsx:110-115`, `src/app/components/admin/OverviewDashboard.tsx:253-262`.
- **Several routes still use static demo fallback behavior.** The CMS provider merges demo content into live content, which is fine for development but should be reviewed carefully for production data purity. Evidence: `src/app/lib/cms.tsx:1-408`.

## Security Risks

- Publicly readable site settings can leak API keys and external service credentials.
- Public inserts on analytics and subscriptions can be spammed.
- Admin route protection is frontend-gated, not a server-side route guard. `AppRouter` blocks unauthorized users in the client, but there is no server enforcement layer in this repo. Evidence: `src/app/App.tsx:14-39`, `src/app/lib/auth.tsx:73-110`.
- Media storage depends on manual bucket configuration, so a misconfigured bucket could accidentally expose or break asset delivery. Evidence: `docs/DEPLOYMENT_GUIDE.md:13`, `src/app/components/admin/MediaLibrary.tsx:255-293`.

## Deployment Risks

- Search engine indexing is blocked by the hardcoded robots directive.
- Vercel deployment will work only if the Supabase env vars are set correctly and the storage bucket is created manually.
- There is no automated QA gate in the repo to catch regressions before deploy.
- Public pages rely on direct Supabase reads, so any Supabase policy mistake becomes a production outage or leak immediately.

## Missing Features

- Route-specific SEO metadata, canonical URLs, and social preview tags.
- Real mobile navigation drawer or menu behavior.
- Functional pagination on category and search pages.
- Comment persistence and moderation.
- Working newsletter subscription flow.
- Real ad delivery logic tied to inventory records.
- Android/PWA packaging assets and offline support.
- Test and lint automation.

## Production Blockers

- `noindex, nofollow` on the root document.
- Public exposure of secrets/config data through `site_settings`.
- Manual-only media bucket setup.
- Lack of route-level SEO metadata.
- Nonfunctional mobile menu.

## Final Verdict

NOT READY FOR LIVE DEPLOYMENT

