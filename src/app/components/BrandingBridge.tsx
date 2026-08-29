import { useEffect } from 'react';
import { useCms } from '../lib/cms';
import { resolveLogoUrl, resolveFaviconUrl } from '../lib/assetResolver';

function ensureLink(rel: string) {
  let link = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!link) {
    link = document.createElement('link');
    link.rel = rel;
    document.head.appendChild(link);
  }
  return link;
}

export function BrandingBridge() {
  const { siteSettings } = useCms();

  useEffect(() => {
    if (!siteSettings?.site_name) {
      return;
    }

    const theme = (siteSettings?.theme_config as Record<string, unknown> | undefined) ?? {};
    const primary = String(theme.primary_color ?? '#dc2626');
    const secondary = String(theme.secondary_color ?? '#0f172a');
    
    // Resolve logo and favicon through centralized resolver
    const logoRaw = String(theme.logo ?? siteSettings?.logo_url ?? '');
    const faviconRaw = String(theme.favicon ?? siteSettings?.logo_url ?? '');
    const logo = resolveLogoUrl(logoRaw);
    const favicon = resolveFaviconUrl(faviconRaw);
    
    const siteName = siteSettings.site_name;
    const darkMode = Boolean(theme.dark_mode ?? false);
    const fontSizeStr = String(theme.font_size ?? 'Medium (16px)');

    // Extract numeric font size from string like "Medium (16px)"
    const fontSizeMatch = fontSizeStr.match(/(\d+)px/);
    const fontSize = fontSizeMatch ? `${fontSizeMatch[1]}px` : '16px';

    // Set CSS variables for theme colors
    const root = document.documentElement;
    root.style.setProperty('--primary', primary);
    root.style.setProperty('--secondary', secondary);
    root.style.setProperty('--brand-primary', primary);
    root.style.setProperty('--brand-secondary', secondary);
    root.style.setProperty('--theme-primary', primary);
    root.style.setProperty('--theme-secondary', secondary);
    root.style.setProperty('--article-font-size', fontSize);

    // Apply dark mode class
    if (darkMode) {
      root.classList.add('theme-dark');
    } else {
      root.classList.remove('theme-dark');
    }

    document.title = siteName;

    const iconLink = ensureLink('icon');
    if (favicon) {
      iconLink.href = favicon;
    }

    const appleIcon = ensureLink('apple-touch-icon');
    if (logo) {
      appleIcon.href = logo;
    }

    const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]') ?? document.createElement('meta');
    themeColor.name = 'theme-color';
    themeColor.content = primary;
    if (!themeColor.parentElement) {
      document.head.appendChild(themeColor);
    }
  }, [siteSettings]);

  return null;
}
