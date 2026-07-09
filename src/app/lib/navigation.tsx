import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type AppNavigationContextValue = {
  pathname: string;
  search: string;
  navigate: (to: string) => void;
};

const AppNavigationContext = createContext<AppNavigationContextValue | null>(null);

export function AppNavigationProvider({ children }: { children: React.ReactNode }) {
  const [locationState, setLocationState] = useState(() => ({
    pathname: window.location.pathname || '/',
    search: window.location.search || '',
  }));

  useEffect(() => {
    const handlePopState = () => {
      setLocationState({
        pathname: window.location.pathname || '/',
        search: window.location.search || '',
      });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (to: string) => {
    if (to === `${locationState.pathname}${locationState.search}`) return;

    const next = new URL(to, window.location.origin);
    window.history.pushState({}, '', `${next.pathname}${next.search}`);
    setLocationState({
      pathname: next.pathname,
      search: next.search,
    });
  };

  const value = useMemo(
    () => ({
      pathname: locationState.pathname,
      search: locationState.search,
      navigate,
    }),
    [locationState.pathname, locationState.search],
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
