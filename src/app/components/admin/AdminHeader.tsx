import { useState } from 'react';
import { Bell, Search, Sun, Moon, Menu, ChevronDown, Building2, X } from 'lucide-react';
import { useCms } from '../../lib/cms';
import { useTenant } from '../../lib/useTenant';
import { useSubscriptionAccess } from '../../lib/useSubscriptionAccess';
import { getStatusMessage, getStatusColor } from '../../lib/subscriptionService';
import { resolveAssetUrl } from '../../lib/assetResolver';
import { useIsMobile } from '../ui/use-mobile';
import { Sheet, SheetContent } from '../ui/sheet';
import { Dialog, DialogContent, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

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
  const isMobile = useIsMobile();
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
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
      className="flex items-center gap-3 px-4 border-b dark:bg-gray-800 dark:border-gray-700"
      style={{
        height: 56,
        background: darkMode ? undefined : '#ffffff',
        borderColor: darkMode ? undefined : 'rgba(15,23,42,0.08)',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        zIndex: 30,
      }}
    >
      {/* Mobile Menu Button */}
      <button
        onClick={onToggleSidebar}
        className="flex items-center justify-center rounded-lg dark:text-gray-300 dark:border-gray-600"
        style={{ width: 40, height: 40, color: darkMode ? undefined : '#64748b', border: darkMode ? undefined : '1px solid rgba(15,23,42,0.08)' }}
        aria-label="Open navigation menu"
      >
        <Menu size={20} />
      </button>

      {/* Page Title */}
      <div className="flex-1 min-w-0">
        <h1 className="dark:text-white truncate" style={{ fontSize: 16, fontWeight: 600, color: darkMode ? undefined : '#0f172a', lineHeight: 1.2 }}>{info.title}</h1>
        <p className="dark:text-gray-400 truncate" style={{ fontSize: 11, color: darkMode ? undefined : '#94a3b8' }}>{info.breadcrumb}</p>
      </div>

      {/* Desktop Search - Hidden on Mobile */}
      <div className="hidden md:flex items-center gap-2 rounded-lg px-3 dark:bg-gray-700 dark:border-gray-600" style={{ background: darkMode ? undefined : '#f8fafc', border: darkMode ? undefined : '1px solid rgba(15,23,42,0.08)', height: 36 }}>
        <Search size={14} style={{ color: '#94a3b8' }} />
        <input
          placeholder="Search articles, journalists..."
          className="dark:text-gray-200 dark:placeholder-gray-400"
          style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: darkMode ? undefined : '#64748b', width: 220 }}
        />
      </div>

      {/* Mobile Search Button */}
      <button
        onClick={() => setSearchOpen(true)}
        className="md:hidden flex items-center justify-center rounded-lg dark:text-gray-300 dark:border-gray-600"
        style={{ width: 40, height: 40, color: darkMode ? undefined : '#64748b', border: darkMode ? undefined : '1px solid rgba(15,23,42,0.08)' }}
        aria-label="Open search"
      >
        <Search size={18} />
      </button>

      {/* Date - Hidden on Mobile */}
      <div className="hidden lg:block" style={{ fontSize: 11, color: '#94a3b8' }}>{dateStr}</div>

      {/* Subscription Badge - Hidden on Small Mobile */}
      {showSubscriptionBadge && (
        <div className={`hidden sm:flex px-3 py-1.5 rounded-lg text-xs font-medium ${getStatusColor(access.status!)}`}>
          {getStatusMessage(access.status!)}
        </div>
      )}

      <div className="flex items-center gap-1">
        {/* Dark Mode Toggle */}
        <button
          onClick={onToggleDark}
          className="flex items-center justify-center rounded-lg dark:text-yellow-400 dark:border-gray-600"
          style={{ width: 40, height: 40, color: darkMode ? undefined : '#64748b', border: darkMode ? undefined : '1px solid rgba(15,23,42,0.08)' }}
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notifications */}
        <button
          onClick={onToggleNotifications}
          className="relative flex items-center justify-center rounded-lg dark:text-gray-300 dark:border-gray-600"
          style={{ width: 40, height: 40, color: darkMode ? undefined : '#64748b', border: darkMode ? undefined : '1px solid rgba(15,23,42,0.08)' }}
          aria-label="Notifications"
        >
          <Bell size={18} />
          <span
            className="absolute flex items-center justify-center rounded-full"
            style={{ top: 6, right: 6, width: 8, height: 8, background: '#dc2626', fontSize: 9, color: '#fff' }}
          />
        </button>

        {/* Profile / Tenant Selector */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(true)}
            className="flex items-center gap-2 rounded-lg px-3 dark:border-gray-600 dark:text-white"
            style={{ height: 40, border: darkMode ? undefined : '1px solid rgba(15,23,42,0.08)' }}
            aria-label="Profile menu"
            aria-expanded={profileOpen}
          >
            {tenantLogoUrl ? (
              <div
                className="rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
                style={{ width: 28, height: 28, background: '#f8fafc', border: '1px solid rgba(15,23,42,0.1)' }}
              >
                <img
                  src={tenantLogoUrl}
                  alt={contextName}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.style.background = brandColor;
                      const fallback = document.createElement('div');
                      fallback.innerHTML = contextName.substring(0, 1).toUpperCase();
                      fallback.style.color = '#fff';
                      fallback.style.fontSize = '12px';
                      fallback.style.fontWeight = '700';
                      parent.appendChild(fallback);
                    }
                  }}
                />
              </div>
            ) : (
              <div
                className="rounded-full flex items-center justify-center flex-shrink-0"
                style={{ width: 28, height: 28, background: access.isSuperAdmin ? '#7c3aed' : brandColor, color: '#fff', fontSize: 12, fontWeight: 700 }}
              >
                {access.isSuperAdmin ? <Building2 size={14} color="#fff" /> : contextName.substring(0, 1).toUpperCase()}
              </div>
            )}
            <span className="hidden sm:block dark:text-gray-200 truncate" style={{ fontSize: 13, color: darkMode ? undefined : '#0f172a', fontWeight: 500, maxWidth: 120 }}>{contextName}</span>
            <ChevronDown size={13} style={{ color: '#94a3b8' }} />
          </button>

          {/* Profile Dropdown */}
          <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
            <DialogTrigger asChild>
              <span />
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm" side="bottom" align="end">
              <div className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  {tenantLogoUrl ? (
                    <img src={tenantLogoUrl} alt={contextName} className="rounded-lg" style={{ width: 40, height: 40, objectFit: 'cover' }} />
                  ) : (
                    <div className="rounded-lg flex items-center justify-center" style={{ width: 40, height: 40, background: access.isSuperAdmin ? '#7c3aed' : brandColor }}>
                      {access.isSuperAdmin ? <Building2 size={20} color="#fff" /> : contextName.substring(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">{contextName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{access.isSuperAdmin ? 'Super Admin' : 'Tenant Admin'}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-gray-100 dark:hover:bg-gray-800">
                    <Building2 size={18} style={{ color: '#64748b' }} />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Tenant Settings</span>
                  </button>
                  <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-gray-100 dark:hover:bg-gray-800 text-red-600" onClick={onToggleNotifications}>
                    <Bell size={18} />
                    <span className="text-sm">Notifications</span>
                  </button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Mobile Search Sheet */}
      <Sheet open={searchOpen} onOpenChange={setSearchOpen}>
        <SheetContent side="top" className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-lg font-semibold">Search</h2>
            <Button variant="ghost" size="icon" onClick={() => setSearchOpen(false)} aria-label="Close search">
              <X size={20} />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search articles, journalists..."
              className="pl-10 h-12 text-base"
              autoFocus
            />
          </div>
          <p className="text-xs text-gray-500 mt-4 text-center">Searches across articles, categories, and journalists</p>
        </SheetContent>
      </Sheet>
    </header>
  );
}