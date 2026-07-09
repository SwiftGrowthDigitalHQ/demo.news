# Settings Save Root Cause Report

Scope: this report isolates why the admin Settings page showed `Failed to save settings` when saving site configuration.

## Executive Summary

The settings form was not failing because `site_settings` could not be updated. The actual failure was the post-save audit write:

- `site_settings` update returned `200 OK`
- `audit_logs` insert returned `403` with an RLS error
- the save handler treated that audit failure as fatal, so the UI surfaced `Failed to save settings`

## Exact Failing Query

Request:

- `POST /rest/v1/audit_logs`
- Body:

```json
{
  "action": "site_settings.updated",
  "entity_type": "site_settings",
  "metadata": {
    "site_name": "Buxar News QA"
  }
}
```

Response:

- Status: `403 Forbidden`
- Supabase code: `42501`
- Message: `new row violates row-level security policy for table "audit_logs"`

## Exact File

- [`src/app/components/admin/SettingsPanel.tsx`](/c:/Users/Office/Downloads/Designsitamarhilivehomepage/src/app/components/admin/SettingsPanel.tsx)

## Exact Function

- `save()`

## Exact Line Number

- `src/app/components/admin/SettingsPanel.tsx:132-183`
- The fatal call was at `src/app/components/admin/SettingsPanel.tsx:175-177`

## Data Flow

1. The settings form collects live UI state.
2. `save()` calls `loadSiteSettings()`.
3. `save()` calls `upsertSiteSettings(...)`.
4. `save()` then calls `markAuditLog(...)`.
5. `markAuditLog()` performs a raw insert into `audit_logs`.
6. The insert is denied by RLS in the deployed database.
7. The thrown error is caught by `save()` and displayed as `Failed to save settings`.

## Supporting Evidence

- [`src/app/lib/admin.ts:671-716`](/c:/Users/Office/Downloads/Designsitamarhilivehomepage/src/app/lib/admin.ts#L671)
- [`src/app/lib/admin.ts:719-735`](/c:/Users/Office/Downloads/Designsitamarhilivehomepage/src/app/lib/admin.ts#L719)
- [`supabase/migrations/20260613000100_initial_schema.sql:804-809`](/c:/Users/Office/Downloads/Designsitamarhilivehomepage/supabase/migrations/20260613000100_initial_schema.sql#L804)
- [`supabase/migrations/20260613000100_initial_schema.sql:910-914`](/c:/Users/Office/Downloads/Designsitamarhilivehomepage/supabase/migrations/20260613000100_initial_schema.sql#L910)

## Root Cause

The save path used an awaited audit-log insert after the settings update. The deployed Supabase database denied `insert` on `audit_logs`, so the post-save audit write threw a 403 and the UI treated the entire save as failed.

## Exact Fix Required

- Stop treating audit logging as a blocking part of settings save.
- Add an `insert` RLS policy for `audit_logs` so the audit write is permitted for super admin/admin users.

## Live Verification

The live session confirmed the diagnosis:

- `PATCH site_settings` returned `200 OK`
- `POST audit_logs` returned `403 Forbidden`
- `GET site_settings` showed the updated `site_name` persisted in the database

That means the settings update itself worked, and the audit-log insert was the blocking failure.

