# CHANGELOG.md — SangTX History of Significant Changes

This file records meaningful architecture, business, security, and feature changes only.
Do not add entries for routine UI tweaks, copy edits, or minor style fixes.

---

## 2026-08-12

### Project Memory Created
- Created AGENTS.md, PROJECT_CONTEXT.md, ARCHITECTURE.md, CHANGELOG.md.
- Establishes permanent AI-readable project memory to reduce repeated codebase analysis in future sessions.

---

## 2026 (Recovered from repository — approximate chronology)

### SaaS Architecture

- Evolved from single-tenant newsroom CMS to SaaS platform (SangTX) with multi-tenant management layer.
- Added `/onboarding` — 7-step tenant creation wizard.
  - Creates Supabase auth user + `tenants` row on completion.
  - Sets `subscription_status: 'TRIAL'`, `trial_ends_at: now + 7 days`.
- Added `tenants` table (`docs/TENANTS_MIGRATION.sql`) with RLS.
- Added reserved slug list to prevent tenants from claiming system routes.

### Subscription & Payment System

- Added manual UPI payment flow (`src/app/lib/payment.ts`).
  - Plans: monthly ₹499, yearly ₹5,599.
  - UPI ID: `9229721835-2@ibl`, merchant: SangTX.
  - Trial: 7 days. Grace period: 3 days.
- Added `payment_config` and `tenant_payments` tables (`docs/PAYMENT_SYSTEM_MIGRATION.sql`).
- Added `SubscriptionDashboard` — customer payment submission UI.
- Added `TenantPaymentsPanel` — super_admin approve/reject payments.
- Added `TenantsPanel` — super_admin tenant management.
- Subscription status flow: TRIAL → PAYMENT_DUE → PAYMENT_PENDING → ACTIVE → SUSPENDED/CANCELLED.
- All payment approvals/rejections write audit log entries.

### Localization (i18n)

- Added 3-language i18n system: English, Hindi (Devanagari), Bhojpuri (Devanagari).
- Storage: `localStorage` key `sangtx_language`.
- Language gate added — blocks app on first visit until language is selected.
- ~200+ translation keys, 100% coverage in all three language files.
- TypeScript `TranslationKey` type enforces compile-time key safety.
- No silent English fallback — missing keys surface visibly in dev.
- `lang-devanagari` body class applied for Hindi and Bhojpuri.

### Demo System

- Added `/demo` public portal — fully isolated from Supabase (no DB calls).
- Added `/demo/admin` — read-only CMS replica.
- Demo publication name: DISHA NEWS (fictional, not tied to any real publication).
- 40 demo articles hardcoded in `DemoPortal.tsx`.
- `demoContent.ts` emptied — all arrays are now empty (backward-compat stub only).
- Persistent "DEMO — read only" banner on all demo pages.

### CMS Admin Panel

- Added 20-section admin panel (`/admin/*`).
- Sections: overview, news, categories, media, breaking news, journalists, users, roles, ads, subscriptions, my-subscription, tenant-payments, tenants, SEO, notifications, settings, security, reports, analytics.
- Admin is auth-gated: requires `role_slug in ['super_admin', 'admin', 'editor']`.
- Dark mode toggle added to admin.
- Mobile-responsive admin with drawer sidebar (Sheet component).

### Security

- RLS enabled on all Supabase tables.
- `site_settings.theme_config` sanitized — secret-like keys (SMTP passwords, etc.) stripped before public exposure.
- Analytics and newsletter writes moved to RPCs with rate limiting.
- Media upload constraints via Supabase Storage bucket policies.
- Audit log on all significant admin actions (payment approvals, rejections, tenant status changes).

### SEO & Deployment

- `SeoBridge` component — sets document title, meta description, Open Graph, Twitter cards per route.
- `BrandingBridge` — applies primary/secondary color from `site_settings.theme_config` as CSS custom properties.
- `scripts/generate-seo-assets.mjs` — generates `robots.txt` and `sitemap.xml` at build time.
- Vercel deployment config (`vercel.json`) — SPA rewrite, immutable asset caching.
- Launch readiness: 87% — no critical blockers (per `docs/FINAL_LAUNCH_AUDIT_V2.md`).

### Breaking News Components

- `BreakingNewsTicker` — scrolling headline ticker.
- `BreakingNewsCarousel` — carousel-style breaking news display.
- `BreakingNewsSlider` — slider variant.
- `BreakingNewsControl` admin section — manage ticker items with start/end times.

### Known Tenants (as of this writing)

- `buxar-news`, `patna-news`, `rohtas-news` — hardcoded in `TENANT_SLUGS` and `RESERVED_SLUGS`.
- Live Supabase DB: 0 rows in all tables (seed SQL not yet applied to production).

---

## Future CHANGELOG entries should follow this format:

```
## YYYY-MM-DD

### [Category: Architecture | Business | Security | Database | Feature | Bug Fix]
- Brief description of what changed and why.
- Reference to key files if relevant.
```
