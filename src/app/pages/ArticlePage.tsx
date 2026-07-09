import { useEffect, useMemo } from 'react';
import { CalendarDays, Clock3, Eye, MapPin, User, Facebook, MessageCircle, Share2, Copy, Send } from 'lucide-react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { SmartAd } from '../components/SmartAd';
import { AppLink } from '../lib/navigation';
import { useCms, type PublicArticle } from '../lib/cms';
import { Badge } from '../components/ui/badge';
import { trackAnalyticsEvent } from '../lib/admin';
import { isYouTubeUrl, getYouTubeEmbedUrl, getArticleThumbnail } from '../lib/articleImage';

function relTime(d: string | null): string {
  if (!d) return 'Just now';
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hours ago`;
  return `${Math.floor(hrs / 24)} days ago`;
}

function fmtViews(n: number): string { return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n); }

export function ArticlePage({ slug }: { slug: string }) {
  const { getArticleBySlug, articles } = useCms();
  const article = getArticleBySlug(slug);

  const related = useMemo(
    () => articles.filter(item => item.slug !== article?.slug && item.category_slug === article?.category_slug).slice(0, 4),
    [article?.category_slug, article?.slug, articles],
  );

  const trending = useMemo(() => articles.filter(a => a.trending).slice(0, 5), [articles]);
  const mostRead = useMemo(() => [...articles].sort((a, b) => b.views_count - a.views_count).slice(0, 5), [articles]);

  useEffect(() => {
    if (!article) return;
    document.title = `${article.title} | Buxar News`;
    void trackAnalyticsEvent({ event_type: 'page_view', page_path: `/article/${article.slug}`, article_id: article.id, category_id: article.category_id, metadata: { page: 'article' } }).catch(() => {});
  }, [article]);

  if (!article) {
    return (
      <div className="bg-[#f8f9fa]">
        <Header />
        <main className="max-w-[1400px] mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Article not found</h1>
          <p className="text-gray-500 mt-2">The requested article doesn't exist or has been removed.</p>
          <AppLink to="/" className="inline-block mt-6 bg-red-600 text-white px-5 py-2 rounded-lg text-sm font-bold">Go Home</AppLink>
        </main>
        <Footer />
      </div>
    );
  }

  const shareUrl = `${window.location.origin}/article/${article.slug}`;
  const shareText = encodeURIComponent(article.title);

  return (
    <div className="bg-[#f8f9fa]">
      <Header />

      {/* Top Banner Ad */}
      <SmartAd placement="article_top" className="mx-auto max-w-[1400px] mt-2 mb-1" />

      <main className="max-w-[1400px] mx-auto px-4 py-4">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-gray-500 mb-4 flex-wrap">
          <AppLink to="/" className="hover:text-red-600">Home</AppLink>
          <span>›</span>
          <AppLink to={`/category/${article.category_slug}`} className="hover:text-red-600">{article.category_name}</AppLink>
          <span>›</span>
          <span className="text-gray-400 truncate max-w-[200px]">{article.title}</span>
        </nav>

        {/* ═══ MAIN GRID: Article + Sidebar ═══ */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">

          {/* ═══ LEFT: Article Content ═══ */}
          <article className="relative">
            {/* Floating Share Buttons (Desktop) */}
            <div className="hidden lg:flex fixed left-4 top-1/3 z-40 flex-col gap-2">
              <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider text-center mb-1">Share</span>
              <a href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center hover:scale-110 transition-transform shadow-md" title="Facebook"><Facebook className="h-4 w-4" /></a>
              <a href={`https://api.whatsapp.com/send?text=${shareText}%20${shareUrl}`} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-green-500 text-white flex items-center justify-center hover:scale-110 transition-transform shadow-md" title="WhatsApp"><MessageCircle className="h-4 w-4" /></a>
              <a href={`https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareText}`} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-gray-900 text-white flex items-center justify-center hover:scale-110 transition-transform shadow-md" title="X (Twitter)"><span className="text-xs font-bold">𝕏</span></a>
              <a href={`https://t.me/share/url?url=${shareUrl}&text=${shareText}`} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-sky-500 text-white flex items-center justify-center hover:scale-110 transition-transform shadow-md" title="Telegram"><Send className="h-4 w-4" /></a>
              <button type="button" onClick={() => navigator.clipboard.writeText(shareUrl)} className="w-9 h-9 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center hover:scale-110 transition-transform shadow-md" title="Copy Link"><Copy className="h-4 w-4" /></button>
            </div>

            {/* Category + Title */}
            <div className="bg-white rounded-xl border border-gray-100 p-5 sm:p-6 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Badge className="bg-red-600 text-white text-[10px] font-bold">{article.category_name}</Badge>
                {article.breaking && <Badge className="bg-orange-500 text-white text-[10px]">Breaking</Badge>}
                {article.trending && <Badge className="bg-purple-600 text-white text-[10px]">Trending</Badge>}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">{article.title}</h1>
              {article.excerpt && <p className="text-sm text-gray-600 mt-3 leading-relaxed">{article.excerpt}</p>}

              {/* Meta bar */}
              <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
                <span className="flex items-center gap-1"><User className="h-3.5 w-3.5 text-red-500" /><strong className="text-gray-700">{article.author_name}</strong></span>
                <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{article.publish_at ? new Date(article.publish_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + new Date(article.publish_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Draft'}</span>
                <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{fmtViews(article.views_count)} Views</span>
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{article.category_name}, Bihar</span>
              </div>
            </div>

            {/* Featured Image / Video */}
            <div className="rounded-xl overflow-hidden mb-4">
              {isYouTubeUrl(article.featured_image) ? (
                <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                  <iframe src={getYouTubeEmbedUrl(article.featured_image!)} title={article.title} className="absolute inset-0 w-full h-full rounded-xl" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen loading="lazy" />
                </div>
              ) : isYouTubeUrl(article.video_url) ? (
                <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                  <iframe src={getYouTubeEmbedUrl(article.video_url!)} title={article.title} className="absolute inset-0 w-full h-full rounded-xl" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen loading="lazy" />
                </div>
              ) : getArticleThumbnail(article.featured_image, article.video_url) ? (
                <ImageWithFallback src={getArticleThumbnail(article.featured_image, article.video_url)} alt={article.title} className="w-full h-auto rounded-xl" />
              ) : null}
            </div>

            {/* Article Body */}
            <div className="bg-white rounded-xl border border-gray-100 p-5 sm:p-6 mb-4">
              {article.content.length === 0 ? (
                <p className="text-gray-500 italic text-sm">Article content will appear here. Edit the article in Admin panel to add body text.</p>
              ) : (
                <div className="prose-article space-y-4">
                  {article.content.map((paragraph, index) => (
                    <p key={index} className="text-[15px] text-gray-700 leading-[1.8]">{paragraph}</p>
                  ))}
                </div>
              )}
            </div>

            {/* Inline Ad */}
            <SmartAd placement="article_middle" className="mb-4" />

            {/* Share This Story (horizontal) */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <Share2 className="h-4 w-4 text-red-500" /> Share This Story
                </h3>
                <div className="flex items-center gap-2">
                  <a href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-[10px] font-bold hover:bg-blue-700 flex items-center gap-1"><Facebook className="h-3 w-3" /> Facebook</a>
                  <a href={`https://api.whatsapp.com/send?text=${shareText}%20${shareUrl}`} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-lg bg-green-500 text-white text-[10px] font-bold hover:bg-green-600 flex items-center gap-1"><MessageCircle className="h-3 w-3" /> WhatsApp</a>
                  <a href={`https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareText}`} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-[10px] font-bold hover:bg-gray-800 flex items-center gap-1">𝕏 Twitter</a>
                  <a href={`https://t.me/share/url?url=${shareUrl}&text=${shareText}`} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-lg bg-sky-500 text-white text-[10px] font-bold hover:bg-sky-600 flex items-center gap-1"><Send className="h-3 w-3" /> Telegram</a>
                  <button type="button" onClick={() => navigator.clipboard.writeText(shareUrl)} className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-[10px] font-bold hover:bg-gray-200 flex items-center gap-1"><Copy className="h-3 w-3" /> Copy Link</button>
                </div>
              </div>
              {/* Tags */}
              {article.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-gray-100">
                  <span className="text-[10px] font-bold text-gray-500 mr-1">Tags:</span>
                  {article.tags.map(tag => (
                    <AppLink key={tag} to={`/search?q=${encodeURIComponent(tag)}`} className="px-2 py-0.5 rounded bg-gray-100 text-[10px] font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors">
                      {tag}
                    </AppLink>
                  ))}
                </div>
              )}
            </div>

            {/* About The Author */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
              <h3 className="text-sm font-bold text-gray-900 mb-3">About The Author</h3>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center text-white font-bold text-lg">{article.author_name.charAt(0)}</div>
                <div>
                  <div className="text-sm font-bold text-gray-900 flex items-center gap-1">{article.author_name} <span className="w-4 h-4 rounded-full bg-blue-500 text-white text-[8px] flex items-center justify-center">✓</span></div>
                  <div className="text-[10px] text-gray-500">{article.author_role}</div>
                  <div className="text-[10px] text-gray-400">Covering Bihar, Politics, Crime and Development stories.</div>
                </div>
              </div>
            </div>

            {/* Related News */}
            <section className="mb-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="flex items-center gap-2 text-base font-bold text-gray-900"><span className="w-1 h-5 bg-red-600 rounded-full" />Related News</h2>
                <AppLink to={`/category/${article.category_slug}`} className="text-[10px] font-semibold text-red-600 hover:underline">View All →</AppLink>
              </div>
              {related.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {related.map(a => (
                    <AppLink key={a.id} to={`/article/${a.slug}`} className="group bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all">
                      <div className="aspect-[16/10] overflow-hidden">
                        <ImageWithFallback src={getArticleThumbnail(a.featured_image, a.video_url)} alt={a.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      </div>
                      <div className="p-2.5">
                        <h4 className="text-xs font-semibold text-gray-900 line-clamp-2 group-hover:text-red-600 transition-colors leading-snug">{a.title}</h4>
                        <div className="flex items-center gap-2 text-[9px] text-gray-400 mt-1.5">
                          <span>{relTime(a.publish_at)}</span>
                          <span>•</span>
                          <span>{fmtViews(a.views_count)} Views</span>
                        </div>
                      </div>
                    </AppLink>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl bg-white border border-gray-100 p-6 text-center text-sm text-gray-500">No related articles available.</div>
              )}
            </section>
          </article>

          {/* ═══ RIGHT SIDEBAR ═══ */}
          <aside className="hidden xl:block self-start">
            <div className="sticky top-[72px] space-y-4 pb-6">
              {/* Sidebar Ad */}
              <SmartAd placement="article_sidebar" />

              {/* Trending News */}
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-1.5">🔥 Trending News</h3>
                <div className="space-y-3">
                  {trending.map((a, i) => (
                    <AppLink key={a.id} to={`/article/${a.slug}`} className="flex gap-2.5 group">
                      <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${i < 3 ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{i + 1}</span>
                      <div className="min-w-0">
                        <p className="text-[12px] font-medium text-gray-800 line-clamp-2 group-hover:text-red-600 transition-colors leading-tight">{a.title}</p>
                        <span className="text-[9px] text-gray-400">{fmtViews(a.views_count)} Views</span>
                      </div>
                    </AppLink>
                  ))}
                </div>
              </div>

              {/* Most Read */}
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-1.5">📊 Most Read</h3>
                <div className="space-y-3">
                  {mostRead.map((a, i) => (
                    <AppLink key={a.id} to={`/article/${a.slug}`} className="flex gap-2.5 group">
                      <span className={`shrink-0 w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold ${i < 3 ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{i + 1}</span>
                      <p className="text-[12px] font-medium text-gray-800 line-clamp-2 group-hover:text-red-600 transition-colors leading-tight">{a.title}</p>
                    </AppLink>
                  ))}
                </div>
              </div>

              {/* Live TV Widget */}
              <div className="rounded-xl bg-gradient-to-br from-gray-900 to-gray-800 p-4 text-white">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold">Live TV</h3>
                  <span className="bg-red-600 text-[8px] font-bold uppercase px-2 py-0.5 rounded animate-pulse">● LIVE</span>
                </div>
                <p className="text-xs text-gray-400 mb-3">Watch Buxar News Live<br />Live coverage 24/7</p>
                <AppLink to="/search?q=live" className="block w-full bg-red-600 text-center py-2 rounded-lg text-xs font-bold hover:bg-red-700 transition-colors">
                  Watch Now
                </AppLink>
              </div>

              {/* Weather */}
              <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-blue-50 to-white p-4 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-2">Weather</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold text-gray-900">32°C</div>
                    <div className="text-xs text-gray-500">Sunny</div>
                    <div className="text-[10px] text-gray-400">Buxar, Bihar</div>
                  </div>
                  <div className="text-4xl">☀️</div>
                </div>
                <div className="flex items-center gap-3 mt-2 text-[9px] text-gray-400">
                  <span>💧 Humidity: 54%</span>
                  <span>🌬️ Wind: 18 km/h</span>
                </div>
              </div>

              {/* Today's Poll */}
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Today's Poll</h3>
                <p className="text-xs text-gray-700 mb-2 font-medium">Which sector needs most government attention?</p>
                <div className="space-y-1.5">
                  {['Education', 'Healthcare', 'Employment', 'Infrastructure'].map(opt => (
                    <div key={opt} className="px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-700 hover:border-red-300 hover:bg-red-50 cursor-pointer transition-colors">{opt}</div>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Newsletter */}
      <section className="bg-gradient-to-r from-red-600 via-red-700 to-red-800 py-6 mt-4">
        <div className="mx-auto max-w-[1400px] px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-white">Newsletter Subscription</h3>
            <p className="text-xs text-red-100">Receive breaking news and selected reports in your inbox.</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <input type="email" placeholder="Enter your email address" className="h-10 rounded-lg bg-white/95 px-4 text-sm text-gray-900 w-full sm:min-w-[260px]" />
            <button type="button" className="h-10 rounded-lg bg-gray-900 px-5 text-xs font-bold text-white shrink-0">Subscribe</button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
