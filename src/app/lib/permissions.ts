/**
 * Central Permission & Role Management System
 * 
 * Defines strict role-based access control for the multi-tenant SaaS platform.
 * 
 * THREE ROLE LEVELS:
 * 1. SUPER_ADMIN - Platform owner (manages all tenants, platform settings)
 * 2. TENANT_ADMIN - Customer/tenant owner (manages their own website)
 * 3. TENANT_USER - Staff within a tenant (reporters, editors, etc.)
 */

import type { AuthProfile } from './auth';

// ═══════════════════════════════════════════════════════════════════════════
// ROLE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

export type UserRole = 'super_admin' | 'tenant_admin' | 'tenant_user';

export interface UserPermissions {
  // Platform-level (Super Admin only)
  canManagePlatform: boolean;
  canManageTenants: boolean;
  canViewAllTenants: boolean;
  canManagePlatformSettings: boolean;
  canViewPlatformReports: boolean;
  canManagePlatformPayments: boolean;
  canManagePlatformPlugins: boolean;
  canManagePlatformSecurity: boolean;
  
  // Tenant-level (Tenant Admin + appropriate users)
  canManageTenantSettings: boolean;
  canManageContent: boolean;
  canManageMedia: boolean;
  canManageCategories: boolean;
  canManageUsers: boolean;
  canManageAdvertisements: boolean;
  canManageNewsletter: boolean;
  canManageSEO: boolean;
  canManageTheme: boolean;
  canManageFooter: boolean;
  canViewAnalytics: boolean;
  canPublishContent: boolean;
  
