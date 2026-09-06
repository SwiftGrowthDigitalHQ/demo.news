# Google Drive Upload Issue - COMPLETE DIAGNOSIS & FIX

---

## ROOT CAUSE (Summary)

```
ERROR: [GDrive Thumbnail] Failed: 500 Failed to decrypt token

REASON: Old Google Drive connection records in database have tokens 
        encrypted with INCOMPATIBLE METHOD

OLD TOKENS:        Encrypted with padEnd() string method
NEW FUNCTIONS:     Try to decrypt with atob() binary method
RESULT:            Auth tag mismatch → 500 error
```

---

## WHAT WENT WRONG

### Timeline

1. **Phase 1:** Early development
   - OAuth callback encrypted tokens using: `padEnd(32, '0').substring(0, 32)`
   - Tokens stored in database with this format
   - Images uploaded to Google Drive successfully

2. **Phase 2:** Code refactor
   - Functions updated to use: `atob(GDRIVE_ENCRYPTION_KEY)`
   - This creates COMPLETELY DIFFERENT binary key
   - Encryption logic updated in all functions

3. **Phase 3:** Current state
   - Functions deployed with NEW decryption logic
   - OLD tokens still in database (encrypted with old method)
   - New functions try to decrypt old tokens
   - Decryption fails: auth tag mismatch → HTTP 500
   - Upload blocked: thumbnail can't load → upload fails

---

## FILES INVOLVED

### Database
- **Table:** `tenant_google_drive_connections`
- **Problem columns:** `access_token_encrypted`, `refresh_token_encrypted`
- **Status:** Contains old incompatible tokens

### Edge Functions (All Deployed Correctly)
1. **google-drive-oauth-callback** ✅
   - Creates new connections
   - Encrypts tokens with: `atob(GDRIVE_ENCRYPTION_KEY)`
   - Correct method ✅

2. **google-drive-upload** ✅
   - Called when user uploads image
   - Tries to decrypt with: `atob(GDRIVE_ENCRYPTION_KEY)`
   - Fails with old tokens in DB ❌

3. **google-drive-thumbnail** ✅
   - Shows previews in Media Library
   - Tries to decrypt with: `atob(GDRIVE_ENCRYPTION_KEY)`
   - Fails with old tokens in DB ❌ → HTTP 500

### Environment
- **Key:** `GDRIVE_ENCRYPTION_KEY`
- **Status:** ✅ SET in Supabase secrets
- **Used by:** All three Edge Functions
- **Format:** Base64-encoded 32-byte AES key

---

## THE FIX (Step-by-Step)

### Phase 1: Delete Old Incompatible Tokens

**Where:** Browser console at http://localhost:5173/admin/media

**Command to paste:**
```javascript
(async () => {
  try {
    const session = (await supabase.auth.getSession()).data.session;
    if (!session) throw new Error('Not authenticated');
    
    const response = await fetch(
      'https://csuocfxbucohfvowfwtq.supabase.co/functions/v1/force-disconnect-old-gdrive',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'x-force-disconnect-secret': 'admin-cleanup-gdrive-v1'
        },
        body: JSON.stringify({ secret: 'admin-cleanup-gdrive-v1' })
      }
    );
    
    const result = await response.json();
    if (!response.ok) {
      console.error('❌ FAILED:', result);
      return;
    }
    
    console.log('✅ SUCCESS!');
    console.log('Deleted:', result.deleted);
    console.log('Remaining:', result.remaining);
  } catch (err) {
    console.error('❌ ERROR:', err.message);
  }
})();
```

**Expected Output:**
```
✅ SUCCESS!
Deleted: 1
Remaining: 0
```

**Database State After:**
```
tenant_google_drive_connections: EMPTY (0 rows)
media: UNCHANGED (Google Drive files still referenced)
```

---

### Phase 2: Refresh Page

**Action:** Press F5

**What Happens:**
- Old connection no longer exists
- MediaLibrary component tries to load connection status
- Gets: "Not connected"
- Shows: "Connect Google Drive" button

**Console Output:**
- Should see NO "Failed to decrypt token" errors
- Only new logs about auth and admin page

---

### Phase 3: Reconnect Google Drive (OAuth Flow)

**Action:** Click "Connect Google Drive" button

**Flow:**
1. Frontend generates CSRF state
2. Redirects to Google OAuth
3. User sees Google consent screen
4. User clicks "Allow"
5. Google redirects to: `/functions/v1/google-drive-oauth-callback?code=...&state=...`
6. OAuth callback function:
   - Validates CSRF state ✅
   - Exchanges code for tokens ✅
   - Receives NEW tokens from Google ✅
   - **Encrypts with:** `atob(GDRIVE_ENCRYPTION_KEY)` ✅ (NEW METHOD)
   - **Stores** in database ✅
   - Creates folder structure in Google Drive ✅
   - Redirects back to `/admin/media?gdrive_success=true` ✅

**Expected Result:**
- Toast: "Google Drive connected successfully!"
- New connection record created with CORRECT encryption ✅

