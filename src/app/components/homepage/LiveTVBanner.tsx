import { AppLink } from '../../lib/navigation';
import { Play, Radio } from 'lucide-react';

/**
 * Live TV Banner — Red gradient with live badge, headline, watch button.
 * Matches the screenshot: red bg, LIVE badge, headline text, watch button on right.
 */
export function LiveTVBanner() {
  return (
    <section className="rounded-xl overflow-hidden bg-gradient-to-r from-red-700 via-red-600 to-red-700 relative">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4">
        {/* Left */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Play className="h-5 w-5 text-white" fill="white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-white text-red-600 text-[8px] font-black uppercase px-2 py-0.5 rounded">● LIVE</span>
                <span className="text-white text-sm font-bold">Live TV</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-red-100 mt-0.5">
                <Radio className="h-3 w-3" />
                <span>1.2k watching now</span>
              </div>
            </div>
          </div>
          {/* Headline */}
          <div className="hidden md:block border-l border-white/20 pl-4 ml-2">
            <p className="text-sm text-white font-medium line-clamp-1">बिहार की हर बड़ी ख़बर सबसे पहले, सबसे तेज</p>
          </div>
        </div>
        {/* Watch Button */}
        <AppLink
          to="/search?q=live"
          className="flex items-center gap-2 bg-white text-red-600 px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-red-50 transition-colors shrink-0 shadow-lg"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-600 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600" />
          </span>
          Watch Live →
        </AppLink>
      </div>
    </section>
  );
}
