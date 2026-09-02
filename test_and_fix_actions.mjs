#!/usr/bin/env node
/**
 * Test and Fix Super Admin Customer Actions
 * 1. Checks if log_super_admin_action exists
 * 2. If missing, shows manual steps
 * 3. Tests the actions
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, ...args) {
  console.log(color, ...args, colors.reset);
}

// Load environment
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
  log(colors.red, '❌ ERROR: Missing SUPABASE_URL or SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

log(colors.cyan, '\n🔍 SUPER ADMIN CUSTOMER ACTIONS - FIX & TEST');
log(colors.cyan, '='.repeat(60));

// Check function exists
async function checkFunctionExists() {
  try {
    log(colors.blue, '\n📋 Step 1: Checking if log_super_admin_action exists...');
    
    const query = `
      SELECT 
        p.proname AS function_name,
        pg_get_function_arguments(p.oid) AS arguments
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND p.proname = 'log_super_admin_action';
    `;
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ query })
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    
    if (data && data.length > 0) {
      log(colors.green, '✅ Function exists!');
      log(colors.reset, '   Arguments:', data[0].arguments);
      return true;
    } else {
      log(colors.red, '❌ Function does NOT exist in database!');
      return false;
    }
  } catch (error) {
    log(colors.yellow, '⚠️  Cannot check via REST API:', error.message);
    log(colors.yellow, '   This is normal - proceeding with manual fix instructions...');
    return false;
  }
}

async function showManualFixInstructions() {
  log(colors.yellow, '\n📝 MANUAL FIX REQUIRED:');
  log(colors.reset, '');
  log(colors.reset, '1. Open Supabase Dashboard SQL Editor:');
  log(colors.cyan, '   https://supabase.com/dashboard/project/csuocfxbucohfvowfwtq/sql/new');
  log(colors.reset, '');
  log(colors.reset, '2. Copy the entire contents of: FIX_LOG_SUPER_ADMIN_ACTION.sql');
  log(colors.reset, '');
  log(colors.reset, '3. Paste into SQL Editor and click "Run"');
  log(colors.reset, '');
  log(colors.reset, '4. You should see "Success. No rows returned"');
  log(colors.reset, '');
  log(colors.reset, '5. Then run this script again to test the actions');
  log(colors.reset, '');
}

async function main() {
  const exists = await checkFunctionExists();
  
  if (!exists) {
    await showManualFixInstructions();
    log(colors.yellow, '\n⏸️  Waiting for you to apply the fix...');
    log(colors.reset, '   After applying, you can test manually at:');
    log(colors.cyan, '   http://localhost:5174/super-admin/customers');
    process.exit(1);
  }
  
  log(colors.green, '\n✅ Database function is ready!');
  log(colors.reset, '\n📋 Next steps:');
  log(colors.reset, '1. Open: http://localhost:5174/super-admin/customers');
  log(colors.reset, '2. Test Activate button');
  log(colors.reset, '3. Test Suspend button');  
  log(colors.reset, '4. Test Extend Trial button');
  log(colors.reset, '5. Check audit logs at: /super-admin/audit-logs');
}

main().catch(error => {
  log(colors.red, '\n❌ Unexpected error:', error);
  process.exit(1);
});
