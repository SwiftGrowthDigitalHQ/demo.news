export const MOBILE_BREAKPOINT = 768;
export const TABLET_BREAKPOINT = 1024;
export const DESKTOP_BREAKPOINT = 1280;

export const breakpoints = {
  xs: '320px',
  sm: '375px',
  md: '414px',
  lg: '430px',
  tablet: '768px',
  desktop: '1024px',
  wide: '1280px',
} as const;

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  '2xl': '24px',
  '3xl': '32px',
} as const;

export const touchTarget = {
  min: '44px',
  comfortable: '48px',
  large: '56px',
} as const;

export const fontSize = {
  xs: '11px',
  sm: '12px',
  base: '13px',
  md: '14px',
  lg: '15px',
  xl: '16px',
  '2xl': '18px',
  '3xl': '22px',
  '4xl': '28px',
} as const;

export const containerPadding = {
  mobile: '12px',
  tablet: '16px',
  desktop: '24px',
} as const;

export function getResponsiveValue<T>(values: Partial<Record<keyof typeof breakpoints, T>>, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  const width = window.innerWidth;
  if (width < 375) return values.xs ?? fallback;
  if (width < 414) return values.sm ?? fallback;
  if (width < 430) return values.md ?? fallback;
  if (width < 768) return values.lg ?? fallback;
  if (width < 1024) return values.tablet ?? fallback;
  if (width < 1280) return values.desktop ?? fallback;
  return values.wide ?? fallback;
}

export const adminLayout = {
  headerHeight: {
    mobile: '56px',
    desktop: '60px',
  },
  sidebarWidth: {
    collapsed: '64px',
    expanded: '240px',
    mobileDrawer: '280px',
  },
  contentPadding: {
    mobile: '12px',
    tablet: '16px',
    desktop: '24px',
  },
  cardGap: {
    mobile: '12px',
    desktop: '16px',
  },
  kpiCardMinWidth: {
    mobile: '140px',
    desktop: '180px',
  },
} as const;

export const formLayout = {
  inputHeight: {
    mobile: '48px',
    desktop: '42px',
  },
  labelGap: '6px',
  fieldGap: {
    mobile: '16px',
    desktop: '20px',
  },
  sectionGap: {
    mobile: '20px',
    desktop: '24px',
  },
} as const;

export const modalLayout = {
  maxWidth: {
    mobile: 'calc(100vw - 24px)',
    tablet: 'calc(100vw - 32px)',
    desktop: '560px',
    wide: '720px',
  },
  maxHeight: {
    mobile: 'calc(100vh - 24px)',
    desktop: 'calc(100vh - 48px)',
  },
  padding: {
    mobile: '16px',
    desktop: '24px',
  },
  borderRadius: {
    mobile: '16px',
    desktop: '12px',
  },
} as const;

export const tableLayout = {
  cardPadding: '12px',
  cardGap: '8px',
  actionButtonSize: '40px',
} as const;

export function useResponsive() {
  const [width, setWidth] = React.useState(() => 
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );

  React.useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = width < MOBILE_BREAKPOINT;
  const isTablet = width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT;
  const isDesktop = width >= TABLET_BREAKPOINT;

  return { width, isMobile, isTablet, isDesktop };
}

export function useMediaQuery(query: string) {
  const [matches, setMatches] = React.useState(() => 
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  );

  React.useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

import * as React from 'react';