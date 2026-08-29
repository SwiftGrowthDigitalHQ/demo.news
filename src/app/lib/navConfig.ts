/**
 * Central Navigation Configuration
 * 
 * Defines all admin sections with their metadata and access control.
 * This is the single source of truth for sidebar navigation.
 */

import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Newspaper,
  Users,
  Megaphone,
  Image,
  Search,
  CreditCard,
  Shield,
  BarChart3,
  Settings,
  Radio,
  FileText,
  Bell,
  Tag,
  Package,
  Footprints,
  Globe,
} from 'lucide-react';
import type { AdminSection } from './permissions';

// ═══════════════════════════════════════════════════════════════════════════
// NAVIGATION ITEM DEFINITION
// ═══════════════════════════════════════════════════════════════════════════

export interface NavItem {
  id: AdminSection;
  label: string;
  icon: LucideIcon;
  category: string;
  /** If true, ONLY Super Admin can see this */
  superAdminOnly?: boolean;
  /** If true, ONLY Tenant users can see this (NOT Super Admin) */
  tenantOnly?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// NAVIGATION ITEMS - COMPLETE LIST
// ═══════════════════════════════════════════════════════════════════════════

export const ALL_NAV_ITEMS: NavItem[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // OVERVIEW - Available to ALL roles
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'overview',
    label: 'Dashboard',
    icon: LayoutDashboard,
    category: 'OVERVIEW',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    category: 'OVERVIEW',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // CONTENT MANAGEMENT - Tenant Only (news website operations)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'news',
    label: 'News Management',
    icon: Newspaper,
    category: 'CONTENT',
    tenantOnly: true,
  },
  {
    id: 'categories',
    label: 'Categories',
    icon: Tag,
    category: 'CONTENT',
    tenantOnly: true,
  },
  {
    id: 'breaking',
    label: 'Breaking News',
    icon: Radio,
    category: 'CONTENT',
    tenantOnly: true,
  },
  {
    id: 'media',
    label: 'Media Library',
    icon: Image,
    category: 'CONTENT',
    tenantOnly: true,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // TEAM MANAGEMENT - Tenant Only
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'journalists',
    label: 'Reporters',
    icon: Users,
    category: 'TEAM',
    tenantOnly: true,
  },
  {
    id: 'users',
    label: 'Users',
    icon: Shield,
    category: 'TEAM',
    tenantOnly: true,
  },
  {
    id: 'roles',
    label: 'Roles',
    icon: Shield,
    category: 'TEAM',
    tenantOnly: true,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // MONETIZATION - Tenant Only
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'ads',
    label: 'Advertisements',
    icon: Megaphone,
    category: 'MONETIZATION',
    tenantOnly: true,
  },
  {
    id: 'subscriptions',
    label: 'Newsletter Subscribers',
    icon: CreditCard,
    category: 'MONETIZATION',
    tenantOnly: true,
  },
  {
    id: 'my-subscription',
    label: 'My Subscription',
    icon: CreditCard,
    category: 'MONETIZATION',
    tenantOnly: true,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // GROWTH & SEO - Tenant Only
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'seo',
    label: 'SEO Management',
    icon: Search,
    category: 'GROWTH',
    tenantOnly: true,
  },
  {
    id: 'seo-manager',
    label: 'SEO Manager Plugin',
    icon: Search,
    category: 'GROWTH',
    tenantOnly: true,
  },
  {
    id: 'xml-sitemap',
    label: 'XML Sitemap',
    icon: FileText,
    category: 'GROWTH',
    tenantOnly: true,
  },
  {
    id: 'google-analytics',
    label: 'Google Analytics',
    icon: BarChart3,
    category: 'GROWTH',
    tenantOnly: true,
  },
  {
    id: 'google-search-console',
    label: 'Google Search Console',
    icon: Search,
    category: 'GROWTH',
    tenantOnly: true,
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell,
    category: 'GROWTH',
    tenantOnly: true,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // INTEGRATIONS - Tenant Only (plugins for their website)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'plugins',
    label: 'Plugins',
    icon: Package,
    category: 'INTEGRATIONS',
    tenantOnly: true,
  },
  {
    id: 'google-adsense',
    label: 'Google AdSense',
    icon: Megaphone,
    category: 'INTEGRATIONS',
    tenantOnly: true,
  },
  {
    id: 'facebook-publisher',
    label: 'Facebook Publisher',
    icon: FileText,
    category: 'INTEGRATIONS',
    tenantOnly: true,
  },
  {
    id: 'youtube-integration',
    label: 'YouTube Integration',
    icon: FileText,
    category: 'INTEGRATIONS',
    tenantOnly: true,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // WEBSITE SETTINGS - Tenant Only (their website configuration)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    category: 'WEBSITE',
    tenantOnly: true,
  },
  {
    id: 'footer',
    label: 'Footer',
    icon: Footprints,
    category: 'WEBSITE',
    tenantOnly: true,
  },
  {
    id: 'domains',
    label: 'Custom Domain',
    icon: Globe,
    category: 'WEBSITE',
    tenantOnly: true,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // PLATFORM MANAGEMENT - Super Admin ONLY
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'tenants',
    label: 'Tenants',
    icon: Users,
    category: 'PLATFORM',
    superAdminOnly: true,
  },
  {
    id: 'tenant-payments',
    label: 'Payments',
    icon: CreditCard,
    category: 'PLATFORM',
    superAdminOnly: true,
  },
  {
    id: 'security',
    label: 'Security',
    icon: Shield,
    category: 'PLATFORM',
    superAdminOnly: true,
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: FileText,
    category: 'PLATFORM',
    superAdminOnly: true,
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// FILTERING HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get navigation items for Super Admin
 * Super Admin sees ONLY platform management + overview/analytics
 */
export function getSuperAdminNavItems(): NavItem[] {
  return ALL_NAV_ITEMS.filter(
    (item) =>
      item.superAdminOnly || item.id === 'overview' || item.id === 'analytics'
  );
}

/**
 * Get navigation items for Tenant Admin/Users
 * Tenant users see ONLY tenant-level features (no platform sections)
 */
export function getTenantNavItems(): NavItem[] {
  return ALL_NAV_ITEMS.filter((item) => !item.superAdminOnly);
}

/**
 * Group navigation items by category
 */
export function groupNavItemsByCategory(
  items: NavItem[]
): Array<{ label: string; items: NavItem[] }> {
  const grouped = items.reduce(
    (acc, item) => {
      const existing = acc.find((section) => section.label === item.category);
      if (existing) {
        existing.items.push(item);
      } else {
        acc.push({
          label: item.category,
          items: [item],
        });
      }
      return acc;
    },
    [] as Array<{ label: string; items: NavItem[] }>
  );

  return grouped;
}
