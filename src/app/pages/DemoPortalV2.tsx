/**
 * SangTX Demo Portal V2
 * 
 * REAL, FULLY FUNCTIONAL LIVE DEMO TENANT
 * 
 * This is NOT a mockup. This is a complete, production-quality demo tenant
 * that uses the SAME components as real SangTX customer installations.
 * 
 * Architecture:
 * - Public demo website uses actual HomePage, ArticlePage, CategoryPage components
 * - Demo admin uses actual AdminPage components
 * - Both share the SAME demo data source
 * - All mutations are blocked at the data layer
 * - Fully navigable, searchable, and explorable
 */

import { HomePage } from './HomePage';
import { ArticlePage } from './ArticlePage';
import { CategoryPage } from './CategoryPage';
import { SearchPage } from './SearchPage';
import { DemoCmsProvider } from '../lib/demoCmsProvider';
import { useAppNavigation } from '../lib/navigation';
import { Bell, ShieldCheck } from 'lucide-react';
import { DEMO_TENANT_NAME } from '../lib/demoTenant';

// Import admin components for the demo admin
import { OverviewDashboard } from '../components/admin/OverviewDashboard';
import { NewsManagement } from '../components/admin/NewsManagement';
import { AdminCategories } from '../components/admin/AdminCategories';
import { MediaLibrary } from '../components/admin/MediaLibrary';
import { BreakingNewsControl } from '../components/admin/BreakingNewsControl';
import { JournalistManagement } from '../components/admin/JournalistManagement';
import { UserManagement } from '../components/admin/UserManagement';
import { AdminRoles } from '../components/admin/AdminRoles';
import { AdvertisementManagement } from '../components/admin/AdvertisementManagement';
import { SEOManagement } from '../components/admin/SEOManagement';
import { AdminNotifications } from '../components/admin/AdminNotifications';
import { SettingsPanel } from '../components/admin/SettingsPanel';
import { AdminReports } from '../components/admin/AdminReports';
import { AnalyticsDashboard } from '../components/admin/AnalyticsDashboard';
import { useState, useMemo } from 'react';
import { Sheet, SheetContent } from '../components/ui/sheet';
import { useIsMobile } from '../components/ui/use-mobile';

/**
 * Demo Banner Component
 * 
 * Shows at the top of all demo pages to indicate this is a sample tenant
 */
