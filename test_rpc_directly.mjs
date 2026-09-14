#!/usr/bin/env node

/**
 * Test the get_tenant_reporters RPC function directly against production Supabase
 * This bypasses the frontend entirely to verify RPC behavior
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load from .env.local file
const envPath = path.join(__dirname, '.env.local');
let SUPABASE_URL, SUPABASE_KEY;

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  const lines = content.split('\n');
  lines.forEach(line => {
    if (line.startsWith('VITE_SUPABASE_URL=')) {
      SUPABASE_URL = line.split('=')[1];
    }
    if (line.startsWith('VITE_SUPABASE_PUBLISHABLE_KEY=')) {
      SUPABASE_KEY = line.split('=')[1];
    }
  });
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('ERROR: VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY not set in .env.local');
  process.exit(1);
}

console.log('='.repeat(80));
console.log('DIRECT RPC FUNCTION TEST');
console.log('='.repeat(80));
console.log(`Supabase URL: ${SUPABASE_URL}`);
console.log('');

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testRPC() {
  try {
    // Test 1: get_tenant_reporters for 'fake-news'
    console.log('TEST 1: get_tenant_reporters("fake-news")');
    console.log('-'.repeat(80));
    
    const { data: fakeNewsReporters, error: fakeNewsError } = await supabase
      .rpc('get_tenant_reporters', { p_tenant_slug: 'fake-news' });
    
    if (fakeNewsError) {
      console.error('ERROR:', fakeNewsError);
    } else {
      console.log(`Results: ${fakeNewsReporters.length} reporters`);
      fakeNewsReporters.forEach((r, i) => {
        console.log(`  ${i + 1}. ${r.full_name} (id: ${r.id}, tenant_id: ${r.tenant_id}, status: ${r.status})`);
      });
    }
    console.log('');

    // Test 2: get_tenant_reporters for 'fake-news2'
    console.log('TEST 2: get_tenant_reporters("fake-news2")');
    console.log('-'.repeat(80));
    
    const { data: fakeNews2Reporters, error: fakeNews2Error } = await supabase
      .rpc('get_tenant_reporters', { p_tenant_slug: 'fake-news2' });
    
    if (fakeNews2Error) {
      console.error('ERROR:', fakeNews2Error);
    } else {
      console.log(`Results: ${fakeNews2Reporters.length} reporters`);
      fakeNews2Reporters.forEach((r, i) => {
        console.log(`  ${i + 1}. ${r.full_name} (id: ${r.id}, tenant_id: ${r.tenant_id}, status: ${r.status})`);
      });
    }
    console.log('');

    // Test 3: Get tenant IDs
    console.log('TEST 3: Get tenant IDs for comparison');
    console.log('-'.repeat(80));
    
    const { data: tenants, error: tenantError } = await supabase
      .from('tenants')
      .select('id, slug, name')
      .in('slug', ['fake-news', 'fake-news2'])
      .is('deleted_at', null);
    
    if (tenantError) {
      console.error('ERROR:', tenantError);
    } else {
      console.log('Tenants:');
      tenants.forEach(t => {
        console.log(`  ${t.slug}: id=${t.id}, name=${t.name}`);
      });
    }
    console.log('');

    // Test 4: Get actual reporters table data
    console.log('TEST 4: Raw reporters table data (to find Sudhir and Anjana)');
    console.log('-'.repeat(80));
    
    const { data: allReporters, error: reportersError } = await supabase
      .from('reporters')
      .select('id, full_name, status, deleted_at, tenant_id')
      .eq('status', 'active')
      .is('deleted_at', null);
    
    if (reportersError) {
      console.error('ERROR:', reportersError);
    } else {
      console.log(`Total active reporters: ${allReporters.length}`);
      const sudhir = allReporters.find(r => r.full_name?.toLowerCase().includes('sudhir'));
      const anjana = allReporters.find(r => r.full_name?.toLowerCase().includes('anjana'));
      
      if (sudhir) {
        console.log(`Sudhir Chaudhary: tenant_id=${sudhir.tenant_id}`);
      } else {
        console.log('Sudhir Chaudhary: NOT FOUND');
      }
      
      if (anjana) {
        console.log(`Anjana Kashyap: tenant_id=${anjana.tenant_id}`);
      } else {
        console.log('Anjana Kashyap: NOT FOUND');
      }
    }
    console.log('');

    // Test 5: Cross-check
    console.log('TEST 5: CROSS-CHECK - Verify RPC filtering');
    console.log('-'.repeat(80));
    
    const fakeNewsId = tenants?.find(t => t.slug === 'fake-news')?.id;
    const fakeNews2Id = tenants?.find(t => t.slug === 'fake-news2')?.id;
    
    if (!fakeNewsId || !fakeNews2Id) {
      console.error('ERROR: Could not find tenant IDs');
    } else {
      const sudhir = allReporters.find(r => r.full_name?.toLowerCase().includes('sudhir'));
      const anjana = allReporters.find(r => r.full_name?.toLowerCase().includes('anjana'));
      
      console.log(`Fake News tenant_id: ${fakeNewsId}`);
      console.log(`Fake News 2 tenant_id: ${fakeNews2Id}`);
      console.log('');
      
      if (sudhir && anjana) {
        console.log(`Sudhir belongs to tenant: ${sudhir.tenant_id} ${sudhir.tenant_id === fakeNewsId ? '(Fake News ✓)' : '(NOT Fake News ✗)'}`);
        console.log(`Anjana belongs to tenant: ${anjana.tenant_id} ${anjana.tenant_id === fakeNewsId ? '(Fake News ✓)' : '(NOT Fake News ✗)'}`);
        console.log('');
        
        // Check if RPC incorrectly returned them
        const sudhirInFakeNews2 = (fakeNews2Reporters || []).find(r => r.full_name?.toLowerCase().includes('sudhir'));
        const anjanainFakeNews2 = (fakeNews2Reporters || []).find(r => r.full_name?.toLowerCase().includes('anjana'));
        
        if (sudhirInFakeNews2 || anjanainFakeNews2) {
          console.log('❌ CRITICAL BUG: RPC returned Fake News reporters for Fake News 2');
          if (sudhirInFakeNews2) console.log('   - Sudhir found in fake-news2 RPC result');
          if (anjanainFakeNews2) console.log('   - Anjana found in fake-news2 RPC result');
        } else {
          console.log('✅ RPC CORRECTLY FILTERED: Fake News reporters NOT in Fake News 2 result');
        }
      }
    }

  } catch (err) {
    console.error('EXCEPTION:', err);
  }
}

testRPC();
