# SangTX Image Architecture Comparison
## Detailed Analysis of 7 CDN/Optimization Solutions

**Purpose:** Select the best image transformation architecture for multi-tenant SaaS  
**Context:** P0 = 2.77MB thumbnail, must achieve <300KB at ~400px width  
**Constraints:** Google Drive source of truth, tenant auth preserved, no public URLs exposed

---

## OPTION A: Cloudinary

### Source & Access Pattern
- **Direct GD fetch:** ❌ No native Google Drive connector
- **GD must be public:** ❌ Can work with private GD if using signed URLs
- **GD remain private:** ✅ Yes, via authenticated Edge Function proxy
- **Auth preserved:** ✅ Tenant check at Edge Function before CDN URL generation
- **Exposes GD URL:** ❌ No (uses transformation URL instead)

### Core Capabilities
- **Resize to 400px:** ✅ Yes, `w_400,c_scale`
- **WebP/AVIF:** ✅ Yes, `f_auto` (auto-format) and explicit `f_webp`, `f_avif`
- **Cache derived:** ✅ Yes, unlimited transformations cached globally
- **First request:** ✅ Transform on-demand (3-5s typical)
- **Cached requests:** ✅ 50-200ms from edge

### Thumbnail & Latency
- **Expected size:** 80-120KB (WebP at quality 80)
- **Latency (cold):** 3-5 seconds
- **Latency (warm):** 50-150ms
- **Bandwidth:** ~100KB/req × requests/month

### Pricing Model
- **Free tier:** 25GB/month (1 API token, limited)
- **Starter:** $99/month (100GB/month, transformations)
- **Professional:** Custom

**Scale Cost Estimates:**
| Scale | 1K imgs | 10K imgs | 100K imgs |
|-------|---------|----------|-----------|
| **Requests/month** | 10K | 100K | 1M |
| **Est. data** | 1GB | 10GB | 100GB |
| **Cost** | Free tier | $99-199/mo | $500+/mo |

### Advertisement Images
- ✅ Same transformation pipeline works for ads
- ✅ Can serve ad images with `w_300,q_auto` for thumbnails
- ✅ No additional configuration needed

### OG/Twitter Images
- ✅ Can generate OG-specific sizes (`w_1200,h_630,c_fill`)
- ✅ Auto-format to optimal compression

### Full-Resolution Bypass
- ✅ Separate Edge Function endpoint for full-resolution images
- ✅ Full-res doesn't go through Cloudinary (direct from GD)

### Vendor Lock-In
- 🔴 **HIGH**: Cloudinary-specific transformation syntax
- Would need code changes to migrate to another provider
- SDKs and transformation API are proprietary

### Implementation Complexity
- Medium: Requires Edge Function modification to:
  1. Validate tenant authorization
  2. Generate Cloudinary transformation URL
  3. Return 302 redirect to Cloudinary URL
  4. Handle signed/unsigned URLs based on policy

### Security Risk
- 🟡 **MEDIUM**: Cloudinary URL is publicly visible in browser
  - If someone has the URL, they can access the image
  - Cloudinary URLs are not spoofable but are discoverable
  - Can mitigate with signed URLs (expires after 1-2 hours)
  - Private mode: requires authentication token (adds complexity)

### Reliability
- ✅ **EXCELLENT**: 99.9% uptime SLA, global edge
- Handles spike traffic automatically
- Cloudinary manages infrastructure

### Pros
- ✅ Excellent format conversion (WebP, AVIF, quality auto-tuning)
- ✅ Powerful transformation API (`w_`, `h_`, `c_`, `q_`, `f_auto`)
- ✅ Global CDN with edge locations worldwide
- ✅ Smart cropping and adaptive sizing
- ✅ Video support (future ads)
- ✅ 25GB free tier for small deployments
- ✅ Handles burst traffic automatically

### Cons
- ❌ Expensive at scale (>100GB/month = $500+)
- ❌ Proprietary transformation syntax (vendor lock-in)
- ❌ URLs are public (security tradeoff)
- ❌ Requires Cloudinary account + API key management
- ❌ Cold start (3-5s first request)

---

## OPTION B: imgix

