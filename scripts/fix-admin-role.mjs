/**
 * Fix Admin Role Assignment
 * 
 * This script assigns the super_admin role to the primary admin user.
 * Run this after the initial schema migration if media upload or article
 * creation fails with permission errors.
 * 
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/fix-admin-role.mjs
 * 
 * Or with VITE env vars:
 *   VITE_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/fix-admin-role.mjs
 */

import { createClient } from '@supabase/supabase-js';

function env(...keys) {
  for (const key of keys) {
    const value = process.env[key];
    if (value) return value;
  }
  return '';
}

const url = env('SUPABASE_URL', 'VITE_SUPABASE_URL');
const serviceRoleKey = env('SUPABASE_SERVICE_ROLE_KEY');

if (!url || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  console.error('Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/fix-admin-role.mjs');
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Step 1: Get the super_admin role ID
const { data: role, error: roleError } = await supabase
  .from('roles')
  .select('id, slug')
  .eq('slug', 'super_admin')
  .single();

if (roleError || !role) {
  console.error('Failed to find super_admin role:', roleError?.message ?? 'Not found');
  process.exit(1);
}

console.log(`Found super_admin role: ${role.id}`);

// Step 2: Find the admin user by email or auth_user_id
const adminEmail = 'hello@swiftgrowthdigital.com';
const adminAuthId = '94be6aea-b4ec-4e65-9304-fef744bb429c';

const { data: user, error: userError } = await supabase
  .from('users')
  .select('id, email, role_id, auth_user_id')
  .or(`email.eq.${adminEmail},auth_user_id.eq.${adminAuthId}`)
  .maybeSingle();

if (userError) {
  console.error('Failed to query users:', userError.message);
  process.exit(1);
}

if (!user) {
  console.log('Admin user not found in users table. Creating...');
  const { data: created, error: createError } = await supabase
    .from('users')
    .insert({
      auth_user_id: adminAuthId,
      full_name: 'Admin',
      email: adminEmail,
      role_id: role.id,
      status: 'active',
    })
    .select('id')
    .single();

  if (createError) {
    console.error('Failed to create admin user:', createError.message);
    process.exit(1);
  }
  console.log(`Created admin user with super_admin role: ${created.id}`);
} else if (user.role_id === role.id) {
  console.log(`Admin user already has super_admin role. No changes needed.`);
} else {
  const { error: updateError } = await supabase
    .from('users')
    .update({ role_id: role.id, auth_user_id: adminAuthId })
    .eq('id', user.id);

  if (updateError) {
    console.error('Failed to update admin user role:', updateError.message);
    process.exit(1);
  }
  console.log(`Updated admin user (${user.email}) to super_admin role.`);
}

// Step 3: Verify storage bucket exists
const { data: buckets } = await supabase.storage.listBuckets();
const mediaBucket = (buckets ?? []).find(b => b.id === 'media');

if (mediaBucket) {
  console.log(`Storage bucket 'media' exists (public: ${mediaBucket.public})`);
  if (!mediaBucket.public) {
    const { error: bucketError } = await supabase.storage.updateBucket('media', { public: true });
    if (bucketError) {
      console.error('Failed to make media bucket public:', bucketError.message);
    } else {
      console.log('Made media bucket public.');
    }
  }
} else {
  const { error: createBucketError } = await supabase.storage.createBucket('media', { public: true });
  if (createBucketError) {
    console.error('Failed to create media bucket:', createBucketError.message);
  } else {
    console.log('Created media storage bucket.');
  }
}

console.log('\n✓ Admin role fix complete. Media upload and article creation should now work.');
