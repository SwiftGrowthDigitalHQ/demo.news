import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { AppLink } from '../lib/navigation';
import { useCms, type PublicArticle } from '../lib/cms';
import { createNewsletterSubscription, trackAnalyticsEvent } from '../lib/admin';
import { getSupabaseClient } from '../../lib/supabase';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import {
  TrendingUp, Flame, Clock, Play, Eye, User, ChevronRight,
  ChevronLeft, BarChart3, CloudSun, Facebook, Twitter, Instagram,
  Youtube, ThumbsUp, MessageCircle, Share2, Tag, ArrowUp,
} from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
import { useCallback } from 'react';
import { SmartAd } from '../components/SmartAd';
import { getArticleThumbnail } from '../lib/articleImage';
import { TrendingTopics } from '../components/homepage/TrendingTopics';

/* ─── UTILS ─── */

/** Get the best thumbnail for an article (handles YouTube URLs, null images, etc.) */
function thumb(a: PublicArticle): string {
  return getArticleThumbnail(a.featured_image, a.video_url);
}

function getRelativeTime(dateString: string | null): string {
  if (!dateString) return 'Just now';
  const diffMs = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

function formatViews(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return String(count);
}

/* ─── ADVERTISE HERE BOX ─── */
function AdvertiseHereBox() {
  return (
    <div className="text-center mb-1">
      <span className="text-[7px] font-bold text-gray-400 uppercase tracking-[0.2em]">Advertisement</span>
      <a
        href="mailto:hello@swiftgrowthdigital.com"
        className="block rounded-xl overflow-hidden border-2 border-dashed border-red-200 hover:border-red-500 hover:shadow-lg transition-all duration-300 group mt-1"
      >
        <div className="bg-gradient-to-br from-red-50 via-white to-orange-50 p-5 text-center">
          <div className="relative inline-block mb-3">
            <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center mx-auto shadow-md group-hover:scale-110 transition-transform duration-300">
              <span className="text-white text-lg font-black">AD</span>
            </div>
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-white animate-pulse" />
          </div>
          <div className="text-red-600 text-[10px] font-bold uppercase tracking-wider">यहाँ विज्ञापन दें</div>
          <div className="text-gray-800 text-sm font-bold mt-0.5">Advertise Here</div>
          <div className="text-gray-400 text-[10px] mt-1">15,000+ दैनिक पाठकों तक पहुँचें</div>
          <div className="flex items-center justify-center gap-2 mt-2 text-[9px] text-gray-400">
            <span className="bg-white border border-gray-200 px-2 py-0.5 rounded-full">300×250</span>
            <span>•</span>
            <span className="bg-white border border-gray-200 px-2 py-0.5 rounded-full">300×600</span>
          </div>
          <div className="mt-3 bg-red-600 group-hover:bg-red-700 text-white text-[11px] font-bold px-5 py-2 rounded-full transition-colors inline-block">
            📞 संपर्क करें
          </div>
          <div className="grid grid-cols-3 gap-1 mt-3 pt-3 border-t border-red-100 text-center">
            <div>
              <div className="text-xs font-bold text-gray-800">15K+</div>
              <div className="text-[9px] text-gray-400">Daily</div>
            </div>
            <div className="border-x border-red-100">
              <div className="text-xs font-bold text-gray-800">5L+</div>
              <div className="text-[9px] text-gray-400">Monthly</div>
            </div>
            <div>
              <div className="text-xs font-bold text-gray-800">Bihar</div>
              <div className="text-[9px] text-gray-400">Focus</div>
            </div>
          </div>
        </div>
      </a>
    </div>
  );
}

/* ─── SECTION HEADER ─── */
function SectionHeader({ title, href, icon, dark }: { title: string; href?: string; icon?: ReactNode; dark?: boolean }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <h2 className={`flex items-center gap-2 text-lg font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>
        <span className="w-1 h-6 bg-red-600 rounded-full" />
        {icon}
        {title}
      </h2>
      {href && (
        <AppLink to={href} className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:underline">
          View All <ChevronRight className="h-3 w-3" />
        </AppLink>
      )}
    </div>
  );
}

/* ─── (AdSlot removed — replaced by SmartAd component) ─── */

/* ─── HERO CAROUSEL ─── */
function HeroCarousel({ articles }: { articles: PublicArticle[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [activeIndex, setActiveIndex] = useState(0);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (!emblaApi) return;
    const update = () => setActiveIndex(emblaApi.selectedScrollSnap());
    update();
    emblaApi.on('select', update);
    return () => { emblaApi.off('select', update); };
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi || articles.length <= 1 || hovered) return;
    const timer = setInterval(() => { emblaApi.scrollNext(); }, 5000);
    return () => clearInterval(timer);
  }, [emblaApi, articles.length, hovered]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  if (!articles.length) return null;
  const active = articles[activeIndex] ?? articles[0];

  return (
    <div
      className="relative rounded-xl overflow-hidden shadow-xl group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="overflow-hidden h-[340px] sm:h-[420px] lg:h-[480px]" ref={emblaRef}>
        <div className="flex h-full">
          {articles.map(a => (
            <div key={a.id} className="min-w-0 flex-[0_0_100%] relative">
              <ImageWithFallback src={thumb(a)} alt={a.title} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      {/* Nav arrows */}
      <button type="button" onClick={scrollPrev} className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Previous">
        <ChevronLeft className="h-5 w-5 text-gray-800" />
      </button>
      <button type="button" onClick={scrollNext} className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Next">
        <ChevronRight className="h-5 w-5 text-gray-800" />
      </button>
      {/* Badge */}
      <span className="absolute top-4 left-4 z-20 bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded shadow-lg">
        Top Story
      </span>
      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-5 lg:p-7">
        <span className="inline-block bg-red-600 text-white text-[10px] font-bold uppercase px-2 py-0.5 rounded mb-2">{active.category_name}</span>
        <AppLink to={`/article/${active.slug}`}>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white leading-tight line-clamp-2 hover:underline mb-2">
            {active.title}
          </h2>
        </AppLink>
        <p className="text-sm text-white/80 line-clamp-2 max-w-2xl mb-3">{active.excerpt}</p>
        <div className="flex flex-wrap items-center gap-3 text-xs text-white/70">
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{getRelativeTime(active.publish_at)}</span>
          <span className="flex items-center gap-1"><User className="h-3 w-3" />{active.author_name}</span>
          <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{formatViews(active.views_count)}</span>
        </div>
        {/* Dots */}
        <div className="flex items-center gap-1.5 mt-4">
          {articles.map((_, i) => (
            <button key={i} type="button" onClick={() => emblaApi?.scrollTo(i)}
              className={`h-1.5 rounded-full transition-all ${i === activeIndex ? 'w-6 bg-red-500' : 'w-1.5 bg-white/40 hover:bg-white/60'}`}
              aria-label={`Slide ${i + 1}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── TRENDING SIDEBAR ─── */
function TrendingSidebar({ articles }: { articles: PublicArticle[] }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="flex items-center gap-1.5 text-sm font-bold text-gray-900">
          <Flame className="h-4 w-4 text-red-600" /> Trending Now
        </h3>
        <AppLink to="/search?q=trending" className="text-[10px] font-semibold text-red-600 hover:underline">View all</AppLink>
      </div>
      <div className="space-y-3">
        {articles.slice(0, 5).map((a, i) => (
          <AppLink key={a.id} to={`/article/${a.slug}`} className="flex gap-3 group">
            <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              i < 3 ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}>{i + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-gray-800 line-clamp-2 group-hover:text-red-600 transition-colors leading-tight">{a.title}</p>
              <span className="text-[11px] text-gray-400 mt-0.5 block">{getRelativeTime(a.publish_at)}</span>
            </div>
          </AppLink>
        ))}
      </div>
    </div>
  );
}

/* ─── MOST READ ─── */
function MostReadSidebar({ articles }: { articles: PublicArticle[] }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="flex items-center gap-1.5 text-sm font-bold text-gray-900">
          <BarChart3 className="h-4 w-4 text-red-600" /> Most Read
        </h3>
        <AppLink to="/search?q=popular" className="text-[10px] font-semibold text-red-600 hover:underline">View all</AppLink>
      </div>
      <div className="space-y-3">
        {articles.slice(0, 5).map((a, i) => (
          <AppLink key={a.id} to={`/article/${a.slug}`} className="flex gap-3 group">
            <span className={`shrink-0 w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold ${
              i < 3 ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}>{i + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-gray-800 line-clamp-2 group-hover:text-red-600 transition-colors leading-tight">{a.title}</p>
              <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                <span className="flex items-center gap-0.5"><Eye className="h-2.5 w-2.5" />{formatViews(a.views_count)}</span>
                <span>{getRelativeTime(a.publish_at)}</span>
              </div>
            </div>
          </AppLink>
        ))}
      </div>
    </div>
  );
}

/* ─── WEATHER WIDGET ─── */
function WeatherWidget() {
  return (
    <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-blue-50 to-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-1"><CloudSun className="h-3.5 w-3.5" /> Weather</div>
          <div className="text-3xl font-bold text-gray-900">32°C</div>
          <div className="text-xs text-gray-500 mt-0.5">New York, USA</div>
          <div className="text-[11px] text-gray-400">Sunny • H: 33°C L: 22°C</div>
        </div>
        <div className="text-5xl">☀️</div>
      </div>
    </div>
  );
}

/* ─── MARKET WIDGET ─── */
function MarketWidget() {
  const data = [
    { name: 'SENSEX', value: '78,234.56', change: '+1.2%', up: true },
    { name: 'NIFTY', value: '23,456.78', change: '+0.9%', up: true },
    { name: 'GOLD', value: '₹72,450', change: '-0.3%', up: false },
  ];
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5"><TrendingUp className="h-4 w-4 text-green-600" />Market Watch</h3>
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
      <p className="text-[9px] text-gray-400 mt-2">Updated: {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
    </div>
  );
}

/* ─── POLL WIDGET ─── */
function PollWidget() {
  const [voted, setVoted] = useState(false);
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-bold text-gray-900 mb-3">📊 Today's Poll</h3>
      <p className="text-xs text-gray-700 mb-3 font-medium">Which sector needs most government attention?</p>
      {!voted ? (
        <div className="space-y-2">
          {['Education', 'Healthcare', 'Employment', 'Infrastructure'].map(opt => (
            <button key={opt} type="button" onClick={() => setVoted(true)}
              className="w-full text-left px-3 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:border-red-400 hover:bg-red-50 transition-colors">
              {opt}
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {[{ opt: 'Education', pct: 35 }, { opt: 'Healthcare', pct: 28 }, { opt: 'Employment', pct: 22 }, { opt: 'Infrastructure', pct: 15 }].map(r => (
            <div key={r.opt} className="text-xs">
              <div className="flex justify-between mb-0.5 font-medium text-gray-700"><span>{r.opt}</span><span>{r.pct}%</span></div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden"><div className="h-full bg-red-500 rounded-full" style={{ width: `${r.pct}%` }} /></div>
            </div>
          ))}
          <p className="text-[10px] text-gray-400 mt-1">1,234 votes</p>
        </div>
      )}
    </div>
  );
}

/* ─── SOCIAL FOLLOWERS ─── */
function SocialFollowers() {
  const socials = [
    { name: 'Facebook', icon: Facebook, count: '245K', color: 'bg-blue-600' },
    { name: 'Twitter', icon: Twitter, count: '189K', color: 'bg-sky-500' },
    { name: 'Instagram', icon: Instagram, count: '312K', color: 'bg-pink-600' },
    { name: 'YouTube', icon: Youtube, count: '156K', color: 'bg-red-600' },
  ];
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
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

/* ─── NEWSLETTER SIDEBAR ─── */
function NewsletterSidebar() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); setMsg(null);
    const t = email.trim();
    if (!t || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) { setMsg('Enter valid email'); return; }
    try { await createNewsletterSubscription({ email: t, source: 'sidebar' }); setMsg('Subscribed!'); setEmail(''); } catch { setMsg('Failed'); }
  };
  return (
    <div className="rounded-xl bg-gradient-to-br from-red-600 to-red-700 p-4 text-white shadow-sm">
      <h3 className="text-sm font-bold mb-1">📰 Newsletter</h3>
      <p className="text-[11px] text-red-100 mb-3">Get breaking news in your inbox daily.</p>
      <form onSubmit={handleSubmit} className="space-y-2">
        <input type="email" placeholder="Your email" value={email} onChange={e => setEmail(e.target.value)}
          className="w-full h-9 rounded-lg px-3 text-xs text-gray-900 border-0 focus:ring-2 focus:ring-white/50" />
        <button type="submit" className="w-full h-9 rounded-lg bg-gray-900 text-xs font-bold hover:bg-gray-800 transition-colors">Subscribe</button>
      </form>
      {msg && <p className="text-[10px] text-red-100 mt-1">{msg}</p>}
    </div>
  );
}

/* ─── BREAKING NEWS GRID (Premium Cards with pagination) ─── */
function BreakingNewsGrid({ articles }: { articles: PublicArticle[] }) {
  const [page, setPage] = useState(0);
  const perPage = 4;
  const totalPages = Math.ceil(articles.length / perPage);
  const pageArticles = articles.slice(page * perPage, (page + 1) * perPage);

  return (
    <section>
      <SectionHeader title="Breaking News" href="/search?q=breaking" icon={<Flame className="h-4 w-4 text-red-600" />} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {pageArticles.map(a => (
          <AppLink key={a.id} to={`/article/${a.slug}`} className="group bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
            <div className="relative aspect-[16/10] overflow-hidden">
              <ImageWithFallback src={thumb(a)} alt={a.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              <span className="absolute top-2 left-2 bg-red-600 text-white text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shadow">{a.category_name}</span>
            </div>
            <div className="p-3">
              <h3 className="text-[13px] font-bold text-gray-900 line-clamp-2 group-hover:text-red-600 transition-colors leading-snug mb-2">{a.title}</h3>
              <div className="flex items-center justify-between text-[10px] text-gray-400">
                <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{getRelativeTime(a.publish_at)}</span>
                <span className="flex items-center gap-0.5"><Eye className="h-2.5 w-2.5" />{formatViews(a.views_count)}</span>
              </div>
            </div>
          </AppLink>
        ))}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button type="button" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">←</button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button key={i} type="button" onClick={() => setPage(i)}
              className={`w-7 h-7 rounded-lg text-[10px] font-bold transition-colors ${i === page ? 'bg-red-600 text-white' : 'border border-gray-200 text-gray-600 hover:bg-red-50'}`}>{i + 1}</button>
          ))}
          <button type="button" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">→</button>
        </div>
      )}
    </section>
  );
}

/* ─── LATEST NEWS (3-col with pagination) ─── */
function LatestNewsSection({ articles }: { articles: PublicArticle[] }) {
  const [page, setPage] = useState(0);
  const perPage = 6;
  const totalPages = Math.ceil(articles.length / perPage);
  const pageArticles = articles.slice(page * perPage, (page + 1) * perPage);

  return (
    <section>
      <SectionHeader title="Latest News" href="/search?q=latest" icon={<Clock className="h-4 w-4 text-blue-600" />} />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {pageArticles.map(a => (
          <AppLink key={a.id} to={`/article/${a.slug}`} className="flex gap-3 group bg-white rounded-lg border border-gray-100 p-3 hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="w-24 h-20 shrink-0 rounded-lg overflow-hidden">
              <ImageWithFallback src={thumb(a)} alt={a.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[9px] font-bold uppercase text-red-600">{a.category_name}</span>
              <h4 className="text-[13px] font-semibold text-gray-900 line-clamp-2 group-hover:text-red-600 transition-colors mt-0.5 leading-tight">{a.title}</h4>
              <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-1.5">
                <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{getRelativeTime(a.publish_at)}</span>
                <span className="flex items-center gap-0.5"><Eye className="h-2.5 w-2.5" />{formatViews(a.views_count)}</span>
              </div>
            </div>
          </AppLink>
        ))}
      </div>
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button type="button" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            ← Prev
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button key={i} type="button" onClick={() => setPage(i)}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${i === page ? 'bg-red-600 text-white' : 'border border-gray-200 text-gray-600 hover:bg-red-50 hover:text-red-600'}`}>
              {i + 1}
            </button>
          ))}
          <button type="button" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            Next →
          </button>
        </div>
      )}
    </section>
  );
}

