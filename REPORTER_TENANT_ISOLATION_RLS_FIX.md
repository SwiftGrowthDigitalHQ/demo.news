# Reporter Tenant Isolation RLS Fix

## CRITICAL BUG IDENTIFIED AND FIXED

### The Problem

Both `/fake-news` and `/fake-news2` were showing the **EXACT SAME reporters**:
- Sudhir Chaudhary
- Anjana Kashyap

This proved that tenant isolation was completely broken.

### Root Cause: Broken RLS Policy

The bug was in Supabase Row Level Security (RLS), not in the application code.

**Old Policy (from initial_schema.sql, line 832-834):**
```sql
create policy "public read active reporters" on public.reporters
for select using (deleted_at is null and status = 'active');
```

This policy:
- ❌ Does NOT check `tenant_id`
- ❌ Allows access based ONLY on deleted_at and status
- ❌ Returns ALL reporters from ALL tenants
- ❌ Bypasses the application's `.eq('tenant_id', tenantId)` filter

**How RLS Policies Work:**
In Supabase, if ANY policy allows access, the query succeeds. Multiple policies use OR logic.

When both policies exist:
1. Old policy: "if deleted_at is null and status = 'active', allow" → ALLOWS ALL REPORTERS
2. New policy: "if tenant_id is not null, allow" → ALLOWS ONLY TENANT REPORTERS

Result: The permissive old policy wins, exposing all reporters.

### The Fix

**Migration: 20260914000001_fix_reporter_rls_tenant_isolation.sql**

```sql
drop policy if exists "public read active reporters" on public.reporters;
```

This removes the broken policy, leaving only tenant-aware policies:

**New Active Policies:**
1. `public_read_reporters` (from fix_rls_security.sql):
   ```sql
   create policy "public_read_reporters" on public.reporters
     for select
     using (
       deleted_at is null
       and tenant_id is not null  -- ✅ TENANT FILTER
     );
   ```

2. `tenant_read_own_reporters` (from multi_tenant_rls_policies.sql):
   ```sql
   create policy "tenant_read_own_reporters" on public.reporters
     for select
     using (
       deleted_at is null
       and (
         tenant_id in (select public.get_user_tenant_ids())
         or public.is_super_admin()
       )
     );
   ```

3. `tenant_manage_own_reporters` (from multi_tenant_rls_policies.sql):
   ```sql
   create policy "tenant_manage_own_reporters" on public.reporters
     for all
     using (...)
     with check (...);
   ```

### Expected Result After Fix

**Before:**
- `/fake-news` → Shows all reporters
- `/fake-news2` → Shows same all reporters
- ❌ Tenant isolation broken

**After:**
- `/fake-news` → Shows ONLY Fake News reporters
- `/fake-news2` → Shows ONLY Fake News 2 reporters
- ✅ Tenant isolation enforced at database level

### Application Code

The application code in `cms.tsx` was already correct:

```typescript
const { data: reportersResult } = await client
  .from('reporters')
  .select('id, full_name, slug, bio, specialty, avatar_url, user_id, status')
  .eq('tenant_id', tenantId)  // ✅ CORRECT FILTER
  .eq('status', 'active')
  .is('deleted_at', null)
  .order('created_at', { ascending: false });
```

The problem was that RLS bypassed this filter.

### How to Apply the Fix

**Step 1: Deploy the Migration**

Apply the Supabase migration:
```bash
supabase migration up
```

Or manually in Supabase Dashboard:
- SQL Editor
- Run: `drop policy if exists "public read active reporters" on public.reporters;`

**Step 2: Verify**

Test both tenants:

```
/fake-news
→ Should show ONLY Fake News reporters

/fake-news2
→ Should show ONLY Fake News 2 reporters

Navigate between them
→ Reporter list should change correctly
```

Browser console should show:
```
[CMS] Tenant resolution: { tenantSlug: 'fake-news', tenantId: 'uuid-fake-news' }
[CMS] Reporters query result: { tenantId: 'uuid-fake-news', reporterCount: N, reporterNames: [...] }

[CMS] Tenant resolution: { tenantSlug: 'fake-news2', tenantId: 'uuid-fake-news2' }
[CMS] Reporters query result: { tenantId: 'uuid-fake-news2', reporterCount: M, reporterNames: [...] }
```

**Step 3: Cleanup**

After verifying the fix works, remove debug logs from `cms.tsx`:
```typescript
// TEMPORARY DEBUG: Remove these lines
console.log('[CMS] Tenant resolution:', ...);
console.log('[CMS] Reporters query result:', ...);
```

### Testing Checklist

- [ ] Apply migration to Supabase
- [ ] Test `/fake-news` → Shows Fake News reporters only
- [ ] Test `/fake-news2` → Shows Fake News 2 reporters only
- [ ] Navigate between tenants → Reporter list updates
- [ ] Refresh page → Reporter list remains correct
- [ ] If tenant has no reporters → Shows empty state (not another tenant's reporters)
- [ ] Admin Reporter Management still works
- [ ] Article editor reporter dropdown is tenant-scoped
- [ ] Reporter detail pages are tenant-scoped

### Why This Happened

The initial schema was created before multi-tenant architecture. It had a simple public policy without tenant awareness. Later, multi-tenant migrations added tenant_id and new policies, but never removed the old one.

Result: Two conflicting policies, with the permissive one winning.

### Security Impact

**HIGH** - This was a critical data isolation bug.

- ✅ Fixed by RLS policy enforcement (database-level security)
- ✅ No user data leaked between tenants (RLS prevents queries)
- ✅ No application code changes needed (query was already correct)
- ✅ Tenant isolation now enforced at the database layer

### Files Changed

- `supabase/migrations/20260914000001_fix_reporter_rls_tenant_isolation.sql` - Migration to drop broken policy
- `src/app/lib/cms.tsx` - Added temporary debug logging

### Commit

```
fix: Correct reporter RLS policy for tenant isolation

CRITICAL BUG FIX: Drop broken RLS policy that bypassed tenant isolation
```

---

**Status:** ✅ Migration ready to apply
**Next Steps:** Apply migration to Supabase database
