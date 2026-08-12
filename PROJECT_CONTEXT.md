# PROJECT_CONTEXT.md — SangTX Product & Business Context

---

## Product Overview

SangTX is a SaaS platform that lets local and regional news publishers launch a complete, branded news website and Android app — without building from scratch.

A customer signs up, goes through a 7-step onboarding wizard, gets a 7-day free trial, and receives a full news platform under their own brand: name, logo, colors, domain, and editorial workflow.

The platform is built on a single React SPA deployed on Vercel, backed by Supabase (PostgreSQL + Auth + Storage).

---

## Target Customers

- Local news publishers (district / city level)
- Regional news channels (Bihar, UP, and adjacent markets)
- Digital-first news operations
- YouTube news creators expanding to a web presence
- First-time online news publishers

Primary geography: Bihar, India. Primary language: Hindi (Devanagari). Also supports Bhojpuri.

---

## Product Suite

| Component | Description |
|---|---|
| News Website | Public-facing SPA with homepage, articles, categories, search, breaking ticker |
| CMS / Admin | Full admin dashboard with 20 sections |
| Android App | Branded app — ₹3,000 one-time, manual delivery (not automated) |
| SEO | Per-page meta, Open Graph, Twitter cards, canonical URLs, sitemap |
| Ads | Direct placements + Google AdSense slots, impression/click tracking |
| Analytics | Page views, article performance, top content, visitor behavior |
| Push Notifications | Firebase Cloud Messaging — web push |
| Media Library | Supabase Storage backed, with alt text and usage tracking |
| Reporter Profiles | Bio, specialty, social links, byline attribution |
| User & Role Management | super_admin, admin, editor, reporter — granular permissions |
| Subscriptions | Manual UPI payment, trial, approval workflow, audit log |
| Localization | English, Hindi, Bhojpuri — no silent English fallback |

---

## Pricing

| Plan | Price | Trial |
|---|---|---|
| Monthly | ₹499/month | 7 days free |
| Yearly | ₹5,599/year | 7 days free |
| Android App | ₹3,000 one-time add-on | — |

- No free plan. No separate free tier.
- Trial is 7 days on both paid plans. No credit card required.
- After trial ends: PAYMENT_DUE → customer pays via UPI → admin manually approves → ACTIVE.

---

## Payment

- Method: Manual UPI only.
- UPI ID: `9229721835-2@ibl`
- Merchant name: `SangTX`
- Customer pays UPI → submits UTR number (+ optional screenshot) → PAYMENT_PENDING → Superadmin manually verifies in `/admin/tenant-payments` → APPROVED → subscription ACTIVE for the next period.
- No automatic payment verification. No Razorpay. No Stripe.
- Grace period after PAYMENT_DUE: 3 days before suspension.

---

## Current Product Status

### IMPLEMENTED (verified in source code)

- SangTX marketing homepage (`/`) — fully localized in 3 languages
- Language gate (first-visit language selection)
- i18n system — English, Hindi, Bhojpuri (100% key coverage, ~200+ keys)
- SaaS authentication (login, register, forgot/reset password) via Supabase Auth
- 7-step tenant onboarding wizard (`/onboarding`) — creates auth user + tenant row
- Full CMS admin panel — 20 sections (news, categories, media, breaking news, reporters, users, roles, ads, subscriptions, SEO, notifications, settings, security, analytics, reports, tenant payments, tenants panel)
- Public news portal — homepage, article, category, search, static pages (about, contact, privacy, terms, disclaimer, editorial policy, advertise, cookie policy, sitemap, unsubscribe)
- Manual UPI subscription and payment system — complete flow + admin approval UI
- TenantsPanel and TenantPaymentsPanel for super_admin
- Customer SubscriptionDashboard (`/admin/my-subscription`)
- Firebase Cloud Messaging push notifications
- Demo portal at `/demo` — fully isolated, no Supabase, fictional publication
- Demo admin at `/demo/admin` — read-only CMS replica
- SEO: per-page meta, Open Graph, Twitter cards, canonical, robots.txt, sitemap.xml
- Supabase Storage media uploads
- Ad system (direct + AdSense) with click/impression tracking
- Audit logging on all admin actions
- Analytics event tracking (RPC-based, rate-limited)
- Dark mode toggle in admin
- Mobile-responsive admin (drawer sidebar)
- Vercel deployment config + SPA routing

### PARTIAL (exists but incomplete or not fully wired)

- Tenant isolation at query level: the CMS queries Supabase without a `tenant_id` filter. Current model = one Supabase project per tenant deployment. Multi-tenant isolation in DB exists in schema (`tenants` table + RLS) but the public news portal queries are not yet filtered per tenant.
- Dynamic tenant slug resolution: new tenants require a code change to `TENANT_SLUGS` in `App.tsx` — not yet driven from DB.
- Tenant suspension routing: `TenantSuspendedPage` component exists but the routing logic to auto-redirect a suspended tenant's public site is not wired.
- ProfilePage: saved articles and reading history are placeholder UI only.

### PLANNED / NOT YET IMPLEMENTED

- Email newsletter actual sending (subscriber collection works; SMTP dispatch not implemented)
- Android app delivery automation (currently manual)
- Ad revenue formal billing ledger (ad impression/click tracking exists; no audited revenue accounting)
- Live DB content: as of the production audit, all Supabase tables had 0 rows — seed SQL has not been applied to the live project.

---

## Demo

The demo is located at `/demo` and `/demo/admin`.

- It is completely isolated — no Supabase connection, no real data.
- All demo content is hardcoded in `src/app/pages/DemoPortal.tsx`.
- Fictional publication name: **DISHA NEWS** (tagline: "Sample Publication").
- 40 demo articles across 10 categories, 4 fictional authors.
- Demo admin (`/demo/admin`) is a visual replica of the real CMS with all write actions disabled.
- A persistent top banner labels everything as demo.
- Demo must NEVER mutate real customer data.

`src/app/lib/demoContent.ts` contains only empty arrays — it is a backward-compat stub. Ignore it for content.

---

## Languages

| Code | Language | Script |
|---|---|---|
| `hi` | Hindi | Devanagari |
| `en` | English | Latin |
| `bho` | Bhojpuri | Devanagari |

- Language is saved in `localStorage` under key `sangtx_language`.
- On first visit, a full-screen language gate appears before the app loads.
- All translation keys must exist in all three language files.
- `lang-devanagari` body class applies Devanagari typography for `hi` and `bho`.
- No silent English fallback — missing keys are surfaced visibly.

---

## Important Existing Tenants

| Slug | Status | Notes |
|---|---|---|
| `buxar-news` | Development / reference tenant | Hardcoded in `TENANT_SLUGS` and `RESERVED_SLUGS`. Fallback site name in `demoContent.ts`. Not a live customer as of last audit. |
| `patna-news` | Reserved slug | Hardcoded in `TENANT_SLUGS` and `RESERVED_SLUGS`. No live data. |
| `rohtas-news` | Reserved slug | Hardcoded in `TENANT_SLUGS` and `RESERVED_SLUGS`. No live data. |

**Live database status:** As of the production audit (`docs/PRODUCTION_DATA_AUDIT.md`), all Supabase tables returned 0 rows. The production seed SQL (`docs/PRODUCTION_SEED.sql`) has not yet been applied to the live project.

The production seed references a "Sitamarhi / Newsroom" context with categories: Bihar, Sitamarhi, Politics, Crime, Education. This is the intended starting content for the first real deployment.

---

## Builder / Operator

- Company: SwiftGrowthDigital
- Footer credit: "Built by SwiftGrowthDigital"
