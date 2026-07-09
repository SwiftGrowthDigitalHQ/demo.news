import { getSupabaseClient } from '../../lib/supabase';
import type { PublicArticle, PublicCategory, BreakingHeadline, SiteSettings } from './cms';

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
    smtp_host: typeof config.smtp_host === 'string' ? config.smtp_host : undefined,
    smtp_port: typeof config.smtp_port === 'string' ? config.smtp_port : undefined,
    smtp_username: typeof config.smtp_username === 'string' ? config.smtp_username : undefined,
    from_name: typeof config.from_name === 'string' ? config.from_name : undefined,
    breaking_alerts: typeof config.breaking_alerts === 'boolean' ? config.breaking_alerts : undefined,
    weekly_digest: typeof config.weekly_digest === 'boolean' ? config.weekly_digest : undefined,
    auto_share: typeof config.auto_share === 'boolean' ? config.auto_share : undefined,
    auto_backup: typeof config.auto_backup === 'boolean' ? config.auto_backup : undefined,
    backup_retention: typeof config.backup_retention === 'string' ? config.backup_retention : undefined,
    ads,
  };
}

export async function listAdminArticles() {
  const supabase = client();
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
  const supabase = client();
  const { id, tags = [], ...rest } = payload;
  const articlePayload = {
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
  const supabase = client();
  const { error } = await supabase.from('articles').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function setArticleStatus(id: string, status: AdminArticle['status'], publishAt?: string | null) {
  const supabase = client();
  const { error } = await supabase.from('articles').update({
    status,
    publish_at: publishAt ?? (status === 'published' ? new Date().toISOString() : null),
  }).eq('id', id);
  if (error) throw error;
}

export async function listAdminCategories() {
  const supabase = client();
  const { data, error } = await supabase.from('categories').select('*').is('deleted_at', null).order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as AdminCategory[];
}

export async function upsertAdminCategory(payload: Partial<AdminCategory> & { name: string; slug: string }) {
  const supabase = client();
  const body = {
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
  const supabase = client();
  const { error } = await supabase.from('categories').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function listAdminMedia() {
  const supabase = client();
  const { data, error } = await supabase.from('media').select('*').is('deleted_at', null).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as AdminMediaItem[];
}

export async function uploadAdminMedia(file: File, options?: { alt_text?: string; caption?: string; is_featured?: boolean }) {
  const supabase = client();
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `media/${crypto.randomUUID()}.${ext}`;
  const upload = await supabase.storage.from('media').upload(path, file, { upsert: false, contentType: file.type });
  if (upload.error) throw upload.error;
  const { data: publicUrl } = supabase.storage.from('media').getPublicUrl(upload.data.path);
  const row = await supabase.from('media').insert({
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
  const supabase = client();
  const file = await supabase.storage.from('media').remove([filePath]);
  if (file.error) throw file.error;
  const { error } = await supabase.from('media').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function updateAdminMedia(
  id: string,
  payload: Partial<AdminMediaItem> & { alt_text?: string | null; caption?: string | null; is_featured?: boolean },
) {
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
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function listAdminReporters() {
  const supabase = client();
  const { data, error } = await supabase
    .from('reporters')
    .select('*, user:users(id, email, role:roles(slug, name))')
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
  const supabase = client();
  const body = {
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
  const supabase = client();
  const { error } = await supabase.from('reporters').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function listAdminAds() {
  const supabase = client();
  const { data, error } = await supabase.from('advertisements').select('*').is('deleted_at', null).order('created_at', { ascending: false });
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
  const supabase = client();
  const body = {
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
  const supabase = client();
  const { error } = await supabase.from('advertisements').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function listSeoSettings() {
  const supabase = client();
  const { data, error } = await supabase.from('seo_settings').select('*').is('deleted_at', null).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(row => ({
    ...row,
    schema_json: asRecord((row as Record<string, unknown>).schema_json),
  })) as SeoSetting[];
}

export async function upsertSeoSetting(payload: Partial<SeoSetting> & { page_path: string }) {
  const supabase = client();
  const body = {
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
  const supabase = client();
  const { data, error } = await supabase.from('notifications').select('*').is('deleted_at', null).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as NotificationRow[];
}

export async function upsertNotification(payload: Partial<NotificationRow> & { title: string; message: string }) {
  const supabase = client();
  const body = {
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
  const supabase = client();
  const { error } = await supabase.from('notifications').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function listAuditLogs() {
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
  const supabase = client();
  const { data, error } = await supabase.from('site_settings').select('*').is('deleted_at', null).order('created_at', { ascending: false }).limit(1).maybeSingle();
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
  const supabase = client();
  const { data: existing } = await supabase.from('site_settings').select('id').is('deleted_at', null).limit(1).maybeSingle();
  const body = {
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
      console.warn('[Audit] Log failed (non-critical):', error.message);
    }
  } catch {
    // Audit logging is non-critical — never block the main operation
  }
}

export async function listAdminRoles() {
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
  const supabase = client();
  const body = {
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
  const supabase = client();
  const { error } = await supabase.from('roles').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function listAdminUsers() {
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
  const supabase = client();
  const { error } = await supabase.from('users').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function listBreakingNews() {
  const supabase = client();
  const { data, error } = await supabase.from('breaking_news').select('*').is('deleted_at', null).order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as BreakingNewsRow[];
}

export async function upsertBreakingNews(payload: Partial<BreakingNewsRow> & { headline: string }) {
  const supabase = client();
  const body = {
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
  const supabase = client();
  const { error } = await supabase.from('breaking_news').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function listSubscriptions() {
  const supabase = client();
  const { data, error } = await supabase.from('subscriptions').select('*').is('deleted_at', null).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as SubscriptionRow[];
}

export async function upsertSubscription(payload: Partial<SubscriptionRow> & { email: string }) {
  const supabase = client();
  const body = {
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
  const supabase = client();
  const { error } = await supabase.from('subscriptions').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function createNewsletterSubscription(payload: { email: string; full_name?: string | null; source?: string | null }) {
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
  const supabase = client();
  const { data, error } = await supabase.from('campaigns').select('*').is('deleted_at', null).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as CampaignRow[];
}

export async function upsertCampaign(payload: Partial<CampaignRow> & { name: string; advertiser_name: string }) {
  const supabase = client();
  const body = {
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
  const supabase = client();
  const { error } = await supabase.from('campaigns').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function listAnalyticsEvents(limit = 100) {
  const supabase = client();
  const { data, error } = await supabase.from('analytics_events').select('*').order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []) as AnalyticsEventRow[];
}
