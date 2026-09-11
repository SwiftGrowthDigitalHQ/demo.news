# Free/OSS Image Optimization Comparison for SangTX

**Date:** September 11, 2026  
**Objective:** Compare FREE and open-source alternatives to Bunny CDN for SangTX Google Drive image optimization

---

## EVALUATION MATRIX

| Option | License | Cost | Hosting | In Supabase Edge Functions | Docker Support | Google Drive Compatible | Tenant Isolation | Performance | Complexity |
|--------|---------|------|---------|--------------------------|-----------------|------------------------|--------------------|-------------|-----------|
| **imgproxy OSS** | MIT (+ Pro) | Free | Self-hosted | ❌ NO (binary, Go) | ✅ YES | ✅ YES | ✅ YES | ⭐⭐⭐⭐⭐ | Medium |
| **libvips (direct)** | LGPL-2.1+ | Free | Self-hosted | ❌ NO (native lib) | ✅ YES | ✅ YES | ✅ YES | ⭐⭐⭐⭐⭐ | Very High |
| **Thumbor** | MIT | Free | Self-hosted | ❌ NO (Python) | ✅ YES | ✅ YES | ✅ YES | ⭐⭐⭐⭐ | Medium-High |
| **Cloudflare Images** | Proprietary | 5K free transforms/mo | Cloudflare | ❌ NO (proprietary) | ❌ NO | ⚠️ Needs public URL | ✅ YES | ⭐⭐⭐⭐⭐ | Low |
| **Cloudflare Workers** | Proprietary | 100K requests/day free | Cloudflare | ❌ NO (proprietary) | ❌ NO | ✅ YES | ✅ YES | ⭐⭐⭐ | Medium |
| **ImageMagick (CLI)** | ImageMagick License | Free | Self-hosted | ❌ NO (CLI binary) | ✅ YES | ✅ YES | ✅ YES | ⭐⭐⭐ | High |
| **Sharp (Node.js)** | Apache-2.0 | Free | Supabase/Node | ✅ MAYBE (Deno only) | ✅ YES | ✅ YES | ✅ YES | ⭐⭐⭐⭐ | Medium |

---

## DETAILED ANALYSIS

### 1. IMGPROXY OSS

**License:** MIT (Open-source version free, Pro version available)  
**Language:** Go  
**Current Maintenance:** Active (Evil Martians)

#### Architecture
- Standalone HTTP server
- Processes images on-the-fly
- LibVIPS-based under the hood
- URL-safe base64 encoding for signed URLs

#### Capabilities
- ✅ WebP generation
- ✅ AVIF generation  
- ✅ Resize/crop
- ✅ Format conversion
- ✅ Smart crop
- ✅ Lazy loading support
- ✅ Cache control

#### Integration with SangTX
```
Google Drive (private)
   ↓
Supabase Edge Function (authorization)
   ↓ (redirects to)
imgproxy instance (resize)
   ↓ (fetches from)
Google Drive (with token)
   ↓
Optimized image returned
```

**Key Points:**
- imgproxy fetches the image from Google Drive internally
- Edge Function doesn't need to proxy bytes through
- Can be self-hosted in Docker
- Requires separate infrastructure (EC2, Railway, DigitalOcean, etc.)

#### Can It Run in Supabase Edge Functions?
**NO** - Supabase Edge Functions run Deno (TypeScript/JavaScript runtime), not Go binaries. imgproxy is a standalone Go server that requires:
- Linux environment
- Port exposure
- Network access
- Persistent storage (optional, for caching)

#### Free Usage Tier
- Unlimited for self-hosted OSS version
- No per-request charges
- No bandwidth charges
- Only pay for hosting infrastructure

#### Expected Costs (if self-hosted)
```
imgproxy OSS (self-hosted):
  Docker hosting: $5-15/month (small server)
  Bandwidth: varies
  Total: ~$5-20/month
```

#### Pros
- ✅ Truly free (no per-request charges)
- ✅ Full control
- ✅ Open-source
- ✅ Proven, battle-tested
- ✅ Excellent performance
- ✅ Can operate behind SangTX auth layer

#### Cons
- ❌ Cannot run in Supabase Edge Functions
- ❌ Requires separate infrastructure
- ❌ DevOps complexity (managing another server)
- ❌ Need to secure and monitor
- ❌ Cold-start latency (first request slower)

