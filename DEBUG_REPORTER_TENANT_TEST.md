# Debug Reporter Tenant Isolation Test

## Purpose
Trace the complete tenant resolution flow to identify why wrong reporters are being shown.

## Setup
1. Pull latest code: `git pull`
2. Start dev server: `npm run dev`
3. Open browser console (F12)
4. Clear console before each test

## Test 1: Fake News Tenant

### Steps:
1. Navigate to: `http://localhost:5173/fake-news` (or your actual Fake News route)
2. Wait for page to load completely
3. Scroll to "Our Reporters" section
4. Copy ALL console output

### Expected Console Logs:
```
[AppRouter] Resolving route for pathname: /fake-news
[AppRouter] Route resolved: { type: 'tenant', tenantSlug: 'fake-news', tenantPath: '/' }
[CmsProvider] Refreshing with tenantSlug: fake-news
[CmsProvider] Loaded content for tenant: { tenantSlug: 'fake-news', tenantId: '...', ... }
[ReporterShowcase] Tenant context: { tenantSlug: 'fake-news', tenantId: '...', pathname: '/fake-news', hostname: 'localhost' }
[ReporterShowcase] Fetching reporters for tenant: ...
[ReporterShowcase] Query result: { tenantId: '...', reporterCount: X, reporterNames: [...] }
```

### Capture:
- `tenantSlug` value
- `tenantId` value (UUID)
- `reporterCount`
- `reporterNames` array
- Full console output

## Test 2: Fake News 2 Tenant

### Steps:
1. **Important**: Clear console OR note timestamp
2. Navigate to: `http://localhost:5173/fake-news-2` (or your actual Fake News 2 route)
3. Wait for page to load completely
4. Scroll to "Our Reporters" section
5. Copy ALL console output from this navigation

### Expected Console Logs:
```
[AppRouter] Resolving route for pathname: /fake-news-2
[AppRouter] Route resolved: { type: 'tenant', tenantSlug: 'fake-news-2', tenantPath: '/' }
[CmsProvider] Refreshing with tenantSlug: fake-news-2
[CmsProvider] Loaded content for tenant: { tenantSlug: 'fake-news-2', tenantId: '...', ... }
[ReporterShowcase] Tenant context: { tenantSlug: 'fake-news-2', tenantId: '...', pathname: '/fake-news-2', hostname: 'localhost' }
[ReporterShowcase] Fetching reporters for tenant: ...
[ReporterShowcase] Query result: { tenantId: '...', reporterCount: X, reporterNames: [...] }
```

### Capture:
- `tenantSlug` value
- `tenantId` value (UUID)
- `reporterCount`
- `reporterNames` array
- Full console output

## Test 3: Navigation Between Tenants

### Steps:
1. Clear console
2. Start at: `http://localhost:5173/fake-news`
3. Wait for page load
4. Click browser address bar and navigate to: `http://localhost:5173/fake-news-2`
5. Wait for page load
6. Copy ALL console output from both navigations

### Key Questions:
- Does CmsProvider refresh with new tenantSlug?
- Does tenantId change?
- Does ReporterShowcase re-fetch with new tenantId?
- Are old reporters still visible after navigation?

## Analysis Checklist

For each test, verify:

### ✅ Route Resolution
- [ ] Pathname matches expected tenant route
- [ ] `tenantSlug` extracted correctly from URL
- [ ] Route type is `'tenant'`

### ✅ CMS Provider
- [ ] `tenantSlug` prop matches route
- [ ] `tenantId` (UUID) is loaded
- [ ] tenantId is DIFFERENT for each tenant

### ✅ Reporter Showcase
- [ ] `tenantSlug` from context matches expected
- [ ] `tenantId` from context matches CmsProvider
- [ ] Reporter query uses correct `tenantId`
- [ ] Reporter names match expected tenant

### ❌ Problem Indicators

**PROBLEM 1: Wrong tenantSlug**
```
// Fake News 2 page but:
[CmsProvider] Refreshing with tenantSlug: fake-news  ← WRONG!
```
→ Route resolution is broken

**PROBLEM 2: Wrong tenantId**
```
// Fake News 2 but tenantId matches Fake News
tenantId: 'uuid-of-fake-news'  ← WRONG!
```
→ Database lookup is wrong

**PROBLEM 3: Cached data**
```
// Navigated to Fake News 2 but CmsProvider didn't refresh
// No [CmsProvider] Refreshing log
```
→ tenantSlug not in useEffect dependencies

**PROBLEM 4: Query not using tenantId**
```
[ReporterShowcase] Query result: { tenantId: 'uuid-fake-news-2', reporterCount: 5, reporterNames: ['Fake News Reporter'] }
```
→ Query is not filtering by tenant_id OR RLS issue

**PROBLEM 5: Admin tenant bleeding**
```
// Logged in as Fake News admin
// Visiting Fake News 2 public page
tenantId: 'uuid-of-fake-news'  ← Using admin's tenant instead of public tenant
```
→ Admin context interfering with public context

## What to Report

Please provide:

1. **Exact console output** for both Test 1 and Test 2
2. **Tenant IDs** (UUIDs) for each tenant
3. **Reporter names** returned for each tenant
4. **Screenshot** of Fake News 2 showing wrong reporters (if issue persists)

Format:
```
# Fake News
- URL: /fake-news
- tenantSlug: 'fake-news'
- tenantId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
- reporterCount: 3
- reporterNames: ['Reporter A', 'Reporter B', 'Reporter C']

# Fake News 2  
- URL: /fake-news-2
- tenantSlug: 'fake-news-2'
- tenantId: 'yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy'
- reporterCount: 2
- reporterNames: ['Reporter D', 'Reporter E']

# Issue (if any):
Fake News 2 is showing Reporter A, B, C (from Fake News) instead of D, E
```

## Database Verification (Optional)

If you have access to Supabase dashboard:

1. Go to Table Editor → `reporters`
2. Filter by each tenant_id
3. Verify which reporters actually belong to each tenant

```sql
-- Check Fake News reporters
SELECT id, full_name, tenant_id, status 
FROM reporters 
WHERE tenant_id = 'uuid-of-fake-news' 
  AND deleted_at IS NULL;

-- Check Fake News 2 reporters
SELECT id, full_name, tenant_id, status 
FROM reporters 
WHERE tenant_id = 'uuid-of-fake-news-2' 
  AND deleted_at IS NULL;
```

---

**After you provide the console output, I will:**
1. Identify the exact point where tenant resolution fails
2. Fix the root cause
3. Remove debug logging
4. Verify the fix
