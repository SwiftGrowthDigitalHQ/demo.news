# End-to-End Google Drive Media Storage Testing - Browser Verification Plan

**Status**: Architecture verified. Root cause of previous errors identified and fixed. Ready for manual browser testing.

---

## Current State

### What Was Fixed
1. ✅ Set `GDRIVE_ENCRYPTION_KEY` in Supabase Edge Function secrets
2. ✅ Deployed three corrected Edge Functions (oauth-callback, upload, thumbnail)
3. ✅ Marked old incompatible connections as disconnected in database
4. ✅ Verified encryption/decryption consistency in all functions

### Current Browser Status
- ✅ `/admin/media` shows "Google Drive - Not connected"
- ✅ No "Failed to decrypt token" errors (changed to 503 "Not connected")
- ✅ User must reconnect to proceed

---

## Test Flow (Manual Browser Testing Required)

### A. DISCONNECTED STATE (Current)
**Expected:**
- Storage Provider shows "Google Drive" → "Not connected" ✓
- "Connect Google Drive" button visible ✓
- No existing images shown (old connection marked deleted) ✓

**Browser Network Check:**
- `/admin/media` returns 200 ✓
- thumbnail requests return 503 "Google Drive not connected" ✓
- No HTTP 500 errors ✓

---

### B. USER RECONNECTS GOOGLE DRIVE
**Action Required:** User manually clicks "Connect Google Drive" button

**Flow:**
1. Click "Connect Google Drive" button
2. Redirected to Google consent screen
3. User authorizes app
4. Google redirects back to `/admin/media?gdrive_success=true`
5. Function logs show token encryption + database upsert
6. New connection created in `tenant_google_drive_connections`

**Expected Database State After Reconnection:**
```sql
SELECT 
  id, 
  tenant_id, 
  status, 
  google_account_email,
  access_token_encrypted != '', -- Should NOT be empty
  refresh_token_encrypted != '',
  images_folder_id != '',
  deleted_at -- Should be NULL
FROM tenant_google_drive_connections
WHERE status = 'active' AND deleted_at IS NULL;

-- Expected: ONE row per tenant with all fields populated
```

**Browser Check After Reconnection:**
- [ ] Toast message: "Google Drive connected successfully!" appears
- [ ] Storage Provider still shows "Google Drive"
- [ ] Status changes from "Not connected" to "Connected"
- [ ] Email displayed: `freelancer725@gmail.com`
- [ ] Console has NO "Failed to decrypt token" errors
- [ ] Console has NO CORS errors
- [ ] Network tab: No 500 errors

---

### C. UPLOAD NEW TEST IMAGE
**Action Required:** User uploads JPG/PNG via Media Library

**File:** Use test image (any JPG or PNG, <100MB)

**What Should Happen:**
1. Click "Browse Files"
2. Select JPG/PNG
3. Upload initiated
4. Progress shown
5. Success: "Media uploaded"

**Expected Edge Function Flow:**
```
google-drive-upload Edge Function:
  1. Verify JWT + tenant membership ✓
  2. Get connection from database ✓
  3. Decrypt access token ← NEW TOKEN (not old incompatible one)
  4. Upload to Google Drive ✓
  5. Get file_id from Drive API response ✓
  6. Create media record with:
     - storage_provider = 'google_drive'
     - drive_file_id = {new file_id}
     - drive_web_url = {new URL}
     - mime_type = 'image/jpeg' or 'image/png'
  7. Return success
```

**Browser Check After Upload:**
- [ ] Media Library now shows image thumbnail
- [ ] Image appears in grid view
- [ ] Console has NO errors
- [ ] Network tab: `POST /functions/v1/google-drive-upload` returns 200

---

### D. VERIFY IMAGE IN GOOGLE DRIVE

**Manual Verification:**
1. Open `https://drive.google.com` in separate tab
2. Navigate to folder structure:
   - SwiftGrowthDigital/
   - {Tenant Name}/
   - News Portal/
   - Images/
3. New image should be visible with filename: `{timestamp}_{uuid}.{ext}`

**Expected:**
- [ ] File exists in Google Drive
- [ ] File is NOT publicly shared (permissions were attempted but non-critical)
- [ ] File is owned by `freelancer725@gmail.com` Google account
- [ ] File size matches uploaded file

---

### E. VERIFY DATABASE MEDIA RECORD

**Expected media table entry:**
```sql
SELECT 
  id,
  tenant_id,
  storage_provider,
  file_name,
  drive_file_id,
  drive_folder_id,
  drive_web_url,
  drive_thumbnail_link,
  mime_type,
  file_size,
  created_at
FROM media
WHERE storage_provider = 'google_drive'
  AND created_at > now() - interval '5 minutes'
ORDER BY created_at DESC
LIMIT 1;

-- Expected columns:
-- id: uuid
-- storage_provider: 'google_drive' (not 'supabase')
-- drive_file_id: populated (not null)
-- drive_folder_id: populated (images_folder_id)
-- drive_web_url: https://drive.google.com/file/d/{id}/view
-- drive_thumbnail_link: https://...thumbnaiul...
-- mime_type: 'image/jpeg' or 'image/png'
-- file_size: > 0
```