### Source & Access Pattern
- **Direct GD fetch:** ❌ No native connector
- **GD must be public:** ❌ Can use private via authenticated proxy
- **GD remain private:** ✅ Yes, via Edge Function signed URLs
- **Auth preserved:** ✅ Tenant check at Edge before URL generation
- **Exposes GD URL:** ❌ No (uses imgix transformation URL)

### Core Capabilities
- **Resize to 400px:** ✅ Yes, `?w=400`
- **WebP/AVIF:** ✅ Yes, `&auto=format` and `&fmt=webp`
- **Cache derived:** ✅ Yes, transformations cached at imgix edge
- **First request:** ✅ Transform on-demand (2-4s)
- **Cached requests:** ✅ 30-100ms from edge

### Thumbnail & Latency
- **Expected size:** 70-100KB (WebP/AVIF at auto quality)
- **Latency (cold):** 2-4 seconds
- **Latency (warm):** 30-100ms
- **Bandwidth:** Highly optimized auto-compression

### Pricing Model
- **Free tier:** 1GB/month (one account)
- **Pay-as-you-go:** $0.08/GB (no minimums)
- **Volume discounts:** Available at >1TB/month

**Scale Cost Estimates:**
| Scale | 1K imgs | 10K imgs | 100K imgs |
|-------|---------|----------|-----------|
| **Requests/month** | 10K | 100K | 1M |
| **Est. data** | 1GB | 10GB | 100GB |
| **Cost** | Free tier | $80/mo | $800/mo |

### Advertisement Images
- ✅ Same transformation pipeline for ads
- ✅ Can specify exact sizes per ad type
- ✅ Works with any source URL (GD, Storage, etc.)

### OG/Twitter Images
- ✅ Can generate custom OG sizes
- ✅ Auto-format to best compression

### Full-Resolution Bypass
- ✅ Separate endpoint for full-res (no imgix processing)
- ✅ Direct from Google Drive with auth proxy

### Vendor Lock-In
- 🟡 **MEDIUM**: Query-based API (less proprietary than Cloudinary)
  - Easier to migrate (URL parameters are standard)
  - But still requires endpoint URL change

### Implementation Complexity
- Low-Medium: Edge Function modification to:
  1. Validate tenant
  2. Generate imgix URL with query parameters
  3. Return 302 redirect
  4. Optional: use signed URLs for extra security

### Security Risk
- 🟡 **MEDIUM**: Same as Cloudinary
  - imgix URLs are publicly visible in browser
  - Can use signed URLs to expire after 1-2 hours
  - Standard HTTPS in transit
  - No inherent advantage over Cloudinary

### Reliability
- ✅ **EXCELLENT**: 99.99% uptime SLA
- Used by major publishers (New York Times, etc.)
- Proven reliability at scale

### Pros
- ✅ Flexible query parameter API (easy to understand)
- ✅ Excellent auto-format selection
- ✅ Pay-as-you-go pricing (no monthly minimums)
- ✅ 1GB free tier sufficient for development
- ✅ Used by top publishers (proves reliability)
- ✅ Faster cold start than Cloudinary (2-4s vs 3-5s)
- ✅ Better per-GB pricing at scale

### Cons
- ❌ Pay-as-you-go can be unpredictable at scale (100GB = $800)
- ❌ Still requires account + API key
- ❌ URLs are public (security tradeoff)
- ❌ Need to cache query parameters carefully

---

## OPTION C: Bunny Optimize / Bunny CDN

### Source & Access Pattern
- **Direct GD fetch:** ❌ No native connector
- **GD must be public:** ❌ Can use private via proxy
- **GD remain private:** ✅ Yes, via authenticated Edge Function
- **Auth preserved:** ✅ Tenant check at Edge
- **Exposes GD URL:** ❌ No (uses Bunny URL)

### Core Capabilities
- **Resize to 400px:** ✅ Yes, `/files/resize?width=400`
- **WebP/AVIF:** ✅ Yes, auto conversion available
- **Cache derived:** ✅ Yes, unlimited transformations
- **First request:** ✅ Transform on-demand (2-3s)
- **Cached requests:** ✅ 20-80ms (fastest of all options)

