# AGENTS.md - demo-news-web-app

## Project Overview
React 18 + TypeScript + Vite + Tailwind CSS 4 + Supabase multi-tenant news platform.

## Key Commands
| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server on http://localhost:5173 |
| `npm run build` | Production build to dist/ |
| `npm run typecheck` | `tsc --noEmit` (skipLibCheck: true) |
| `npm run lint` | ESLint on `src/**/*.{ts,tsx}` (ignores `supabase/functions/`, `scripts/`) |
| `npm run check` | **Run all**: typecheck → lint → build **(must pass before commit)** |
| `npm run preview` | Preview production build |

## Environment Variables
Create `.env` from `.env.example`. **Required**:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

**Optional but recommended**:
- `VITE_SITE_URL` — must match Supabase redirect URLs
- `VITE_SITE_MODE=saas` (sangtx.com) or `news` (tenant deployments)
- `VITE_GOOGLE_OAUTH_CLIENT_ID` — required for Google integrations

**Server-side only** (no `VITE_` prefix): Set in Supabase Dashboard > Edge Functions > Secrets:
- `GOOGLE_OAUTH_CLIENT_SECRET`, `GDRIVE_ENCRYPTION_KEY`, `YOUTUBE_ENCRYPTION_KEY`, `SITE_URL`

## Architecture Highlights
- **Entry point**: `src/main.tsx` → `src/app/App.tsx` (contains all routing logic)
- **Path alias**: `@/*` → `./src/*` (tsconfig.json + vite.config.ts)
- **Multi-tenant routing**: `App.tsx:resolveRoute()` — SaaS pages, tenant portals by slug or custom domain, `/admin`, `/super-admin`, `/demo`
- **Auth**: `AuthProvider` in `src/app/lib/auth.tsx` — Supabase Auth with PKCE
- **CMS**: `CmsProvider` in `src/app/lib/cms.tsx` — tenant-scoped data fetching
- **Supabase client**: `src/lib/supabase.ts` — singleton, lazy-initialized from VITE env vars

## Common Gotchas
- **No test suite** — rely on `npm run check` + manual browser verification
- **`no-console: error`** — ESLint prohibits `console.log`; use debug logging sparingly
- **Tenant routing is async** — `resolveRoute()` does DB lookups; loading spinner shown during resolution
- **Admin access** — requires `auth.canAccessAdmin` (checked in `App.tsx`)
- **Custom domains** — resolved via `getTenantByDomain()` in `src/app/lib/domainResolver.ts`
- **Edge Function secrets** — set in Supabase Dashboard; **not** in `.env`
- **`console.log` is an ESLint error** (not warning)

## File Structure (Key Directories)
```
src/
├── app/        # App shell, routing, providers, pages
│   ├── lib/    # Auth, CMS, Navigation, i18n, Tenant Registry
│   ├── pages/  # Lazy-loaded page components
│   └── types/  # TypeScript types
├── components/ # Shared UI (Radix-based)
├── features/   # Feature modules (admin, auth, articles, ads, categories)
├── lib/        # Supabase client
├── services/   # Business logic services
└── styles/     # Global CSS (Tailwind entry)
```

## Deployment
- **Vercel**: `vercel.json` configured for SPA rewrites + asset caching
- **Build**: `npm run build` → `dist/`
- **Environment**: Set all `VITE_*` vars in Vercel project settings

## References
- `README_MULTI_TENANT_MIGRATION.md` — multi-tenant architecture details
- `COMPLETE_IMPLEMENTATION_CHECKLIST.md` — feature completion status
- `DEPLOY_EDGE_FUNCTIONS.md` — Edge Function deployment guide
- `CONFIGURE_SUPABASE_SECRETS.md` — Supabase secrets setup