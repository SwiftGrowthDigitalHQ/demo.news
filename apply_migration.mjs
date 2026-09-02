#!/usr/bin/env node
/**
 * Apply log_super_admin_action migration using Supabase Management API
 * This script reads the migration SQL and executes it against the remote database
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const envPath = join(__dirname, '.env');
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('ERROR: Missing SUPABASE_URL or SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

// Read the migration SQL
const migrationPath = join(__dirname, 'FIX_LOG_SUPER_ADMIN_ACTION.sql');
const migrationSQL = readFileSync(migrationPath, 'utf-8');

console.log('🔧 Applying log_super_admin_action migration...');
console.log(`📍 Database: ${SUPABASE_URL}`);
console.log('');

// Execute SQL using Supabase REST API
async function executeMigration() {
  try {
    // Use PostgREST rpc endpoint to execute raw SQL
    // Note: We need to use a different approach since PostgREST doesn't support raw SQL
    // Instead, we'll use the pg connection through a simple query
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ query: migrationSQL })
    });

    if (!response.ok) {
      // This endpoint might not exist, try alternative approach
      console.error('❌ Direct SQL execution not available through REST API');
      console.log('');
      console.log('ALTERNATIVE SOLUTION:');
      console.log('Please manually run the SQL in Supabase Dashboard:');
      console.log('1. Open: https://supabase.com/dashboard/project/csuocfxbucohfvowfwtq/sql/new');
      console.log('2. Copy contents of: FIX_LOG_SUPER_ADMIN_ACTION.sql');
      console.log('3. Paste and click "Run"');
      process.exit(1);
    }

    const data = await response.json();
    console.log('✅ Migration applied successfully!');
    console.log(data);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('');
    console.log('MANUAL STEPS REQUIRED:');
    console.log('1. Open Supabase Dashboard → SQL Editor');
    console.log('2. Copy contents of: FIX_LOG_SUPER_ADMIN_ACTION.sql');
    console.log('3. Paste and run the SQL');
    console.log('4. Re-run the tests');
    process.exit(1);
  }
}

executeMigration();
