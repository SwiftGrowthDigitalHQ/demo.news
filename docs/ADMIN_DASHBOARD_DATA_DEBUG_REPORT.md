# Admin Dashboard Data Debug Report

Scope: this report traces the admin dashboard data flow in the current repository and compares it against live Supabase responses. No code was patched for this audit.

## Executive Summary

The admin dashboard code path itself is not stuck in an obvious infinite-loading loop. The dashboard overview calls five Supabase reads in a single `Promise.all(...)`, and the component has both `catch` and `finally` branches that should clear the loading state.

What I observed in the live Supabase project is different:

- The documented sample login does not work against the auth service.
- The dashboard tables are reachable, but they all return empty result sets.
- Public CMS tables are also empty.
- There is no evidence of a missing table or missing RLS policy in the migration file.

So the strongest evidence points to a provisioning/data problem, not a malformed dashboard query:

- No seeded live content.
- No working documented auth account.
- No admin dashboard rows to render.

If the browser still shows a permanent loading spinner after a successful login, that behavior is not explained by the Supabase responses I captured here and would need a live browser trace.

## Data Flow Trace

### Dashboard render path

- [`src/app/pages/AdminPage.tsx`](../src/app/pages/AdminPage.tsx) chooses `OverviewDashboard` for `/admin`.
- [`src/app/components/admin/OverviewDashboard.tsx`](../src/app/components/admin/OverviewDashboard.tsx) runs:
  - `listAdminArticles()`
  - `listAdminReporters()`
  - `listAdminAds()`
  - `listBreakingNews()`
  - `listAuditLogs()`
- The same component clears loading in `finally` and renders the loading state only while `loading === true`.

Relevant code:

