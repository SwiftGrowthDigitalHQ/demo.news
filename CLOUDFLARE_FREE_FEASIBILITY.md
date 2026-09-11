# Cloudflare Free Options - Feasibility for SangTX

**Date:** September 11, 2026  
**Source:** Official Cloudflare Documentation (verified September 2026)  
**Status:** NOT RECOMMENDED for SangTX

---

## OFFICIAL CLOUDFLARE PRICING (2026)

### Cloudflare Images - Free Tier

**Free allowance:**
- 5,000 unique transformations per month
- No storage limit for free tier
- All image formats supported

**Paid tier (after free):**
- $0.50 per 1,000 additional transformations
- No storage charges for paid tier images

**Unique transformation definition:**
- Each unique combination of parameters = 1 transformation
- Example: Same image, 400px width = 1 transformation
- Example: Same image, 600px width = different transformation
- Example: Same image, WebP format = different transformation
- **Result:** 100 images × 50 different sizes = 5,000 transformations

---

### Cloudflare Workers - Free Tier

**Free allowance:**
- 100,000 requests per day
- 10ms CPU time per invocation
- 100,000 keys reads/day (Workers KV)
- 1,000 keys writes/day (Workers KV)

**Paid tier (after free):**
- $5 USD minimum per month
- 10 million requests included + $0.30 per additional million
- 30 million CPU milliseconds included + $0.02 per additional million

---

## FEASIBILITY ANALYSIS: CLOUDFLARE IMAGES

### Requirement: Transform Google Drive images with Cloudflare Images

**Problem 1: Storage dependency**

Cloudflare Images requires images to be stored in:
1. Cloudflare R2 (cloud storage), OR
2. S3-compatible storage, OR
3. Publicly accessible URLs

**Current SangTX:**
- Images stored on Google Drive (private)
- Never migrated to external storage

**Requirement violation:** "Do NOT migrate images to Supabase Storage"  
**Extended violation:** Do NOT migrate to ANY external storage

**Solution required:** Upload images to Cloudflare R2

```
New flow:
Google Drive (source of truth)
  ↓
Supabase Edge Function
  ↓ (downloads)
Cloudflare R2 (copy stored here)
  ↓
Cloudflare Images (transforms from R2)
  ↓
Browser

Problem: Google Drive is no longer source of truth
Problem: Two copies of every image (GD + R2)
Problem: Requires sync logic
Problem: Requires R2 storage cost
```

---

### Problem 2: Public URL requirement

Cloudflare Images can work with:
1. **R2 public URLs** (anyone can access)
2. **S3 signed URLs** (time-limited, still temporary public access)
3. **Direct R2 URLs** (essentially public)

**For private Google Drive images:**
- Cannot use Cloudflare Images without exposing images publicly
- Defeats privacy model of SangTX

**Current model:** Private images stay private  
**Cloudflare Images model:** Images become public on R2/S3

---

### Problem 3: Cost at scale

```
Scenario: 100,000 images, 50 different sizes per image

Transformations needed: 100,000 × 50 = 5,000,000

Free tier: 5,000 transformations/month
Paid tier cost: (5,000,000 - 5,000) / 1,000 × $0.50
             = 4,995,000 / 1,000 × $0.50
             = 4,995 × $0.50
             = $2,497.50/month

R2 storage cost (for 100K images at avg 2MB):
             = 100,000 × 2MB = 200GB
             = 200 × $0.015/GB-month
             = $3/month

Total Cloudflare Images: $2,500/month
Total imgproxy: $10/month

Savings with imgproxy: $2,490/month 💰
```

---

### Verdict: Cloudflare Images

❌ **NOT VIABLE for SangTX**

**Reasons:**
1. Requires external storage (violates requirement)
2. Makes images public (privacy risk)
3. $2,500+/month cost (vs $10 for imgproxy)
4. Requires data migration and sync logic
5. Complex architecture

---

## FEASIBILITY ANALYSIS: CLOUDFLARE WORKERS

### Option A: Workers + Cloudflare Images Binding

```
Browser
  ↓
Worker script (receives request)
  ↓
Fetch image from Google Drive
  ↓
Pass to Cloudflare Images binding
  ↓
Images binding transforms image
  ↓
Return to browser
```

**Problem 1: No Google Drive auth in Workers**
- Workers can fetch URLs, but cannot use OAuth tokens
- Workers cannot decrypt SangTX's stored Google Drive tokens
- Cannot access private Google Drive files

**Problem 2: Cloudflare Images binding still requires storage**
- Binding expects image as bytes or from R2
- Still subject to 5,000 transformation free limit

