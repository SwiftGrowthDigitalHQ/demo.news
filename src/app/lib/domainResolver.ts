/**
 * Domain Resolver - Custom Domain Support
 * 
 * Resolves tenant from either:
 * 1. Path-based routing: /fake-news
 * 2. Hostname-based routing: fakenews.com
 */

import { getSupabaseClient } from '../../lib/supabase';

interface DomainResolution {
  tenantId: string;
  tenantSlug: string;
  domain: string;
  isPrimary: boolean;
}

let domainCache: Map<string, DomainResolution | null> = new Map();
let lastCacheUpdate: number = 0;
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Resolve tenant from custom domain (hostname-based routing)
 */
export async function getTenantByDomain(hostname: string): Promise<DomainResolution | null> {
  const normalizedDomain = normalizeDomain(hostname);
  
  // Check cache
  const now = Date.now();
  if (domainCache.has(normalizedDomain) && (now - lastCacheUpdate) < CACHE_TTL_MS) {
    return domainCache.get(normalizedDomain) || null;
  }

  const client = getSupabaseClient();
  if (!client) {
    console.error('[DOMAIN RESOLVER] No Supabase client available');
    return null;
  }

  try {
    const { data, error } = await client.rpc('get_tenant_by_domain', {
      p_domain: normalizedDomain
    });

    if (error) {
      console.error('[DOMAIN RESOLVER] Failed to resolve domain:', error);
      return null;
    }

    if (!data || data.length === 0) {
      domainCache.set(normalizedDomain, null);
      return null;
    }

    const resolution: DomainResolution = {
      tenantId: data[0].tenant_id,
      tenantSlug: data[0].tenant_slug,
      domain: data[0].domain,
      isPrimary: data[0].is_primary
    };

    domainCache.set(normalizedDomain, resolution);
    lastCacheUpdate = now;

    console.log('[DOMAIN RESOLVER] Resolved:', normalizedDomain, '→', resolution.tenantSlug);
    return resolution;
  } catch (err) {
    console.error('[DOMAIN RESOLVER] Exception:', err);
    return null;
  }
}

/**
 * Normalize domain for consistent matching
 */
export function normalizeDomain(hostname: string): string {
  let normalized = hostname.toLowerCase().trim();
  
  // Remove protocol
  normalized = normalized.replace(/^https?:\/\//, '');
  
  // Remove trailing slash
  normalized = normalized.replace(/\/$/, '');
  
  // Remove port for local development
  normalized = normalized.replace(/:\d+$/, '');
  
  // Remove www (optional - depends on strategy)
  // normalized = normalized.replace(/^www\./, '');
  
  return normalized;
}

/**
 * Check if hostname is a custom domain (not localhost/default SaaS domain)
 */
export function isCustomDomain(hostname: string): boolean {
  const normalized = normalizeDomain(hostname);
  
  // Localhost and local IPs are not custom domains
  if (normalized === 'localhost' || normalized.startsWith('127.') || normalized.startsWith('192.168.')) {
    return false;
  }
  
  // Your SaaS domain is not a custom domain
  // TODO: Replace with your actual SaaS domain
  if (normalized.includes('your-saas-domain.com')) {
    return false;
  }
  
  return true;
}

/**
 * Clear domain cache (call after domain changes)
 */
export function clearDomainCache(): void {
  domainCache.clear();
  lastCacheUpdate = 0;
  console.log('[DOMAIN RESOLVER] Cache cleared');
}
