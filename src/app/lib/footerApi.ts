/**
 * Footer Management API
 * Complete CRUD operations for tenant footer configuration
 */

import { getSupabaseClient } from '../../lib/supabase';

// Helper to get current tenant ID from user session
// Mirrors admin.ts: ownership via tenants.owner_auth_user_id, then memberships
async function getCurrentUserTenantId(): Promise<string> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase client not available');
  
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error('Authentication required');
  }

  // 1. Check if user owns a tenant
  const { data: ownedTenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id')
    .eq('owner_auth_user_id', user.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (!tenantError && ownedTenant) {
    return ownedTenant.id;
  }

  // 2. Check tenant_memberships
  const { data: memberships, error: membershipError } = await supabase
    .from('tenant_memberships')
    .select('tenant_id')
    .eq('auth_user_id', user.id)
    .is('deleted_at', null);

  if (membershipError) {
    console.error('[Footer API] Failed to load tenant memberships:', membershipError);
    throw new Error('Failed to load tenant memberships');
  }

  if (!memberships || memberships.length === 0) {
    throw new Error('No tenant access. Contact your administrator.');
  }

  if (memberships.length === 1) {
    return String(memberships[0].tenant_id);
  }

  throw new Error('Multiple tenant memberships found. Explicit tenant context required.');
}

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface FooterSettings {
  id?: string;
  tenant_id?: string;
  // Brand
  brand_name?: string | null;
  tagline?: string | null;
  description?: string | null;
  logo_url?: string | null;
  footer_logo_url?: string | null;
  // Copyright
  copyright_text?: string | null;
  powered_by_text?: string | null;
  powered_by_url?: string | null;
  // Contact
  contact_enabled?: boolean;
  contact_title?: string | null;
  contact_address?: string | null;
  contact_city?: string | null;
  contact_state?: string | null;
  contact_country?: string | null;
  contact_postal_code?: string | null;
  contact_maps_url?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  contact_whatsapp?: string | null;
  contact_hours?: string | null;
  // App Downloads
  show_google_play?: boolean;
  google_play_url?: string | null;
  google_play_button_text?: string | null;
  show_app_store?: boolean;
  app_store_url?: string | null;
  app_store_button_text?: string | null;
  // Newsletter
  newsletter_enabled?: boolean;
  newsletter_title?: string | null;
  newsletter_description?: string | null;
  newsletter_placeholder?: string | null;
  newsletter_button_text?: string | null;
  // Advertisement
  footer_ad_enabled?: boolean;
  footer_ad_title?: string | null;
  footer_ad_description?: string | null;
  footer_ad_image_url?: string | null;
  footer_ad_button_text?: string | null;
  footer_ad_button_url?: string | null;
}

export interface FooterSocialLink {
  id?: string;
  tenant_id?: string;
  platform: 'facebook' | 'twitter' | 'instagram' | 'youtube' | 'telegram' | 'whatsapp' | 'linkedin' | 'threads' | 'pinterest';
  platform_name: string;
  profile_url: string;
  follower_count?: string | null;
  follower_label?: string | null;
  enabled?: boolean;
  sort_order?: number;
}

export interface FooterColumn {
  id?: string;
  tenant_id?: string;
  title: string;
  enabled?: boolean;
  sort_order?: number;
}

export interface FooterLink {
  id?: string;
  tenant_id?: string;
  column_id: string;
  title: string;
  url: string;
  link_type?: 'system' | 'custom_page' | 'internal' | 'external';
  custom_page_id?: string | null;
  is_external?: boolean;
  open_new_tab?: boolean;
  enabled?: boolean;
  sort_order?: number;
}

export interface CustomPage {
  id?: string;
  tenant_id?: string;
  title: string;
  slug: string;
  content: string;
  seo_title?: string | null;
  seo_description?: string | null;
  seo_keywords?: string | null;
  enabled?: boolean;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// FOOTER SETTINGS
// ═══════════════════════════════════════════════════════════════════════════

export async function getFooterSettings(tenantId?: string): Promise<FooterSettings | null> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client not available');

  const tid = tenantId || await getCurrentUserTenantId();
  if (!tid) throw new Error('No tenant context');

  const { data, error } = await client
    .from('tenant_footer_settings')
    .select('*')
    .eq('tenant_id', tid)
    .is('deleted_at', null)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('[Footer API] Error loading footer settings:', error);
    throw error;
  }

  return data || null;
}

