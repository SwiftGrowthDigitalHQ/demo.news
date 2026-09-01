import { lazy, Suspense, useState, useEffect } from 'react';
import { AppNavigationProvider, useAppNavigation } from './lib/navigation';
import { CmsProvider } from './lib/cms';
import { AuthProvider, useAuth } from './lib/auth';
import { I18nProvider } from './lib/i18n';
import { Toaster } from './components/ui/sonner';
import { BrandingBridge } from './components/BrandingBridge';
import { SeoBridge } from './components/SeoBridge';
import { PushNotificationPrompt } from './components/PushNotificationPrompt';
import { LanguageGate } from './components/LanguageGate';
import { GoogleAnalytics } from './components/GoogleAnalytics';
import { SangTXHomePage } from './pages/SangTXHomePage';
import { SangTXAuthPage } from './pages/SangTXAuthPage';
import { getSavedLanguage } from './lib/i18n';
import { DemoPortalV2 as DemoPortal } from './pages/DemoPortalV2';
import { isTenantSlug, getTenantSlugs } from './lib/tenantRegistry';
import { getTenantByDomain, isCustomDomain, normalizeDomain } from './lib/domainResolver';

/* MARKER-MAKE-KIT-INVOKED */

// ─── SaaS / marketing pages (no CmsProvider needed) ─────────────────────────
const SangTXFeaturesPage = lazy(() => import('./pages/SangTXFeaturesPage').then(m => ({ default: m.SangTXFeaturesPage })));
const SangTXPricingPage   = lazy(() => import('./pages/SangTXPricingPage').then(m => ({ default: m.SangTXPricingPage })));
const SangTXContactPage   = lazy(() => import('./pages/SangTXContactPage').then(m => ({ default: m.SangTXContactPage })));
const SangTXOnboardingPage = lazy(() => import('./pages/SangTXOnboardingPage').then(m => ({ default: m.SangTXOnboardingPage })));

