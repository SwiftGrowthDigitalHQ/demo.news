import { Facebook, Twitter, Youtube, Instagram, Mail, Phone, MapPin, ExternalLink } from 'lucide-react';
import { AppLink } from '../lib/navigation';
import { useCms } from '../lib/cms';

export function Footer() {
  const { siteSettings } = useCms();

  const siteName = siteSettings?.site_name ?? 'Buxar News';
  const tagline = (siteSettings?.theme_config as Record<string, unknown> | undefined)?.tagline as string | undefined ?? 'Fast. Accurate. Trusted.';
  const contactPhone = siteSettings?.contact_phone ?? '+91 9229721835';
  const contactEmail = siteSettings?.contact_email ?? 'hello@swiftgrowthdigital.com';
  const contactAddress = siteSettings?.contact_name ?? 'Patna, Bihar, India';
  const footerText = siteSettings?.footer_text ?? 'Bihar\'s trusted digital news platform.';
  const socialLinks = (siteSettings?.social_links ?? {}) as Record<string, string>;

  // Split brand name for two-tone logo: last word gets red
  const words = siteName.trim().split(' ');
  const nameFirst = words.slice(0, -1).join(' ') + (words.length > 1 ? ' ' : '');
  const nameLast = words.length > 1 ? words[words.length - 1] : siteName;
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#0f172a] text-white">

      {/* ═══════════════════════════════════════════
          MOBILE FOOTER (< 768px) — Compact version
          ═══════════════════════════════════════════ */}
      <div className="md:hidden px-5 py-8">
        {/* Logo */}
        <div className="mb-4">
          <h3 className="text-xl font-extrabold leading-none">
            <span className="text-white">{nameFirst}</span>
            <span className="text-red-500">{nameLast}</span>
          </h3>
          <p className="text-[10px] text-gray-400 tracking-wider mt-1">{tagline}</p>
        </div>

        {/* Short description */}
        <p className="text-xs text-gray-400 leading-relaxed mb-5">
          {footerText}
        </p>

        {/* Social icons */}
        <div className="flex gap-2.5 mb-5">
          <a href={socialLinks.facebook || 'https://facebook.com'} target="_blank" rel="noopener noreferrer"
            className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center" aria-label="Facebook">
            <Facebook className="h-4 w-4" />
          </a>
          <a href={socialLinks.twitter || 'https://x.com'} target="_blank" rel="noopener noreferrer"
            className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center" aria-label="X (Twitter)">
            <Twitter className="h-4 w-4" />
          </a>
          <a href={socialLinks.instagram || 'https://instagram.com'} target="_blank" rel="noopener noreferrer"
            className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center" aria-label="Instagram">
            <Instagram className="h-4 w-4" />
          </a>
          <a href={socialLinks.youtube || 'https://youtube.com'} target="_blank" rel="noopener noreferrer"
            className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center" aria-label="YouTube">
            <Youtube className="h-4 w-4" />
          </a>
        </div>

        {/* App download buttons */}
        <div className="flex gap-2.5">
          <a href="#" className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2 border border-slate-700">
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 010 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z"/>
            </svg>
            <div className="text-left leading-tight">
              <div className="text-[7px] text-gray-400 uppercase tracking-wide">Get it on</div>
              <div className="text-[10px] font-semibold text-white">Google Play</div>
            </div>
          </a>
          <a href="#" className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2 border border-slate-700">
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83"/>
            </svg>
            <div className="text-left leading-tight">
              <div className="text-[7px] text-gray-400 uppercase tracking-wide">Download on</div>
              <div className="text-[10px] font-semibold text-white">App Store</div>
            </div>
          </a>
        </div>
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
                <h3 className="text-2xl font-extrabold leading-none">
                  <span className="text-white">{nameFirst}</span>
                  <span className="text-red-500">{nameLast}</span>
                </h3>
                <p className="text-[11px] text-gray-400 tracking-wider mt-1">{tagline}</p>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed mb-6">
                {footerText}
              </p>
              <div className="flex gap-2.5 mb-6">
                <a href={socialLinks.facebook || 'https://facebook.com'} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-blue-600 flex items-center justify-center transition-all duration-200 hover:scale-110" aria-label="Facebook"><Facebook className="h-4 w-4" /></a>
                <a href={socialLinks.twitter || 'https://x.com'} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-gray-700 flex items-center justify-center transition-all duration-200 hover:scale-110" aria-label="X (Twitter)"><Twitter className="h-4 w-4" /></a>
                <a href={socialLinks.instagram || 'https://instagram.com'} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-pink-600 flex items-center justify-center transition-all duration-200 hover:scale-110" aria-label="Instagram"><Instagram className="h-4 w-4" /></a>
                <a href={socialLinks.youtube || 'https://youtube.com'} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-red-600 flex items-center justify-center transition-all duration-200 hover:scale-110" aria-label="YouTube"><Youtube className="h-4 w-4" /></a>
              </div>
              <div className="flex gap-2.5">
                <a href="#" className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 rounded-lg px-3.5 py-2.5 transition-all duration-200 hover:scale-[1.02] border border-slate-700">
                  <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 010 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z"/></svg>
                  <div className="text-left leading-tight"><div className="text-[8px] text-gray-400 uppercase tracking-wide">Get it on</div><div className="text-[11px] font-semibold text-white">Google Play</div></div>
                </a>
                <a href="#" className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 rounded-lg px-3.5 py-2.5 transition-all duration-200 hover:scale-[1.02] border border-slate-700">
                  <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83"/></svg>
                  <div className="text-left leading-tight"><div className="text-[8px] text-gray-400 uppercase tracking-wide">Download on</div><div className="text-[11px] font-semibold text-white">App Store</div></div>
                </a>
              </div>
            </div>

            {/* COLUMN 2: Quick Links */}
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-white mb-5 flex items-center gap-2">
                <span className="w-1 h-5 bg-red-500 rounded-full" /> Quick Links
              </h4>
              <ul className="space-y-3">
                <li><AppLink to="/" className="text-sm text-gray-400 hover:text-red-400 hover:pl-1 transition-all duration-200">Home</AppLink></li>
                <li><AppLink to="/category/बिहार" className="text-sm text-gray-400 hover:text-red-400 hover:pl-1 transition-all duration-200">Bihar</AppLink></li>
                <li><AppLink to="/category/सीतामढ़ी" className="text-sm text-gray-400 hover:text-red-400 hover:pl-1 transition-all duration-200">Sitamarhi</AppLink></li>
                <li><AppLink to="/category/राजनीति" className="text-sm text-gray-400 hover:text-red-400 hover:pl-1 transition-all duration-200">Politics</AppLink></li>
                <li><AppLink to="/category/क्राइम" className="text-sm text-gray-400 hover:text-red-400 hover:pl-1 transition-all duration-200">Crime</AppLink></li>
                <li><AppLink to="/category/शिक्षा" className="text-sm text-gray-400 hover:text-red-400 hover:pl-1 transition-all duration-200">Education</AppLink></li>
                <li><AppLink to="/category/नौकरी" className="text-sm text-gray-400 hover:text-red-400 hover:pl-1 transition-all duration-200">Jobs</AppLink></li>
                <li><AppLink to="/category/खेल" className="text-sm text-gray-400 hover:text-red-400 hover:pl-1 transition-all duration-200">Sports</AppLink></li>
                <li><AppLink to="/category/मनोरंजन" className="text-sm text-gray-400 hover:text-red-400 hover:pl-1 transition-all duration-200">Entertainment</AppLink></li>
              </ul>
            </div>

            {/* COLUMN 3: Legal */}
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-white mb-5 flex items-center gap-2">
                <span className="w-1 h-5 bg-red-500 rounded-full" /> Legal
              </h4>
              <ul className="space-y-3">
                <li><AppLink to="/about-us" className="text-sm text-gray-400 hover:text-red-400 hover:pl-1 transition-all duration-200">About Us</AppLink></li>
                <li><AppLink to="/contact-us" className="text-sm text-gray-400 hover:text-red-400 hover:pl-1 transition-all duration-200">Contact Us</AppLink></li>
                <li><AppLink to="/privacy-policy" className="text-sm text-gray-400 hover:text-red-400 hover:pl-1 transition-all duration-200">Privacy Policy</AppLink></li>
                <li><AppLink to="/terms-and-conditions" className="text-sm text-gray-400 hover:text-red-400 hover:pl-1 transition-all duration-200">Terms &amp; Conditions</AppLink></li>
                <li><AppLink to="/disclaimer" className="text-sm text-gray-400 hover:text-red-400 hover:pl-1 transition-all duration-200">Disclaimer</AppLink></li>
                <li><AppLink to="/editorial-policy" className="text-sm text-gray-400 hover:text-red-400 hover:pl-1 transition-all duration-200">Editorial Policy</AppLink></li>
                <li><AppLink to="/advertise-with-us" className="text-sm text-gray-400 hover:text-red-400 hover:pl-1 transition-all duration-200">Advertise With Us</AppLink></li>
                <li><AppLink to="/cookie-policy" className="text-sm text-gray-400 hover:text-red-400 hover:pl-1 transition-all duration-200">Cookie Policy</AppLink></li>
                <li><AppLink to="/sitemap" className="text-sm text-gray-400 hover:text-red-400 hover:pl-1 transition-all duration-200">Sitemap</AppLink></li>
              </ul>
            </div>

            {/* COLUMN 4: Contact Us */}
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-white mb-5 flex items-center gap-2">
                <span className="w-1 h-5 bg-red-500 rounded-full" /> Contact Us
              </h4>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-red-500/30 transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-red-600/10 flex items-center justify-center shrink-0 mt-0.5"><MapPin className="h-4 w-4 text-red-400" /></div>
                  <div>
                    <div className="text-xs font-semibold text-gray-200">Editorial Office</div>
                    <div className="text-xs text-gray-400 mt-0.5 leading-relaxed">{contactAddress}</div>
                    <a href={`https://maps.google.com/?q=${encodeURIComponent(contactAddress)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-red-400 hover:text-red-300 hover:underline mt-1.5 font-medium transition-colors">View on Google Maps <ExternalLink className="h-2.5 w-2.5" /></a>
                  </div>
                </div>
                <a href={`tel:${contactPhone.replace(/\s/g, '')}`} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-red-500/30 transition-colors group">
                  <div className="w-9 h-9 rounded-lg bg-red-600/10 flex items-center justify-center shrink-0 group-hover:bg-red-600/20 transition-colors"><Phone className="h-4 w-4 text-red-400" /></div>
                  <div><div className="text-xs font-semibold text-gray-200">Phone</div><div className="text-xs text-gray-400 group-hover:text-red-400 transition-colors">{contactPhone}</div></div>
                </a>
                <a href={`mailto:${contactEmail}`} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-red-500/30 transition-colors group">
                  <div className="w-9 h-9 rounded-lg bg-red-600/10 flex items-center justify-center shrink-0 group-hover:bg-red-600/20 transition-colors"><Mail className="h-4 w-4 text-red-400" /></div>
                  <div><div className="text-xs font-semibold text-gray-200">Email</div><div className="text-xs text-gray-400 group-hover:text-red-400 transition-colors">{contactEmail}</div></div>
                </a>
              </div>
            </div>

          </div>
        </div>

        {/* COPYRIGHT BAR (desktop/tablet only) */}
        <div className="border-t border-slate-800">
          <div className="mx-auto max-w-[1400px] px-4 py-5 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-center gap-2 text-xs text-gray-500">
              <span>© {currentYear} {siteName}. All Rights Reserved.</span>
              <span className="hidden sm:inline text-slate-700">•</span>
              <span>Designed &amp; Developed By{' '}<a href="https://swiftgrowthdigital.com" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 hover:underline font-medium transition-colors">SwiftGrowthDigital</a></span>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <AppLink to="/privacy-policy" className="hover:text-red-400 transition-colors">Privacy Policy</AppLink>
              <span className="text-slate-700">|</span>
              <AppLink to="/terms-and-conditions" className="hover:text-red-400 transition-colors">Terms</AppLink>
              <span className="text-slate-700">|</span>
              <AppLink to="/sitemap" className="hover:text-red-400 transition-colors">Accessibility</AppLink>
            </div>
          </div>
        </div>
      </div>

    </footer>
  );
}
