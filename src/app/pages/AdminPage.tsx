import { useEffect, useMemo, useState } from 'react';
import { Sheet, SheetContent } from '../components/ui/sheet';
import { useIsMobile } from '../components/ui/use-mobile';
import { AdminSidebar } from '../components/admin/AdminSidebar';
import { AdminHeader } from '../components/admin/AdminHeader';
import { OverviewDashboard } from '../components/admin/OverviewDashboard';
import { NewsManagement } from '../components/admin/NewsManagement';
import { JournalistManagement } from '../components/admin/JournalistManagement';
import { AdvertisementManagement } from '../components/admin/AdvertisementManagement';
import { AnalyticsDashboard } from '../components/admin/AnalyticsDashboard';
import { MediaLibrary } from '../components/admin/MediaLibrary';
import { SEOManagement } from '../components/admin/SEOManagement';
import { SubscriptionSystem } from '../components/admin/SubscriptionSystem';
import { SubscriptionDashboard } from '../components/admin/SubscriptionDashboard';
import { TenantPaymentsPanel } from '../components/admin/TenantPaymentsPanel';
import { TenantsPanel } from '../components/admin/TenantsPanel';
import { UserManagement } from '../components/admin/UserManagement';
import { SecurityPanel } from '../components/admin/SecurityPanel';
import { SettingsPanel } from '../components/admin/SettingsPanel';
import { BreakingNewsControl } from '../components/admin/BreakingNewsControl';
import { AdminCategories } from '../components/admin/AdminCategories';
import { AdminNotifications } from '../components/admin/AdminNotifications';
import { AdminReports } from '../components/admin/AdminReports';
import { AdminRoles } from '../components/admin/AdminRoles';
import { PluginManagementRefined } from '../components/admin/PluginManagementRefined';
import { SEOManager } from '../components/admin/SEOManager';
import { XmlSitemapManager } from '../components/admin/XmlSitemapManager';
import { GoogleAdSenseManager } from '../components/admin/GoogleAdSenseManager';
import { GoogleAnalyticsManager } from '../components/admin/GoogleAnalyticsManager';
import { GoogleSearchConsoleManager } from '../components/admin/GoogleSearchConsoleManager';
import { FacebookPublisherManager } from '../components/admin/FacebookPublisherManager';
import { YouTubeIntegrationManager } from '../components/admin/YouTubeIntegrationManager';
import { CustomDomainManager } from '../components/admin/CustomDomainManager';
import { FooterSettingsPanel } from '../components/admin/FooterSettingsPanel';
import { useAppNavigation } from '../lib/navigation';
import { useAuth } from '../lib/auth';
import { useTenant } from '../lib/useTenant';
import { useSubscriptionAccess } from '../lib/useSubscriptionAccess';
import { canAccessSection, type AdminSection } from '../lib/permissions';
import { AlertCircle, Lock, ShieldAlert } from 'lucide-react';

const adminSections = new Set([
  'overview',
  'news',
  'categories',
  'media',
  'breaking',
  'journalists',
  'users',
  'roles',
  'ads',
  'subscriptions',
  'my-subscription',
  'tenant-payments',
  'tenants',
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
  'plugins',
  'security',
  'reports',
  'analytics',
  'domains',
]);

function resolveAdminSection(pathname: string): AdminSection {
  const match = pathname.match(/^\/admin(?:\/([^/]+))?/);
  const section = (match?.[1] ?? 'overview') as AdminSection;
  return adminSections.has(section) ? section : 'overview';
}

function renderUnauthorizedSection() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center max-w-md px-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
          <ShieldAlert className="w-8 h-8 text-red-600 dark:text-red-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Access Denied
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          You don't have permission to access this section. Please contact your administrator if you believe this is an error.
        </p>
        <button
          onClick={() => window.history.back()}
          className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
        >
          Go Back
        </button>
      </div>
    </div>
  );
}