/* ─── VIDEO NEWS ─── */
function VideoNewsSection({ articles }: { articles: PublicArticle[] }) {
  if (!articles.length) return null;
  return (
    <section>
      <SectionHeader title="Video News" href="/search?q=video" icon={<Play className="h-4 w-4 text-red-600" />} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {articles.slice(0, 4).map(a => (
          <AppLink key={a.id} to={`/article/${a.slug}`} className="group block">
            <div className="relative aspect-video rounded-xl overflow-hidden shadow-sm">
              <ImageWithFallback src={thumb(a)} alt={a.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shadow-xl">
                  <Play className="h-5 w-5 text-white" fill="white" />
                </div>
              </div>
              <span className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] px-2 py-0.5 rounded font-medium">
                {a.read_time || '03:45'}
              </span>
              <span className="absolute top-2 left-2 bg-red-600 text-white text-[9px] font-bold uppercase px-2 py-0.5 rounded">{a.category_name}</span>
            </div>
            <h4 className="text-sm font-semibold text-gray-900 line-clamp-2 mt-2.5 group-hover:text-red-600 transition-colors">{a.title}</h4>
            <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-1">
              <span>{a.author_name}</span>
              <span>•</span>
              <span>{getRelativeTime(a.publish_at)}</span>
            </div>
          </AppLink>
        ))}
      </div>
    </section>
  );
}

