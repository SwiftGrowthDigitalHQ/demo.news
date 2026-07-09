import { useEffect } from 'react';
import { useAppNavigation } from '../lib/navigation';
import { useCms } from '../lib/cms';

function getOrCreateMeta(selector: string, attrs: Record<string, string>) {
  const existing = document.head.querySelector<HTMLMetaElement>(selector);
  if (existing) {
    Object.entries(attrs).forEach(([key, value]) => existing.setAttribute(key, value));
    return existing;
  }

  const meta = document.createElement('meta');
  Object.entries(attrs).forEach(([key, value]) => meta.setAttribute(key, value));
  document.head.appendChild(meta);
  return meta;
}

function getOrCreateLink(rel: string) {
  const existing = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (existing) {
    return existing;
  }

  const link = document.createElement('link');
  link.rel = rel;
  document.head.appendChild(link);
  return link;
}

function stripQueryParams(search: string, keysToRemove: string[]) {
  const params = new URLSearchParams(search);
  keysToRemove.forEach(key => params.delete(key));
  const query = params.toString();
  return query ? `?${query}` : '';
}

function getCanonicalUrl(pathname: string, search: string, origin: string) {
  const canonicalSearch = stripQueryParams(search, ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']);
  return `${origin}${pathname}${canonicalSearch}`;
}

export function SeoBridge() {
  const { pathname, search } = useAppNavigation();
  const { articles, categories, siteSettings } = useCms();

  useEffect(() => {
    if (!siteSettings?.site_name) {
      return;
    }

    const safeTheme = siteSettings?.theme_config ?? {};
    const siteName = siteSettings.site_name;
    const siteUrl = safeTheme.site_url || window.location.origin;
    const defaultDescription =
      safeTheme.tagline ||
      siteSettings?.footer_text ||
      'Latest local and regional news with breaking coverage, categories, and live updates.';

    const articleSlug = pathname.startsWith('/article/') ? decodeURIComponent(pathname.replace('/article/', '')) : null;
    const categorySlug = pathname.startsWith('/category/') ? decodeURIComponent(pathname.replace('/category/', '')) : null;
    const query = new URLSearchParams(search).get('q') ?? '';
    const article = articleSlug ? articles.find(item => item.slug === articleSlug) ?? null : null;
    const category = categorySlug ? categories.find(item => item.slug === categorySlug) ?? null : null;
    const isAdminRoute = pathname.startsWith('/admin') || pathname.startsWith('/login') || pathname.startsWith('/forgot-password') || pathname.startsWith('/reset-password');
    const isSearchRoute = pathname.startsWith('/search');

    let title = siteName;
    let description = defaultDescription;
    let image = safeTheme.logo || siteSettings?.logo_url || '';
    let type: 'website' | 'article' = 'website';

    if (pathname === '/') {
      title = siteName;
    } else if (article) {
      title = `${article.seo_title || article.title} | ${siteName}`;
      description = article.seo_description || article.excerpt || defaultDescription;
      image = article.featured_image || image;
      type = 'article';
    } else if (category) {
      title = `${category.seo_title || category.name} | ${siteName}`;
      description = category.seo_description || category.description || defaultDescription;
    } else if (isSearchRoute) {
      title = `${query ? `Search: ${query}` : 'Search'} | ${siteName}`;
      description = query ? `Search results for "${query}" on ${siteName}.` : `Search the latest news on ${siteName}.`;
    } else if (isAdminRoute) {
      title = `${siteName} Admin`;
      description = 'Administrative access for newsroom management.';
    }

    document.title = title;
    getOrCreateMeta('meta[name="description"]', { name: 'description', content: description });
    getOrCreateMeta('meta[name="robots"]', { name: 'robots', content: isAdminRoute || isSearchRoute ? 'noindex,follow' : 'index,follow' });
    getOrCreateMeta('meta[property="og:title"]', { property: 'og:title', content: title });
    getOrCreateMeta('meta[property="og:description"]', { property: 'og:description', content: description });
    getOrCreateMeta('meta[property="og:type"]', { property: 'og:type', content: type });
    getOrCreateMeta('meta[property="og:url"]', { property: 'og:url', content: getCanonicalUrl(pathname, search, siteUrl) });
    getOrCreateMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: siteName });
    getOrCreateMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: image ? 'summary_large_image' : 'summary' });
    getOrCreateMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: title });
    getOrCreateMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: description });
    if (image) {
      getOrCreateMeta('meta[property="og:image"]', { property: 'og:image', content: image });
      getOrCreateMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: image });
    }

    const canonical = getOrCreateLink('canonical');
    canonical.href = getCanonicalUrl(pathname, search, siteUrl);
  }, [articles, categories, pathname, search, siteSettings]);

  return null;
}