**Browser Verification:**
- [ ] Copy URL from Media Library (URL copy button)
- [ ] Check if it's Google Drive URL or media-proxy URL
- [ ] Paste into browser address bar
- [ ] Verify image loads or redirects correctly

---

### F. THUMBNAIL LOADS (Authenticated)

**What Happens:**
1. Admin views Media Library
2. For each image, component calls: `GET /api/google-drive-thumbnail?fileId={id}`
3. Includes JWT: `Authorization: Bearer {session_token}`
4. Edge Function:
   - Verifies JWT
   - Decrypts access token from database
   - Fetches image from Google Drive API
   - Returns blob

**Browser Check:**
- [ ] Thumbnails visible in Media Library grid ✓
- [ ] Thumbnail images display correctly (not broken)
- [ ] Network tab shows:
  - `GET /functions/v1/google-drive-thumbnail?fileId=...` 
  - Status: 200
  - Content-Type: image/jpeg or image/png
- [ ] Console has NO errors for thumbnails
- [ ] No "Failed to decrypt token" or "500" errors

---

### G. SELECT IMAGE FOR ARTICLE

**Action Required:** Create/edit article and insert media

**Flow:**
1. Go to `/admin/articles`
2. Create new article or edit existing
3. Click "Featured Image" or inline image insertion
4. Media picker opens → shows Google Drive images
5. Select uploaded image
6. Confirm selection

**Expected:**
- [ ] Image appears in article preview
- [ ] `featured_image` field contains drive_web_url or media-proxy URL
- [ ] Article saves successfully

**Expected Database:**
```sql
SELECT featured_image FROM articles WHERE id = {article_id};

-- Should be either:
-- https://drive.google.com/file/d/{drive_file_id}/view
-- OR /api/media-proxy/{drive_file_id}
```

---

### H. PUBLIC ARTICLE PAGE - IMAGE DISPLAY

**Action Required:** Publish article and view publicly

**What Should Happen:**
1. Article published (if not already)
2. Navigate to `/articles/{slug}` (not authenticated)
3. Article loads
4. Featured image displays

**Critical Path - Image Serving:**
```
Public page loads: <img src="/api/media-proxy/{drive_file_id}" />
  → Browser makes unauthenticated request
  → media-proxy Edge Function:
     - Looks up file_id in media table
     - Gets tenant from media record
     - Gets encrypted connection
     - Decrypts access token (server-side) ← GDRIVE_ENCRYPTION_KEY used here
     - Calls Google Drive API: /drive/v3/files/{fileId}?alt=media
     - Streams image back to browser
  → Browser displays image
```

**Browser Check:**
- [ ] Public article page loads
- [ ] Featured image displays correctly
- [ ] Network tab shows:
  - `GET /functions/v1/media-proxy/{file_id}`
  - Status: 200
  - Content-Type: image/jpeg or image/png
  - Size: actual image bytes (not placeholder)
- [ ] Console has NO errors
- [ ] No "CORS error" messages
- [ ] Public user sees image without needing Google Drive account

---

### I. LOGO & FAVICON PREVIEW

**Action Required:** Check Settings page

**Flow:**
1. Go to `/admin/settings`
2. Scroll to Logo/Favicon section
3. Check if logos display

**Expected:**
- [ ] Logo image preview visible (if set to Google Drive image)
- [ ] Favicon preview visible (if set to Google Drive image)
- [ ] Network tab shows media-proxy requests returning 200
- [ ] No broken image placeholders

**If Logos Missing:**
- [ ] Check settings table: logo_url field
- [ ] Verify it's media-proxy URL or correct Drive URL
- [ ] Check media-proxy function logs for decryption errors

---

### J. PUBLIC PAGES WITH LOGO/FAVICON

**Action Required:** Open public site pages

**Check:**
- [ ] Home page loads
- [ ] Logo visible in header
- [ ] Favicon visible in browser tab
- [ ] No broken image indicators

**Network Checks:**
- [ ] Logo requests return 200
- [ ] Favicon requests return 200
- [ ] No CORS errors

---

### K. CONSOLE & NETWORK AUDIT

**Open Browser DevTools → Console + Network Tabs**

**Expected Console Errors = 0 (for Google Drive operations):**
- [ ] No "Failed to decrypt token"
- [ ] No "500 Failed to decrypt"
- [ ] No "CORS error" from lh3.googleusercontent.com
- [ ] No "drive.google.com CORS blocked"
- [ ] No "undefined" token errors

**Expected Network Issues = 0:**
- [ ] No HTTP 500 responses for google-drive-* functions
- [ ] No CORS PreFlight failures
- [ ] No OpaqueResponseBlocking errors
- [ ] All image requests return 200 or 304 (cached)

**Allowed Warnings** (not errors):
- [ ] Chrome DevTools extension messages (safe to ignore)
- [ ] React development warnings (if dev build)
- [ ] Unrelated API errors (GA4, analytics, etc.)

---

## Test Failure Troubleshooting

