# READY FOR TESTING

All systems deployed and ready. Follow these steps exactly:

## PRE-CHECK ✅
- google-drive-oauth-callback: ACTIVE (v20)
- google-drive-upload: ACTIVE (v11) 
- google-drive-thumbnail: ACTIVE (v14)
- force-disconnect-old-gdrive: ACTIVE (v4)
- GDRIVE_ENCRYPTION_KEY: SET
- GOOGLE_OAUTH_CLIENT_ID: SET
- GOOGLE_OAUTH_CLIENT_SECRET: SET

## EXECUTION

### 1. Open Browser Console
```
Go to: http://localhost:5173/admin/media
Press: F12
Tab: Console
```

### 2. Paste & Execute Cleanup Command
```javascript
(async () => {try {const session = (await supabase.auth.getSession()).data.session;if (!session) { console.error('Not authenticated'); return; }const response = await fetch('https://csuocfxbucohfvowfwtq.supabase.co/functions/v1/force-disconnect-old-gdrive', {method: 'POST', headers: {'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json', 'x-force-disconnect-secret': 'admin-cleanup-gdrive-v1'}, body: JSON.stringify({secret: 'admin-cleanup-gdrive-v1'})});const result = await response.json();if (!response.ok) {console.error('❌ Failed:', result);return;}console.log('✅ Cleanup successful!');console.log('Deleted:', result.deleted);console.log('Remaining:', result.remaining);} catch (err) {console.error('❌ Error:', err.message);}})();
```

**Expected:** Console shows `✅ Cleanup successful! Deleted: 1 Remaining: 0`

### 3. Refresh Page
```
Press: F5
Wait: Page loads
Check: "Connect Google Drive" button visible
```

### 4. Click "Connect Google Drive"
```
- Google consent screen appears
- Click "Allow"
- Redirected back
- Toast: "Google Drive connected successfully!"
```

### 5. Upload Test Image
```
- Click "Browse Files"
- Select JPG/PNG from computer
- Wait for upload
- Toast: "Media uploaded."
```

### 6. Verify
```
✅ Image visible in Media Library
✅ Console has NO errors
✅ Network tab shows upload HTTP 200
✅ Image exists in Google Drive (optional check)
```

## REPORT BACK WITH

1. **Cleanup Command Output:**
   - Did it show "Cleanup successful"?
   - What was "Deleted" count?
   - What was "Remaining" count?

2. **Upload Result:**
   - Did upload complete?
   - Any error messages?
   - Image visible in Media Library?

3. **Console Check:**
   - Any "Failed to decrypt token" errors?
   - Any "500" errors?
   - Any CORS errors?

4. **Network Check:**
   - What HTTP status for upload?
   - What HTTP status for thumbnails?

5. **Final Status:**
   - PASS (everything works)
   - FAIL (describe what didn't work)

---

**Ready to execute?**