export async function updateFooterSettings(settings: FooterSettings): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client not available');

  const tenantId = await getCurrentUserTenantId();
  if (!tenantId) throw new Error('No tenant context');

  // Check if settings exist
  const existing = await getFooterSettings(tenantId);

  if (existing) {
    // Update
    const { error } = await client
      .from('tenant_footer_settings')
      .update({ ...settings, tenant_id: tenantId })
      .eq('id', existing.id);

    if (error) throw error;
  } else {
    // Insert
    const { error } = await client
      .from('tenant_footer_settings')
      .insert({ ...settings, tenant_id: tenantId });

    if (error) throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SOCIAL LINKS
// ═══════════════════════════════════════════════════════════════════════════

export async function getFooterSocialLinks(tenantId?: string): Promise<FooterSocialLink[]> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client not available');

  const tid = tenantId || await getCurrentUserTenantId();
  if (!tid) throw new Error('No tenant context');

  const { data, error } = await client
    .from('tenant_footer_social_links')
    .select('*')
    .eq('tenant_id', tid)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('[Footer API] Error loading social links:', error);
    throw error;
  }

  return data || [];
}

export async function createFooterSocialLink(link: FooterSocialLink): Promise<FooterSocialLink> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client not available');

  const tenantId = await getCurrentUserTenantId();
  if (!tenantId) throw new Error('No tenant context');

  const { data, error } = await client
    .from('tenant_footer_social_links')
    .insert({ ...link, tenant_id: tenantId })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateFooterSocialLink(id: string, link: Partial<FooterSocialLink>): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client not available');

  const { error } = await client
    .from('tenant_footer_social_links')
    .update(link)
    .eq('id', id);

  if (error) throw error;
}

export async function deleteFooterSocialLink(id: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client not available');

  const { error } = await client
    .from('tenant_footer_social_links')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

// ═══════════════════════════════════════════════════════════════════════════
// FOOTER COLUMNS
// ═══════════════════════════════════════════════════════════════════════════

export async function getFooterColumns(tenantId?: string): Promise<FooterColumn[]> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client not available');

  const tid = tenantId || await getCurrentUserTenantId();
  if (!tid) throw new Error('No tenant context');

  const { data, error } = await client
    .from('tenant_footer_columns')
    .select('*')
    .eq('tenant_id', tid)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('[Footer API] Error loading columns:', error);
    throw error;
  }

  return data || [];
}

export async function createFooterColumn(column: FooterColumn): Promise<FooterColumn> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client not available');

  const tenantId = await getCurrentUserTenantId();
  if (!tenantId) throw new Error('No tenant context');

  const { data, error } = await client
    .from('tenant_footer_columns')
    .insert({ ...column, tenant_id: tenantId })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateFooterColumn(id: string, column: Partial<FooterColumn>): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client not available');

  const { error } = await client
    .from('tenant_footer_columns')
    .update(column)
    .eq('id', id);

  if (error) throw error;
}

export async function deleteFooterColumn(id: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client not available');

  const { error } = await client
    .from('tenant_footer_columns')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

// ═══════════════════════════════════════════════════════════════════════════
// FOOTER LINKS
// ═══════════════════════════════════════════════════════════════════════════

export async function getFooterLinks(tenantId?: string): Promise<FooterLink[]> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client not available');

  const tid = tenantId || await getCurrentUserTenantId();
  if (!tid) throw new Error('No tenant context');

  const { data, error } = await client
    .from('tenant_footer_links')
    .select('*')
    .eq('tenant_id', tid)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('[Footer API] Error loading links:', error);
    throw error;
  }

  return data || [];
}

