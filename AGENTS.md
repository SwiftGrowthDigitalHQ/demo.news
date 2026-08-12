# AGENTS.md — SangTX Permanent Agent Briefing

> Read this file before every task. It is the single most important document for AI agents working on this project.

---

## PROJECT IDENTITY

SangTX is a **SaaS platform for local and regional news publishers** (primarily Bihar/UP market).

Core product per customer:
- Professional news website (React SPA)
- CMS / admin dashboard
- Branded Android app (₹3,000 one-time add-on — manual delivery)
- SEO management
- Media library
- Advertisement system
- Push notifications (Firebase)
- Analytics
- Reporter / user management
- Tenant-specific branding and settings
- Subscription + payment management

---

## BUSINESS MODEL

| Plan | Price | Trial |
|---|---|---|
| Monthly | ₹499/month | 7 days free |
| Yearly | ₹5,599/year | 7 days free |
| Android App | ₹3,000 one-time | — |

- No free plan. No separate free tier.
- Payment: **Manual UPI only** — UPI ID `9229721835-2@ibl`, merchant name `SangTX`.
- No Razorpay, no Stripe — unless explicitly requested in a future task.
- After trial → PAYMENT_DUE → customer submits UTR → PAYMENT_PENDING → Superadmin manually verifies → ACTIVE.

---

## ROUTING RULE

| Path | What it is |
|---|---|
| `/` | SangTX marketing homepage |
| `/features` | SangTX features page |
| `/pricing` | SangTX pricing page |
| `/contact` | SangTX contact page |
| `/onboarding` | 7-step tenant creation wizard |
| `/login`, `/register` | SangTX SaaS auth |
| `/demo` | Demo public news portal (fictional — DISHA NEWS) |
| `/demo/admin` | Demo read-only CMS admin |
| `/admin` | Real CMS admin panel (auth-gated) |
| `/<tenant-slug>/...` | Tenant news portal (e.g. `/buxar-news/`) |

Do NOT create an Aaj Tak production tenant. Aaj Tak is sample branding only where referenced.

---

## TENANT RULE

Each customer has isolated: content, categories, media, branding, reporters, users, settings, SEO, ads, analytics, and subscription.

**Never mix tenant data. Never modify another tenant while working on one.**

Current known tenant slugs (hardcoded in `App.tsx`): `buxar-news`, `patna-news`, `rohtas-news`.

Adding a new tenant requires adding its slug to `TENANT_SLUGS` in `src/app/App.tsx`.

---

## DEMO RULE

- `/demo` is fully isolated — no Supabase connection, no real data.
- Demo content is hardcoded in `DemoPortal.tsx` (fictional publication: DISHA NEWS).
- Demo admin at `/demo/admin` is read-only — all write actions disabled.
- Do NOT use Buxar News production data as demo mutation data.
- `demoContent.ts` contains only empty arrays — kept for backward compat only.

---

## LANGUAGE RULE

Supported languages: `en` (English), `hi` (Hindi), `bho` (Bhojpuri).

- Storage key: `sangtx_language` in localStorage.
- On first visit, LanguageGate blocks the app and prompts language selection.
- Translation files: `i18n-en.ts` (canonical), `i18n-hi.ts`, `i18n-bho.ts` — all must have 100% key coverage.
- **No silent English fallback.** Missing keys return `[MISSING: key.name]` in dev, raw key string in prod.
- `TranslationKey = keyof typeof en` — TypeScript enforces key safety at compile time.
- Hindi / Bhojpuri require Devanagari typography (`lang-devanagari` body class applied automatically).

---

## DESIGN RULE

UI quality target: Senior product designer + Senior UI engineer.

Avoid:
- Generic AI-looking UI
- Excessive gradients or glassmorphism
- Unnecessary animations
- Inconsistent spacing or random colors
- Giant unnecessary rounded cards

Reuse the existing design system. Do NOT redesign unrelated pages without explicit instruction.

Primary brand color: `#dc2626` (red). Secondary: `#0f172a` (dark navy).

---

## CODE CHANGE RULE

Before editing any file:
1. Read `AGENTS.md`
2. Read `PROJECT_CONTEXT.md`
3. Read `ARCHITECTURE.md`
4. Read only the relevant source files for the requested task

Do NOT scan the entire repository unless architecture is unclear or the task affects multiple systems.

---

## MINIMAL CHANGE RULE

- Change the smallest possible set of files.
- Do not rewrite working systems.
- Do not refactor unrelated code.
- Do not rename files or components without a reason.
- Do not replace working architecture with a new architecture unless explicitly requested.

---

## DATABASE RULE

- Inspect existing schema and migrations before changing schema.
- Do not duplicate existing models.
- Do not modify production/customer data.
- Do not run destructive migrations automatically.
- Main migration: `supabase/migrations/20260613000100_initial_schema.sql`
- Tenant migration: `docs/TENANTS_MIGRATION.sql`
- Payment migration: `docs/PAYMENT_SYSTEM_MIGRATION.sql`
- Production seed: `docs/PRODUCTION_SEED.sql`

---

## SECURITY RULE

Never trust client-side:
- `tenant_id`, `user_id`, subscription status, payment amount, payment approval, trial dates, permissions.

Server / database must enforce these. RLS is enabled on all tables.

Never expose secrets, API keys, private credentials, or payment secrets in code or logs.

---

## PAYMENT RULE

Manual UPI only unless explicitly changed.

Flow:
```
TRIAL → PAYMENT_DUE → PAYMENT_PENDING → ACTIVE
                   ↑______________________|  (next period)
PAYMENT_DUE + grace (3 days) → SUSPENDED
REJECTED → back to PAYMENT_DUE
```

Never claim automatic UPI verification.

All payment config lives in `src/app/lib/payment.ts` — PLANS, DEFAULT_UPI_CONFIG, DB operations.

---

## TRIAL RULE

- Both paid plans include a 7-day free trial.
- No payment during initial trial.
- After trial: PAYMENT_DUE, then manual UPI submission.
- Do NOT create a separate free subscription plan.

---

## DEMO READ-ONLY RULE

Demo users can: browse public website, articles, categories, admin views, analytics displays.

Demo users cannot: create, update, delete, upload, publish, approve, reject, or modify anything.

All demo write buttons are disabled with `cursor-not-allowed`.

---

## DOCUMENTATION UPDATE RULE

Update documentation when:
- Architecture changes
- Business logic changes
- Database schema changes
- Security decisions change
- Major features are added or removed

Do NOT rewrite all documentation after every tiny UI change.

Update `CHANGELOG.md` only for meaningful changes.

---

## OUTPUT RULE

At the end of every implementation task, report:
1. What changed
2. Files changed
3. Tests run (or why none were run)
4. Build / typecheck result
5. Known limitations

Keep the final report concise.

---

## SOURCE OF TRUTH PRIORITY

1. Current source code
2. Database schema / migrations
3. `AGENTS.md`
4. `ARCHITECTURE.md`
5. `PROJECT_CONTEXT.md`
6. `CHANGELOG.md`

If documentation conflicts with actual code: verify the source code first, then update the docs.
