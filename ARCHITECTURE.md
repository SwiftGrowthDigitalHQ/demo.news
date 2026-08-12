# ARCHITECTURE.md — SangTX Technical Architecture

---

## Frontend

### Framework & Build

| Item | Value |
|---|---|
| Framework | React 18.3 + TypeScript 5.9 |
| Build tool | Vite 6.3 |
| Vite plugins | `@vitejs/plugin-react`, `@tailwindcss/vite` (Tailwind v4 — no PostCSS) |
| Path alias | `@` → `./src` |

### Routing

Custom SPA router — **not react-router** (despite it being installed as a dep).

- `AppNavigationProvider` wraps `window.history.pushState` / `popstate` events.
- Exposes `{ pathname, search, navigate }` via React Context.
- All routing is string-matching in `resolveRoute()` and `AppRouter` inside `src/app/App.tsx`.
- `AppLink` handles internal links with `<a>` + `event.preventDefault() + navigate()`.

Route types: `saas` | `tenant` | `admin` | `demo` | `404`

### State Management

React Context only — no Redux, Zustand, or Jotai.

| Context | File | Purpose |
|---|---|---|
| `AppNavigationContext` | `lib/navigation.tsx` | URL state, navigate() |
| `I18nContext` | `lib/i18n.tsx` | Active language, t() |
| `AuthContext` | `lib/auth.tsx` | Supabase session, profile, roles |
| `CmsContext` | `lib/cms.tsx` | Public news content (articles, categories, settings, ads) |

### Provider Tree (App.tsx)

```
AppNavigationProvider
  └── I18nProvider
        └── LanguageGatedApp (first-visit language wall)
              └── AuthProvider
                    └── Toaster
                          └── AppRouter
                                └── CmsProvider (tenant news portal routes only)
                                      ├── BrandingBridge
                                      ├── SeoBridge
                                      ├── PushNotificationPrompt
                                      └── TenantRouter
```

### UI Components

- Radix UI primitives (full set: accordion, dialog, dropdown, tabs, etc.)
- Tailwind CSS v4 utility classes
- Lucide React icons
- shadcn/ui component patterns
- Framer Motion (animations)
- Embla Carousel (article/breaking news carousels)
- Recharts (analytics charts)
- Sonner (toast notifications)

### Key Source Files

| File | Purpose |
|---|---|
| `src/app/App.tsx` | All providers, routing logic, tenant slug resolution |
| `src/app/lib/navigation.tsx` | Custom SPA router |
| `src/app/lib/auth.tsx` | Auth provider + profile loading |
| `src/app/lib/cms.tsx` | CMS provider — all public content loading |
| `src/app/lib/admin.ts` | All admin CRUD operations |
| `src/app/lib/payment.ts` | Plan config, UPI helpers, tenant/payment DB ops |
| `src/app/lib/i18n.tsx` | i18n provider, language gate, missing-key detection |
| `src/app/lib/i18n-en.ts` | Canonical translation keys (~200+) |
| `src/app/lib/i18n-hi.ts` | Hindi translations |
| `src/app/lib/i18n-bho.ts` | Bhojpuri translations |
| `src/app/lib/demoContent.ts` | Empty arrays — backward-compat stub only |
| `src/app/pages/DemoPortal.tsx` | Complete demo portal + demo admin (hardcoded) |
| `src/app/pages/AdminPage.tsx` | Admin shell — section routing to 20 admin components |
| `src/app/pages/SangTXHomePage.tsx` | SangTX marketing homepage |
| `src/app/pages/SangTXOnboardingPage.tsx` | 7-step tenant creation wizard |
| `src/app/components/BrandingBridge.tsx` | Applies theme_config (colors, logo) to DOM |
| `src/app/components/SeoBridge.tsx` | Sets document title, meta tags, Open Graph |

---

## Database

### Provider

Supabase (PostgreSQL + Supabase Auth + Supabase Storage)

### Client

