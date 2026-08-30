# AGENTS.md - demo-news-web-app

## Project Overview
Multi-tenant news platform (SaaS + tenant portals) built with **React 18 + TypeScript + Vite + Tailwind CSS 4 + Supabase**.

## Key Commands
| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server on `http://localhost:5173` |
| `npm run build` | Production build to `dist/` |
| `npm run typecheck` | TypeScript type check (`tsc --noEmit`) |
| `npm run lint` | ESLint on `src/**/*.{ts,tsx}` |
| `npm run check` | **Run all**: typecheck → lint → build |
| `npm run preview` | Preview production build |

**Order matters**: Always run `npm run check` before committing/PR.

## Architecture Highlights
- **Entry point**: `src/main.tsx` → `src/app/App.tsx` (500+ lines, contains all routing logic)
- **Path alias**: `@/*` → `./src/*` (configured in `tsconfig.json` and `vite.config.ts`)
- **Multi-tenant routing**: Handled in `App.tsx:resolveRoute()` — supports:
  - SaaS marketing pages (`/`, `/features`, `/pricing`, `/login`, etc.)
  - Tenant portals via slug (`/<tenant-slug>/...`) or **custom domains**
  - Admin panel (`/admin`) — tenant-scoped, requires `admin`/`editor` role
  - Super Admin (`/super-admin`) — platform-wide, requires `super_admin` role
  - Demo portal (`/demo`)
- **Auth**: `AuthProvider` in `src/app/lib/auth.tsx` — uses Supabase Auth with PKCE flow
- **CMS**: `CmsProvider` in `src/app/lib/cms.tsx` — tenant-scoped data fetching
- **Supabase client**: `src/lib/supabase.ts` — singleton, lazy-initialized, reads `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY`

## Required Environment Variables
Create `.env` from `.env.example`:
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
VITE_SITE_URL=https://news.example.com  # recommended for production
VITE_SITE_MODE=saas  # "saas" on sangtx.com, "news" on tenant deployments
```
Optional: Firebase config for push notifications, Google OAuth Client ID for Drive/YouTube/GSC/GA4.

## Supabase Edge Functions (in `supabase/functions/`)
Functions with `verify_jwt = false` in `supabase/config.toml` (OAuth callbacks):
- `google-drive-oauth-callback`
- `youtube-oauth-callback`
- `ga4-oauth-callback`
- `gsc-oauth-callback`
- `facebook-oauth-callback`
- `ads-txt` (public ads.txt endpoint)
- `media-proxy` (Google Drive image proxy)

Deploy: `supabase functions deploy <name>` (requires Supabase CLI + linked project).

## Database Migrations
Located in `supabase/migrations/`. Apply via Supabase Dashboard or CLI:
```bash
supabase db push  # or run SQL manually in Dashboard
```

## Scripts (in `scripts/`)
- `seed-demo.mjs` — seeds demo tenant content
- `demo-content.mjs` — generates demo articles
- `apply-migration.mjs` — applies SQL migrations
- `verify-migration.mjs` — verifies migration state
- `test-custom-domains.mjs` — tests custom domain resolution

## Testing / Verification
No formal test suite. Verify manually:
1. `npm run check` — passes typecheck, lint, build
2. `npm run dev` — app loads, routes work
3. Browser test checklist: `BROWSER_TEST_CHECKLIST_TENANT_ADMIN.md`

## Common Gotchas
- **No tests** — rely on `npm run check` + manual browser verification
- **Console.log is an error** — ESLint rule `no-console: error` (use debug logging sparingly)
- **Tenant routing is async** — `resolveRoute()` does DB lookups; loading spinner shown during resolution
- **Admin access** — requires `auth.canAccessAdmin` (checked in `App.tsx:379-426`)
- **Custom domains** — resolved via `getTenantByDomain()` in `src/app/lib/domainResolver.ts`
- **Edge Function secrets** — set in Supabase Dashboard > Edge Functions > Secrets (not in `.env`):
  - `GOOGLE_OAUTH_CLIENT_SECRET`, `GDRIVE_ENCRYPTION_KEY`, `YOUTUBE_ENCRYPTION_KEY`, `SITE_URL`

## File Structure (Key Directories)
```
src/
├── app/           # App shell, routing, providers, pages
│   ├── components/   # App-level components
│   ├── lib/          # Auth, CMS, Navigation, i18n, Tenant Registry
│   ├── pages/        # All page components (lazy-loaded)
│   └── types/        # TypeScript types
├── features/      # Feature modules (admin, auth, articles, ads, categories, etc.)
├── components/    # Shared UI components (Radix-based)
├── lib/           # Supabase client
├── services/      # Business logic services
└── styles/        # Global CSS (Tailwind entry)
```

## Deployment
- **Vercel**: `vercel.json` configured for SPA rewrites + asset caching
- **Build**: `npm run build` → outputs to `dist/`
- **Environment**: Set all `VITE_*` vars in Vercel project settings

## References
- `README_MULTI_TENANT_MIGRATION.md` — multi-tenant architecture details
- `COMPLETE_IMPLEMENTATION_CHECKLIST.md` — feature completion status
- `DEPLOY_EDGE_FUNCTIONS.md` — Edge Function deployment guide
- `CONFIGURE_SUPABASE_SECRETS.md` — Supabase secrets setup