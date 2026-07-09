import { useEffect, useState, useRef } from 'react';
import { getActiveAds, trackImpression, trackClick, type AdPlacement, type AdRecord } from '../lib/adService';
import { Phone, ArrowRight, Sparkles, BookOpen, Globe } from 'lucide-react';

interface SmartAdProps {
  placement: AdPlacement;
  className?: string;
  showLabel?: boolean;
}

export function SmartAd({ placement, className = '', showLabel = true }: SmartAdProps) {
  const [ads, setAds] = useState<AdRecord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const impressionTracked = useRef(new Set<string>());

  useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(() => {
      if (!cancelled) setLoaded(true); // force show fallback if ads take too long
    }, 3000);
    getActiveAds(placement, 5).then(result => {
      if (!cancelled) { setAds(result); setLoaded(true); }
    }).catch(() => {
      if (!cancelled) setLoaded(true);
    }).finally(() => clearTimeout(timeout));
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [placement]);

  useEffect(() => {
    if (ads.length <= 1) return;
    const timer = setInterval(() => setCurrentIndex(prev => (prev + 1) % ads.length), 12000);
    return () => clearInterval(timer);
  }, [ads.length]);

  useEffect(() => {
    const ad = ads[currentIndex];
    if (!ad || !containerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !impressionTracked.current.has(ad.id)) {
          impressionTracked.current.add(ad.id);
          void trackImpression(ad.id);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [ads, currentIndex]);

  const currentAd = ads[currentIndex];

  // Loading
  if (!loaded) return <div className={`h-[80px] rounded-lg bg-gray-100/30 animate-pulse ${className}`} />;

  // No ads configured — show promotional fallback
  if (!currentAd) {
    return (
      <div ref={containerRef} className={className}>
        {showLabel && <AdLabel />}
        <PromotionalFallback placement={placement} />
      </div>
    );
  }

  const handleClick = () => { void trackClick(currentAd.id); };

  // AdSense
  if (currentAd.ad_type === 'adsense' && currentAd.adsense_code) {
    return (
      <div ref={containerRef} className={className}>
        {showLabel && <AdLabel />}
        <div dangerouslySetInnerHTML={{ __html: currentAd.adsense_code }} />
      </div>
    );
  }

  // Direct banner WITH image
  if (currentAd.banner_url) {
    return (
      <div ref={containerRef} className={className}>
        {showLabel && <AdLabel />}
        <a href={currentAd.target_url || '#'} target="_blank" rel="noopener noreferrer sponsored" onClick={handleClick}
          className="block rounded-lg overflow-hidden hover:shadow-lg hover:scale-[1.005] transition-all duration-300">
          <img src={currentAd.banner_url} alt={currentAd.title} loading="lazy" decoding="async"
            className="w-full h-auto rounded-lg" style={{ objectFit: 'contain' }} />
        </a>
        {ads.length > 1 && (
          <div className="flex justify-center gap-1 mt-1.5">
            {ads.map((_, i) => <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === currentIndex ? 'bg-red-500' : 'bg-gray-300'}`} />)}
          </div>
        )}
      </div>
    );
  }

  // Direct banner WITHOUT image — show promotional fallback (NOT dark box)
  return (
    <div ref={containerRef} className={className}>
      {showLabel && <AdLabel />}
      <PromotionalFallback placement={placement} />
    </div>
  );
}

function AdLabel() {
  return <div className="text-center mb-1"><span className="text-[7px] font-bold text-gray-400 uppercase tracking-[0.2em]">Advertisement</span></div>;
}

/* ═══════════════════════════════════════
   PROMOTIONAL FALLBACK BANNERS
   Shows when no banner_url image exists.
   Professional colorful designs — NO dark boxes.
   ═══════════════════════════════════════ */

function PromotionalFallback({ placement }: { placement: string }) {
  if (placement.includes('sidebar')) return <SidebarPromo />;
  if (placement.includes('header') || placement.includes('homepage-header')) return <HeaderPromo />;
  if (placement.includes('footer')) return <FooterPromo />;
  // Alternate between Libriofy and SwiftGrowth for inline
  const useLibriofy = Date.now() % 2 === 0;
  return useLibriofy ? <LibriofyPromo /> : <InlinePromo />;
}

/* Header: SwiftGrowthDigital (Orange) — 970x110 */
function HeaderPromo() {
  return (
    <a href="https://swiftgrowthdigital.com" target="_blank" rel="noopener noreferrer"
      className="block rounded-2xl overflow-hidden hover:shadow-xl hover:scale-[1.005] transition-all duration-300">
      <div className="bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 px-6 py-5 sm:py-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-white rounded-xl p-2.5 shadow-lg">
            <Sparkles className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <div className="text-white text-[11px] font-bold tracking-wide uppercase">SwiftGrowthDigital</div>
            <div className="text-white text-base sm:text-lg font-bold mt-0.5">Grow Your Business Faster With Digital</div>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-3">
          <span className="text-white/80 text-[10px]">🎯 SEO • 📱 Social • 💰 Ads</span>
          <a href="tel:+919229721835" className="bg-white text-orange-600 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-orange-50 shadow-md">
            <Phone className="h-3.5 w-3.5" /> 9229721835
          </a>
        </div>
      </div>
    </a>
  );
}

/* Inline: SwiftGrowthDigital alternate — 970x110 */
function InlinePromo() {
  return (
    <a href="https://swiftgrowthdigital.com" target="_blank" rel="noopener noreferrer"
      className="block rounded-2xl overflow-hidden hover:shadow-xl hover:scale-[1.005] transition-all duration-300">
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 px-6 py-5 sm:py-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-white rounded-xl p-2.5 shadow-lg">
            <Globe className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <div className="text-white text-base sm:text-lg font-bold">Want to grow your business? <span className="text-yellow-300">Advertise with us!</span></div>
            <div className="text-indigo-200 text-[11px] mt-0.5">Premium ad slots • High CTR • Targeted Bihar audience</div>
          </div>
        </div>
        <span className="hidden sm:flex bg-white text-indigo-700 px-4 py-2 rounded-lg text-xs font-bold items-center gap-1.5 hover:bg-indigo-50 shadow-md">
          Learn More <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </a>
  );
}

/* Inline: Libriofy (Green) — 970x110 */
function LibriofyPromo() {
  return (
    <a href="#" className="block rounded-2xl overflow-hidden hover:shadow-xl hover:scale-[1.005] transition-all duration-300">
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 px-6 py-5 sm:py-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-white rounded-xl p-2.5 shadow-lg">
            <BookOpen className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <div className="text-white text-[11px] font-bold tracking-wider uppercase">Libriofy</div>
            <div className="text-white text-base sm:text-lg font-bold mt-0.5">Smart Library Management — Made Simple & Powerful</div>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-3">
          <span className="text-emerald-100 text-[10px]">Automate • Digitize • Grow</span>
          <span className="bg-white text-emerald-700 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md">
            Book Free Demo <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </a>
  );
}

/* Sidebar: Advertise Here (White/Yellow) */
function SidebarPromo() {
  return (
    <a
      href="mailto:hello@swiftgrowthdigital.com"
      className="block rounded-xl overflow-hidden border border-dashed border-red-200 hover:border-red-400 hover:shadow-md transition-all duration-300 group"
      title="Advertise here"
    >
      <div className="bg-gradient-to-br from-red-50 via-white to-orange-50 p-5 text-center min-h-[200px] flex flex-col items-center justify-center gap-3">
        {/* Animated pulse icon */}
        <div className="relative">
          <div className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center mx-auto shadow-md group-hover:scale-110 transition-transform duration-300">
            <span className="text-white text-xl font-black">AD</span>
          </div>
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-white animate-pulse" />
        </div>

        <div>
          <div className="text-red-600 text-xs font-bold uppercase tracking-wider mb-0.5">यहाँ विज्ञापन दें</div>
          <div className="text-gray-800 text-sm font-bold">Advertise Here</div>
          <div className="text-gray-500 text-[11px] mt-1">15,000+ दैनिक पाठकों तक पहुँचें</div>
        </div>

        <div className="flex items-center gap-3 text-[10px] text-gray-400">
          <span className="bg-gray-100 px-2 py-0.5 rounded">300×250</span>
          <span>•</span>
          <span className="bg-gray-100 px-2 py-0.5 rounded">300×600</span>
        </div>

        <div className="mt-1 bg-red-600 text-white text-[11px] font-bold px-5 py-2 rounded-full group-hover:bg-red-700 transition-colors shadow-sm">
          📞 संपर्क करें
        </div>

        <div className="w-full grid grid-cols-3 gap-1 mt-1 pt-3 border-t border-red-100">
          <div className="text-center">
            <div className="text-xs font-bold text-gray-800">15K+</div>
            <div className="text-[9px] text-gray-400">Daily</div>
          </div>
          <div className="text-center border-x border-red-100">
            <div className="text-xs font-bold text-gray-800">5L+</div>
            <div className="text-[9px] text-gray-400">Monthly</div>
          </div>
          <div className="text-center">
            <div className="text-xs font-bold text-gray-800">Bihar</div>
            <div className="text-[9px] text-gray-400">Focus</div>
          </div>
        </div>
      </div>
    </a>
  );
}

/* Footer: Advertise CTA — 970x110 */
function FooterPromo() {
  return (
    <a href="https://swiftgrowthdigital.com" target="_blank" rel="noopener noreferrer"
      className="block rounded-2xl overflow-hidden hover:shadow-xl hover:scale-[1.005] transition-all duration-300">
      <div className="bg-gradient-to-r from-gray-800 via-gray-900 to-gray-800 px-6 py-5 sm:py-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Sparkles className="h-6 w-6 text-yellow-400" />
          <div>
            <div className="text-white text-base sm:text-lg font-bold">SwiftGrowthDigital</div>
            <div className="text-gray-400 text-[11px] mt-0.5">Grow Fast • Grow Smart</div>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-3">
          <span className="text-gray-400 text-[10px]">📱 Social • 🎯 SEO • 💰 Ads • ✉️ Email</span>
          <a href="tel:+919229721835" className="bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md hover:bg-red-700">
            <Phone className="h-3.5 w-3.5" /> Get Free Consultation
          </a>
        </div>
      </div>
    </a>
  );
}
