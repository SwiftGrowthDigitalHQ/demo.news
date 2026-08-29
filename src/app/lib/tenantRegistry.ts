/**
 * Tenant Registry - Dynamic Tenant Loading
 * 
 * Replaces hard-coded tenant slug lists with database-driven resolution.
 * Implements caching to avoid excessive database queries.
 */

import { getSupabaseClient } from '../../lib/supabase';

interface TenantRegistryEntry {
  slug: string;
  id: string;
}

let tenantSlugsCache: Set<string> | null = null;
let tenantMapCache: Map<string, string> | null = null;
let lastCacheUpdate: number = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Load tenant slugs from database with caching
 */
async function loadTenantRegistry(): Promise<{ slugs: Set<string>; map: Map<string, string> }> {
  const now = Date.now();
  
  // Return cached data if still valid
  if (tenantSlugsCache && tenantMapCache && (now - lastCacheUpdate) < CACHE_TTL_MS) {
    return { slugs: tenantSlugsCache, map: tenantMapCache };
  }

  const client = getSupabaseClient();
  if (!client) {
    console.error('[TENANT REGISTRY] No Supabase client available');
    return { slugs: new Set(), map: new Map() };
  }

  try {
    const { data, error } = await client
      .from('tenants')
      .select('slug, id')
      .is('deleted_at', null);

    if (error) {
      console.error('[TENANT REGISTRY] Failed to load tenants:', error);
      return { slugs: tenantSlugsCache || new Set(), map: tenantMapCache || new Map() };
    }

    const slugs = new Set<string>();
    const map = new Map<string, string>();

    (data || []).forEach((tenant: TenantRegistryEntry) => {
      slugs.add(tenant.slug);
      map.set(tenant.slug, tenant.id);
    });

    // Update cache
    tenantSlugsCache = slugs;
    tenantMapCache = map;
    lastCacheUpdate = now;

    console.log(`[TENANT REGISTRY] Loaded ${slugs.size} tenant slugs`);
    return { slugs, map };
  } catch (err) {
    console.error('[TENANT REGISTRY] Exception loading tenants:', err);
    return { slugs: tenantSlugsCache || new Set(), map: tenantMapCache || new Map() };
  }
}

/**
 * Check if a slug belongs to an active tenant
 */
export async function isTenantSlug(slug: string): Promise<boolean> {
  console.log('[TENANT REGISTRY] Checking if slug is tenant:', slug);
  const { slugs } = await loadTenantRegistry();
  const result = slugs.has(slug);
  console.log('[TENANT REGISTRY] Result for', slug, ':', result, '| Available slugs:', Array.from(slugs));
  return result;
}

/**
 * Get all active tenant slugs
 */
export async function getTenantSlugs(): Promise<Set<string>> {
  const { slugs } = await loadTenantRegistry();
  return slugs;
}

/**
 * Get tenant ID from slug
 */
export async function getTenantIdFromSlug(slug: string): Promise<string | null> {
  const { map } = await loadTenantRegistry();
  return map.get(slug) || null;
}

/**
 * Clear tenant cache (call after tenant creation/deletion)
 */
export function clearTenantCache(): void {
  tenantSlugsCache = null;
  tenantMapCache = null;
  lastCacheUpdate = 0;
  console.log('[TENANT REGISTRY] Cache cleared');
}

/**
 * Platform-level reserved slugs (system routes, not tenants)
 */
export const RESERVED_PLATFORM_SLUGS = new Set([
  'admin',
  'login',
  'register',
  'pricing',
  'features',
  'demo',
  'contact',
  'privacy',
  'terms',
  'onboarding',
  'api',
  'superadmin',
  'super-admin',
  'sangtx',
  'forgot-password',
  'reset-password',
  'docs',
  'help',
  'support',
  'blog',
  'about',
  'careers',
]);

/**
 * Check if a slug is reserved for platform use
 */
export function isReservedSlug(slug: string): boolean {
  return RESERVED_PLATFORM_SLUGS.has(slug.toLowerCase());
}
