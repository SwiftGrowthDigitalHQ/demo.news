/**
 * Sitemap Proxy Edge Function
 * 
 * Public endpoint that proxies /sitemap.xml requests to xml-sitemap function
 * with automatic tenant resolution from hostname/subdomain.
 * 
 * This allows simple URLs like:
 *   - https://fake-news.sangtx.com/sitemap.xml
 *   - https://custom-domain.com/sitemap.xml
 * 
 * Without requiring tenant slug in URL.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

serve(async (req: Request) => {
  // Extract hostname from request
  const url = new URL(req.url);
  const hostname = url.hostname;
  
  console.log('[sitemap-proxy] Request for hostname:', hostname);
  
  // Resolve tenant slug from hostname
  const tenantSlug = await resolveTenantSlug(hostname);
  
  if (!tenantSlug) {
    console.error('[sitemap-proxy] Could not resolve tenant from hostname:', hostname);
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>',
      {
        status: 404,
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'no-cache',
        },
      }
    );
  }
  
  console.log('[sitemap-proxy] Resolved tenant:', tenantSlug);
  
  // Forward to xml-sitemap function with tenant parameter
  const sitemapUrl = `${SUPABASE_URL}/functions/v1/xml-sitemap?tenant=${encodeURIComponent(tenantSlug)}`;
  
  console.log('[sitemap-proxy] Forwarding to:', sitemapUrl);
  
  try {
    const response = await fetch(sitemapUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });
    
    // Forward response headers and body
    const headers = new Headers();
    response.headers.forEach((value, key) => {
      headers.set(key, value);
    });
    
    // Add CORS headers
    headers.set('Access-Control-Allow-Origin', '*');
    
    const body = await response.text();
    
    return new Response(body, {
      status: response.status,
      headers,
    });
  } catch (error) {
    console.error('[sitemap-proxy] Error forwarding request:', error);
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>',
      {
        status: 500,
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'no-cache',
        },
      }
    );
  }
});

/**
 * Resolve tenant slug from hostname
 * Handles both subdomain and custom domain deployments
 */
async function resolveTenantSlug(hostname: string): Promise<string | null> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  // Check if it's a subdomain of sangtx.com (e.g., fake-news.sangtx.com)
  if (hostname.endsWith('.sangtx.com')) {
    const subdomain = hostname.replace('.sangtx.com', '');
    console.log('[sitemap-proxy] Subdomain detected:', subdomain);
    
    // Verify tenant exists
    const { data, error } = await supabase
      .from('tenants')
      .select('slug')
      .eq('slug', subdomain)
      .is('deleted_at', null)
      .maybeSingle();
    
    if (error) {
      console.error('[sitemap-proxy] Error checking subdomain tenant:', error);
      return null;
    }
    
    return data?.slug || null;
  }
  
  // Check if it's a custom domain
  console.log('[sitemap-proxy] Checking custom domain:', hostname);
  
  const { data, error } = await supabase
    .from('custom_domains')
    .select('tenant_id, tenants!inner(slug)')
    .eq('domain', hostname)
    .eq('status', 'active')
    .is('deleted_at', null)
    .maybeSingle();
  
  if (error) {
    console.error('[sitemap-proxy] Error checking custom domain:', error);
    return null;
  }
  
  if (data && data.tenants) {
    const tenant = data.tenants as { slug: string };
    console.log('[sitemap-proxy] Custom domain resolved to tenant:', tenant.slug);
    return tenant.slug;
  }
  
  // Localhost fallback - get first available tenant
  if (hostname === 'localhost' || hostname.startsWith('127.0.0.1') || hostname.startsWith('192.168.')) {
    console.log('[sitemap-proxy] Localhost detected, using first tenant');
    
    const { data, error } = await supabase
      .from('tenants')
      .select('slug')
      .is('deleted_at', null)
      .limit(1)
      .maybeSingle();
    
    if (error) {
      console.error('[sitemap-proxy] Error fetching localhost tenant:', error);
      return null;
    }
    
    return data?.slug || null;
  }
  
  console.log('[sitemap-proxy] No tenant found for hostname:', hostname);
  return null;
}