### Thumbnail & Latency
- **Expected size:** 60-90KB (with aggressive compression)
- **Latency (cold):** 2-3 seconds
- **Latency (warm):** 20-80ms ⭐ **FASTEST**
- **Bandwidth:** Highly efficient compression

### Pricing Model
- **Free tier:** $0.01/GB (pay what you use, no minimums, no hidden fees)
- **Volume:** Scales down to $0.01/GB at any scale
- **Simplest pricing model**

**Scale Cost Estimates:**
| Scale | 1K imgs | 10K imgs | 100K imgs |
|-------|---------|----------|-----------|
| **Requests/month** | 10K | 100K | 1M |
| **Est. data** | 1GB | 10GB | 100GB |
| **Cost** | $0.01 | $0.10 | $1.00 |

### Advertisement Images
- ✅ Works perfectly for ad images
- ✅ Can resize to any dimension needed
- ✅ Consistent pricing applies

### OG/Twitter Images
- ✅ Can generate OG-specific crops
- ✅ Auto-format to best compression

### Full-Resolution Bypass
- ✅ Separate endpoint bypasses Bunny
- ✅ Direct from Google Drive

### Vendor Lock-In
- 🟢 **LOW**: Standard image transformation API
  - Can migrate to another provider relatively easily
  - Uses standard HTTP query parameters

### Implementation Complexity
- Low: Edge Function modification to:
  1. Validate tenant
  2. Generate Bunny Optimizer URL
  3. Return 302 redirect
  4. Optional: implement caching headers

### Security Risk
- 🟡 **MEDIUM**: Same public URL issue as others
  - Bunny URLs are public but not spoofable
  - Can implement token-based access if needed
  - Good default security practices

### Reliability
- ✅ **EXCELLENT**: 99.97% uptime SLA
- Bunny is used by massive scale deployments
- Consistent performance globally

### Pros
- ✅ **CHEAPEST**: $0.01/GB at any scale (100GB = $1/month!)
- ✅ Simplest pricing model (no surprises)
- ✅ Fastest cached latency (20-80ms)
- ✅ Free tier is free (truly $0 until you use it)
- ✅ Great documentation
- ✅ No monthly minimums or commitments
- ✅ Best value for cost-conscious SaaS
- ✅ European company (good for privacy-conscious regions)

### Cons
- ❌ Smaller market share than Cloudinary/imgix (lower brand recognition)
- ❌ Still requires Bunny account
- ❌ URLs are public (same tradeoff)
- ⚠️ Less marketing/hype around it

---

## OPTION D: Cloudflare Images / Image Transformations

### Source & Access Pattern
- **Direct GD fetch:** ❌ No native Google Drive connector
- **GD must be public:** ❌ Can use private with authenticated proxy
- **GD remain private:** ✅ Yes, via Edge Function
- **Auth preserved:** ✅ Tenant check at Edge
- **Exposes GD URL:** ❌ No (uses Cloudflare transformation)

### Core Capabilities
- **Resize to 400px:** ✅ Yes, `/cdn-cgi/image/width=400`
- **WebP/AVIF:** ✅ Yes, `format=auto`
- **Cache derived:** ✅ Yes, Cloudflare edge cache
- **First request:** ✅ Transform on-demand (2-4s)
- **Cached requests:** ✅ 30-150ms

### Thumbnail & Latency
- **Expected size:** 70-110KB
- **Latency (cold):** 2-4 seconds
- **Latency (warm):** 30-150ms
- **Bandwidth:** Reasonable compression

### Pricing Model
- **Free tier:** 100,000 images/month in Workers Paid plan
- **Workers Paid:** $5/month + $0.50 per 1M requests
- **Bundled:** May be cheaper if already using Cloudflare

**Scale Cost Estimates:**
| Scale | 1K imgs | 10K imgs | 100K imgs |
|-------|---------|----------|-----------|
| **Requests/month** | 10K | 100K | 1M |
| **Est. data** | ~50GB | ~500GB | ~5TB |
| **Cost** | $5 | $5 + $0.50 | $5 + $5 |

