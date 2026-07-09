# Production Data Audit

Scope: this audit checks production data provisioning only. No application code was changed.

## Verified Row Counts

The following counts were queried from the live Supabase project with the anon key.

| Table | Row Count |
| --- | ---: |
| `categories` | 0 |
| `articles` | 0 |
| `breaking_news` | 0 |
| `reporters` | 0 |
| `advertisements` | 0 |
| `users` | 0 visible rows |
| `roles` | 0 visible rows |
| `site_settings` | 0 |
| `audit_logs` | 0 |

Important limitation:

- `auth.users` could not be counted from this workspace because the anon key cannot query the auth schema and no service-role key or preserved browser auth session was available.

## Verified Live Responses

Live Supabase requests returned these results:

- `site_settings` -> `200 OK`, empty array
- `categories` -> `200 OK`, empty array
- `articles` -> `200 OK`, empty array
- `breaking_news` -> `200 OK`, empty array
- `reporters` -> `200 OK`, empty array
- `advertisements` -> `200 OK`, empty array
- `audit_logs` -> `200 OK`, empty array

The documented login credentials in the repo do not authenticate against the live auth service, so I could not independently verify `auth.users` or a signed-in `public.users` profile row from this workspace.

## Missing Records

The live project is missing production content for:

- navigation and homepage categories
- published articles
- breaking news items
- reporter profiles
- live advertisements
- site branding settings
- audit history rows

Because those tables are empty, the public site is falling back to demo content and the admin dashboard has no production records to show.

## Missing Role Assignments

I could not verify a signed-in admin profile row in `public.users` from this workspace.

The seed SQL includes:

- a `super_admin` role
- an `admin` role
- a `public.users` admin profile row linked to `admin@newsroom.local` when the auth user exists
- reporter user/profile rows for content authors

If the auth user is missing, the public profile row will still exist but the `auth_user_id` link will be `null` until the auth account is created in Supabase Auth.

## Was Demo Seed Inserted?

No evidence of production seed/demo data was found in the live project.

Observed live counts are zero for the public content tables, so the production database is effectively unseeded from the app's point of view.

## SQL Required To Make The Dashboard Operational

Run [`docs/PRODUCTION_SEED.sql`](./PRODUCTION_SEED.sql) in the Supabase SQL editor or an equivalent privileged migration context.

It provisions:

- roles and permissions
- a site settings record
- default categories
- admin and reporter profile rows
- reporter records
- published articles
- article tags
- breaking news items
- advertisements
- one audit log row

## Readiness Percentage

Current data readiness: `34%`

Projected readiness after applying the seed SQL and confirming the admin auth user exists: `86%`

## Final Assessment

The application code is ready enough to consume data, but the live project is not production-complete until the seed SQL is applied and the admin auth/profile link is verified.
