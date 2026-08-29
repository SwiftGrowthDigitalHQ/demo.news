/**
 * Google Drive Disconnect Handler
 * 
 * Safely disconnects tenant's Google Drive connection.
 * Does NOT delete customer's files from Drive.
 * 
 * Security:
 * - Validates tenant membership
 * - Soft deletes connection (preserves audit trail)
 * - Preserves media metadata for historical reference
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

/**
 * Validate tenant membership
 */
async function validateTenantMembership(authUserId: string, tenantId: string): Promise<boolean> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  const { data, error } = await supabase
    .from('tenant_memberships')
    .select('id')
    .eq('auth_user_id', authUserId)
    .eq('tenant_id', tenantId)
    .single();
  
  return !error && !!data;
}

/**
 * Main handler
 */
serve(async (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  
  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Verify token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Parse request body
    const body = await req.json();
    const tenantId = body.tenant_id;
    
    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: 'Missing tenant_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate tenant membership
    const isMember = await validateTenantMembership(user.id, tenantId);
    if (!isMember) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Not a member of this tenant' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Check if user has manage_settings permission
    const { data: permData } = await supabase
      .rpc('has_permission', { permission_key: 'manage_settings' });
    
    if (!permData) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Requires manage_settings permission' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Soft delete connection (preserve for audit trail)
    const { error: deleteError } = await supabase
      .from('tenant_google_drive_connections')
      .update({
        status: 'disconnected',
        deleted_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId);
    
    if (deleteError) {
      console.error('[Disconnect] Error disconnecting:', deleteError);
      return new Response(
        JSON.stringify({ error: 'Failed to disconnect' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('[Disconnect] Successfully disconnected tenant:', tenantId);
    
    // Note: We do NOT delete files from customer's Google Drive
    // Customer owns those files
    // Media metadata remains in database for historical reference
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Google Drive disconnected',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
    
  } catch (err) {
    console.error('[Disconnect] Error:', err);
    
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Disconnect failed' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
