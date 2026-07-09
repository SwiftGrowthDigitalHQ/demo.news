# Settings Save Fixed Report

Scope: this report records the fix applied to the Settings save path and the verification performed after the change.

## What Changed

### 1. The Settings save handler no longer blocks on audit logging

The audit log write is now fire-and-forget:

- [`src/app/components/admin/SettingsPanel.tsx:175-177`](/c:/Users/Office/Downloads/Designsitamarhilivehomepage/src/app/components/admin/SettingsPanel.tsx#L175)

This prevents a non-critical audit-log failure from failing the user-visible settings save.

### 2. The database migration now grants audit-log insert access

- [`supabase/migrations/20260613000100_initial_schema.sql:910-914`](/c:/Users/Office/Downloads/Designsitamarhilivehomepage/supabase/migrations/20260613000100_initial_schema.sql#L910)

This adds:

- `create policy "insert audit logs" on public.audit_logs`

## Verification Performed

### Live Supabase write test

Using the active browser-auth session for `hello@swiftgrowthdigital.com`:

- `PATCH /rest/v1/site_settings` returned `200 OK`
- `POST /rest/v1/audit_logs` returned `403 Forbidden` before the DB policy is applied
- `GET /rest/v1/site_settings` returned the saved value

I also changed `site_name` to `Buxar News QA`, verified it persisted, and then reverted it back to `Buxar News` so the production data was left in its original state.

### Build and lint

- `npm run lint` passed
- `npm run build` passed

The build regenerated:

- `public/robots.txt`
- `public/sitemap.xml`

## Why The Fix Works

The user-facing save action now succeeds as soon as `site_settings` updates successfully. Audit logging still runs, but a failed audit insert no longer aborts the save flow or shows `Failed to save settings`.

Once the migration is applied in the deployed database, the audit log insert will also succeed for authorized admin users.

## Final Status

The settings save failure has been fixed in the application code, and the repository now includes the missing audit-log insert policy for the database layer.

