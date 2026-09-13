#!/usr/bin/env node

/**
 * Test script to verify Categories DELETE operation against production database
 * This simulates the exact operation that deleteAdminCategory() performs
 */

const fetch = require('node-fetch');

const SUPABASE_URL = 'https://csuocfxbucohfvowfwtq.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzdW9jZnhidWNvaGZ2b3dmd3RxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0MTQyODEsImV4cCI6MjA5Njk5MDI4MX0.e1QaKI6MlcKDe7WkYaFOAZH2VPapKhg_ttlleY9Ip1A';

async function testDeleteOperation() {
  console.log('Testing Categories DELETE operation...\n');
  
  // Step 1: Get a category ID from the database
  console.log('Step 1: Fetching first category...');
  const selectRes = await fetch(`${SUPABASE_URL}/rest/v1/categories?limit=1&select=id,name,tenant_id,deleted_at`, {
    headers: {
      'Authorization': `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json',
      'apikey': ANON_KEY,
    }
  });
  
  const categories = await selectRes.json();
  
  if (selectRes.status !== 200) {
    console.error('❌ SELECT failed:', selectRes.status, categories);
    return;
  }
  
  if (!categories.length) {
    console.error('❌ No categories found');
    return;
  }
  
  const category = categories[0];
  console.log(`✓ Found category: ${category.name} (id: ${category.id}, tenant_id: ${category.tenant_id}, deleted_at: ${category.deleted_at})\n`);
  
  // Step 2: Try to UPDATE the category with deleted_at (soft delete)
  console.log('Step 2: Attempting PATCH /rest/v1/categories (soft delete)...');
  const now = new Date().toISOString();
  
  const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/categories?id=eq.${category.id}&tenant_id=eq.${category.tenant_id}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json',
      'apikey': ANON_KEY,
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({ deleted_at: now })
  });
  
  const patchData = await patchRes.json();
  
  console.log(`HTTP Status: ${patchRes.status}`);
  console.log('Response:', JSON.stringify(patchData, null, 2));
  
  if (patchRes.status === 200 || patchRes.status === 201) {
    console.log('\n✅ DELETE (soft delete UPDATE) SUCCEEDED');
    console.log(`   Updated rows: ${Array.isArray(patchData) ? patchData.length : 'N/A'}`);
  } else {
    console.log('\n❌ DELETE (soft delete UPDATE) FAILED');
    console.log(`   Status: ${patchRes.status}`);
    console.log(`   Error: ${patchData.message || JSON.stringify(patchData)}`);
    
    // Parse error details
    if (patchData.code === 'PGRST301') {
      console.log('\n   → This is an RLS policy rejection (403)');
      console.log('   → The RLS policy either:');
      console.log('      1. Doesn\'t exist');
      console.log('      2. Rejects the row (USING clause failed)');
      console.log('      3. Rejects the new state (WITH CHECK clause failed)');
    }
  }
}

testDeleteOperation().catch(err => {
  console.error('Script error:', err);
  process.exit(1);
});
