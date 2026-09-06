// Run this in browser console at: http://localhost:5173/admin/media
// This deletes all old incompatible Google Drive tokens

async function cleanupOldTokens() {
  try {
    console.log('[CLEANUP] Starting Google Drive token cleanup...');
    
    // Get session token from Supabase auth
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('[CLEANUP] Not authenticated');
      return;
    }
    
    console.log('[CLEANUP] Calling cleanup function...');
    
    const response = await fetch(
      'https://csuocfxbucohfvowfwtq.supabase.co/functions/v1/force-disconnect-old-gdrive',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'x-force-disconnect-secret': 'admin-cleanup-gdrive-v1'
        },
        body: JSON.stringify({ secret: 'admin-cleanup-gdrive-v1' })
      }
    );
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error('[CLEANUP] Error:', result);
      alert('Cleanup failed: ' + (result.error || 'Unknown error'));
      return;
    }
    
    console.log('[CLEANUP] SUCCESS:', result);
    console.log('[CLEANUP] Deleted connections:', result.deleted);
    console.log('[CLEANUP] Remaining connections:', result.remaining);
    console.log('[CLEANUP] NOW REFRESH PAGE AND CLICK "Connect Google Drive"');
    
    alert('✅ Old tokens deleted!\n\n' + 
          'Remaining connections: ' + result.remaining + '\n\n' +
          'Now:\n' +
          '1. Refresh the page (F5)\n' +
          '2. Click "Connect Google Drive"\n' +
          '3. Complete OAuth\n' +
          '4. Try uploading image');
          
  } catch (err) {
    console.error('[CLEANUP] Error:', err);
    alert('Error: ' + err.message);
  }
}

// Execute
cleanupOldTokens();
