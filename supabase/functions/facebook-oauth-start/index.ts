/**
 * Facebook OAuth Start Handler
 * 
 * Initiates Facebook OAuth 2.0 flow for Page publishing authorization.
 * - Validates authenticated tenant
 * - Generates secure CSRF state
 * - Constructs Facebook OAuth URL with required permissions
 * - Returns OAuth URL for frontend redirect
 * 
 * Security:
 * - Validates tenant ownership
 * - Generates cryptographically secure state
 * - Never exposes App Secret
 * - Enforces tenant isolation
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const META_APP_ID = Deno.env.get('META_APP_ID') || '';
const FRONTEND_URL = Deno.env.get('SITE_URL') || 'http://localhost:5173';

// Facebook PAGE permissions required for Page publishing
// Source: https://developers.facebook.com/docs/pages/publishing/
// Source: https://developers.facebook.com/docs/pages-api/manage-pages
// 
// These are PAGE permissions (not user permissions like user_posts, user_likes)
// Required to: list Pages → read Page info → publish posts to Page
const FACEBOOK_SCOPES = [
  'pages_show_list',           // List Pages user manages - Required to call /user/accounts
  'pages_read_engagement',     // Read Page content/metadata - Dependency for pages_manage_posts
  'pages_manage_posts',        // Create/edit/delete Page posts - Required to POST to /page_id/feed
  'public_profile',            // Basic profile info - Always available, no review needed
].join(',');

interface ErrorResponse {
  error: string;
  details?: string;
}

/**
 * Get authenticated user's tenant ID
 */
async function getUserTenantId(authHeader: string): Promise<string> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  // Extract JWT from Authorization header
  const token = authHeader.replace('Bearer ', '');
  
  // Verify JWT and get user
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    console.error('[Facebook OAuth Start] Auth failed:', authError);
    throw new Error('Not authenticated');
  }
  
  console.log('[Facebook OAuth Start] Authenticated user:', user.id);
  
  // Get user's tenant membership
  const { data: membership, error: membershipError } = await supabase
    .from('tenant_memberships')
    .select('tenant_id')
    .eq('auth_user_id', user.id)
    .limit(1)
    .single();
  
  if (membershipError || !membership) {
    console.error('[Facebook OAuth Start] No tenant membership:', membershipError);
    throw new Error('No tenant membership found');
  }
  
  console.log('[Facebook OAuth Start] Tenant ID:', membership.tenant_id);
  
  return membership.tenant_id;
}

/**
 * Generate secure CSRF state
 */
function generateState(tenantId: string): string {
  // Format: tenantId:csrfToken:timestamp
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
      JSON.stringify({ error: 'Method not allowed' } as ErrorResponse),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
  
  try {
    // CRITICAL: Validate Meta App ID is configured
    if (!META_APP_ID || META_APP_ID.trim() === '') {
      console.error('[Facebook OAuth Start] META_APP_ID is not configured');
      return new Response(
        JSON.stringify({
          error: 'Facebook integration is not configured',
          details: 'META_APP_ID environment variable is missing. Please configure Meta Developer App credentials.',
        } as ErrorResponse),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[Facebook OAuth Start] Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Not authenticated' } as ErrorResponse),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    console.log('[Facebook OAuth Start] Processing request...');
    console.log('[Facebook OAuth Start] META_APP_ID configured:', META_APP_ID ? 'YES' : 'NO');
    
    // Get tenant ID from authenticated user
    const tenantId = await getUserTenantId(authHeader);
    
    // Generate secure state for CSRF protection
    const state = generateState(tenantId);
    
    console.log('[Facebook OAuth Start] Generated state for tenant:', tenantId);
    
    // Construct OAuth redirect URI
    const redirectUri = `${SUPABASE_URL}/functions/v1/facebook-oauth-callback`;
    
    console.log('[Facebook OAuth Start] Redirect URI:', redirectUri);
    
    // Construct Facebook OAuth URL
    const oauthUrl = 'https://www.facebook.com/v18.0/dialog/oauth?' + new URLSearchParams({
      client_id: META_APP_ID,
      redirect_uri: redirectUri,
      state: state,
      scope: FACEBOOK_SCOPES,
      response_type: 'code',
      auth_type: 'rerequest', // Force permissions re-request if previously denied
    }).toString();
    
    console.log('[Facebook OAuth Start] OAuth URL generated');
    console.log('[Facebook OAuth Start] Requested scopes:', FACEBOOK_SCOPES);
    
    // Return OAuth URL to frontend
    return new Response(
      JSON.stringify({
        success: true,
        oauth_url: oauthUrl,
        state: state, // Frontend can validate on callback
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
    
  } catch (err) {
    console.error('[Facebook OAuth Start] Error:', err);
    
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    
    return new Response(
      JSON.stringify({
        error: 'Failed to initiate Facebook OAuth',
        details: errorMessage,
      } as ErrorResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