#### Security Model
```
Browser
   → Supabase Edge Function (JWT validation, tenant check)
   → 302 redirect to imgproxy URL (signed with HMAC secret)
   → imgproxy (validates signature, checks URL safe expiry)
   → Fetches from Google Drive with stored OAuth token
   → Returns optimized image
   ↓
Cache: CDN cache on imgproxy server (optional)
```

**Critical Question:** Is the imgproxy URL exposed to the browser?  
**Answer:** YES - Browser receives redirect URL. But URL is HMAC-signed with secret key, so it's unforgeable. URL can be copied but:
- Signature is time-bound
- Signature is HMAC-SHA256 verified by imgproxy
- Without valid signature, requests are rejected

---

### 2. LIBVIPS (DIRECT)

**License:** LGPL-2.1+  
**Language:** C library  
**Bindings:** Go (govips), JavaScript (sharp), Python (Pillow)

#### Architecture
- Native C library for image processing
- Must be compiled/installed on system
- Cannot be bundled into Deno runtime
- Requires system-level dependencies

#### Can It Run in Supabase Edge Functions?
**NO** - Supabase Edge Functions cannot:
- Load native C libraries
- Access system libvips installation
- Compile C code at runtime

#### Could we use Sharp (Node.js binding)?
Sharp is a JavaScript wrapper around libvips, but:
- Supabase Edge Functions run Deno (not Node.js)
- Sharp requires Node.js runtime
- Not available in Deno ecosystem

#### Verdict
**NOT FEASIBLE** for Supabase Edge Functions. Would require self-hosted infrastructure like imgproxy.

---

### 3. THUMBOR

**License:** MIT  
**Language:** Python  
**Current Maintenance:** Active (but slower than imgproxy)

#### Architecture
- Python-based HTTP server
- Similar concept to imgproxy
- Smart crop, resize, filters
- URL-safe request format

#### Capabilities
- ✅ WebP generation
- ✅ Resize/crop
- ✅ Filters (blur, contrast, etc.)
- ✅ Smart crop with face detection (optional)
- ❌ AVIF support (limited)

#### Can It Run in Supabase Edge Functions?
**NO** - Same issue as imgproxy. Requires Python runtime and server infrastructure.

#### Free Usage Tier
- Fully open-source, MIT license
- No per-request fees
- Only pay for hosting

#### Expected Costs (if self-hosted)
```
Thumbor (self-hosted):
  Docker hosting: $5-15/month
  Bandwidth: varies
  Total: ~$5-20/month
```

#### Pros
- ✅ Free, MIT license
- ✅ Proven technology
- ✅ Smart crop capabilities
- ✅ Can operate behind auth layer

#### Cons
- ❌ Cannot run in Supabase Edge Functions
- ❌ Requires infrastructure
- ❌ Python runtime overhead
- ❌ Slower than imgproxy (Go vs Python)
- ❌ AVIF support weak

---

### 4. CLOUDFLARE IMAGES (PROPRIETARY)

**License:** Proprietary  
**Cost:** 5,000 free transformations/month, then $0.50/1000 additional  
**Vendor:** Cloudflare

#### Architecture
- Cloudflare's managed CDN service
- Transforms images at edge
- No self-hosted infrastructure needed
- Proprietary image encoding/optimization

#### Can It Run in Supabase Edge Functions?
**NO** - Cloudflare Images is a separate Cloudflare service. Supabase Edge Functions are Supabase/Vercel infrastructure (different vendor).

#### Integration Model
Would require:
```
Browser
   → Supabase Edge Function
   → Supabase uploads image to Cloudflare Images
   → Returns Cloudflare Images URL
   → Browser requests Cloudflare URL
```

**Problem:** Requires uploading private Google Drive images to Cloudflare storage, which violates requirement: "Do NOT migrate images to Supabase Storage" (and definitely not external storage).

#### Free Tier Limits
```
5,000 unique transformations per month (free)
- Each unique resize/format = 1 transformation
- 100 images × 50 different sizes = 5,000 transformations

At 100K images, need ~500K transformations
- Free: 5,000
- Cost: ($0.50/1000) × 495,000 = $247.50/month
```

#### Google Drive Compatibility
**POOR** - Cloudflare Images expects:
- Images stored in Cloudflare R2 (or S3)
- or images publicly accessible via URL
- Private Google Drive URLs won't work
- Would need to expose Google Drive URLs publicly (security risk)

