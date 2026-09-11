# STEP 4: Server-Side Cache Architecture for Thumbnails

## Objective
Distinguish between SOURCE OF TRUTH (Google Drive) and DERIVED CACHE (resized thumbnails) while maintaining security and authorization.

## Current State

```
┌─────────────────────────────────────────┐
│ Google Drive (Source of Truth)          │
│ - Original 2.77MB image                 │
│ - User owns/uploaded                    │
│ - Immutable                             │
└──────────────┬──────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│ google-drive-thumbnail Edge Function    │
│ - Fetches via authenticated API         │
│ - Currently: Returns full resolution    │
│ - Problem: No resizing capability       │
└──────────────┬───────────────────────────┘
               │
               ▼
        ┌──────────────┐
        │ Browser      │
        │ 2.77MB       │
        │ 1672x941px   │
        └──────────────┘
```

## Proposed Cache Architecture

### Option 1: Browser-Side Caching ONLY (Current + CSS Resize)
```
Google Drive (2.77MB) 
    ↓ 
Edge Function (pass-through, 2.77MB)
    ↓
Browser (receive 2.77MB)
    ↓
CSS Resize (display at 400px)
    ↑
RESULT: Still downloads 2.77MB, just displays smaller
STATUS: ❌ FAILS P0 requirement (<300KB)
```

### Option 2: Supabase Storage as Thumbnail Cache
```
Google Drive (2.77MB - source of truth)
    ↓
Edge Function
    ├─ Check: Is thumbnail cached in Supabase Storage?
    │   ├─ YES → Return cached thumbnail (<300KB)
    │   └─ NO → Download from Drive, resize, cache, return
    │
    └─ Requires: Image resizing capability in Edge Function
       (BLOCKED: No confirmed resizing capability)

Cache Storage: Supabase Storage
    ├─ Path: /thumbnails/{tenant}/{drive_file_id}/w400.jpg
    ├─ Size: < 300KB per thumbnail
    └─ Lifecycle: Keep indefinitely (thumbnails are immutable)

Database: Add tracking table
    ├─ thumbnail_cache (drive_file_id, cached_version, size_bytes, cached_at)
    └─ Allow cache invalidation if needed

RESULT: If resizing works, achieves <300KB on subsequent requests
STATUS: ⚠️ DEPENDS ON: Step 3 resizing capability being real
RISK: First request still large, subsequent requests fast
```

### Option 3: External Image CDN Cache
```
Google Drive (2.77MB - source of truth)
    ↓
Edge Function
    ├─ Option A: Proxy to imgix/Cloudinary/Bunny
    │   ├─ Pass image through CDN transform API
    │   ├─ CDN resizes + caches on CDN
    │   └─ Browser receives <300KB
    │
    └─ Option B: Generate signed CDN URL, redirect
        ├─ Create transformation URL (e.g., imgix?w=400&q=80)
        ├─ Return 302 redirect to CDN
        └─ Browser downloads <300KB from CDN

Cache Storage: External CDN (Cloudinary, imgix, etc)
    ├─ Automatic caching by CDN
    ├─ Configurable TTL (default: infinite for thumbnails)
    └─ Globally distributed

Database: Store CDN URL template
    ├─ cdn_base_url: "https://image-cdn.example.com"
    ├─ cdn_config: { provider: "imgix", bucket: "..." }
    └─ Enable/disable via tenant settings

RESULT: Achieves <300KB immediately on all requests
STATUS: ✅ WORKS, but requires third-party service
COST: $0-$100/month depending on volume
```

### Option 4: Hybrid: Local Cache + Fallback
```
Google Drive (2.77MB - source of truth)
    ↓
Edge Function
    ├─ TRY: Resize image using WASM (if available)
    │   ├─ Success → Cache in Supabase Storage, return <300KB
    │   └─ Timeout/Error → Fall through
    │
    └─ FALLBACK: Return full resolution + meta headers
        ├─ X-Thumbnail-Status: RESIZE_FAILED
        ├─ X-Fallback-Type: FULL_RESOLUTION
        └─ Browser caches CSS display size

RESULT: Best effort - tries to resize, falls back to full-res
STATUS: ⚠️ DEPENDS ON: WASM viability
RELIABILITY: Medium (cascade failure possible)
```

## Comparison Table

| Aspect | Option 1 (CSS) | Option 2 (Storage) | Option 3 (CDN) | Option 4 (Hybrid) |
|--------|---|---|---|---|
| **Initial Request** | 2.77MB ❌ | Full size (or resized) | <300KB ✅ | Variable |
| **Subsequent Requests** | 2.77MB ❌ | <300KB ✅ | <300KB ✅ | <300KB (if cached) |
| **Resizing Required** | No | Yes | No | Yes |
| **External Dependency** | None | None | CDN Service | None |
| **Cost** | $0 | $0 | $0-100/mo | $0 |
| **Cache Control** | Browser | Supabase | CDN | Supabase |
| **Google Drive Source** | ✅ Preserved | ✅ Preserved | ✅ Preserved | ✅ Preserved |
| **Tenant Auth** | ✅ OK | ✅ OK | ⚠️ Needs work | ✅ OK |
| **Achieves P0** | ❌ No | ⚠️ If resize works | ✅ Yes | ⚠️ Uncertain |
| **Implementation Effort** | None | High | Medium | High |
| **Feasibility in Current Env** | N/A | Unknown | ✅ Known | Unknown |

