import { Bell, Search, Sun, Moon, Menu, ChevronDown, Building2 } from 'lucide-react';
import { useCms } from '../../lib/cms';
import { useTenant } from '../../lib/useTenant';
import { useSubscriptionAccess } from '../../lib/useSubscriptionAccess';
import { getStatusMessage, getStatusColor } from '../../lib/subscriptionService';
import { resolveAssetUrl } from '../../lib/assetResolver';

interface Props {
  section: string;
  darkMode: boolean;
  onToggleDark: () => void;
  onToggleNotifications?: () => void;
  onToggleSidebar: () => void;
}

const sectionTitles: Record<string, { title: string; breadcrumb: string }> = {
  overview: { title: 'Dashboard Overview', breadcrumb: 'Home / Dashboard' },
  analytics: { title: 'Analytics & Reports', breadcrumb: 'Home / Analytics' },
  news: { title: 'News Management', breadcrumb: 'Home / News' },
  categories: { title: 'Categories', breadcrumb: 'Home / Categories' },
  breaking: { title: 'Breaking News Control', breadcrumb: 'Home / Breaking News' },
  media: { title: 'Media Library', breadcrumb: 'Home / Media' },
  journalists: { title: 'Journalist Management', breadcrumb: 'Home / Journalists' },
  users: { title: 'User & Role Management', breadcrumb: 'Home / Users' },
  roles: { title: 'Role Management', breadcrumb: 'Home / Roles' },
  ads: { title: 'Advertisement Management', breadcrumb: 'Home / Ads' },
  subscriptions: { title: 'Newsletter Subscribers', breadcrumb: 'Home / Subscriptions' },
  'my-subscription': { title: 'My Subscription', breadcrumb: 'Home / My Subscription' },
  seo: { title: 'SEO Management', breadcrumb: 'Home / SEO' },
  'seo-manager': { title: 'SEO Manager Plugin', breadcrumb: 'Home / SEO Manager' },
  'xml-sitemap': { title: 'XML Sitemap', breadcrumb: 'Home / XML Sitemap' },
  'google-adsense': { title: 'Google AdSense', breadcrumb: 'Home / Google AdSense' },
  'google-analytics': { title: 'Google Analytics', breadcrumb: 'Home / Google Analytics' },
  'google-search-console': { title: 'Google Search Console', breadcrumb: 'Home / Search Console' },
  'facebook-publisher': { title: 'Facebook Publisher', breadcrumb: 'Home / Facebook' },
  'youtube-integration': { title: 'YouTube Integration', breadcrumb: 'Home / YouTube' },
  notifications: { title: 'Notifications', breadcrumb: 'Home / Notifications' },
  settings: { title: 'Website Settings', breadcrumb: 'Home / Settings' },
  footer: { title: 'Footer Management', breadcrumb: 'Home / Footer' },
  domains: { title: 'Custom Domain', breadcrumb: 'Home / Custom Domain' },
  plugins: { title: 'Plugins', breadcrumb: 'Home / Plugins' },
  security: { title: 'Security & Audit', breadcrumb: 'Home / Security' },
  reports: { title: 'Reports & Exports', breadcrumb: 'Home / Reports' },
  tenants: { title: 'Tenant Management', breadcrumb: 'Platform / Tenants' },
  'tenant-payments': { title: 'Payment Management', breadcrumb: 'Platform / Payments' },
};