// ─── Tenant news portal pages (need CmsProvider) ────────────────────────────
const HomePage = lazy(() => import('./pages/HomePage').then(module => ({ default: module.HomePage })));
const ArticlePage = lazy(() => import('./pages/ArticlePage').then(module => ({ default: module.ArticlePage })));
const CategoryPage = lazy(() => import('./pages/CategoryPage').then(module => ({ default: module.CategoryPage })));
const SearchPage = lazy(() => import('./pages/SearchPage').then(module => ({ default: module.SearchPage })));
const AdminPage = lazy(() => import('./pages/AdminPage').then(module => ({ default: module.AdminPage })));
const AuthPage = lazy(() => import('./pages/AuthPage').then(module => ({ default: module.AuthPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(module => ({ default: module.ProfilePage })));
const AboutPage = lazy(() => import('./pages/AboutPage').then(module => ({ default: module.AboutPage })));
const ContactPage = lazy(() => import('./pages/ContactPage').then(module => ({ default: module.ContactPage })));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage').then(module => ({ default: module.PrivacyPolicyPage })));
const TermsPage = lazy(() => import('./pages/TermsPage').then(module => ({ default: module.TermsPage })));
const DisclaimerPage = lazy(() => import('./pages/DisclaimerPage').then(module => ({ default: module.DisclaimerPage })));
const EditorialPolicyPage = lazy(() => import('./pages/EditorialPolicyPage').then(module => ({ default: module.EditorialPolicyPage })));
const AdvertisePage = lazy(() => import('./pages/AdvertisePage').then(module => ({ default: module.AdvertisePage })));
const CookiePolicyPage = lazy(() => import('./pages/CookiePolicyPage').then(module => ({ default: module.CookiePolicyPage })));
const SitemapPage = lazy(() => import('./pages/SitemapPage').then(module => ({ default: module.SitemapPage })));
const UnsubscribePage = lazy(() => import('./pages/UnsubscribePage').then(module => ({ default: module.UnsubscribePage })));

// ─── Super Admin page ────────────────────────────────────────────────────────
const SuperAdminPage = lazy(() => import('./pages/SuperAdminPage').then(module => ({ default: module.SuperAdminPage })));

// ─── Tenant resolution state ─────────────────────────────────────────────────
// Tenant slugs are loaded dynamically from database to support multi-tenant SaaS
let tenantCheckCache: Map<string, boolean> | null = null;
let defaultTenantCache: string | null = null;
let defaultTenantCacheTime: number = 0;
const DEFAULT_TENANT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get the default/primary tenant slug for direct content URLs
 * Returns the first active tenant found (cached)
 */
async function getDefaultTenant(): Promise<string | null> {
  const now = Date.now();
  
  // Return cached default tenant if still valid
  if (defaultTenantCache && (now - defaultTenantCacheTime) < DEFAULT_TENANT_CACHE_TTL) {
    return defaultTenantCache;
  }
  
  try {
    const slugs = await getTenantSlugs();
    const firstSlug = Array.from(slugs)[0] || null;
    
    // Cache the result
    defaultTenantCache = firstSlug;
    defaultTenantCacheTime = now;
    
    return firstSlug;
  } catch (err) {
    console.error('[App] Failed to get default tenant:', err);
    return null;
  }
}

/**
 * Check if a slug belongs to a tenant (with local caching)
 */
async function checkIfTenantSlug(slug: string): Promise<boolean> {
  if (!tenantCheckCache) {
    tenantCheckCache = new Map();
  }
  
  if (tenantCheckCache.has(slug)) {
    return tenantCheckCache.get(slug)!;
  }
  
  const result = await isTenantSlug(slug);
  tenantCheckCache.set(slug, result);
  return result;
}

/**
 * Resolves a pathname to its routing context.
 *
 *  saas         → SangTX marketing/auth routes at top level
 *  tenant       → news portal under /<slug>/…
 *  admin        → admin panel (tenant-scoped, no slug prefix)
 *  super_admin  → super admin panel (platform-wide control)
 *  demo         → sales demo
 *  404          → nothing matched
 */
async function resolveRoute(pathname: string): Promise<{
  type: 'saas' | 'tenant' | 'admin' | 'super_admin' | 'demo' | '404';
  tenantSlug?: string;
  tenantPath?: string;
}> {
  console.log('[ROUTE RESOLVE] Starting resolution for:', pathname);
  
  // ── CUSTOM DOMAIN RESOLUTION ──────────────────────────────────────────────
  // Check if hostname is a custom domain (e.g., fakenews.com)
  const hostname = window.location.hostname;
  
  if (isCustomDomain(hostname)) {
    console.log('[ROUTE RESOLVE] Custom domain detected:', hostname);
    
    const domainResolution = await getTenantByDomain(hostname);
    
    if (domainResolution) {
      console.log('[ROUTE RESOLVE] Resolved to tenant:', domainResolution.tenantSlug);
      // Custom domain acts as if navigating to /{slug}{pathname}
      // So /article/test on fakenews.com → /fake-news/article/test
      return { type: 'tenant', tenantSlug: domainResolution.tenantSlug, tenantPath: pathname };
    }
    
    console.log('[ROUTE RESOLVE] Custom domain not found:', hostname);
    // Custom domain exists but no matching tenant - show 404
    return { type: '404' };
  }
  
  // ── SaaS root & marketing pages ───────────────────────────────────────────
  const saasRoutes = new Set([
    '/', '/features', '/pricing', '/contact',
    '/privacy', '/terms', '/login', '/register', '/onboarding',
    '/forgot-password', '/reset-password',
    // Legacy aliases kept for backwards-compat
    '/sangtx',
  ]);
  if (saasRoutes.has(pathname)) {
    console.log('[ROUTE RESOLVE] Matched SaaS route');
    return { type: 'saas' };
  }
  if (pathname.startsWith('/forgot-password') || pathname.startsWith('/reset-password')) {
    console.log('[ROUTE RESOLVE] Matched password reset route');
    return { type: 'saas' };
  }

  // The sales demo is deliberately local-only and never mounts CmsProvider.
  if (pathname === '/demo' || pathname.startsWith('/demo/')) {
    console.log('[ROUTE RESOLVE] Matched demo route');
    return { type: 'demo' };
  }

  // ── Super Admin panel ─────────────────────────────────────────────────────
  if (pathname.startsWith('/super-admin')) {
    console.log('[ROUTE RESOLVE] Matched super-admin route');
    return { type: 'super_admin' };
  }

  // ── Admin panel ───────────────────────────────────────────────────────────
  if (pathname.startsWith('/admin')) {
    console.log('[ROUTE RESOLVE] Matched admin route');
    return { type: 'admin' };
  }

  // ── Direct content routes without tenant prefix ──────────────────────────
  // Handle /article/*, /category/*, /search without tenant slug
  // This allows direct URLs like /article/sugarnews to work
  if (pathname.startsWith('/article/') || 
      pathname.startsWith('/category/') || 
      pathname.startsWith('/search')) {
    console.log('[ROUTE RESOLVE] Direct content route, finding default tenant');
    // Try to find a default/primary tenant to serve content
    const defaultTenant = await getDefaultTenant();
    if (defaultTenant) {
      console.log('[ROUTE RESOLVE] Using default tenant:', defaultTenant);
      // Treat the path as if it were under the default tenant
      return { type: 'tenant', tenantSlug: defaultTenant, tenantPath: pathname };
    }
    console.log('[ROUTE RESOLVE] No default tenant found for direct content route');
  }

  // ── Tenant slugs: /<slug> or /<slug>/… ───────────────────────────────────
  const parts = pathname.split('/');          // ['', 'tenant-slug', 'article', ...]
  const slug = parts[1];
  
  console.log('[ROUTE RESOLVE] Checking tenant slug:', slug);
  
  // Check if this slug belongs to a tenant (database lookup with cache)
  if (slug && await checkIfTenantSlug(slug)) {
    console.log('[ROUTE RESOLVE] Confirmed tenant slug:', slug);
    // Strip the slug prefix to get the "inner" path for the news portal router
    const inner = '/' + parts.slice(2).join('/');
    const tenantPath = inner === '/' || inner === '' ? '/' : inner;
    console.log('[ROUTE RESOLVE] Tenant path:', tenantPath);
    return { type: 'tenant', tenantSlug: slug, tenantPath };
  }

  console.log('[ROUTE RESOLVE] No match found, returning 404');
  return { type: '404' };
}

// ─── Tenant news portal router ───────────────────────────────────────────────
// Renders the appropriate news portal page for a given inner path.
function TenantRouter({ tenantPath }: { tenantPath: string }) {
  if (tenantPath === '/login') {
    return <AuthPage mode="login" />;
  }
  if (tenantPath === '/register') {
    return <AuthPage mode="register" />;
  }
  if (tenantPath.startsWith('/forgot-password')) {
    return <AuthPage mode="forgot" />;
  }
  if (tenantPath.startsWith('/reset-password')) {
    return <AuthPage mode="reset" />;
  }
  if (tenantPath === '/profile') {
    return <ProfilePage />;
  }
  if (tenantPath === '/about-us') return <AboutPage />;
  if (tenantPath === '/contact-us') return <ContactPage />;
  if (tenantPath === '/privacy-policy') return <PrivacyPolicyPage />;
  if (tenantPath === '/terms-and-conditions') return <TermsPage />;
  if (tenantPath === '/disclaimer') return <DisclaimerPage />;
  if (tenantPath === '/editorial-policy') return <EditorialPolicyPage />;
  if (tenantPath === '/advertise-with-us') return <AdvertisePage />;
  if (tenantPath === '/cookie-policy') return <CookiePolicyPage />;
  if (tenantPath === '/sitemap') return <SitemapPage />;
  if (tenantPath === '/unsubscribe') return <UnsubscribePage />;

  if (tenantPath.startsWith('/article/')) {
    return <ArticlePage slug={decodeURIComponent(tenantPath.replace('/article/', ''))} />;
  }
  if (tenantPath.startsWith('/category/')) {
    return <CategoryPage slug={decodeURIComponent(tenantPath.replace('/category/', ''))} />;
  }
  if (tenantPath.startsWith('/search')) {
    return <SearchPage />;
  }

  // Tenant home
  if (tenantPath === '/') {
    return <HomePage />;
  }

  // Custom pages (catch-all for tenant-specific pages)
  // Must come before 404 to allow dynamic page routing
  if (tenantPath.startsWith('/') && !tenantPath.includes('/article/') && !tenantPath.includes('/category/')) {
    const CustomPage = lazy(() => import('./pages/CustomPage').then(m => ({ default: m.CustomPage })));
    return (
      <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>}>
        <CustomPage />
      </Suspense>
    );
  }

  // Tenant 404 — unrecognised path within tenant
  return <NotFoundPage />;
}

// ─── 404 page ────────────────────────────────────────────────────────────────
function NotFoundPage() {
  const { navigate } = useAppNavigation();
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', fontFamily: 'Inter, sans-serif', textAlign: 'center', padding: 24 }}>
      <div style={{ fontSize: 80, fontWeight: 900, color: '#e2e8f0', lineHeight: 1 }}>404</div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', marginTop: 16 }}>Page not found</h1>
      <p style={{ fontSize: 15, color: '#64748b', marginTop: 8, maxWidth: 360 }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <button
        onClick={() => navigate('/')}
        style={{ marginTop: 28, background: '#dc2626', color: '#fff', fontSize: 14, fontWeight: 600, padding: '11px 24px', borderRadius: 8, border: 'none', cursor: 'pointer' }}
      >
        Go to SangTX Home
      </button>
    </div>
  );
}

// ─── Top-level router ────────────────────────────────────────────────────────
function AppRouter() {
  const { pathname } = useAppNavigation();
  const auth = useAuth();
  const [route, setRoute] = useState<{
    type: 'saas' | 'tenant' | 'admin' | 'super_admin' | 'demo' | '404';
    tenantSlug?: string;
    tenantPath?: string;
  }>({ type: 'saas' });
  const [routeLoading, setRouteLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setRouteLoading(true);
    
    resolveRoute(pathname).then((resolved) => {
      if (mounted) {
        setRoute(resolved);
        setRouteLoading(false);
      }
    });
    
    return () => { mounted = false; };
  }, [pathname]);

  if (routeLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (route.type === 'demo') {
    if (pathname === '/demo/admin' || pathname.startsWith('/demo/admin/')) return <DemoPortal mode="admin" />;
    if (pathname.startsWith('/demo/article/')) return <DemoPortal mode="article" />;
    if (pathname.startsWith('/demo/category/')) return <DemoPortal mode="category" />;
    if (pathname.startsWith('/demo/search')) return <DemoPortal mode="search" />;
    return <DemoPortal mode="home" />;
  }

  // ── SaaS marketing & auth routes ──────────────────────────────────────────
  if (route.type === 'saas') {
    // SangTX homepage
    if (pathname === '/' || pathname === '/sangtx') {
      return <SangTXHomePage />;
    }
    // SaaS login / register
    if (pathname === '/login') {
      return <SangTXAuthPage mode="login" />;
    }
    if (pathname === '/register') {
      return <SangTXAuthPage mode="register" />;
    }
    if (pathname.startsWith('/forgot-password')) {
      return <SangTXAuthPage mode="forgot" />;
    }
    if (pathname.startsWith('/reset-password')) {
      return <SangTXAuthPage mode="reset" />;
    }
    // SaaS section pages — scroll-to on the homepage for now
    if (pathname === '/features') {
      return <SangTXFeaturesPage />;
    }
    if (pathname === '/pricing') {
      return <SangTXPricingPage />;
    }
    if (pathname === '/contact') {
      return <SangTXContactPage />;
    }
    // Onboarding wizard
    if (pathname === '/onboarding') {
      return (
        <Suspense fallback={<div className="min-h-screen" aria-busy="true" />}>
          <SangTXOnboardingPage />
        </Suspense>
      );
    }
    // SaaS legal pages — reuse shared content pages
    if (pathname === '/privacy') {
      return <PrivacyPolicyPage />;
    }
    if (pathname === '/terms') {
      return <TermsPage />;
    }
  }

  // ── Admin panel ───────────────────────────────────────────────────────────
  if (route.type === 'admin') {
    console.log('[ADMIN ROUTE DEBUG 1] /admin route accessed:', {
      loading: auth.loading,
      ready: auth.ready,
      hasSession: !!auth.session,
      hasUser: !!auth.user,
      hasProfile: !!auth.profile,
      profileEmail: auth.profile?.email ?? null,
      roleSlug: auth.profile?.role_slug ?? null,
      ownedTenantId: auth.profile?.owned_tenant_id ?? null,
      canAccessAdmin: auth.canAccessAdmin,
    });
    
    // Show loading screen while auth is initializing
    if (auth.loading || !auth.ready) {
      console.log('[ADMIN ROUTE DEBUG 2] Showing loading screen - auth not ready');
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
            <p className="mt-4 text-slate-600">Verifying authorization...</p>
          </div>
        </div>
      );
    }
    
    // Auth is ready, check authorization
    if (!auth.canAccessAdmin) {
      console.error('[ADMIN ROUTE DEBUG 3] Access DENIED - showing login page:', {
        hasProfile: !!auth.profile,
        roleSlug: auth.profile?.role_slug ?? null,
        ownedTenantId: auth.profile?.owned_tenant_id ?? null,
        canAccessAdmin: auth.canAccessAdmin,
      });
      return <SangTXAuthPage mode="login" />;
    }
    
    console.log('[ADMIN ROUTE DEBUG 4] Access GRANTED - rendering AdminPage with CmsProvider');
    
    // For admin routes, use the owned tenant slug for CmsProvider
    // This prevents "Tenant slug is required" errors during CMS initialization
    const adminTenantSlug = auth.profile?.owned_tenant_slug ?? null;
    
    return (
      <CmsProvider tenantSlug={adminTenantSlug}>
        <AdminPage />
      </CmsProvider>
    );
  }

  // ── Super Admin panel ─────────────────────────────────────────────────────
  if (route.type === 'super_admin') {
    // Show loading while auth initializes
    if (auth.loading || !auth.ready) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
            <p className="mt-4 text-slate-600">Verifying authorization...</p>
          </div>
        </div>
      );
    }
    
    // Check if user is actually a super admin
    const isSuperAdmin = auth.profile?.role_slug === 'super_admin';
    
    if (!isSuperAdmin) {
      // Not authorized - redirect to SaaS login
      console.error('[SUPER ADMIN] Access DENIED:', {
        hasProfile: !!auth.profile,
        roleSlug: auth.profile?.role_slug ?? null,
        isSuperAdmin,
      });
      return <SangTXAuthPage mode="login" />;
    }
    
    // Authorized super admin
    return <SuperAdminPage />;
  }

  // ── Tenant news portal ────────────────────────────────────────────────────
  if (route.type === 'tenant' && route.tenantPath !== undefined) {
    return (
      <CmsProvider tenantSlug={route.tenantSlug}>
        {/* Branding/SEO bridges only run when inside a CmsProvider (tenant context) */}
        <BrandingBridge />
        <SeoBridge />
        <PushNotificationPrompt />
        <TenantRouter tenantPath={route.tenantPath} />
      </CmsProvider>
    );
  }

  // ── 404 ───────────────────────────────────────────────────────────────────
  return <NotFoundPage />;
}

// ─── Language-gated root ─────────────────────────────────────────────────────
// Shows the LanguageGate on first visit; thereafter goes straight to the app.
function LanguageGatedApp() {
  // True = language has been selected and gate should be hidden
  const [langReady, setLangReady] = useState(() => getSavedLanguage() !== null);

  if (!langReady) {
    return <LanguageGate onComplete={() => setLangReady(true)} />;
  }

  return (
    <AuthProvider>
      <GoogleAnalytics />
      <Toaster />
      <Suspense fallback={<div className="min-h-screen" aria-busy="true" />}>
        <AppRouter />
      </Suspense>
    </AuthProvider>
  );
}

export default function App() {
  return (
    <AppNavigationProvider>
      <I18nProvider>
        <LanguageGatedApp />
      </I18nProvider>
    </AppNavigationProvider>
  );
}