#### Pros
- ✅ Zero infrastructure management
- ✅ Ultra-fast (global edge)
- ✅ Very easy to integrate
- ✅ 5K transformations/month free

#### Cons
- ❌ Requires uploading to external storage
- ❌ Violates "keep Google Drive as source of truth"
- ❌ Expensive after free tier ($247.50/month at scale)
- ❌ Vendor lock-in
- ❌ Private images become less private

---

### 5. CLOUDFLARE WORKERS (FREE TIER)

**License:** Proprietary  
**Cost:** 100,000 requests/day free, then $5/month subscription  
**Note:** Can add image transformation via binding

#### Architecture
- Serverless functions at Cloudflare edge
- Can fetch image from Google Drive
- Can process with Cloudflare Images binding
- Must already use Cloudflare for DNS/proxy

#### Free Tier Limits
```
100,000 requests per day (free)
10ms CPU time per invocation (free tier limit)

For 100K images:
  ~3.3K requests/day (33 days to process)
  Well within free tier

But: Image processing via Cloudflare Images binding:
  Still subject to 5,000 unique transformations/month
```

#### Can It Run in Supabase Edge Functions?
**NO** - Cloudflare Workers is a different vendor/platform. Would require:
- Moving from Supabase to Cloudflare infrastructure
- Changing DNS to Cloudflare
- Significant architectural changes

#### Google Drive Compatibility
**YES** - Workers can:
- Fetch from Google Drive with OAuth token
- Transform locally (if image processing available)
- Return optimized image

#### Pricing After Free Tier
```
Free: 100K requests/day + 5K transforms/month
Paid: $5/month minimum + additional costs

For 100K images × 50 sizes:
  Requests: well within free (3.3K/day)
  Transformations: 500K needed, but only 5K free
  Cost: $5 + ($0.50/1000 × 495K) = $252.50/month
```

#### Verdict
**NOT VIABLE FOR SANGTX** - Would require:
1. Switching from Supabase to Cloudflare
2. Still paying for transformations beyond free tier
3. Major architectural change

---

### 6. IMAGEMAGICK (CLI)

**License:** ImageMagick License (derivative works permitted)  
**Cost:** Free  
**Status:** Well-maintained

#### Architecture
- Command-line image processing tool
- Can be called from applications
- Slower than libvips

#### Can It Run in Supabase Edge Functions?
**NO** - Same as libvips. Requires:
- System binary (ImageMagick CLI)
- Not available in Deno runtime

#### Verdict
**NOT FEASIBLE** - Would require self-hosted solution like imgproxy/Thumbor.

---

### 7. SHARP (NODE.JS)

**License:** Apache-2.0  
**Cost:** Free  
**Note:** JavaScript binding for libvips

#### Architecture
- npm package (Node.js only)
- Wraps libvips C bindings
- Very fast

#### Can It Run in Supabase Edge Functions?
**MAYBE** - Supabase Edge Functions use **Deno**, not Node.js.
- Sharp is designed for Node.js
- Deno has some Node.js compatibility layer
- But: Sharp has native C dependencies that won't be available in Deno

**Verdict:** Theoretically possible but practically very difficult. Not recommended.

---

## SUMMARY TABLE

| Option | Cost | Supabase Edge Fn | Infrastructure | Tenant Isolation | Performance | Recommendation |
|--------|------|-----------------|-----------------|------------------|-------------|-----------------|
| imgproxy OSS | FREE | ❌ NO | Self-host | ✅ YES | ⭐⭐⭐⭐⭐ | **BEST OSS** |
| libvips | FREE | ❌ NO | Self-host | ✅ YES | ⭐⭐⭐⭐⭐ | Difficult |
| Thumbor | FREE | ❌ NO | Self-host | ✅ YES | ⭐⭐⭐⭐ | Second best |
| Cloudflare Images | $0.50/1K txns | ❌ NO | Managed | ✅ YES | ⭐⭐⭐⭐⭐ | Too expensive |
| Cloudflare Workers | $5/month | ❌ NO | Managed | ✅ YES | ⭐⭐⭐⭐ | Expensive |
| ImageMagick | FREE | ❌ NO | Self-host | ✅ YES | ⭐⭐⭐ | Slower |
| Sharp | FREE | ⚠️ MAYBE | Supabase | ✅ YES | ⭐⭐⭐⭐ | Difficult |