/* ─── CATEGORY NEWS SECTION (Reusable) ─── */
function CategorySection({ title, articles, href }: { title: string; articles: PublicArticle[]; href: string }) {
  if (!articles.length) return null;
  const lead = articles[0];
  const rest = articles.slice(1, 5);

  return (
    <section>
      <SectionHeader title={title} href={href} />
      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-5">
        {/* Lead card */}
        <AppLink to={`/article/${lead.slug}`} className="group relative rounded-xl overflow-hidden shadow-sm">
          <div className="aspect-[16/10] overflow-hidden">
            <ImageWithFallback src={thumb(lead)} alt={lead.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <span className="inline-block bg-red-600 text-white text-[9px] font-bold uppercase px-2 py-0.5 rounded mb-2">{lead.category_name}</span>
            <h3 className="text-lg font-bold text-white line-clamp-2 group-hover:underline">{lead.title}</h3>
            <div className="flex items-center gap-3 text-xs text-white/70 mt-2">
              <span className="flex items-center gap-1"><User className="h-3 w-3" />{lead.author_name}</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{getRelativeTime(lead.publish_at)}</span>
            </div>
          </div>
        </AppLink>
        {/* Stacked cards */}
        <div className="space-y-3">
          {rest.map(a => (
            <AppLink key={a.id} to={`/article/${a.slug}`} className="flex gap-3 group">
              <div className="w-24 h-[72px] shrink-0 rounded-lg overflow-hidden">
                <ImageWithFallback src={thumb(a)} alt={a.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-[13px] font-semibold text-gray-900 line-clamp-2 group-hover:text-red-600 transition-colors leading-tight">{a.title}</h4>
                <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-1">
                  <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{getRelativeTime(a.publish_at)}</span>
                </div>
              </div>
            </AppLink>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── PHOTO GALLERY ─── */
function PhotoGallery({ articles }: { articles: PublicArticle[] }) {
  return (
    <section>
      <SectionHeader title="Photo Gallery" href="/search?q=photos" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {articles.slice(0, 8).map(a => (
          <AppLink key={a.id} to={`/article/${a.slug}`} className="group relative aspect-square rounded-xl overflow-hidden shadow-sm">
            <ImageWithFallback src={thumb(a)} alt={a.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="text-[11px] font-medium text-white line-clamp-2">{a.title}</p>
            </div>
          </AppLink>
        ))}
      </div>
    </section>
  );
}

/* ─── OPINION SECTION ─── */
function OpinionSection({ articles }: { articles: PublicArticle[] }) {
  return (
    <section className="bg-gray-900 rounded-xl p-6 shadow-lg">
      <SectionHeader title="Opinion & Editorial" href="/search?q=opinion" dark />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {articles.slice(0, 3).map(a => (
          <AppLink key={a.id} to={`/article/${a.slug}`} className="group bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white text-sm font-bold">
                {a.author_name.charAt(0)}
              </div>
              <div>
                <div className="text-xs font-semibold text-white">{a.author_name}</div>
                <div className="text-[10px] text-gray-400">{a.author_role}</div>
              </div>
            </div>
            <h4 className="text-sm font-semibold text-white line-clamp-3 group-hover:text-red-400 transition-colors leading-snug">{a.title}</h4>
            <p className="text-xs text-gray-400 line-clamp-2 mt-2">{a.excerpt}</p>
            <div className="flex items-center gap-3 mt-3 text-[10px] text-gray-500">
              <span className="flex items-center gap-0.5"><ThumbsUp className="h-2.5 w-2.5" />234</span>
              <span className="flex items-center gap-0.5"><MessageCircle className="h-2.5 w-2.5" />56</span>
              <span className="flex items-center gap-0.5"><Share2 className="h-2.5 w-2.5" />12</span>
            </div>
          </AppLink>
        ))}
      </div>
    </section>
  );
}

/* ─── TRENDING TAGS ─── */
function TrendingTags({ categories }: { categories: Array<{ name: string; slug: string }> }) {
  const tags = ['Breaking', 'Elections', 'Bihar', 'Cricket', 'Budget', 'AI', 'Startup', 'Crime', 'Education', 'Job Alert', 'Weather', 'IPL'];
  return (
    <section>
      <SectionHeader title="Trending Tags" icon={<Tag className="h-4 w-4 text-purple-600" />} />
      <div className="flex flex-wrap gap-2">
        {tags.map(tag => (
          <AppLink key={tag} to={`/search?q=${encodeURIComponent(tag)}`}
            className="px-3 py-1.5 rounded-full text-xs font-medium border border-gray-200 text-gray-700 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all duration-200">
            #{tag}
          </AppLink>
        ))}
        {categories.slice(0, 6).map(c => (
          <AppLink key={c.slug} to={`/category/${c.slug}`}
            className="px-3 py-1.5 rounded-full text-xs font-medium border border-gray-200 text-gray-700 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all duration-200">
            #{c.name}
          </AppLink>
        ))}
      </div>
    </section>
  );
}

/* ─── REPORTER SHOWCASE ─── */
function ReporterShowcase() {
  const { articles } = useCms();
  const [reporters, setReporters] = useState<{ name: string; role: string; stories: number; avatar: string; avatar_url: string | null; slug: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReporters() {
      try {
        const client = getSupabaseClient();
        if (!client) {
          setReporters([]);
          setLoading(false);
          return;
        }

        // Fetch reporters
        const { data: reporterRows, error: repError } = await client
          .from('reporters')
          .select('id, full_name, specialty, slug, avatar_url, user_id, status')
          .eq('status', 'active')
          .is('deleted_at', null)
          .order('created_at', { ascending: false });

        if (repError) throw repError;

        // Count stories from CMS articles by matching author_name with reporter full_name
        const storyCountByName = new Map<string, number>();
        articles.forEach(article => {
          const authorName = article.author_name.toLowerCase().trim();
          if (authorName && authorName !== 'editorial desk') {
            storyCountByName.set(authorName, (storyCountByName.get(authorName) ?? 0) + 1);
          }
        });

        // Also count by author_id matching reporter's user_id (direct from articles table)
        const storyCountByUserId = new Map<string, number>();
        const reporterUserIds = (reporterRows ?? []).map(r => r.user_id).filter(Boolean) as string[];

        if (reporterUserIds.length > 0) {
          const { data: articlesByAuthor } = await client
            .from('articles')
            .select('author_id')
            .in('author_id', reporterUserIds)
            .eq('status', 'published')
            .is('deleted_at', null);

          if (articlesByAuthor) {
            articlesByAuthor.forEach((a: { author_id: string | null }) => {
              if (a.author_id) {
                storyCountByUserId.set(a.author_id, (storyCountByUserId.get(a.author_id) ?? 0) + 1);
              }
            });
          }
        }

        const mapped = (reporterRows ?? []).map(r => {
          // Try both: name match from CMS data + user_id match from articles table
          const nameCount = storyCountByName.get(r.full_name.toLowerCase().trim()) ?? 0;
          const userIdCount = r.user_id ? (storyCountByUserId.get(r.user_id) ?? 0) : 0;
          const totalStories = Math.max(nameCount, userIdCount);

          return {
            name: r.full_name,
            role: r.specialty ?? 'Reporter',
            stories: totalStories,
            avatar: r.full_name.split(' ').map((w: string) => w[0] ?? '').join('').slice(0, 2).toUpperCase(),
            avatar_url: typeof r.avatar_url === 'string' && r.avatar_url ? r.avatar_url : null,
            slug: r.slug ?? '',
          };
        });

        setReporters(mapped);
      } catch {
        setReporters([]);
      } finally {
        setLoading(false);
      }
    }

    void fetchReporters();
  }, [articles]);

  if (loading || reporters.length === 0) return null;

  return (
    <section>
      <SectionHeader title="Our Reporters" href="/reporters" icon={<User className="h-4 w-4 text-indigo-600" />} />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {reporters.map(r => (
          <AppLink key={r.slug || r.name} to={`/reporter/${r.slug}`} className="bg-white rounded-xl border border-gray-100 p-4 text-center hover:shadow-md hover:border-red-200 transition-all group cursor-pointer block">
            {r.avatar_url ? (
              <img
                src={r.avatar_url}
                alt={r.name}
                className="w-14 h-14 rounded-full object-cover mx-auto mb-2 group-hover:scale-110 transition-transform"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white text-lg font-bold mx-auto mb-2 group-hover:scale-110 transition-transform">
                {r.avatar}
              </div>
            )}
            <h4 className="text-xs font-bold text-gray-900 truncate">{r.name}</h4>
            <p className="text-[10px] text-gray-500 truncate">{r.role}</p>
            <div className="mt-2 text-[10px] font-semibold text-red-600">{r.stories} Stories</div>
          </AppLink>
        ))}
      </div>
    </section>
  );
}

/* ─── LIVE TV BANNER ─── */
function LiveTVBanner() {
  return (
    <section className="relative rounded-xl overflow-hidden bg-gradient-to-r from-[#111827] via-[#1e293b] to-[#111827] p-6 shadow-lg">
      <div className="absolute top-0 right-0 w-64 h-full opacity-10">
        <div className="w-full h-full bg-gradient-to-l from-red-600 to-transparent" />
      </div>
      <div className="relative flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-red-600/20 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center animate-pulse">
                <Play className="h-6 w-6 text-white" fill="white" />
              </div>
            </div>
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 border-2 border-[#111827] animate-ping" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white">Live TV</h3>
              <span className="bg-red-600 text-white text-[9px] font-bold uppercase px-2 py-0.5 rounded animate-pulse">LIVE</span>
            </div>
            <p className="text-sm text-gray-400 mt-0.5">Watch live news coverage 24/7 with expert analysis</p>
          </div>
        </div>
        <AppLink to="/search?q=live" className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold text-sm transition-colors shadow-lg hover:shadow-xl">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
          </span>
          Watch Now
        </AppLink>
      </div>
    </section>
  );
}

/* ─── SKELETON LOADING ─── */
function HomeSkeleton() {
  return (
    <div className="bg-[#f8f9fa] animate-pulse">
      <div className="h-9 bg-gray-800" />
      <div className="h-16 bg-white border-b" />
      <div className="h-11 bg-white border-b" />
      <div className="mx-auto max-w-[1400px] px-4 py-6 space-y-6">
        <div className="h-10 rounded-lg bg-gray-200 w-full" />
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
          <div className="space-y-6">
            <div className="h-[480px] rounded-xl bg-gray-200" />
            <div className="grid grid-cols-3 gap-5">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="rounded-xl bg-gray-200 h-64" />
              ))}
            </div>
          </div>
          <div className="hidden xl:block space-y-5">
            <div className="h-48 rounded-xl bg-gray-200" />
            <div className="h-36 rounded-xl bg-gray-200" />
            <div className="h-48 rounded-xl bg-gray-200" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── FEATURED STORY GRID (2+4 layout) ─── */
function FeaturedStoryGrid({ articles }: { articles: PublicArticle[] }) {
  if (articles.length < 3) return null;
  const [main, second, ...rest] = articles;
  return (
    <section>
      <SectionHeader title="Featured Stories" href="/search?q=featured" icon={<TrendingUp className="h-4 w-4 text-orange-600" />} />
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
        {/* Main featured */}
        <AppLink to={`/article/${main.slug}`} className="group relative rounded-xl overflow-hidden shadow-md">
          <div className="aspect-[16/9] overflow-hidden">
            <ImageWithFallback src={thumb(main)} alt={main.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <span className="inline-block bg-red-600 text-white text-[9px] font-bold uppercase px-2 py-0.5 rounded mb-2">{main.category_name}</span>
            <h3 className="text-xl font-bold text-white line-clamp-2 group-hover:underline leading-snug">{main.title}</h3>
            <p className="text-xs text-white/70 line-clamp-2 mt-2">{main.excerpt}</p>
            <div className="flex items-center gap-3 text-[11px] text-white/60 mt-3">
              <span className="flex items-center gap-1"><User className="h-3 w-3" />{main.author_name}</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{getRelativeTime(main.publish_at)}</span>
              <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{formatViews(main.views_count)}</span>
            </div>
          </div>
        </AppLink>
        {/* Right column */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
          <AppLink to={`/article/${second.slug}`} className="group relative rounded-xl overflow-hidden shadow-sm">
            <div className="aspect-[16/9] lg:aspect-[16/7] overflow-hidden">
              <ImageWithFallback src={thumb(second)} alt={second.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <span className="inline-block bg-red-600 text-white text-[8px] font-bold uppercase px-1.5 py-0.5 rounded mb-1">{second.category_name}</span>
              <h4 className="text-sm font-bold text-white line-clamp-2 group-hover:underline">{second.title}</h4>
            </div>
          </AppLink>
          <div className="space-y-2">
            {rest.slice(0, 3).map(a => (
              <AppLink key={a.id} to={`/article/${a.slug}`} className="flex gap-3 group bg-white rounded-lg border border-gray-100 p-2.5 hover:shadow-sm transition-shadow">
                <div className="w-20 h-14 shrink-0 rounded overflow-hidden">
                  <ImageWithFallback src={thumb(a)} alt={a.title} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[12px] font-semibold text-gray-900 line-clamp-2 group-hover:text-red-600 transition-colors leading-tight">{a.title}</h4>
                  <span className="text-[10px] text-gray-400 mt-0.5 block">{getRelativeTime(a.publish_at)}</span>
                </div>
              </AppLink>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── BREAKING NEWS TICKER (Standalone) ─── */
function BreakingTicker({ items }: { items: Array<{ headline: string; href: string }> }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (items.length <= 1) return;
    const t = setInterval(() => setIdx(p => (p + 1) % items.length), 4000);
    return () => clearInterval(t);
  }, [items.length]);
  if (!items.length) return null;
  return (
    <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 mb-6">
      <span className="shrink-0 bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded animate-pulse">Breaking News</span>
      <AppLink to={items[idx]?.href || '#'} className="flex-1 text-sm font-medium text-gray-800 truncate hover:text-red-600 transition-colors">
        {items[idx]?.headline}
      </AppLink>
      <div className="flex items-center gap-1 shrink-0">
        <button type="button" onClick={() => setIdx(p => (p - 1 + items.length) % items.length)} className="p-1 rounded hover:bg-red-100 text-gray-500"><ChevronLeft className="h-4 w-4" /></button>
        <button type="button" onClick={() => setIdx(p => (p + 1) % items.length)} className="p-1 rounded hover:bg-red-100 text-gray-500"><ChevronRight className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MAIN HOMEPAGE
   ═══════════════════════════════════════════════ */
export function HomePage() {
  const { articles, categories, breakingNews, loading } = useCms();
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterMsg, setNewsletterMsg] = useState<string | null>(null);

  useEffect(() => {
    void trackAnalyticsEvent({ event_type: 'page_view', page_path: '/', metadata: { page: 'home' } }).catch(() => {});
  }, []);

  // Data slicing
  const heroArticles = useMemo(() => articles.filter(a => a.featured || a.breaking).slice(0, 5), [articles]);
  const featuredArticles = useMemo(() => articles.filter(a => a.featured).slice(0, 6), [articles]);
  const trendingArticles = useMemo(() => articles.filter(a => a.trending).slice(0, 6), [articles]);
  const mostReadArticles = useMemo(() => [...articles].sort((a, b) => b.views_count - a.views_count).slice(0, 5), [articles]);
  const breakingArticles = useMemo(() => articles.filter(a => a.breaking).slice(0, 6), [articles]);
  const latestArticles = useMemo(() => articles.slice(0, 12), [articles]);
  const videoArticles = useMemo(() => articles.filter(a => a.media_type === 'video').slice(0, 4), [articles]);

  const biharNews = useMemo(() => articles.filter(a => a.category_name === 'बिहार').slice(0, 5), [articles]);
  const politicsNews = useMemo(() => articles.filter(a => a.category_name === 'राजनीति').slice(0, 5), [articles]);
  const sportsNews = useMemo(() => articles.filter(a => a.category_name === 'खेल').slice(0, 5), [articles]);
  const businessNews = useMemo(() => articles.filter(a => a.category_name === 'व्यापार').slice(0, 5), [articles]);
  const techNews = useMemo(() => articles.filter(a => a.category_name === 'टेक्नोलॉजी').slice(0, 5), [articles]);
  const educationNews = useMemo(() => articles.filter(a => a.category_name === 'शिक्षा').slice(0, 5), [articles]);
  const crimeNews = useMemo(() => articles.filter(a => a.category_name === 'क्राइम').slice(0, 5), [articles]);
  const nationalNews = useMemo(() => articles.filter(a => a.category_name === 'सीतामढ़ी' || a.category_name === 'बिहार').slice(0, 5), [articles]);
  const opinionArticles = useMemo(() => articles.slice(10, 13), [articles]);
  const galleryArticles = useMemo(() => articles.filter(a => a.featured_image || a.video_url).slice(0, 8), [articles]);

  const tickerItems = useMemo(() => breakingNews.slice(0, 8).map(b => ({
    headline: b.headline,
    href: b.link_url || `/search?q=${encodeURIComponent(b.headline)}`,
  })), [breakingNews]);

  const handleNewsletter = async (e: FormEvent) => {
    e.preventDefault(); setNewsletterMsg(null);
    const email = newsletterEmail.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setNewsletterMsg('Enter valid email'); return; }
    try { await createNewsletterSubscription({ email, source: 'homepage-footer' }); setNewsletterMsg('Subscribed!'); setNewsletterEmail(''); } catch { setNewsletterMsg('Failed'); }
  };

  // Show skeleton while loading
  if (loading && !articles.length) {
    return <HomeSkeleton />;
  }

  return (
    <div className="bg-[#f8f9fa]">
      <Header />

      {/* Header Banner Ad */}
      <SmartAd placement="homepage_top_banner" className="mx-auto max-w-[1400px] mt-2 mb-1" />

      <main className="mx-auto max-w-[1400px] px-4 pb-6">
        {/* Breaking News Ticker */}
        <BreakingTicker items={tickerItems} />

        {/* ════ HERO + RIGHT SIDEBAR ════ */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5">
          {/* Left Main Column */}
          <div className="space-y-6">
            {/* Hero + Trending row */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4">
              <HeroCarousel articles={heroArticles} />
              <div className="hidden lg:flex flex-col gap-4">
                <TrendingSidebar articles={trendingArticles} />
              </div>
            </div>

            {/* Featured Story Grid */}
            <FeaturedStoryGrid articles={featuredArticles.length >= 3 ? featuredArticles : articles.slice(0, 6)} />

            {/* Breaking News Grid */}
            <BreakingNewsGrid articles={breakingArticles.length >= 3 ? breakingArticles : articles.slice(0, 6)} />

            {/* Mid-content Ad */}
            <SmartAd placement="homepage_mid_banner" />

            {/* Latest News */}
            <LatestNewsSection articles={latestArticles} />

            {/* Live TV Banner */}
            <LiveTVBanner />

            {/* Video News */}
            <VideoNewsSection articles={videoArticles} />

            {/* Bihar News */}
            <CategorySection title="Bihar News (बिहार)" articles={biharNews} href="/category/बिहार" />

            {/* National News */}
            <CategorySection title="National News" articles={nationalNews} href="/search?q=national" />

            {/* Politics & Crime side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <CategorySection title="Politics (राजनीति)" articles={politicsNews} href="/category/राजनीति" />
              <CategorySection title="Crime (क्राइम)" articles={crimeNews} href="/category/क्राइम" />
            </div>

            {/* Sports */}
            <CategorySection title="Sports (खेल)" articles={sportsNews} href="/category/खेल" />

            {/* Business & Tech side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <CategorySection title="Business (व्यापार)" articles={businessNews} href="/category/व्यापार" />
              <CategorySection title="Technology (टेक्नोलॉजी)" articles={techNews} href="/category/टेक्नोलॉजी" />
            </div>

            {/* Education */}
            <CategorySection title="Education (शिक्षा)" articles={educationNews} href="/category/शिक्षा" />

            {/* Photo Gallery */}
            <PhotoGallery articles={galleryArticles} />

            {/* Reporter Showcase */}
            <ReporterShowcase />

            {/* Opinion */}
            <OpinionSection articles={opinionArticles} />

            {/* Trending Tags */}
            <TrendingTags categories={categories} />
          </div>

          {/* ════ RIGHT SIDEBAR ════ */}
          <aside className="hidden xl:block self-start">
            <div className="sticky top-[72px] space-y-4 pb-6">
              <SmartAd placement="sidebar_top" />
              <SmartAd placement="sidebar_top_2" showLabel={true} />
              <AdvertiseHereBox />
              <MarketWidget />
              <WeatherWidget />
              <MostReadSidebar articles={mostReadArticles} />
              <NewsletterSidebar />
              <SocialFollowers />
              <SmartAd placement="sidebar_middle" />
              <PollWidget />
              <TrendingTopics />
              <SmartAd placement="sidebar_bottom" />
            </div>
          </aside>
        </div>

        {/* Trending on mobile */}
        <div className="xl:hidden mt-5 space-y-4">
          <TrendingSidebar articles={trendingArticles} />
          <MostReadSidebar articles={mostReadArticles} />
          <PollWidget />
          <SocialFollowers />
        </div>
      </main>

      {/* ════ NEWSLETTER FULL WIDTH ════ */}
      <section className="bg-gradient-to-r from-red-600 via-red-700 to-red-800 py-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgNDBMNDAgME00MCA0MEwwIDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCBmaWxsPSJ1cmwoI2cpIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+')] opacity-50" />
        <div className="relative mx-auto max-w-[1400px] px-4 flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm shrink-0">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Newsletter Subscription</h3>
              <p className="text-sm text-red-100">Receive breaking news and selected reports in your inbox.</p>
            </div>
          </div>
          <form className="flex flex-col sm:flex-row gap-2 w-full md:w-auto" onSubmit={handleNewsletter}>
            <input type="email" placeholder="Enter your email address" value={newsletterEmail} onChange={e => setNewsletterEmail(e.target.value)}
              className="h-11 rounded-lg border-0 bg-white/95 px-5 text-sm text-gray-900 w-full sm:min-w-[280px] focus:outline-none focus:ring-2 focus:ring-white/40 shadow-lg" />
            <button type="submit" className="h-11 rounded-lg bg-gray-900 px-6 text-sm font-bold text-white hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl shrink-0">
              Subscribe
            </button>
          </form>
        </div>
        {newsletterMsg && <p className="text-center text-sm text-red-100 mt-2">{newsletterMsg}</p>}
      </section>

      {/* Footer Ad */}
      <SmartAd placement="homepage_footer_banner" className="mx-auto max-w-[1400px] my-3" />

      <Footer />

      {/* Back to top */}
      <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="fixed bottom-6 right-6 z-50 w-10 h-10 rounded-full bg-red-600 text-white shadow-xl hover:bg-red-700 transition-all hover:scale-110 flex items-center justify-center"
        aria-label="Back to top">
        <ArrowUp className="h-4 w-4" />
      </button>
    </div>
  );
}