## Recommendation

**Option 3 (External CDN)** is the most viable for immediate deployment:
- ✅ Achieves P0 requirement (< 300KB, ~400px)
- ✅ Uses proven external service (not experimental WASM)
- ✅ Preserves Google Drive as source of truth
- ✅ Minimal code changes required
- ✅ No infrastructure dependencies
- ⚠️ Trade-off: Third-party vendor dependency

**If WASM is confirmed working** → Implement **Option 2 (Storage Cache)**:
- ✅ Achieves P0 requirement
- ✅ No external dependencies
- ✅ Keeps everything within Supabase ecosystem
- ⚠️ First request still large
- ⚠️ Requires storage quota

## Implementation Checklist for Option 3 (CDN)

1. **Select CDN Provider**
   - [ ] Evaluate: imgix, Cloudinary, Bunny, AWS CloudFront
   - [ ] Compare: pricing, feature set, setup time

2. **Configure CDN**
   - [ ] Create account
   - [ ] Set origin URL to Google Drive or Edge Function
   - [ ] Create image transformation preset (w=400, q=80)
   - [ ] Enable CORS for browser requests

3. **Update Edge Function**
   - [ ] Remove local resize code
   - [ ] Add CDN URL generation
   - [ ] Return redirect or direct CDN URL
   - [ ] Add response headers for cache control

4. **Database (Optional)**
   - [ ] Add cdn_enabled flag to tenant_settings
   - [ ] Store cdn_base_url
   - [ ] Allow per-tenant CDN configuration

5. **Testing**
   - [ ] Fresh browser request to /fake-news
   - [ ] Verify response size < 300KB
   - [ ] Verify naturalWidth ~400px
   - [ ] Verify cache behavior
   - [ ] Test across browsers/viewports

## Implementation Checklist for Option 2 (Storage Cache)

**Only if WASM is confirmed working:**

1. **Create Thumbnail Cache Table**
   ```sql
   CREATE TABLE thumbnail_cache (
     id UUID PRIMARY KEY,
     drive_file_id TEXT NOT NULL,
     tenant_id UUID NOT NULL,
     size_width INT,
     cached_at TIMESTAMP,
     storage_path TEXT,
     size_bytes INT,
     UNIQUE(drive_file_id, tenant_id, size_width)
   );
   ```

2. **Update Edge Function**
   - [ ] Check cache table before fetching from Drive
   - [ ] If cached, fetch from Supabase Storage
   - [ ] If not cached, download from Drive, resize, store, cache entry

3. **Implement WASM Resizing**
   - [ ] Import Squoosh or alternative
   - [ ] Handle initialization
   - [ ] Resize to target dimensions
   - [ ] Encode as optimized JPEG/WebP

4. **Storage Management**
   - [ ] Create /thumbnails folder in Supabase Storage
   - [ ] Implement cleanup policy (optional, keep indefinitely)

5. **Testing** (same as Option 3)

## Data Flow for Option 3 (CDN)

```
User Request
    ↓
Browser: GET /fake-news
    ↓
React renders: <img src="/functions/v1/google-drive-thumbnail?fileId=..." />
    ↓
Edge Function (google-drive-thumbnail)
    ├─ Validate user auth
    ├─ Check permission: Is this file in this tenant?
    ├─ Generate CDN URL: https://cdn.example.com/optimize?url=googledriveurl&w=400
    └─ Return response
        ├─ Option A: 302 redirect to CDN URL
        └─ Option B: Fetch from CDN, return directly
    ↓
CDN (imgix/Cloudinary/etc)
    ├─ Check: Is this URL cached?
    │   ├─ YES (cache hit) → Return from edge cache
    │   └─ NO → Fetch from origin (Google Drive OR Edge Function)
    │
    ├─ Resize: Apply transformation (w=400, q=80)
    ├─ Optimize: Encode as WebP/JPEG
    ├─ Cache: Store at edge locations globally
    └─ Respond: <300KB image
    ↓
Browser receives <300KB
    ↓
Display in UI at CSS size (matches transformed size)
```

## Security Considerations

### Google Drive Authorization
- ✅ Current: Edge Function validates JWT and tenant membership
- ✅ Preserved: Only authenticated tenants can request thumbnails for their files
- ✅ No exposure: Google Drive API tokens never reach browser

### CDN Integration (Option 3)
- ⚠️ Origin URL exposure: CDN needs access to full-resolution image
  - Solution: Use Edge Function as CDN origin (not Google Drive directly)
  - Ensures: Edge Function still validates auth, then proxies to Google Drive
  
- ⚠️ Cache poisoning: Could CDN cache wrong file for wrong tenant?
  - Solution: Include tenant_id in CDN cache key
  - Solution: Use CDN auth tokens for per-tenant access

### Supabase Storage (Option 2)
- ✅ Built-in: Row-level security (RLS) can restrict access
- ✅ Tenant-scoped: Store thumbnails in /thumbnails/{tenant_id}/ folder
- ✅ No additional auth needed: Supabase handles it

## Conclusion

**Source of Truth**: Google Drive (immutable, user-owned)
**Derived Cache**: Thumbnail (resized, application-managed)
**Cache Location**: External CDN (Option 3) or Supabase Storage (Option 2)
**Authorization**: Preserved through Edge Function validation
**Tenant Isolation**: Maintained through cache key/path segregation

The architecture cleanly separates concerns and allows swapping cache implementations without modifying the core data flow.
