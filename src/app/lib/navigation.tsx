import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type AppNavigationContextValue = {
  pathname: string;
  search: string;
  hash: string;
  navigate: (to: string) => void;
};

const AppNavigationContext = createContext<AppNavigationContextValue | null>(null);

export function AppNavigationProvider({ children }: { children: React.ReactNode }) {
  const [locationState, setLocationState] = useState(() => ({
    pathname: window.location.pathname || '/',
    search: window.location.search || '',
    hash: window.location.hash || '',
  }));

  useEffect(() => {
    const handlePopState = () => {
      setLocationState({
        pathname: window.location.pathname || '/',
        search: window.location.search || '',
        hash: window.location.hash || '',
      });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (to: string) => {
    const currentPath = `${locationState.pathname}${locationState.search}${locationState.hash}`;
    if (to === currentPath) return;

    const next = new URL(to, window.location.origin);
    window.history.pushState({}, '', `${next.pathname}${next.search}${next.hash}`);
    setLocationState({
      pathname: next.pathname,
      search: next.search,
      hash: next.hash,
    });
  };

  const value = useMemo(
    () => ({
      pathname: locationState.pathname,
      search: locationState.search,
      hash: locationState.hash,
      navigate,
    }),
    [locationState.pathname, locationState.search, locationState.hash],
  );

  return <AppNavigationContext.Provider value={value}>{children}</AppNavigationContext.Provider>;
}

export function useAppNavigation() {
  const context = useContext(AppNavigationContext);
  if (!context) {
    throw new Error('useAppNavigation must be used within AppNavigationProvider');
  }
  return context;
}

export function AppLink({
  to,
  className,
  children,
  onClick,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) {
  const { navigate } = useAppNavigation();
  const isInternal = to.startsWith('/');

  return (
    <a
      href={to}
      className={className}
      onClick={event => {
        onClick?.(event);
        if (!isInternal || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) {
          return;
        }
        event.preventDefault();
        navigate(to);
      }}
      {...props}
    >
      {children}
    </a>
  );
}

/**
 * Get the current tenant slug from the URL
 * Used for generating correct article/category URLs
 */
export function getCurrentTenantSlug(): string | null {
  if (typeof window === 'undefined') return null;
  
  const parts = window.location.pathname.split('/').filter(Boolean);
  // First part should be tenant slug if we're in a tenant context
  // Skip if it's a platform route like /admin, /login, etc.
  const firstPart = parts[0];
  
  const platformRoutes = new Set([
    'admin', 'super-admin', 'login', 'register', 'demo',
    'features', 'pricing', 'contact', 'privacy', 'terms',
    'forgot-password', 'reset-password', 'onboarding', 'sangtx'
  ]);
  
  if (firstPart && !platformRoutes.has(firstPart)) {
    return firstPart;
  }
  
  return null;
}

/**
 * Generate article URL with tenant slug prefix
 */
export function getArticleUrl(articleSlug: string, tenantSlug?: string | null): string {
  const slug = tenantSlug || getCurrentTenantSlug();
  if (!slug) {
    // Fallback: try to use article route without tenant slug
    return `/article/${articleSlug}`;
  }
  return `/${slug}/article/${articleSlug}`;
}

/**
 * Generate category URL with tenant slug prefix
 */
export function getCategoryUrl(categorySlug: string, tenantSlug?: string | null): string {
  const slug = tenantSlug || getCurrentTenantSlug();
  if (!slug) {
    return `/category/${categorySlug}`;
  }
  return `/${slug}/category/${categorySlug}`;
}
