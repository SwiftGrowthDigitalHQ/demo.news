#!/usr/bin/env node

/**
 * Fix Super Admin Role Assignment
 * 
 * This script:
 * 1. Finds the most recently logged-in user
 * 2. Assigns super_admin role to that user
 * 3. Verifies is_super_admin() returns TRUE
 * 
 * Usage: node fix-super-admin-role.mjs
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

// Create Supabase client with service role (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  console.log('🔍 Finding current/recent Super Admin user...\n');

  // Step 1: Get super_admin role ID
  const { data: superAdminRole, error: roleError } = await supabase
    .from('roles')
    .select('id, slug, name')
    .eq('slug', 'super_admin')
    .maybeSingle();

  if (roleError || !superAdminRole) {
    console.error('❌ super_admin role not found in roles table');
    console.error('Creating super_admin role...');
    
    const { data: newRole, error: createError } = await supabase
      .from('roles')
      .insert({ slug: 'super_admin', name: 'Super Administrator', is_system: true })
      .select()
      .single();
    
    if (createError || !newRole) {
      console.error('❌ Failed to create super_admin role:', createError);
      process.exit(1);
    }
    
    console.log('✅ Created super_admin role');
    superAdminRole.id = newRole.id;
  }

  console.log(`✅ Found super_admin role: ${superAdminRole.name} (${superAdminRole.id})\n`);

  // Step 2: Find the most recently logged-in user
  const { data: recentUser, error: userError } = await supabase
    .from('users')
    .select('id, auth_user_id, email, full_name, role_id, last_login_at, created_at')
    .is('deleted_at', null)
    .order('last_login_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (userError || !recentUser) {
    console.error('❌ No users found in database');
    process.exit(1);
  }

  console.log('📍 Most recently logged-in user:');
  console.log(`   Email: ${recentUser.email}`);
  console.log(`   Name: ${recentUser.full_name}`);
  console.log(`   Auth UID: ${recentUser.auth_user_id}`);
  console.log(`   Last Login: ${recentUser.last_login_at || 'Never'}`);
  console.log(`   Current Role ID: ${recentUser.role_id || 'NULL'}\n`);

  // Step 3: Check if user already has super_admin role
  if (recentUser.role_id === superAdminRole.id) {
    console.log('✅ User already has super_admin role\n');
  } else {
    console.log('🔧 Assigning super_admin role to this user...');
    
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        role_id: superAdminRole.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', recentUser.id);

    if (updateError) {
      console.error('❌ Failed to update user role:', updateError);
      process.exit(1);
    }

    console.log('✅ Super admin role assigned successfully\n');
  }

  // Step 4: Verify the assignment
  const { data: verifyUser, error: verifyError } = await supabase
    .from('users')
    .select('id, email, role_id, roles!inner(slug, name)')
    .eq('id', recentUser.id)
    .maybeSingle();

  if (verifyError || !verifyUser) {
    console.error('❌ Failed to verify user role:', verifyError);
    process.exit(1);
  }

  console.log('✅ VERIFICATION:');
  console.log(`   User: ${verifyUser.email}`);
  console.log(`   Role: ${verifyUser.roles.slug} (${verifyUser.roles.name})`);
  console.log(`   Role ID: ${verifyUser.role_id}\n`);

  // Step 5: Check all super admin users
  const { data: allSuperAdmins, error: allError } = await supabase
    .from('users')
    .select('email, full_name, last_login_at')
    .eq('role_id', superAdminRole.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (!allError && allSuperAdmins && allSuperAdmins.length > 0) {
    console.log('👥 All Super Admin users:');
    allSuperAdmins.forEach((admin, index) => {
      console.log(`   ${index + 1}. ${admin.email} (${admin.full_name})`);
    });
    console.log();
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ FIX COMPLETE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log();
  console.log('NEXT STEPS:');
  console.log('1. Make sure you are logged in as:', recentUser.email);
  console.log('2. Hard refresh the browser (Ctrl+Shift+R)');
  console.log('3. Go to: http://localhost:5173/super-admin/payments');
  console.log('4. Open browser DevTools → Console');
  console.log('5. Click Approve or Reject button');
  console.log('6. Watch console for: [approvePayment] Success');
  console.log();
}

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
