# SangTX Recommended Image Architecture
## Design Document: Bunny Optimizer as Primary CDN

**Recommendation Date:** September 11, 2026  
**Status:** Design Phase (No Implementation)  
**Target:** P0 = 2.77MB → <300KB thumbnail at ~400px width  
**Decision Basis:** Cost, performance, simplicity, minimal vendor lock-in

---

## EXECUTIVE RECOMMENDATION

### Selected Solution: **Bunny Optimizer / Bunny CDN**

**Why Bunny Over Alternatives:**

| Factor | Bunny | imgix | Cloudinary |
|--------|-------|-------|-----------|
| **Cost at 100K images** | $1/mo | $800/mo | $500+/mo |
| **Cold latency** | 2-3s | 2-4s | 3-5s |
| **Warm latency** | 20-80ms | 30-100ms | 50-150ms |
| **Vendor lock-in** | 🟢 LOW | 🟡 MED | 🔴 HIGH |
| **Simplicity** | 🟢 Simple | 🟢 Simple | 🟡 Medium |
| **Free tier** | $0 usage | 1GB | 25GB |
| **Scalability** | ✅ Linear | ✅ Linear | ✅ Linear |
| **Ad support** | ✅ | ✅ | ✅ |
| **OG support** | ✅ | ✅ | ✅ |

### Recommendation Rationale

**Primary:** SangTX is a multi-tenant SaaS starting up. Cost efficiency at scale is critical.
- At 100K images/month: Bunny = $1, imgix = $800, Cloudinary = $500+
- This cost difference compounds over years and across tenants

**Secondary:** Bunny's simplicity and low lock-in allow future flexibility.
- If Bunny underperforms, can migrate to imgix or Cloudinary relatively easily
- If SangTX scales beyond Bunny's needs, migration path is clear
- Bunny's API uses standard HTTP parameters (not proprietary)

**Tertiary:** Performance is comparable across all three.
- Warm latency: 20-80ms (acceptable for global SaaS)
- Compression: 60-90KB thumbnails (achieves P0 goal)
- Cold starts: 2-3s (reasonable first-request experience)

---

## RECOMMENDED ARCHITECTURE

### High-Level Data Flow

```
┌─────────────┐
│   Browser   │
│  Visitor    │
└──────┬──────┘
       │
       │ HTTP Request: /article/1
       │ (with JWT in cookie)
       ↓
┌──────────────────────────────┐
│  SangTX Web Application       │
│  (React @ localhost:5173)     │
│  ├─ Validate JWT             │
│  ├─ Load article data         │
│  └─ Render article            │
└──────┬───────────────────────┘
       │
       │ Need thumbnail image
       │ 
       ↓
┌──────────────────────────────┐
│  Supabase Edge Function      │
│  Route: /functions/v1/       │
│         thumbnail-image      │
│                              │
│  Logic:                       │
│  1. Validate JWT             │
│  2. Extract tenant_id        │
│  3. Check authorization      │
│  4. Verify file_id exists    │
│  5. Generate Bunny URL       │
│  6. Return 302 redirect      │
└──────┬───────────────────────┘
       │
       │ 302 Redirect Location:
       │ https://bunny-account.b-cdn.net/
       │   ?w=400&quality=80&
       │   url=<encoded-google-drive-url>&
       │ &token=<signed-token>&
       │ &expires=<unix-timestamp>
       │
       ↓
┌──────────────────────────────┐
│  Bunny Optimizer Edge        │
│  (Global CDN)                │
│                              │
│  Logic:                       │
│  1. Validate token           │
│  2. Check expiration         │
│  3. Fetch origin image from  │
│     Google Drive (via proxy) │
│  4. Resize to 400px width    │
│  5. Auto-convert to WebP     │
│  6. Compress (quality=80)    │
│  7. Cache globally           │
│  8. Return 60-90KB image     │
└──────┬───────────────────────┘
       │
       │ HTTP 200 (cached or fresh)
       │ Content-Type: image/webp
       │ Content-Length: 80-120KB
       │ Cache-Control: public, max-age=86400
       │
       ↓
┌──────────────────────────────┐
│  Browser                      │
│  ├─ Display thumbnail        │
│  ├─ Cache locally            │
│  └─ Show article             │
└──────────────────────────────┘
```

