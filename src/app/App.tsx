import { AppNavigationProvider, useAppNavigation } from './lib/navigation';
import { CmsProvider } from './lib/cms';
import { AuthProvider, useAuth } from './lib/auth';
import { HomePage } from './pages/HomePage';
import { ArticlePage } from './pages/ArticlePage';
import { CategoryPage } from './pages/CategoryPage';
import { SearchPage } from './pages/SearchPage';
import { AdminPage } from './pages/AdminPage';
import { AuthPage } from './pages/AuthPage';
import { ProfilePage } from './pages/ProfilePage';
import { AboutPage } from './pages/AboutPage';
import { ContactPage } from './pages/ContactPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { TermsPage } from './pages/TermsPage';
import { DisclaimerPage } from './pages/DisclaimerPage';
import { EditorialPolicyPage } from './pages/EditorialPolicyPage';
import { AdvertisePage } from './pages/AdvertisePage';
import { CookiePolicyPage } from './pages/CookiePolicyPage';
import { SitemapPage } from './pages/SitemapPage';
import { UnsubscribePage } from './pages/UnsubscribePage';
import { Toaster } from './components/ui/sonner';
import { BrandingBridge } from './components/BrandingBridge';
import { SeoBridge } from './components/SeoBridge';
import { PushNotificationPrompt } from './components/PushNotificationPrompt';

/* MARKER-MAKE-KIT-INVOKED */

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
          <AppRouter />
        </CmsProvider>
      </AuthProvider>
    </AppNavigationProvider>
  );
}