### Advertisement Images
- ✅ Works well for ad images
- ✅ Can transform in real-time at edge
- ✅ Cost-effective for ads

### OG/Twitter Images
- ✅ Can generate OG-specific sizes
- ✅ Worker can generate custom OG parameters

### Full-Resolution Bypass
- ✅ Separate endpoint bypasses transformation
- ✅ Direct from Google Drive

### Vendor Lock-In
- 🟢 **LOW**: Cloudflare proprietary but standard URL patterns
  - Could migrate to another provider
  - Integrates well with Cloudflare ecosystem

### Implementation Complexity
- Medium: Requires:
  1. Cloudflare Workers setup (if not already used)
  2. Image transformation rules
  3. Edge Function to validate tenant and redirect
  4. Cache control headers

### Security Risk
- 🟢 **BETTER**: Cloudflare edge can enforce authentication
  - Can use Cloudflare Access for token validation
  - Can require JWT in Worker before transformation
  - Integrates well if already using Cloudflare

### Reliability
- ✅ **EXCELLENT**: 99.99% uptime, massive infrastructure
- Cloudflare is one of the largest CDNs globally
- Handles DDoS inherently

### Pros
- ✅ If already using Cloudflare: minimal additional cost
- ✅ Workers can add authentication before transformation
- ✅ Excellent integration with Cloudflare ecosystem
- ✅ Very reliable infrastructure
- ✅ Can enforce security at edge
- ✅ Great for sites already behind Cloudflare
- ✅ Request-based pricing (pay per actual usage)

### Cons
- ❌ Complex setup if not already using Cloudflare
- ❌ $5/month minimum even for small deployments
- ❌ Requires Cloudflare Workers knowledge (steeper learning curve)
- ❌ If not using Cloudflare, Bunny/imgix/Cloudinary simpler
- ❌ Pricing less transparent for image-heavy workloads

---

## OPTION E: AWS Lambda + CloudFront

### Source & Access Pattern
- **Direct GD fetch:** ✅ Lambda can fetch directly with OAuth token
- **GD must be public:** ❌ Can use private Google Drive with OAuth
- **GD remain private:** ✅ Yes, Lambda handles auth internally
- **Auth preserved:** ✅ Lambda validates tenant before processing
- **Exposes GD URL:** ❌ No (Lambda transforms before CloudFront)

### Core Capabilities
- **Resize to 400px:** ✅ Yes (via Sharp library)
- **WebP/AVIF:** ✅ Yes, full format support
- **Cache derived:** ✅ Yes, CloudFront edge cache
- **First request:** ✅ Cold: 5-15s (Lambda cold start), Warm: 1-2s
- **Cached requests:** ✅ 30-100ms

### Thumbnail & Latency
- **Expected size:** 50-80KB (Sharp compression)
- **Latency (cold):** 5-15 seconds (🔴 Lambda cold start)
- **Latency (warm):** 1-2 seconds
- **Latency (cached):** 30-100ms
- **Bandwidth:** Very efficient

### Pricing Model
- **Lambda:** $0.20/1M requests + $0.0000166667/GB-second
- **CloudFront:** $0.085/GB (varies by region)
- **Estimated per request:** ~$0.0003 per transformation

**Scale Cost Estimates:**
| Scale | 1K imgs | 10K imgs | 100K imgs |
|-------|---------|----------|-----------|
| **Monthly cost** | $3-5 | $10-20 | $80-150 |
| **Plus CloudFront** | +$1-2 | +$10-15 | +$100-200 |
| **Total** | $4-7 | $20-35 | $180-350 |

### Advertisement Images
- ✅ Works for ad images
- ✅ Same transformation pipeline
- ✅ Cost accumulates with request volume

### OG/Twitter Images
- ✅ Can generate OG-specific sizes
- ✅ Cached at CloudFront edge

### Full-Resolution Bypass
- ✅ Separate Lambda handler for full-res
- ✅ Can bypass transformation entirely

### Vendor Lock-In
- 🔴 **HIGH**: Deep AWS integration
  - Lambda, CloudFront, IAM, S3 potentially
  - Would require significant rewrite to migrate