- [`src/app/components/admin/OverviewDashboard.tsx:74-79`](../src/app/components/admin/OverviewDashboard.tsx#L74)
- [`src/app/components/admin/OverviewDashboard.tsx:127-161`](../src/app/components/admin/OverviewDashboard.tsx#L127)

### Query helpers

The dashboard queries in [`src/app/lib/admin.ts`](../src/app/lib/admin.ts) are direct Supabase reads:

- `articles`
- `reporters`
- `advertisements`
- `breaking_news`
- `audit_logs`

Relevant code:

- [`src/app/lib/admin.ts:275-314`](../src/app/lib/admin.ts#L275)
- [`src/app/lib/admin.ts:482-498`](../src/app/lib/admin.ts#L482)
- [`src/app/lib/admin.ts:536-536`](../src/app/lib/admin.ts#L536)
- [`src/app/lib/admin.ts:641-645`](../src/app/lib/admin.ts#L641)
- [`src/app/lib/admin.ts:839-839`](../src/app/lib/admin.ts#L839)

### Auth flow

- [`src/app/lib/auth.tsx`](../src/app/lib/auth.tsx) loads the current session, then tries to map the auth user to a `public.users` profile row.
- Admin access is granted only when the profile role slug is one of `super_admin`, `admin`, or `editor`.

Relevant code:

- [`src/app/lib/auth.tsx:29-41`](../src/app/lib/auth.tsx#L29)
- [`src/app/lib/auth.tsx:73-110`](../src/app/lib/auth.tsx#L73)

### CMS provider

- [`src/app/lib/cms.tsx`](../src/app/lib/cms.tsx) only falls back to demo content when the Supabase client is unavailable.
- In this workspace, Supabase env vars are present, so the app uses live Supabase reads.
- The public CMS tables are empty in the live project, which means public pages can still appear populated via demo merge behavior, while the admin dashboard remains empty.

Relevant code:

- [`src/app/lib/cms.tsx:218-226`](../src/app/lib/cms.tsx#L218)
- [`src/app/lib/cms.tsx:354-360`](../src/app/lib/cms.tsx#L354)

## Live Request Log

I logged the live requests by replaying the same Supabase calls used by the app.

### Auth login

Request:

- `POST https://csuocfxbucohfvowfwtq.supabase.co/auth/v1/token?grant_type=password`

Body:

```json
{"email":"admin@example.com","password":"secret","gotrue_meta_security":{}}
```

Response:

- Status: `400 Bad Request`
- Error: `invalid_credentials`
- Message: `Invalid login credentials`

This is the only failed request I was able to reproduce.

### Dashboard reads

All five dashboard reads completed successfully and returned empty arrays:

- `GET /rest/v1/articles?...` -> `200 OK`, `[]`
- `GET /rest/v1/reporters?...` -> `200 OK`, `[]`
- `GET /rest/v1/advertisements?...` -> `200 OK`, `[]`
- `GET /rest/v1/breaking_news?...` -> `200 OK`, `[]`
- `GET /rest/v1/audit_logs?...` -> `200 OK`, `[]`

No Supabase error was returned by any of those five dashboard queries.

### Public CMS reads

These public reads also returned `200 OK` with empty arrays:

- `site_settings`
- `categories`
- `articles` with `status = published`
- `breaking_news`
- `advertisements`

## Exact Failing Query

The only failing live request I observed was the auth login call:

- Query type: `supabase.auth.signInWithPassword`
- Endpoint: `POST /auth/v1/token?grant_type=password`
- Credentials tested: `admin@example.com` / `secret`
- Supabase error: `invalid_credentials`

For the dashboard data reads themselves, there was no failing Supabase query. They all returned `200 OK` with empty payloads.

## Exact Table Names Checked

Dashboard tables:

- `articles`
- `reporters`
- `advertisements`
- `breaking_news`
- `audit_logs`

Public CMS tables:

- `site_settings`
- `categories`

All of the above returned empty data in the live project when queried with the anon key.

## Missing Migration Objects

I did not find a missing dashboard table or missing RLS policy in the migration file.

The migration already contains:

- the dashboard tables
- the `media` storage bucket creation
- RLS policies
- the `search_articles` RPC
- the `track_analytics_event` RPC
- the `create_newsletter_subscription` RPC

Relevant schema evidence:

- [`supabase/migrations/20260613000100_initial_schema.sql:122-178`](../supabase/migrations/20260613000100_initial_schema.sql#L122)
- [`supabase/migrations/20260613000100_initial_schema.sql:195-333`](../supabase/migrations/20260613000100_initial_schema.sql#L195)
- [`supabase/migrations/20260613000100_initial_schema.sql:368-368`](../supabase/migrations/20260613000100_initial_schema.sql#L368)
- [`supabase/migrations/20260613000100_initial_schema.sql:434-475`](../supabase/migrations/20260613000100_initial_schema.sql#L434)
- [`supabase/migrations/20260613000100_initial_schema.sql:520-616`](../supabase/migrations/20260613000100_initial_schema.sql#L520)
- [`supabase/migrations/20260613000100_initial_schema.sql:804-915`](../supabase/migrations/20260613000100_initial_schema.sql#L804)

The missing piece is not schema. It is live data and auth provisioning.

## Missing Seed Data

The live project appears unseeded for the admin dashboard.

Missing live rows observed through Supabase:

- `site_settings` -> 0 rows
- `categories` -> 0 rows
- `articles` -> 0 rows
- `breaking_news` -> 0 rows
- `advertisements` -> 0 rows
- `reporters` -> 0 rows
- `audit_logs` -> 0 rows

Also missing for a reproducible admin login:

- a working auth user for the documented credentials
- a `public.users` profile row tied to that auth user
- a role assignment that resolves to `super_admin`, `admin`, or `editor`

The repo has a demo seeder script, but that script seeds `public.users` rows and content rows only. It does not create `auth.users` credentials.

Note: the absence of a `public.users` profile row for the auth account is an inference from the failed login and the lack of a verified working credential in the repo, not a direct query result from the anon key.

Relevant evidence:

- [`scripts/seed-demo.mjs`](../scripts/seed-demo.mjs)
- [`docs/DEPLOYMENT_GUIDE.md`](../docs/DEPLOYMENT_GUIDE.md)

## Swallowed Promise Check

I did not find a swallowed-promise bug in the dashboard overview component.

Why:

- `load()` wraps the dashboard fetch in `try/catch/finally`.
- `setLoading(false)` is in `finally`.
- There is no early return inside the dashboard load path that would bypass the `finally`.

Relevant code:

- [`src/app/components/admin/OverviewDashboard.tsx:74-129`](../src/app/components/admin/OverviewDashboard.tsx#L74)

## Demo Mode Check

Demo mode is not the cause of the admin dashboard issue.

Why:

- `CmsProvider` only falls back to demo content when Supabase is not configured.
- Supabase env vars are present in this workspace.
- Live Supabase requests succeeded, so the app is using the real backend, even though that backend currently has no content rows.

Relevant code:

- [`src/app/lib/supabase.ts`](../src/lib/supabase.ts)
- [`src/app/lib/cms.tsx:218-226`](../src/app/lib/cms.tsx#L218)

## Root Cause

The evidence supports this root cause:

1. The dashboard code is wired correctly enough to issue the read requests.
2. The live Supabase project does not contain seeded content for the dashboard or public CMS tables.
3. The documented sample admin login is invalid against the auth service.

That means the admin area is operating against an effectively empty production dataset, and the documented login path cannot be used to reproduce a real authenticated dashboard session.

If the browser still shows a permanent loading spinner after a successful admin login, I would treat that as a separate client-runtime issue and capture a browser trace next.

## Required Fix

To make the admin dashboard meaningfully operational in production:

- create a real Supabase auth user for the admin account
- create the corresponding `public.users` profile row and assign the proper role
- seed the live content tables, or provide a verified production dataset
- re-run the dashboard with an authenticated session and capture the browser network trace if the loading spinner persists