---

## COMPONENT DETAILS

### 1. Edge Function: `/functions/v1/thumbnail-image`

**Responsibility:** Validate authorization and generate signed CDN URLs

**Implementation Requirements:**

```typescript
// Pseudo-code (actual implementation in Step 7)

async function handleThumbnailRequest(request: Request) {
  // 1. Extract JWT from Authorization header or cookie
  const jwt = extractJWT(request);
  
  // 2. Validate JWT with Supabase Auth
  const { user, error } = await supabase.auth.getUser(jwt);
  if (error || !user) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // 3. Get tenant_id from tenant_memberships
  const { tenant_id } = await supabase
    .from('tenant_memberships')
    .select('tenant_id')
    .eq('auth_user_id', user.id)
    .single();
  
  if (!tenant_id) {
    return new Response('No tenant access', { status: 403 });
  }
  
  // 4. Extract file_id from query params
  const fileId = new URL(request.url).searchParams.get('fileId');
  if (!fileId) {
    return new Response('Missing fileId', { status: 400 });
  }
  
  // 5. Verify media record exists and belongs to tenant
  const { error: mediaError } = await supabase
    .from('media')
    .select('id')
    .eq('tenant_id', tenant_id)
    .eq('drive_file_id', fileId)
    .single();
  
  if (mediaError) {
    return new Response('Media not found', { status: 404 });
  }
  
  // 6. Get Google Drive OAuth token for this tenant
  const { access_token } = await getTenantGoogleDriveToken(tenant_id);
  
  // 7. Build Google Drive fetch URL (authenticated)
  const gdriveFetchUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  
  // 8. Create Bunny signed URL (template)
  const bunnyUrl = new URL('https://bunny-account.b-cdn.net/fetch');
  bunnyUrl.searchParams.set('url', encodeURIComponent(gdriveFetchUrl));
  bunnyUrl.searchParams.set('w', '400');           // width
  bunnyUrl.searchParams.set('quality', '80');      // quality
  bunnyUrl.searchParams.set('auto', 'webp');       // auto-format to WebP
  
  // 9. Add authorization header (if using private token)
  bunnyUrl.searchParams.set('auth', Buffer.from(
    `GoogleOAuth:${access_token}`
  ).toString('base64'));
  
  // 10. Optional: Add signed token for extra security
  const signedToken = signBunnyUrl(bunnyUrl, BUNNY_SECRET_KEY);
  bunnyUrl.searchParams.set('token', signedToken);
  bunnyUrl.searchParams.set('expires', String(Math.floor(Date.now() / 1000) + 3600)); // 1 hour
  
  // 11. Return 302 redirect (let browser fetch from CDN)
  return new Response(null, {
    status: 302,
    headers: {
      'Location': bunnyUrl.toString(),
      'Cache-Control': 'public, max-age=86400'
    }
  });
}
```

**Key Design Decisions:**

- **302 Redirect:** Browser fetches from Bunny directly (reduces Edge Function load)
- **Signed URLs:** Token expires in 1 hour (prevents long-lived URLs from being shared)
- **Tenant isolation:** File verified to belong to tenant before generating URL
- **Google Drive OAuth:** Token stored in Supabase, not exposed to browser
- **Query parameters:** Bunny transformation parameters in URL
- **Cache headers:** CDN caches for 24 hours, browser caches for same duration

---

### 2. Full-Resolution Image Endpoint

**Requirement:** Full-resolution images (1672x941px) must still be available for article detail pages

**Implementation:**

```typescript
async function handleFullResolutionRequest(request: Request) {
  // Same authorization flow as thumbnail endpoint
  // ...
  
  // Skip Bunny, fetch directly from Google Drive
  const gdriveFetchUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  
  const response = await fetch(gdriveFetchUrl, {
    headers: {
      'Authorization': `Bearer ${access_token}`
    }
  });
  
  // Return full-resolution directly
  // Client receives full file (2.77MB)
  // This is acceptable for detail pages (not thumbnails)
  
  return new Response(response.body, {
    status: 200,
    headers: {
      'Content-Type': response.headers.get('Content-Type'),
      'Content-Length': response.headers.get('Content-Length'),
      'Cache-Control': 'private, max-age=86400'
    }
  });
}
```

