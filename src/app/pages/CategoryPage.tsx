import { useEffect, useState, type FormEvent } from 'react';
import { Header } from '../components/Header';
import { Navigation } from '../components/Navigation';
import { BreakingNewsTicker } from '../components/BreakingNewsTicker';
import { Footer } from '../components/Footer';
import { SmartAd } from '../components/SmartAd';
import { AppLink } from '../lib/navigation';
import { useCms, type PublicArticle } from '../lib/cms';
import { useAppNavigation } from '../lib/navigation';
import { trackAnalyticsEvent, createNewsletterSubscription } from '../lib/admin';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { getArticleThumbnail } from '../lib/articleImage';
import {
  Clock, Eye, TrendingUp, BarChart3, CloudSun, Play,
  Facebook, Twitter, Instagram, Youtube, ChevronLeft, ChevronRight, Tag,
} from 'lucide-react';

function thumb(a: PublicArticle) {
  return getArticleThumbnail(a.featured_image, a.video_url);
}
function rel(d: string | null) {
  if (!d) return 'Just now';
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
function fv(n: number) { return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n); }

/* ─── SIDEBAR WIDGETS ─── */
function WeatherWidget() {
  return (
    <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-blue-50 to-white p-4">
      <div className="flex items-center gap-1 text-xs text-gray-500 mb-2"><CloudSun className="h-3.5 w-3.5" /> WEATHER</div>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-3xl font-bold text-gray-900">32°C</div>
          <div className="text-xs text-gray-500">Patna, Bihar, India</div>
          <div className="text-[11px] text-gray-400 mt-0.5">Partly Cloudy • Humidity: 62%</div>
        </div>
        <div className="text-5xl">⛅</div>
      </div>
    </div>
  );
}

