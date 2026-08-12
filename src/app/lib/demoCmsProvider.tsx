/**
 * Demo CMS Provider
 * 
 * This provider wraps the demo tenant data in the same interface
 * as the production CmsProvider, allowing demo pages to use the
 * exact same components as real tenant pages.
 * 
 * The demo is intentionally isolated and read-only.
 * 
 * IMPORTANT: This provider uses the SAME CmsContext from cms.tsx
 * so that components using useCms() work seamlessly in demo mode.
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type {
  PublicCategory,
  PublicArticle,
  BreakingHeadline,
  SiteSettings,
  AdvertisementPlacement,
} from './cms';
import {
  DEMO_CATEGORIES,
  DEMO_ARTICLES,
  DEMO_BREAKING_NEWS,
  DEMO_SITE_SETTINGS,
  DEMO_ADVERTISEMENTS,
  getDemoArticleBySlug,
  getDemoCategoryBySlug,
  searchDemoArticles,
} from './demoTenant';

type DemoCmsContextValue = {
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

// Import the same CmsContext from cms.tsx to provide demo data
// This ensures components using useCms() work in demo mode
import { CmsContext } from './cms';

/**
 * Demo CMS Provider
 * 
 * Provides demo tenant data using the same interface as CmsProvider.
 * This allows demo pages to use production components without modification.
 * 
 * Uses the SAME CmsContext so useCms() hook works seamlessly.
 */
export function DemoCmsProvider({ children }: { children: ReactNode }) {
  const value = useMemo<DemoCmsContextValue>(() => {
    const refresh = async () => {
      // Demo data is static, no need to refresh
      // This matches the CmsProvider interface
    };

    const getArticleBySlug = (slug: string) => getDemoArticleBySlug(slug);
    
    const getCategoryBySlug = (slug: string) => getDemoCategoryBySlug(slug);
    
    const searchArticles = async (query: string) => {
      // Simulate async to match CmsProvider interface
      return Promise.resolve(searchDemoArticles(query));
    };

    return {
      loading: false,
      ready: true,
      error: null,
      categories: DEMO_CATEGORIES,
      articles: DEMO_ARTICLES,
      breakingNews: DEMO_BREAKING_NEWS,
      siteSettings: DEMO_SITE_SETTINGS,
      advertisements: DEMO_ADVERTISEMENTS,
      refresh,
      getArticleBySlug,
      getCategoryBySlug,
      searchArticles,
    };
  }, []);

  return <CmsContext.Provider value={value}>{children}</CmsContext.Provider>;
}

/**
 * Hook to access demo CMS context
 * 
 * This has the same interface as useCms(), allowing components
 * to work with both real and demo data without changes.
 * 
 * In demo mode, just use useCms() from cms.tsx - it will work automatically.
 */
export function useDemoCms() {
  const context = useContext(CmsContext);
  if (!context) {
    throw new Error('useDemoCms must be used within DemoCmsProvider');
  }
  return context;
}

