import { useEffect, useState } from 'react';
import { useCms } from '../lib/cms';
import { getPublicFooterData, type PublicFooterData } from '../lib/footerApi';
import { createNewsletterSubscription } from '../lib/admin';
import { FooterPresentation } from './FooterContent';

export function Footer() {
  const { siteSettings, tenantId } = useCms();
  const [footerData, setFooterData] = useState<PublicFooterData | null>(null);
  const [loading, setLoading] = useState(true);

  // Newsletter form state
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterLoading, setNewsletterLoading] = useState(false);
  const [newsletterSuccess, setNewsletterSuccess] = useState(false);
  const [newsletterError, setNewsletterError] = useState('');

  useEffect(() => {
    if (!tenantId) return;

    const load = async () => {
      try {
        const data = await getPublicFooterData(tenantId);
        setFooterData(data);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [tenantId]);

  // Fallback to site settings if no footer data
  const settings = footerData?.settings;
  const siteName = settings?.brand_name || siteSettings?.site_name || 'News Site';
  const tagline = settings?.tagline || (siteSettings?.theme_config as Record<string, unknown> | undefined)?.tagline as string | undefined || 'Fast. Accurate. Trusted.';
  const description = settings?.description || 'Your trusted digital news platform.';
  const logoUrl = settings?.footer_logo_url || settings?.logo_url || siteSettings?.logo_url;

  const copyrightText = settings?.copyright_text || `© ${new Date().getFullYear()} ${siteName}. All Rights Reserved.`;

  // Newsletter submission handler
  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail || newsletterLoading) return;

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newsletterEmail)) {
      setNewsletterError('Please enter a valid email address');
      return;
    }

    setNewsletterLoading(true);
    setNewsletterError('');
    setNewsletterSuccess(false);

    try {
      await createNewsletterSubscription({
        email: newsletterEmail,
        source: 'footer'
      });
      setNewsletterSuccess(true);
      setNewsletterEmail('');
      setTimeout(() => setNewsletterSuccess(false), 5000);
    } catch (error: any) {
      const errorMsg = error?.message || 'Failed to subscribe. Please try again.';
      setNewsletterError(errorMsg);
    } finally {
      setNewsletterLoading(false);
    }
  };

  if (loading) {
    return (
      <footer className="bg-[#0f172a] text-white py-8">
        <div className="text-center text-gray-400 text-sm">Loading...</div>
      </footer>
    );
  }

  return (
    <FooterPresentation
      siteName={siteName}
      tagline={tagline}
      description={description}
      logoUrl={logoUrl}
      copyrightText={copyrightText}
      // Platform attribution - always locked
      poweredByText="Powered by SangTX"
      poweredByUrl="https://sangtx.com"
      designByText="Design by SwiftGrowthDigital"
      designByUrl="https://swiftgrowthdigital.com"
      socialLinks={(footerData?.socialLinks || []).map(link => ({
        id: link.id!,
        platform: link.platform,
        platform_name: link.platform_name,
        profile_url: link.profile_url,
        follower_count: link.follower_count ?? null,
      }))}
      columns={(footerData?.columns || []).map(col => ({
        column: { id: col.column.id!, title: col.column.title },
        links: col.links.map(link => ({
          id: link.id!,
          title: link.title,
          url: link.url,
          is_external: link.is_external,
          open_new_tab: link.open_new_tab,
        })),
      }))}
      contact={{
        enabled: settings?.contact_enabled ?? true,
        title: settings?.contact_title || 'Editorial Office',
        address: settings?.contact_address || siteSettings?.contact_name || '',
        city: settings?.contact_city || '',
        state: settings?.contact_state || '',
        country: settings?.contact_country || '',
        postalCode: settings?.contact_postal_code || '',
        mapsUrl: settings?.contact_maps_url || '',
        phone: settings?.contact_phone || siteSettings?.contact_phone || '',
        email: settings?.contact_email || siteSettings?.contact_email || '',
        whatsapp: settings?.contact_whatsapp || '',
        hours: settings?.contact_hours || '',
      }}
      apps={{
        showGooglePlay: settings?.show_google_play ?? false,
        googlePlayUrl: settings?.google_play_url || '',
        googlePlayButtonText: settings?.google_play_button_text || 'Google Play',
        showAppStore: settings?.show_app_store ?? false,
        appStoreUrl: settings?.app_store_url || '',
        appStoreButtonText: settings?.app_store_button_text || 'App Store',
      }}
      newsletter={{
        enabled: settings?.newsletter_enabled ?? false,
        title: settings?.newsletter_title || 'Newsletter',
        description: settings?.newsletter_description || 'Stay updated with the latest news',
        placeholder: settings?.newsletter_placeholder || 'Enter your email',
        buttonText: settings?.newsletter_button_text || 'Subscribe',
      }}
      ad={{
        enabled: settings?.footer_ad_enabled ?? false,
        title: settings?.footer_ad_title || '',
        description: settings?.footer_ad_description || '',
        imageUrl: settings?.footer_ad_image_url || '',
        buttonText: settings?.footer_ad_button_text || 'Learn More',
        buttonUrl: settings?.footer_ad_button_url || '',
      }}
      newsletterForm={{
        email: newsletterEmail,
        loading: newsletterLoading,
        success: newsletterSuccess,
        error: newsletterError,
        onEmailChange: setNewsletterEmail,
        onSubmit: handleNewsletterSubmit,
      }}
    />
  );
}

// Re-export for consumers that imported icons from Footer previously
export { socialIcons } from './FooterContent';
