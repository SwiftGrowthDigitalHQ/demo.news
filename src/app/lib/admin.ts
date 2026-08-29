/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { getSupabaseClient } from '../../lib/supabase';
import type { PublicArticle, PublicCategory, SiteSettings } from './cms';

// ═══════════════════════════════════════════════════════════════════════════
// DEMO MODE DETECTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if we're running in demo mode
 * Demo routes: /demo, /demo/*, /demo/admin/*
 */
function isDemoMode(): boolean {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname;
  return path === '/demo' || path.startsWith('/demo/');
}

// ═══════════════════════════════════════════════════════════════════════════
// TENANT CONTEXT RESOLUTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get the authenticated user's authorized tenant ID.
 * 
 * Priority:
 * 1. Check if user owns a tenant (tenants.owner_auth_user_id)
 * 2. Check tenant_memberships (authorized member)
 * 3. Throw error if no tenant context found
 * 
 * SECURITY: Never trust client-supplied tenant_id.
 * SECURITY: Never use "first tenant from database".
 * SECURITY: All queries are protected by RLS at database level.
 */
async function getCurrentUserTenantId(): Promise<string> {
  const supabase = client();
  
  // Get current authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Authentication required for admin operations');
  }

  // 1. Check if user owns a tenant
  // RLS policy: owner_auth_user_id = auth.uid()
  const { data: ownedTenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id, slug, name')
    .eq('owner_auth_user_id', user.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (tenantError) {
    console.error('[ADMIN] Failed to load owned tenant:', tenantError);
    throw new Error('Failed to load tenant ownership');
  }

  if (ownedTenant) {
    console.log('[ADMIN] Using owned tenant:', ownedTenant.slug, '(', ownedTenant.id, ')');
    return ownedTenant.id;
  }

  // 2. Check tenant_memberships (authorized member)
  // RLS protects this query
  const { data: memberships, error: membershipError } = await supabase
    .from('tenant_memberships')
    .select('tenant_id, role')
    .eq('auth_user_id', user.id)
    .is('deleted_at', null);

  if (membershipError) {
    console.error('[ADMIN] Failed to load tenant memberships:', membershipError);
    throw new Error('Failed to load tenant memberships');
  }

  if (!memberships || memberships.length === 0) {
    throw new Error('No tenant access. Contact your administrator.');
  }

  if (memberships.length === 1) {
    const tenantId = String(memberships[0].tenant_id);
    console.log('[ADMIN] Using tenant_membership:', tenantId);
    return tenantId;
  }

  // Multiple memberships - this shouldn't happen in current architecture
  // For now, require explicit tenant context
  throw new Error('Multiple tenant memberships found. Explicit tenant context required.');
}

/**
 * Check if the authenticated user is a super admin.
 * Super admins can bypass tenant restrictions in specific operations.
 * Uses the is_super_admin() database function for server-side enforcement.
 */
async function isCurrentUserSuperAdmin(): Promise<boolean> {
  const supabase = client();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return false;

  // Use database function (server-side check)
  const { data, error } = await supabase.rpc('is_super_admin');
  
  if (error) {
    console.error('[ADMIN] Failed to check super admin status:', error);
    return false;
  }

  return data === true;
}

export type AdminArticle = PublicArticle & {
  status: 'draft' | 'scheduled' | 'review' | 'published' | 'archived';
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type AdminCategory = PublicCategory & {
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type AdminMediaItem = {
  id: string;
  file_name: string;
  file_path: string;
  storage_bucket: string;
  storage_provider?: 'supabase' | 'google_drive';
  drive_file_id?: string | null;
  drive_folder_id?: string | null;
  drive_web_url?: string | null;
  drive_web_content_link?: string | null;
  drive_thumbnail_link?: string | null;
  mime_type: string;
  file_size: number;
  width: number | null;
  height: number | null;
  alt_text: string | null;
  caption: string | null;
  usage_count: number;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type AdminReporter = {
  id: string;
  full_name: string;
  slug: string;
  bio: string | null;
  specialty: string | null;
  avatar_url: string | null;
  status: string;
  social_links: Record<string, string>;
  user_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  email?: string | null;
  role_slug?: string | null;
};

export type AdminAd = {
  id: string;
  placement: string;
  ad_type: 'adsense' | 'direct';
  advertiser_name: string;
  title: string;
  target_url: string | null;
  banner_url: string | null;
  position: string | null;
  start_date: string | null;
  end_date: string | null;
  click_count: number;
  impression_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type SeoSetting = {
  id: string;
  page_path: string;
  meta_title: string | null;
  meta_description: string | null;
  og_title: string | null;
  og_description: string | null;
  twitter_title: string | null;
  twitter_description: string | null;
  schema_json: Record<string, unknown>;
  canonical_url: string | null;
  is_indexed: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type NotificationRow = {
  id: string;
  title: string;
  message: string;
  channel: string;
  status: 'draft' | 'scheduled' | 'sent' | 'cancelled';
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type AuditLogRow = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
};

export type AnalyticsEventRow = {
  id: string;
  event_type: string;
  page_path: string | null;
  article_id: string | null;
  category_id: string | null;
  user_id: string | null;
  session_id: string | null;
  referrer: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type AdminRole = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  user_count?: number;
};

export type AdminUser = {
  id: string;
  auth_user_id: string | null;
  role_id: string | null;
  full_name: string;
  email: string;
  avatar_url: string | null;
  phone: string | null;
  bio: string | null;
  status: string;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  role_name?: string | null;
  role_slug?: string | null;
};

export type BreakingNewsRow = {
  id: string;
  headline: string;
  link_url: string | null;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type SubscriptionRow = {
  id: string;
  email: string;
  full_name: string | null;
  status: string;
  source: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type CampaignRow = {
  id: string;
  name: string;
  advertiser_name: string;
  campaign_type: 'adsense' | 'direct';
  status: string;
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

function client() {
  // In demo mode, we don't use Supabase at all
  if (isDemoMode()) {
    throw new Error('Demo mode does not use Supabase client');
  }
  
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }
  return supabase;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function getBrowserContext() {
  if (typeof window === 'undefined') {
    return {
      sessionId: crypto.randomUUID(),
      referrer: null as string | null,
      userAgent: null as string | null,
    };
  }

  const storageKey = 'sitamarhi_live_session_id';
  let sessionId = window.localStorage.getItem(storageKey);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    window.localStorage.setItem(storageKey, sessionId);
  }

  return {
    sessionId,
    referrer: document.referrer || null,
    userAgent: navigator.userAgent || null,
  };
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function sanitizeThemeConfig(value: unknown) {
  if (!value || typeof value !== 'object') {
    return {};
  }

  const config = value as Record<string, unknown>;
  const ads = config.ads && typeof config.ads === 'object' ? (config.ads as Record<string, unknown>) : undefined;

  // SECURITY: Only include frontend-safe properties, NO secrets
  return {
    primary_color: typeof config.primary_color === 'string' ? config.primary_color : undefined,
    secondary_color: typeof config.secondary_color === 'string' ? config.secondary_color : undefined,
    logo: typeof config.logo === 'string' ? config.logo : undefined,
    favicon: typeof config.favicon === 'string' ? config.favicon : undefined,
    tagline: typeof config.tagline === 'string' ? config.tagline : undefined,
    site_url: typeof config.site_url === 'string' ? config.site_url : undefined,
    articles_per_page: typeof config.articles_per_page === 'string' || typeof config.articles_per_page === 'number'
      ? config.articles_per_page
      : undefined,
    breaking_ticker: typeof config.breaking_ticker === 'boolean' ? config.breaking_ticker : undefined,
    comments_enabled: typeof config.comments_enabled === 'boolean' ? config.comments_enabled : undefined,
    maintenance_mode: typeof config.maintenance_mode === 'boolean' ? config.maintenance_mode : undefined,
    dark_mode: typeof config.dark_mode === 'boolean' ? config.dark_mode : undefined,
    font_size: typeof config.font_size === 'string' ? config.font_size : undefined,
    hero_layout: typeof config.hero_layout === 'string' ? config.hero_layout : undefined,
    // REMOVED: smtp_host, smtp_port, smtp_username, from_name (backend secrets)
    // REMOVED: breaking_alerts, weekly_digest (backend notification config)
    // REMOVED: auto_share, auto_backup, backup_retention (backend operations)
    ads,
  };
}

export async function listAdminArticles() {
  // Demo mode: return static demo data
  if (isDemoMode()) {
    const { DEMO_ADMIN_ARTICLES } = await import('./demoTenant');
    return Promise.resolve(DEMO_ADMIN_ARTICLES);
  }
  
  const supabase = client();
  const tenantId = await getCurrentUserTenantId();
  const { data, error } = await supabase
    .from('articles')
    .select(`
      id, slug, title, excerpt, content, category_id, featured_image, media_type, video_url,
      seo_title, seo_description, status, featured, trending, breaking, publish_at, read_time,
      views_count, created_at, updated_at, deleted_at,
      category:categories!articles_category_id_fkey(id, name, slug),
      author:users!articles_author_id_fkey(id, full_name, role:roles(slug, name)),
      tags:article_tags(tag)
    `)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: Record<string, unknown>) => {
    const category = Array.isArray(row.category) ? row.category[0] : asRecord(row.category);
    const author = Array.isArray(row.author) ? row.author[0] : asRecord(row.author);
    const role = Array.isArray(author.role) ? author.role[0] : asRecord(author.role);
    return {
      id: String(row.id),
      slug: String(row.slug),
      title: String(row.title),
      excerpt: String(row.excerpt),
      content: Array.isArray(row.content) ? row.content.map(item => String(item)) : [],
      category_id: String(row.category_id),
      category_name: String(category.name ?? ''),
      category_slug: String(category.slug ?? ''),
      author_name: String(author.full_name ?? ''),
      author_role: String(role.name ?? 'Reporter'),
      publish_at: typeof row.publish_at === 'string' ? row.publish_at : null,
      read_time: typeof row.read_time === 'string' ? row.read_time : null,
      featured_image: typeof row.featured_image === 'string' ? row.featured_image : null,
      media_type: String(row.media_type ?? 'article'),
      video_url: typeof row.video_url === 'string' ? row.video_url : null,
      seo_title: typeof row.seo_title === 'string' ? row.seo_title : null,
      seo_description: typeof row.seo_description === 'string' ? row.seo_description : null,
      featured: Boolean(row.featured),
      trending: Boolean(row.trending),
      breaking: Boolean(row.breaking),
      views_count: Number(row.views_count ?? 0),
      tags: Array.isArray(row.tags) ? row.tags.map(item => String(asRecord(item).tag ?? item)) : [],
      status: (row.status as AdminArticle['status']) ?? 'draft',
      created_at: String(row.created_at ?? ''),
      updated_at: String(row.updated_at ?? ''),
      deleted_at: typeof row.deleted_at === 'string' ? row.deleted_at : null,
    } satisfies AdminArticle;
  });
}

export async function upsertAdminArticle(payload: Partial<AdminArticle> & {
  title: string;
  slug: string;
  excerpt: string;
  content: string[];
  category_id: string;
  status: AdminArticle['status'];
  author_id?: string | null;
}) {
  // Demo mode: reject mutations
  if (isDemoMode()) {
    const { rejectDemoMutation } = await import('./demoTenant');
    rejectDemoMutation('Article creation/update');
  }
  
  const supabase = client();
  const { id, tags = [], ...rest } = payload;
  const tenantId = await getCurrentUserTenantId();
  const articlePayload = {
    tenant_id: tenantId,
    title: rest.title,
    slug: rest.slug,
    excerpt: rest.excerpt,
    content: rest.content,
    category_id: rest.category_id,
    author_id: rest.author_id || null,
    seo_title: rest.seo_title || null,
    seo_description: rest.seo_description || null,
    featured_image: rest.featured_image || null,
    media_type: rest.media_type ?? 'article',
    video_url: rest.video_url || null,
    status: rest.status,
    featured: Boolean(rest.featured),
    trending: Boolean(rest.trending),
    breaking: Boolean(rest.breaking),
    publish_at: rest.publish_at || null,
    read_time: rest.read_time || null,
  };

  const articleResult = id
    ? await supabase.from('articles').update(articlePayload).eq('id', id).select('*').single()
    : await supabase.from('articles').insert(articlePayload).select('*').single();

  if (articleResult.error) throw articleResult.error;

  const articleId = articleResult.data.id as string;
  await supabase.from('article_tags').delete().eq('article_id', articleId);
  if (tags.length) {
    const tagRows = tags.map((tag: string) => ({ article_id: articleId, tag }));
    const tagResult = await supabase.from('article_tags').insert(tagRows);
    if (tagResult.error) throw tagResult.error;
  }

  return articleResult.data;
}

export async function deleteAdminArticle(id: string) {
  // Demo mode: reject mutations
  if (isDemoMode()) {
    const { rejectDemoMutation } = await import('./demoTenant');
    rejectDemoMutation('Article deletion');
  }
  
  const tenantId = await getCurrentUserTenantId();
  const supabase = client();
  const { error } = await supabase.from('articles').update({ deleted_at: new Date().toISOString() }).eq('id', id).eq('tenant_id', tenantId);
  if (error) throw error;
}

export async function setArticleStatus(id: string, status: AdminArticle['status'], publishAt?: string | null) {
  // Demo mode: reject mutations
  if (isDemoMode()) {
    const { rejectDemoMutation } = await import('./demoTenant');
    rejectDemoMutation('Article status change');
  }
  
  const tenantId = await getCurrentUserTenantId();
  const supabase = client();
  const { error } = await supabase.from('articles').update({
    status,
    publish_at: publishAt ?? (status === 'published' ? new Date().toISOString() : null),
  }).eq('id', id).eq('tenant_id', tenantId);
  if (error) throw error;
}

export async function listAdminCategories() {
  // Demo mode: return static demo data
  if (isDemoMode()) {
    const { DEMO_ADMIN_CATEGORIES } = await import('./demoTenant');
    return Promise.resolve(DEMO_ADMIN_CATEGORIES);
  }
  
  const tenantId = await getCurrentUserTenantId();
  const supabase = client();
  const { data, error } = await supabase.from('categories').select('*').eq('tenant_id', tenantId).is('deleted_at', null).order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as AdminCategory[];
}

export async function upsertAdminCategory(payload: Partial<AdminCategory> & { name: string; slug: string }) {
  // Demo mode: reject mutations
  if (isDemoMode()) {
    const { rejectDemoMutation } = await import('./demoTenant');
    rejectDemoMutation('Category creation/update');
  }
  
  const supabase = client();
  const tenantId = await getCurrentUserTenantId();
  const body = {
    tenant_id: tenantId,
    name: payload.name,
    slug: payload.slug,
    description: payload.description ?? null,
    sort_order: payload.sort_order ?? 0,
    is_featured: Boolean(payload.is_featured),
    seo_title: payload.seo_title ?? null,
    seo_description: payload.seo_description ?? null,
  };
  const result = payload.id
    ? await supabase.from('categories').update(body).eq('id', payload.id).select('*').single()
    : await supabase.from('categories').insert(body).select('*').single();
  if (result.error) throw result.error;
  return result.data;
}

export async function deleteAdminCategory(id: string) {
  // Demo mode: reject mutations
  if (isDemoMode()) {
    const { rejectDemoMutation } = await import('./demoTenant');
    rejectDemoMutation('Category deletion');
  }
  
  const tenantId = await getCurrentUserTenantId();
  const supabase = client();
  const { error } = await supabase.from('categories').update({ deleted_at: new Date().toISOString() }).eq('id', id).eq('tenant_id', tenantId);
  if (error) throw error;
}

export async function listAdminMedia() {
  // Demo mode: return static demo data
  if (isDemoMode()) {
    const { DEMO_ADMIN_MEDIA } = await import('./demoTenant');
    return Promise.resolve(DEMO_ADMIN_MEDIA);
  }
  
  const tenantId = await getCurrentUserTenantId();
  const supabase = client();
  const { data, error } = await supabase.from('media').select('*').eq('tenant_id', tenantId).is('deleted_at', null).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as AdminMediaItem[];
}

export async function uploadAdminMedia(file: File, options?: { alt_text?: string; caption?: string; is_featured?: boolean }) {
  // Demo mode: reject mutations
  if (isDemoMode()) {
    const { rejectDemoMutation } = await import('./demoTenant');
    rejectDemoMutation('Media upload');
  }
  
  const tenantId = await getCurrentUserTenantId();
  const supabase = client();
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `media/${tenantId}/${crypto.randomUUID()}.${ext}`;
  const upload = await supabase.storage.from('media').upload(path, file, { upsert: false, contentType: file.type });
  if (upload.error) throw upload.error;
  const { data: publicUrl } = supabase.storage.from('media').getPublicUrl(upload.data.path);
  const row = await supabase.from('media').insert({
    tenant_id: tenantId,
    file_name: file.name,
    file_path: upload.data.path,
    storage_bucket: 'media',
    mime_type: file.type || 'image/jpeg',
    file_size: file.size,
    alt_text: options?.alt_text ?? null,
    caption: options?.caption ?? null,
    is_featured: Boolean(options?.is_featured),
  }).select('*').single();
  if (row.error) throw row.error;
  return { ...row.data, publicUrl: publicUrl.publicUrl };
}

export async function deleteAdminMedia(id: string, filePath: string) {
  // Demo mode: reject mutations
  if (isDemoMode()) {
    const { rejectDemoMutation } = await import('./demoTenant');
    rejectDemoMutation('Media deletion');
  }
  
  const tenantId = await getCurrentUserTenantId();
  const supabase = client();
  const file = await supabase.storage.from('media').remove([filePath]);
  if (file.error) throw file.error;
  const { error } = await supabase.from('media').update({ deleted_at: new Date().toISOString() }).eq('id', id).eq('tenant_id', tenantId);
  if (error) throw error;
}

export async function updateAdminMedia(
  id: string,
  payload: Partial<AdminMediaItem> & { alt_text?: string | null; caption?: string | null; is_featured?: boolean },
) {
  // Demo mode: reject mutations
  if (isDemoMode()) {
    const { rejectDemoMutation } = await import('./demoTenant');
    rejectDemoMutation('Media update');
  }
  
  const tenantId = await getCurrentUserTenantId();
  const supabase = client();
  const { data, error } = await supabase
    .from('media')
    .update({
      alt_text: payload.alt_text ?? null,
      caption: payload.caption ?? null,
      is_featured: Boolean(payload.is_featured),
      file_name: payload.file_name,
      file_path: payload.file_path,
      storage_bucket: payload.storage_bucket,
      mime_type: payload.mime_type,
      file_size: payload.file_size,
      width: payload.width ?? null,
      height: payload.height ?? null,
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function listAdminReporters() {
  // Demo mode: return static demo data
  if (isDemoMode()) {
    const { DEMO_ADMIN_REPORTERS } = await import('./demoTenant');
    return Promise.resolve(DEMO_ADMIN_REPORTERS);
  }
  
  const tenantId = await getCurrentUserTenantId();
  const supabase = client();
  const { data, error } = await supabase
    .from('reporters')
    .select('*, user:users(id, email, role:roles(slug, name))')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: Record<string, unknown>) => {
    const user = asRecord(row.user);
    const role = Array.isArray(user.role) ? user.role[0] : asRecord(user.role);
    return {
      id: String(row.id),
      full_name: String(row.full_name ?? ''),
      slug: String(row.slug ?? ''),
      bio: typeof row.bio === 'string' ? row.bio : null,
      specialty: typeof row.specialty === 'string' ? row.specialty : null,
      avatar_url: typeof row.avatar_url === 'string' ? row.avatar_url : null,
      status: String(row.status ?? 'active'),
      social_links: asRecord(row.social_links) as Record<string, string>,
      user_id: typeof row.user_id === 'string' ? row.user_id : null,
      created_at: String(row.created_at ?? ''),
      updated_at: String(row.updated_at ?? ''),
      deleted_at: typeof row.deleted_at === 'string' ? row.deleted_at : null,
      email: typeof user.email === 'string' ? user.email : null,
      role_slug: typeof role.slug === 'string' ? role.slug : null,
    } satisfies AdminReporter;
  });
}

export async function upsertAdminReporter(payload: Partial<AdminReporter> & { full_name: string; slug: string }) {
  // Demo mode: reject mutations
  if (isDemoMode()) {
    const { rejectDemoMutation } = await import('./demoTenant');
    rejectDemoMutation('Reporter creation/update');
  }
  
  const tenantId = await getCurrentUserTenantId();
  const supabase = client();
  const body = {
    tenant_id: tenantId,
    full_name: payload.full_name,
    slug: payload.slug,
    bio: payload.bio ?? null,
    specialty: payload.specialty ?? null,
    avatar_url: payload.avatar_url ?? null,
    status: payload.status ?? 'active',
    social_links: payload.social_links ?? {},
    user_id: payload.user_id ?? null,
  };
  const result = payload.id
    ? await supabase.from('reporters').update(body).eq('id', payload.id).select('*').single()
    : await supabase.from('reporters').insert(body).select('*').single();
  if (result.error) throw result.error;
  return result.data;
}

export async function deleteAdminReporter(id: string) {
  // Demo mode: reject mutations
  if (isDemoMode()) {
    const { rejectDemoMutation } = await import('./demoTenant');
    rejectDemoMutation('Reporter deletion');
  }
  
  const tenantId = await getCurrentUserTenantId();
  const supabase = client();
  const { error } = await supabase.from('reporters').update({ deleted_at: new Date().toISOString() }).eq('id', id).eq('tenant_id', tenantId);
  if (error) throw error;
}

export async function listAdminAds() {
  // Demo mode: return static demo data
  if (isDemoMode()) {
    const { DEMO_ADMIN_ADS } = await import('./demoTenant');
    return Promise.resolve(DEMO_ADMIN_ADS);
  }
  
  const tenantId = await getCurrentUserTenantId();
  const supabase = client();
  const { data, error } = await supabase.from('advertisements').select('*').eq('tenant_id', tenantId).is('deleted_at', null).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as AdminAd[];
}

export async function upsertAdminAd(payload: Partial<AdminAd> & {
  advertiser_name: string;
  title: string;
  placement: string;
  campaign_id?: string | null;
  sponsored_article_id?: string | null;
}) {
  // Demo mode: reject mutations
  if (isDemoMode()) {
    const { rejectDemoMutation } = await import('./demoTenant');
    rejectDemoMutation('Advertisement creation/update');
  }
  
  const tenantId = await getCurrentUserTenantId();
  const supabase = client();
  const body = {
    tenant_id: tenantId,
    placement: payload.placement,
    ad_type: payload.ad_type ?? 'direct',
    advertiser_name: payload.advertiser_name,
    title: payload.title,
    target_url: payload.target_url ?? null,
    banner_url: payload.banner_url ?? null,
    position: payload.position ?? null,
    start_date: payload.start_date ?? null,
    end_date: payload.end_date ?? null,
    click_count: payload.click_count ?? 0,
    impression_count: payload.impression_count ?? 0,
    is_active: Boolean(payload.is_active ?? true),
    campaign_id: payload.campaign_id ?? null,
    sponsored_article_id: payload.sponsored_article_id ?? null,
  };
  const result = payload.id
    ? await supabase.from('advertisements').update(body).eq('id', payload.id).select('*').single()
    : await supabase.from('advertisements').insert(body).select('*').single();
  if (result.error) throw result.error;
  return result.data;
}

export async function deleteAdminAd(id: string) {
  // Demo mode: reject mutations
  if (isDemoMode()) {
    const { rejectDemoMutation } = await import('./demoTenant');
    rejectDemoMutation('Advertisement deletion');
  }
  
  const tenantId = await getCurrentUserTenantId();
  const supabase = client();
  const { error } = await supabase.from('advertisements').update({ deleted_at: new Date().toISOString() }).eq('id', id).eq('tenant_id', tenantId);
  if (error) throw error;
}

export async function listSeoSettings() {
  // Demo mode: return static demo data
  if (isDemoMode()) {
    const { DEMO_ADMIN_SEO_SETTINGS } = await import('./demoTenant');
    return Promise.resolve(DEMO_ADMIN_SEO_SETTINGS);
  }
  
  const tenantId = await getCurrentUserTenantId();
  const supabase = client();
  const { data, error } = await supabase.from('seo_settings').select('*').eq('tenant_id', tenantId).is('deleted_at', null).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(row => ({
    ...row,
    schema_json: asRecord((row as Record<string, unknown>).schema_json),
  })) as SeoSetting[];
}

export async function upsertSeoSetting(payload: Partial<SeoSetting> & { page_path: string }) {
  // Demo mode: reject mutations
  if (isDemoMode()) {
    const { rejectDemoMutation } = await import('./demoTenant');
    rejectDemoMutation('SEO settings update');
  }
  
  const tenantId = await getCurrentUserTenantId();
  const supabase = client();
  const body = {
    tenant_id: tenantId,
    page_path: payload.page_path,
    meta_title: payload.meta_title ?? null,
    meta_description: payload.meta_description ?? null,
    og_title: payload.og_title ?? null,
    og_description: payload.og_description ?? null,
    twitter_title: payload.twitter_title ?? null,
    twitter_description: payload.twitter_description ?? null,
    schema_json: payload.schema_json ?? {},
    canonical_url: payload.canonical_url ?? null,
    is_indexed: Boolean(payload.is_indexed ?? true),
  };
  const result = payload.id
    ? await supabase.from('seo_settings').update(body).eq('id', payload.id).select('*').single()
    : await supabase.from('seo_settings').insert(body).select('*').single();
  if (result.error) throw result.error;
  return result.data;
}

export async function listNotifications() {
  // Demo mode: return static demo data
  if (isDemoMode()) {
    const { DEMO_ADMIN_NOTIFICATIONS } = await import('./demoTenant');
    return Promise.resolve(DEMO_ADMIN_NOTIFICATIONS);
  }
  
  const tenantId = await getCurrentUserTenantId();
  const supabase = client();
  const { data, error } = await supabase.from('notifications').select('*').eq('tenant_id', tenantId).is('deleted_at', null).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as NotificationRow[];
}

export async function upsertNotification(payload: Partial<NotificationRow> & { title: string; message: string }) {
  // Demo mode: reject mutations
  if (isDemoMode()) {
    const { rejectDemoMutation } = await import('./demoTenant');
    rejectDemoMutation('Notification creation/update');
  }
  
  const tenantId = await getCurrentUserTenantId();
  const supabase = client();
  const body = {
    tenant_id: tenantId,
    title: payload.title,
    message: payload.message,
    channel: payload.channel ?? 'in-app',
    status: payload.status ?? 'draft',
    scheduled_at: payload.scheduled_at ?? null,
    sent_at: payload.sent_at ?? null,
  };
  const result = payload.id
    ? await supabase.from('notifications').update(body).eq('id', payload.id).select('*').single()
    : await supabase.from('notifications').insert(body).select('*').single();
  if (result.error) throw result.error;
  return result.data;
}

export async function deleteNotification(id: string) {
  // Demo mode: reject mutations
  if (isDemoMode()) {
    const { rejectDemoMutation } = await import('./demoTenant');
    rejectDemoMutation('Notification deletion');
  }
  
  const tenantId = await getCurrentUserTenantId();
  const supabase = client();
  const { error } = await supabase.from('notifications').update({ deleted_at: new Date().toISOString() }).eq('id', id).eq('tenant_id', tenantId);
  if (error) throw error;
}

export async function listAuditLogs() {
  // Demo mode: return static demo data
  if (isDemoMode()) {
    const { DEMO_ADMIN_AUDIT_LOGS } = await import('./demoTenant');
    return Promise.resolve(DEMO_ADMIN_AUDIT_LOGS);
  }
  
  const supabase = client();
  const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(250);
  if (error) throw error;
  return (data ?? []).map(row => ({
    ...row,
    metadata: asRecord((row as Record<string, unknown>).metadata),
  })) as AuditLogRow[];
}

export async function trackAnalyticsEvent(payload: {
  event_type: string;
  page_path?: string | null;
  article_id?: string | null;
  category_id?: string | null;
  metadata?: Record<string, unknown>;
}) {
  // Demo mode: silently ignore analytics
  if (isDemoMode()) {
    return Promise.resolve();
  }
  
  const supabase = client();
  const { sessionId, referrer, userAgent } = getBrowserContext();
  const { error } = await supabase.rpc('track_analytics_event', {
    p_event_type: payload.event_type,
    p_page_path: payload.page_path ?? null,
    p_article_id: payload.article_id ?? null,
    p_category_id: payload.category_id ?? null,
    p_session_id: sessionId,
    p_referrer: referrer,
    p_user_agent: userAgent,
    p_metadata: payload.metadata ?? {},
  });
  if (error) throw error;
}

export async function loadSiteSettings() {
  // Demo mode: return static demo settings
  if (isDemoMode()) {
    const { DEMO_SITE_SETTINGS } = await import('./demoTenant');
    return Promise.resolve(DEMO_SITE_SETTINGS);
  }
  
  const tenantId = await getCurrentUserTenantId();
  const supabase = client();
  const { data, error } = await supabase.from('site_settings').select('*').eq('tenant_id', tenantId).is('deleted_at', null).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    site_name: data.site_name,
    logo_url: data.logo_url,
    contact_name: data.contact_name,
    contact_phone: data.contact_phone,
    contact_email: data.contact_email,
    social_links: (data.social_links as Record<string, string>) ?? {},
    footer_text: data.footer_text,
    theme_config: sanitizeThemeConfig(data.theme_config),
  } as SiteSettings;
}

export async function upsertSiteSettings(payload: Partial<SiteSettings> & { site_name: string }) {
  // Demo mode: reject mutations
  if (isDemoMode()) {
    const { rejectDemoMutation } = await import('./demoTenant');
    rejectDemoMutation('Settings update');
  }
  
  const tenantId = await getCurrentUserTenantId();
  const supabase = client();
  const { data: existing } = await supabase.from('site_settings').select('id').eq('tenant_id', tenantId).is('deleted_at', null).maybeSingle();
  const body = {
    tenant_id: tenantId,
    site_name: payload.site_name,
    logo_url: payload.logo_url ?? null,
    contact_name: payload.contact_name ?? null,
    contact_phone: payload.contact_phone ?? null,
    contact_email: payload.contact_email ?? null,
    social_links: payload.social_links ?? {},
    footer_text: payload.footer_text ?? null,
    theme_config: sanitizeThemeConfig(payload.theme_config),
  };
  const result = existing?.id
    ? await supabase.from('site_settings').update(body).eq('id', existing.id).select('*').single()
    : await supabase.from('site_settings').insert(body).select('*').single();
  if (result.error) throw result.error;
  return result.data
    ? {
        site_name: result.data.site_name,
        logo_url: result.data.logo_url,
        contact_name: result.data.contact_name,
        contact_phone: result.data.contact_phone,
        contact_email: result.data.contact_email,
        social_links: (result.data.social_links as Record<string, string>) ?? {},
        footer_text: result.data.footer_text,
        theme_config: sanitizeThemeConfig(result.data.theme_config),
      }
    : result.data;
}

export async function markAuditLog(payload: {
  action: string;
  entity_type: string;
  entity_id?: string | null;
  metadata?: Record<string, unknown>;
  ip_address?: string | null;
}) {
  // Demo mode: silently ignore audit logging
  if (isDemoMode()) {
    return Promise.resolve();
  }
  
  try {
    const supabase = client();
    const { error } = await supabase.from('audit_logs').insert({
      action: payload.action,
      entity_type: payload.entity_type,
      entity_id: payload.entity_id ?? null,
      metadata: payload.metadata ?? {},
      ip_address: payload.ip_address ?? null,
    });
    if (error) {
      return;
    }
  } catch {
    // Audit logging is non-critical — never block the main operation
  }
}

export async function listAdminRoles() {
  // Demo mode: return static demo data
  if (isDemoMode()) {
    const { DEMO_ADMIN_ROLES } = await import('./demoTenant');
    return Promise.resolve(DEMO_ADMIN_ROLES);
  }
  
  const supabase = client();
  const [rolesResult, usersResult] = await Promise.all([
    supabase.from('roles').select('*').is('deleted_at', null).order('created_at', { ascending: true }),
    supabase.from('users').select('id, role_id').is('deleted_at', null),
  ]);

  if (rolesResult.error) throw rolesResult.error;
  if (usersResult.error) throw usersResult.error;

  const counts = new Map<string, number>();
  (usersResult.data ?? []).forEach((user: Record<string, unknown>) => {
    const roleId = typeof user.role_id === 'string' ? user.role_id : null;
    if (!roleId) return;
    counts.set(roleId, (counts.get(roleId) ?? 0) + 1);
  });

  return (rolesResult.data ?? []).map(row => ({
    ...(row as Record<string, unknown>),
    user_count: counts.get(String((row as Record<string, unknown>).id)) ?? 0,
  })) as AdminRole[];
}

export async function upsertAdminRole(payload: Partial<AdminRole> & { name: string; slug: string }) {
  // Demo mode: reject mutations
  if (isDemoMode()) {
    const { rejectDemoMutation } = await import('./demoTenant');
    rejectDemoMutation('Role creation/update');
  }
  
  const supabase = client();
  const tenantId = await getCurrentUserTenantId();
  const body = {
    tenant_id: tenantId,
    name: payload.name,
    slug: payload.slug,
    description: payload.description ?? null,
    is_system: Boolean(payload.is_system ?? true),
  };
  const result = payload.id
    ? await supabase.from('roles').update(body).eq('id', payload.id).select('*').single()
    : await supabase.from('roles').insert(body).select('*').single();
  if (result.error) throw result.error;
  return result.data;
}

export async function deleteAdminRole(id: string) {
  // Demo mode: reject mutations
  if (isDemoMode()) {
    const { rejectDemoMutation } = await import('./demoTenant');
    rejectDemoMutation('Role deletion');
  }
  
  const supabase = client();
  const { error } = await supabase.from('roles').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function listAdminUsers() {
  // Demo mode: return static demo data
  if (isDemoMode()) {
    const { DEMO_ADMIN_USERS } = await import('./demoTenant');
    return Promise.resolve(DEMO_ADMIN_USERS);
  }
  
  const supabase = client();
  const { data, error } = await supabase
    .from('users')
    .select('*, role:roles(id, name, slug)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;

  return (data ?? []).map((row: Record<string, unknown>) => {
    const role = Array.isArray(row.role) ? row.role[0] : asRecord(row.role);
    return {
      id: String(row.id),
      auth_user_id: typeof row.auth_user_id === 'string' ? row.auth_user_id : null,
      role_id: typeof row.role_id === 'string' ? row.role_id : null,
      full_name: String(row.full_name ?? ''),
      email: String(row.email ?? ''),
      avatar_url: typeof row.avatar_url === 'string' ? row.avatar_url : null,
      phone: typeof row.phone === 'string' ? row.phone : null,
      bio: typeof row.bio === 'string' ? row.bio : null,
      status: String(row.status ?? 'active'),
      last_login_at: typeof row.last_login_at === 'string' ? row.last_login_at : null,
      created_at: String(row.created_at ?? ''),
      updated_at: String(row.updated_at ?? ''),
      deleted_at: typeof row.deleted_at === 'string' ? row.deleted_at : null,
      role_name: typeof role.name === 'string' ? role.name : null,
      role_slug: typeof role.slug === 'string' ? role.slug : null,
    } satisfies AdminUser;
  });
}

export async function upsertAdminUser(payload: Partial<AdminUser> & { full_name: string; email: string }) {
  // Demo mode: reject mutations
  if (isDemoMode()) {
    const { rejectDemoMutation } = await import('./demoTenant');
    rejectDemoMutation('User creation/update');
  }
  
  const supabase = client();
  const body = {
    full_name: payload.full_name,
    email: payload.email,
    role_id: payload.role_id ?? null,
    avatar_url: payload.avatar_url ?? null,
    phone: payload.phone ?? null,
    bio: payload.bio ?? null,
    status: payload.status ?? 'active',
    last_login_at: payload.last_login_at ?? null,
  };
  const result = payload.id
    ? await supabase.from('users').update(body).eq('id', payload.id).select('*').single()
    : await supabase.from('users').insert(body).select('*').single();
  if (result.error) throw result.error;
  return result.data;
}

export async function deleteAdminUser(id: string) {
  // Demo mode: reject mutations
  if (isDemoMode()) {
    const { rejectDemoMutation } = await import('./demoTenant');
    rejectDemoMutation('User deletion');
  }
  
  const supabase = client();
  const { error } = await supabase.from('users').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function listBreakingNews() {
  // Demo mode: return static demo data
  if (isDemoMode()) {
    const { DEMO_ADMIN_BREAKING_NEWS } = await import('./demoTenant');
    return Promise.resolve(DEMO_ADMIN_BREAKING_NEWS);
  }
  
  const tenantId = await getCurrentUserTenantId();
  const supabase = client();
  const { data, error } = await supabase.from('breaking_news').select('*').eq('tenant_id', tenantId).is('deleted_at', null).order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as BreakingNewsRow[];
}

export async function upsertBreakingNews(payload: Partial<BreakingNewsRow> & { headline: string }) {
  // Demo mode: reject mutations
  if (isDemoMode()) {
    const { rejectDemoMutation } = await import('./demoTenant');
    rejectDemoMutation('Breaking news creation/update');
  }
  
  const tenantId = await getCurrentUserTenantId();
  const supabase = client();
  const body = {
    tenant_id: tenantId,
    headline: payload.headline,
    link_url: payload.link_url ?? null,
    is_active: Boolean(payload.is_active ?? true),
    starts_at: payload.starts_at ?? null,
    ends_at: payload.ends_at ?? null,
    sort_order: payload.sort_order ?? 0,
  };
  const result = payload.id
    ? await supabase.from('breaking_news').update(body).eq('id', payload.id).select('*').single()
    : await supabase.from('breaking_news').insert(body).select('*').single();
  if (result.error) throw result.error;
  return result.data;
}

export async function deleteBreakingNews(id: string) {
  // Demo mode: reject mutations
  if (isDemoMode()) {
    const { rejectDemoMutation } = await import('./demoTenant');
    rejectDemoMutation('Breaking news deletion');
  }
  
  const tenantId = await getCurrentUserTenantId();
  const supabase = client();
  const { error } = await supabase.from('breaking_news').update({ deleted_at: new Date().toISOString() }).eq('id', id).eq('tenant_id', tenantId);
  if (error) throw error;
}

export async function listSubscriptions() {
  // Demo mode: return static demo data
  if (isDemoMode()) {
    const { DEMO_ADMIN_SUBSCRIPTIONS } = await import('./demoTenant');
    return Promise.resolve(DEMO_ADMIN_SUBSCRIPTIONS);
  }
  
  const tenantId = await getCurrentUserTenantId();
  const supabase = client();
  const { data, error } = await supabase.from('subscriptions').select('*').eq('tenant_id', tenantId).is('deleted_at', null).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as SubscriptionRow[];
}

export async function upsertSubscription(payload: Partial<SubscriptionRow> & { email: string }) {
  // Demo mode: reject mutations
  if (isDemoMode()) {
    const { rejectDemoMutation } = await import('./demoTenant');
    rejectDemoMutation('Subscription creation/update');
  }
  
  const tenantId = await getCurrentUserTenantId();
  const supabase = client();
  const body = {
    tenant_id: tenantId,
    email: normalizeEmail(payload.email),
    full_name: payload.full_name ?? null,
    status: payload.status ?? 'active',
    source: payload.source ?? null,
  };
  const result = payload.id
    ? await supabase.from('subscriptions').update(body).eq('id', payload.id).select('*').single()
    : await supabase.from('subscriptions').insert(body).select('*').single();
  if (result.error) throw result.error;
  return result.data;
}

export async function deleteSubscription(id: string) {
  // Demo mode: reject mutations
  if (isDemoMode()) {
    const { rejectDemoMutation } = await import('./demoTenant');
    rejectDemoMutation('Subscription deletion');
  }
  
  const tenantId = await getCurrentUserTenantId();
  const supabase = client();
  const { error } = await supabase.from('subscriptions').update({ deleted_at: new Date().toISOString() }).eq('id', id).eq('tenant_id', tenantId);
  if (error) throw error;
}

export async function createNewsletterSubscription(payload: { email: string; full_name?: string | null; source?: string | null }) {
  // Demo mode: silently ignore newsletter subscription
  if (isDemoMode()) {
    return Promise.resolve();
  }
  
  const supabase = client();
  const { sessionId, referrer, userAgent } = getBrowserContext();
  const { error } = await supabase.rpc('create_newsletter_subscription', {
    p_email: normalizeEmail(payload.email),
    p_full_name: payload.full_name ?? null,
    p_source: payload.source ?? null,
    p_session_id: sessionId,
    p_referrer: referrer,
    p_user_agent: userAgent,
  });
  if (error) throw error;
}

export async function listCampaigns() {
  // Demo mode: return static demo data
  if (isDemoMode()) {
    const { DEMO_ADMIN_CAMPAIGNS } = await import('./demoTenant');
    return Promise.resolve(DEMO_ADMIN_CAMPAIGNS);
  }
  
  const tenantId = await getCurrentUserTenantId();
  const supabase = client();
  const { data, error } = await supabase.from('campaigns').select('*').eq('tenant_id', tenantId).is('deleted_at', null).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as CampaignRow[];
}

export async function upsertCampaign(payload: Partial<CampaignRow> & { name: string; advertiser_name: string }) {
  // Demo mode: reject mutations
  if (isDemoMode()) {
    const { rejectDemoMutation } = await import('./demoTenant');
    rejectDemoMutation('Campaign creation/update');
  }
  
  const tenantId = await getCurrentUserTenantId();
  const supabase = client();
  const body = {
    tenant_id: tenantId,
    name: payload.name,
    advertiser_name: payload.advertiser_name,
    campaign_type: payload.campaign_type ?? 'direct',
    status: payload.status ?? 'draft',
    budget: payload.budget ?? 0,
    spent: payload.spent ?? 0,
    impressions: payload.impressions ?? 0,
    clicks: payload.clicks ?? 0,
    start_date: payload.start_date ?? null,
    end_date: payload.end_date ?? null,
  };
  const result = payload.id
    ? await supabase.from('campaigns').update(body).eq('id', payload.id).select('*').single()
    : await supabase.from('campaigns').insert(body).select('*').single();
  if (result.error) throw result.error;
  return result.data;
}

export async function deleteCampaign(id: string) {
  // Demo mode: reject mutations
  if (isDemoMode()) {
    const { rejectDemoMutation } = await import('./demoTenant');
    rejectDemoMutation('Campaign deletion');
  }
  
  const tenantId = await getCurrentUserTenantId();
  const supabase = client();
  const { error } = await supabase.from('campaigns').update({ deleted_at: new Date().toISOString() }).eq('id', id).eq('tenant_id', tenantId);
  if (error) throw error;
}

export async function listAnalyticsEvents(limit = 100) {
  // Demo mode: return empty analytics (demo doesn't track real analytics)
  if (isDemoMode()) {
    return Promise.resolve([]);
  }
  
  const supabase = client();
  const { data, error } = await supabase.from('analytics_events').select('*').order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []) as AnalyticsEventRow[];
}

// ═══════════════════════════════════════════════════════════════════════════
// PLUGIN MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

export type TenantPlugin = {
  id: string;
  tenant_id: string;
  plugin_key: string;
  enabled: boolean;
  configuration: Record<string, unknown>;
  installed_version: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * List all plugins for the current tenant
 */
export async function listTenantPlugins() {
  if (isDemoMode()) {
    // Demo mode: return empty array
    return [];
  }
  
  const tenantId = await getCurrentUserTenantId();
  const supabase = client();
  const { data, error } = await supabase
    .from('tenant_plugins')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return (data ?? []) as TenantPlugin[];
}

/**
 * Get a specific plugin configuration
 */
export async function getTenantPlugin(pluginKey: string) {
  if (isDemoMode()) {
    return null;
  }
  
  const tenantId = await getCurrentUserTenantId();
  const supabase = client();
  const { data, error } = await supabase
    .from('tenant_plugins')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('plugin_key', pluginKey)
    .maybeSingle();
  
  if (error) throw error;
  return data as TenantPlugin | null;
}

/**
 * Enable/disable a plugin
 */
export async function toggleTenantPlugin(pluginKey: string, enabled: boolean) {
  if (isDemoMode()) {
    const { rejectDemoMutation } = await import('./demoTenant');
    rejectDemoMutation('Plugin toggle');
  }
  
  const tenantId = await getCurrentUserTenantId();
  const supabase = client();
  
  // Check if plugin exists
  const existing = await getTenantPlugin(pluginKey);
  
  if (existing) {
    // Update existing
    const { error } = await supabase
      .from('tenant_plugins')
      .update({ enabled })
      .eq('id', existing.id);
    
    if (error) throw error;
  } else {
    // Insert new
    const { error } = await supabase
      .from('tenant_plugins')
      .insert({
        tenant_id: tenantId,
        plugin_key: pluginKey,
        enabled,
        configuration: {},
        installed_version: '1.0.0', // Default version
      });
    
    if (error) throw error;
  }
}

/**
 * Update plugin configuration
 */
export async function updateTenantPluginConfig(
  pluginKey: string,
  configuration: Record<string, unknown>
) {
  if (isDemoMode()) {
    const { rejectDemoMutation } = await import('./demoTenant');
    rejectDemoMutation('Plugin configuration update');
  }
  
  const tenantId = await getCurrentUserTenantId();
  const supabase = client();
  
  // Check if plugin exists
  const existing = await getTenantPlugin(pluginKey);
  
  if (existing) {
    // Update existing
    const { error } = await supabase
      .from('tenant_plugins')
      .update({ configuration })
      .eq('id', existing.id);
    
    if (error) throw error;
  } else {
    // Insert new with configuration
    const { error } = await supabase
      .from('tenant_plugins')
      .insert({
        tenant_id: tenantId,
        plugin_key: pluginKey,
        enabled: false,
        configuration,
        installed_version: '1.0.0',
      });
    
    if (error) throw error;
  }
}

/**
 * Delete a plugin configuration
 */
export async function deleteTenantPlugin(pluginKey: string) {
  if (isDemoMode()) {
    const { rejectDemoMutation } = await import('./demoTenant');
    rejectDemoMutation('Plugin deletion');
  }
  
  const tenantId = await getCurrentUserTenantId();
  const supabase = client();
  
  const { error } = await supabase
    .from('tenant_plugins')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('plugin_key', pluginKey);
  
  if (error) throw error;
}

// ═══════════════════════════════════════════════════════════════════════════
// SEO MANAGER PLUGIN - API FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

export interface TenantSEODefaults {
  id?: string;
  tenant_id?: string;
  
  // General SEO
  site_title?: string | null;
  site_description?: string | null;
  site_keywords?: string | null;
  canonical_base_url?: string | null;
  default_author?: string | null;
  default_language?: string | null;
  default_locale?: string | null;
  default_image_url?: string | null;
  
  // Robots Configuration
  robots_index: boolean;
  robots_follow: boolean;
  robots_archive: boolean;
  robots_snippet: boolean;
  robots_max_image_preview?: string | null;
  robots_max_snippet?: number | null;
  
  // Category/Tag Indexing
  category_indexing: boolean;
  tag_indexing: boolean;
  author_indexing: boolean;
  
  // Open Graph Defaults
  og_site_name?: string | null;
  og_type?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  og_image?: string | null;
  og_image_width?: number | null;
  og_image_height?: number | null;
  
  // Twitter/X Defaults
  twitter_card?: string | null;
  twitter_site?: string | null;
  twitter_creator?: string | null;
  twitter_title?: string | null;
  twitter_description?: string | null;
  twitter_image?: string | null;
  
  // Advanced Settings
  show_publication_schema: boolean;
  show_breadcrumb_schema: boolean;
  show_article_schema: boolean;
  
  created_at?: string;
  updated_at?: string;
}

/**
 * Get SEO defaults for the current tenant
 */
export async function getTenantSEODefaults(): Promise<TenantSEODefaults | null> {
  const tenantId = await getCurrentUserTenantId();
  const supabase = client();
  
  const { data, error } = await supabase
    .from('tenant_seo_defaults')
    .select('*')
    .eq('tenant_id', tenantId)
    .maybeSingle();
  
  if (error) {
    console.error('[SEO] Failed to load SEO defaults:', error);
    throw new Error('Failed to load SEO configuration');
  }
  
  return data;
}

/**
 * Get SEO defaults for a specific tenant (public - for rendering pages)
 */
export async function getPublicTenantSEODefaults(tenantId: string): Promise<TenantSEODefaults | null> {
  const supabase = client();
  
  const { data, error } = await supabase
    .from('tenant_seo_defaults')
    .select('*')
    .eq('tenant_id', tenantId)
    .maybeSingle();
  
  if (error) {
    console.error('[SEO] Failed to load public SEO defaults:', error);
    return null;
  }
  
  return data;
}

/**
 * Create or update SEO defaults for the current tenant
 */
export async function upsertTenantSEODefaults(seoData: Partial<TenantSEODefaults>): Promise<void> {
  if (isDemoMode()) {
    const { rejectDemoMutation } = await import('./demoTenant');
    rejectDemoMutation('SEO configuration update');
  }
  
  const tenantId = await getCurrentUserTenantId();
  const supabase = client();
  
  // Remove id and tenant_id from the data to prevent conflicts
  const { id, tenant_id, created_at, updated_at, ...dataToUpsert } = seoData;
  
  const { error } = await supabase
    .from('tenant_seo_defaults')
    .upsert({
      tenant_id: tenantId,
      ...dataToUpsert,
    }, {
      onConflict: 'tenant_id',
    });
  
  if (error) {
    console.error('[SEO] Failed to save SEO defaults:', error);
    throw new Error('Failed to save SEO configuration: ' + error.message);
  }
}

/**
 * Validate SEO configuration
 * Returns warnings and errors
 */
export function validateSEOConfig(seoData: Partial<TenantSEODefaults>): {
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Title length check
  if (seoData.site_title) {
    if (seoData.site_title.length < 10) {
      warnings.push('Site title is too short (recommended: 30-60 characters)');
    } else if (seoData.site_title.length > 70) {
      warnings.push('Site title is too long (recommended: 30-60 characters, max: 70)');
    }
  }
  
  // Description length check
  if (seoData.site_description) {
    if (seoData.site_description.length < 50) {
      warnings.push('Site description is too short (recommended: 120-160 characters)');
    } else if (seoData.site_description.length > 200) {
      warnings.push('Site description is too long (recommended: 120-160 characters, max: 200)');
    }
  }
  
  // Canonical URL validation
  if (seoData.canonical_base_url) {
    try {
      const url = new URL(seoData.canonical_base_url);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        errors.push('Canonical URL must start with http:// or https://');
      }
      if (url.hostname === 'localhost' || url.hostname.startsWith('127.')) {
        warnings.push('Canonical URL should not be localhost in production');
      }
    } catch {
      errors.push('Canonical URL is not valid');
    }
  } else {
    warnings.push('Canonical URL is not set - required for proper SEO');
  }
  
  // Image URL validation
  if (seoData.default_image_url) {
    try {
      new URL(seoData.default_image_url);
    } catch {
      errors.push('Default image URL is not valid');
    }
  }
  
  // OG Image validation
  if (seoData.og_image) {
    try {
      new URL(seoData.og_image);
    } catch {
      errors.push('Open Graph image URL is not valid');
    }
  }
  
  // Twitter Image validation
  if (seoData.twitter_image) {
    try {
      new URL(seoData.twitter_image);
    } catch {
      errors.push('Twitter image URL is not valid');
    }
  }
  
  // Twitter handle validation
  if (seoData.twitter_site && !seoData.twitter_site.startsWith('@')) {
    warnings.push('Twitter site handle should start with @ (e.g., @YourSite)');
  }
  if (seoData.twitter_creator && !seoData.twitter_creator.startsWith('@')) {
    warnings.push('Twitter creator handle should start with @ (e.g., @YourName)');
  }
  
  return { errors, warnings };
}

/**
 * Get default SEO configuration for new tenants
 */
export function getDefaultSEOConfig(siteName?: string, domain?: string): TenantSEODefaults {
  return {
    site_title: siteName || 'My News Site',
    site_description: 'Your trusted source for news and updates',
    site_keywords: 'news, updates, latest news',
    canonical_base_url: domain ? `https://${domain}` : '',
    default_language: 'en',
    default_locale: 'en_US',
    robots_index: true,
    robots_follow: true,
    robots_archive: true,
    robots_snippet: true,
    robots_max_image_preview: 'large',
    robots_max_snippet: -1,
    category_indexing: true,
    tag_indexing: true,
    author_indexing: true,
    og_type: 'website',
    twitter_card: 'summary_large_image',
    show_publication_schema: true,
    show_breadcrumb_schema: true,
    show_article_schema: true,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// XML SITEMAP PLUGIN — API FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Configuration stored in tenant_plugins.configuration JSONB.
 * Mirrors the fields the admin UI exposes and the Edge Function reads.
 */
export interface XmlSitemapConfig {
  include_articles: boolean;
  include_categories: boolean;
  include_authors: boolean;
  changefreq_articles: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  changefreq_categories: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority_homepage: string;
  priority_articles: string;
  priority_categories: string;
  priority_authors: string;
  max_urls: number;
  last_generated_at: string | null;
  url_count: number;
}

export const DEFAULT_SITEMAP_CONFIG: XmlSitemapConfig = {
  include_articles: true,
  include_categories: true,
  include_authors: false,
  changefreq_articles: 'weekly',
  changefreq_categories: 'daily',
  priority_homepage: '1.0',
  priority_articles: '0.8',
  priority_categories: '0.6',
  priority_authors: '0.4',
  max_urls: 50000,
  last_generated_at: null,
  url_count: 0,
};

/**
 * Load the XML Sitemap plugin state + config for the current tenant.
 * Returns { enabled, config } — enabled=false if no row exists yet.
 */
export async function getXmlSitemapState(): Promise<{
  enabled: boolean;
  config: XmlSitemapConfig;
  tenantPluginId: string | null;
}> {
  const tenantId = await getCurrentUserTenantId();
  const supabase = client();

  const { data, error } = await supabase
    .from('tenant_plugins')
    .select('id, enabled, configuration')
    .eq('tenant_id', tenantId)
    .eq('plugin_key', 'xml-sitemap')
    .maybeSingle();

  if (error) {
    console.error('[XML Sitemap] Failed to load plugin state:', error);
    throw new Error('Failed to load XML Sitemap configuration');
  }

  if (!data) {
    return { enabled: false, config: { ...DEFAULT_SITEMAP_CONFIG }, tenantPluginId: null };
  }

  const merged: XmlSitemapConfig = {
    ...DEFAULT_SITEMAP_CONFIG,
    ...(data.configuration as Partial<XmlSitemapConfig>),
  };

  return { enabled: data.enabled, config: merged, tenantPluginId: data.id };
}

/**
 * Save the XML Sitemap configuration and enabled state.
 * Creates the row if it does not yet exist.
 */
export async function saveXmlSitemapConfig(
  enabled: boolean,
  config: XmlSitemapConfig,
): Promise<void> {
  if (isDemoMode()) {
    const { rejectDemoMutation } = await import('./demoTenant');
    rejectDemoMutation('XML Sitemap configuration update');
  }

  const tenantId = await getCurrentUserTenantId();
  const supabase = client();

  // Strip runtime-only fields that should not be persisted from the UI form
  const { last_generated_at, url_count, ...persistableConfig } = config;

  const { error } = await supabase
    .from('tenant_plugins')
    .upsert(
      {
        tenant_id: tenantId,
        plugin_key: 'xml-sitemap',
        enabled,
        configuration: persistableConfig,
        installed_version: '1.0.0',
      },
      { onConflict: 'tenant_id,plugin_key' },
    );

  if (error) {
    console.error('[XML Sitemap] Failed to save config:', error);
    throw new Error('Failed to save XML Sitemap configuration: ' + error.message);
  }
}

/**
 * Get the URL counts for the sitemap preview.
 * Uses the SECURITY DEFINER function that validates ownership.
 */
export async function getSitemapUrlCount(tenantId: string): Promise<{
  article_count: number;
  category_count: number;
  author_count: number;
}> {
  const supabase = client();

  const { data, error } = await supabase
    .rpc('get_sitemap_url_count', { p_tenant_id: tenantId })
    .maybeSingle();

  if (error) {
    console.error('[XML Sitemap] Failed to count URLs:', error);
    throw new Error('Failed to count sitemap URLs');
  }

  return {
    article_count: Number(data?.article_count ?? 0),
    category_count: Number(data?.category_count ?? 0),
    author_count: Number(data?.author_count ?? 0),
  };
}

/**
 * Record that the sitemap was regenerated (stores timestamp + url_count in config).
 * Merges into existing configuration rather than overwriting.
 */
export async function recordSitemapGenerated(urlCount: number): Promise<void> {
  if (isDemoMode()) return;

  const tenantId = await getCurrentUserTenantId();
  const supabase = client();

  // Read current config, merge timestamp
  const { data } = await supabase
    .from('tenant_plugins')
    .select('configuration')
    .eq('tenant_id', tenantId)
    .eq('plugin_key', 'xml-sitemap')
    .maybeSingle();

  const existing = (data?.configuration ?? {}) as Record<string, unknown>;

  const { error } = await supabase
    .from('tenant_plugins')
    .update({
      configuration: {
        ...existing,
        last_generated_at: new Date().toISOString(),
        url_count: urlCount,
      },
    })
    .eq('tenant_id', tenantId)
    .eq('plugin_key', 'xml-sitemap');

  if (error) {
    console.error('[XML Sitemap] Failed to record generation:', error);
  }
}


// ═══════════════════════════════════════════════════════════════════════════
// COMPREHENSIVE ANALYTICS FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

export interface AnalyticsOverview {
  totalPageViews: number;
  uniqueVisitors: number;
  totalSessions: number;
  avgSessionDuration: number;
  pagesPerSession: number;
  returningVisitors: number;
  newVisitors: number;
  publishedArticles: number;
}

export interface RealTimeVisitor {
  sessionId: string;
  currentPage: string;
  lastSeen: string;
  userAgent: string;
}

export interface RecentPageView {
  id: string;
  pagePath: string;
  articleTitle: string | null;
  timestamp: string;
  referrer: string | null;
}

export interface TopArticle {
  id: string;
  title: string;
  slug: string;
  views: number;
  uniqueVisitors: number;
  avgReadingTime: number;
  publishedAt: string;
  trend: number; // percentage change vs previous period
}

export interface TrafficSource {
  source: string;
  category: string; // 'Direct', 'Search', 'Social', 'Referral'
  visits: number;
  percentage: number;
  referralUrl?: string;
}

export interface DeviceStats {
  device: string;
  count: number;
  percentage: number;
}

export interface BrowserStats {
  browser: string;
  count: number;
  percentage: number;
}

export interface OSStats {
  os: string;
  count: number;
  percentage: number;
}

export interface GeographyStats {
  country: string | null;
  state: string | null;
  city: string | null;
  count: number;
}

export interface EngagementMetrics {
  avgTimeOnArticle: number;
  avgSessionDuration: number;
  pagesPerSession: number;
  bounceRate: number;
  mostEngagedArticles: Array<{ id: string; title: string; avgTime: number }>;
}

export interface TrendDataPoint {
  date: string;
  views: number;
  visitors: number;
  sessions: number;
}

/**
 * Get comprehensive analytics overview for tenant
 */
export async function getAnalyticsOverview(dateRange?: { start: Date; end: Date }): Promise<AnalyticsOverview> {
  if (isDemoMode()) {
    return {
      totalPageViews: 0,
      uniqueVisitors: 0,
      totalSessions: 0,
      avgSessionDuration: 0,
      pagesPerSession: 0,
      returningVisitors: 0,
      newVisitors: 0,
      publishedArticles: 0
    };
  }

  const tenantId = await getCurrentUserTenantId();
  const supabase = client();

  // Build date filter
  let dateFilter = '';
  if (dateRange) {
    dateFilter = `created_at.gte.${dateRange.start.toISOString()},created_at.lte.${dateRange.end.toISOString()}`;
  }

  // Get page view events
  const eventsQuery = supabase
    .from('analytics_events')
    .select('event_type, session_id, created_at, metadata')
    .eq('event_type', 'page_view');

  if (dateFilter) {
    const [start, end] = dateFilter.split(',');
    eventsQuery.gte('created_at', dateRange!.start.toISOString());
    eventsQuery.lte('created_at', dateRange!.end.toISOString());
  }

  const { data: events, error: eventsError } = await eventsQuery;
  if (eventsError) throw eventsError;

  // Calculate metrics
  const totalPageViews = events?.length || 0;
  const uniqueSessions = new Set(events?.map(e => e.session_id).filter(Boolean));
  const uniqueVisitors = uniqueSessions.size;
  const totalSessions = uniqueSessions.size;

  // Calculate session metrics
  const sessionEvents = new Map<string, number>();
  const sessionDurations = new Map<string, { first: number; last: number }>();

  events?.forEach(event => {
    if (!event.session_id) return;
    
    // Count events per session
    sessionEvents.set(event.session_id, (sessionEvents.get(event.session_id) || 0) + 1);
    
    // Track session duration
    const timestamp = new Date(event.created_at).getTime();
    const existing = sessionDurations.get(event.session_id);
    if (!existing) {
      sessionDurations.set(event.session_id, { first: timestamp, last: timestamp });
    } else {
      existing.last = Math.max(existing.last, timestamp);
    }
  });

  // Calculate averages
  let totalDuration = 0;
  let totalPages = 0;
  let newVisitorCount = 0;
  let returningVisitorCount = 0;

  sessionDurations.forEach((duration, sessionId) => {
    const durationSec = (duration.last - duration.first) / 1000;
    totalDuration += durationSec;
    
    const pageCount = sessionEvents.get(sessionId) || 0;
    totalPages += pageCount;
    
    // New visitor if only 1 page view, returning if more
    if (pageCount === 1) {
      newVisitorCount++;
    } else {
      returningVisitorCount++;
    }
  });

  const avgSessionDuration = totalSessions > 0 ? Math.round(totalDuration / totalSessions) : 0;
  const pagesPerSession = totalSessions > 0 ? Number((totalPages / totalSessions).toFixed(2)) : 0;

  // Get published articles count
  const articlesQuery = supabase
    .from('articles')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('status', 'published')
    .is('deleted_at', null);

  const { count: publishedArticles } = await articlesQuery;

  return {
    totalPageViews,
    uniqueVisitors,
    totalSessions,
    avgSessionDuration,
    pagesPerSession,
    returningVisitors: returningVisitorCount,
    newVisitors: newVisitorCount,
    publishedArticles: publishedArticles || 0
  };
}

/**
 * Get real-time visitors (active in last 5 minutes)
 */
export async function getRealTimeVisitors(): Promise<RealTimeVisitor[]> {
  if (isDemoMode()) {
    return [];
  }

  const supabase = client();
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('analytics_events')
    .select('session_id, page_path, created_at, user_agent')
    .gte('created_at', fiveMinutesAgo)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Group by session, take latest event per session
  const sessionsMap = new Map<string, RealTimeVisitor>();
  
  data?.forEach(event => {
    if (!event.session_id) return;
    if (sessionsMap.has(event.session_id)) return; // Keep first (latest) only
    
    sessionsMap.set(event.session_id, {
      sessionId: event.session_id,
      currentPage: event.page_path || '/',
      lastSeen: event.created_at,
      userAgent: event.user_agent || ''
    });
  });

  return Array.from(sessionsMap.values());
}

/**
 * Get recent page views (last 50)
 */
export async function getRecentPageViews(limit = 50): Promise<RecentPageView[]> {
  if (isDemoMode()) {
    return [];
  }

  const supabase = client();
  
  const { data, error } = await supabase
    .from('analytics_events')
    .select(`
      id,
      page_path,
      created_at,
      referrer,
      article_id,
      articles (title)
    `)
    .eq('event_type', 'page_view')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data || []).map(event => ({
    id: event.id,
    pagePath: event.page_path || '/',
    articleTitle: (event.articles as any)?.title || null,
    timestamp: event.created_at,
    referrer: event.referrer || null
  }));
}

/**
 * Get traffic trends over time
 */
export async function getTrafficTrends(dateRange: { start: Date; end: Date }): Promise<TrendDataPoint[]> {
  if (isDemoMode()) {
    return [];
  }

  const supabase = client();

  const { data, error } = await supabase
    .from('analytics_events')
    .select('created_at, session_id, event_type')
    .eq('event_type', 'page_view')
    .gte('created_at', dateRange.start.toISOString())
    .lte('created_at', dateRange.end.toISOString())
    .order('created_at', { ascending: true });

  if (error) throw error;

  // Group by date
  const dailyData = new Map<string, { views: number; sessions: Set<string> }>();

  data?.forEach(event => {
    const date = event.created_at.split('T')[0];
    if (!dailyData.has(date)) {
      dailyData.set(date, { views: 0, sessions: new Set() });
    }
    const dayData = dailyData.get(date)!;
    dayData.views++;
    if (event.session_id) {
      dayData.sessions.add(event.session_id);
    }
  });

  return Array.from(dailyData.entries())
    .map(([date, data]) => ({
      date,
      views: data.views,
      visitors: data.sessions.size,
      sessions: data.sessions.size
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get top performing articles
 */
export async function getTopArticles(limit = 10, dateRange?: { start: Date; end: Date }): Promise<TopArticle[]> {
  if (isDemoMode()) {
    return [];
  }

  const tenantId = await getCurrentUserTenantId();
  const supabase = client();

  // Get article views from article_views table
  let viewsQuery = supabase
    .from('article_views')
    .select('article_id, session_id, viewed_at, articles(id, title, slug, published_at, tenant_id)')
    .eq('tenant_id', tenantId);

  if (dateRange) {
    viewsQuery = viewsQuery
      .gte('viewed_at', dateRange.start.toISOString())
      .lte('viewed_at', dateRange.end.toISOString());
  }

  const { data: views, error } = await viewsQuery;
  if (error) throw error;

  // Aggregate by article
  const articleStats = new Map<string, {
    article: any;
    views: number;
    uniqueVisitors: Set<string>;
    totalTime: number;
  }>();

  views?.forEach(view => {
    const article = (view as any).articles;
    if (!article) return;

    if (!articleStats.has(article.id)) {
      articleStats.set(article.id, {
        article,
        views: 0,
        uniqueVisitors: new Set(),
        totalTime: 0
      });
    }

    const stats = articleStats.get(article.id)!;
    stats.views++;
    if (view.session_id) {
      stats.uniqueVisitors.add(view.session_id);
    }
    // Estimate 2 minutes average reading time per view
    stats.totalTime += 120;
  });

  // Convert to array and sort
  const topArticles = Array.from(articleStats.entries())
    .map(([id, stats]) => ({
      id,
      title: stats.article.title,
      slug: stats.article.slug,
      views: stats.views,
      uniqueVisitors: stats.uniqueVisitors.size,
      avgReadingTime: stats.views > 0 ? Math.round(stats.totalTime / stats.views) : 0,
      publishedAt: stats.article.published_at,
      trend: 0 // TODO: Calculate vs previous period
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, limit);

  return topArticles;
}

/**
 * Get traffic sources
 */
export async function getTrafficSources(dateRange?: { start: Date; end: Date }): Promise<TrafficSource[]> {
  if (isDemoMode()) {
    return [];
  }

  const supabase = client();

  let query = supabase
    .from('analytics_events')
    .select('referrer')
    .eq('event_type', 'page_view');

  if (dateRange) {
    query = query
      .gte('created_at', dateRange.start.toISOString())
      .lte('created_at', dateRange.end.toISOString());
  }

  const { data, error } = await query;
  if (error) throw error;

  // Categorize referrers
  const sourceCounts = new Map<string, { category: string; url?: string }>();

  data?.forEach(event => {
    const ref = event.referrer || '';
    let source = 'Direct';
    let category = 'Direct';
    let referralUrl: string | undefined;

    if (ref) {
      try {
        const url = new URL(ref);
        const domain = url.hostname.replace(/^www\./, '');
        referralUrl = domain;

        if (domain.includes('google')) {
          source = 'Google';
          category = 'Search';
        } else if (domain.includes('bing') || domain.includes('yahoo') || domain.includes('duckduckgo')) {
          source = domain.split('.')[0];
          category = 'Search';
        } else if (domain.includes('facebook') || domain.includes('fb.')) {
          source = 'Facebook';
          category = 'Social';
        } else if (domain.includes('twitter') || domain.includes('t.co')) {
          source = 'Twitter';
          category = 'Social';
        } else if (domain.includes('instagram')) {
          source = 'Instagram';
          category = 'Social';
        } else if (domain.includes('youtube')) {
          source = 'YouTube';
          category = 'Social';
        } else if (domain.includes('linkedin')) {
          source = 'LinkedIn';
          category = 'Social';
        } else if (domain.includes('whatsapp') || domain.includes('wa.me')) {
          source = 'WhatsApp';
          category = 'Social';
        } else {
          source = domain;
          category = 'Referral';
        }
      } catch {
        source = 'Direct';
        category = 'Direct';
      }
    }

    const key = source;
    if (!sourceCounts.has(key)) {
      sourceCounts.set(key, { category, url: referralUrl });
    }
  });

  const totalVisits = data?.length || 0;

  return Array.from(sourceCounts.entries())
    .map(([source, info]) => {
      const count = data?.filter(e => {
        const ref = e.referrer || '';
        if (!ref && source === 'Direct') return true;
        return ref.includes(source) || ref.includes(info.url || '');
      }).length || 0;

      return {
        source,
        category: info.category,
        visits: count,
        percentage: totalVisits > 0 ? Number(((count / totalVisits) * 100).toFixed(1)) : 0,
        referralUrl: info.url
      };
    })
    .sort((a, b) => b.visits - a.visits);
}

/**
 * Get device analytics
 */
export async function getDeviceStats(dateRange?: { start: Date; end: Date }): Promise<DeviceStats[]> {
  if (isDemoMode()) {
    return [];
  }

  const supabase = client();

  let query = supabase
    .from('analytics_events')
    .select('user_agent')
    .eq('event_type', 'page_view');

  if (dateRange) {
    query = query
      .gte('created_at', dateRange.start.toISOString())
      .lte('created_at', dateRange.end.toISOString());
  }

  const { data, error } = await query;
  if (error) throw error;

  const deviceCounts = new Map<string, number>();

  data?.forEach(event => {
    const ua = (event.user_agent || '').toLowerCase();
    let device = 'Desktop';

    if (ua.includes('ipad') || ua.includes('tablet')) {
      device = 'Tablet';
    } else if (ua.includes('mobi') || ua.includes('android') || ua.includes('iphone')) {
      device = 'Mobile';
    }

    deviceCounts.set(device, (deviceCounts.get(device) || 0) + 1);
  });

  const total = data?.length || 0;

  return Array.from(deviceCounts.entries())
    .map(([device, count]) => ({
      device,
      count,
      percentage: total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Get browser stats
 */
export async function getBrowserStats(dateRange?: { start: Date; end: Date }): Promise<BrowserStats[]> {
  if (isDemoMode()) {
    return [];
  }

  const supabase = client();

  let query = supabase
    .from('analytics_events')
    .select('user_agent')
    .eq('event_type', 'page_view');

  if (dateRange) {
    query = query
      .gte('created_at', dateRange.start.toISOString())
      .lte('created_at', dateRange.end.toISOString());
  }

  const { data, error } = await query;
  if (error) throw error;

  const browserCounts = new Map<string, number>();

  data?.forEach(event => {
    const ua = event.user_agent || '';
    let browser = 'Other';

    if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Edg')) browser = 'Edge';
    else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';

    browserCounts.set(browser, (browserCounts.get(browser) || 0) + 1);
  });

  const total = data?.length || 0;

  return Array.from(browserCounts.entries())
    .map(([browser, count]) => ({
      browser,
      count,
      percentage: total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Get OS stats
 */
export async function getOSStats(dateRange?: { start: Date; end: Date }): Promise<OSStats[]> {
  if (isDemoMode()) {
    return [];
  }

  const supabase = client();

  let query = supabase
    .from('analytics_events')
    .select('user_agent')
    .eq('event_type', 'page_view');

  if (dateRange) {
    query = query
      .gte('created_at', dateRange.start.toISOString())
      .lte('created_at', dateRange.end.toISOString());
  }

  const { data, error } = await query;
  if (error) throw error;

  const osCounts = new Map<string, number>();

  data?.forEach(event => {
    const ua = event.user_agent || '';
    let os = 'Other';

    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac OS') || ua.includes('Macintosh')) os = 'macOS';
    else if (ua.includes('Linux') && !ua.includes('Android')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

    osCounts.set(os, (osCounts.get(os) || 0) + 1);
  });

  const total = data?.length || 0;

  return Array.from(osCounts.entries())
    .map(([os, count]) => ({
      os,
      count,
      percentage: total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0
    }))
    .sort((a, b) => b.count - a.count);
}
