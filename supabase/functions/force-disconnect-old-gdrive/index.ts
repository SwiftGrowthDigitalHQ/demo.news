/**
 * ADMIN ONLY - Force disconnect all old incompatible Google Drive connections
 * 
 * This function removes ALL old Google Drive connections that have tokens
 * encrypted with the incompatible padEnd() method.
 * 
 * Users must reconnect to get new tokens with correct AES-256-GCM encryption.
 * 
 * Works even without JWT verification - requires admin secret in body
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const ADMIN_SECRET = Deno.env.get('ADMIN_CLEANUP_SECRET') || 'admin-cleanup-gdrive-v1';

serve(async (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-force-disconnect-secret',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Simple auth check - must provide a secret via header or body
    const headerSecret = req.headers.get('x-force-disconnect-secret');
    const bodyData = req.method === 'POST' ? await req.json() : {};
    const bodySecret = bodyData?.secret;
    
    const secret = headerSecret || bodySecret;
    
    // Check against hardcoded secret (this is admin-only, one-time use)
    const isValid = secret === ADMIN_SECRET || secret === 'force-disconnect-gdrive-old-tokens-v1-admin';
    
    if (!isValid) {
      console.log('[Force Disconnect] Unauthorized - invalid secret provided');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get count before deletion
    const { data: beforeCount } = await supabase
      .from('tenant_google_drive_connections')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null);

    console.log('[Force Disconnect] Before:', beforeCount?.length || 0, 'active connections');

    // HARD DELETE all active connections (force users to reconnect)
    const { data: deleted, error } = await supabase
      .from('tenant_google_drive_connections')
      .delete()
      .is('deleted_at', null);

    if (error) {
      console.error('[Force Disconnect] Deletion failed:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to delete connections',
          details: error.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify deletion
    const { data: afterCount } = await supabase
      .from('tenant_google_drive_connections')
      .select('id', { count: 'exact', head: true });

    console.log('[Force Disconnect] After:', afterCount?.length || 0, 'total connections');
    console.log('[Force Disconnect] SUCCESS - Removed all active connections');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'All old Google Drive connections removed. Users must reconnect.',
        deleted: deleted?.length || 'unknown',
        remaining: afterCount?.length || 0
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (err) {
    console.error('[Force Disconnect] Error:', err);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: err instanceof Error ? err.message : String(err)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
