# Advertisement Tenant Isolation Audit
**Date**: September 11, 2026  
**Scope**: Strict advertisement isolation - ensuring each tenant/website sees only its own ads

---

## Current System State

### Database State
- **Tenants**: 3 active tenants
  - `fake-news` (66ffe950-0dad-4a4f-9ffe-1069a480b166) - "Fake News"
  - `fake-news2` (5ba95f4c-99a2-4441-a39f-521a1a1ad99a) - "fake news2"
  - `today-news` (efeedd13-c1cf-41b9-a74d-39f2fa9d87a8) - "Today news"

- **Advertisements**: 4 total (all belong to fake-news tenant)
  1. The Chai Theka (sidebar)
  2. R2H (hero)
  3. Top (homepage-header-banner)
  4. ABC (sidebar-middle)

- **Data Consistency**: ✅ No legacy NULL tenant_id values - all ads properly scoped
  - All 4 ads have `tenant_id = 66ffe950-0dad-4a4f-9ffe-1069a480b166` (fake-news)

### Architecture Analysis

#### Multi-Tenant Support
✅ **EXISTS**: 
- `tenants` table created in `20260828000001_create_tenants_table.sql`
- `tenant_id` columns added to all tenant-scoped tables in `20260824000001_multi_tenant_architecture.sql`
- Tenant membership tracked in `tenant_memberships` table
- RLS policies created in `20260824000002_multi_tenant_rls_policies.sql`

#### Admin Ad Creation
✅ **CORRECT**:
- `upsertAdminAd()` in `src/app/lib/admin.ts` line 769
- **Automatically assigns `tenant_id`** from `getCurrentUserTenantId()`
- New ads created by admin are properly scoped to their tenant

#### Public Ad Queries
❌ **BROKEN**:
- `getActiveAds()` in `src/app/lib/adService.ts` line 36
- **Does NOT filter by tenant_id**
- Queries all active ads regardless of tenant
- Would return ads from ANY tenant to ANY website

#### RLS Policy
⚠️ **INSUFFICIENT**:
- Policy `public_read_advertisements` in `20260824000002_multi_tenant_rls_policies.sql` line 182
- Checks: `is_active = true AND deleted_at is null AND tenant_id is not null`
- **Missing**: No tenant scope check
- **Problem**: Allows reading ads from all tenants (as long as tenant_id != NULL)
- RLS does NOT prevent cross-tenant ad viewing

#### Frontend Components
❌ **CONTEXT NOT PASSED**:
- `SmartAd` component calls `getActiveAds(placement, 5)` without tenant context
- `SmartAd` is used within pages wrapped in `CmsProvider`
- `CmsProvider` has access to `tenantId` (from `get_public_tenant_info()`)
- But `SmartAd` **cannot access CmsContext directly** since it needs to be self-contained

---

## Root Cause Analysis

### The Problem
When a website/tenant loads the public portal, ads from ANY tenant could potentially be displayed if:
1. Another admin creates ads in a different tenant
2. Those ads are active and have non-NULL tenant_id
3. The RLS policy allows reading them (which it does - it only checks tenant_id IS NOT NULL)
4. The frontend `getActiveAds()` doesn't filter by tenant

### Example Scenario
```
Fake News Admin creates ad for "fake-news" tenant
↓
Ad is inserted with tenant_id = 66ffe950-0dad-4a4f-9ffe-1069a480b166
↓
Fake News 2 Admin creates ad for "fake-news2" tenant
↓
Ad is inserted with tenant_id = 5ba95f4c-99a2-4441-a39f-521a1a1ad99a
↓
User visits fake-news.com (tenantSlug = "fake-news")
↓
Frontend calls getActiveAds("homepage_top_banner", 5)
↓
Query runs WITHOUT tenant_id filter
↓
Result: Returns BOTH fake-news AND fake-news2 ads (VIOLATION!)
```

### Why It Wasn't Caught Earlier
- Only "fake-news" tenant has ads created
- Other tenants ("fake-news2", "today-news") have NO ads
- No cross-tenant ads exist to trigger the isolation failure
- System appears to work (because no conflicting data exists)

---

## Required Fixes

### Fix 1: Frontend Query (CRITICAL)
**File**: `src/app/lib/adService.ts`  
**Function**: `getActiveAds()`  
**Issue**: No tenant_id filtering  
**Solution**: Add `tenant_id` parameter and filter in query