### If Thumbnails Still Return 503 After Reconnection:
**Problem:** Old connection still marked disconnected in database
**Check:**
1. Run: `SELECT status, deleted_at FROM tenant_google_drive_connections WHERE tenant_id = current_tenant`
2. Should show: `status='active'`, `deleted_at=NULL`
3. If shows old record with `deleted_at != NULL`:
   - New connection was not created during OAuth callback
   - Check callback function logs for errors

### If Upload Fails:
**Problem:** Token decryption failing
**Checks:**
1. Edge Function logs for: "[Upload] GDRIVE_ENCRYPTION_KEY length: 44"
2. If shows 0 → key not set in Supabase secrets
3. If shows wrong length → wrong key value
4. Run: `supabase secrets list --project-ref csuocfxbucohfvowfwtq | grep GDRIVE`
5. Verify key is set and matches

### If Public Image Returns Placeholder:
**Problem:** media-proxy can't decrypt token or fetch from Drive
**Checks:**
1. Browser DevTools Network tab → media-proxy request
2. Check response headers for error clues
3. Edge Function logs for: "[Media Proxy] Token refresh failed"
4. Check: Is token actually in database with correct format?
5. Verify: Does tenant have active Drive connection?

### If Upload Returns 401 Unauthorized:
**Problem:** JWT validation failed
**Check:**
1. Is user authenticated? (check Supabase auth status)
2. Is user member of current tenant? (check tenant_memberships table)
3. Is session token valid? (check browser Storage → Supabase auth)

---

## Success Criteria - FINAL CHECKLIST

### ✓ Connection & OAuth
- [ ] User successfully reconnects Google Drive
- [ ] New connection record created in database
- [ ] No "Failed to decrypt token" errors

### ✓ Upload
- [ ] New image uploaded successfully
- [ ] File appears in Google Drive (manual check)
- [ ] Media record created with storage_provider='google_drive'
- [ ] FILE_ID saved in database
- [ ] HTTP 200 response from upload function

### ✓ Thumbnails (Authenticated)
- [ ] Admin sees thumbnails in Media Library
- [ ] Thumbnails load from google-drive-thumbnail function
- [ ] HTTP 200 responses in network tab
- [ ] No decrypt errors in console

### ✓ Article Images (Public)
- [ ] Article with featured image loads publicly
- [ ] Image displays via media-proxy function
- [ ] Public user sees image (no broken placeholder)
- [ ] HTTP 200 from media-proxy
- [ ] Public user has NO access to Google Drive or OAuth tokens

### ✓ Logo & Favicon
- [ ] Logo displays on public pages
- [ ] Favicon displays in browser tab
- [ ] Served via media-proxy or direct URLs
- [ ] HTTP 200 responses

### ✓ Console & Network
- [ ] Zero "Failed to decrypt token" errors
- [ ] Zero HTTP 500 errors for Google Drive operations
- [ ] Zero CORS errors
- [ ] Zero "OpaqueResponseBlocking" errors
- [ ] Zero broken image placeholders

### ✓ Build
- [ ] `npm run typecheck` = PASS (or no blocking errors)
- [ ] `npm run build` = PASS (or no blocking errors)

### ✓ Architecture
- [ ] Image stored in Google Drive only (not Supabase) ✓
- [ ] Database record has correct storage_provider ✓
- [ ] Encrypted tokens never exposed to frontend ✓
- [ ] Private files served via server-side proxy ✓
- [ ] Multi-provider media table works correctly ✓
- [ ] No automatic fallback to Supabase ✓

---

## Final Report Format

After testing, provide:

```
FINAL RESULTS:

Root Cause: [Describe what was wrong]

Fix Applied: [Describe what was fixed]

Edge Functions Deployed:
- google-drive-oauth-callback: [✓/✗]
- google-drive-upload: [✓/✗]
- google-drive-thumbnail: [✓/✗]

FLOW TESTS:
Feature | Storage | Request | Status
--------|---------|---------|--------
Connect Google Drive | N/A | oauth-callback | [PASS/FAIL]
Upload image | Google Drive | POST upload | [PASS/FAIL]
DB media record | Google Drive | SELECT | [PASS/FAIL]
Thumbnail (admin) | Google Drive | GET thumbnail | [PASS/FAIL]
Article image (auth) | Google Drive | GET thumbnail | [PASS/FAIL]
Public image | Google Drive | GET media-proxy | [PASS/FAIL]
Logo display | Google Drive | GET media-proxy | [PASS/FAIL]
Favicon display | Google Drive | GET media-proxy | [PASS/FAIL]
Delete image | Google Drive | POST delete | [PASS/FAIL]

CONSOLE ERRORS: [number]
NETWORK ERRORS: [number]
BUILD: [PASS/FAIL]

ARCHITECTURE CORRECT: [YES/NO]
- Images stored in Google Drive only: [YES/NO]
- Tokens encrypted and never exposed: [YES/NO]
- Public images served via media-proxy: [YES/NO]
- No automatic Supabase fallback: [YES/NO]
- Multi-provider media table works: [YES/NO]

FINAL STATUS: [PASS/FAIL]
```

---

**Ready for manual browser testing. All fixes deployed. Awaiting user reconnection to Google Drive.**
