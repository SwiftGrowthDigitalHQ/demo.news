/**
 * Plugin Icon Registry
 * 
 * Central registry for all plugin icons.
 * Uses SVG components for scalability and consistency.
 */

import React from 'react';

export interface PluginIconProps {
  className?: string;
  size?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// THIRD-PARTY SERVICE ICONS (Brand Colors)
// ═══════════════════════════════════════════════════════════════════════════

export const GoogleAnalyticsIcon: React.FC<PluginIconProps> = ({ className, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M22.84 2.998v17.999a3.002 3.002 0 01-6.003 0V2.998a3.002 3.002 0 016.003 0z" fill="#F9AB00"/>
    <path d="M14.493 8.996v11.999a3.002 3.002 0 01-6.004 0V8.996a3.002 3.002 0 016.004 0z" fill="#E37400"/>
    <path d="M6.146 14.995v6a3.002 3.002 0 01-6.003 0v-6a3.002 3.002 0 016.003 0z" fill="#E37400"/>
  </svg>
);

export const GoogleAdsenseIcon: React.FC<PluginIconProps> = ({ className, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="3" y="3" width="18" height="18" rx="2" fill="#4285F4"/>
    <path d="M12 7v10M7 12h10" stroke="white" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const GoogleDriveIcon: React.FC<PluginIconProps> = ({ className, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M8.5 3.5l-6 10.392L5.5 20.5h13l3-6.608L15.5 3.5h-7z" fill="#34A853"/>
    <path d="M8.5 3.5l-6 10.392h7L15.5 3.5h-7z" fill="#FBBC04"/>
    <path d="M15.5 20.5l6.5-10.716-3-6.284L12 13.892 15.5 20.5z" fill="#4285F4"/>
  </svg>
);

export const GoogleSearchConsoleIcon: React.FC<PluginIconProps> = ({ className, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="10" cy="10" r="7" stroke="#4285F4" strokeWidth="2" fill="none"/>
    <path d="M15 15l5 5" stroke="#4285F4" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="10" cy="10" r="4" fill="#4285F4"/>
  </svg>
);

export const FacebookIcon: React.FC<PluginIconProps> = ({ className, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect width="24" height="24" rx="12" fill="#1877F2"/>
    <path d="M13.5 12.5V19h-3v-6.5H9V10h1.5V8.5c0-2 1-3 3-3h2v2.5h-1.5c-.5 0-.5.5-.5.5V10h2l-.5 2.5h-1.5z" fill="white"/>
  </svg>
);

export const YoutubeIcon: React.FC<PluginIconProps> = ({ className, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="2" y="5" width="20" height="14" rx="3" fill="#FF0000"/>
    <path d="M10 8.5l6 3.5-6 3.5v-7z" fill="white"/>
  </svg>
);

export const TelegramIcon: React.FC<PluginIconProps> = ({ className, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" fill="#0088cc"/>
    <path d="M8 12.5l3 3 5-8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const WhatsappIcon: React.FC<PluginIconProps> = ({ className, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" fill="#25D366"/>
    <path d="M8 16l1-3c-.5-1-1-2-1-3 0-2.5 2-4.5 4.5-4.5S17 7.5 17 10c0 2.5-2 4.5-4.5 4.5H12l-4 1.5z" fill="white"/>
  </svg>
);

// ═══════════════════════════════════════════════════════════════════════════
// SANGTX CUSTOM PLUGIN ICONS
// ═══════════════════════════════════════════════════════════════════════════

export const SEOIcon: React.FC<PluginIconProps> = ({ className, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
    <path d="M7 8h10M7 12h10M7 16h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="17" cy="16" r="3" fill="currentColor"/>
  </svg>
);

export const SitemapIcon: React.FC<PluginIconProps> = ({ className, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="9" y="3" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="2"/>
    <rect x="3" y="12" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="2"/>
    <rect x="15" y="12" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="2"/>
    <path d="M12 7v3M6 12V9h12v3" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

export const NewsIcon: React.FC<PluginIconProps> = ({ className, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M8 7h8M8 11h8M8 15h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const SchemaIcon: React.FC<PluginIconProps> = ({ className, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M12 3l9 5v8l-9 5-9-5V8l9-5z" stroke="currentColor" strokeWidth="2" fill="none"/>
    <path d="M12 3v8M12 16v5M3 8l9 5M21 8l-9 5" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

export const SocialIcon: React.FC<PluginIconProps> = ({ className, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="2"/>
    <circle cx="17" cy="7" r="3" stroke="currentColor" strokeWidth="2"/>
    <circle cx="12" cy="17" r="3" stroke="currentColor" strokeWidth="2"/>
    <path d="M9 9l3 6M15 9l-3 6" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

export const AdIcon: React.FC<PluginIconProps> = ({ className, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
    <circle cx="8" cy="12" r="2" fill="currentColor"/>
    <path d="M12 10l4 4-4 4v-8z" fill="currentColor"/>
  </svg>
);

export const SecurityIcon: React.FC<PluginIconProps> = ({ className, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M12 2l8 3v7c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V5l8-3z" stroke="currentColor" strokeWidth="2" fill="none"/>
    <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const PerformanceIcon: React.FC<PluginIconProps> = ({ className, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M3 17l4-4 4 4 10-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M21 7l-4-4v4h4z" fill="currentColor"/>
  </svg>
);

export const EmailIcon: React.FC<PluginIconProps> = ({ className, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M3 7l9 6 9-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const NotificationIcon: React.FC<PluginIconProps> = ({ className, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M10 5a2 2 0 014 0v1a7 7 0 017 7v4l2 2v1H1v-1l2-2v-4a7 7 0 017-7V5z" stroke="currentColor" strokeWidth="2"/>
    <path d="M9 20c0 1.5 1.5 3 3 3s3-1.5 3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const MediaIcon: React.FC<PluginIconProps> = ({ className, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
    <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
    <path d="M3 15l5-5 4 4 5-5 4 4v7H3v-5z" fill="currentColor" opacity="0.5"/>
  </svg>
);

export const ContentIcon: React.FC<PluginIconProps> = ({ className, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="5" y="3" width="14" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M9 7h6M9 11h6M9 15h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const UtilityIcon: React.FC<PluginIconProps> = ({ className, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
    <path d="M12 3v2M12 19v2M3 12h2M19 12h2M6 6l1.5 1.5M16.5 16.5L18 18M6 18l1.5-1.5M16.5 7.5L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const CacheIcon: React.FC<PluginIconProps> = ({ className, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const CodeIcon: React.FC<PluginIconProps> = ({ className, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M8 8l-4 4 4 4M16 8l4 4-4 4M13 3l-2 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// ═══════════════════════════════════════════════════════════════════════════
// ICON REGISTRY MAP
// ═══════════════════════════════════════════════════════════════════════════

export const PLUGIN_ICON_MAP: Record<string, React.FC<PluginIconProps>> = {
  // SEO
  'seo-manager': SEOIcon,
  'xml-sitemap': SitemapIcon,
  'news-sitemap': NewsIcon,
  'schema-markup': SchemaIcon,
  'open-graph': SocialIcon,
  'seo-visibility': SEOIcon,

  // Google
  'google-analytics': GoogleAnalyticsIcon,
  'google-search-console': GoogleSearchConsoleIcon,
  'google-adsense': GoogleAdsenseIcon,
  'google-news': NewsIcon,

  // Monetization
  'advertisement-manager': AdIcon,
  'ad-placement': AdIcon,
  'sponsored-content': ContentIcon,
  'subscription-manager': ContentIcon,

  // Social
  'social-media': SocialIcon,
  'facebook-publisher': FacebookIcon,
  'youtube-integration': YoutubeIcon,
  'telegram-integration': TelegramIcon,
  'whatsapp-sharing': WhatsappIcon,

  // Content
  'related-articles': ContentIcon,
  'trending-news': PerformanceIcon,
  'breaking-news': NotificationIcon,
  'newsletter': EmailIcon,
  'reading-time': ContentIcon,
  'author-box': ContentIcon,
  'content-scheduling': ContentIcon,

  // Notifications
  'web-push': NotificationIcon,
  'firebase-notifications': NotificationIcon,
  'email-notifications': EmailIcon,

  // Security
  'security-manager': SecurityIcon,
  'login-security': SecurityIcon,
  'activity-log': ContentIcon,
  'two-factor-auth': SecurityIcon,
  'api-security': SecurityIcon,

  // Performance
  'cache-manager': CacheIcon,
  'image-optimization': MediaIcon,
  'lazy-loading': PerformanceIcon,
  'performance-monitor': PerformanceIcon,

  // Media
  'google-drive': GoogleDriveIcon,
  'media-optimization': MediaIcon,

  // Email
  'smtp-manager': EmailIcon,
  'email-templates': EmailIcon,
  'newsletter-email': EmailIcon,

  // Utilities
  'custom-code': CodeIcon,
  'robots-txt': ContentIcon,
  'redirect-manager': UtilityIcon,
  'custom-fields': UtilityIcon,
};

export function getPluginIcon(pluginKey: string): React.FC<PluginIconProps> {
  return PLUGIN_ICON_MAP[pluginKey] || ContentIcon;
}
