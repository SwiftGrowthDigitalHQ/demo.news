/**
 * Tenant Context Management
 * 
 * Provides tenant resolution for both public and admin contexts.
 * - Public: resolved from URL slug (e.g., /fake-news/)
 * - Admin: resolved from authenticated user's owned_tenant_id
 */

import { getSupabaseClient } from '../../lib/supabase';

export type TenantInfo = {
  id: string;
  slug: string;
  name: string;
};

/**
 * Resolve tenant by slug
 * Used for public tenant pages
 */
export async function resolveTenantBySlug(slug: string): Promise<TenantInfo | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data, error } = await client
    .from('tenants')
    .select('id, slug, name')
    .eq('slug', slug)
    .is('deleted_at', null)
    .maybeSingle();

  if (error || !data) {
    console.error('[TENANT] Failed to resolve tenant by slug:', slug, error);
    return null;
  }

  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
  };
}

/**
 * Resolve tenant by ID
 * Used for admin context when we have owned_tenant_id
 */
export async function resolveTenantById(tenantId: string): Promise<TenantInfo | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data, error } = await client
    .from('tenants')
    .select('id, slug, name')
    .eq('id', tenantId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error || !data) {
    console.error('[TENANT] Failed to resolve tenant by ID:', tenantId, error);
    return null;
  }

  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
  };
}
