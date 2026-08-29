/**
 * SangTX News CMS - Plugin Registry
 * 
 * Central registry for all available plugins.
 * Defines plugin metadata, categories, and capabilities.
 */

export type PluginCategory = 
  | 'seo'
  | 'analytics'
  | 'monetization'
  | 'social'
  | 'security'
  | 'performance'
  | 'email'
  | 'notifications'
  | 'content'
  | 'media'
  | 'advertising'
  | 'google'
  | 'utilities';

export type PluginStatus = 
  | 'active'
  | 'inactive'
  | 'available'
  | 'coming_soon';

export interface Plugin {
  key: string;
  name: string;
  description: string;
  category: PluginCategory;
  version: string;
  developer: string;
  isBuiltIn: boolean;
  hasConfiguration: boolean;
  configurationRoute?: string;
  requiresSetup: boolean;
  features: string[];
  requirements?: string[];
  isImplemented: boolean; // true if backend functionality exists
}

// ═══════════════════════════════════════════════════════════════════════════
// PLUGIN REGISTRY
// ═══════════════════════════════════════════════════════════════════════════

export const PLUGIN_REGISTRY: Plugin[] = [
  // ── SEO & DISCOVERY ──────────────────────────────────────────────────────
  {
    key: 'seo-manager',
    name: 'SEO Manager',
    description: 'Manage titles, meta descriptions, canonical URLs, robots directives and SEO defaults.',
    category: 'seo',
    version: '1.0.0',
    developer: 'SangTX',
    isBuiltIn: true,
    hasConfiguration: true,
    configurationRoute: '/admin/seo-manager',
    requiresSetup: false,
    features: [
      'Meta title and description templates',
      'Canonical URL management',
      'Robots meta directives',
      'SEO-friendly URL slugs',
      'Default SEO settings'
    ],
    isImplemented: true
  },
  {
    key: 'xml-sitemap',
    name: 'XML Sitemap',
    description: 'Generate and manage an XML sitemap for your news site. Includes articles, categories, and authors.',
    category: 'seo',
    version: '1.0.0',
    developer: 'SangTX',
    isBuiltIn: true,
    hasConfiguration: true,
    configurationRoute: '/admin/xml-sitemap',
    requiresSetup: false,
    features: [
      'Automatic sitemap generation via Edge Function',
      'Include/exclude articles, categories, authors',
      'Per-type change frequency and priority',
      'Sitemap index for large sites (>50k URLs)',
      'SEO Manager integration for canonical URL',
    ],
    isImplemented: true,
  },
  {
    key: 'news-sitemap',
    name: 'News Sitemap',
    description: 'Generate Google News compatible sitemap settings.',
    category: 'google',
    version: '1.0.0',
    developer: 'SangTX',
    isBuiltIn: true,
    hasConfiguration: true,
    requiresSetup: false,
    features: [
      'Google News format',
      'Publication metadata',
      'News-specific tags',
      'Last 48 hours filtering'
    ],
    isImplemented: false
  },
  {
    key: 'schema-markup',
    name: 'Schema Markup',
    description: 'Manage Article, NewsArticle, Organization, WebSite and Breadcrumb schema.',
    category: 'seo',
    version: '1.0.0',
    developer: 'SangTX',
    isBuiltIn: true,
    hasConfiguration: true,
    requiresSetup: false,
    features: [
      'Article schema',
      'NewsArticle schema',
      'Organization schema',
      'WebSite schema',
      'Breadcrumb navigation'
    ],
    isImplemented: false
  },
  {
    key: 'open-graph',
    name: 'Open Graph & Social Meta',
    description: 'Control Facebook, WhatsApp, X and other social sharing metadata.',
    category: 'social',
    version: '1.0.0',
    developer: 'SangTX',
    isBuiltIn: true,
    hasConfiguration: true,
    requiresSetup: false,
    features: [
      'Open Graph tags',
      'Twitter Card tags',
      'WhatsApp preview optimization',
      'Social image defaults'
    ],
    isImplemented: false
  },
  {
    key: 'seo-visibility',
    name: 'SEO Visibility',
    description: 'Control indexing, robots.txt, canonical URLs and search engine visibility.',
    category: 'seo',
    version: '1.0.0',
    developer: 'SangTX',
    isBuiltIn: true,
    hasConfiguration: false,
    requiresSetup: false,
    features: [
      'Search engine indexing control',
      'Robots.txt management',
      'Canonical URL enforcement',
      'No-index page control'
    ],
    isImplemented: false
  },

  // ── GOOGLE ───────────────────────────────────────────────────────────────
  {
    key: 'google-analytics',
    name: 'Google Analytics 4',
    description: 'Connect via OAuth to automatically track visitor behavior. No manual Measurement ID required.',
    category: 'google',
    version: '2.0.0',
    developer: 'SangTX',
    isBuiltIn: true,
    hasConfiguration: true,
    configurationRoute: '/admin/google-analytics',
    requiresSetup: true,
    features: [
      'OAuth-based connection',
      'Automatic Measurement ID detection',
      'GA4 measurement tracking',
      'Page view tracking',
      'Article view tracking',
      'Category view tracking',
      'Search tracking',
      'Custom event API',
      'GDPR consent mode',
      'Debug mode'
    ],
    requirements: ['Google Analytics 4 account', 'Google account with Analytics access'],
    isImplemented: true
  },
  {
    key: 'google-search-console',
    name: 'Google Search Console',
    description: 'Connect via OAuth to monitor search performance. No manual API keys required.',
    category: 'google',
    version: '2.0.0',
    developer: 'SangTX',
    isBuiltIn: true,
    hasConfiguration: true,
    configurationRoute: '/admin/google-search-console',
    requiresSetup: true,
    features: [
      'OAuth-based connection',
      'Automatic property detection',
      'Search performance metrics',
      'Clicks and impressions tracking',
      'CTR and position analytics',
      'Top search queries',
      'Top performing pages',
      'Date range selection',
      'Automatic data sync'
    ],
    requirements: ['Google Search Console account', 'Verified website property'],
    isImplemented: true
  },
  {
    key: 'google-adsense',
    name: 'Google AdSense',
    description: 'Configure AdSense publisher ID and ad placement settings.',
    category: 'monetization',
    version: '1.0.0',
    developer: 'SangTX',
    isBuiltIn: true,
    hasConfiguration: true,
    configurationRoute: '/admin/google-adsense',
    requiresSetup: true,
    features: [
      'Auto ads',
      'Manual ad units',
      'Responsive ads',
      'Ad performance tracking',
      'ads.txt generation',
      'Multiple ad placements'
    ],
    requirements: ['Google AdSense account', 'Publisher ID'],
    isImplemented: true
  },
  {
    key: 'google-news',
    name: 'Google News',
    description: 'Configure Google News related publisher settings.',
    category: 'google',
    version: '1.0.0',
    developer: 'SangTX',
    isBuiltIn: true,
    hasConfiguration: true,
    requiresSetup: true,
    features: [
      'Publisher center integration',
      'News article markup',
      'Section-specific settings',
      'News metadata'
    ],
    requirements: ['Google News Publisher Center account'],
    isImplemented: false
  },

  // ── MONETIZATION ─────────────────────────────────────────────────────────
  {
    key: 'advertisement-manager',
    name: 'Advertisement Manager',
    description: 'Manage banner, native, sidebar and article advertisements.',
    category: 'advertising',
    version: '1.0.0',
    developer: 'SangTX',
    isBuiltIn: true,
    hasConfiguration: true,
    configurationRoute: '/admin/ads',
    requiresSetup: false,
    features: [
      'Banner ads',
      'Native ads',
      'Sidebar ads',
      'In-article ads',
      'Ad scheduling'
    ],
    isImplemented: false
  },
  {
    key: 'ad-placement',
    name: 'Ad Placement Manager',
    description: 'Configure ad positions: header, before article, after paragraph, between articles, sidebar, footer, mobile, sticky.',
    category: 'advertising',
    version: '1.0.0',
    developer: 'SangTX',
    isBuiltIn: true,
    hasConfiguration: true,
    requiresSetup: false,
    features: [
      'Header placement',
      'Before/after article',
      'Between paragraphs',
      'Sidebar placement',
      'Footer placement',
      'Mobile-specific',
      'Sticky ads'
    ],
    isImplemented: false
  },
  {
    key: 'sponsored-content',
    name: 'Sponsored Content',
    description: 'Manage sponsored articles and sponsored labels.',
    category: 'monetization',
    version: '1.0.0',
    developer: 'SangTX',
    isBuiltIn: true,
    hasConfiguration: true,
    requiresSetup: false,
    features: [
      'Sponsored article tagging',
      'Sponsor disclosure',
      'Sponsor attribution',
      'Sponsored content reporting'
    ],
    isImplemented: false
  },
  {
    key: 'subscription-manager',
    name: 'Subscription Manager',
    description: 'Manage paid/free subscriptions and subscriber settings.',
    category: 'monetization',
    version: '1.0.0',
    developer: 'SangTX',
    isBuiltIn: true,
    hasConfiguration: true,
    configurationRoute: '/admin/subscriptions',
    requiresSetup: false,
    features: [
      'Subscriber management',
      'Newsletter subscriptions',
      'Email preferences',
      'Subscription analytics'
    ],
    isImplemented: false
  },

  // ── SOCIAL MEDIA ─────────────────────────────────────────────────────────
  {
    key: 'social-media',
    name: 'Social Media Integration',
    description: 'Connect social profiles and configure sharing.',
    category: 'social',
    version: '1.0.0',
    developer: 'SangTX',
    isBuiltIn: true,
    hasConfiguration: false,
    requiresSetup: false,
    features: [
      'Social profile links',
      'Share buttons',
      'Social meta tags',
      'Follow buttons'
    ],
    isImplemented: false
  },
  {
    key: 'facebook-publisher',
    name: 'Facebook Publisher',
    description: 'Connect via OAuth to publish articles directly to your Facebook Page. No manual API keys required.',
    category: 'social',
    version: '2.0.0',
    developer: 'SangTX',
    isBuiltIn: true,
    hasConfiguration: true,
    configurationRoute: '/admin/facebook-publisher',
    requiresSetup: true,
    features: [
      'OAuth-based connection',
      'Automatic Page detection',
      'Direct article publishing',
      'Publishing history tracking',
      'Duplicate prevention',
      'Multiple Page support',
      'Featured image support',
      'Post preview',
      'Error handling',
      'Facebook post links'
    ],
    requirements: ['Facebook account', 'Facebook Page with admin access'],
    isImplemented: true
  },
  {
    key: 'youtube-integration',
    name: 'YouTube Integration',
    description: 'Connect your YouTube channel via Google OAuth and display videos on your news portal. No API key required.',
    category: 'social',
    version: '2.0.0',
    developer: 'SangTX',
    isBuiltIn: true,
    hasConfiguration: true,
    configurationRoute: '/admin/youtube-integration',
    requiresSetup: true,
    features: [
      'Google OAuth 2.0 authentication',
      'Automatic channel detection',
      'Channel statistics display',
      'Latest videos widget',
      'Automatic data caching',
      'Secure token encryption',
      'Manual sync control',
      'Auto token refresh'
    ],
    requirements: ['YouTube Channel', 'Google Account'],
    isImplemented: false
  },
  {
    key: 'telegram-integration',
    name: 'Telegram Integration',
    description: 'Configure Telegram publishing/notification integration.',
    category: 'social',
    version: '1.0.0',
    developer: 'SangTX',
    isBuiltIn: true,
    hasConfiguration: true,
    requiresSetup: true,
    features: [
      'Auto-posting to channel',
      'Breaking news alerts',
      'Bot integration',
      'Subscriber notifications'
    ],
    requirements: ['Telegram Bot', 'Bot Token'],
    isImplemented: false
  },
  {
    key: 'whatsapp-sharing',
    name: 'WhatsApp Sharing',
    description: 'Configure WhatsApp sharing buttons and templates.',
    category: 'social',
    version: '1.0.0',
    developer: 'SangTX',
    isBuiltIn: true,
    hasConfiguration: true,
    requiresSetup: false,
    features: [
      'Share buttons',
      'Click-to-chat',
      'Message templates',
      'WhatsApp Business integration'
    ],
    isImplemented: false
  },

  // ── CONTENT ──────────────────────────────────────────────────────────────
  {
    key: 'related-articles',
    name: 'Related Articles',
    description: 'Automatically show related news articles.',
    category: 'content',
    version: '1.0.0',
    developer: 'SangTX',
    isBuiltIn: true,
    hasConfiguration: true,
    requiresSetup: false,
    features: [
      'Automatic suggestions',
      'Category-based',
      'Tag-based',
      'Manual selection'
    ],
    isImplemented: false
  },
  {
    key: 'trending-news',
    name: 'Trending News',
    description: 'Show trending articles based on engagement.',
    category: 'content',
    version: '1.0.0',
    developer: 'SangTX',
    isBuiltIn: true,
    hasConfiguration: true,
    requiresSetup: false,
    features: [
      'View-based trending',
      'Time-based trending',
      'Social shares tracking',
      'Trending widget'
    ],
    isImplemented: false
  },
  {
    key: 'breaking-news',
    name: 'Breaking News',
    description: 'Advanced breaking-news notification and display controls.',
    category: 'content',
    version: '1.0.0',
    developer: 'SangTX',
    isBuiltIn: true,
    hasConfiguration: false,
    configurationRoute: '/admin/breaking',
    requiresSetup: false,
    features: [
      'Breaking news ticker',
      'Priority alerts',
      'Timed display',
      'Breaking badge'
    ],
    isImplemented: false
  },
  {
    key: 'newsletter',
    name: 'Newsletter',
    description: 'Manage newsletter signup and email campaigns.',
    category: 'email',
    version: '1.0.0',
    developer: 'SangTX',
    isBuiltIn: true,
    hasConfiguration: true,
    requiresSetup: false,
    features: [
      'Newsletter signup forms',
      'Subscriber management',
      'Email campaigns',
      'Automated newsletters'
    ],
    isImplemented: false
  },
  {
    key: 'reading-time',
    name: 'Article Reading Time',
    description: 'Automatically calculate article reading time.',
    category: 'content',
    version: '1.0.0',
    developer: 'SangTX',
    isBuiltIn: true,
    hasConfiguration: false,
    requiresSetup: false,
    features: [
      'Automatic calculation',
      'Words per minute setting',
      'Display customization'
    ],
    isImplemented: false
  },
  {
    key: 'author-box',
    name: 'Author Box',
    description: 'Enhanced journalist/author profiles.',
    category: 'content',
    version: '1.0.0',
    developer: 'SangTX',
    isBuiltIn: true,
    hasConfiguration: false,
    requiresSetup: false,
    features: [
      'Author bio',
      'Social links',
      'Author archive',
      'Author avatar'
    ],
    isImplemented: false
  },
  {
    key: 'content-scheduling',
    name: 'Content Scheduling',
    description: 'Schedule articles for future publishing.',
    category: 'content',
    version: '1.0.0',
    developer: 'SangTX',
    isBuiltIn: true,
    hasConfiguration: false,
    requiresSetup: false,
    features: [
      'Schedule publishing',
      'Draft scheduling',
      'Auto-publish',
      'Timezone support'
    ],
    isImplemented: false
  },

  // ── NOTIFICATIONS ────────────────────────────────────────────────────────
  {
    key: 'web-push',
    name: 'Web Push Notifications',
    description: 'Send browser push notifications for breaking news and new articles.',
    category: 'notifications',
    version: '1.0.0',
    developer: 'SangTX',
    isBuiltIn: true,
    hasConfiguration: true,
    requiresSetup: true,
    features: [
      'Browser push notifications',
      'Breaking news alerts',
      'Article notifications',
      'Subscription management'
    ],
    requirements: ['VAPID keys', 'Service worker'],
    isImplemented: false
  },
  {
    key: 'firebase-notifications',
    name: 'Firebase Notifications',
    description: 'Configure Firebase-based notification services.',
    category: 'notifications',
    version: '1.0.0',
    developer: 'SangTX',
    isBuiltIn: true,
    hasConfiguration: true,
    requiresSetup: true,
    features: [
      'FCM integration',
      'Mobile app notifications',
      'Topic subscriptions',
      'Analytics integration'
    ],
    requirements: ['Firebase project', 'FCM credentials'],
    isImplemented: false
  },
  {
    key: 'email-notifications',
    name: 'Email Notifications',
    description: 'Send admin and subscriber notifications.',
    category: 'email',
    version: '1.0.0',
    developer: 'SangTX',
    isBuiltIn: true,
    hasConfiguration: false,
    configurationRoute: '/admin/notifications',
    requiresSetup: false,
    features: [
      'Admin notifications',
      'Subscriber alerts',
      'Breaking news emails',
      'Weekly digests'
    ],
    isImplemented: false
  },

  // ── SECURITY ─────────────────────────────────────────────────────────────
  {
    key: 'security-manager',
    name: 'Security Manager',
    description: 'Security-related CMS configuration.',
    category: 'security',
    version: '1.0.0',
    developer: 'SangTX',
    isBuiltIn: true,
    hasConfiguration: false,
    configurationRoute: '/admin/security',
    requiresSetup: false,
    features: [
      'Security headers',
      'CORS configuration',
      'CSP policies',
      'XSS protection'
    ],
    isImplemented: false
  },
  {
    key: 'login-security',
    name: 'Login Security',
    description: 'Configure login protection and session settings.',
    category: 'security',
    version: '1.0.0',
    developer: 'SangTX',
    isBuiltIn: true,
    hasConfiguration: true,
    requiresSetup: false,
    features: [
      'Login rate limiting',
      'Session management',
      'Password policies',
      'Brute force protection'
    ],
    isImplemented: false
  },
  {
    key: 'activity-log',
    name: 'Activity Log',
    description: 'Track important admin actions.',
    category: 'security',
    version: '1.0.0',
    developer: 'SangTX',
    isBuiltIn: true,
    hasConfiguration: false,
    requiresSetup: false,
    features: [
      'Admin action logging',
      'Content changes',
      'Login attempts',
      'Configuration changes'
    ],
    isImplemented: false
  },
  {
    key: 'two-factor-auth',
    name: 'Two-Factor Authentication',
    description: 'Configure 2FA for administrator accounts.',
    category: 'security',
    version: '1.0.0',
    developer: 'SangTX',
    isBuiltIn: true,
    hasConfiguration: true,
    requiresSetup: false,
    features: [
      'TOTP authentication',
      'SMS backup codes',
      'Recovery codes',
      'Per-user 2FA'
    ],
    isImplemented: false
  },
  {
    key: 'api-security',
    name: 'API Security',
    description: 'Manage API access and security settings.',
    category: 'security',
    version: '1.0.0',
    developer: 'SangTX',
    isBuiltIn: true,
    hasConfiguration: true,
    requiresSetup: false,
    features: [
      'API key management',
      'Rate limiting',
      'IP whitelisting',
      'Access logs'
    ],
    isImplemented: false
  },

  // ── PERFORMANCE ──────────────────────────────────────────────────────────
  {
    key: 'cache-manager',
    name: 'Cache Manager',
    description: 'Manage CMS caching configuration.',
    category: 'performance',
    version: '1.0.0',
    developer: 'SangTX',
    isBuiltIn: true,
    hasConfiguration: true,
    requiresSetup: false,
    features: [
      'Page caching',
      'Object caching',
      'Browser caching',
      'CDN integration'
    ],
    isImplemented: false
  },
  {
    key: 'image-optimization',
    name: 'Image Optimization',
    description: 'Optimize uploaded images.',
    category: 'performance',
    version: '1.0.0',
    developer: 'SangTX',
    isBuiltIn: true,
    hasConfiguration: true,
    requiresSetup: false,
    features: [
      'Automatic compression',
      'Format conversion',
      'Responsive images',
      'WebP support'
    ],
    isImplemented: false
  },
  {
    key: 'lazy-loading',
    name: 'Lazy Loading',
    description: 'Configure image/media lazy loading.',
    category: 'performance',
    version: '1.0.0',
    developer: 'SangTX',
    isBuiltIn: true,
    hasConfiguration: true,
    requiresSetup: false,
    features: [
      'Image lazy loading',
      'Iframe lazy loading',
      'Intersection Observer',
      'Loading placeholders'
    ],
    isImplemented: false
  },
  {
    key: 'performance-monitor',
    name: 'Performance Monitor',
    description: 'Monitor basic site performance metrics.',
    category: 'performance',
    version: '1.0.0',
    developer: 'SangTX',
    isBuiltIn: true,
    hasConfiguration: false,
    requiresSetup: false,
    features: [
      'Page load times',
      'Core Web Vitals',
      'Resource timing',
      'Performance reports'
    ],
    isImplemented: false
  },

  // ── MEDIA ────────────────────────────────────────────────────────────────
  {
    key: 'google-drive',
    name: 'Google Drive Storage',
    description: 'Store uploaded media files in connected Google Drive.',
    category: 'media',
    version: '1.0.0',
    developer: 'SangTX',
    isBuiltIn: true,
    hasConfiguration: true,
    configurationRoute: '/admin/media',
    requiresSetup: true,
    features: [
      'OAuth2 authentication',
      'Media upload to Drive',
      'Thumbnail proxy',
      'Storage management',
      'File deletion'
    ],
    requirements: ['Google Cloud project', 'OAuth credentials'],
    isImplemented: true
  },
  {
    key: 'media-optimization',
    name: 'Media Optimization',
    description: 'Configure image/media optimization options.',
    category: 'media',
    version: '1.0.0',
    developer: 'SangTX',
    isBuiltIn: true,
    hasConfiguration: true,
    requiresSetup: false,
    features: [
      'Image compression',
      'Format conversion',
      'Thumbnail generation',
      'Quality settings'
    ],
    isImplemented: false
  },

  // ── EMAIL ────────────────────────────────────────────────────────────────
  {
    key: 'smtp-manager',
    name: 'SMTP Manager',
    description: 'Configure SMTP provider for outgoing emails.',
    category: 'email',
    version: '1.0.0',
    developer: 'SangTX',
    isBuiltIn: true,
    hasConfiguration: true,
    requiresSetup: true,
    features: [
      'SMTP configuration',
      'Email testing',
      'Authentication',
      'SSL/TLS support'
    ],
    requirements: ['SMTP server credentials'],
    isImplemented: false
  },
  {
    key: 'email-templates',
    name: 'Email Templates',
    description: 'Manage system email templates.',
    category: 'email',
    version: '1.0.0',
    developer: 'SangTX',
    isBuiltIn: true,
    hasConfiguration: true,
    requiresSetup: false,
    features: [
      'Welcome emails',
      'Password reset',
      'Newsletter templates',
      'Notification templates'
    ],
    isImplemented: false
  },
  {
    key: 'newsletter-email',
    name: 'Newsletter Email',
    description: 'Configure newsletter delivery.',
    category: 'email',
    version: '1.0.0',
    developer: 'SangTX',
    isBuiltIn: true,
    hasConfiguration: true,
    requiresSetup: false,
    features: [
      'Newsletter design',
      'Scheduled sending',
      'Subscriber segments',
      'Delivery tracking'
    ],
    isImplemented: false
  },

  // ── UTILITIES ────────────────────────────────────────────────────────────
  {
    key: 'custom-code',
    name: 'Custom Code',
    description: 'Manage approved custom scripts/snippets.',
    category: 'utilities',
    version: '1.0.0',
    developer: 'SangTX',
    isBuiltIn: true,
    hasConfiguration: true,
    requiresSetup: false,
    features: [
      'Header scripts',
      'Footer scripts',
      'Custom CSS',
      'Analytics code'
    ],
    isImplemented: false
  },
  {
    key: 'robots-txt',
    name: 'Robots.txt Manager',
    description: 'Manage robots.txt configuration.',
    category: 'utilities',
    version: '1.0.0',
    developer: 'SangTX',
    isBuiltIn: true,
    hasConfiguration: true,
    requiresSetup: false,
    features: [
      'robots.txt editor',
      'Crawl rules',
      'Sitemap references',
      'User-agent rules'
    ],
    isImplemented: false
  },
  {
    key: 'redirect-manager',
    name: 'Redirect Manager',
    description: 'Manage 301/302 redirects.',
    category: 'utilities',
    version: '1.0.0',
    developer: 'SangTX',
    isBuiltIn: true,
    hasConfiguration: true,
    requiresSetup: false,
    features: [
      '301 permanent redirects',
      '302 temporary redirects',
      'Bulk import',
      'Redirect testing'
    ],
    isImplemented: false
  },
  {
    key: 'custom-fields',
    name: 'Custom Fields',
    description: 'Add configurable metadata fields to content.',
    category: 'utilities',
    version: '1.0.0',
    developer: 'SangTX',
    isBuiltIn: true,
    hasConfiguration: true,
    requiresSetup: false,
    features: [
      'Custom article fields',
      'Field types',
      'Conditional fields',
      'Field groups'
    ],
    isImplemented: false
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

export function getPluginByKey(key: string): Plugin | undefined {
  return PLUGIN_REGISTRY.find(p => p.key === key);
}

export function getPluginsByCategory(category: PluginCategory): Plugin[] {
  return PLUGIN_REGISTRY.filter(p => p.category === category);
}

export function getImplementedPlugins(): Plugin[] {
  return PLUGIN_REGISTRY.filter(p => p.isImplemented);
}

export function getAvailablePlugins(): Plugin[] {
  return PLUGIN_REGISTRY.filter(p => !p.isImplemented);
}

export function searchPlugins(query: string): Plugin[] {
  const lowercaseQuery = query.toLowerCase();
  return PLUGIN_REGISTRY.filter(p =>
    p.name.toLowerCase().includes(lowercaseQuery) ||
    p.description.toLowerCase().includes(lowercaseQuery) ||
    p.category.toLowerCase().includes(lowercaseQuery) ||
    p.developer.toLowerCase().includes(lowercaseQuery)
  );
}

export const PLUGIN_CATEGORIES: { value: PluginCategory; label: string; icon: string }[] = [
  { value: 'seo', label: 'SEO', icon: '🔍' },
  { value: 'analytics', label: 'Analytics', icon: '📊' },
  { value: 'monetization', label: 'Monetization', icon: '💰' },
  { value: 'social', label: 'Social Media', icon: '🌐' },
  { value: 'security', label: 'Security', icon: '🔒' },
  { value: 'performance', label: 'Performance', icon: '⚡' },
  { value: 'email', label: 'Email', icon: '📧' },
  { value: 'notifications', label: 'Notifications', icon: '🔔' },
  { value: 'content', label: 'Content', icon: '📝' },
  { value: 'media', label: 'Media', icon: '🖼️' },
  { value: 'advertising', label: 'Advertising', icon: '📢' },
  { value: 'google', label: 'Google', icon: 'G' },
  { value: 'utilities', label: 'Utilities', icon: '🔧' },
];