function MarketWidget() {
  const data = [
    { name: 'SENSEX', value: '78,214.36', change: '+1.24%', up: true },
    { name: 'NIFTY', value: '23,359.60', change: '+0.59%', up: true },
    { name: 'GOLD', value: '₹72,410', change: '-0.06%', up: false },
    { name: 'SILVER', value: '₹89,150', change: '-0.06%', up: false },
  ];
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
          <TrendingUp className="h-4 w-4 text-green-600" /> MARKET WATCH
        </h3>
        <AppLink to="/search?q=market" className="text-[10px] text-red-600 font-semibold hover:underline">View All</AppLink>
      </div>
      <div className="space-y-2">
        {data.map(m => (
          <div key={m.name} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
            <span className="text-xs font-medium text-gray-700">{m.name}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-900">{m.value}</span>
              <span className={`text-[10px] font-bold ${m.up ? 'text-green-600' : 'text-red-600'}`}>{m.change}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[9px] text-gray-400 mt-2">Updated {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
    </div>
  );
}

function LiveTVWidget() {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="bg-red-600 text-white text-[9px] font-bold uppercase px-2 py-0.5 rounded animate-pulse">LIVE</span>
        <h3 className="text-sm font-bold text-gray-900">LIVE TV</h3>
      </div>
      <p className="text-xs text-gray-600 mb-3">Watch live news and breaking updates 24×7</p>
      <AppLink to="/search?q=live"
        className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2.5 rounded-lg transition-colors">
        <Play className="h-3.5 w-3.5" fill="white" /> Watch Now
      </AppLink>
    </div>
  );
}

function MostReadWidget({ articles }: { articles: PublicArticle[] }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
          <BarChart3 className="h-4 w-4 text-red-600" /> MOST READ
        </h3>
        <AppLink to="/search?q=popular" className="text-[10px] text-red-600 font-semibold hover:underline">View All</AppLink>
      </div>
      <div className="space-y-3">
        {articles.slice(0, 5).map((a, i) => (
          <AppLink key={a.id} to={`/article/${a.slug}`} className="flex gap-2 group">
            <span className={`shrink-0 w-6 h-6 rounded text-[10px] font-bold flex items-center justify-center ${i < 3 ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{i + 1}</span>
            <p className="text-[12px] font-medium text-gray-800 line-clamp-2 group-hover:text-red-600 transition-colors leading-tight">{a.title}</p>
          </AppLink>
        ))}
      </div>
    </div>
  );
}

function NewsletterWidget() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const t = email.trim();
    if (!t || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) { setMsg('Valid email required'); return; }
    try { await createNewsletterSubscription({ email: t, source: 'category' }); setMsg('Subscribed! ✓'); setEmail(''); } catch { setMsg('Failed, try again'); }
  };
  return (
    <div className="rounded-xl bg-white border border-gray-200 p-4">
      <h3 className="text-sm font-bold text-gray-900 mb-1">📰 NEWSLETTER</h3>
      <p className="text-[11px] text-gray-500 mb-3">Get breaking news in your inbox.</p>
      <form onSubmit={submit} className="space-y-2">
        <input type="email" placeholder="Enter your email" value={email} onChange={e => setEmail(e.target.value)}
          className="w-full h-9 rounded-lg border border-gray-200 px-3 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-red-400" />
        <button type="submit" className="w-full h-9 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors">Subscribe</button>
      </form>
      {msg && <p className="text-[11px] text-green-600 mt-1">{msg}</p>}
    </div>
  );
}

function TrendingTagsWidget() {
  const tags = ['#Bihar', '#Politics', '#Crime', '#Education', '#Health', '#Sports', '#Business', '#National'];
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-1.5"><Tag className="h-4 w-4 text-red-600" /> TRENDING TAGS</h3>
      <div className="flex flex-wrap gap-2">
        {tags.map(t => (
          <AppLink key={t} to={`/search?q=${t.replace('#', '')}`}
            className="text-[11px] font-medium text-gray-600 bg-gray-100 hover:bg-red-600 hover:text-white px-2 py-1 rounded-full transition-colors">{t}</AppLink>
        ))}
      </div>
    </div>
  );
}

function SocialWidget() {
  const socials = [
    { name: 'Facebook', icon: Facebook, count: '245K', color: 'bg-blue-600' },
    { name: 'Twitter', icon: Twitter, count: '189K', color: 'bg-sky-500' },
    { name: 'Instagram', icon: Instagram, count: '312K', color: 'bg-pink-600' },
    { name: 'YouTube', icon: Youtube, count: '156K', color: 'bg-red-600' },
  ];
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-bold text-gray-900 mb-3">Follow Us</h3>
      <div className="grid grid-cols-2 gap-2">
        {socials.map(s => (
          <a key={s.name} href="#" className={`${s.color} rounded-lg p-2.5 text-white text-center hover:opacity-90 transition-opacity`}>
            <s.icon className="h-4 w-4 mx-auto mb-0.5" />
            <div className="text-xs font-bold">{s.count}</div>
            <div className="text-[9px] opacity-80">Followers</div>
          </a>
        ))}
      </div>
    </div>
  );
}

/* ─── MAIN CATEGORY PAGE ─── */
export function CategoryPage({ slug }: { slug: string }) {
  const { search } = useAppNavigation();
  const { categories, getCategoryBySlug, articles } = useCms();
  const category = getCategoryBySlug(slug) ?? categories[0] ?? null;
  const activeSlug = category?.slug ?? slug;

  const catArticles = articles.filter(a => a.category_slug === activeSlug);
  const featuredArticle = catArticles[0] ?? null;
  const topHeadlines = catArticles.slice(1, 6);
  const latestNews = catArticles.slice(0, 6);
  const trendingArticles = articles.filter(a => a.trending).slice(0, 5);
  const videoArticles = catArticles.filter(a => a.media_type === 'video' || a.video_url).slice(0, 4);
  const photoArticles = catArticles.filter(a => a.featured_image).slice(0, 4);
  const mostRead = [...articles].sort((a, b) => b.views_count - a.views_count).slice(0, 5);

  const params = new URLSearchParams(search);
  const pageSize = 8;
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1);
  const totalPages = Math.max(1, Math.ceil(catArticles.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedItems = catArticles.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const pageUrl = (p: number) => p > 1 ? `/category/${activeSlug}?page=${p}` : `/category/${activeSlug}`;

  useEffect(() => {
    if (!category) return;
    void trackAnalyticsEvent({ event_type: 'page_view', page_path: `/category/${category.slug}`, category_id: category.id, metadata: { page: 'category', slug: category.slug } }).catch(() => {});
  }, [category]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Navigation />
      <BreakingNewsTicker />

      {/* Top Ad Banner */}
      <div className="max-w-[1440px] mx-auto px-4 pt-4">
        <SmartAd placement="homepage_top_banner" />
      </div>

      {/* Category Hero */}
      <div className="max-w-[1440px] mx-auto px-4 py-4">
        <div className="relative rounded-2xl overflow-hidden bg-gray-900 h-44 flex items-center">
          {featuredArticle?.featured_image && (
            <img src={featuredArticle.featured_image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
          )}
          <div className="relative z-10 px-8">
            <div className="inline-flex items-center gap-2 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full mb-3 uppercase tracking-wide">
              {category?.name ?? slug}
            </div>
            <h1 className="text-3xl font-bold text-white mb-1">{category?.name?.toUpperCase() ?? slug.toUpperCase()}</h1>
            <p className="text-gray-300 text-sm">{category?.description ?? 'Latest news, updates and stories'}</p>
            <div className="flex items-center gap-4 mt-2 text-gray-400 text-xs">
              <span className="flex items-center gap-1"><BarChart3 className="h-3 w-3" />{catArticles.length.toLocaleString()} Articles</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Updated 5 min ago</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content + Sidebar */}
      <main className="max-w-[1440px] mx-auto px-4 pb-8">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6">

          {/* LEFT MAIN COLUMN */}
          <div className="space-y-6">

            {/* Featured + Top Headlines */}
            {(featuredArticle || topHeadlines.length > 0) && (
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-4">
                {/* Featured Story */}
                {featuredArticle && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-1 h-5 bg-red-600 rounded-full" />
                      <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Featured Story</h2>
                    </div>
                    <AppLink to={`/article/${featuredArticle.slug}`} className="group block rounded-xl overflow-hidden bg-white border border-gray-100 hover:shadow-md transition-shadow">
                      <div className="relative aspect-[16/9] overflow-hidden">
                        <ImageWithFallback src={thumb(featuredArticle)} alt={featuredArticle.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <span className="absolute top-2 left-2 bg-red-600 text-white text-[9px] font-bold uppercase px-2 py-0.5 rounded">{featuredArticle.category_name}</span>
                      </div>
                      <div className="p-4">
                        <h3 className="text-base font-bold text-gray-900 line-clamp-2 group-hover:text-red-600 transition-colors mb-2">{featuredArticle.title}</h3>
                        <p className="text-xs text-gray-500 line-clamp-2 mb-2">{featuredArticle.excerpt}</p>
                        <div className="flex items-center gap-3 text-[10px] text-gray-400">
                          <span className="text-red-600 font-medium">{featuredArticle.author_name}</span>
                          <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{rel(featuredArticle.publish_at)}</span>
                          <span className="flex items-center gap-0.5"><Eye className="h-2.5 w-2.5" />{fv(featuredArticle.views_count)}</span>
                        </div>
                      </div>
                    </AppLink>
                  </div>
                )}

                {/* Top Headlines */}
                {topHeadlines.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-1 h-5 bg-red-600 rounded-full" />
                        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Top Headlines</h2>
                      </div>
                      <AppLink to={`/category/${activeSlug}`} className="text-[10px] text-red-600 font-semibold hover:underline">View All</AppLink>
                    </div>
                    <div className="space-y-3 bg-white rounded-xl border border-gray-100 p-3">
                      {topHeadlines.map(a => (
                        <AppLink key={a.id} to={`/article/${a.slug}`} className="flex gap-3 group border-b border-gray-50 last:border-0 pb-3 last:pb-0">
                          <div className="w-20 h-14 rounded-lg overflow-hidden shrink-0">
                            <ImageWithFallback src={thumb(a)} alt={a.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-gray-900 line-clamp-2 group-hover:text-red-600 transition-colors leading-tight">{a.title}</p>
                            <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-1">
                              <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{rel(a.publish_at)}</span>
                              <span className="flex items-center gap-0.5"><Eye className="h-2.5 w-2.5" />{fv(a.views_count)}</span>
                            </div>
                          </div>
                        </AppLink>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Latest News Grid */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2"><span className="w-1 h-5 bg-red-600 rounded-full" /><h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Latest {category?.name ?? ''} News</h2></div>
                <AppLink to={`/category/${activeSlug}`} className="text-[10px] text-red-600 font-semibold hover:underline">View All</AppLink>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {latestNews.map(a => (
                  <AppLink key={a.id} to={`/article/${a.slug}`} className="group bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all">
                    <div className="relative aspect-[16/10] overflow-hidden">
                      <ImageWithFallback src={thumb(a)} alt={a.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <span className="absolute top-2 left-2 bg-black/60 text-white text-[8px] uppercase font-bold px-2 py-0.5 rounded">{a.category_name}</span>
                    </div>
                    <div className="p-3">
                      <h3 className="text-[12px] font-bold text-gray-900 line-clamp-2 group-hover:text-red-600 transition-colors leading-snug mb-1.5">{a.title}</h3>
                      <div className="flex items-center gap-2 text-[10px] text-gray-400">
                        <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{rel(a.publish_at)}</span>
                        <span className="flex items-center gap-0.5"><Eye className="h-2.5 w-2.5" />{fv(a.views_count)}</span>
                      </div>
                    </div>
                  </AppLink>
                ))}
              </div>
            </div>

            {/* Trending in Category */}
            {trendingArticles.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2"><span className="w-1 h-5 bg-orange-500 rounded-full" /><h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Trending in {category?.name ?? 'Bihar'}</h2></div>
                  <AppLink to="/search?q=trending" className="text-[10px] text-red-600 font-semibold hover:underline">View All</AppLink>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {trendingArticles.map(a => (
                    <AppLink key={a.id} to={`/article/${a.slug}`} className="group bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-all">
                      <div className="relative aspect-[4/3] overflow-hidden">
                        <ImageWithFallback src={thumb(a)} alt={a.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      </div>
                      <div className="p-2">
                        <p className="text-[11px] font-bold text-gray-900 line-clamp-2 group-hover:text-red-600 transition-colors leading-tight mb-1">{a.title}</p>
                        <span className="text-[9px] text-gray-400 flex items-center gap-0.5"><Eye className="h-2 w-2" />{fv(a.views_count)} Views</span>
                      </div>
                    </AppLink>
                  ))}
                </div>
              </div>
            )}

            {/* Video + Photo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {videoArticles.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2"><span className="w-1 h-5 bg-red-600 rounded-full" /><h2 className="text-sm font-bold text-gray-900 uppercase">Video News</h2></div>
                    <AppLink to="/search?q=video" className="text-[10px] text-red-600 font-semibold hover:underline">View All</AppLink>
                  </div>
                  <div className="space-y-3">
                    {videoArticles.slice(0, 2).map(a => (
                      <AppLink key={a.id} to={`/article/${a.slug}`} className="flex gap-3 group bg-white rounded-lg border border-gray-100 p-2 hover:shadow-sm transition-shadow">
                        <div className="relative w-24 h-16 rounded-lg overflow-hidden shrink-0">
                          <ImageWithFallback src={thumb(a)} alt={a.title} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <div className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center"><Play className="h-3.5 w-3.5 text-red-600 ml-0.5" fill="currentColor" /></div>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-semibold text-gray-900 line-clamp-2 group-hover:text-red-600 transition-colors leading-tight">{a.title}</p>
                          <span className="text-[10px] text-gray-400 mt-1 flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{rel(a.publish_at)}</span>
                        </div>
                      </AppLink>
                    ))}
                  </div>
                </div>
              )}
              {photoArticles.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2"><span className="w-1 h-5 bg-purple-600 rounded-full" /><h2 className="text-sm font-bold text-gray-900 uppercase">Photo Gallery</h2></div>
                    <AppLink to="/search?q=photos" className="text-[10px] text-red-600 font-semibold hover:underline">View All</AppLink>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {photoArticles.slice(0, 4).map(a => (
                      <AppLink key={a.id} to={`/article/${a.slug}`} className="group relative rounded-lg overflow-hidden aspect-[4/3]">
                        <ImageWithFallback src={thumb(a)} alt={a.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <p className="absolute bottom-1.5 left-2 right-2 text-[10px] font-semibold text-white line-clamp-2 leading-tight">{a.title}</p>
                      </AppLink>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* All Articles Paged Grid */}
            {pagedItems.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3"><span className="w-1 h-5 bg-red-600 rounded-full" /><h2 className="text-sm font-bold text-gray-900 uppercase">All {category?.name ?? ''} Stories</h2></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {pagedItems.map(a => (
                    <AppLink key={a.id} to={`/article/${a.slug}`} className="group bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-all">
                      <div className="relative aspect-[16/9] overflow-hidden">
                        <ImageWithFallback src={thumb(a)} alt={a.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <span className="absolute top-2 left-2 bg-red-600 text-white text-[8px] uppercase font-bold px-2 py-0.5 rounded">{a.category_name}</span>
                      </div>
                      <div className="p-3">
                        <h3 className="text-[13px] font-bold text-gray-900 line-clamp-2 group-hover:text-red-600 transition-colors leading-snug mb-1.5">{a.title}</h3>
                        <p className="text-[11px] text-gray-500 line-clamp-1 mb-2">{a.excerpt}</p>
                        <div className="flex items-center gap-2 text-[10px] text-gray-400">
                          <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{rel(a.publish_at)}</span>
                          <span className="flex items-center gap-0.5"><Eye className="h-2.5 w-2.5" />{fv(a.views_count)}</span>
                        </div>
                      </div>
                    </AppLink>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-6">
                    <AppLink to={pageUrl(Math.max(1, currentPage - 1))} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${currentPage === 1 ? 'border-gray-200 text-gray-400 pointer-events-none' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}>
                      <ChevronLeft className="h-3.5 w-3.5" /> Previous
                    </AppLink>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                        <AppLink key={p} to={pageUrl(p)} className={`w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center transition-colors ${p === currentPage ? 'bg-red-600 text-white' : 'border border-gray-200 text-gray-700 hover:bg-gray-100'}`}>{p}</AppLink>
                      ))}
                      {totalPages > 5 && <span className="text-gray-400 text-xs px-1">... {totalPages}</span>}
                    </div>
                    <AppLink to={pageUrl(Math.min(totalPages, currentPage + 1))} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${currentPage === totalPages ? 'border-gray-200 text-gray-400 pointer-events-none' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}>
                      Next <ChevronRight className="h-3.5 w-3.5" />
                    </AppLink>
                  </div>
                )}
              </div>
            )}

          </div>{/* END LEFT COLUMN */}

          {/* RIGHT SIDEBAR */}
          <aside className="hidden xl:block self-start">
            <div className="sticky top-[72px] space-y-4 pb-6">
              <SmartAd placement="sidebar_top" />
              <WeatherWidget />
              <MarketWidget />
              <LiveTVWidget />
              <MostReadWidget articles={mostRead} />
              <SmartAd placement="sidebar_middle" />
              <NewsletterWidget />
              <TrendingTagsWidget />
              <SocialWidget />
              <SmartAd placement="sidebar_bottom" />
            </div>
          </aside>

        </div>
      </main>

      <Footer />
    </div>
  );
}
