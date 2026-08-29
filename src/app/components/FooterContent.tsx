import { Facebook, Twitter, Youtube, Instagram, Mail, Phone, MapPin, ExternalLink, Send, Linkedin, MessageCircle } from 'lucide-react';
import { AppLink } from '../lib/navigation';
import { resolveAssetUrl } from '../lib/assetResolver';

export const socialIcons: Record<string, any> = {
  facebook: Facebook,
  twitter: Twitter,
  instagram: Instagram,
  youtube: Youtube,
  telegram: Send,
  whatsapp: MessageCircle,
  linkedin: Linkedin,
  threads: MessageCircle,
  pinterest: Instagram,
};

export interface FooterPresentationSocialLink {
  id: string;
  platform: string;
  platform_name: string;
  profile_url: string;
  follower_count?: string | null;
}

export interface FooterPresentationLink {
  id: string;
  title: string;
  url: string;
  is_external?: boolean;
  open_new_tab?: boolean;
}

export interface FooterPresentationColumn {
  column: { id: string; title: string };
  links: FooterPresentationLink[];
}

export interface FooterNewsletterFormState {
  email: string;
  loading: boolean;
  success: boolean;
  error: string;
  onEmailChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export interface FooterPresentationProps {
  siteName: string;
  tagline: string;
  description: string;
  logoUrl?: string | null;
  copyrightText: string;
  // Platform attribution - always locked
  poweredByText?: string;
  poweredByUrl?: string;
  designByText?: string;
  designByUrl?: string;
  socialLinks: FooterPresentationSocialLink[];
  columns: FooterPresentationColumn[];
  contact: {
    enabled: boolean;
    title: string;
    address: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    mapsUrl: string;
    phone: string;
    email: string;
    whatsapp: string;
    hours: string;
  };
  apps: {
    showGooglePlay: boolean;
    googlePlayUrl: string;
    googlePlayButtonText: string;
    showAppStore: boolean;
    appStoreUrl: string;
    appStoreButtonText: string;
  };
  newsletter: {
    enabled: boolean;
    title: string;
    description: string;
    placeholder: string;
    buttonText: string;
  };
  ad: {
    enabled: boolean;
    title: string;
    description: string;
    imageUrl: string;
    buttonText: string;
    buttonUrl: string;
  };
  newsletterForm?: FooterNewsletterFormState;
}

/**
 * Shared footer presentation used by BOTH:
 * - the public Footer (data loaded from Supabase), and
 * - the admin FooterPreview (live form state)
 * This guarantees the preview matches the real public footer structure.
 */
export function FooterPresentation({
  siteName,
  tagline,
  description,
  logoUrl,
  copyrightText,
  poweredByText,
  poweredByUrl,
  designByText,
  designByUrl,
  socialLinks,
  columns,
  contact,
  apps,
  newsletter,
  ad,
  newsletterForm,
}: FooterPresentationProps) {
  // Split brand name for two-tone logo: last word gets red
  const words = siteName.trim().split(' ');
  const nameFirst = words.slice(0, -1).join(' ') + (words.length > 1 ? ' ' : '');
  const nameLast = words.length > 1 ? words[words.length - 1] : siteName;

  let fullAddress = contact.address;
  if (contact.city || contact.state || contact.country) {
    const parts = [contact.address, contact.city, contact.state, contact.country, contact.postalCode].filter(Boolean);
    fullAddress = parts.join(', ');
  }

  const form = newsletterForm;

  return (
    <footer className="bg-[#0f172a] text-white">

      {/* ═══════════════════════════════════════════
          MOBILE FOOTER (< 768px) — Compact version
          ═══════════════════════════════════════════ */}
      <div className="md:hidden px-5 py-8">
        {/* Logo */}
        <div className="mb-4">
          {logoUrl ? (
            <img src={resolveAssetUrl(logoUrl)} alt={siteName} className="h-10 mb-2" />
          ) : (
            <h3 className="text-xl font-extrabold leading-none">
              <span className="text-white">{nameFirst}</span>
              <span className="text-red-500">{nameLast}</span>
            </h3>
          )}
          <p className="text-[10px] text-gray-400 tracking-wider mt-1">{tagline}</p>
        </div>

        {/* Short description */}
        <p className="text-xs text-gray-400 leading-relaxed mb-5">
          {description}
        </p>

        {/* Social icons */}
        {socialLinks.length > 0 && (
          <div className="flex gap-2.5 mb-5 flex-wrap">
            {socialLinks.map((link) => {
              const Icon = socialIcons[link.platform] || MessageCircle;
              return (
                <a
                  key={link.id}
                  href={link.profile_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center"
                  aria-label={link.platform_name}
                >
                  <Icon className="h-4 w-4" />
                </a>
              );
            })}
          </div>
        )}

        {/* App download buttons */}
        {(apps.showGooglePlay || apps.showAppStore) && (
          <div className="flex gap-2.5 flex-wrap">
            {apps.showGooglePlay && apps.googlePlayUrl && (
              <a href={apps.googlePlayUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2 border border-slate-700">
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 010 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z"/>
                </svg>
                <div className="text-left leading-tight">
                  <div className="text-[7px] text-gray-400 uppercase tracking-wide">Get it on</div>
                  <div className="text-[10px] font-semibold text-white">{apps.googlePlayButtonText}</div>
                </div>
              </a>
            )}
            {apps.showAppStore && apps.appStoreUrl && (
              <a href={apps.appStoreUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2 border border-slate-700">
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83"/>
                </svg>
                <div className="text-left leading-tight">
                  <div className="text-[7px] text-gray-400 uppercase tracking-wide">Download on</div>
                  <div className="text-[10px] font-semibold text-white">{apps.appStoreButtonText}</div>
                </div>
              </a>
            )}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════
          DESKTOP/TABLET FOOTER (>= 768px) — Full version
          ═══════════════════════════════════════════ */}
      <div className="hidden md:block">
        <div className="mx-auto max-w-[1400px] px-4 py-14">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-10">

            {/* COLUMN 1: Company */}
            <div>
              <div className="mb-5">
                {logoUrl ? (
                  <img src={resolveAssetUrl(logoUrl)} alt={siteName} className="h-12 mb-2" />
                ) : (
                  <h3 className="text-2xl font-extrabold leading-none">
                    <span className="text-white">{nameFirst}</span>
                    <span className="text-red-500">{nameLast}</span>
                  </h3>
                )}
                <p className="text-[11px] text-gray-400 tracking-wider mt-1">{tagline}</p>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed mb-6">
                {description}
              </p>

              {/* Social Links */}
              {socialLinks.length > 0 && (
                <div className="flex gap-2.5 mb-6 flex-wrap">
                  {socialLinks.map((link) => {
                    const Icon = socialIcons[link.platform] || MessageCircle;
                    return (
                      <a
                        key={link.id}
                        href={link.profile_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-red-600 flex items-center justify-center transition-all duration-200 hover:scale-110"
                        aria-label={link.platform_name}
                        title={link.follower_count ? `${link.follower_count} Followers` : link.platform_name}
                      >
                        <Icon className="h-4 w-4" />
                      </a>
                    );
                  })}
                </div>
              )}

              {/* App Downloads */}
              {(apps.showGooglePlay || apps.showAppStore) && (
                <div className="flex gap-2.5">
                  {apps.showGooglePlay && apps.googlePlayUrl && (
                    <a href={apps.googlePlayUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 rounded-lg px-3.5 py-2.5 transition-all duration-200 hover:scale-[1.02] border border-slate-700">
                      <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 010 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z"/></svg>
                      <div className="text-left leading-tight"><div className="text-[8px] text-gray-400 uppercase tracking-wide">Get it on</div><div className="text-[11px] font-semibold text-white">{apps.googlePlayButtonText}</div></div>
                    </a>
                  )}
                  {apps.showAppStore && apps.appStoreUrl && (
                    <a href={apps.appStoreUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 rounded-lg px-3.5 py-2.5 transition-all duration-200 hover:scale-[1.02] border border-slate-700">
                      <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83"/></svg>
                      <div className="text-left leading-tight"><div className="text-[8px] text-gray-400 uppercase tracking-wide">Download on</div><div className="text-[11px] font-semibold text-white">{apps.appStoreButtonText}</div></div>
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Dynamic Columns from Database */}
            {columns.slice(0, 2).map((col) => (
              <div key={col.column.id}>
                <h4 className="text-sm font-bold uppercase tracking-wider text-white mb-5 flex items-center gap-2">
                  <span className="w-1 h-5 bg-red-500 rounded-full" /> {col.column.title}
                </h4>
                <ul className="space-y-3">
                  {col.links.map((link) => (
                    <li key={link.id}>
                      {link.is_external ? (
                        <a
                          href={link.url}
                          target={link.open_new_tab ? '_blank' : undefined}
                          rel={link.open_new_tab ? 'noopener noreferrer' : undefined}
                          className="text-sm text-gray-400 hover:text-red-400 hover:pl-1 transition-all duration-200"
                        >
                          {link.title}
                        </a>
                      ) : (
                        <AppLink
                          to={link.url}
                          className="text-sm text-gray-400 hover:text-red-400 hover:pl-1 transition-all duration-200"
                        >
                          {link.title}
                        </AppLink>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {/* Newsletter Column (if enabled) */}
            {newsletter.enabled && (
              <div>
                <h4 className="text-sm font-bold uppercase tracking-wider text-white mb-5 flex items-center gap-2">
                  <span className="w-1 h-5 bg-red-500 rounded-full" /> {newsletter.title}
                </h4>
                <p className="text-xs text-gray-400 mb-4">{newsletter.description}</p>
                <form onSubmit={form?.onSubmit} className="space-y-3">
                  <input
                    type="email"
                    value={form?.email ?? ''}
                    onChange={(e) => form?.onEmailChange(e.target.value)}
                    placeholder={newsletter.placeholder}
                    disabled={form?.loading}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-red-500 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={Boolean(form?.loading) || !form?.email}
                    className="w-full px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {form?.loading ? 'Subscribing...' : newsletter.buttonText}
                  </button>
                  {form?.success && (
                    <div className="text-xs text-green-400 font-medium">✓ Successfully subscribed!</div>
                  )}
                  {form?.error && (
                    <div className="text-xs text-red-400 font-medium">{form.error}</div>
                  )}
                </form>
              </div>
            )}

            {/* Contact Column (if enabled and no 3rd column) */}
            {contact.enabled && columns.length < 3 && !newsletter.enabled && (
              <div>
                <h4 className="text-sm font-bold uppercase tracking-wider text-white mb-5 flex items-center gap-2">
                  <span className="w-1 h-5 bg-red-500 rounded-full" /> {contact.title}
                </h4>
                <div className="space-y-4">
                  {fullAddress && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-red-500/30 transition-colors">
                      <div className="w-9 h-9 rounded-lg bg-red-600/10 flex items-center justify-center shrink-0 mt-0.5"><MapPin className="h-4 w-4 text-red-400" /></div>
                      <div>
                        <div className="text-xs font-semibold text-gray-200">{contact.title}</div>
                        <div className="text-xs text-gray-400 mt-0.5 leading-relaxed">{fullAddress}</div>
                        {contact.mapsUrl && (
                          <a href={contact.mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-red-400 hover:text-red-300 hover:underline mt-1.5 font-medium transition-colors">View on Google Maps <ExternalLink className="h-2.5 w-2.5" /></a>
                        )}
                      </div>
                    </div>
                  )}
                  {contact.phone && (
                    <a href={`tel:${contact.phone.replace(/\s/g, '')}`} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-red-500/30 transition-colors group">
                      <div className="w-9 h-9 rounded-lg bg-red-600/10 flex items-center justify-center shrink-0 group-hover:bg-red-600/20 transition-colors"><Phone className="h-4 w-4 text-red-400" /></div>
                      <div><div className="text-xs font-semibold text-gray-200">Phone</div><div className="text-xs text-gray-400 group-hover:text-red-400 transition-colors">{contact.phone}</div></div>
                    </a>
                  )}
                  {contact.email && (
                    <a href={`mailto:${contact.email}`} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-red-500/30 transition-colors group">
                      <div className="w-9 h-9 rounded-lg bg-red-600/10 flex items-center justify-center shrink-0 group-hover:bg-red-600/20 transition-colors"><Mail className="h-4 w-4 text-red-400" /></div>
                      <div><div className="text-xs font-semibold text-gray-200">Email</div><div className="text-xs text-gray-400 group-hover:text-red-400 transition-colors">{contact.email}</div></div>
                    </a>
                  )}
                  {contact.whatsapp && (
                    <a href={`https://wa.me/${contact.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-red-500/30 transition-colors group">
                      <div className="w-9 h-9 rounded-lg bg-red-600/10 flex items-center justify-center shrink-0 group-hover:bg-red-600/20 transition-colors"><MessageCircle className="h-4 w-4 text-red-400" /></div>
                      <div><div className="text-xs font-semibold text-gray-200">WhatsApp</div><div className="text-xs text-gray-400 group-hover:text-red-400 transition-colors">{contact.whatsapp}</div></div>
                    </a>
                  )}
                  {contact.hours && (
                    <div className="text-xs text-gray-400 mt-2">{contact.hours}</div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* FOOTER ADVERTISEMENT (if enabled) */}
        {ad.enabled && ad.imageUrl && ad.buttonUrl && (
          <div className="border-t border-slate-800">
            <div className="mx-auto max-w-[1400px] px-4 py-8">
              <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-lg p-6 flex flex-col md:flex-row items-center gap-6 border border-slate-700">
                {ad.imageUrl && (
                  <img
                    src={resolveAssetUrl(ad.imageUrl)}
                    alt={ad.title || 'Advertisement'}
                    className="w-full md:w-48 h-32 object-cover rounded-lg"
                  />
                )}
                <div className="flex-1 text-center md:text-left">
                  {ad.title && (
                    <h3 className="text-lg font-bold text-white mb-2">{ad.title}</h3>
                  )}
                  {ad.description && (
                    <p className="text-sm text-gray-400 mb-4">{ad.description}</p>
                  )}
                  {ad.buttonUrl && (
                    <a
                      href={ad.buttonUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block px-6 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                      {ad.buttonText}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* COPYRIGHT BAR (desktop/tablet only) */}
        <div className="border-t border-slate-800">
          <div className="mx-auto max-w-[1400px] px-4 py-5 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-center gap-2 text-xs text-gray-500">
              <span>{copyrightText}</span>
              {poweredByText && (
                <>
                  <span className="hidden sm:inline text-slate-700">•</span>
                  <span>
                    {poweredByUrl ? (
                      <a href={poweredByUrl} target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 hover:underline font-medium transition-colors">
                        {poweredByText}
                      </a>
                    ) : (
                      poweredByText
                    )}
                  </span>
                </>
              )}
              {designByText && (
                <>
                  <span className="hidden sm:inline text-slate-700">•</span>
                  <span>
                    {designByUrl ? (
                      <a href={designByUrl} target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 hover:underline font-medium transition-colors">
                        {designByText}
                      </a>
                    ) : (
                      designByText
                    )}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

    </footer>
  );
}
