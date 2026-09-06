# STEP-BY-STEP FIX FOR GOOGLE DRIVE UPLOAD

## Quick Summary
- **Problem:** Old Google Drive connection in database has incompatible token encryption
- **Solution:** Delete it, reconnect Google Drive, test upload
- **Time:** 5 minutes

---

## ACTION REQUIRED: Execute This SQL

### 1️⃣ Open Supabase Dashboard

**URL:** https://supabase.com/dashboard/project/csuocfxbucohfvowfwtq/sql

Or:
- Go to: supabase.com
- Sign in
- Select project: `csuocfxbucohfvowfwtq`
- Click "SQL Editor" (left sidebar)

---

### 2️⃣ Copy & Paste This SQL

```sql
DELETE FROM tenant_google_drive_connections WHERE deleted_at IS NULL;
```

**That's it. Just one line.**

---

### 3️⃣ Execute the SQL

- Paste the SQL above into the text editor
- Press `Ctrl+Enter` (or click Run button)
- You should see: **"1 row deleted"** or similar message

✓ **If you see "1 row deleted"** → SUCCESS, continue to Step 4

❌ **If you see "0 rows deleted"** → No old connection found, skip to Step 5

---

### 4️⃣ Verify Deletion

Paste this SQL to confirm:

```sql
SELECT COUNT(*) as connections FROM tenant_google_drive_connections;
```

Should return: **0**

---

### 5️⃣ Refresh Your Browser

Go back to Media Library tab:
- **URL:** http://localhost:5173/admin/media
- Press `F5` (refresh page)
- Wait for page to load

**Expected:** Should now show "Connect Google Drive" button instead of error

---

### 6️⃣ Click "Connect Google Drive"

In the Media Library page:
- You'll see red error message: "Failed to decrypt Google Drive tokens. Please reconnect Google Drive."
- Below it is a blue button: **"Connect Google Drive"**
- Click this button

**Expected:** Redirected to Google consent screen

---

### 7️⃣ Authorize Google Drive

Google screen will ask:
- "SangTX wants access to your Google Drive"
- Read the permissions
- Click **"Allow"** (blue button)

**Expected:** Redirected back to Media Library, should see toast: "Google Drive connected successfully!"

---

### 8️⃣ Verify Connection Status

In Media Library, look at top section:
- Should show: **"Connected - freelancer725@gmail.com"**
- Status: **Active** (green)
- Button changes from "Connect Google Drive" to "Disconnect Google Drive"

**If you see this → Connection successful ✓**

---

### 9️⃣ Test Upload

Now try uploading an image:
1. Click **"Browse Files"** button
2. Select any JPG or PNG image
3. Image uploads

**Expected:**
- Progress bar shows upload
- Success toast: **"Media uploaded."**
- Image appears in grid below
- Console has NO errors

**If you see this → UPLOAD WORKS ✓ FIX COMPLETE**

---

### 🔟 Verify in Google Drive (Optional but Recommended)

To confirm image really uploaded to Google Drive:

1. Open https://drive.google.com in new tab
2. Click on folder icon (left sidebar)
3. Navigate: **SwiftGrowthDigital** → **fake-news** → **News Portal** → **Images**
4. You should see uploaded image with filename like: `1725615932_abc123.jpg`

---

## Troubleshooting

### If Step 3 Shows "0 rows deleted"
- Old connection may have already been marked as deleted
- Skip to Step 5 and try clicking Connect button

### If Step 7 Shows Error
- Google OAuth might have failed
- Check browser console (F12) for error details
- Try clicking "Connect Google Drive" again

### If Step 9 Upload Still Fails
1. Open browser DevTools (F12)
2. Go to Console tab
3. Try uploading again
4. Look for error message
5. Take screenshot and share with me

### If Upload Works But Image Doesn't Show
- Check Network tab (F12) for failed requests
- Verify image appears in Google Drive (Step 10)
- May need to hard refresh page (Ctrl+Shift+R)

---

## Expected Console Output (After Fix)

**Before Upload:**
```
[ADMIN] Using owned tenant: fake-news (66ffe950-0dad-4a4f-9ffe-1069a480b166)
[GDrive Thumbnail] Failed: 503 Google Drive not connected
```

**After Reconnection:**
```
[ADMIN] Using owned tenant: fake-news (66ffe950-0dad-4a4f-9ffe-1069a480b166)
```

**After Upload:**
```
[ADMIN] Media uploaded successfully
Upload success: Media uploaded.
```

**NO ERROR LINES** = Fix successful ✓

---

## Final Verification Checklist

After completing all steps:

- [ ] SQL DELETE executed (1 row deleted)
- [ ] Page refreshed (shows Connect button, not error)
- [ ] Google Drive reconnected (connected status shows)
- [ ] Image uploaded successfully (toast appears)
- [ ] Image visible in Media Library grid
- [ ] Image exists in Google Drive (optional verification)
- [ ] Console has zero errors
- [ ] No "Failed to decrypt token" messages

**If ALL checked → FIX COMPLETE ✓**

---

## Next Steps After Fix

Once upload works:

1. Create article with featured image
2. Publish article
3. Visit public page → verify image displays
4. Check logo/favicon display on public pages
5. Run final console audit

---

**Status:** Awaiting your execution of the SQL DELETE command in Supabase dashboard.
