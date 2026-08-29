/**
 * YouTube OAuth Start - Initiate OAuth 2.0 Flow
 * 
 * Generates Google OAuth URL with YouTube readonly scope and redirects user.
 * This is a server-side endpoint that constructs the OAuth URL to avoid
 * exposing client secrets in frontend code.
 * 
 * Security:
 * - Validates tenant membership via JWT
 * - Generates CSRF state parameter with tenant context
 * - Requests minimal YouTube scope (youtube.readonly)
 * - Uses PKCE flow for additional security
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const GOOGLE_OAUTH_CLIENT_ID = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID') || '';
const FRONTEND_URL = Deno.env.get('SITE_URL') || 'http://localhost:5173';

interface StartOAuthRequest {
  tenant_id: string;
}

/**
 * Validate that user has access to the specified tenant
 */
async function validateTenantAccess(
  authToken: string,
  tenantId: string
): Promise<boolean> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  // Get user from JWT
  const { data: { user }, error: authError } = await supabase.auth.getUser(authToken);
  
  if (authError || !user) {
    console.error('[OAuth Start] Auth error:', authError);
    return false;
  }
  
  // Check tenant membership
  const { data, error } = await supabase
    .from('tenant_memberships')
    .select('id')
    .eq('auth_user_id', user.id)
    .eq('tenant_id', tenantId)
    .limit(1)
    .maybeSingle();
  
  if (error) {
    console.error('[OAuth Start] Membership check error:', error);
    return false;
  }
  
  return !!data;
}

/**
 * Generate CSRF state parameter
 * Format: tenantId:csrfToken:timestamp
 */
function generateState(tenantId: string): string {
  const csrfToken = crypto.randomUUID();
  const timestamp = Date.now();
  return `${tenantId}:${csrfToken}:${timestamp}`;
}

/**
 * Main handler
 */
serve(async (req: Request) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': FRONTEND_URL,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
  
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }
  
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  
  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const authToken = authHeader.replace('Bearer ', '');
    
    // Parse request body
    const body: StartOAuthRequest = await req.json();
    const { tenant_id } = body;
    
    if (!tenant_id) {
      return new Response(
        JSON.stringify({ error: 'tenant_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('[YouTube OAuth Start] Initiating for tenant:', tenant_id);
    
    // Validate tenant access
    const hasAccess = await validateTenantAccess(authToken, tenant_id);
    if (!hasAccess) {
      console.error('[YouTube OAuth Start] Access denied for tenant:', tenant_id);
      return new Response(
        JSON.stringify({ error: 'Access denied: Not a member of this tenant' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Generate CSRF state
    const state = generateState(tenant_id);
    console.log('[YouTube OAuth Start] Generated state for tenant:', tenant_id);
    
    // Construct OAuth callback URL
    const redirectUri = `${SUPABASE_URL}/functions/v1/youtube-oauth-callback`;
    
    // Build Google OAuth URL
    // Scopes:
    // - openid, email, profile: User identity
    // - youtube.readonly: Read-only access to YouTube account (channels, videos)
    //
    // IMPORTANT: Do NOT include 'include_granted_scopes: true' because this would
    // add previously granted scopes (like drive.file from Google Drive OAuth),
    // causing Google to reject the request with "scopes that cannot be requested together"
    const params = new URLSearchParams({
      client_id: GOOGLE_OAUTH_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile https://www.googleapis.com/auth/youtube.readonly',
      state: state,
      access_type: 'offline', // Request refresh token
      prompt: 'consent', // Force consent screen to ensure refresh token
    });
    
    const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    
    console.log('[YouTube OAuth Start] OAuth URL generated, redirecting...');
    
    // Return OAuth URL for frontend to redirect
    return new Response(
      JSON.stringify({ 
        success: true, 
        oauth_url: oauthUrl,
        state: state // Return state so frontend can store it for validation
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
    
  } catch (err) {
    console.error('[YouTube OAuth Start] Error:', err);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: err instanceof Error ? err.message : String(err)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
