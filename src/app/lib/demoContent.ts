import type {
  AdvertisementPlacement,
  BreakingHeadline,
  PublicArticle,
  PublicCategory,
  SiteSettings,
} from './cms';

/**
 * Demo content has been removed.
 * All data now comes from Supabase (live database).
 * These empty arrays are kept for backward compatibility
 * with the CMS provider fallback logic.
 */

export const DEMO_CATEGORIES: PublicCategory[] = [];

export const DEMO_REPORTERS: Array<{
  id: string;
  full_name: string;
  slug: string;
  role: string;
  bio: string;
}> = [];

export const DEMO_ARTICLES: PublicArticle[] = [];

export const DEMO_BREAKING_NEWS: BreakingHeadline[] = [];

export const DEMO_VIDEOS: PublicArticle[] = [];

export const DEMO_ADVERTISEMENTS: AdvertisementPlacement[] = [];

export const DEMO_SITE_SETTINGS: SiteSettings = {
  site_name: 'Buxar News',
  logo_url: null,
  contact_name: 'Patna, Bihar, India',
  contact_phone: '+91 9229721835',
  contact_email: 'hello@swiftgrowthdigital.com',
  social_links: {
    facebook: 'https://facebook.com/buxarnews',
    twitter: 'https://x.com/buxarnews',
    instagram: 'https://instagram.com/buxarnews',
    youtube: 'https://youtube.com/@buxarnews',
  },
  footer_text: 'Bihar\'s trusted digital news platform.',
  theme_config: {
    primary_color: '#dc2626',
    secondary_color: '#0f172a',
    tagline: 'Fast. Accurate. Trusted.',
    site_url: 'http://localhost:5173',
  },
};

export function getDemoArticleBySlug(_slug: string): PublicArticle | null {
  return null;
}

export function searchDemoArticles(_query: string): PublicArticle[] {
  return [];
}