---

## ARCHITECTURE DIAGRAM: IMGPROXY OSS (RECOMMENDED)

```
SangTX Architecture:
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       │ HTTPS GET /functions/v1/thumbnail-image?fileId=ABC123&size=400
       ↓
┌──────────────────────────┐
│ Supabase Edge Function   │ ← JWT validation
│ /thumbnail-image         │ ← Tenant authorization
│                          │ ← Generate signed imgproxy URL
└──────────────┬───────────┘
               │
               │ HTTP 302 Redirect
               │ Location: https://imgproxy.company.com/unsafe/400x0/webp/aHR0cHM6...
               ↓
┌──────────────────────────┐
│   imgproxy OSS Server    │ ← Validate HMAC signature
│  (Docker, self-hosted)   │ ← Check URL not expired
│                          │
│ Processing:              │
│ • Fetch from Google Drive│
│ • Resize to 400px        │
│ • Convert to WebP        │
│ • Add Cache-Control      │
└──────────────┬───────────┘
               │
               │ HTTPS GET (Google Drive API with OAuth token)
               ↓
┌──────────────────────────┐
│   Google Drive (Private) │
│   1672×941 PNG 2.77MB    │
└──────────────────────────┘

Result:
• Browser receives optimized 400×225 WebP (~80-100KB)
• Original Google Drive URL not exposed to browser
• Only signed imgproxy URL visible
• Tenant isolation maintained via Edge Function auth
• Cache-Control headers set for browser caching
```

---

## RECOMMENDED APPROACH FOR SANGTX

**Selected Option: imgproxy OSS (self-hosted)**

### Why imgproxy?
1. **Truly free** - No per-request charges
2. **Battle-tested** - Used by major companies
3. **Excellent performance** - 4-8x faster than ImageMagick
4. **Easy deployment** - Single Docker container
5. **Security** - HMAC-signed URLs
6. **Tenant-aware** - Signature includes tenant context
7. **Google Drive compatible** - Fetches privately from GD

### Infrastructure Requirements
```
Hosting Options:
1. Railway: $5-10/month
2. DigitalOcean App Platform: $5-10/month
3. AWS EC2 (micro): $5-10/month
4. Render: $7/month

Add CDN caching (optional):
- Cloudflare Free: $0
- Bunny CDN: $0.01/GB
```

### Architecture Change for SangTX

```
BEFORE (current):
Browser → Supabase Edge Function → Google Drive
         (full res image 2.77MB)

AFTER (with imgproxy):
Browser → Supabase Edge Function → imgproxy → Google Drive
         (optimized image 80-100KB)
```

### Implementation Steps
1. Deploy imgproxy Docker container to hosting
2. Configure HMAC secret for URL signing
3. Update Edge Function to:
   - Generate signed imgproxy URLs instead of redirecting to Google Drive
   - Include tenant_id in signature
   - Set cache-control headers
4. Test with test image
5. Roll out to production (no changes to existing code needed)

---

## BLOCKERS & CONSIDERATIONS

### 1. Additional Infrastructure
- Need separate hosting for imgproxy
- Monthly cost ($5-15)
- DevOps overhead

### 2. Network Latency
- Request goes: Browser → Edge Function → imgproxy → Google Drive
- But: imgproxy caches images, so mostly cache hits
- First request to new image: ~200-300ms
- Subsequent requests: ~50-100ms

### 3. Security
- imgproxy URL is visible to browser (but HMAC-signed)
- URL cannot be forged without secret key
- URL can be copied and used by unauthorized users
  - **Mitigation:** Short expiry times (e.g., 5 minutes)
  - **Mitigation:** Regenerate signature for each request
  - **Mitigation:** Log all imgproxy requests and correlate with user ID

### 4. Google Drive Rate Limiting
- Google Drive API: 10,000 queries per day per user per 100 seconds
- For 100K images: Could hit rate limit if many users hit new images
- **Mitigation:** Implement request queuing/throttling

---

## NEXT STEPS

1. **Decision:** Approve imgproxy OSS approach?
2. **Test:** Deploy imgproxy in Docker locally
3. **Integration:** Update Edge Function to generate signed URLs
4. **Testing:** Real image transformation tests with test image
5. **Performance:** Measure latency and cache efficiency
6. **Production:** Deploy to production hosting