**Database State After:**
```
tenant_google_drive_connections:
  ├── id: new-uuid
  ├── tenant_id: 66ffe950-0dad-4a4f-9ffe-1069a480b166
  ├── status: active
  ├── access_token_encrypted: [NEW FORMAT - encrypted with atob()]
  ├── refresh_token_encrypted: [NEW FORMAT - encrypted with atob()]
  ├── images_folder_id: <google-folder-id>
  └── created_at: now()
```

---

### Phase 4: Upload Test

**Action:** Upload test image

**Flow:**
1. User selects JPG/PNG from computer
2. MediaLibrary calls: `uploadToGoogleDrive(file)`
3. Frontend creates FormData and calls: `POST /functions/v1/google-drive-upload`
4. Edge Function:
   - Verifies JWT ✅
   - Gets connection from DB (NEW one) ✅
   - **Decrypts access token** with `atob()` ✅ (SUCCEEDS - matches encryption)
   - Uploads to Google Drive ✅
   - Creates media record ✅
   - Returns success ✅

**Expected Result:**
- Upload HTTP 200 ✅
- Toast: "Media uploaded."
- Image appears in grid
- NO 500 errors
- NO decrypt failures

**Database State After:**
```
media:
  ├── id: media-uuid
  ├── storage_provider: google_drive
  ├── drive_file_id: <google-file-id>
  ├── drive_web_url: https://drive.google.com/file/d/{id}/view
  └── mime_type: image/jpeg
```

---

### Phase 5: Verify

**Checks:**
1. ✅ Console: Zero "Failed to decrypt token" errors
2. ✅ Network: Upload returned 200
3. ✅ UI: Image visible in Media Library
4. ✅ Google Drive: File exists in SwiftGrowthDigital/fake-news/News Portal/Images/

---

## BEFORE vs AFTER

### BEFORE FIX
```
Browser Console:
[GDrive Thumbnail] Failed: 500 Failed to decrypt token (6 times)
[GDrive Thumbnail] Failed: 500 Failed to decrypt token (6 times)
...

Network Tab:
GET /functions/v1/google-drive-thumbnail?fileId=...
Status: 500 Failed to decrypt token

MediaLibrary:
❌ No thumbnails (all 500 errors)
❌ Upload blocked (can't show existing files)
```

### AFTER FIX
```
Browser Console:
[ADMIN] Using owned tenant: fake-news (66ffe950-0dad-4a4f-9ffe-1069a480b166)
(no errors)

Network Tab:
POST /functions/v1/google-drive-upload
Status: 200
Response: { media: { id, drive_file_id, ... } }

MediaLibrary:
✅ Thumbnails visible
✅ Upload works
✅ New image appears immediately
```

---

## TECHNICAL DETAILS

### Encryption Comparison

**OLD (Broken):**
```typescript
const key = GDRIVE_ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32)
// "/7ipUPHzriCkfxyu7fNfJVcdpIzB4WH5" (string)
// Treated as ASCII bytes: [0x2f, 0x37, 0x69, 0x70, ...]
// NOT valid AES-256 key material
```

**NEW (Correct):**
```typescript
const keyData = Uint8Array.from(atob(GDRIVE_ENCRYPTION_KEY), c => c.charCodeAt(0))
// "/7ipUPHzriCkfxyu7fNfJVcdpIzB4WH5KWWWPVPk5FU=" (base64)
// Decoded to binary: [0xaf, 0xf9, 0xa9, 0x50, ...]
// Valid 32-byte AES-256 key
```

**Result:**
- Different binary representations
- Different encryption output
- Can't decrypt old tokens with new key

### Deployment Status

| Component | Version | Status |
|-----------|---------|--------|
| google-drive-oauth-callback | v20 | ✅ Deployed 2026-09-05 19:45:49 |
| google-drive-upload | v12 | ✅ Deployed 2026-09-05 19:46:43 |
| google-drive-thumbnail | v14 | ✅ Deployed 2026-09-05 19:46:59 |
| GDRIVE_ENCRYPTION_KEY | - | ✅ Set in secrets |
| force-disconnect-old-gdrive | v1 | ✅ Deployed 2026-09-06 |

---

## FINAL CHECKLIST

Before declaring fix complete:

- [ ] Execute browser console command
- [ ] See success message: "Deleted: 1, Remaining: 0"
- [ ] Refresh page (F5)
- [ ] Click "Connect Google Drive"
- [ ] Complete Google OAuth
- [ ] See toast: "Google Drive connected successfully!"
- [ ] Upload test image
- [ ] See toast: "Media uploaded."
- [ ] Image visible in Media Library
- [ ] Image exists in Google Drive
- [ ] Console has ZERO decrypt errors
- [ ] Network shows upload HTTP 200

**All checked = FIX COMPLETE ✅**

---

## SUMMARY

| Item | Status |
|------|--------|
| Root cause identified | ✅ Token encryption format mismatch |
| Code reviewed | ✅ All functions use correct atob() |
| Deployment verified | ✅ All functions deployed |
| Environment key | ✅ GDRIVE_ENCRYPTION_KEY set |
| Cleanup function | ✅ force-disconnect-old-gdrive deployed |
| Old tokens | ⏳ Awaiting manual deletion via console command |
| New connection | ⏳ Will be created after OAuth reconnection |
| Upload test | ⏳ Awaiting execution |

---

**READY TO EXECUTE: Copy browser console command from PHASE 1 and paste now.**