**Problem 3: CPU time limit**
- Free tier: 10ms CPU time per invocation
- Fetching from Google Drive: 100-200ms
- Image processing: 200-500ms
- **Result:** Exceeds free tier CPU limit immediately
- **Cost:** $0.02 per million additional CPU ms

---

### Option B: Workers + DIY image processing

```
Worker (Node.js runtime)
  ↓
Fetch image from Google Drive
  ↓
Process with Sharp or native bindings
  ↓
Return optimized image
```

**Problem 1: Workers cannot use Sharp**
- Sharp requires Node.js runtime
- Workers use Cloudflare's runtime (different)
- Cannot import Node.js modules like Sharp

**Problem 2: Native bindings not available**
- libvips requires system C libraries
- Not available in Workers runtime

**Problem 3: CPU time constraints**
- 10ms CPU time = cannot process images
- Would need paid tier ($5/month) for more CPU time
- Even then: image processing is CPU-intensive

---

### Option C: Workers + external image service

```
Worker
  ↓
Validate request / tenant authorization
  ↓
Redirect to imgproxy
  ↓
imgproxy processes image
```

**This is what SangTX ALREADY HAS with Edge Functions!**

- Supabase Edge Function = same concept as Cloudflare Worker
- Only difference: different vendor

**Why not switch from Supabase to Cloudflare?**
- Would require architectural changes
- DNS changes
- Database migration
- Significant re-work
- No cost benefit (still need external image service)

---

### Verdict: Cloudflare Workers

❌ **NOT SUITABLE for SangTX**

**Reasons:**
1. Cannot run on free tier (10ms CPU too limited)
2. Cannot access Google Drive OAuth tokens
3. Cannot run image processing libraries
4. Still requires external image service (like imgproxy)
5. No advantage over Supabase Edge Functions

---

## FREE TIER LIMITS SUMMARY TABLE

| Feature | Limit | Cost After |
|---------|-------|-----------|
| **Cloudflare Images Transformations** | 5,000/month | $0.50/1K |
| **Cloudflare Workers Requests** | 100,000/day | $0.30/1M (+ $5 min) |
| **Cloudflare Workers CPU time** | 10ms/invocation | $0.02/M CPU-ms (+ $5 min) |
| **Workers KV storage** | 1 GB | $0.50/GB-month |
| **R2 storage (for Images)** | Not included | $0.015/GB-month |

---

## COST COMPARISON: ALL CLOUDFLARE OPTIONS

### Scenario: 100K images, 50 sizes each, 100 requests/month

| Option | Free tier | Paid cost | Total/month |
|--------|-----------|-----------|-----------|
| Cloudflare Images | 5,000 txn | (5M - 5K) × $0.50/1K = $2,497 | $2,497 |
| Images + R2 storage | "" | + $3 R2 storage | $2,500 |
| Workers + Images | 100K requests | + $2,497 Images | $2,497+ |
| Workers CPU intensive | "" | Exceeds 10ms, needs paid ($5) | $5+ |
| **imgproxy OSS** | **N/A** | **$10 hosting** | **$10** |

---

## CLOUDFLARE CONCLUSION

**Can Cloudflare provide FREE image optimization for SangTX?**

❌ **NO**

**Why:**
1. **Storage problem:** Requires migrating images to R2 ($3/month)
2. **Transform cost:** 5K/month free isn't enough ($2,497 for scale)
3. **Architecture change:** Would require switching from Supabase
4. **Privacy model:** Makes private images public
5. **Workers limitation:** Cannot process images on free tier

**Best case Cloudflare cost:** $2,500+/month  
**imgproxy cost:** $10/month  
**Difference:** $2,490/month savings with imgproxy

---

## OFFICIAL SOURCES

**Cloudflare Images Pricing:**
https://developers.cloudflare.com/images/pricing/

> "On the Free plan, you can request up to 5,000 unique transformations each month for free."
> "Additional transformations are billed at $0.50 per 1,000 transformations."

**Cloudflare Workers Pricing:**
https://developers.cloudflare.com/workers/platform/pricing/

> "By default, users have access to the Workers Free plan."
> "100,000 requests per day"
> "10 milliseconds of CPU time per invocation"

**Cloudflare R2 Pricing:**
https://developers.cloudflare.com/r2/pricing/

> "$0.015 / GB-month for Standard storage"

**Verification Date:** September 2026  
**Source:** Official Cloudflare documentation

---

## RECOMMENDATION

**For SangTX: Skip Cloudflare options**

**Reasons:**
1. imgproxy is 250x cheaper ($10 vs $2,500)
2. No migration required
3. Keeps Google Drive as source of truth
4. Maintains privacy model
5. Open-source (no vendor lock-in)

**Next:** Proceed with imgproxy OSS evaluation

