/**
 * Demo Content (Legacy)
 * 
 * This file now re-exports from the new demoTenant module for backward compatibility.
 * The CMS provider fallback logic still references these exports.
 */

export {
  DEMO_CATEGORIES,
  DEMO_ARTICLES,
  DEMO_BREAKING_NEWS,
  DEMO_ADVERTISEMENTS,
  DEMO_SITE_SETTINGS,
  DEMO_REPORTERS,
  getDemoArticleBySlug,
  searchDemoArticles,
} from './demoTenant';

// Legacy export for videos
export { DEMO_ARTICLES as DEMO_VIDEOS } from './demoTenant';
