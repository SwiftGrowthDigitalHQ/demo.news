#!/usr/bin/env node

/**
 * Find all users with valid auth_user_id and assign super_admin to the right one
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

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  console.log('🔍 Finding users with valid auth_user_id...\n');

  // Get super_admin role ID
  const { data: superAdminRole } = await supabase
    .from('roles')
    .select('id')
    .eq('slug', 'super_admin')
    .single();

  if (!superAdminRole) {
    console.error('❌ super_admin role not found');
    process.exit(1);
  }

  // Find users with valid auth_user_id
  const { data: validUsers, error } = await supabase
    .from('users')
    .select('id, auth_user_id, email, full_name, role_id, last_login_at, created_at')
    .not('auth_user_id', 'is', null)
    .is('deleted_at', null)
    .order('last_login_at', { ascending: false, nullsFirst: false });

  if (error || !validUsers || validUsers.length === 0) {
    console.error('❌ No users with valid auth_user_id found');
    process.exit(1);
  }

  console.log(`Found ${validUsers.length} users with valid auth_user_id:\n`);

  validUsers.forEach((user, index) => {
    const isSuperAdmin = user.role_id === superAdminRole.id;
    const marker = isSuperAdmin ? '👑' : '  ';
    console.log(`${marker} ${index + 1}. ${user.email}`);
    console.log(`       Name: ${user.full_name}`);
    console.log(`       Auth UID: ${user.auth_user_id}`);
    console.log(`       Last Login: ${user.last_login_at || 'Never'}`);
    console.log(`       Has super_admin: ${isSuperAdmin ? 'YES ✅' : 'NO'}`);
    console.log();
  });

  // Find the most recently logged-in user with valid auth_user_id
  const targetUser = validUsers[0];

  if (!targetUser) {
    console.error('❌ No valid user to assign super_admin role');
    process.exit(1);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎯 TARGET USER (most recent login with valid auth):');
  console.log(`   Email: ${targetUser.email}`);
  console.log(`   Auth UID: ${targetUser.auth_user_id}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (targetUser.role_id === superAdminRole.id) {
    console.log('✅ This user already has super_admin role\n');
  } else {
    console.log('🔧 Assigning super_admin role...');
    
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        role_id: superAdminRole.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', targetUser.id);

    if (updateError) {
      console.error('❌ Failed to update:', updateError);
      process.exit(1);
    }

    console.log('✅ Super admin role assigned!\n');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ COMPLETE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log();
  console.log('NEXT STEPS:');
  console.log(`1. Login to the app as: ${targetUser.email}`);
  console.log('2. Hard refresh browser (Ctrl+Shift+R)');
  console.log('3. Go to: http://localhost:5173/super-admin/payments');
  console.log('4. Click Approve or Reject');
  console.log('5. It should work now! ✅');
  console.log();
}

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
