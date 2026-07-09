/**
 * Runtime Authentication & Media Upload Audit Script
 * Tests actual Supabase auth flow, profile loading, role validation, and media upload.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const SUPABASE_URL = 'https://csuocfxbucohfvowfwtq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzdW9jZnhidWNvaGZ2b3dmd3RxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0MTQyODEsImV4cCI6MjA5Njk5MDI4MX0.e1QaKI6MlcKDe7WkYaFOAZH2VPapKhg_ttlleY9Ip1A';
const ADMIN_EMAIL = 'hello@swiftgrowthdigital.com';
const ADMIN_PASSWORD = 'Kumarsonu';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});

const results = [];

function log(section, status, detail) {
  const entry = { section, status, detail };
  results.push(entry);
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${icon} [${section}] ${detail}`);
}

async function testAuth() {
  console.log('\n========================================');
  console.log('  STEP 1: AUTHENTICATION FLOW TEST');
  console.log('========================================\n');

  // 1. Sign in with password
  console.log(`Attempting signInWithPassword with: ${ADMIN_EMAIL}`);
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  });

  if (signInError) {
    log('signInWithPassword', 'FAIL', `Error: ${signInError.message} (status: ${signInError.status})`);
    return null;
  }

  log('signInWithPassword', 'PASS', `Success. User ID: ${signInData.user.id}`);

  // 2. Check session
  if (signInData.session) {
    log('Session Creation', 'PASS', `Access token length: ${signInData.session.access_token.length}, expires_at: ${signInData.session.expires_at}`);
  } else {
    log('Session Creation', 'FAIL', 'No session returned from signInWithPassword');
    return null;
  }

  // 3. Load Profile (replicate loadProfile logic from auth.tsx)
  console.log('\nLoading profile from users table...');
  const { data: profileData, error: profileError } = await supabase
    .from('users')
    .select('id, full_name, email, status, role:roles(slug, name)')
    .eq('auth_user_id', signInData.user.id)
    .maybeSingle();

  if (profileError) {
    log('loadProfile()', 'FAIL', `Query error: ${profileError.message} (code: ${profileError.code})`);
    return signInData;
  }

  if (!profileData) {
    log('loadProfile()', 'FAIL', `No profile row found for auth_user_id=${signInData.user.id}. The 'users' table may not have a matching row.`);
    
    // Check if trigger created it
    console.log('\nChecking if user exists in auth.users but not in public.users...');
    const { data: allUsers, error: allUsersErr } = await supabase
      .from('users')
      .select('id, auth_user_id, email, role_id')
      .limit(10);
    
    if (allUsersErr) {
      log('users table query', 'FAIL', `Cannot query users table: ${allUsersErr.message}`);
    } else {
      log('users table query', 'INFO', `Found ${allUsers?.length ?? 0} users in public.users table`);
      if (allUsers && allUsers.length > 0) {
        console.log('  Users found:', JSON.stringify(allUsers, null, 2));
      }
    }
    return signInData;
  }

  log('loadProfile()', 'PASS', `Profile loaded: ${JSON.stringify(profileData)}`);

  // 4. Role validation
  const role = Array.isArray(profileData.role) ? profileData.role[0] : profileData.role;
  const roleSlug = role?.slug ?? null;
  const canAccessAdmin = Boolean(roleSlug && ['super_admin', 'admin', 'editor'].includes(roleSlug));

  if (canAccessAdmin) {
    log('Role Validation', 'PASS', `role_slug="${roleSlug}" is in allowed list. canAccessAdmin=true`);
  } else {
    log('Role Validation', 'FAIL', `role_slug="${roleSlug}" is NOT in allowed list ['super_admin', 'admin', 'editor']. canAccessAdmin=false. Dashboard will NOT open.`);
    log('Root Cause', 'FAIL', `User profile has role_slug="${roleSlug}". Either the user has no role_id set, or the role_id references a role whose slug is not in the allowed list.`);
  }

  // 5. Navigation check (simulated)
  if (canAccessAdmin) {
    log('Dashboard Navigation', 'PASS', 'After signIn success + canAccessAdmin=true, AuthPage calls navigate("/admin") which renders AdminPage');
  } else {
    log('Dashboard Navigation', 'FAIL', 'AppRouter condition: !auth.loading && !auth.canAccessAdmin → renders AuthPage instead of AdminPage. File: src/app/App.tsx, line ~35');
  }

  return signInData;
}

async function testMediaUpload(session) {
  console.log('\n========================================');
  console.log('  STEP 2: MEDIA UPLOAD FLOW TEST');
  console.log('========================================\n');

  if (!session) {
    log('Media Upload', 'FAIL', 'Cannot test upload - no valid session from auth step');
    return;
  }

  // Test bucket existence
  console.log('Testing bucket "media" existence...');
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
  
  if (bucketsError) {
    log('Bucket List', 'FAIL', `Cannot list buckets: ${bucketsError.message}`);
  } else {
    const mediaBucket = buckets?.find(b => b.id === 'media');
    if (mediaBucket) {
      log('Bucket "media"', 'PASS', `Bucket exists. public=${mediaBucket.public}, created_at=${mediaBucket.created_at}`);
    } else {
      log('Bucket "media"', 'FAIL', `Bucket "media" does NOT exist. Available buckets: ${buckets?.map(b => b.id).join(', ') || 'none'}`);
      return;
    }
  }

  // Test JPG upload
  console.log('\nTesting JPG upload...');
  const jpgContent = Buffer.from(
    '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEB' +
    'AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEB' +
    'AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIA' +
    'AhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEA' +
    'AAAAAAAAAAAAAAAAAAAB/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AKwA//9k=',
    'base64'
  );
  const jpgPath = `media/${crypto.randomUUID()}.jpg`;
  
  const { data: jpgUpload, error: jpgError } = await supabase.storage
    .from('media')
    .upload(jpgPath, jpgContent, { contentType: 'image/jpeg', upsert: false });

  if (jpgError) {
    log('JPG Upload (Storage)', 'FAIL', `${jpgError.message} (statusCode: ${jpgError.statusCode || 'N/A'})`);
    analyzeUploadError(jpgError, 'JPG');
  } else {
    log('JPG Upload (Storage)', 'PASS', `Uploaded to path: ${jpgUpload.path}`);
    
    // Test DB insert
    const { data: jpgRow, error: jpgDbErr } = await supabase.from('media').insert({
      file_name: 'test-audit.jpg',
      file_path: jpgUpload.path,
      storage_bucket: 'media',
      mime_type: 'image/jpeg',
      file_size: jpgContent.length,
      alt_text: 'Audit test image',
      caption: 'Test caption',
      is_featured: false,
    }).select('*').single();

    if (jpgDbErr) {
      log('JPG DB Insert', 'FAIL', `${jpgDbErr.message} (code: ${jpgDbErr.code})`);
    } else {
      log('JPG DB Insert', 'PASS', `Row created with id: ${jpgRow.id}`);
    }
  }

  // Test PNG upload
  console.log('\nTesting PNG upload...');
  // Minimal 1x1 PNG
  const pngContent = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );
  const pngPath = `media/${crypto.randomUUID()}.png`;
  
  const { data: pngUpload, error: pngError } = await supabase.storage
    .from('media')
    .upload(pngPath, pngContent, { contentType: 'image/png', upsert: false });

  if (pngError) {
    log('PNG Upload (Storage)', 'FAIL', `${pngError.message}`);
    analyzeUploadError(pngError, 'PNG');
  } else {
    log('PNG Upload (Storage)', 'PASS', `Uploaded to path: ${pngUpload.path}`);
    
    const { data: pngRow, error: pngDbErr } = await supabase.from('media').insert({
      file_name: 'test-audit.png',
      file_path: pngUpload.path,
      storage_bucket: 'media',
      mime_type: 'image/png',
      file_size: pngContent.length,
      alt_text: 'Audit PNG',
      caption: null,
      is_featured: false,
    }).select('*').single();

    if (pngDbErr) {
      log('PNG DB Insert', 'FAIL', `${pngDbErr.message} (code: ${pngDbErr.code})`);
    } else {
      log('PNG DB Insert', 'PASS', `Row created with id: ${pngRow.id}`);
    }
  }

  // Test PDF upload
  console.log('\nTesting PDF upload...');
  const pdfContent = Buffer.from(
    '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n' +
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n' +
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n' +
    'xref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n' +
    'trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n190\n%%EOF'
  );
  const pdfPath = `media/${crypto.randomUUID()}.pdf`;
  
  const { data: pdfUpload, error: pdfError } = await supabase.storage
    .from('media')
    .upload(pdfPath, pdfContent, { contentType: 'application/pdf', upsert: false });

  if (pdfError) {
    log('PDF Upload (Storage)', 'FAIL', `${pdfError.message}`);
    analyzeUploadError(pdfError, 'PDF');
  } else {
    log('PDF Upload (Storage)', 'PASS', `Uploaded to path: ${pdfUpload.path}`);

    const { data: pdfRow, error: pdfDbErr } = await supabase.from('media').insert({
      file_name: 'test-audit.pdf',
      file_path: pdfUpload.path,
      storage_bucket: 'media',
      mime_type: 'application/pdf',
      file_size: pdfContent.length,
      alt_text: null,
      caption: 'Test PDF document',
      is_featured: false,
    }).select('*').single();

    if (pdfDbErr) {
      log('PDF DB Insert', 'FAIL', `${pdfDbErr.message} (code: ${pdfDbErr.code})`);
    } else {
      log('PDF DB Insert', 'PASS', `Row created with id: ${pdfRow.id}`);
    }
  }

  // Test listing media
  console.log('\nTesting media listing...');
  const { data: mediaList, error: mediaListErr } = await supabase
    .from('media')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (mediaListErr) {
    log('Media List Query', 'FAIL', `${mediaListErr.message} (code: ${mediaListErr.code})`);
  } else {
    log('Media List Query', 'PASS', `Returned ${mediaList?.length ?? 0} items`);
  }
}

function analyzeUploadError(error, fileType) {
  const msg = error.message?.toLowerCase() || '';
  if (msg.includes('bucket') && msg.includes('not found')) {
    log(`${fileType} Upload Diagnosis`, 'FAIL', 'Root cause: Storage bucket "media" does not exist');
  } else if (msg.includes('policy') || msg.includes('permission') || msg.includes('unauthorized') || msg.includes('security')) {
    log(`${fileType} Upload Diagnosis`, 'FAIL', 'Root cause: Storage policy missing or RLS blocks upload. Need INSERT policy on storage.objects for bucket "media"');
  } else if (msg.includes('rls') || msg.includes('row level security')) {
    log(`${fileType} Upload Diagnosis`, 'FAIL', 'Root cause: RLS policy blocking storage upload');
  } else if (error.statusCode === 403 || error.statusCode === 401) {
    log(`${fileType} Upload Diagnosis`, 'FAIL', `Root cause: HTTP ${error.statusCode} - Missing storage policy for authenticated users on bucket "media"`);
  } else {
    log(`${fileType} Upload Diagnosis`, 'FAIL', `Root cause unknown: ${JSON.stringify(error)}`);
  }
}

async function testAdminModules() {
  console.log('\n========================================');
  console.log('  STEP 3: ADMIN MODULE DATA ACCESS TEST');
  console.log('========================================\n');

  const modules = [
    { name: 'Dashboard (overview)', query: async () => {
      const [articles, categories] = await Promise.all([
        supabase.from('articles').select('id', { count: 'exact', head: true }),
        supabase.from('categories').select('id', { count: 'exact', head: true }),
      ]);
      if (articles.error) throw articles.error;
      if (categories.error) throw categories.error;
      return { articles: articles.count, categories: categories.count };
    }},
    { name: 'News Management', query: async () => {
      const { data, error } = await supabase.from('articles').select('id, title, status').is('deleted_at', null).limit(5);
      if (error) throw error;
      return { count: data?.length ?? 0 };
    }},
    { name: 'Categories', query: async () => {
      const { data, error } = await supabase.from('categories').select('id, name, slug').is('deleted_at', null);
      if (error) throw error;
      return { count: data?.length ?? 0 };
    }},
    { name: 'Breaking News', query: async () => {
      const { data, error } = await supabase.from('breaking_news').select('id, headline, is_active').is('deleted_at', null);
      if (error) throw error;
      return { count: data?.length ?? 0 };
    }},
    { name: 'Media Library', query: async () => {
      const { data, error } = await supabase.from('media').select('id, file_name, mime_type').is('deleted_at', null).limit(5);
      if (error) throw error;
      return { count: data?.length ?? 0 };
    }},
    { name: 'Reporters', query: async () => {
      const { data, error } = await supabase.from('reporters').select('id, full_name, status').is('deleted_at', null);
      if (error) throw error;
      return { count: data?.length ?? 0 };
    }},
    { name: 'Users', query: async () => {
      const { data, error } = await supabase.from('users').select('id, email, role_id').is('deleted_at', null);
      if (error) throw error;
      return { count: data?.length ?? 0 };
    }},
    { name: 'Roles', query: async () => {
      const { data, error } = await supabase.from('roles').select('id, name, slug').is('deleted_at', null);
      if (error) throw error;
      return { count: data?.length ?? 0 };
    }},
    { name: 'Advertisements', query: async () => {
      const { data, error } = await supabase.from('advertisements').select('id, title, is_active').is('deleted_at', null);
      if (error) throw error;
      return { count: data?.length ?? 0 };
    }},
    { name: 'Subscriptions', query: async () => {
      const { data, error } = await supabase.from('subscriptions').select('id, email, status').is('deleted_at', null);
      if (error) throw error;
      return { count: data?.length ?? 0 };
    }},
    { name: 'SEO Settings', query: async () => {
      const { data, error } = await supabase.from('seo_settings').select('id, page_path').is('deleted_at', null);
      if (error) throw error;
      return { count: data?.length ?? 0 };
    }},
    { name: 'Notifications', query: async () => {
      const { data, error } = await supabase.from('notifications').select('id, title, status').is('deleted_at', null);
      if (error) throw error;
      return { count: data?.length ?? 0 };
    }},
    { name: 'Settings (site_settings)', query: async () => {
      const { data, error } = await supabase.from('site_settings').select('id, site_name').is('deleted_at', null);
      if (error) throw error;
      return { count: data?.length ?? 0 };
    }},
    { name: 'Security (audit_logs)', query: async () => {
      const { data, error } = await supabase.from('audit_logs').select('id, action').limit(5);
      if (error) throw error;
      return { count: data?.length ?? 0 };
    }},
    { name: 'Reports (analytics_events)', query: async () => {
      const { data, error } = await supabase.from('analytics_events').select('id, event_type').limit(5);
      if (error) throw error;
      return { count: data?.length ?? 0 };
    }},
  ];

  for (const mod of modules) {
    try {
      const result = await mod.query();
      log(mod.name, 'PASS', `Data accessible. Result: ${JSON.stringify(result)}`);
    } catch (err) {
      log(mod.name, 'FAIL', `Error: ${err.message} (code: ${err.code || 'N/A'})`);
    }
  }
}

async function main() {
  console.log('==============================================');
  console.log('  RUNTIME AUTHENTICATION & MEDIA UPLOAD AUDIT');
  console.log('  Date: ' + new Date().toISOString());
  console.log('==============================================');
  console.log(`\nTarget: ${SUPABASE_URL}`);
  console.log(`Admin: ${ADMIN_EMAIL}\n`);

  const authResult = await testAuth();
  await testMediaUpload(authResult?.session);
  await testAdminModules();

  // Summary
  console.log('\n========================================');
  console.log('  FINAL SUMMARY');
  console.log('========================================\n');
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const total = results.length;
  
  console.log(`Total checks: ${total}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log(`Score: ${Math.round((passed / total) * 100)}%`);
  
  // Write results to file
  const report = results.map(r => `[${r.status}] ${r.section}: ${r.detail}`).join('\n');
  writeFileSync('audit-results.txt', report, 'utf-8');
  console.log('\nResults written to audit-results.txt');
}

main().catch(err => {
  console.error('Audit script crashed:', err);
  process.exit(1);
});
