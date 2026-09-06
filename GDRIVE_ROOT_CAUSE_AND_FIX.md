# Google Drive Upload Issue - ROOT CAUSE & IMMEDIATE FIX

## ROOT CAUSE

**Problem:** `[GDrive Thumbnail] Failed: 500 Failed to decrypt token`

**Why:** Old Google Drive connection records in database have tokens encrypted with **incompatible method**.

### Encryption Mismatch

**Old tokens (in database now):**
```
Encrypted with: padEnd(32, '0').substring(0, 32) + AES-256-GCM
Result: String-based key concatenation
```

**New functions (deployed):**
```
Decrypt with: atob(GDRIVE_ENCRYPTION_KEY) + AES-256-GCM
Result: Binary-based key decoding
```

**Same key string, completely different binary keys → Auth tag mismatch → 500 error**

### Database State

```
tenant_google_drive_connections table:
├── OLD connection record (active, deleted_at = NULL)
│   ├── access_token_encrypted = [old format]
│   ├── refresh_token_encrypted = [old format]
│   └── NEW functions try atob() decryption → FAIL (500)
│
└── Edge Function uploads fail → "Failed to decrypt tokens"
```

---

## IMMEDIATE FIX (2 Minutes)

### Step 1: Delete Old Tokens

**Copy this command and paste in browser console** (F12) at `http://localhost:5173/admin/media`:

```javascript
// Delete old incompatible tokens - run this in browser console
fetch('https://csuocfxbucohfvowfwtq.supabase.co/functions/v1/force-disconnect-old-gdrive', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session.access_token}`,
    'Content-Type': 'application/json',
    'x-force-disconnect-secret': 'admin-cleanup-gdrive-v1'
  },
  body: JSON.stringify({ secret: 'admin-cleanup-gdrive-v1' })
}).then(r => r.json()).then(d => console.log('DONE:', d));
```

**Expected:** `{"success": true, "deleted": 1, "remaining": 0}`

---

### Step 2: Refresh Page

Press F5 to reload `/admin/media`

Should now show: **"Connect Google Drive" button** (not error)

---

### Step 3: Reconnect Google Drive

1. Click **"Connect Google Drive"**
2. Google consent screen appears
3. Click **"Allow"**
4. Redirected back to Media Library
5. Toast: **"Google Drive connected successfully!"**

New connection created with **CORRECT token encryption** ✅

---

### Step 4: Test Upload

1. Click **"Browse Files"**
2. Select any JPG/PNG
3. Upload

**Expected:** 
- Upload succeeds
- Image appears in Media Library
- **NO "500 Failed to decrypt token" errors**

---

## Technical Details

### Edge Functions Involved

| Function | Status | Decryption |
|----------|--------|-----------|
| google-drive-oauth-callback | ✅ Correct | Uses `atob()` + AES-256-GCM |
| google-drive-upload | ✅ Correct | Uses `atob()` + AES-256-GCM |
| google-drive-thumbnail | ✅ Correct | Uses `atob()` + AES-256-GCM |

All three use **correct** `atob()` method.

### Encryption Key

- **Status:** ✅ SET in Supabase secrets
- **Name:** `GDRIVE_ENCRYPTION_KEY`
- **Format:** Base64-encoded 32-byte AES key
- **Used by:** All Edge Functions via `Deno.env.get()`

### Database

**tenant_google_drive_connections:**
- Holds OAuth tokens (encrypted at rest)
- Query for active: `WHERE deleted_at IS NULL AND status = 'active'`
- Old tokens **CANNOT** be decrypted with new method

---

## What Happens After Fix

### Sequence

1. ✅ Old connections deleted
2. ✅ User clicks "Connect Google Drive"
3. ✅ OAuth callback receives new tokens from Google
4. ✅ Callback encrypts with: `atob(GDRIVE_ENCRYPTION_KEY) + AES-256-GCM`
5. ✅ Tokens stored in database with NEW format
6. ✅ Upload function decrypts successfully
7. ✅ Image uploaded to Google Drive
8. ✅ Media record created
9. ✅ Thumbnail function can decrypt tokens
10. ✅ Thumbnails load in Media Library
11. ✅ Public images served via media-proxy

---

## Verify Fix Works

After Step 4, check:

- [ ] Browser console has **ZERO** "Failed to decrypt token" errors
- [ ] HTTP status for upload is **200** (not 500)
- [ ] Image appears in Media Library
- [ ] Image exists in Google Drive (manual check at drive.google.com)
- [ ] Thumbnails load without errors

---

## If Fix Doesn't Work

### Delete Fails (403/401)

- Make sure you're authenticated (check auth status in Supabase)
- Try running cleanup function with correct secret

### Upload Still Fails

1. Check Edge Function logs:
   ```
   supabase functions list --project-ref csuocfxbucohfvowfwtq
   ```
2. Open function details in Supabase dashboard
3. Look for error messages in logs

### Thumbnails Still 500

1. New connection was not created during OAuth
2. Try reconnecting: Disconnect Drive, then "Connect Google Drive" again

---

## Summary

| Issue | Cause | Fix |
|-------|-------|-----|
| 500 "Failed to decrypt token" | Old tokens in DB with incompatible encryption | Delete old connections |
| Upload blocked | Thumbnail function can't decrypt | New tokens will work |
| Connection shows error | Old connection still active | Force delete via cleanup function |
| Users can't upload | Need fresh OAuth to get new tokens | Reconnect after cleanup |

**Time to fix:** 2-3 minutes

---

## Deployment Status

- ✅ google-drive-oauth-callback deployed (v20)
- ✅ google-drive-upload deployed (v12)
- ✅ google-drive-thumbnail deployed (v14)
- ✅ GDRIVE_ENCRYPTION_KEY set in secrets
- ✅ Cleanup function deployed
- ⏳ Awaiting: Old token deletion + user reconnection

---

**Execute the fix now. Browser console command is ready to paste.**
