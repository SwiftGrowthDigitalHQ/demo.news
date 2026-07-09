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
  const isMobile = useIsMobile();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    try { return localStorage.getItem('admin-dark-mode') === 'true'; } catch { return false; }
  });

  const section = useMemo(() => resolveAdminSection(pathname), [pathname]);
  const content = renderAdminSection(section);

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
        <main className={`flex-1 overflow-y-auto ${darkMode ? 'bg-gray-900 text-gray-100' : ''}`}>
          {content}
        </main>
      </div>
    </div>
  );
}