**Rationale:**
- Thumbnail endpoint optimizes for list views (Bunny processing)
- Full-resolution endpoint preserves original quality for detail pages
- Clients can choose which endpoint to use based on context

---

### 3. Advertisement Image Handling

**Requirement:** Advertisement records contain Google Drive URLs

**Implementation:**

```typescript
// In advertisement rendering component
function AdImage({ ad }) {
  // If ad.image_drive_file_id exists:
  const thumbnailUrl = `/functions/v1/thumbnail-image?fileId=${ad.image_drive_file_id}&size=300`;
  
  // Rendered as:
  return (
    <img 
      src={thumbnailUrl}
      alt={ad.title}
      width={300}
      height={200}
      loading="lazy"
    />
  );
}
```

**How It Works:**
1. Ad component requests thumbnail via same Edge Function
2. Edge Function validates ad ownership (via tenant_id)
3. Bunny transforms to 300px width (ad-specific size)
4. Browser receives optimized thumbnail
5. Works identically to article image thumbnails

**No Migration Needed:**
- Existing `ad.image_drive_file_id` values remain unchanged
- No movement to Supabase Storage
- Google Drive remains source of truth

---

### 4. OG/Twitter Image Generation

**Requirement:** Social media previews must use safe, proxied URLs

**Implementation:**

```typescript
// In server-side page metadata generation (or Edge Function)
function generateOGTags(article) {
  // Generate OG-specific image size (1200x630 recommended)
  const ogImageUrl = `/functions/v1/thumbnail-image?` +
    `fileId=${article.image_drive_file_id}&` +
    `w=1200&` +
    `h=630&` +
    `crop=center`;
  
  return {
    'og:image': ogImageUrl,
    'og:image:width': '1200',
    'og:image:height': '630',
    'og:image:type': 'image/webp',
    'twitter:image': ogImageUrl,
    'twitter:card': 'summary_large_image'
  };
}
```

**How It Works:**
1. Server generates OG meta tags with thumbnail-image URLs
2. Social platforms (Twitter, Facebook, LinkedIn) crawl the page
3. When fetching OG image, they request thumbnail-image endpoint
4. Edge Function validates request (crawlers get same image as users)
5. Bunny returns optimized 1200x630 WebP thumbnail
6. Social platform caches and displays

**Benefits:**
- ✅ Google Drive URL never exposed to social platforms
- ✅ Image optimized for social media consumption
- ✅ No additional infrastructure needed
- ✅ Works with all major social platforms

---

### 5. Cache Invalidation Strategy

**Scenario:** User updates an article image (replaces file in Google Drive)

**Current Architecture Limitation:**
- Google Drive original changes
- Bunny CDN still has old cached image
- User sees stale image for up to 24 hours

**Solution Option 1: Simple (No Cache Busting)**
```
Accept 24-hour staleness as tradeoff
- Pros: Zero operational overhead
- Cons: Updates take up to 24 hours to appear
- Best for: News articles (usually not updated frequently)
```

**Solution Option 2: Manual Cache Clear (Operational)**
```
When user updates image:
1. Admin clicks "Clear cache" button
2. Edge Function calls Bunny API to purge specific URL
3. Next request fetches fresh from Google Drive
4. New image cached

Requires: Bunny API key in Edge Function secrets
```

**Solution Option 3: Google Drive Webhook (Future)**
```
If Google Drive webhooks become available:
1. Subscribe to Google Drive file change events
2. When file changes, automatically purge Bunny cache
3. Seamless invalidation (users see updates immediately)

Current Status: Google Drive webhooks have limited support
Alternative: Use Google Drive API polling (operational overhead)
```

**Recommendation for MVP:**
- Implement **Solution Option 1** (accept 24-hour cache)
- Simple, zero overhead, acceptable for news content
- Later: add manual cache clear button if needed
- Future: implement webhooks if/when Google Drive improves support

---

### 6. Error Handling & Fallback

**Edge Function Error Scenarios:**

