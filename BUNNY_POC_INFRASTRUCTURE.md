# Bunny POC - Infrastructure & Cost Report
**Status: PHASE 1 - INFRASTRUCTURE SPECIFICATION**  
**Date: September 11, 2026**

---

## BUNNY PRODUCTS REQUIRED FOR POC

### Product 1: Bunny CDN (Pull Zone)
**Purpose:** Cache and serve optimized images  
**Why required:** Foundation for all image delivery  
**Cost:** $0 setup + bandwidth only (during free trial)

**Pull Zone configuration:**
- 1 Pull Zone (minimum required)
- Origin: Google Drive API endpoint (via Edge Function signed URL)
- Location: Global (all regions enabled)

### Product 2: Bunny Optimizer
**Purpose:** Transform images (resize, WebP, AVIF)  
**Why required:** Test core optimization capability  
**Cost:** $9.50/month per Pull Zone

**Optimizer configuration:**
- Auto WebP generation: enabled
- Auto AVIF generation: enabled
- Resize API: enabled for dynamic transformations

---

## EXPECTED MONTHLY COSTS

### Free Trial (14 days)
```
Bunny Optimizer:     $0 (free trial)
CDN Bandwidth:       $0 (free trial)
Total during trial:  $0
```

### After Free Trial (Recurring)
```
Bunny Optimizer:     $9.50/month (per Pull Zone, minimum)
CDN Bandwidth:       $0.01/GB (EU/North America)

Example at 100K images:
  Bandwidth estimate: 152 GB ≈ $1.52
  Total monthly:      $9.50 + $1.52 = $11.02

Minimum monthly:     $9.50 (Optimizer only, $0 bandwidth possible)
```

### Cost Breakdown
| Component | Cost | Notes |
|-----------|------|-------|
| Pull Zone | $0 | Included with CDN |
| Optimizer | $9.50/month | Per Pull Zone |
| CDN Bandwidth | $0.01/GB | Only what we use |
| Free Trial | 14 days | Full functionality |

---

## INFRASTRUCTURE REQUIREMENTS

### What We Need to Create
1. **Bunny Account** (via free trial)
   - Estimated setup time: 5 minutes
   - No credit card required for trial

2. **1 Pull Zone**
   - Origin: Supabase Edge Function (signed URL endpoint)
   - Name: `sangtx-poc-images`
   - Regions: All (Global)
   - Estimated setup time: 5 minutes

3. **Optimizer Configuration**
   - Enable automatic WebP/AVIF
   - Enable Resize API
   - Estimated setup time: 2 minutes

4. **Test Edge Function** (in Supabase)
   - New function: `/functions/bunny-poc-origin`
   - Purpose: Serve Google Drive image with signed URL
   - Does NOT modify existing `/functions/google-drive-thumbnail`
   - Estimated creation time: 1 hour

### What We Will NOT Create
- ❌ Production Edge Function
- ❌ Database migrations
- ❌ Changes to existing image endpoints
- ❌ Changes to Supabase Storage
- ❌ Advertisement modifications
- ❌ OG/Twitter production changes

---

## TEST IMAGE

**Image ID:** `1UbkOxUcrMHvBqirrkvJBuAqQB_ZS4YtX`  
**Source:** SangTX Google Drive (private)  
**Size on disk:** 2,766,898 bytes (PNG)  
**Dimensions:** 1672×941 pixels  
**Format:** PNG

This is the same image used during P0 investigation and previous forensic audit.

---

## ORIGIN ARCHITECTURE

### How Bunny Will Access Google Drive

```
Request Flow:
[Browser]
   ↓
[Supabase Edge Function: /bunny-poc-origin]
   - Authenticate with Google Drive API
   - Decrypt stored OAuth token
   - Generate signed download URL
   - Return 302 redirect to Google Drive
   ↓
[Google Drive (private)]
   - Validate token
   - Stream image bytes to Bunny
   ↓
[Bunny CDN]
   - Cache original image
   - Apply transformations on demand
   - Return optimized image to browser
```

### Authentication Mechanism

**Question 1: Is authentication required?**  
YES - Google Drive files are private and require valid OAuth token

**Question 2: Does the origin URL expire?**  
YES - Google Drive signed URLs expire after ~1 hour

**Question 3: Will Bunny cache it?**  
YES - Bunny will cache the downloaded bytes after first fetch

**Question 4: Is the Google Drive URL exposed to browser?**  
NO - Browser receives Bunny CDN URL only (via 302 redirect)

---

## APPROVAL CHECKPOINT

### Before Creating Bunny Account

**User needs to confirm:**

1. ✅ Cost acceptable? (**$9.50/month minimum after trial**)
2. ✅ Free trial sufficient for testing? (14 days)
3. ✅ Small POC scope acceptable? (test image only, no production)
4. ✅ OK to create Bunny account today?

### If Approved

Proceed to:
1. Create Bunny account (free trial)
2. Create Pull Zone
3. Create test Edge Function
4. Execute 9 POC tests
5. Measure real performance
6. Generate final results

---

## TEST PLAN OVERVIEW

### Phase 1A: Infrastructure (30 min)
- [ ] Create Bunny account
- [ ] Create Pull Zone
- [ ] Configure Optimizer
- [ ] Document Pull Zone URL

### Phase 1B: Origin Testing (2 hours)
- [ ] Create test Edge Function
- [ ] Test authorized fetch from Google Drive
- [ ] Test URL signing and expiration
- [ ] Verify Bunny can cache original

### Phase 1C: Image Transformation (2 hours)
- [ ] Measure original image properties
- [ ] Request 400px WebP version
- [ ] Request 400px JPEG version
- [ ] Request 400px AVIF version
- [ ] Measure actual bytes and dimensions
- [ ] Measure cold/warm latency

### Phase 1D: Cache Testing (1.5 hours)
- [ ] Request 1: authorized, cold cache
- [ ] Request 2: authorized, cache HIT
- [ ] Request 3: unauthorized, after cache exists
- [ ] Request 4: modified fileId, after cache exists
- [ ] Record all response headers

### Phase 1E: Security Testing (1.5 hours)
- [ ] Test copied Bunny URL (direct access without JWT)
- [ ] Test invalid fileId
- [ ] Test inaccessible file
- [ ] Verify no credential leakage

### Phase 1F: Cost Verification (30 min)
- [ ] Record actual bandwidth used
- [ ] Calculate actual charges
- [ ] Verify against theoretical estimate

**Total POC Time: ~8 hours**

---

## NEXT STEP

**WAITING FOR USER APPROVAL:**

Can I proceed with:
1. Creating Bunny account (free trial)?
2. Creating 1 Pull Zone?
3. Creating test Edge Function?
4. Executing 9 real tests?

**Cost: $0 during trial (14 days)**  
**Risk: None - no production changes, fully reversible**

---

## SUCCESS CRITERIA

### PASS (Bunny POC Approved for Production)
- ✅ Authorized request succeeds
- ✅ Image transforms correctly
- ✅ Cache works
- ✅ Unauthorized access blocked
- ✅ No credential leakage
- ✅ Performance acceptable
- ✅ All actual measurements recorded

### FAIL (Bunny POC Rejected)
- ❌ Authorization mechanism broken
- ❌ Cannot fetch from Google Drive
- ❌ Cannot cache properly
- ❌ Security issue found
- ❌ Unacceptable performance

### BLOCKED
- Requirements not met
- Trial restrictions prevent testing
- Google Drive API limitations discovered

