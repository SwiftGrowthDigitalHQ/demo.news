# Admin Dashboard Root Cause Report

Scope: this report traces the admin dashboard loading failure from the live browser session and the current code path in this repository.

## Root Cause

The admin dashboard spinner was being held open by the auth bootstrap path, not by the dashboard SQL queries.

`AuthProvider` previously depended on a client-side session bootstrap that could stall when a stale Supabase auth token was present in browser storage. In that state, the admin route never got a stable auth state and the dashboard never finished initializing.

The browser trace showed the symptom clearly:

- `auth.getSession()` timed out in the browser before the fix.
- The five admin overview queries were also observed timing out in the same stuck state.
- After the fix, `auth.getSession()` resolves in about 1 ms and the page no longer sits on `Loading dashboard...`.

## File

- [`src/lib/supabase.ts`](/c:/Users/Office/Downloads/Designsitamarhilivehomepage/src/lib/supabase.ts)
- [`src/app/lib/auth.tsx`](/c:/Users/Office/Downloads/Designsitamarhilivehomepage/src/app/lib/auth.tsx)

## Function

- `getSupabaseClient()`
- `AuthProvider`
- `loadProfile()`

## Line Number

- [`src/lib/supabase.ts:18-27`](/c:/Users/Office/Downloads/Designsitamarhilivehomepage/src/lib/supabase.ts#L18)
- [`src/app/lib/auth.tsx:29-63`](/c:/Users/Office/Downloads/Designsitamarhilivehomepage/src/app/lib/auth.tsx#L29)
- [`src/app/lib/auth.tsx:93-134`](/c:/Users/Office/Downloads/Designsitamarhilivehomepage/src/app/lib/auth.tsx#L93)

## Why Loading Never Stops

The old browser client configuration used a session bootstrap path that waited on Supabase auth state before the app could settle.

When the persisted browser session was stale, that bootstrap path stalled long enough that the admin page remained in its loading state and never advanced into the dashboard render.

That is why the issue reproduced even though the network itself was healthy and the Supabase REST endpoints were reachable directly.

## Exact Fix Required

Stop using the hanging auth bootstrap path as the gate for initial admin rendering.

The minimal fix is:

- disable Supabase client auto-refresh/session URL bootstrap in the shared browser client
- hydrate the session synchronously from localStorage in `AuthProvider`
- continue profile lookup asynchronously after hydration

That is exactly what the current code now does.

## Evidence

- Before the fix, `auth.getSession()` and the admin helper calls timed out in-browser while the dashboard was stuck on `Loading dashboard...`.
- After the fix, `auth.getSession()` resolves in `1 ms` in the browser and the admin route no longer stays on the loading screen.
- The post-fix browser screenshot shows the admin page settling immediately on the login screen instead of remaining stuck on the loading state.

## Related But Separate Issue

The post-fix replayed browser session belongs to `hello@swiftgrowthdigital.com`, and the direct `public.users` lookup for that `auth_user_id` returns `0` rows.

That is an auth/profile provisioning issue, not the spinner root cause.

## Final Note

This report identifies the loading failure root cause. It does not claim that the current browser session is an authorized admin session.
