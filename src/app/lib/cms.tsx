import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '../../lib/supabase';
import {
  DEMO_ADVERTISEMENTS,
  DEMO_ARTICLES,
  DEMO_BREAKING_NEWS,
  DEMO_CATEGORIES,
  DEMO_SITE_SETTINGS,
  getDemoArticleBySlug,
  searchDemoArticles,
} from './demoContent';

export type PublicCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_featured: boolean;
  seo_title: string | null;
  seo_description: string | null;
};

export type PublicArticle = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string[];
  category_id: string;
  category_name: string;
  category_slug: string;
  author_name: string;
  author_role: string;
  publish_at: string | null;
  read_time: string | null;
  featured_image: string | null;
  media_type: string;
  video_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  featured: boolean;
  trending: boolean;
  breaking: boolean;
  views_count: number;
  tags: string[];
};

export type BreakingHeadline = {
  id: string;
  headline: string;
  link_url: string | null;
  sort_order: number;
};

export type SiteSettings = {
  site_name: string;
  logo_url: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  social_links: Record<string, string>;
  footer_text: string | null;
  theme_config: PublicThemeConfig;
};

// FIXED: Removed SMTP secrets, API keys, and other backend-only configuration
export type PublicThemeConfig = {
  primary_color?: string;
  secondary_color?: string;
  logo?: string;
  favicon?: string;
  tagline?: string;
  site_url?: string;
  articles_per_page?: string | number;
  breaking_ticker?: boolean;
  comments_enabled?: boolean;
  maintenance_mode?: boolean;
  dark_mode?: boolean;
  font_size?: string;
  hero_layout?: string;
  ads?: Record<string, unknown>;
  // REMOVED: smtp_host, smtp_port, smtp_username, from_name
  // REMOVED: breaking_alerts, weekly_digest (backend notification config)
  // REMOVED: auto_share, auto_backup, backup_retention (backend operations)
};

export type AdvertisementPlacement = {
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
};

type CmsContextValue = {
  tenantId: string | null;
  tenantSlug: string | null;
  loading: boolean;
  ready: boolean;
  error: string | null;
  categories: PublicCategory[];
  articles: PublicArticle[];
  breakingNews: BreakingHeadline[];
  siteSettings: SiteSettings | null;
  advertisements: AdvertisementPlacement[];
  refresh: () => Promise<void>;
  getArticleBySlug: (slug: string) => PublicArticle | null;
  getCategoryBySlug: (slug: string) => PublicCategory | null;
  searchArticles: (query: string) => Promise<PublicArticle[]>;
};

// Export CmsContext so DemoCmsProvider can use the same context
export const CmsContext = createContext<CmsContextValue | null>(null);

function formatContent(content: unknown): string[] {
  if (Array.isArray(content)) {
    return content.map(item => String(item));
  }

  if (typeof content === 'string') {
    try {
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? parsed.map(item => String(item)) : [content];
    } catch {
      return [content];
    }
  }

  return [];
}

function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) {
    return [];
  }

  return tags
    .map(tag => {
      if (typeof tag === 'string') {
        return tag;
      }
      if (tag && typeof tag === 'object' && 'tag' in tag) {
        return String((tag as { tag?: unknown }).tag ?? '');
      }
      return '';
    })
    .filter(Boolean);
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function mergeById<T extends { id: string }>(live: T[], demo: T[]) {
  const byId = new Map<string, T>();
  [...demo, ...live].forEach(item => {
    byId.set(item.id, item);
  });
  return Array.from(byId.values());
}

// FIXED: sanitizeThemeConfig now strips all secrets
function sanitizeThemeConfig(value: unknown): PublicThemeConfig {
  if (!value || typeof value !== 'object') {
    return {};
  }

  const config = value as Record<string, unknown>;
  const safeAds = config.ads && typeof config.ads === 'object' ? (config.ads as Record<string, unknown>) : undefined;

  // Only include frontend-safe properties
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
    ads: safeAds,
    // REMOVED all secret fields: smtp_*, from_name, backend operations
  };
}