export async function createFooterLink(link: FooterLink): Promise<FooterLink> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client not available');

  const tenantId = await getCurrentUserTenantId();
  if (!tenantId) throw new Error('No tenant context');

  const { data, error } = await client
    .from('tenant_footer_links')
    .insert({ ...link, tenant_id: tenantId })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateFooterLink(id: string, link: Partial<FooterLink>): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client not available');

  const { error } = await client
    .from('tenant_footer_links')
    .update(link)
    .eq('id', id);

  if (error) throw error;
}

export async function deleteFooterLink(id: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client not available');

  const { error } = await client
    .from('tenant_footer_links')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC FOOTER DATA (for anonymous users)
// ═══════════════════════════════════════════════════════════════════════════

export interface PublicFooterData {
  settings: FooterSettings | null;
  socialLinks: FooterSocialLink[];
  columns: Array<{
    column: FooterColumn;
    links: FooterLink[];
  }>;
}

export async function getPublicFooterData(tenantId: string): Promise<PublicFooterData> {
  const client = getSupabaseClient();
  if (!client) {
    return { settings: null, socialLinks: [], columns: [] };
  }

  try {
    // Load settings
    const settings = await getFooterSettings(tenantId);

    // Load social links (enabled only)
    const { data: socialData } = await client
      .from('tenant_footer_social_links')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('enabled', true)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true });

    const socialLinks = socialData || [];

    // Load columns (enabled only)
    const { data: columnsData } = await client
      .from('tenant_footer_columns')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('enabled', true)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true });

    const columns = columnsData || [];

    // Load links for each column (enabled only)
    const columnsWithLinks = await Promise.all(
      columns.map(async (column) => {
        const { data: linksData } = await client
          .from('tenant_footer_links')
          .select('*')
          .eq('column_id', column.id)
          .eq('enabled', true)
          .is('deleted_at', null)
          .order('sort_order', { ascending: true });

        return {
          column,
          links: linksData || []
        };
      })
    );

    return {
      settings,
      socialLinks,
      columns: columnsWithLinks
    };
  } catch (error) {
    console.error('[Footer API] Error loading public footer data:', error);
    return { settings: null, socialLinks: [], columns: [] };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOM PAGES
// ═══════════════════════════════════════════════════════════════════════════

export async function getCustomPages(tenantId?: string): Promise<CustomPage[]> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client not available');

  const tid = tenantId || await getCurrentUserTenantId();
  if (!tid) throw new Error('No tenant context');

  const { data, error } = await client
    .from('tenant_custom_pages')
    .select('*')
    .eq('tenant_id', tid)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('[Footer API] Error loading custom pages:', error);
    throw error;
  }

  return data || [];
}

export async function getCustomPage(slug: string, tenantId: string): Promise<CustomPage | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data, error } = await client
    .from('tenant_custom_pages')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('slug', slug)
    .eq('enabled', true)
    .is('deleted_at', null)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('[Footer API] Error loading custom page:', error);
    return null;
  }

  return data || null;
}

export async function createCustomPage(page: CustomPage): Promise<CustomPage> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client not available');

  const tenantId = await getCurrentUserTenantId();
  if (!tenantId) throw new Error('No tenant context');

  const { data, error } = await client
    .from('tenant_custom_pages')
    .insert({ ...page, tenant_id: tenantId })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCustomPage(id: string, page: Partial<CustomPage>): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client not available');

  const { error } = await client
    .from('tenant_custom_pages')
    .update({ ...page, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

export async function deleteCustomPage(id: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client not available');

  const { error } = await client
    .from('tenant_custom_pages')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}
