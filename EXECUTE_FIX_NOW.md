# EXECUTE FIX NOW - Copy & Paste in Browser Console

## Step 1: Open Browser DevTools

1. Go to: http://localhost:5173/admin/media
2. Press **F12** (or Ctrl+Shift+I on Windows, Cmd+Option+I on Mac)
3. Click **"Console"** tab
4. You should see the logs with "Failed to decrypt token"

---

## Step 2: Paste This Command

Copy the entire command below and paste into browser console, then press Enter:

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
    console.log('Deleted connections:', result.deleted);
    console.log('Remaining connections:', result.remaining);
    console.log('Message:', result.message);
  } catch (err) {
    console.error('❌ ERROR:', err.message);
  }
})();
```

---

## Step 3: Watch for Result

After pasting and pressing Enter, you should see:

```
✅ SUCCESS!
Deleted connections: 1
Remaining connections: 0
Message: All old Google Drive connections removed. Users must reconnect.
```

✅ If you see this → **PROCEED TO STEP 4**

---

## Step 4: Refresh Page

1. Press **F5** to refresh the page
2. Wait for page to load
3. Look at the error section - should now show **"Connect Google Drive" button** instead of error
4. Console should show NO "Failed to decrypt token" errors

---

## Step 5: Connect Google Drive Again

1. Click **blue "Connect Google Drive" button**
2. Google consent screen appears
3. Read the permissions and click **"Allow"** (blue button)
4. Wait for redirect back to Media Library

**Expected:** Toast message: **"Google Drive connected successfully!"**

---

## Step 6: Test Upload

1. Click **"Browse Files"**
2. Select any JPG or PNG image from your computer
3. Wait for upload to complete

**Expected Results:**
- ✅ Toast: "Media uploaded."
- ✅ Image appears in grid below
- ✅ Console shows NO errors
- ✅ Network tab shows upload returned HTTP 200 (not 500)

---

## If Something Goes Wrong

### Command Returns Error
- Check console for error message
- Make sure you're authenticated (check browser Storage)
- Verify page is loaded properly

### Upload Still Fails After Reconnect
1. Open DevTools Console
2. Try uploading again
3. Look for error message
4. Screenshot the error and send

### Can't See Connect Button After Refresh
- Hard refresh page: **Ctrl+Shift+R** (or Cmd+Shift+R on Mac)
- Clear browser cache if still not working

---

## Verify in Google Drive (Optional)

After successful upload:
1. Open https://drive.google.com in new tab
2. Navigate to: **SwiftGrowthDigital** > **fake-news** > **News Portal** > **Images**
3. You should see newly uploaded image with filename like: `1725615932_abc123.jpg`

---

**Ready to execute? Paste the command above in browser console now.**
