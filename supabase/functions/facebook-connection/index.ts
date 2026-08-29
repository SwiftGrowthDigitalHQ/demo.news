/**
 * Facebook Connection Management
 * 
 * Handles Facebook connection management operations:
 * - GET /status - Get connection status
 * - POST /disconnect - Disconnect Facebook Page
 * - POST /select-page - Select Page from multiple options
 * 
 * Security:
 * - Validates authentication
 * - Enforces tenant isolation
 * - Never exposes OAuth tokens
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const FB_ENCRYPTION_KEY = Deno.env.get('FB_ENCRYPTION_KEY') || '';
const FRONTEND_URL = Deno.env.get('SITE_URL') || 'http://localhost:5173';

interface ErrorResponse {
  error: string;
  details?: string;
}

/**
 * AES-256-GCM encryption
 */
async function encryptToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const keyData = Uint8Array.from(atob(FB_ENCRYPTION_KEY), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    data
  );
  
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

/**
 * Get authenticated user's tenant ID
 */
async function getUserTenantId(authHeader: string): Promise<string> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  const token = authHeader.replace('Bearer ', '');
  
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    throw new Error('Not authenticated');
  }
  
  const { data: membership, error: membershipError } = await supabase
    .from('tenant_memberships')
    .select('tenant_id')
    .eq('auth_user_id', user.id)
    .limit(1)
    .single();
  
  if (membershipError || !membership) {
    throw new Error('No tenant membership found');
  }
  
  return membership.tenant_id;
}

/**
 * Get connection status
 */
async function getStatus(tenantId: string) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  console.log('[Facebook Connection] Getting status for tenant:', tenantId);
  
  const { data, error } = await supabase
    .from('facebook_connections')
    .select(`
      id,
      facebook_user_name,
      facebook_user_email,
      facebook_page_id,
      facebook_page_name,
      facebook_page_username,
      facebook_page_category,
      facebook_page_image_url,
      facebook_page_url,
      status,
      last_used_at,
      last_error,
      created_at,
      updated_at
    `)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .maybeSingle();
  
  if (error) {
    console.error('[Facebook Connection] Status query failed:', error);
    throw new Error('Failed to get connection status');
  }
  
  if (!data) {
    console.log('[Facebook Connection] No connection found');
    return {
      connected: false,
      connection: null,
    };
  }
  
  console.log('[Facebook Connection] Connection found:', data.facebook_page_name);
  
  return {
    connected: true,
    connection: data,
  };
}

/**
 * Disconnect Facebook Page
 */
async function disconnect(tenantId: string) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  console.log('[Facebook Connection] Disconnecting tenant:', tenantId);
  
  const { error } = await supabase
    .from('facebook_connections')
    .update({
      status: 'disconnected',
      deleted_at: new Date().toISOString(),
    })
    .eq('tenant_id', tenantId);
  
  if (error) {
    console.error('[Facebook Connection] Disconnect failed:', error);
    throw new Error('Failed to disconnect Facebook');
  }
  
  console.log('[Facebook Connection] Disconnected successfully');
  
  return { success: true };
}

/**
 * Select Page (from multiple options)
 */
async function selectPage(tenantId: string, pageData: any) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  console.log('[Facebook Connection] Selecting Page for tenant:', tenantId);
  
  // Validate required fields
  if (!pageData.page_id || !pageData.page_name || !pageData.page_access_token) {
    throw new Error('Missing required Page data');
  }
  
  // Encrypt Page access token
  const accessTokenEncrypted = await encryptToken(pageData.page_access_token);
  
  // Construct Page URL
  const pageUrl = pageData.page_username 
    ? `https://www.facebook.com/${pageData.page_username}`
    : `https://www.facebook.com/${pageData.page_id}`;
  
  const upsertPayload = {
    tenant_id: tenantId,
    facebook_user_id: pageData.user_id,
    facebook_user_name: pageData.user_name || null,
    facebook_user_email: pageData.user_email || null,
    facebook_page_id: pageData.page_id,
    facebook_page_name: pageData.page_name,
    facebook_page_username: pageData.page_username || null,
    facebook_page_category: pageData.page_category || null,
    facebook_page_image_url: pageData.page_image || null,
    facebook_page_url: pageUrl,
    access_token_encrypted: accessTokenEncrypted,
    token_expires_at: pageData.token_expires_at || null,
    granted_permissions: pageData.permissions || 'pages_show_list,pages_read_engagement,pages_manage_posts',
    status: 'active' as const,
    last_used_at: new Date().toISOString(),
    connected_by_user_id: null,
  };
  
  const { data, error } = await supabase
    .from('facebook_connections')
    .upsert(upsertPayload, {
      onConflict: 'tenant_id',
    })
    .select()
    .single();
  
  if (error) {
    console.error('[Facebook Connection] Page selection failed:', error);
    throw new Error('Failed to save Page selection');
  }
  
  console.log('[Facebook Connection] Page selected:', data.facebook_page_name);
  
  return {
    success: true,
    connection: {
      id: data.id,
      facebook_page_name: data.facebook_page_name,
      facebook_page_username: data.facebook_page_username,
      facebook_page_url: data.facebook_page_url,
    },
  };
}

/**
 * Main handler
 */
serve(async (req: Request) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': FRONTEND_URL,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
  
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }
  
  try {
    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated' } as ErrorResponse),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Get tenant ID
    const tenantId = await getUserTenantId(authHeader);
    
    // Route based on method and path
    const url = new URL(req.url);
    const endpoint = url.pathname.split('/').pop();
    
    if (req.method === 'GET' && endpoint === 'status') {
      // GET /status
      const result = await getStatus(tenantId);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (req.method === 'POST' && endpoint === 'disconnect') {
      // POST /disconnect
      const result = await disconnect(tenantId);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (req.method === 'POST' && endpoint === 'select-page') {
      // POST /select-page
      const pageData = await req.json();
      const result = await selectPage(tenantId, pageData);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Unknown endpoint
    return new Response(
      JSON.stringify({ error: 'Unknown endpoint' } as ErrorResponse),
      {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
    
  } catch (err) {
    console.error('[Facebook Connection] Error:', err);
    
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    
    return new Response(
      JSON.stringify({
        error: 'Operation failed',
        details: errorMessage,
      } as ErrorResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