### Implementation Complexity
- High: Requires:
  1. Lambda function (Node.js + Sharp library)
  2. CloudFront distribution setup
  3. Origin access identity for GD authentication
  4. Lambda version management and layers
  5. IAM role configuration
  6. CloudWatch logging setup
  7. API Gateway or ALB configuration
  8. Terraform/CloudFormation for IaC

### Security Risk
- 🟢 **GOOD**: Lambda can securely handle OAuth tokens
  - OAuth tokens stored in Lambda environment (encrypted at rest)
  - No GD credentials exposed to browser
  - Private GD remains private
  - CloudFront can enforce signed URLs if needed

### Reliability
- ✅ **EXCELLENT**: AWS infrastructure is extremely reliable
- ✅ Auto-scaling handles spikes
- ✅ CloudFront global edge network
- But: Lambda cold starts add unpredictable latency

### Pros
- ✅ Full control over transformation logic
- ✅ Can use Sharp (excellent image library)
- ✅ CloudFront is one of the best CDNs globally
- ✅ Pay-per-request model (no minimum)
- ✅ Highly scalable
- ✅ Private GD URLs never exposed
- ✅ Can implement sophisticated caching rules
- ✅ Works perfectly at enterprise scale

### Cons
- ❌ **OVER-ENGINEERED** for this use case
- ❌ Lambda cold starts (5-15s first request) 🔴
- ❌ Expensive at small scale ($4-7/month adds up)
- ❌ Requires AWS knowledge (DevOps complexity)
- ❌ High vendor lock-in (AWS ecosystem)
- ❌ More operational overhead (monitoring, logging, troubleshooting)
- ❌ Overkill if only need image resizing

---

## OPTION F: Vercel Image Optimization

### Source & Access Pattern
- **Direct GD fetch:** ❌ No native Google Drive support
- **GD must be public:** ⚠️ Requires public or proxied access
- **GD remain private:** ⚠️ Can proxy but adds complexity
- **Auth preserved:** ⚠️ Would need custom middleware
- **Exposes GD URL:** ❌ No (proxied through Vercel)

### Core Capabilities
- **Resize to 400px:** ✅ Yes, `?width=400`
- **WebP/AVIF:** ✅ Yes, auto format
- **Cache derived:** ✅ Yes, Vercel ISR (Incremental Static Revalidation)
- **First request:** ✅ 1-2 seconds
- **Cached requests:** ✅ 20-50ms

### Thumbnail & Latency
- **Expected size:** 80-120KB
- **Latency (cold):** 1-2 seconds
- **Latency (warm):** 20-50ms
- **Bandwidth:** Good compression

### Pricing Model
- **Free tier:** 1GB/month (if using Vercel hosting)
- **Pro:** $20/month (100GB/month, Image Optimization included)
- **Enterprise:** Custom pricing

**Scale Cost Estimates:**
| Scale | 1K imgs | 10K imgs | 100K imgs |
|-------|---------|----------|-----------|
| **Free (1GB)** | ✅ Works | ❌ Exceeds | ❌ Exceeds |
| **Pro ($20)** | ✅ Works | ✅ Works | ❌ Exceeds (1GB) |
| **Overages** | $0 | $0 | $0.50/GB overages |

### Advertisement Images
- ✅ Works for ad images
- ✅ Requires Vercel hosting integration

### OG/Twitter Images
- ✅ Built specifically for Next.js OG generation
- ✅ Excellent OG image support
- ✅ Can generate dynamic OG images

### Full-Resolution Bypass
- ⚠️ Possible but requires custom routing

### Vendor Lock-In
- 🔴 **VERY HIGH**: Deep Next.js/Vercel integration
  - Image Optimization is Vercel-specific
  - Requires Vercel hosting to use fully
  - Cannot use with other hosting

### Implementation Complexity
- Medium: Requires:
  1. Migration to Vercel (if not already hosted there)
  2. Vercel Image Optimization API integration
  3. Custom proxy for Google Drive (if needed)
  4. Build-time configuration
  5. ISR setup for revalidation

### Security Risk
- ⚠️ **MODERATE**: Depends on GD access method
  - If GD made public: 🔴 Security issue
  - If proxied through Edge: 🟢 OK
  - Requires Vercel knowledge to secure properly

