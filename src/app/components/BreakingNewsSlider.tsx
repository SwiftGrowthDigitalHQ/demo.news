import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Flame, Clock3, TrendingUp } from 'lucide-react';
import { AppLink } from '../lib/navigation';
import { useCms } from '../lib/cms';
import { ImageWithFallback } from './figma/ImageWithFallback';

function formatDate(value: string | null | undefined) {
  if (!value) {
    return 'Recent';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Recent';
  }

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function stripArticlePath(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return value.replace(/^\/article\//, '').trim() || null;
}

export function BreakingNewsSlider() {
  const { breakingNews, articles, siteSettings } = useCms();
  const [activeIndex, setActiveIndex] = useState(0);

  const featuredSlides = useMemo(() => {
    const mapped = breakingNews
      .map(item => {
        const slug = stripArticlePath(item.link_url);
        const article = slug ? articles.find(entry => entry.slug === slug) : null;

        if (!article) {
          return null;
        }

        return {
          id: item.id,
          headline: article.title,
          summary: article.excerpt,
          category: article.category_name,
          reporter: article.author_name,
          date: article.publish_at,
          image: article.featured_image || '',
          href: `/article/${article.slug}`,
        };
      })
      .filter(Boolean);

    if (mapped.length > 0) {
      return mapped as Array<{
        id: string;
        headline: string;
        summary: string;
        category: string;
        reporter: string;
        date: string | null;
        image: string;
        href: string;
      }>;
    }

    return articles.slice(0, 5).map(article => ({
      id: article.id,
      headline: article.title,
      summary: article.excerpt,
      category: article.category_name,
      reporter: article.author_name,
      date: article.publish_at,
      image: article.featured_image || '',
      href: `/article/${article.slug}`,
    }));
  }, [articles, breakingNews]);

  const breakingHighlights = useMemo(
    () => breakingNews.slice(0, 6).map(item => {
      const slug = stripArticlePath(item.link_url);
      const article = slug ? articles.find(entry => entry.slug === slug) : null;
      return {
        id: item.id,
        title: item.headline,
        time: article?.publish_at ?? null,
        href: item.link_url || (article ? `/article/${article.slug}` : `/search?q=${encodeURIComponent(item.headline)}`),
      };
    }),
    [articles, breakingNews],
  );

  const trendingStories = useMemo(
    () => articles
      .slice()
      .sort((a, b) => Number(b.views_count ?? 0) - Number(a.views_count ?? 0))
      .filter(article => article.trending || article.featured || Number(article.views_count ?? 0) > 0)
      .slice(0, 5)
      .map(article => ({
        id: article.id,
        title: article.title,
        date: article.publish_at,
        image: article.featured_image || '',
        href: `/article/${article.slug}`,
      })),
    [articles],
  );

  useEffect(() => {
    if (featuredSlides.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex(current => (current + 1) % featuredSlides.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [featuredSlides.length]);

  if (featuredSlides.length === 0) {
    return null;
  }

  const activeSlide = featuredSlides[activeIndex];

  const goPrevious = () => {
    setActiveIndex(current => (current - 1 + featuredSlides.length) % featuredSlides.length);
  };

  const goNext = () => {
    setActiveIndex(current => (current + 1) % featuredSlides.length);
  };

  return (
    <section className="w-full rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="grid gap-0 lg:grid-cols-[1.15fr_0.75fr_0.8fr]">
        <div className="relative overflow-hidden bg-slate-900 text-white lg:col-span-1">
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent z-10" />
          <div className="absolute inset-0 transition-opacity duration-500 ease-out">
            <ImageWithFallback
              key={activeSlide.id}
              src={activeSlide.image}
              alt={activeSlide.headline}
              className="h-full w-full object-cover min-h-[320px] lg:min-h-[520px]"
            />
          </div>

          <div className="relative z-20 flex min-h-[320px] lg:min-h-[520px] flex-col justify-between p-5 lg:p-7">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                <Flame className="h-3.5 w-3.5" />
                Breaking Live
              </span>
              <div className="hidden sm:flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs text-white/90 backdrop-blur">
                <span>{activeIndex + 1}</span>
                <span>/</span>
                <span>{featuredSlides.length}</span>
              </div>
            </div>

            <div className="max-w-3xl space-y-4">
              <div className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/90 backdrop-blur">
                {activeSlide.category}
              </div>
              <AppLink to={activeSlide.href} className="block">
                <h2 className="text-3xl leading-tight font-semibold md:text-4xl line-clamp-3">
                  {activeSlide.headline}
                </h2>
              </AppLink>
              <p className="text-sm text-white/85 md:text-base line-clamp-3 max-w-2xl">
                {activeSlide.summary}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-sm text-white/80">
                <span className="rounded-full bg-white/10 px-3 py-1 backdrop-blur">
                  {activeSlide.reporter}
                </span>
                <span className="flex items-center gap-1">
                  <Clock3 className="h-4 w-4" />
                  {formatDate(activeSlide.date)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={goPrevious}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20"
                  aria-label="Previous breaking story"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20"
                  aria-label="Next breaking story"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-black/30 px-3 py-2 text-xs text-white/85 backdrop-blur">
                <TrendingUp className="h-4 w-4 text-red-400" />
                Auto rotates every 5 seconds
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 bg-white p-5 lg:border-t-0 lg:border-l">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Breaking Highlights</h3>
            <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
              {breakingHighlights.length} stories
            </span>
          </div>
          <div className="space-y-3">
            {breakingHighlights.map(item => (
              <AppLink
                key={item.id}
                to={item.href}
                className="block rounded-xl border border-gray-200 bg-slate-50 p-3 transition-colors hover:border-red-600 hover:bg-red-50/60"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-6 flex-shrink-0 items-center rounded-full bg-red-600 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
                    Breaking
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium leading-5 text-gray-900 line-clamp-2">
                      {item.title}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      {formatDate(item.time)}
                    </div>
                  </div>
                </div>
              </AppLink>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-200 bg-white p-5 lg:border-t-0 lg:border-l">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Trending News</h3>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-gray-600">
              Today
            </span>
          </div>
          <div className="space-y-3">
            {trendingStories.map(item => (
              <AppLink
                key={item.id}
                to={item.href}
                className="flex items-center gap-3 rounded-xl border border-gray-200 p-2 transition-colors hover:border-red-600 hover:bg-slate-50"
              >
                <div className="h-16 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  <ImageWithFallback
                    src={item.image}
                    alt={item.title}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium leading-5 text-gray-900 line-clamp-2">
                    {item.title}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    {formatDate(item.date)}
                  </div>
                </div>
              </AppLink>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 border-t border-gray-200 bg-slate-50 px-4 py-3">
        {featuredSlides.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            onClick={() => setActiveIndex(index)}
            className={`h-2.5 rounded-full transition-all ${index === activeIndex ? 'w-8 bg-red-600' : 'w-2.5 bg-gray-300'}`}
            aria-label={`Go to breaking story ${index + 1}`}
            aria-pressed={index === activeIndex}
          />
        ))}
      </div>

      <div className="px-5 pb-4 text-xs text-gray-500">
        {siteSettings?.site_name ? `${siteSettings.site_name} live breaking coverage` : 'Live breaking coverage'}
      </div>
    </section>
  );
}