  // Read-only permissions
  canViewContent: boolean;
  canViewMedia: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN SECTIONS & REQUIRED PERMISSIONS
// ═══════════════════════════════════════════════════════════════════════════

export type AdminSection =
  // Overview
  | 'overview'
  | 'analytics'
  // Content
  | 'news'
  | 'categories'
  | 'breaking'
  | 'media'
  // Team
  | 'journalists'
  | 'users'
  | 'roles'
  // Monetization
  | 'ads'
  | 'subscriptions'
  | 'my-subscription'
  // Growth
  | 'seo'
  | 'seo-manager'
  | 'xml-sitemap'
  | 'google-adsense'
  | 'google-analytics'
  | 'google-search-console'
  | 'facebook-publisher'
  | 'youtube-integration'
  | 'notifications'
  // System (Tenant)
  | 'settings'
  | 'footer'
  | 'domains'
  // Platform (Super Admin Only)
  | 'tenant-payments'
  | 'tenants'
  | 'plugins'
  | 'security'
  | 'reports';

/**
 * Super Admin ONLY sections (platform management)
 */
export const SUPER_ADMIN_ONLY_SECTIONS: AdminSection[] = [
  'tenants',
  'tenant-payments',
  'security',
  'reports',
];

/**
 * Tenant Admin sections (customer website management)
 */
export const TENANT_ADMIN_SECTIONS: AdminSection[] = [
  'overview',
  'analytics',
  'news',
  'categories',
  'breaking',
  'media',
  'journalists',
  'users',
  'roles',
  'ads',
  'subscriptions',
  'my-subscription',
  'seo',
  'seo-manager',
  'xml-sitemap',
  'google-adsense',
  'google-analytics',
  'google-search-console',
  'facebook-publisher',
  'youtube-integration',
  'notifications',
  'settings',
  'footer',
  'domains',
  'plugins', // IMPORTANT: Plugins is tenant-level, not platform-level
];

/**
 * Sections that require publish permission
 */
export const PUBLISH_REQUIRED_SECTIONS: AdminSection[] = [
  'news',
  'breaking',
];

// ═══════════════════════════════════════════════════════════════════════════
// PERMISSION HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Determine user's effective role
 */
export function getUserRole(profile: AuthProfile | null): UserRole | null {
  if (!profile) return null;
  
  // Super Admin: has super_admin role
  if (profile.role_slug === 'super_admin') {
    return 'super_admin';
  }
  
  // Tenant Admin: owns a tenant
  if (profile.owned_tenant_id) {
    return 'tenant_admin';
  }
  
  // Tenant User: has other roles (admin, editor, journalist, etc.)
  if (profile.role_slug) {
    return 'tenant_user';
  }
  
  return null;
}

/**
 * Check if user is Super Admin
 */
export function isSuperAdmin(profile: AuthProfile | null): boolean {
  return getUserRole(profile) === 'super_admin';
}

/**
 * Check if user is Tenant Admin (customer/owner)
 */
export function isTenantAdmin(profile: AuthProfile | null): boolean {
  return getUserRole(profile) === 'tenant_admin';
}

/**
 * Check if user is a tenant user (staff member)
 */
export function isTenantUser(profile: AuthProfile | null): boolean {
  return getUserRole(profile) === 'tenant_user';
}

/**
 * Check if user can access admin area at all
 */
export function canAccessAdmin(profile: AuthProfile | null): boolean {
  const role = getUserRole(profile);
  return role !== null;
}

/**
 * Get all permissions for a user
 */
export function getUserPermissions(profile: AuthProfile | null): UserPermissions {
  const role = getUserRole(profile);
  
  if (role === 'super_admin') {
    return {
      // Platform-level
      canManagePlatform: true,
      canManageTenants: true,
      canViewAllTenants: true,
      canManagePlatformSettings: true,
      canViewPlatformReports: true,
      canManagePlatformPayments: true,
      canManagePlatformPlugins: true,
      canManagePlatformSecurity: true,
      
      // Tenant-level (Super Admin can do everything)
      canManageTenantSettings: true,
      canManageContent: true,
      canManageMedia: true,
      canManageCategories: true,
      canManageUsers: true,
      canManageAdvertisements: true,
      canManageNewsletter: true,
      canManageSEO: true,
      canManageTheme: true,
      canManageFooter: true,
      canViewAnalytics: true,
      canPublishContent: true,
      
      // Read-only
      canViewContent: true,
      canViewMedia: true,
    };
  }
  
  if (role === 'tenant_admin') {
    return {
      // Platform-level (DENIED)
      canManagePlatform: false,
      canManageTenants: false,
      canViewAllTenants: false,
      canManagePlatformSettings: false,
      canViewPlatformReports: false,
      canManagePlatformPayments: false,
      canManagePlatformPlugins: false,
      canManagePlatformSecurity: false,
      
      // Tenant-level (FULL ACCESS to own tenant)
      canManageTenantSettings: true,
      canManageContent: true,
      canManageMedia: true,
      canManageCategories: true,
      canManageUsers: true,
      canManageAdvertisements: true,
      canManageNewsletter: true,
      canManageSEO: true,
      canManageTheme: true,
      canManageFooter: true,
      canViewAnalytics: true,
      canPublishContent: true,
      
      // Read-only
      canViewContent: true,
      canViewMedia: true,
    };
  }
  
  if (role === 'tenant_user') {
    // Tenant users have permissions based on their specific role
    // For now, give reasonable defaults - can be extended based on role_slug
    const roleSlug = profile?.role_slug ?? '';
    
    return {
      // Platform-level (DENIED)
      canManagePlatform: false,
      canManageTenants: false,
      canViewAllTenants: false,
      canManagePlatformSettings: false,
      canViewPlatformReports: false,
      canManagePlatformPayments: false,
      canManagePlatformPlugins: false,
      canManagePlatformSecurity: false,
      
      // Tenant-level (LIMITED based on role)
      canManageTenantSettings: roleSlug === 'admin',
      canManageContent: ['admin', 'editor'].includes(roleSlug),
      canManageMedia: ['admin', 'editor'].includes(roleSlug),
      canManageCategories: roleSlug === 'admin',
      canManageUsers: roleSlug === 'admin',
      canManageAdvertisements: roleSlug === 'admin',
      canManageNewsletter: roleSlug === 'admin',
      canManageSEO: ['admin', 'editor'].includes(roleSlug),
      canManageTheme: roleSlug === 'admin',
      canManageFooter: roleSlug === 'admin',
      canViewAnalytics: ['admin', 'editor'].includes(roleSlug),
      canPublishContent: ['admin', 'editor'].includes(roleSlug),
      
      // Read-only
      canViewContent: true,
      canViewMedia: true,
    };
  }
  
  // No role = no permissions
  return {
    canManagePlatform: false,
    canManageTenants: false,
    canViewAllTenants: false,
    canManagePlatformSettings: false,
    canViewPlatformReports: false,
    canManagePlatformPayments: false,
    canManagePlatformPlugins: false,
    canManagePlatformSecurity: false,
    canManageTenantSettings: false,
    canManageContent: false,
    canManageMedia: false,
    canManageCategories: false,
    canManageUsers: false,
    canManageAdvertisements: false,
    canManageNewsletter: false,
    canManageSEO: false,
    canManageTheme: false,
    canManageFooter: false,
    canViewAnalytics: false,
    canPublishContent: false,
    canViewContent: false,
    canViewMedia: false,
  };
}

/**
 * Check if user can access a specific admin section
 */
export function canAccessSection(
  profile: AuthProfile | null,
  section: AdminSection
): boolean {
  const role = getUserRole(profile);
  
  if (!role) return false;
  
  // Super Admin can access everything
  if (role === 'super_admin') {
    return true;
  }
  
  // Check if section is Super Admin only
  if (SUPER_ADMIN_ONLY_SECTIONS.includes(section)) {
    return false; // Only Super Admin can access these
  }
  
  // Tenant Admin can access all tenant sections
  if (role === 'tenant_admin') {
    return TENANT_ADMIN_SECTIONS.includes(section);
  }
  
  // Tenant User: check specific permissions
  if (role === 'tenant_user') {
    const permissions = getUserPermissions(profile);
    
    // Map sections to permissions
    const sectionPermissionMap: Record<AdminSection, keyof UserPermissions> = {
      'overview': 'canViewAnalytics',
      'analytics': 'canViewAnalytics',
      'news': 'canManageContent',
      'categories': 'canManageCategories',
      'breaking': 'canManageContent',
      'media': 'canManageMedia',
      'journalists': 'canManageUsers',
      'users': 'canManageUsers',
      'roles': 'canManageUsers',
      'ads': 'canManageAdvertisements',
      'subscriptions': 'canManageNewsletter',
      'my-subscription': 'canViewAnalytics',
      'seo': 'canManageSEO',
      'seo-manager': 'canManageSEO',
      'xml-sitemap': 'canManageSEO',
      'google-adsense': 'canManageAdvertisements',
      'google-analytics': 'canViewAnalytics',
      'google-search-console': 'canManageSEO',
      'facebook-publisher': 'canManageContent',
      'youtube-integration': 'canManageContent',
      'notifications': 'canManageContent',
      'settings': 'canManageTenantSettings',
      'footer': 'canManageFooter',
      'domains': 'canManageTenantSettings',
      'plugins': 'canManageTenantSettings', // Tenant-level plugin management
      'tenant-payments': 'canManagePlatformPayments',
      'tenants': 'canManageTenants',
      'security': 'canManagePlatformSecurity',
      'reports': 'canViewPlatformReports',
    };
    
    const requiredPermission = sectionPermissionMap[section];
    return requiredPermission ? permissions[requiredPermission] : false;
  }
  
  return false;
}

/**
 * Get sections that should be visible to the user in the sidebar
 */
export function getVisibleSections(profile: AuthProfile | null): AdminSection[] {
  const role = getUserRole(profile);
  
  if (!role) return [];
  
  if (role === 'super_admin') {
    // Super Admin sees ONLY platform management sections
    return [...SUPER_ADMIN_ONLY_SECTIONS, 'overview', 'analytics', 'reports'];
  }
  
  if (role === 'tenant_admin') {
    // Tenant Admin sees ALL tenant management sections (no platform sections)
    return TENANT_ADMIN_SECTIONS;
  }
  
  if (role === 'tenant_user') {
    // Tenant User sees only sections they have permission for
    return TENANT_ADMIN_SECTIONS.filter(section => canAccessSection(profile, section));
  }
  
  return [];
}

/**
 * Get user's display role name
 */
export function getRoleDisplayName(profile: AuthProfile | null): string {
  const role = getUserRole(profile);
  
  if (role === 'super_admin') return 'Super Admin';
  if (role === 'tenant_admin') return 'Tenant Admin';
  if (role === 'tenant_user') {
    return profile?.role_name ?? 'User';
  }
  
  return 'Guest';
}
