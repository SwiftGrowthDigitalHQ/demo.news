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
import { useAppNavigation } from '../lib/navigation';
import { useAuth } from '../lib/auth';
import { useTenant } from '../lib/useTenant';
import { useSubscriptionAccess } from '../lib/useSubscriptionAccess';
import { AlertCircle, Lock } from 'lucide-react';

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
  'notifications',
  'settings',
  'security',
  'reports',
  'analytics',
]);

function resolveAdminSection(pathname: string) {
  const match = pathname.match(/^\/admin(?:\/([^/]+))?/);
  const section = match?.[1] ?? 'overview';
  return adminSections.has(section) ? section : 'overview';
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
    case 'notifications':
      return <AdminNotifications />;
    case 'settings':
      return <SettingsPanel />;
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
  const { tenant } = useTenant();
  const access = useSubscriptionAccess(tenant?.id);
  const isMobile = useIsMobile();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    try { return localStorage.getItem('admin-dark-mode') === 'true'; } catch { return false; }
  });

  const section = useMemo(() => resolveAdminSection(pathname), [pathname]);
  
  // Sections that require publish permission
  const requiresPublish = ['news', 'breaking'].includes(section);
  
  // Check if current section is restricted
  const isRestricted = 
    !access.loading &&
    !access.isSuperAdmin &&
    requiresPublish &&
    !access.permissions.canPublish;
  
  const content = isRestricted ? renderRestrictedSection(access.status) : renderAdminSection(section);

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
        
        {/* Subscription Warning Banner */}
        {!access.loading && !access.isSuperAdmin && access.status && ['PAYMENT_PENDING', 'PAYMENT_DUE', 'PAST_DUE'].includes(access.status) && (
          <div className={`px-6 py-3 flex items-center gap-3 ${
            access.status === 'PAYMENT_PENDING' 
              ? 'bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800' 
              : 'bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800'
          }`}>
            <AlertCircle className={`w-5 h-5 flex-shrink-0 ${
              access.status === 'PAYMENT_PENDING' ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
            }`} />
            <div className="flex-1">
              <p className={`text-sm font-medium ${
                access.status === 'PAYMENT_PENDING' ? 'text-amber-900 dark:text-amber-200' : 'text-red-900 dark:text-red-200'
              }`}>
                {access.status === 'PAYMENT_PENDING' 
                  ? 'Payment Under Review — Your payment is being reviewed by our team.'
                  : access.status === 'PAYMENT_DUE'
                  ? 'Payment Required — Please complete your subscription payment to continue.'
                  : 'Payment Overdue — Your payment is past due. Please update immediately.'}
              </p>
            </div>
            {access.status !== 'PAYMENT_PENDING' && (
              <a
                href="/admin/my-subscription"
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  access.status === 'PAYMENT_PENDING'
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                Pay Now
              </a>
            )}
          </div>
        )}
        
        <main className={`flex-1 overflow-y-auto ${darkMode ? 'bg-gray-900 text-gray-100' : ''}`}>
          {content}
        </main>
      </div>
    </div>
  );
}
