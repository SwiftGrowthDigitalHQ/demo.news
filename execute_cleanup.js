// Run this with: node execute_cleanup.js
// Or paste in browser console after updating URLs

const SUPABASE_URL = 'https://csuocfxbucohfvowfwtq.supabase.co';
const TENANT_ID = '66ffe950-0dad-4a4f-9ffe-1069a480b166';

// You need to get this from browser after authenticating
// const JWT_TOKEN = '...';

async function cleanup() {
  console.log('[CLEANUP] Starting...');
  
  try {
    // Get JWT from browser if running in browser
    let token;
    if (typeof supabase !== 'undefined') {
      const { data: { session } } = await supabase.auth.getSession();
      token = session.access_token;
    } else {
      console.error('Must run in browser or provide JWT_TOKEN');
      return;
    }
    
    // 1. Check current state
    console.log('[CHECK] Current connections...');
    const checkRes = await fetch(
      `${SUPABASE_URL}/rest/v1/tenant_google_drive_connections?tenant_id=eq.${TENANT_ID}&select=id,status,deleted_at`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzdW9jZnhidWNvaGZ2b3dmd3RxIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTUzNjU5MzcsImV4cCI6MTcyNzA0MjMzN30.z2R-HumLGFhxPqz-hfH0c-gMCQ64JJFJt5e4hd8eANk',
          'Content-Type': 'application/json'
        }
      }
    );
    
    const current = await checkRes.json();
    console.log('[CHECK] Current connections:', current);
    
    if (!Array.isArray(current) || current.length === 0) {
      console.log('[DELETE] No connections to delete');
      return;
    }
    
    // 2. Delete old connections
    console.log('[DELETE] Deleting', current.length, 'old connections...');
    const deleteRes = await fetch(
      `${SUPABASE_URL}/rest/v1/tenant_google_drive_connections?tenant_id=eq.${TENANT_ID}&deleted_at=is.null`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzdW9jZnhidWNvaGZ2b3dmd3RxIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTUzNjU5MzcsImV4cCI6MTcyNzA0MjMzN30.z2R-HumLGFhxPqz-hfH0c-gMCQ64JJFJt5e4hd8eANk',
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        }
      }
    );
    
    if (!deleteRes.ok) {
      const error = await deleteRes.text();
      console.error('[DELETE] Failed:', error);
      return;
    }
    
    const deleted = await deleteRes.json();
    console.log('[DELETE] Deleted:', deleted.length, 'connections');
    
    // 3. Verify deletion
    console.log('[VERIFY] Checking remaining connections...');
    const verifyRes = await fetch(
      `${SUPABASE_URL}/rest/v1/tenant_google_drive_connections?tenant_id=eq.${TENANT_ID}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzdW9jZnhidWNvaGZ2b3dmd3RxIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTUzNjU5MzcsImV4cCI6MTcyNzA0MjMzN30.z2R-HumLGFhxPqz-hfH0c-gMCQ64JJFJt5e4hd8eANk',
          'Content-Type': 'application/json'
        }
      }
    );
    
    const remaining = await verifyRes.json();
    console.log('[VERIFY] Remaining connections:', remaining.length);
    
    if (remaining.length === 0) {
      console.log('✅ CLEANUP SUCCESSFUL');
      console.log('Next steps:');
      console.log('1. Refresh page (F5)');
      console.log('2. Click "Connect Google Drive"');
      console.log('3. Complete Google OAuth');
      console.log('4. Upload test image');
    } else {
      console.error('❌ CLEANUP FAILED - Connections still exist');
    }
    
  } catch (err) {
    console.error('❌ ERROR:', err.message);
  }
}

// Execute
cleanup();