`src/lib/supabase.ts` — singleton browser client. Returns `null` if env vars are missing (graceful degradation to empty content, not crash).

```
VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY → getSupabaseClient()
```

### Core Tables

| Table | Key columns | Notes |
|---|---|---|
| `public.roles` | id, name, slug, is_system | Seeded: super_admin, admin, editor, reporter |
| `public.permissions` | id, key, name | 16 permissions |
| `public.role_permissions` | role_id, permission_id | Many-to-many |
| `public.users` | id, auth_user_id, role_id, full_name, email, status | Links to auth.users |
| `public.reporters` | id, user_id, full_name, slug, bio, specialty, social_links | Reporter profiles |
| `public.categories` | id, name, slug, sort_order, is_featured, seo_* | News categories |
| `public.articles` | id, slug, title, excerpt, content (JSONB array), category_id, author_id, status, featured, trending, breaking | Article content as paragraph arrays |
| `public.article_tags` | article_id, tag | Many-to-many |
| `public.breaking_news` | id, headline, link_url, is_active, starts_at, ends_at, sort_order | Ticker items |
| `public.media` | id, file_name, file_path, storage_bucket, mime_type, file_size | Supabase Storage references |
| `public.site_settings` | id, site_name, logo_url, theme_config (JSONB), social_links (JSONB) | Single branding row per deployment |
| `public.advertisements` | id, placement, ad_type, advertiser_name, is_active, click_count, impression_count | Direct or AdSense |
| `public.seo_settings` | id, page_path, meta_title, meta_description, og_*, twitter_*, schema_json, canonical_url | Per-page SEO |
| `public.notifications` | id, title, message, channel, status, scheduled_at | Push/email drafts |
| `public.subscriptions` | id, email, full_name, status | Email newsletter subscribers |
| `public.audit_logs` | id, actor_user_id, action, entity_type, entity_id, metadata | Audit trail |
| `public.analytics_events` | id, event_type, page_path, article_id, session_id | Visitor tracking |
| `public.tenants` | id, slug, name, language, owner_auth_user_id, subscription_status, subscription_plan, trial_* | One row per SaaS customer |
| `public.tenant_payments` | id, tenant_id, plan, amount, upi_id_used, utr, status, reviewed_by | Manual UPI payment submissions |
| `public.payment_config` | id, upi_id, merchant_name, monthly_price, yearly_price, trial_days, grace_period_days | Single config row (fixed UUID) |

### Article Content Format

`articles.content` is a JSONB array of paragraph strings:
```json
["First paragraph text.", "Second paragraph text.", "Third paragraph text."]
```

### RPCs (Supabase Functions)

- `search_articles(search_term, result_limit, result_offset)` — full-text search
- `track_analytics_event(p_event_type, p_page_path, p_article_id, ...)` — rate-limited analytics write
- `create_newsletter_subscription(p_email, p_full_name, p_source, ...)` — rate-limited subscriber insert

### Migrations

| File | Purpose |
|---|---|
| `supabase/migrations/20260613000100_initial_schema.sql` | Main schema — all core tables, RLS, RPCs, indexes |
| `docs/TENANTS_MIGRATION.sql` | `tenants` table + RLS + updated_at trigger |
| `docs/PAYMENT_SYSTEM_MIGRATION.sql` | `payment_config` + `tenant_payments` + RLS |
| `docs/PRODUCTION_SEED.sql` | Roles, permissions, site_settings, categories, users, reporters, articles, breaking_news, ads |

---

## Storage

- Supabase Storage, bucket name: `media`
- Public bucket (direct URL access for media previews)
- Upload path pattern: `media/{uuid}.{ext}` for articles; `logos/{slug}-{timestamp}.{ext}` for tenant logos
- Admin media upload: `src/app/lib/admin.ts → uploadAdminMedia()`

---

## Authentication

- Provider: Supabase Auth
- Methods: email+password (signInWithPassword), signUp, resetPasswordForEmail, updateUser
- Session: persisted in localStorage, auto-refreshed, URL-detected for password reset flows
- Profile: loaded from `public.users` joined with `roles` on every session

