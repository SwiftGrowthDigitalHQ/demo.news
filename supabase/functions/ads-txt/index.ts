/**
 * ads.txt Edge Function
 * 
 * Generates ads.txt file based on tenant Google AdSense configuration.
 * Endpoint: /ads.txt
 * 
 * Returns Content-Type: text/plain with AdSense publisher entry.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TenantInfo {
  id: string;
  slug: string;
  name: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[ads.txt] Missing Supabase configuration');
      return new Response('Service configuration error', {
        status: 500,
        headers: { 'Content-Type': 'text/plain', ...CORS_HEADERS },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Determine tenant from request
    const url = new URL(req.url);
    const hostHeader = req.headers.get('host') || req.headers.get('x-forwarded-host');
    const tenantSlug = url.searchParams.get('tenant') || extractTenantFromHost(hostHeader);

    if (!tenantSlug) {
      console.error('[ads.txt] Could not determine tenant');
      return new Response('Tenant not found', {
        status: 404,
        headers: { 'Content-Type': 'text/plain', ...CORS_HEADERS },
      });
    }

    // Resolve tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, slug, name')
      .eq('slug', tenantSlug)
      .is('deleted_at', null)
      .maybeSingle();

    if (tenantError || !tenant) {
      console.error('[ads.txt] Tenant not found:', tenantSlug, tenantError);
      return new Response('Tenant not found', {
        status: 404,
        headers: { 'Content-Type': 'text/plain', ...CORS_HEADERS },
      });
    }

    // Get AdSense configuration using the helper function
    const { data: adsTxtContent, error: configError } = await supabase
      .rpc('get_adsense_ads_txt', { p_tenant_id: tenant.id });

    if (configError) {
      console.error('[ads.txt] Error getting ads.txt content:', configError);
      return new Response('# ads.txt generation error\n', {
        status: 500,
        headers: { 'Content-Type': 'text/plain', ...CORS_HEADERS },
      });
    }

    // If no AdSense configured or ads.txt disabled, return empty file
    if (!adsTxtContent) {
      return new Response('# Google AdSense not configured for this site\n', {
        status: 200,
        headers: { 'Content-Type': 'text/plain', ...CORS_HEADERS },
      });
    }

    // Return ads.txt content
    return new Response(adsTxtContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        ...CORS_HEADERS,
      },
    });
  } catch (err) {
    console.error('[ads.txt] Unexpected error:', err);
    return new Response('Internal server error', {
      status: 500,
      headers: { 'Content-Type': 'text/plain', ...CORS_HEADERS },
    });
  }
});

/**
 * Extract tenant slug from hostname
 * Supports patterns like:
 * - tenant.example.com -> tenant
 * - localhost:5173?tenant=fake-news -> fake-news (handled by query param)
 */
function extractTenantFromHost(host: string | null): string | null {
  if (!host) return null;

  // Remove port if present
  const hostname = host.split(':')[0];

  // For custom domains or subdomains, extract first part
  const parts = hostname.split('.');
  if (parts.length > 2) {
    // subdomain.example.com -> subdomain
    return parts[0];
  }

  // For localhost or single-domain setups, rely on query param
  return null;
}