function DemoBanner({ mode }: { mode: 'public' | 'admin' }) {
  const { navigate } = useAppNavigation();

  if (mode === 'public') {
    return (
      <div className="bg-slate-900 text-slate-100 px-4 py-2.5 text-center text-sm border-b border-slate-700">
        <Bell className="inline-block h-4 w-4 mr-2 text-amber-400" />
        <span className="font-medium">DEMO MODE</span>
        <span className="mx-2 text-slate-400">·</span>
        <span className="text-slate-300">
          Explore a sample SangTX-powered news platform. All content is fictional.
        </span>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="ml-4 underline hover:text-white transition-colors font-medium"
        >
          Back to SangTX
        </button>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 text-center text-sm text-amber-900">
      <ShieldCheck className="inline-block h-4 w-4 mr-2" />
      <span className="font-bold">DEMO MODE — READ ONLY</span>
      <span className="mx-2">·</span>
      <span>
        Explore the SangTX CMS. Changes, uploads, and publishing are disabled in this demo.
      </span>
      <button
        type="button"
        onClick={() => navigate('/demo')}
        className="ml-3 text-amber-900 underline hover:text-amber-950 font-medium transition-colors"
      >
        View Public Site
      </button>
      <button
        type="button"
        onClick={() => navigate('/')}
        className="ml-3 text-amber-900 underline hover:text-amber-950 font-medium transition-colors"
      >
        Back to SangTX
      </button>
    </div>
  );
}

/**
 * Demo Admin Sidebar
 */
function DemoAdminSidebar({
  activeSection,
  onNavigate,
  collapsed,
  onClose,
}: {
  activeSection: string;
  onNavigate: (section: string) => void;
  collapsed?: boolean;
  onClose?: () => void;
}) {
  const navItems = [
    { id: 'overview', label: 'Dashboard' },
    { id: 'news', label: 'News Management' },
    { id: 'categories', label: 'Categories' },
    { id: 'breaking', label: 'Breaking News' },
    { id: 'media', label: 'Media Library' },
    { id: 'journalists', label: 'Reporters' },
    { id: 'users', label: 'Users' },
    { id: 'roles', label: 'Roles' },
    { id: 'ads', label: 'Advertisements' },
    { id: 'seo', label: 'SEO' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'settings', label: 'Settings' },
    { id: 'reports', label: 'Reports' },
    { id: 'analytics', label: 'Analytics' },
  ];

  const { navigate } = useAppNavigation();

  return (
    <div className="flex h-full flex-col bg-slate-950 p-5 text-slate-200">
      <div className="mb-8">
        <button
          type="button"
          onClick={() => navigate('/demo')}
          className="text-xl font-black text-white hover:text-red-400 transition-colors"
        >
          {DEMO_TENANT_NAME}
        </button>
        <p className="text-xs text-slate-400 mt-1">Demo CMS</p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto">
        {navItems.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              onNavigate(item.id);
              onClose?.();
            }}
            className={`block w-full rounded px-3 py-2 text-left text-sm transition-colors ${
              activeSection === item.id
                ? 'bg-red-700 text-white font-medium'
                : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="mt-6 space-y-2 border-t border-slate-800 pt-6">
        <button
          type="button"
          onClick={() => navigate('/pricing')}
          className="block w-full rounded bg-red-700 px-3 py-2 text-center text-sm font-bold text-white hover:bg-red-600 transition-colors"
        >
          Start Free Trial ↗
        </button>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="block w-full rounded px-3 py-2 text-center text-sm text-slate-400 hover:text-white transition-colors"
        >
          ← Back to SangTX
        </button>
      </div>
    </div>
  );
}

/**
 * Demo Admin Section Renderer
 */
function DemoAdminSection({ section }: { section: string }) {
  // Wrap admin components to disable mutations
  const ReadOnlyWrapper = ({ children }: { children: React.ReactNode }) => (
    <div className="relative">
      {children}
      {/* Overlay to intercept clicks on action buttons */}
      <style>{`
        [type="submit"]:not([data-demo-allowed]),
        button:not([data-demo-allowed]):has(svg[class*="Plus"]),
        button:not([data-demo-allowed]):has(svg[class*="Upload"]),
        button:not([data-demo-allowed]):has(svg[class*="Save"]),
        button:not([data-demo-allowed]):has(svg[class*="Trash"]),
        button:not([data-demo-allowed]):has(svg[class*="Edit"]),
        button:not([data-demo-allowed]):has(svg[class*="Pen"]),
        input[type="file"],
        .demo-readonly input:not([readonly]),
        .demo-readonly textarea:not([readonly]),
        .demo-readonly select:not([disabled]) {
          pointer-events: none;
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );

  switch (section) {
    case 'overview':
      return (
        <ReadOnlyWrapper>
          <OverviewDashboard />
        </ReadOnlyWrapper>
      );
    case 'news':
      return (
        <ReadOnlyWrapper>
          <div className="demo-readonly">
            <NewsManagement />
          </div>
        </ReadOnlyWrapper>
      );
    case 'categories':
      return (
        <ReadOnlyWrapper>
          <div className="demo-readonly">
            <AdminCategories />
          </div>
        </ReadOnlyWrapper>
      );
    case 'breaking':
      return (
        <ReadOnlyWrapper>
          <div className="demo-readonly">
            <BreakingNewsControl />
          </div>
        </ReadOnlyWrapper>
      );
    case 'media':
      return (
        <ReadOnlyWrapper>
          <div className="demo-readonly">
            <MediaLibrary />
          </div>
        </ReadOnlyWrapper>
      );
    case 'journalists':
      return (
        <ReadOnlyWrapper>
          <div className="demo-readonly">
            <JournalistManagement />
          </div>
        </ReadOnlyWrapper>
      );
    case 'users':
      return (
        <ReadOnlyWrapper>
          <div className="demo-readonly">
            <UserManagement />
          </div>
        </ReadOnlyWrapper>
      );
    case 'roles':
      return (
        <ReadOnlyWrapper>
          <div className="demo-readonly">
            <AdminRoles />
          </div>
        </ReadOnlyWrapper>
      );
    case 'ads':
      return (
        <ReadOnlyWrapper>
          <div className="demo-readonly">
            <AdvertisementManagement />
          </div>
        </ReadOnlyWrapper>
      );
    case 'seo':
      return (
        <ReadOnlyWrapper>
          <div className="demo-readonly">
            <SEOManagement />
          </div>
        </ReadOnlyWrapper>
      );
    case 'notifications':
      return (
        <ReadOnlyWrapper>
          <div className="demo-readonly">
            <AdminNotifications />
          </div>
        </ReadOnlyWrapper>
      );
    case 'settings':
      return (
        <ReadOnlyWrapper>
          <div className="demo-readonly">
            <SettingsPanel />
          </div>
        </ReadOnlyWrapper>
      );
    case 'reports':
      return (
        <ReadOnlyWrapper>
          <AdminReports />
        </ReadOnlyWrapper>
      );
    case 'analytics':
      return (
        <ReadOnlyWrapper>
          <AnalyticsDashboard />
        </ReadOnlyWrapper>
      );
    default:
      return (
        <ReadOnlyWrapper>
          <OverviewDashboard />
        </ReadOnlyWrapper>
      );
  }
}

/**
 * Demo Admin Page
 * 
 * Uses actual admin components in read-only mode
 */
function DemoAdminPage() {
  const { pathname, navigate } = useAppNavigation();
  const isMobile = useIsMobile();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const section = useMemo(() => {
    const match = pathname.match(/^\/demo\/admin(?:\/([^/]+))?/);
    return match?.[1] || 'overview';
  }, [pathname]);

  const handleNavigate = (sectionId: string) => {
    navigate(
      sectionId === 'overview'
        ? '/demo/admin'
        : `/demo/admin/${sectionId}`
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Banner at the top, outside flex layout */}
      <DemoBanner mode="admin" />

      {/* Admin layout with sidebar and content */}
      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block sticky top-0 h-screen w-64 shrink-0">
          <DemoAdminSidebar
            activeSection={section}
            onNavigate={handleNavigate}
            collapsed={sidebarCollapsed}
          />
        </aside>

        {/* Mobile sidebar */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="p-0 w-[280px]">
            <DemoAdminSidebar
              activeSection={section}
              onNavigate={handleNavigate}
              onClose={() => setMobileOpen(false)}
            />
          </SheetContent>
        </Sheet>

        {/* Main content */}
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="flex-1 overflow-y-auto">
            <DemoCmsProvider>
              <DemoAdminSection section={section} />
            </DemoCmsProvider>
          </main>
        </div>
      </div>
    </div>
  );
}

/**
 * Demo Public Website
 * 
 * Uses actual production components with demo data
 */
function DemoPublicWebsite({ mode, slug }: { mode: 'home' | 'article' | 'category' | 'search'; slug?: string }) {
  return (
    <DemoCmsProvider>
      <div className="min-h-screen">
        <DemoBanner mode="public" />
        {mode === 'home' && <HomePage />}
        {mode === 'article' && slug && <ArticlePage slug={slug} />}
        {mode === 'category' && slug && <CategoryPage slug={slug} />}
        {mode === 'search' && <SearchPage />}
      </div>
    </DemoCmsProvider>
  );
}

/**
 * Main Demo Portal Component
 * 
 * Routes demo requests to appropriate components
 */
export function DemoPortalV2({ mode }: { mode: 'home' | 'article' | 'category' | 'search' | 'admin' }) {
  const { pathname } = useAppNavigation();

  // Admin mode
  if (mode === 'admin') {
    return <DemoAdminPage />;
  }

  // Public website modes
  let slug: string | undefined;

  if (mode === 'article') {
    slug = pathname.split('/demo/article/')[1];
  } else if (mode === 'category') {
    slug = pathname.split('/demo/category/')[1];
  }

  return <DemoPublicWebsite mode={mode} slug={slug} />;
}
