import { lazy, Suspense, useState } from 'react';
import { AppNavigationProvider, useAppNavigation } from './lib/navigation';
import { CmsProvider } from './lib/cms';
import { AuthProvider, useAuth } from './lib/auth';
import { I18nProvider } from './lib/i18n';
import { Toaster } from './components/ui/sonner';
import { BrandingBridge } from './components/BrandingBridge';
import { SeoBridge } from './components/SeoBridge';
import { PushNotificationPrompt } from './components/PushNotificationPrompt';
import { LanguageGate } from './components/LanguageGate';
import { SangTXHomePage } from './pages/SangTXHomePage';
import { SangTXAuthPage } from './pages/SangTXAuthPage';
import { getSavedLanguage } from './lib/i18n';

/* MARKER-MAKE-KIT-INVOKED */

// ─── SaaS / marketing pages (no CmsProvider needed) ─────────────────────────
const SangTXFeaturesPage = lazy(() => import('./pages/SangTXFeaturesPage').then(m => ({ default: m.SangTXFeaturesPage })));
const SangTXPricingPage   = lazy(() => import('./pages/SangTXPricingPage').then(m => ({ default: m.SangTXPricingPage })));
const SangTXDemoPage      = lazy(() => import('./pages/SangTXDemoPage').then(m => ({ default: m.SangTXDemoPage })));
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

// ─── Known tenant slugs ──────────────────────────────────────────────────────
// Add new tenants here as the platform grows.
const TENANT_SLUGS = new Set(['buxar-news', 'patna-news', 'rohtas-news']);

/**
 * Resolves a pathname to its routing context.
 *
 *  saas      → SangTX marketing/auth routes at top level
 *  tenant    → news portal under /<slug>/…
 *  admin     → admin panel (tenant-scoped, no slug prefix)
 *  404       → nothing matched
 */
function resolveRoute(pathname: string): {
  type: 'saas' | 'tenant' | 'admin' | '404';
  tenantSlug?: string;
  tenantPath?: string;
} {
  // ── SaaS root & marketing pages ───────────────────────────────────────────
  const saasRoutes = new Set([
    '/', '/features', '/pricing', '/demo', '/contact',
    '/privacy', '/terms', '/login', '/register', '/onboarding',
    '/forgot-password', '/reset-password',
    // Legacy aliases kept for backwards-compat
    '/sangtx',
  ]);
  if (saasRoutes.has(pathname)) return { type: 'saas' };
  if (pathname.startsWith('/forgot-password') || pathname.startsWith('/reset-password')) {
    return { type: 'saas' };
  }

  // ── Admin panel ───────────────────────────────────────────────────────────
  if (pathname.startsWith('/admin')) return { type: 'admin' };

  // ── Tenant slugs: /<slug> or /<slug>/… ───────────────────────────────────
  const parts = pathname.split('/');          // ['', 'buxar-news', 'article', ...]
  const slug = parts[1];
  if (slug && TENANT_SLUGS.has(slug)) {
    // Strip the slug prefix to get the "inner" path for the news portal router
    const inner = '/' + parts.slice(2).join('/');
    const tenantPath = inner === '/' || inner === '' ? '/' : inner;
    return { type: 'tenant', tenantSlug: slug, tenantPath };
  }

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
  const route = resolveRoute(pathname);

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
    if (pathname === '/demo') {
      return <SangTXDemoPage />;
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
    if (!auth.loading && !auth.canAccessAdmin) {
      return <SangTXAuthPage mode="login" />;
    }
    return <AdminPage />;
  }

  // ── Tenant news portal ────────────────────────────────────────────────────
  if (route.type === 'tenant' && route.tenantPath !== undefined) {
    return (
      <CmsProvider>
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