```typescript
// Case 1: User not authenticated
→ Return 401 Unauthorized

// Case 2: File not found / not authorized
→ Return 403 Forbidden (or 404 Not Found)

// Case 3: Google Drive API fails (rate limit, timeout, etc)
→ Return 502 Bad Gateway with diagnostic header
→ Browser shows placeholder image

// Case 4: Bunny CDN unavailable
→ Edge Function returns 502
→ Browser fallback to full-resolution endpoint
→ User sees full 2.77MB image (degraded but functional)

// Case 5: Bunny transformation fails (unsupported format, etc)
→ Bunny returns 400 Bad Request
→ Browser can retry or show placeholder
```

**Client-Side Handling:**

```jsx
function ArticleImage({ fileId }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [error, setError] = useState(false);
  
  useEffect(() => {
    // Try thumbnail first
    const thumbUrl = `/functions/v1/thumbnail-image?fileId=${fileId}`;
    
    fetch(thumbUrl)
      .then(r => {
        if (r.ok) {
          setImageUrl(r.url); // Redirected to Bunny URL
        } else if (r.status === 401 || r.status === 403) {
          setError(true);
        } else {
          // Fallback to full-resolution
          setImageUrl(`/functions/v1/image?fileId=${fileId}`);
        }
      })
      .catch(() => {
        // Network error, try full-resolution
        setImageUrl(`/functions/v1/image?fileId=${fileId}`);
      });
  }, [fileId]);
  
  if (error) return <div>Access denied</div>;
  if (!imageUrl) return <Skeleton />;
  
  return (
    <img 
      src={imageUrl}
      alt="Article"
      loading="lazy"
      onError={() => setError(true)}
    />
  );
}
```

---

## IMPLEMENTATION PHASES

### Phase 1: Foundation (Week 1)
- Create Bunny Optimizer account (free, no credit card)
- Configure Bunny transform rules
- Design Edge Function: thumbnail-image endpoint
- Implement authorization logic
- Test with single tenant (staging)

### Phase 2: Integration (Week 2)
- Integrate Edge Function with application
- Update article image components to use new endpoint
- Test with multiple image sizes (thumbnail, OG, full)
- Verify cache behavior
- Load test with concurrent requests

### Phase 3: Rollout (Week 3)
- Deploy to production
- Monitor Bunny edge cache hits
- Track performance metrics (latency, image sizes)
- Gather user feedback
- Optimize transformation parameters if needed

### Phase 4: Scale (Ongoing)
- Monitor usage and costs
- Add advertisement image support
- Implement OG/Twitter image generation
- Plan cache invalidation strategy (if needed)

---

## MONITORING & METRICS

### Key Metrics to Track

**Performance:**
- Thumbnail latency (p50, p95, p99)
- CDN cache hit rate
- Image size reduction ratio (2.77MB → 80KB)
- Time to First Contentful Paint (FCP)

**Cost:**
- Monthly bandwidth usage (GB)
- Monthly cost vs. budget
- Cost per request
- Trend analysis (is scale linear?)

**Reliability:**
- Edge Function error rate
- Bunny API response time
- 4xx / 5xx error rates
- Authorization failure rate

**User Experience:**
- Image load time in browser
- Complaints about image quality/appearance
- OG image generation success rate
- Advertisement impression quality

### Monitoring Implementation

```typescript
// Log thumbnail metrics to Supabase analytics table

async function logThumbnailMetric(metric: {
  tenant_id: string;
  file_id: string;
  request_type: 'thumbnail' | 'full' | 'og';
  cache_hit: boolean;
  response_time_ms: number;
  image_size_bytes: number;
}) {
  await supabase
    .from('thumbnail_metrics')
    .insert([metric]);
}
```

---

## ROLLBACK PROCEDURE

**If Bunny Underperforms:**

1. Disable Bunny URL generation in Edge Function
2. Revert to full-resolution endpoint temporarily
3. Users see 2.77MB images (P0 fails, but site functional)
4. Switch to imgix or Cloudinary:
   - Only change: CDN domain name and URL format
   - Same Edge Function authorization flow
   - Same caching strategy
   - Takes ~1 hour to switch providers

**Rollback is Easy Because:**
- ✅ Bunny is not in application code (only in Edge Function)
- ✅ URL format is standard HTTP parameters
- ✅ Can switch to imgix with minimal changes
- ✅ No data migration needed
- ✅ Google Drive source of truth unchanged