### Fix 2: RLS Policy (CRITICAL)
**File**: `supabase/migrations/20260824000002_multi_tenant_rls_policies.sql`  
**Policy**: `public_read_advertisements`  
**Issue**: Allows reading ads from all tenants  
**Solution**: Add tenant context check (via current_setting or similar mechanism)

**Note**: RLS alone cannot solve this because:
- Public route (anon user) doesn't have tenant context in JWT
- Custom domain routing means same URL serves different tenants
- Need server-side or query-level filtering

### Fix 3: Component Integration
**File**: `src/app/components/SmartAd.tsx`  
**Issue**: Cannot access CmsContext for tenant_id  
**Solution**: SmartAd must accept `tenantId` as prop OR access via hook if within CmsProvider

### Fix 4: Cache Keys (if caching exists)
**Status**: No caching currently detected in adService
**Note**: If implemented, must include tenant_id: `ads:{tenantId}:{placement}`

---

## Implementation Plan

### Phase 1: Frontend Query Fix
- Modify `getActiveAds()` to accept `tenantId` parameter
- Add `.eq('tenant_id', tenantId)` filter to query
- Pass tenantId from SmartAd component

### Phase 2: Component Integration
- SmartAd must accept `tenantId` prop (required)
- SmartAd passes tenantId to `getActiveAds()`
- All SmartAd usages must pass tenantId from parent context

### Phase 3: RLS Policy Hardening
- Add tenant_id filter to public policy
- Use server-side query validation (frontend already provides tenant_id)

### Phase 4: Verification
- Test on fake-news: verify only fake-news ads show
- Test on fake-news2: verify no ads or only fake-news2 ads
- Test on today-news: verify isolation
- Verify cross-tenant ads DO NOT appear

---

## Files to Modify

1. **`src/app/lib/adService.ts`**
   - Add `tenantId?: string` parameter to `getActiveAds()`
   - Add `.eq('tenant_id', tenantId)` filter if tenantId provided
   - Fallback: if no tenantId, return empty array (safe default)

2. **`src/app/components/SmartAd.tsx`**
   - Add `tenantId: string` as required prop
   - Pass `tenantId` to `getActiveAds(placement, 5, tenantId)`
   - Update all usages to provide tenantId

3. **Update all SmartAd usages** (HomePage, CategoryPage, ArticlePage)
   - Use `useCms()` hook to get `tenantId`
   - Pass `tenantId` prop to SmartAd

4. **`supabase/migrations/20260824000002_multi_tenant_rls_policies.sql`** (Optional hardening)
   - RLS already enforces via tenant_id IS NOT NULL
   - Future: Add server-side tenant context validation

---

## Security Notes

### Current State
- ✅ Admin creation is scoped (uses getCurrentUserTenantId)
- ❌ Public read is NOT scoped (no tenant filter in getActiveAds)
- ⚠️ RLS allows reading from all tenants (only checks is_active and tenant_id != NULL)

### After Fix
- ✅ Admin creation remains scoped
- ✅ Public read will be scoped (frontend filters by tenant_id)
- ✅ Defense in depth: query-level + component-level filtering

### RLS Limitation
- RLS policy cannot use JWT custom claims for tenant context in public/anon routes
- Solution: Query-level filtering in frontend (which trusts tenantSlug from URL resolution)
- Backend RLS still protects against direct SQL queries from authenticated users

---

## Testing Checklist

- [ ] TypeScript compilation passes
- [ ] Build succeeds
- [ ] Fake News: SmartAd shows only fake-news ads
- [ ] Fake News 2: SmartAd shows only fake-news2 ads (or none if no ads created)
- [ ] Today News: SmartAd shows only today-news ads (or none if no ads created)
- [ ] Network requests include correct tenant_id in queries
- [ ] No cross-tenant ads appear in any view
- [ ] Admin panel still allows ad creation/management
- [ ] Impression tracking works correctly

---

## Status

| Component | Current | Issue | Fix Status |
|-----------|---------|-------|------------|
| Database schema | ✅ Has tenant_id | None | N/A |
| Admin creation | ✅ Assigns tenant_id | None | N/A |
| Public query | ❌ Missing filter | No tenant_id filter | PENDING |
| Component integration | ❌ No tenantId prop | Cannot access context | PENDING |
| RLS policy | ⚠️ Partial | Needs tenant context | PENDING |

---

**Audit Date**: September 11, 2026 16:30 UTC  
**Severity**: HIGH - Cross-tenant ad leak potential  
**Impact**: If ads exist in multiple tenants, wrong ads could appear on wrong websites  
**Reversibility**: Full (query-level changes only)
