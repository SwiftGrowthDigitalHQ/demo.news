import { useEffect } from 'react';
import { useCms } from '../lib/cms';

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
    const logo = String(theme.logo ?? siteSettings?.logo_url ?? '');
    const favicon = String(theme.favicon ?? siteSettings?.logo_url ?? '');
    const siteName = siteSettings.site_name;

    document.documentElement.style.setProperty('--primary', primary);
    document.documentElement.style.setProperty('--secondary', secondary);
    document.documentElement.style.setProperty('--brand-primary', primary);
    document.documentElement.style.setProperty('--brand-secondary', secondary);

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