### Roles

| Slug | Access |
|---|---|
| `super_admin` | Full access — all 16 permissions + tenant/payment management |
| `admin` | 14 permissions (all except manage_roles and manage_permissions) |
| `editor` | Articles, categories, media, breaking news, reporters |
| `reporter` | Articles and media only |

### Admin Gate

`canAccessAdmin = role_slug in ['super_admin', 'admin', 'editor']`

Route `/admin/*` redirects to `SangTXAuthPage mode="login"` if not authenticated or not canAccessAdmin.

---

## Tenant Architecture

### Identification

Tenant is identified by the first URL path segment. `resolveRoute()` in `App.tsx` checks if `pathname.split('/')[1]` is in `TENANT_SLUGS`.

```typescript
const TENANT_SLUGS = new Set(['buxar-news', 'patna-news', 'rohtas-news']);
```

Adding a new tenant = adding its slug to this Set.

### Isolation Model (Current)

The deployment guide describes a **clone-per-tenant** model: one Supabase project + one app deployment per customer. The CMS queries have no `tenant_id` filter — they read all data in the project (which belongs to one customer only).

The `tenants` table and `tenant_id` field in `tenant_payments` exist for the **SaaS management layer** (tracking all customers from a single Superadmin view), not for isolating content queries.

### Tenant Registration

Route: `/onboarding` → `SangTXOnboardingPage`

1. Step 7: calls `supabase.auth.signUp()` → gets `authUserId`
2. Inserts row into `public.tenants` with `subscription_status: 'TRIAL'`, `trial_ends_at: now + 7 days`
3. Uploads logo to Supabase Storage if provided
4. Inserts row into `public.users` linked to `authUserId`
5. Signs the user in automatically
6. Redirects to `/admin`

Reserved slugs (cannot be claimed): `admin`, `login`, `register`, `pricing`, `features`, `demo`, `contact`, `privacy`, `terms`, `onboarding`, `api`, `superadmin`, `sangtx`, `buxar-news`, `patna-news`, `rohtas-news`, `forgot-password`, `reset-password`

### Branding

`BrandingBridge` reads `siteSettings.theme_config` from CmsContext and applies `primary_color`, `secondary_color` as CSS custom properties + updates document favicon/logo.

`SeoBridge` reads `siteSettings` and sets document title, meta description, Open Graph tags.

---

## Subscription System

All logic in `src/app/lib/payment.ts`.

### Plan Config (single source of truth)

```typescript
PLANS = {
  monthly: { price: 499, currency: 'INR', intervalMonths: 1 },
  yearly:  { price: 5599, currency: 'INR', intervalMonths: 12 },
}
DEFAULT_UPI_CONFIG = { upiId: '9229721835-2@ibl', merchantName: 'SangTX' }
```

Plan prices are also stored in `payment_config` DB table (single row, fixed UUID `40000000-0000-0000-0000-000000000001`) and loaded at runtime — DB values override code defaults.

### Status Flow

```
TRIAL → PAYMENT_DUE → PAYMENT_PENDING → ACTIVE → (period ends) → PAYMENT_DUE
                   ↑_________________________________|
PAYMENT_DUE + 3-day grace expired → SUSPENDED
REJECTED → PAYMENT_DUE
CANCELLED (voluntary)
```

### Admin Operations

- `approvePayment()` — updates payment status to APPROVED, sets tenant to ACTIVE with new period_start/end, writes audit log
- `rejectPayment()` — updates payment to REJECTED, reverts tenant to PAYMENT_DUE
- `adminSetTenantStatus()` — manually set tenant subscription status
- `updatePaymentConfig()` — update UPI ID, plan prices, trial/grace days

---

## Demo System

Routes: `/demo`, `/demo/article/:slug`, `/demo/category/:slug`, `/demo/search`, `/demo/admin`, `/demo/admin/*`