### Reliability
- ✅ **EXCELLENT**: Vercel infrastructure is proven
- ✅ Global edge network
- ✅ Used by major Next.js deployments

### Pros
- ✅ If already using Vercel: built-in optimization
- ✅ Excellent for OG images
- ✅ Next.js native support
- ✅ Minimal code required if using Vercel hosting
- ✅ Superb documentation for Next.js apps

### Cons
- ❌ **NOT SUITABLE** for current SangTX deployment
- ❌ Requires Vercel hosting (SangTX uses Supabase Edge Functions)
- ❌ Not compatible with current architecture
- ❌ High vendor lock-in to Vercel
- ❌ $20/month minimum even if using <1GB
- ❌ Overkill if already have image proxy working

---

## OPTION G: Supabase Storage + Custom Edge Function

### Source & Access Pattern
- **Direct GD fetch:** ✅ Edge Function can fetch directly
- **GD must be public:** ❌ Can use private with OAuth
- **GD remain private:** ✅ Yes, Edge Function handles auth
- **Auth preserved:** ✅ Tenant check in Edge Function
- **Exposes GD URL:** ❌ No (uses Supabase Storage URLs)

### Core Capabilities
- **Resize to 400px:** ⚠️ Only if WASM works (already proven NOT to work)
- **WebP/AVIF:** ❌ No viable WASM library
- **Cache derived:** ✅ Yes, via Supabase Storage
- **First request:** ❌ Would take 15-30s (WASM bottleneck)
- **Cached requests:** ✅ 100-200ms from Storage

### Thumbnail & Latency
- **Expected size:** N/A (not feasible)
- **Latency (cold):** 15-30 seconds (timeout risk)
- **Latency (warm):** 100-200ms from cache
- **Bandwidth:** N/A

### Pricing Model
- **Free tier:** 1GB Storage, 3GB egress/month
- **Pro:** $25/month (100GB Storage, 200GB egress)
- **Enterprise:** Custom

**Scale Cost Estimates:**
| Scale | 1K imgs | 10K imgs | 100K imgs |
|-------|---------|----------|-----------|
| **Storage needed** | 1GB | 10GB | 100GB |
| **Egress estimate** | 100GB | 1000GB | 10000GB |
| **Cost** | Free | $25-50 | $250+ |

### Advertisement Images
- ⚠️ Could work if pre-converted
- ❌ Real-time resizing not feasible

### OG/Twitter Images
- ⚠️ Only if pre-stored thumbnails
- ❌ Real-time generation not feasible

### Full-Resolution Bypass
- ✅ Direct from Storage or GD

### Vendor Lock-In
- 🟢 **LOW**: Supabase is open-source compatible
  - Could migrate to PostgreSQL + S3 relatively easily

### Implementation Complexity
- Low-Medium: Would require:
  1. Batch job to pre-generate all thumbnails
  2. Edge Function to retrieve from Storage
  3. Cache invalidation logic
  4. Monitoring for cache misses
  5. BUT: WASM resizing not feasible, so this doesn't work

### Security Risk
- 🟢 **GOOD**: Supabase Storage has fine-grained access control
  - Tenant isolation via RLS policies
  - Private bucket with signed URLs
  - No credentials exposed to browser

### Reliability
- ✅ **GOOD**: Supabase is reliable for storage
- ⚠️ Cold start issues if any computation needed

### Pros
- ✅ Within Supabase ecosystem (same platform)
- ✅ Tenant isolation via RLS
- ✅ No external vendor dependency
- ✅ Preserves Google Drive as source of truth
- ✅ Can implement sophisticated caching

### Cons
- 🔴 **NOT VIABLE**: WASM image resizing proven impossible
- ❌ Would require batch pre-generation (operational overhead)
- ❌ Cold start latency (15-30s if any processing needed)
- ❌ Doesn't solve the original problem (P0 still fails on first request)
- ❌ Higher operational complexity than CDN
- ❌ Egress charges at scale ($250+/month for 100K images)

---

## SUMMARY COMPARISON TABLE