export function AdminHeader({ section, darkMode, onToggleDark, onToggleNotifications, onToggleSidebar }: Props) {
  const info = sectionTitles[section] || { title: 'Dashboard', breadcrumb: 'Home' };
  const { siteSettings } = useCms();
  const { tenant } = useTenant();
  const access = useSubscriptionAccess(tenant?.id);
  const now = new Date();
  const dateStr = now.toLocaleDateString('hi-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Show subscription status badge if not super admin and has tenant
  const showSubscriptionBadge = !access.isSuperAdmin && access.status && tenant;
  
  // Use tenant name for Tenant Admin, platform name for Super Admin
  const contextName = access.isSuperAdmin 
    ? 'SangTX Platform' 
    : (tenant?.name ?? siteSettings?.site_name ?? 'Admin');
  
  // Tenant logo for top-right selector
  const tenantLogoUrl = access.isSuperAdmin 
    ? null 
    : (tenant?.logoUrl ? resolveAssetUrl(tenant.logoUrl) : null);
  
  const brandColor = tenant?.primaryColor ?? '#dc2626';

  return (
    <header
      className="flex items-center gap-4 px-6 border-b dark:bg-gray-800 dark:border-gray-700"
      style={{
        height: 60,
        background: darkMode ? undefined : '#ffffff',
        borderColor: darkMode ? undefined : 'rgba(15,23,42,0.08)',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        zIndex: 20,
      }}
    >
      <button
        onClick={onToggleSidebar}
        className="flex items-center justify-center rounded-lg dark:text-gray-300 dark:border-gray-600"
        style={{ width: 36, height: 36, color: darkMode ? undefined : '#64748b', border: darkMode ? undefined : '1px solid rgba(15,23,42,0.08)' }}
      >
        <Menu size={18} />
      </button>

      <div className="flex-1">
        <h1 className="dark:text-white" style={{ fontSize: 16, fontWeight: 600, color: darkMode ? undefined : '#0f172a', lineHeight: 1.2 }}>{info.title}</h1>
        <p className="dark:text-gray-400" style={{ fontSize: 11, color: darkMode ? undefined : '#94a3b8' }}>{info.breadcrumb}</p>
      </div>

      <div
        className="hidden md:flex items-center gap-2 rounded-lg px-3 dark:bg-gray-700 dark:border-gray-600"
        style={{ background: darkMode ? undefined : '#f8fafc', border: darkMode ? undefined : '1px solid rgba(15,23,42,0.08)', height: 36 }}
      >
        <Search size={14} style={{ color: '#94a3b8' }} />
        <input
          placeholder="Search articles, journalists..."
          className="dark:text-gray-200 dark:placeholder-gray-400"
          style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: darkMode ? undefined : '#64748b', width: 220 }}
        />
      </div>

      <div style={{ fontSize: 11, color: '#94a3b8' }} className="hidden lg:block dark:text-gray-400">{dateStr}</div>

      {showSubscriptionBadge && (
        <div className={`px-3 py-1.5 rounded-lg text-xs font-medium ${getStatusColor(access.status!)}`}>
          {getStatusMessage(access.status!)}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={onToggleDark}
          className="flex items-center justify-center rounded-lg dark:text-yellow-400 dark:border-gray-600"
          style={{ width: 36, height: 36, color: darkMode ? undefined : '#64748b', border: darkMode ? undefined : '1px solid rgba(15,23,42,0.08)' }}
        >
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <button
          onClick={onToggleNotifications}
          className="relative flex items-center justify-center rounded-lg dark:text-gray-300 dark:border-gray-600"
          style={{ width: 36, height: 36, color: darkMode ? undefined : '#64748b', border: darkMode ? undefined : '1px solid rgba(15,23,42,0.08)' }}
        >
          <Bell size={16} />
          <span
            className="absolute flex items-center justify-center rounded-full"
            style={{ top: 6, right: 6, width: 8, height: 8, background: '#dc2626', fontSize: 9, color: '#fff' }}
          />
        </button>

        <button className="flex items-center gap-2 rounded-lg px-2 dark:border-gray-600 dark:text-white" style={{ height: 36, border: darkMode ? undefined : '1px solid rgba(15,23,42,0.08)' }}>
          {tenantLogoUrl ? (
            // Tenant Logo
            <div
              className="rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
              style={{ 
                width: 26, 
                height: 26,
                background: '#f8fafc',
                border: '1px solid rgba(15,23,42,0.1)',
              }}
            >
              <img
                src={tenantLogoUrl}
                alt={contextName}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                }}
                onError={(e) => {
                  // Fallback to initials if image fails to load
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.style.background = brandColor;
                    const fallback = document.createElement('div');
                    fallback.innerHTML = contextName.substring(0, 1).toUpperCase();
                    fallback.style.color = '#fff';
                    fallback.style.fontSize = '11px';
                    fallback.style.fontWeight = '700';
                    parent.appendChild(fallback);
                  }
                }}
              />
            </div>
          ) : (
            // Fallback to initials (for Super Admin or no logo)
            <div
              className="rounded-full flex items-center justify-center flex-shrink-0"
              style={{ 
                width: 26, 
                height: 26, 
                background: access.isSuperAdmin ? '#7c3aed' : brandColor, 
                color: '#fff', 
                fontSize: 11, 
                fontWeight: 700 
              }}
            >
              {access.isSuperAdmin ? <Building2 size={14} color="#fff" /> : contextName.substring(0, 1).toUpperCase()}
            </div>
          )}
          <span className="dark:text-gray-200" style={{ fontSize: 13, color: darkMode ? undefined : '#0f172a', fontWeight: 500 }}>{contextName}</span>
          <ChevronDown size={13} style={{ color: '#94a3b8' }} />
        </button>
      </div>
    </header>
  );
}
