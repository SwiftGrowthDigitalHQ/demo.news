import { lazy, Suspense } from 'react';
import { AppNavigationProvider, useAppNavigation } from './lib/navigation';
import { CmsProvider } from './lib/cms';
import { AuthProvider, useAuth } from './lib/auth';
import { Toaster } from './components/ui/sonner';
import { BrandingBridge } from './components/BrandingBridge';
import { SeoBridge } from './components/SeoBridge';
import { PushNotificationPrompt } from './components/PushNotificationPrompt';

/* MARKER-MAKE-KIT-INVOKED */

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

function AppRouter() {
  const { pathname } = useAppNavigation();
  const auth = useAuth();

  // Auth routes
  if (pathname === '/login') {
    return <AuthPage mode="login" />;
  }
  if (pathname === '/register') {
    return <AuthPage mode="register" />;
  }
  if (pathname.startsWith('/forgot-password')) {
    return <AuthPage mode="forgot" />;
  }
  if (pathname.startsWith('/reset-password')) {
    return <AuthPage mode="reset" />;
  }

  // Profile (requires auth)
  if (pathname === '/profile') {
    return <ProfilePage />;
  }

  // Admin (requires admin role)
  if (pathname.startsWith('/admin')) {
    if (!auth.loading && !auth.canAccessAdmin) {
      return <AuthPage mode="login" />;
    }
    return <AdminPage />;
  }

  // Static / Legal pages
  if (pathname === '/about-us') {
    return <AboutPage />;
  }
  if (pathname === '/contact-us') {
    return <ContactPage />;
  }
  if (pathname === '/privacy-policy') {
    return <PrivacyPolicyPage />;
  }
  if (pathname === '/terms-and-conditions') {
    return <TermsPage />;
  }
  if (pathname === '/disclaimer') {
    return <DisclaimerPage />;
  }
  if (pathname === '/editorial-policy') {
    return <EditorialPolicyPage />;
  }
  if (pathname === '/advertise-with-us') {
    return <AdvertisePage />;
  }
  if (pathname === '/cookie-policy') {
    return <CookiePolicyPage />;
  }
  if (pathname === '/sitemap') {
    return <SitemapPage />;
  }
  if (pathname === '/unsubscribe') {
    return <UnsubscribePage />;
  }

  // Dynamic content routes
  if (pathname.startsWith('/article/')) {
    return <ArticlePage slug={decodeURIComponent(pathname.replace('/article/', ''))} />;
  }
  if (pathname.startsWith('/category/')) {
    return <CategoryPage slug={decodeURIComponent(pathname.replace('/category/', ''))} />;
  }
  if (pathname.startsWith('/search')) {
    return <SearchPage />;
  }

  return <HomePage />;
}

export default function App() {
  return (
    <AppNavigationProvider>
      <AuthProvider>
        <CmsProvider>
          <Toaster />
          <BrandingBridge />
          <SeoBridge />
          <PushNotificationPrompt />
          <Suspense fallback={<div className="min-h-screen" aria-busy="true" />}>
            <AppRouter />
          </Suspense>
        </CmsProvider>
      </AuthProvider>
    </AppNavigationProvider>
  );
}