- `resolveRoute()` returns `type: 'demo'` before any CmsProvider is mounted.
- `DemoPortal` component renders with **zero Supabase calls**.
- All demo articles (40), categories (10), and admin data are hardcoded in `DemoPortal.tsx`.
- Demo publication name: DISHA NEWS (tagline: "Sample Publication").
- Demo banner is always visible.
- All write actions in demo admin are disabled (`disabled`, `cursor-not-allowed`).

---

## Localization

### System

- Storage: `localStorage` → key `sangtx_language` → values `'en' | 'hi' | 'bho'`
- On first visit (no saved key): `LanguageGate` blocks app, user selects language
- Language selection updates `<html lang>`, body class `lang-devanagari` (for hi/bho), and `data-lang` attribute

### Translation

- `t(key: TranslationKey, vars?: Record<string, string|number>): string`
- Supports `{varName}` interpolation in strings
- TypeScript `TranslationKey = keyof typeof en` enforces compile-time key safety
- Missing key in dev: logs warning, returns `[MISSING: key.name]`
- Missing key in prod: returns raw key string — never silently falls back to English

### Files

| File | Language | Coverage |
|---|---|---|
| `src/app/lib/i18n-en.ts` | English (canonical) | 100% — all keys defined here |
| `src/app/lib/i18n-hi.ts` | Hindi | 100% |
| `src/app/lib/i18n-bho.ts` | Bhojpuri | 100% |

---

## Deployment

### Platform

Vercel — config in `vercel.json`:
- Build: `npm run build` → `dist/`
- SPA rewrite: all paths → `/index.html`
- Cache: `/assets/*` immutable (1 year), static files 1 hour

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase anon key |
| `VITE_SITE_URL` | Recommended | Canonical URL for SEO |
| `VITE_SITE_MODE` | Optional | `"saas"` for marketing; `"news"` (default) for tenant |
| `VITE_FIREBASE_*` | Optional | Firebase Cloud Messaging (7 vars) |

Scripts (Node.js only, never exposed to browser): `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`

### Build Scripts

```
npm run dev          # Vite dev server
npm run build        # Production build → dist/
npm run typecheck    # tsc --noEmit
npm run lint         # ESLint
npm run check        # typecheck + lint + build (full CI gate)
```

### Code Splitting (Rollup manual chunks)

- `react` → react + react-dom
- `supabase` → @supabase/supabase-js
- `firebase` → firebase/app + firebase/messaging
- `charts` → recharts

### SEO Asset Generation

`scripts/generate-seo-assets.mjs` — generates `public/robots.txt` and `public/sitemap.xml` at build time.

### Launch Status

Per `docs/FINAL_LAUNCH_AUDIT_V2.md`: **87% readiness. ✅ READY FOR LIVE DEPLOYMENT.** No critical blockers.

---

## Admin Panel Sections

Route: `/admin/[section]` — all sections are lazy-loaded React components.

| Section path | Component | Super-admin only? |
|---|---|---|
| `/admin` | OverviewDashboard | No |
| `/admin/news` | NewsManagement | No |
| `/admin/categories` | AdminCategories | No |
| `/admin/media` | MediaLibrary | No |
| `/admin/breaking` | BreakingNewsControl | No |
| `/admin/journalists` | JournalistManagement | No |
| `/admin/users` | UserManagement | No |
| `/admin/roles` | AdminRoles | No |
| `/admin/ads` | AdvertisementManagement | No |
| `/admin/subscriptions` | SubscriptionSystem | No |
| `/admin/my-subscription` | SubscriptionDashboard | No |
| `/admin/tenant-payments` | TenantPaymentsPanel | Yes |
| `/admin/tenants` | TenantsPanel | Yes |
| `/admin/seo` | SEOManagement | No |
| `/admin/notifications` | AdminNotifications | No |
| `/admin/settings` | SettingsPanel | No |
| `/admin/security` | SecurityPanel | No |
| `/admin/reports` | AdminReports | No |
| `/admin/analytics` | AnalyticsDashboard | No |
