#!/usr/bin/env node

/**
 * Fix Missing auth_user_id
 * 
 * This script fixes users who have NULL auth_user_id by matching their email
 * from auth.users to public.users
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Read .env file manually
const envContent = readFileSync('.env', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  line = line.trim();
  if (line && !line.startsWith('#')) {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  }
});

const SUPABASE_URL = envVars.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

// Create Supabase client with service role
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  console.log('🔍 Finding users with NULL auth_user_id...\n');

  // Step 1: Find all users with NULL auth_user_id
  const { data: usersWithoutAuth, error: usersError } = await supabase
    .from('users')
    .select('id, email, full_name, role_id')
    .is('auth_user_id', null)
    .is('deleted_at', null);

  if (usersError) {
    console.error('❌ Error fetching users:', usersError);
    process.exit(1);
  }

  if (!usersWithoutAuth || usersWithoutAuth.length === 0) {
    console.log('✅ All users have valid auth_user_id');
    return;
  }

  console.log(`Found ${usersWithoutAuth.length} users with NULL auth_user_id:\n`);

  for (const user of usersWithoutAuth) {
    console.log(`👤 User: ${user.email} (${user.full_name})`);
    
    // Step 2: Find matching auth user by email
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error(`   ❌ Error fetching auth users:`, authError);
      continue;
    }

    const matchingAuthUser = authUsers.users.find(au => au.email === user.email);
    
    if (!matchingAuthUser) {
      console.log(`   ⚠️  No matching auth.users record found for ${user.email}`);
      console.log(`   → User may have been created manually or auth record was deleted\n`);
      continue;
    }

    console.log(`   ✅ Found auth.users record: ${matchingAuthUser.id}`);
    
    // Step 3: Update public.users with correct auth_user_id
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        auth_user_id: matchingAuthUser.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error(`   ❌ Failed to update:`, updateError);
    } else {
      console.log(`   ✅ Updated auth_user_id successfully\n`);
    }
  }

  // Step 4: Verify all users now have auth_user_id
  const { data: stillMissing, error: verifyError } = await supabase
    .from('users')
    .select('email')
    .is('auth_user_id', null)
    .is('deleted_at', null);

  if (verifyError) {
    console.error('❌ Error verifying:', verifyError);
    process.exit(1);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (!stillMissing || stillMissing.length === 0) {
    console.log('✅ ALL USERS FIXED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } else {
    console.log(`⚠️  ${stillMissing.length} users still have NULL auth_user_id:`);
    stillMissing.forEach(u => console.log(`   - ${u.email}`));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }
}

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
