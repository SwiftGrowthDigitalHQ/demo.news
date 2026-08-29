/**
 * Google Search Console OAuth Start
 * 
 * Initiates OAuth 2.0 flow for Google Search Console access.
 * Generates Google OAuth URL with Search Console readonly scope.
 * 
 * Customer Experience:
 * 1. Customer clicks "Connect Google Search Console" in admin panel
 * 2. This function generates OAuth URL
 * 3. Customer is redirected to Google sign-in
 * 4. Customer authorizes read-only Search Console access
 * 5. Google redirects to gsc-oauth-callback
 * 
 * Security:
 * - Validates tenant membership via JWT
 * - Generates CSRF state parameter with tenant context
 * - Requests minimal Search Console scope (webmasters.readonly)
 * - Uses service role to verify tenant membership
 * - Never exposes client secret to frontend
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
    console.error('[GSC OAuth Start] Auth error:', authError);
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
    console.error('[GSC OAuth Start] Membership check error:', error);
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

  try {
    // Extract authorization token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authToken = authHeader.substring(7);

    // Parse request body
    const body: StartOAuthRequest = await req.json();
    const { tenant_id } = body;

    if (!tenant_id) {
      return new Response(
        JSON.stringify({ error: 'tenant_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[GSC OAuth Start] Request for tenant:', tenant_id);

    // Validate tenant access
    const hasAccess = await validateTenantAccess(authToken, tenant_id);
    if (!hasAccess) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: No access to this tenant' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[GSC OAuth Start] Tenant access validated');

    // Generate CSRF state
    const state = generateState(tenant_id);

    // Construct OAuth URL
    const redirectUri = `${SUPABASE_URL}/functions/v1/gsc-oauth-callback`;
    
    // Google Search Console OAuth scopes
    // webmasters.readonly = Read-only access to Search Console data
    // openid, email, profile = User identity
    const scopes = [
      'openid',
      'email',
      'profile',
      'https://www.googleapis.com/auth/webmasters.readonly',
    ].join(' ');

    const oauthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    oauthUrl.searchParams.set('client_id', GOOGLE_OAUTH_CLIENT_ID);
    oauthUrl.searchParams.set('redirect_uri', redirectUri);
    oauthUrl.searchParams.set('response_type', 'code');
    oauthUrl.searchParams.set('scope', scopes);
    oauthUrl.searchParams.set('access_type', 'offline'); // Request refresh token
    oauthUrl.searchParams.set('prompt', 'consent'); // Force consent to get refresh token
    oauthUrl.searchParams.set('state', state);

    console.log('[GSC OAuth Start] OAuth URL generated');

    return new Response(
      JSON.stringify({
        success: true,
        oauth_url: oauthUrl.toString(),
        state, // Return state for client-side CSRF validation
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('[GSC OAuth Start] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
