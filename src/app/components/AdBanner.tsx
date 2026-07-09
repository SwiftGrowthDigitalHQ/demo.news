import { Badge } from './ui/badge';
import { AppLink } from '../lib/navigation';

interface AdBannerProps {
  placement:
    | 'header'
    | 'below-navigation'
    | 'hero'
    | 'sidebar'
    | 'mid-content'
    | 'category'
    | 'footer'
    | 'sticky-mobile'
    | 'article-top'
    | 'article-inline'
    | 'related'
    | 'search-result'
    | 'direct-promo'
    | 'homepage-featured';
  type?: 'adsense' | 'direct';
  title?: string;
  subtitle?: string;
  advertiser?: string;
  image?: string;
  ctaLabel?: string;
  href?: string;
  compact?: boolean;
}

const placementLabels: Record<AdBannerProps['placement'], string> = {
  header: 'Header Banner Ad',
  'below-navigation': 'Below Navigation Ad',
  hero: 'Hero Section Ad',
  sidebar: 'Sidebar Ad',
  'mid-content': 'Mid Content Ad',
  category: 'Category Section Ad',
  footer: 'Footer Banner Ad',
  'sticky-mobile': 'Sticky Mobile Ad',
  'article-top': 'Top Article Ad',
  'article-inline': 'In-Article Ad',
  related: 'Related News Ad',
  'search-result': 'Search Result Ad',
  'direct-promo': 'Direct Promotion',
  'homepage-featured': 'Homepage Featured Promotion',
};

export function AdBanner({
  placement,
  type = 'adsense',
  title = 'Sponsored Placement',
  subtitle = 'Professional ad-ready placeholder',
  advertiser = 'Your Brand Here',
  image,
  ctaLabel = 'Learn More',
  href = '#',
  compact = false,
}: AdBannerProps) {
  const isDirect = type === 'direct';
  const isSidebar = placement === 'sidebar' || placement === 'related' || placement === 'search-result';
  const isInline = placement === 'article-inline' || placement === 'mid-content';
  const isSticky = placement === 'sticky-mobile';
  const isFullWidth = placement === 'header' || placement === 'below-navigation' || placement === 'hero' || placement === 'category' || placement === 'footer' || placement === 'article-top';
  const isCompactStrip = compact && isFullWidth;
  const sizeLabel = isFullWidth ? '728x90' : isSidebar ? '300x250' : '336x280';

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-gray-200 bg-white ${
        isSticky ? 'md:hidden fixed bottom-3 left-3 right-3 z-40 shadow-2xl' : isCompactStrip ? 'my-3' : 'my-6'
      }`}
    >
      <div
        className={`bg-gradient-to-r ${
          isDirect ? 'from-amber-50 via-white to-orange-50' : 'from-slate-50 via-white to-red-50'
        } ${isFullWidth ? (isCompactStrip ? 'px-3 py-2' : compact ? 'px-4 py-2' : 'px-4 py-3') : compact ? 'p-3' : 'p-4'}`}
      >
        <div className={`flex ${isSidebar ? 'flex-col' : isInline ? 'flex-col md:flex-row' : 'flex-col md:flex-row'} ${isCompactStrip ? 'gap-2 md:gap-3' : compact ? 'gap-3' : 'gap-4'}`}>
          <div
            className={`rounded-xl border border-dashed ${
              isDirect ? 'border-amber-300 bg-amber-50' : 'border-red-200 bg-red-50'
            } ${isCompactStrip ? 'p-2.5' : compact ? 'p-3' : 'p-4'} ${isSidebar ? 'w-full' : 'flex-1'}`}
          >
            <div className={`flex items-center justify-between gap-3 ${isCompactStrip ? 'mb-1.5' : compact ? 'mb-2' : 'mb-3'}`}>
              <Badge className={isDirect ? 'bg-amber-600' : 'bg-red-600'}>
                {isDirect ? 'Direct Promotion Demo' : 'Google Adsense Advertisement'}
              </Badge>
              <span className="text-xs font-medium text-gray-500">
                {placementLabels[placement]} · {sizeLabel}
              </span>
            </div>

            <div className={`grid gap-4 ${isSidebar ? 'md:grid-cols-1' : 'md:grid-cols-[1fr_auto]'}`}>
              <div>
                <div className={`${isCompactStrip ? 'text-xs' : 'text-sm'} font-semibold text-gray-900`}>{title}</div>
                <p className={`${isCompactStrip ? 'mt-0.5 text-xs' : 'mt-1 text-sm'} text-gray-600`}>{subtitle}</p>
                <div className={`${isCompactStrip ? 'mt-1.5' : compact ? 'mt-2' : 'mt-3'} flex flex-wrap items-center gap-2 text-xs text-gray-500`}>
                  <span className="rounded-full bg-gray-100 px-2 py-1">{advertiser}</span>
                  {!isCompactStrip ? <span className="rounded-full bg-gray-100 px-2 py-1">Responsive ad unit</span> : null}
                  {!isCompactStrip ? <span className="rounded-full bg-gray-100 px-2 py-1">Editorial-safe placeholder</span> : null}
                </div>
              </div>

              <div
                className={`rounded-xl border border-gray-200 bg-white ${
                  isSidebar ? 'min-w-full p-4' : isCompactStrip ? 'min-w-[160px] p-3' : compact ? 'min-w-[200px] p-3' : 'min-w-[220px] p-4'
                }`}
              >
                <div className="text-xs uppercase tracking-[0.2em] text-gray-400">Ad Preview</div>
                {isDirect ? (
                  <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white">
                    <div className="aspect-[16/9] bg-slate-100">
                      <img
                        src={image || 'https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=1200&q=80'}
                        alt={title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <div className="text-sm font-semibold text-gray-900">{advertiser}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.18em] text-gray-400">{sizeLabel}</div>
                      <div className="mt-2 text-sm text-gray-600">{subtitle}</div>
                      <div className="mt-4 flex items-center justify-between gap-3">
                        <span className="text-xs text-gray-500">{title}</span>
                        <span className="rounded-full bg-amber-600 px-3 py-1 text-xs font-semibold text-white">{ctaLabel}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 rounded-lg bg-gray-900 p-4 text-white">
                    <div className="text-sm font-semibold">Google Adsense Advertisement</div>
                    <div className="mt-1 text-xs text-gray-300">{title}</div>
                    <div className="mt-4 flex items-center justify-between text-xs text-gray-300">
                      <span>{sizeLabel}</span>
                      <span>AdSense</span>
                    </div>
                  </div>
                )}
                <div className={`${isCompactStrip ? 'mt-1.5' : compact ? 'mt-2' : 'mt-3'} flex gap-2 text-xs text-gray-500`}>
                  <span className="rounded-full bg-slate-100 px-2 py-1">CTR-ready</span>
                  <span className="rounded-full bg-slate-100 px-2 py-1">Analytics-ready</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-end justify-between gap-3 pb-1 md:pb-0">
            <div className="text-xs text-gray-500">
              {isDirect ? 'Sponsored placement placeholder' : 'Managed ad slot placeholder'}
            </div>
            <AppLink
              to={href}
              className="inline-flex items-center justify-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              {ctaLabel}
            </AppLink>
          </div>
        </div>
      </div>
    </div>
  );
}