function renderRestrictedSection(status: string | null) {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-120px)] p-6">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-red-600 dark:text-red-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Access Restricted
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {status === 'SUSPENDED' 
            ? 'Your account has been suspended. Please contact support.'
            : status === 'EXPIRED'
            ? 'Your subscription has expired. Please renew to continue publishing.'
            : status === 'PAST_DUE'
            ? 'Your payment is overdue. Please update your subscription to continue.'
            : status === 'PAYMENT_DUE'
            ? 'Payment required. Please complete your subscription payment.'
            : 'Your subscription status does not allow publishing content.'}
        </p>
        <a
          href="/admin/my-subscription"
          className="inline-flex items-center justify-center px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
        >
          View Subscription
        </a>
      </div>
    </div>
  );
}

function renderAdminSection(section: string) {
  switch (section) {
    case 'overview':
      return <OverviewDashboard />;
    case 'news':
      return <NewsManagement />;
    case 'categories':
      return <AdminCategories />;
    case 'media':
      return <MediaLibrary />;
    case 'breaking':
      return <BreakingNewsControl />;
    case 'journalists':
      return <JournalistManagement />;
    case 'users':
      return <UserManagement />;
    case 'roles':
      return <AdminRoles />;
    case 'ads':
      return <AdvertisementManagement />;
    case 'subscriptions':
      return <SubscriptionSystem />;
    case 'my-subscription':
      return <SubscriptionDashboard />;
    case 'tenant-payments':
      return <TenantPaymentsPanel />;
    case 'tenants':
      return <TenantsPanel />;
    case 'seo':
      return <SEOManagement />;
    case 'seo-manager':
      return <SEOManager />;
    case 'xml-sitemap':
      return <XmlSitemapManager />;
    case 'google-adsense':
      return <GoogleAdSenseManager />;
    case 'google-analytics':
      return <GoogleAnalyticsManager />;
    case 'google-search-console':
      return <GoogleSearchConsoleManager />;
    case 'facebook-publisher':
      return <FacebookPublisherManager />;
    case 'youtube-integration':
      return <YouTubeIntegrationManager />;
    case 'notifications':
      return <AdminNotifications />;
    case 'settings':
      return <SettingsPanel />;
    case 'footer':
      return <FooterSettingsPanel />;
    case 'domains':
      return <CustomDomainManager />;
    case 'plugins':
      return <PluginManagementRefined />;
    case 'security':
      return <SecurityPanel />;
    case 'reports':
      return <AdminReports />;
    case 'analytics':
      return <AnalyticsDashboard />;
    default:
      return <OverviewDashboard />;
  }
}

