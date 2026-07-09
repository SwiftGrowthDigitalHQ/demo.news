import { type PublicArticle } from '../../lib/cms';
import { AppLink } from '../../lib/navigation';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { getArticleThumbnail } from '../../lib/articleImage';
import { Clock, Eye, User, Flame } from 'lucide-react';

function relTime(d: string | null): string {
  if (!d) return 'Just now';
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function fmtViews(n: number): string { return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n); }

/**
 * Featured Stories Hero — 60/40 split.
 * Left: One large hero story with overlay text.
 * Right: 4 numbered side stories.
 */
export function HeroSection({ articles }: { articles: PublicArticle[] }) {
  if (!articles.length) return null;
  const [main, ...sides] = articles;
  const sideStories = sides.slice(0, 4);

  return (
    <section className="grid grid-cols-1 lg:grid-cols-[60%_40%] gap-3 min-h-[380px] lg:min-h-[460px]">
      {/* Main Hero */}
      <AppLink to={`/article/${main.slug}`} className="group relative rounded-xl overflow-hidden block h-full">
        <ImageWithFallback src={getArticleThumbnail(main.featured_image, main.video_url)} alt={main.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-2 z-10">
          {main.breaking && <span className="bg-red-600 text-white text-[9px] font-bold uppercase px-2.5 py-1 rounded flex items-center gap-1"><Flame className="h-3 w-3" />Breaking</span>}
          <span className="bg-white/90 text-gray-900 text-[9px] font-bold uppercase px-2.5 py-1 rounded">{main.category_name}</span>
        </div>
        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-5 lg:p-6 z-10">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-white leading-tight line-clamp-3 group-hover:underline decoration-2 underline-offset-4">{main.title}</h2>
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-white/60 mt-3">
            <span className="flex items-center gap-1"><User className="h-3 w-3" />{main.author_name}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{relTime(main.publish_at)}</span>
            <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{fmtViews(main.views_count)}</span>
          </div>
        </div>
      </AppLink>

      {/* Side Stories — Numbered */}
      <div className="flex flex-col gap-2.5">
        {sideStories.map((a, i) => (
          <AppLink key={a.id} to={`/article/${a.slug}`} className="group flex gap-3 items-start bg-white rounded-lg border border-gray-100 p-2.5 hover:shadow-md hover:border-red-100 transition-all duration-200 flex-1">
            {/* Number badge */}
            <span className="shrink-0 w-7 h-7 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="text-[13px] font-semibold text-gray-900 line-clamp-2 group-hover:text-red-600 transition-colors leading-snug">{a.title}</h3>
              <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-1.5">
                <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{relTime(a.publish_at)}</span>
                <span className="flex items-center gap-0.5"><Eye className="h-2.5 w-2.5" />{fmtViews(a.views_count)} views</span>
              </div>
            </div>
            {/* Thumbnail */}
            <div className="w-20 h-14 shrink-0 rounded overflow-hidden">
              <ImageWithFallback src={getArticleThumbnail(a.featured_image, a.video_url)} alt={a.title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
            </div>
          </AppLink>
        ))}
      </div>
    </section>
  );
}