// FIXED: Load public content with MANDATORY tenant slug, use secure RPC
async function loadPublicContent(tenantSlug: string | null) {
  const client = getSupabaseClient();
  if (!client) {
    // Demo fallback
    return {
      tenantId: 'demo',
      categories: DEMO_CATEGORIES,
      articles: DEMO_ARTICLES,
      breakingNews: DEMO_BREAKING_NEWS,
      siteSettings: DEMO_SITE_SETTINGS,
      advertisements: DEMO_ADVERTISEMENTS,
    };
  }

  if (!tenantSlug) {
    throw new Error('Tenant slug is required for loading public content');
  }

  // SECURITY: Use get_public_tenant_info RPC (SECURITY DEFINER, only safe fields)
  const { data: tenantInfo, error: tenantError } = await client
    .rpc('get_public_tenant_info', { p_tenant_slug: tenantSlug })
    .maybeSingle() as { data: any; error: any };

  if (tenantError) {
    console.error('[CMS] Failed to resolve tenant:', tenantSlug, tenantError);
    throw new Error(`Failed to resolve tenant: ${tenantSlug}`);
  }

  if (!tenantInfo) {
    throw new Error(`Tenant not found: ${tenantSlug}`);
  }

  const tenantId = tenantInfo.tenant_id;

  console.log('[CMS] Resolved tenant:', {
    slug: tenantSlug,
    id: tenantId,
    name: tenantInfo.tenant_name,
  });

  // SECURITY: ALL queries filtered by tenant_id
  const [
    categoriesResult,
    articlesResult,
    breakingNewsResult,
    advertisementsResult,
  ] = await Promise.all([
    client
      .from('categories')
      .select('id, name, slug, description, sort_order, is_featured, seo_title, seo_description')
      .eq('tenant_id', tenantId)  // TENANT FILTER
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true}),
    client
      .from('articles')
      .select(`
        id,
        slug,
        title,
        excerpt,
        content,
        category_id,
        featured_image,
        media_type,
        video_url,
        seo_title,
        seo_description,
        status,
        featured,
        trending,
        breaking,
        publish_at,
        read_time,
        views_count,
        category:categories!articles_category_id_fkey(id, name, slug),
        author:users!articles_author_id_fkey(
          id,
          full_name,
          role:roles(slug, name)
        ),
        tags:article_tags(tag)
      `)
      .eq('tenant_id', tenantId)  // TENANT FILTER
      .eq('status', 'published')
      .is('deleted_at', null)
      .order('publish_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false }),
    client
      .from('breaking_news')
      .select('id, headline, link_url, sort_order')
      .eq('tenant_id', tenantId)  // TENANT FILTER
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false }),
    client
      .from('advertisements')
      .select('id, placement, ad_type, advertiser_name, title, target_url, banner_url, position, start_date, end_date')
      .eq('tenant_id', tenantId)  // TENANT FILTER
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
  ]);

  if (categoriesResult.error) throw categoriesResult.error;
  if (articlesResult.error) throw articlesResult.error;
  if (breakingNewsResult.error) throw breakingNewsResult.error;
  if (advertisementsResult.error) throw advertisementsResult.error;

  const liveCategories = (categoriesResult.data ?? []) as PublicCategory[];
  const liveCategoryById = new Map(liveCategories.map(category => [category.id, category]));

  const liveArticles = (articlesResult.data ?? []).map((row: Record<string, unknown>) => {
    const category = Array.isArray(row.category) ? row.category[0] : (row.category as Record<string, unknown> | undefined);
    const author = Array.isArray(row.author) ? row.author[0] : (row.author as Record<string, unknown> | undefined);
    const role = Array.isArray(author?.role) ? author?.role[0] : author?.role;

    return {
      id: String(row.id),
      slug: String(row.slug),
      title: String(row.title),
      excerpt: String(row.excerpt),
      content: formatContent(row.content),
      category_id: String(row.category_id),
      category_name: String(category?.name ?? liveCategoryById.get(String(row.category_id))?.name ?? 'News'),
      category_slug: String(category?.slug ?? liveCategoryById.get(String(row.category_id))?.slug ?? 'news'),
      author_name: String(author?.full_name ?? 'Editorial Desk'),
      author_role: String(role?.name ?? 'Reporter'),
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
      tags: normalizeTags(row.tags),
    } satisfies PublicArticle;
  });

  const liveBreakingNews = (breakingNewsResult.data ?? []) as BreakingHeadline[];
  const liveAdvertisements = (advertisementsResult.data ?? []) as AdvertisementPlacement[];

  // Build site settings from RPC result (only safe public fields)
  const liveSiteSettings: SiteSettings = {
    site_name: tenantInfo.site_name || 'News Portal',
    logo_url: tenantInfo.logo_url,
    contact_name: null,  // Not exposed by RPC
    contact_phone: null,  // Not exposed by RPC
    contact_email: tenantInfo.contact_email,
    social_links: (tenantInfo.social_links as Record<string, string>) ?? {},
    footer_text: tenantInfo.footer_text,
    theme_config: {
      primary_color: tenantInfo.theme_primary_color ?? undefined,
      secondary_color: tenantInfo.theme_secondary_color ?? undefined,
      logo: tenantInfo.theme_logo ?? undefined,
      favicon: tenantInfo.theme_favicon ?? undefined,
      tagline: tenantInfo.theme_tagline ?? undefined,
      site_url: tenantInfo.theme_site_url ?? undefined,
      breaking_ticker: tenantInfo.theme_breaking_ticker ?? undefined,
      dark_mode: tenantInfo.theme_dark_mode ?? undefined,
      // NO secrets exposed
    },
  };

  return {
    tenantId,
    categories: liveCategories,
    articles: liveArticles,
    breakingNews: liveBreakingNews,
    siteSettings: liveSiteSettings,
    advertisements: liveAdvertisements,
  };
}