| Criteria | Cloudinary | imgix | Bunny | Cloudflare | AWS Lambda | Vercel | Supabase |
|----------|-----------|-------|-------|-----------|-----------|--------|----------|
| **GD Direct Fetch** | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| **GD Private** | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ |
| **Auth Preserved** | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ |
| **Resize 400px** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **WebP/AVIF** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Cache Derived** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ |
| **First Req Speed** | 🟡 3-5s | 🟢 2-4s | 🟢 2-3s | 🟢 2-4s | 🔴 5-15s | 🟢 1-2s | 🔴 15-30s |
| **Cached Speed** | 🟢 50-150ms | 🟢 30-100ms | 🟢 20-80ms | 🟢 30-150ms | 🟢 30-100ms | 🟢 20-50ms | 🟡 100-200ms |
| **Thumb Size** | 80-120KB | 70-100KB | 60-90KB | 70-110KB | 50-80KB | 80-120KB | N/A |
| **Free Tier** | 25GB | 1GB | $0 usage | 100K imgs | None | 1GB | 1GB |
| **Cost at 10K** | $99-199 | $80 | $0.10 | $5.50 | $20-35 | $20 | $25-50 |
| **Cost at 100K** | $500+ | $800 | $1 | $10.50 | $180-350 | Exceeds | $250+ |
| **Vendor Lock-In** | 🔴 HIGH | 🟡 MED | 🟢 LOW | 🟡 MED | 🔴 HIGH | 🔴 VERY HIGH | 🟢 LOW |
| **Complexity** | Med | Low-Med | Low | Med | High | Med | Med (but broken) |
| **Ad Support** | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ⚠️ |
| **OG Support** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ |
| **Full-Res Bypass** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Viable for SangTX** | ✅ | ✅ | ✅ | ⚠️ | ❌ | ❌ | ❌ |

---

## VIABILITY ASSESSMENT

### ✅ VIABLE OPTIONS (3):
1. **Cloudinary** - Proven, feature-rich, but expensive at scale
2. **imgix** - Excellent balance of cost and features
3. **Bunny Optimize** - Cheapest, fastest cached, least lock-in

### ⚠️ PARTIALLY VIABLE (1):
4. **Cloudflare Images** - Only if already using Cloudflare heavily

### ❌ NOT RECOMMENDED (3):
5. **AWS Lambda + CloudFront** - Over-engineered, cold-start issues, vendor lock-in
6. **Vercel Image Optimization** - Requires Vercel hosting (incompatible with SangTX)
7. **Supabase Storage + Edge** - WASM proven impossible, batch-processing overhead

---

## KEY ARCHITECTURAL INSIGHTS

### Security Model for All Viable Options
```
Browser Request
    ↓
SangTX Edge Function
    ├─ Validate JWT
    ├─ Check tenant_id
    ├─ Verify authorization
    ├─ Generate CDN transformation URL
    └─ Return 302 redirect to CDN
    ↓
CDN Edge Server
    ├─ Fetch from origin (via SangTX proxy)
    ├─ Transform image (resize, format, compress)
    ├─ Cache derivative
    └─ Return to Browser
    ↓
Browser receives:
    - <300KB thumbnail
    - WebP or AVIF format
    - Cached on CDN globally
```

### Cache Invalidation Strategy
```
Google Drive Original Changes
    ↓
Supabase receives webhook (if implemented)
    ↓
Edge Function clears CDN cache
    ↓
Next request fetches fresh original
    ↓
CDN regenerates derivative
```

### Advertisement & OG Image Support
```
Advertisement Record
    └─ drive_file_id (from Google Drive)

Rendering:
    1. Check if thumbnail cached
    2. If miss: Request SangTX Edge Function
    3. Edge Function: Fetch from GD, redirect to CDN
    4. CDN: Transform, cache, return
    5. Browser: Display optimized thumbnail

Works identically to article images
```

---

## CONCLUSION

**Three viable options** remain after analysis:

1. **Cloudinary** - Best for feature-rich requirements, enterprise support
2. **imgix** - Best balance of cost, performance, simplicity  
3. **Bunny Optimize** - Best for cost-conscious, lean operations

**Next document** will recommend the single best choice for SangTX.
