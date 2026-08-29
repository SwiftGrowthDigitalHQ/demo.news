/**
 * SEO Metadata Utility
 * 
 * Provides components and utilities for managing page metadata
 * using react-helmet-async.
 * 
 * Usage:
 * ```tsx
 * <PageMetadata
 *   title="Article Title"
 *   description="Article description"
 *   canonical="/article/slug"
 *   image="https://example.com/image.jpg"
 * />
 * ```
 */

import { Helmet } from 'react-helmet-async';
import type { TenantSEODefaults } from './admin';

export interface PageMetadataProps {
  // Basic SEO
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  image?: string;
  
  // Robots
  robots?: string; // e.g., "index,follow" or "noindex,nofollow"
  
  // Open Graph
  ogType?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogImageWidth?: number;
  ogImageHeight?: number;
  ogSiteName?: string;
  ogUrl?: string;
  
  // Twitter/X
  twitterCard?: string;
  twitterSite?: string;
  twitterCreator?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  
  // Article-specific
  articlePublishedTime?: string;
  articleModifiedTime?: string;
  articleAuthor?: string;
  articleSection?: string;
  articleTags?: string[];
  
  // Language
  language?: string;
  locale?: string;
  
  // Schema.org structured data
  structuredData?: object | object[];
}

/**
 * Generate robots meta tag content
 */
export function generateRobotsContent(seoDefaults?: TenantSEODefaults | null, override?: string): string {
  if (override) return override;
  
  if (!seoDefaults) return 'index,follow';
  
  const parts: string[] = [];
  
  // Index/noindex
  parts.push(seoDefaults.robots_index ? 'index' : 'noindex');
  
  // Follow/nofollow
  parts.push(seoDefaults.robots_follow ? 'follow' : 'nofollow');
  
  // Archive
  if (seoDefaults.robots_archive === false) {
    parts.push('noarchive');
  }
  
  // Snippet
  if (seoDefaults.robots_snippet === false) {
    parts.push('nosnippet');
  } else if (seoDefaults.robots_max_snippet && seoDefaults.robots_max_snippet > 0) {
    parts.push(`max-snippet:${seoDefaults.robots_max_snippet}`);
  }
  
  // Image preview
  if (seoDefaults.robots_max_image_preview) {
    parts.push(`max-image-preview:${seoDefaults.robots_max_image_preview}`);
  }
  
  return parts.join(', ');
}

/**
 * Normalize canonical URL
 */
export function normalizeCanonicalUrl(path: string, baseUrl?: string): string {
  // Remove trailing slash from path unless it's the root
  const normalizedPath = path === '/' ? '/' : path.replace(/\/$/, '');
  
  // If no base URL, return relative path
  if (!baseUrl) return normalizedPath;
  
  // Remove trailing slash from base URL
  const normalizedBase = baseUrl.replace(/\/$/, '');
  
  // Combine base URL and path
  return `${normalizedBase}${normalizedPath}`;
}

/**
 * Get best available title (fallback chain)
 */
export function resolveSEOTitle(
  pageTitle?: string,
  seoTitle?: string,
  seoDefaults?: TenantSEODefaults | null
): string {
  if (seoTitle) return seoTitle;
  if (pageTitle) return pageTitle;
  if (seoDefaults?.site_title) return seoDefaults.site_title;
  return 'News Site';
}

/**
 * Get best available description (fallback chain)
 */
export function resolveSEODescription(
  pageDescription?: string,
  seoDescription?: string,
  seoDefaults?: TenantSEODefaults | null
): string | undefined {
  if (seoDescription) return seoDescription;
  if (pageDescription) return pageDescription;
  return seoDefaults?.site_description || undefined;
}

/**
 * Get best available image (fallback chain)
 */
export function resolveSEOImage(
  pageImage?: string,
  seoDefaults?: TenantSEODefaults | null
): string | undefined {
  if (pageImage) return pageImage;
  return seoDefaults?.default_image_url || undefined;
}

/**
 * Page Metadata Component
 * 
 * Automatically generates all meta tags for a page.
 * Combines page-specific data with tenant SEO defaults.
 */