const ADMIN_ROLES = new Set(['super_admin', 'admin', 'editor', 'reporter']);

// FIXED: CmsProvider now requires tenantSlug prop
export function CmsProvider({ children, tenantSlug }: { children: React.ReactNode; tenantSlug?: string | null }) {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<PublicCategory[]>([]);
  const [articles, setArticles] = useState<PublicArticle[]>([]);
  const [breakingNews, setBreakingNews] = useState<BreakingHeadline[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [advertisements, setAdvertisements] = useState<AdvertisementPlacement[]>([]);

  const refresh = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await loadPublicContent(tenantSlug ?? null);
      setTenantId(data.tenantId);
      setCategories(data.categories);
      setArticles(data.articles);
      setBreakingNews(data.breakingNews);
      setSiteSettings(data.siteSettings);
      setAdvertisements(data.advertisements);
      setReady(true);
    } catch (loadError) {
      console.error('[CMS] Load error:', loadError);
      setError(loadError instanceof Error ? loadError.message : 'Failed to load CMS content.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantSlug]);

  const value = useMemo<CmsContextValue>(() => {
    const getArticleBySlug = (slug: string) => articles.find(article => article.slug === slug) ?? null;
    const getCategoryBySlug = (slug: string) => categories.find(category => category.slug === slug) ?? null;

    const searchArticles = async (query: string) => {
      const client = getSupabaseClient();
      if (!client || !tenantId) {
        return [];
      }

      const trimmed = query.trim();
      if (!trimmed) {
        return articles;
      }

      // SECURITY: search_articles RPC must filter by tenant_id (check function implementation)
      const { data, error: searchError } = await client.rpc('search_articles', {
        search_term: trimmed,
        result_limit: 24,
        result_offset: 0,
      });

      if (searchError) {
        console.error('[CMS] Search error:', searchError);
        throw searchError;
      }

      const results = (data ?? []).map((row: Record<string, unknown>) => ({
        id: String(row.id),
        slug: String(row.slug),
        title: String(row.title),
        excerpt: String(row.excerpt),
        content: [],
        category_id: String(row.category_slug ?? ''),
        category_name: String(row.category_name ?? 'News'),
        category_slug: String(row.category_slug ?? 'news'),
        author_name: String(row.author_name ?? 'Editorial Desk'),
        author_role: String(row.author_role ?? 'Reporter'),
        publish_at: typeof row.publish_at === 'string' ? row.publish_at : null,
        read_time: typeof row.read_time === 'string' ? row.read_time : null,
        featured_image: typeof row.featured_image === 'string' ? row.featured_image : null,
        media_type: String(row.media_type ?? 'article'),
        video_url: typeof row.video_url === 'string' ? row.video_url : null,
        seo_title: null,
        seo_description: null,
        featured: Boolean(row.featured),
        trending: Boolean(row.trending),
        breaking: Boolean(row.breaking),
        views_count: Number(row.views_count ?? 0),
        tags: normalizeTags(row.tags),
      })) as PublicArticle[];

      return results.length ? results : [];
    };

    return {
      tenantId,
      tenantSlug: tenantSlug ?? null,
      loading,
      ready,
      error,
      categories,
      articles,
      breakingNews,
      siteSettings,
      advertisements,
      refresh,
      getArticleBySlug,
      getCategoryBySlug,
      searchArticles,
    };
  }, [tenantId, tenantSlug, advertisements, articles, breakingNews, categories, error, loading, ready, siteSettings]);

  return <CmsContext.Provider value={value}>{children}</CmsContext.Provider>;
}

export function useCms() {
  const context = useContext(CmsContext);
  if (!context) {
    throw new Error('useCms must be used within CmsProvider');
  }
  return context;
}

export { ADMIN_ROLES };