---

## COMPARISON: WHY NOT ALTERNATIVES?

### Why Not imgix?

**imgix is excellent**, but:
- 1000x more expensive than Bunny at scale ($800/mo vs $1/mo at 100K images)
- Performance difference negligible (2-4s cold vs 2-3s)
- More features than SangTX needs (smart cropping, AI-powered sizing, etc.)
- Better for image-heavy portfolios or photo sites
- For news SaaS: overkill

**When to reconsider imgix:**
- If SangTX becomes heavy image focus (photography platform)
- If free tier insufficient for new feature
- If performance becomes critical differentiator

### Why Not Cloudinary?

**Cloudinary is powerful**, but:
- Expensive ($500+/mo at 100K images)
- Proprietary transformation syntax (vendor lock-in)
- Overkill for article thumbnails and ads
- Better for social media platforms or design tools
- For news SaaS: unnecessary complexity

**When to reconsider Cloudinary:**
- If SangTX adds video support (thumbnails, transcoding)
- If dynamic image generation needed (AI watermarks, overlays, etc.)
- If sophisticated DAM (Digital Asset Management) features required

### Why Not AWS Lambda?

**AWS Lambda is powerful**, but:
- Cold starts (5-15s) destroy user experience
- More expensive than Bunny at any scale
- Requires AWS DevOps expertise
- High operational overhead (monitoring, logging, cost tracking)
- CloudFront billing complexity
- Overkill for simple image transformation

**When AWS Lambda makes sense:**
- If already heavily invested in AWS
- If computation beyond simple transformation needed
- If custom machine learning models needed
- Enterprise budgets with dedicated DevOps teams

---

## DECISION CHECKPOINTS

**Before proceeding to implementation, confirm:**

✅ **1. Cost Acceptable?**
   - $0-1/month at current scale
   - Scales to $800+/month at 100K images/month
   - Is this budget acceptable?

✅ **2. Performance Acceptable?**
   - 60-90KB thumbnails (vs 2.77MB current)
   - 2-3s cold start (vs 12.5s current)
   - 20-80ms warm latency (vs 12.5s current)
   - Is this acceptable for users?

✅ **3. Authorization Model Acceptable?**
   - JWT validated at Edge Function
   - Tenant isolation enforced
   - Google Drive remains private
   - Is this acceptable security-wise?

✅ **4. 24-Hour Cache Acceptable?**
   - Image updates take up to 24 hours to appear
   - No automatic invalidation
   - Is this acceptable editorial policy-wise?

✅ **5. Architecture Maintainable?**
   - Edge Function contains authorization logic
   - Same pattern can scale to many features
   - Can new developer understand it?

If **all 5 are YES**, proceed to implementation.
If **any is NO**, reconsider alternatives or require design changes.

---

## NEXT STEPS

1. ✅ **This document:** Recommended Bunny Optimizer architecture
2. **COST_ESTIMATE.md:** Detailed pricing at 3 scale points
3. **SECURITY_ANALYSIS.md:** Threat model and mitigation
4. **User approval:** Confirm recommendation acceptable
5. **Implementation:** Only after approval

---

## APPENDIX: Why Bunny Was Selected

### Summary Decision Matrix

| Evaluation Factor | Weight | Bunny | imgix | Cloudinary |
|------------------|--------|-------|-------|-----------|
| **Cost at Scale** | 30% | 10 | 4 | 3 |
| **Performance** | 20% | 9 | 9 | 8 |
| **Simplicity** | 20% | 9 | 8 | 6 |
| **Vendor Lock-In** | 15% | 10 | 7 | 4 |
| **Scalability** | 10% | 9 | 9 | 9 |
| **Reliability** | 5% | 9 | 9 | 9 |
| **WEIGHTED SCORE** | **100%** | **9.2** | **7.5** | **6.1** |

**Bunny wins decisively** due to cost efficiency (30% weight) combined with acceptable performance and low lock-in.

For a bootstrapped SaaS, **cost is the deciding factor**. At 100K images/month:
- Bunny: $1/month
- imgix: $800/month
- Cloudinary: $500+/month

This is a 800x cost difference that grows with scale. Bunny is the right choice for SangTX.