export function PageMetadata(props: PageMetadataProps) {
  const {
    title,
    description,
    keywords,
    canonical,
    image,
    robots,
    ogType = 'website',
    ogTitle,
    ogDescription,
    ogImage,
    ogImageWidth,
    ogImageHeight,
    ogSiteName,
    ogUrl,
    twitterCard = 'summary_large_image',
    twitterSite,
    twitterCreator,
    twitterTitle,
    twitterDescription,
    twitterImage,
    articlePublishedTime,
    articleModifiedTime,
    articleAuthor,
    articleSection,
    articleTags,
    language = 'en',
    locale = 'en_US',
    structuredData,
  } = props;
  
  return (
    <Helmet>
      {/* Basic Meta Tags */}
      {title && <title>{title}</title>}
      {description && <meta name="description" content={description} />}
      {keywords && <meta name="keywords" content={keywords} />}
      {canonical && <link rel="canonical" href={canonical} />}
      {robots && <meta name="robots" content={robots} />}
      
      {/* Language */}
      <html lang={language} />
      
      {/* Open Graph */}
      <meta property="og:type" content={ogType} />
      {(ogTitle || title) && <meta property="og:title" content={ogTitle || title} />}
      {(ogDescription || description) && <meta property="og:description" content={ogDescription || description} />}
      {(ogImage || image) && <meta property="og:image" content={ogImage || image} />}
      {ogImageWidth && <meta property="og:image:width" content={String(ogImageWidth)} />}
      {ogImageHeight && <meta property="og:image:height" content={String(ogImageHeight)} />}
      {ogSiteName && <meta property="og:site_name" content={ogSiteName} />}
      {(ogUrl || canonical) && <meta property="og:url" content={ogUrl || canonical} />}
      {locale && <meta property="og:locale" content={locale} />}
      
      {/* Article-specific Open Graph */}
      {articlePublishedTime && <meta property="article:published_time" content={articlePublishedTime} />}
      {articleModifiedTime && <meta property="article:modified_time" content={articleModifiedTime} />}
      {articleAuthor && <meta property="article:author" content={articleAuthor} />}
      {articleSection && <meta property="article:section" content={articleSection} />}
      {articleTags?.map((tag, idx) => (
        <meta key={idx} property="article:tag" content={tag} />
      ))}
      
      {/* Twitter/X Card */}
      <meta name="twitter:card" content={twitterCard} />
      {twitterSite && <meta name="twitter:site" content={twitterSite} />}
      {twitterCreator && <meta name="twitter:creator" content={twitterCreator} />}
      {(twitterTitle || title) && <meta name="twitter:title" content={twitterTitle || title} />}
      {(twitterDescription || description) && <meta name="twitter:description" content={twitterDescription || description} />}
      {(twitterImage || image) && <meta name="twitter:image" content={twitterImage || image} />}
      
      {/* Structured Data */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
}

/**
 * Generate NewsArticle structured data
 */
export function generateArticleStructuredData(article: {
  title: string;
  description?: string;
  image?: string;
  publishedTime: string;
  modifiedTime?: string;
  author?: string;
  section?: string;
  url: string;
  publisher?: {
    name: string;
    logo?: string;
  };
}): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    description: article.description,
    image: article.image,
    datePublished: article.publishedTime,
    dateModified: article.modifiedTime || article.publishedTime,
    author: article.author ? {
      '@type': 'Person',
      name: article.author,
    } : undefined,
    articleSection: article.section,
    url: article.url,
    publisher: article.publisher ? {
      '@type': 'Organization',
      name: article.publisher.name,
      logo: article.publisher.logo ? {
        '@type': 'ImageObject',
        url: article.publisher.logo,
      } : undefined,
    } : undefined,
  };
}

/**
 * Generate Organization structured data
 */
export function generateOrganizationStructuredData(org: {
  name: string;
  url: string;
  logo?: string;
  description?: string;
  sameAs?: string[]; // Social media URLs
}): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: org.name,
    url: org.url,
    logo: org.logo ? {
      '@type': 'ImageObject',
      url: org.logo,
    } : undefined,
    description: org.description,
    sameAs: org.sameAs,
  };
}

/**
 * Generate WebSite structured data
 */
export function generateWebSiteStructuredData(site: {
  name: string;
  url: string;
  description?: string;
  potentialAction?: {
    searchUrl: string; // e.g., "https://example.com/search?q={search_term_string}"
  };
}): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: site.name,
    url: site.url,
    description: site.description,
    potentialAction: site.potentialAction ? {
      '@type': 'SearchAction',
      target: site.potentialAction.searchUrl,
      'query-input': 'required name=search_term_string',
    } : undefined,
  };
}

/**
 * Generate BreadcrumbList structured data
 */
export function generateBreadcrumbStructuredData(breadcrumbs: Array<{
  name: string;
  url: string;
}>): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
