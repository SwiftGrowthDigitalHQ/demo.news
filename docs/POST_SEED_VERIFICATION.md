# Post-Seed Verification

Scope: this audit verifies the live Supabase state after `docs/PRODUCTION_SEED.sql` was prepared and the public data layer was checked from this workspace.

## Summary

The production seed has clearly populated the public content layer:

- Categories are visible.
- Articles are visible.
- Breaking news is visible.
- Advertisements are visible.
- Site settings are visible.

What is still not fully verifiable from this workspace:

- `auth.users`
- direct `public.users` row visibility
- direct `public.roles` row visibility
- authenticated admin session behavior
- the absence of the loading spinner in a real admin browser session

That means the public site data is provisioned, but the admin/auth side still needs a privileged verification pass.

## Row Counts

### Public-visible counts

| Table | Count | Notes |
| --- | ---: | --- |
| `categories` | 5 | Visible and populated |
| `articles` | 7 | Visible and populated |
| `breaking_news` | 3 | Visible and populated |
| `reporters` | 4 | Visible and populated |
| `advertisements` | 4 | Visible and populated |
| `site_settings` | 1 | Visible and populated |

### Protected-table visibility from anon access

| Table | Count | Notes |
| --- | ---: | --- |
| `roles` | 0 visible rows | Protected by RLS; exact count not verifiable with anon |
| `users` | 0 visible rows | Protected by RLS; exact count not verifiable with anon |
| `audit_logs` | 0 visible rows | Protected by RLS; exact count not verifiable with anon |

### Evidence on joined dashboard/public reads

The live read queries returned data successfully:

- `homepage_categories` -> 5 rows
- `homepage_articles` -> 7 rows
- `homepage_breaking_news` -> 3 rows
- `homepage_ads` -> 4 rows
- `site_settings` -> 1 row
- `admin_articles` -> 7 rows
- `admin_reporters` -> 4 rows
- `admin_ads` -> 4 rows
- `admin_breaking_news` -> 3 rows
- `admin_audit_logs` -> 0 rows

## Verification Details

### Homepage visibility

Verified via live Supabase queries:

- categories are present
- published articles are present
- breaking news is present
- active ads are present

This is enough for the homepage to render real content instead of fallback/demo content.

### Admin dashboard data

Verified via live Supabase queries:

- article stats load
- reporter stats load
- ad stats load
- breaking news stats load
- audit log query completes successfully

What could not be fully verified here:

- a real authenticated admin session
- the dashboard loading spinner disappearing in the browser after login

Reason:

- the workspace does not have a verified admin auth session or a service-role credential to inspect `auth.users` / protected rows directly.

## Missing Relationships

The seed data is present, but some relationships are not visible from anon access:

- `articles.author` resolves to `null` in anon queries because `users` is RLS-protected.
- `reporters.user` resolves to `null` in anon queries because `users` is RLS-protected.

That does not prove the relationships are missing in the database. It only proves they are not visible from anon access in this workspace.

## Failed Queries

No public-content Supabase query failed after the seed data was present.

The unresolved verification gap is admin/auth-related:

- `auth.users` could not be checked from anon access.
- a verified authenticated admin session was not available in this workspace.

## Production Readiness

Current readiness after seed provisioning: `82%`

Why it is not higher:

- public data is now in place
- protected auth/user verification is still incomplete
- direct browser confirmation of the admin dashboard spinner clearing was not possible from this workspace

## Verdict

**NOT READY**

The public data layer is seeded and working, but the admin/auth side still needs a privileged verification pass before this can be called fully production-ready.