export function AdminPage() {
  const { pathname, navigate } = useAppNavigation();
  const auth = useAuth();
  const { tenant, loading: tenantLoading } = useTenant();
  const access = useSubscriptionAccess(tenant?.id);
  const isMobile = useIsMobile();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    try { return localStorage.getItem('admin-dark-mode') === 'true'; } catch { return false; }
  });

  const section = useMemo(() => resolveAdminSection(pathname), [pathname]);
  
  // Check if user has permission to access this section
  const hasPermission = canAccessSection(auth.profile, section);
  
  // CRITICAL: Route-level protection - redirect if unauthorized
  useEffect(() => {
    if (!auth.loading && auth.ready && !hasPermission) {
      // Redirect to overview/dashboard instead of showing error immediately
      navigate('/admin');
    }
  }, [hasPermission, auth.loading, auth.ready, section, navigate]);
  
  // Sections that require publish permission
  const requiresPublish = ['news', 'breaking'].includes(section);
  
  // CRITICAL FIX: Wait for BOTH tenant AND subscription to load before making access decisions
  // If tenant is still loading, we don't have a valid tenant ID yet for subscription check
  const stillLoading = tenantLoading || access.loading;
  
  // Check if current section is restricted by subscription
  const isRestricted = 
    !stillLoading &&
    !access.isSuperAdmin &&
    requiresPublish &&
    !access.permissions.canPublish;
  
  // Determine what to render
  let content;
  if (!hasPermission) {
    // Show access denied UI (but also triggering redirect via useEffect above)
    content = renderUnauthorizedSection();
  } else if (isRestricted) {
    content = renderRestrictedSection(access.status);
  } else {
    content = renderAdminSection(section);
  }

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('admin-dark-mode', 'true');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('admin-dark-mode', 'false');
    }
    return () => { root.classList.remove('dark'); };
  }, [darkMode]);

  return (
    <div className={`min-h-screen flex ${darkMode ? 'bg-gray-900' : 'bg-slate-50'}`}>
      <div className="hidden lg:block sticky top-0 h-screen flex-shrink-0">
        <AdminSidebar
          activeSection={section}
          onNavigate={id => navigate(id === 'overview' ? '/admin' : `/admin/${id}`)}
          collapsed={sidebarCollapsed}
          onLogout={async () => {
            await auth.signOut();
            navigate('/login');
          }}
        />
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-[280px]">
          <AdminSidebar
            activeSection={section}
            onNavigate={id => {
              navigate(id === 'overview' ? '/admin' : `/admin/${id}`);
              setMobileOpen(false);
            }}
            collapsed={false}
            onClose={() => setMobileOpen(false)}
            onLogout={async () => {
              await auth.signOut();
              navigate('/login');
            }}
          />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col max-h-screen overflow-hidden">
        <AdminHeader
          section={section}
          darkMode={darkMode}
          onToggleDark={() => setDarkMode(prev => !prev)}
          onToggleNotifications={() => navigate('/admin/notifications')}
          onToggleSidebar={() => {
            if (isMobile) {
              setMobileOpen(true);
            } else {
              setSidebarCollapsed(value => !value);
            }
          }}
        />
        
        {/* Subscription Warning Banner — shown for all actionable payment states */}
        {!access.loading && !access.isSuperAdmin && access.status && (
          (() => {
            const s = access.status;
            // States that need a banner
            if (!['PAYMENT_DUE', 'PAST_DUE', 'EXPIRED', 'PAYMENT_PENDING', 'SUSPENDED'].includes(s)) return null;

            const isPending   = s === 'PAYMENT_PENDING';
            const isSuspended = s === 'SUSPENDED';
            const isUrgent    = s === 'PAST_DUE' || s === 'EXPIRED' || isSuspended;

            const bgClass = isPending
              ? 'bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800'
              : isSuspended
                ? 'bg-gray-100 dark:bg-gray-800/60 border-b border-gray-300 dark:border-gray-700'
                : isUrgent
                  ? 'bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800'
                  : 'bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800';

            const iconClass = isPending
              ? 'text-blue-500 dark:text-blue-400'
              : isSuspended
                ? 'text-gray-500 dark:text-gray-400'
                : isUrgent
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-amber-600 dark:text-amber-400';

            const textClass = isPending
              ? 'text-blue-900 dark:text-blue-200'
              : isSuspended
                ? 'text-gray-700 dark:text-gray-300'
                : isUrgent
                  ? 'text-red-900 dark:text-red-200'
                  : 'text-amber-900 dark:text-amber-200';

            const message =
              s === 'PAYMENT_DUE'     ? 'Payment Required — Please complete your subscription payment to continue.' :
              s === 'PAST_DUE'        ? 'Payment Overdue — Your payment is past due. Please renew immediately to avoid suspension.' :
              s === 'EXPIRED'         ? 'Subscription Expired — Renew now to restore full access to your news platform.' :
              s === 'PAYMENT_PENDING' ? 'Payment Under Review — Your payment has been submitted and is awaiting verification.' :
              /* SUSPENDED */           'Account Suspended — Please contact support to restore your account.';

            const showPayNow = !isPending && !isSuspended;
            const ctaClass = isUrgent
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-amber-600 hover:bg-amber-700 text-white';

            return (
              <div className={`px-6 py-3 flex items-center gap-3 ${bgClass}`}>
                <AlertCircle className={`w-5 h-5 flex-shrink-0 ${iconClass}`} />
                <div className="flex-1">
                  <p className={`text-sm font-medium ${textClass}`}>{message}</p>
                </div>
                {showPayNow && (
                  <a
                    href="/admin/my-subscription"
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${ctaClass}`}
                  >
                    {s === 'EXPIRED' ? 'Renew Now' : 'Pay Now'}
                  </a>
                )}
              </div>
            );
          })()
        )}
        
        <main className={`flex-1 overflow-y-auto ${darkMode ? 'bg-gray-900 text-gray-100' : ''}`}>
          {content}
        </main>
      </div>
    </div>
  );
}
