import { useMemo, useState } from 'react';
import { BarChart3, Bell, ChevronRight, Facebook, Instagram, Lock, Menu, Play, Search, ShieldCheck, Twitter, X } from 'lucide-react';
import { useAppNavigation } from '../lib/navigation';

// ─── Types ────────────────────────────────────────────────────────────────────
type Article = { slug: string; title: string; category: string; excerpt: string; author: string; views: string; time: string; hue: string; tags: string[] };

// ─── Demo seed data ───────────────────────────────────────────────────────────
const seeds: [string, string, string][] = [
  ['India', 'Community innovation labs connect young makers with local challenges', 'A fictional nationwide initiative shows how shared labs can turn classroom ideas into practical public-service prototypes.'],
  ['Politics', 'Town hall series opens a new chapter for civic conversations', 'Residents, students and ward teams exchange ideas in a clearly labelled sample public dialogue.'],
  ['Bihar', 'Riverfront reading rooms bring evening learning closer to neighbourhoods', 'The demo story follows a community library model built around access, safety and local volunteers.'],
  ['Business', 'Small retailers map a digital route to better inventory planning', 'Sample business owners explore simple tools that make seasonal planning easier.'],
  ['Sports', 'District sports festival celebrates teamwork beyond the scoreboard', 'Young teams take part in a fictional three-day festival of athletics, football and kabaddi.'],
  ['Technology', 'A student-built accessibility tool earns attention at the campus showcase', 'A demo feature about inclusive design, multilingual interfaces and thoughtful technology.'],
  ['Education', 'Mentor circles help first-generation learners plan their next step', 'A local education collective pilots friendly peer guidance for senior-secondary students.'],
  ['Entertainment', 'Independent theatre group brings a fresh folk tale to the city stage', 'A colourful sample cultural report from a fictional evening performance.'],
  ['Crime', 'Community safety desk launches awareness week for digital reporting', 'This fictional explainer focuses on online safety habits and verified reporting channels.'],
  ['Opinion', 'Why useful local journalism begins with listening', 'An editorial note on trust, context and the daily work of reporting nearby stories.'],
];

const articles: Article[] = Array.from({ length: 40 }, (_, i) => {
  const s = seeds[i % seeds.length];
  return {
    slug: `demo-story-${i + 1}`,
    title: i < 10 ? s[1] : `${s[1]} — Field report ${Math.floor(i / 10) + 1}`,
    category: s[0],
    excerpt: s[2],
    author: ['Ananya Verma', 'Rohit Kumar', 'Meera Sinha', 'Kunal Raj'][i % 4],
    views: `${(9.8 + i * 2.7).toFixed(1)}K`,
    time: `${i + 1}h ago`,
    hue: ['#d52941', '#155e75', '#6d28d9', '#b45309', '#047857'][i % 5],
    tags: ([['Bihar', 'Community'], ['India', 'Public Service'], ['Technology', 'Innovation'], ['Education', 'Future']] as string[][])[i % 4],
  };
});

const categories = ['India', 'Politics', 'Bihar', 'Business', 'Sports', 'Technology', 'Education', 'Entertainment', 'Crime', 'Opinion'];

// ─── Demo publication name (fictional — no relation to any real publication) ──
const DEMO_PUB_NAME = 'DISHA NEWS';
const DEMO_PUB_TAGLINE = 'Sample Publication';

// ─── Shared sub-components ────────────────────────────────────────────────────

function Thumb({ article, large = false }: { article: Article; large?: boolean }) {
  return (
    <div
      className={`relative overflow-hidden ${large ? 'h-72' : 'h-36'}`}
      style={{ background: `linear-gradient(135deg, ${article.hue}, #111827)` }}
    >
      <div
        className="absolute inset-0 opacity-20"
        style={{ backgroundImage: 'radial-gradient(circle at 75% 25%, white 0 3%, transparent 4%), linear-gradient(45deg, transparent 45%, rgba(255,255,255,.35) 46% 53%, transparent 54%)' }}
      />
      <span className="absolute left-3 top-3 rounded bg-white/95 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-800">{article.category}</span>
      <span className="absolute bottom-3 left-3 text-xs font-medium text-white/85">SangTX Demo Visual</span>
    </div>
  );
}

function Ad({ kind = 'Bihar Digital Solutions' }: { kind?: string }) {
  return (
    <aside className="my-5 flex min-h-28 flex-col justify-center rounded-lg border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-700 px-5 text-white">
      <span className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-300">Advertisement · Demo</span>
      <b className="mt-2 text-lg">{kind}</b>
      <span className="mt-1 text-sm text-slate-200">A sample campaign placement powered by SangTX Ads</span>
      <button type="button" className="mt-3 w-fit rounded bg-white px-3 py-1.5 text-xs font-bold text-slate-900">Learn more</button>
    </aside>
  );
}

function Card({ a, navigate }: { a: Article; navigate: (x: string) => void }) {
  return (
    <article className="overflow-hidden rounded-lg border bg-white shadow-sm">
      <Thumb article={a} />
      <div className="p-4">
        <p className="text-xs font-bold text-red-700">{a.category} · {a.time}</p>
        <button type="button" onClick={() => navigate(`/demo/article/${a.slug}`)} className="mt-2 text-left text-lg font-extrabold leading-tight hover:text-red-700">{a.title}</button>
        <p className="mt-2 line-clamp-2 text-sm text-slate-600">{a.excerpt}</p>
      </div>
    </article>
  );
}

function HomeLead({ navigate }: { navigate: (x: string) => void }) {
  const lead = articles[0];
  return (
    <>
      <div className="mb-6 grid gap-5 md:grid-cols-2">
        <article className="overflow-hidden rounded-xl bg-white shadow">
          <Thumb article={lead} large />
          <div className="p-5">
            <p className="text-xs font-bold text-red-700">TOP STORY · {lead.time}</p>
            <button type="button" onClick={() => navigate(`/demo/article/${lead.slug}`)} className="mt-2 text-left text-2xl font-black leading-tight hover:text-red-700">{lead.title}</button>
            <p className="mt-3 text-slate-600">{lead.excerpt}</p>
          </div>
        </article>
        <div className="grid gap-4">
          {articles.slice(1, 5).map(a => <Card key={a.slug} a={a} navigate={navigate} />)}
        </div>
      </div>
      <h2 className="mb-4 border-l-4 border-red-700 pl-3 text-2xl font-black">Latest News</h2>
    </>
  );
}

function Sidebar({ navigate }: { navigate: (x: string) => void }) {
  return (
    <aside className="space-y-5">
      <Ad kind="Smart Education Academy" />

      <div>
        <h3 className="border-b-2 border-red-700 pb-2 text-lg font-black">Most Read <small className="font-normal text-slate-400">Demo data</small></h3>
        {articles.slice(5, 11).map((a, i) => (
          <button
            key={a.slug}
            type="button"
            onClick={() => navigate(`/demo/article/${a.slug}`)}
            className="flex w-full gap-3 border-b py-3 text-left"
          >
            <span className="w-8 shrink-0 text-2xl font-black text-slate-300">{String(i + 6).padStart(2, '0')}</span>
            <span>
              <b className="block text-sm leading-snug">{a.title}</b>
              <small className="text-slate-500">{a.category} · {a.views} views</small>
            </span>
          </button>
        ))}
      </div>

      <div className="rounded-lg bg-sky-50 p-5">
        <b>Demo Weather</b>
        <p className="mt-2 text-3xl font-black">28°</p>
        <p className="text-sm text-slate-600">Patna · Sample data, not live</p>
      </div>

      <div className="rounded-lg bg-slate-900 p-5 text-white">
        <b>Get demo news updates</b>
        <p className="mt-1 text-sm text-slate-300">Newsletter preview — no email is collected.</p>
        <button type="button" disabled className="mt-3 rounded bg-white px-3 py-2 text-sm font-bold text-slate-900 opacity-60 cursor-not-allowed">Demo mode — read only</button>
      </div>

      <div className="rounded-lg border bg-white p-5">
        <b>Follow Us</b>
        <div className="mt-3 flex gap-3 text-slate-600">
          <Facebook size={18} />
          <Twitter size={18} />
          <Instagram size={18} />
        </div>
        <p className="mt-2 text-xs text-slate-500">Demo social links — not functional</p>
      </div>

      <div className="rounded-lg border bg-white p-5">
        <b>Trending Tags</b>
        <div className="mt-3 flex flex-wrap gap-2">
          {['#Bihar', '#News', '#Technology', '#Patna', '#Sports', '#Education'].map(t => (
            <button key={t} type="button" onClick={() => navigate(`/demo/search?q=${t.slice(1)}`)} className="rounded bg-slate-100 px-2 py-1 text-xs hover:bg-red-100 hover:text-red-700 transition-colors">{t}</button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border bg-white p-5">
        <b>Quick Poll</b>
        <p className="mt-2 text-sm text-slate-700">Local coverage or breaking alerts?</p>
        <button type="button" disabled className="mt-3 rounded bg-slate-100 px-3 py-1 text-xs text-slate-500 cursor-not-allowed">Demo mode — read only</button>
      </div>

      <Ad kind="City Hospital — Demo campaign" />
    </aside>
  );
}

function MoreSections({ navigate }: { navigate: (x: string) => void }) {
  return (
    <section className="mt-10 space-y-10">
      <div>
        <h2 className="border-l-4 border-red-700 pl-3 text-2xl font-black">Photo Gallery</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {articles.slice(18, 26).map(a => (
            <button key={a.slug} type="button" className="text-left" onClick={() => navigate(`/demo/article/${a.slug}`)}>
              <Thumb article={a} />
              <b className="mt-2 block text-sm">{a.title}</b>
              <small className="text-slate-500">{a.category} · Demo gallery</small>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="border-l-4 border-red-700 pl-3 text-2xl font-black">Video News</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {articles.slice(26, 29).map(a => (
            <button key={a.slug} type="button" onClick={() => navigate(`/demo/article/${a.slug}`)} className="relative overflow-hidden rounded-lg text-left">
              <Thumb article={a} />
              <Play className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white p-2 text-red-700" size={42} />
              <b className="mt-2 block">{a.title}</b>
              <small className="text-slate-500">Demo preview · 03:42</small>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-red-700 p-6 text-white">
        <b className="text-xl">Today's Poll</b>
        <p className="mt-2">Which digital news feature matters most to you?</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {['Fast Updates', 'Video News', 'Local Coverage', 'Breaking Alerts'].map(x => (
            <button key={x} type="button" className="rounded border border-white/50 px-3 py-2 text-sm hover:bg-white/10 transition-colors">
              {x} <small className="opacity-70">Demo only</small>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function ArticleView({ article }: { article: Article }) {
  const { navigate } = useAppNavigation();
  return (
    <div className="mt-7 grid gap-7 lg:grid-cols-[1fr_320px]">
      <article>
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-sm text-slate-500 mb-5">
          <button type="button" onClick={() => navigate('/demo')} className="hover:text-red-700">Home</button>
          <ChevronRight className="inline h-3.5 w-3.5" />
          <button type="button" onClick={() => navigate(`/demo/category/${article.category.toLowerCase()}`)} className="hover:text-red-700">{article.category}</button>
          <ChevronRight className="inline h-3.5 w-3.5" />
          <span className="truncate max-w-xs text-slate-400">{article.title}</span>
        </nav>

        {/* Category badge + headline */}
        <p className="text-sm font-bold text-red-700 uppercase tracking-wide">{article.category} · Sample Report</p>
        <h1 className="mt-2 text-3xl font-black leading-tight md:text-4xl">{article.title}</h1>

        {/* Meta */}
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-500">
          <span className="font-medium text-slate-700">By {article.author}</span>
          <span>·</span>
          <span>{article.time}</span>
          <span>·</span>
          <span>4 min read</span>
          <span>·</span>
          <span className="flex items-center gap-1"><BarChart3 className="h-3.5 w-3.5" />{article.views} views</span>
        </div>

        {/* Featured visual */}
        <div className="mt-6 rounded-xl overflow-hidden">
          <Thumb article={article} large />
        </div>

        {/* Body */}
        <div className="prose mt-6 max-w-none text-slate-700 space-y-4">
          <p className="text-base leading-relaxed">{article.excerpt}</p>
          <p className="text-base leading-relaxed">This original demo article is included to show how a SangTX-powered publication can present rich editorial reporting without relying on live claims. Every name, event and statistic in this sample is fictional.</p>
          <p className="text-base leading-relaxed">Clear structure, useful context and links to related coverage help readers continue through the publication. The final system can support each publisher's own newsroom workflow, local language and branding.</p>
        </div>

        {/* Tags + Share */}
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t pt-4">
          <b className="mr-2 text-sm">Tags</b>
          {article.tags.map(t => (
            <button key={t} type="button" onClick={() => navigate(`/demo/search?q=${t}`)} className="rounded-full bg-slate-100 px-3 py-1 text-xs hover:bg-red-100 hover:text-red-700 transition-colors">#{t}</button>
          ))}
          <span className="ml-auto flex items-center gap-2 text-xs text-slate-500">
            Share demo story
            <Facebook size={16} className="text-blue-600" />
            <Twitter size={16} className="text-sky-500" />
          </span>
        </div>

        {/* In-article Ad */}
        <Ad kind="Local Motors — sample in-content campaign" />

        {/* Related stories */}
        <h2 className="mt-6 text-2xl font-black">Related Stories</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {articles.slice(10, 14).map(a => <Card a={a} navigate={navigate} key={a.slug} />)}
        </div>
      </article>

      <Sidebar navigate={navigate} />
    </div>
  );
}

function DemoFooter({ navigate }: { navigate: (x: string) => void }) {
  return (
    <footer className="mt-14 bg-slate-950 text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-3">
        <div>
          <b className="text-2xl text-white">{DEMO_PUB_NAME} <small className="text-xs text-slate-400">DEMO</small></b>
          <p className="mt-3 text-sm">A fictional demo publication powered by SangTX. All names, events and statistics are sample data only.</p>
        </div>
        <div>
          <b className="text-white">Explore</b>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            {categories.slice(0, 6).map(c => (
              <button key={c} type="button" onClick={() => navigate(`/demo/category/${c.toLowerCase()}`)} className="hover:text-white transition-colors">{c}</button>
            ))}
          </div>
        </div>
        <div>
          <b className="text-white">Build your own news platform</b>
          <p className="mt-2 text-sm text-slate-400">Powered by SangTX — the complete newsroom platform.</p>
          <button type="button" onClick={() => navigate('/pricing')} className="mt-3 block rounded bg-red-700 px-4 py-2 text-sm font-bold text-white hover:bg-red-600 transition-colors">Start 7 Days Free</button>
          <button type="button" onClick={() => navigate('/')} className="mt-2 block text-sm text-slate-400 hover:text-white transition-colors underline">Back to SangTX →</button>
        </div>
      </div>
      <div className="border-t border-slate-800 py-3 text-center text-xs text-slate-600">
        © SangTX Demo · Sample editorial content only · <button type="button" onClick={() => navigate('/')} className="hover:text-slate-300 transition-colors underline">SangTX.com</button>
      </div>
    </footer>
  );
}

// ─── Demo Admin ───────────────────────────────────────────────────────────────
function DemoAdmin() {
  const { navigate } = useAppNavigation();
  const [section, setSection] = useState('Dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const nav = [
    'Dashboard', 'Analytics', 'News Management', 'Categories', 'Breaking News',
    'Media Library', 'Reporters', 'Users', 'Roles', 'Advertisements',
    'Subscriptions', 'SEO', 'Notifications', 'Settings', 'Reports',
  ];

  const Sidebar = () => (
    <div className="flex flex-col h-full">
      <button type="button" onClick={() => navigate('/demo')} className="mb-8 text-xl font-black text-white text-left">
        SangTX <small className="text-xs text-slate-400">DEMO CMS</small>
      </button>
      <nav className="flex-1 space-y-0.5">
        {nav.map(n => (
          <button
            key={n}
            type="button"
            onClick={() => { setSection(n); setMobileNavOpen(false); }}
            className={`block w-full rounded px-3 py-2 text-left text-sm transition-colors ${section === n ? 'bg-red-700 text-white' : 'hover:bg-slate-800 text-slate-300'}`}
          >
            {n}
          </button>
        ))}
      </nav>
      <div className="mt-6 pt-6 border-t border-slate-800 space-y-2">
        <button type="button" onClick={() => navigate('/pricing')} className="block w-full rounded bg-red-700 px-3 py-2 text-left text-sm font-bold text-white hover:bg-red-600 transition-colors">
          Start 7 Days Free ↗
        </button>
        <button type="button" onClick={() => navigate('/')} className="block w-full rounded px-3 py-2 text-left text-sm text-slate-400 hover:text-white transition-colors">
          ← Back to SangTX
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Read-only banner */}
      <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-center text-sm text-amber-900">
        <ShieldCheck className="mr-2 inline" size={16} />
        <b>Demo Mode — Read Only.</b> Explore the SangTX CMS; changes, uploads and publishing are disabled in this demo.
      </div>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden min-h-[calc(100vh-48px)] w-64 shrink-0 bg-slate-950 p-5 text-slate-200 md:block">
          <Sidebar />
        </aside>

        {/* Mobile sidebar overlay */}
        {mobileNavOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div className="w-64 bg-slate-950 p-5 text-slate-200 overflow-y-auto">
              <Sidebar />
            </div>
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              className="flex-1 bg-black/50"
              aria-label="Close menu"
            />
          </div>
        )}

        <main className="min-w-0 flex-1 p-5 md:p-8">
          {/* Mobile header bar */}
          <div className="flex items-center justify-between mb-5 md:hidden">
            <button type="button" onClick={() => setMobileNavOpen(true)} className="flex items-center gap-2 rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm">
              <Menu size={16} /> {section}
            </button>
            <button type="button" onClick={() => navigate('/demo')} className="text-sm font-bold text-red-700 hover:underline">← Back to Demo</button>
          </div>

          {/* Section heading */}
          <div className="mb-7 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Demo data · Read only</p>
              <h1 className="text-3xl font-black">{section}</h1>
            </div>
            <button type="button" disabled className="flex items-center gap-1.5 rounded bg-slate-200 px-4 py-2 text-sm font-bold text-slate-500 cursor-not-allowed">
              <Lock className="inline" size={14} /> Demo — Read Only
            </button>
          </div>

          {section === 'Dashboard' ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[['Total Articles', '148'], ['Published', '126'], ['Total Views', '2.4M'], ['Subscribers', '18.6K']].map(x => (
                  <div className="rounded-xl bg-white p-5 shadow-sm" key={x[0]}>
                    <p className="text-sm text-slate-500">{x[0]}</p>
                    <b className="mt-1 block text-3xl">{x[1]}</b>
                    <small className="text-emerald-600">Demo analytics</small>
                  </div>
                ))}
              </div>
              <div className="mt-6 grid gap-5 lg:grid-cols-2">
                <div className="rounded-xl bg-white p-5 shadow-sm">
                  <b>Traffic overview · Demo Data</b>
                  <div className="mt-6 flex h-40 items-end gap-3" aria-label="Traffic chart">
                    {[45, 68, 52, 85, 63, 92, 76, 100, 82, 95].map((h, i) => (
                      <i key={i} style={{ height: `${h}%` }} className="flex-1 rounded-t bg-red-600 not-italic" />
                    ))}
                  </div>
                </div>
                <div className="rounded-xl bg-white p-5 shadow-sm">
                  <b>Top articles</b>
                  {articles.slice(0, 5).map(a => (
                    <p className="border-b py-3 text-sm" key={a.slug}>
                      <span className="mr-2 line-clamp-1">{a.title}</span>
                      <span className="float-right text-slate-500">{a.views}</span>
                    </p>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="overflow-x-auto rounded-xl bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <b>{section} · Sample records</b>
                <button type="button" disabled className="text-sm text-slate-400 cursor-not-allowed">+ Add new (disabled in demo)</button>
              </div>
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="border-b text-slate-500">
                  <tr>
                    <th className="p-3">Title / Name</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Updated</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {articles.slice(0, 10).map((a, i) => (
                    <tr className="border-b hover:bg-slate-50 transition-colors" key={a.slug}>
                      <td className="p-3 font-medium max-w-xs truncate">{section === 'Media Library' ? `demo-visual-${i + 1}.webp` : a.title}</td>
                      <td className="p-3 text-slate-500">{section === 'Media Library' ? 'Image' : a.category}</td>
                      <td className="p-3">
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">Published</span>
                      </td>
                      <td className="p-3 text-slate-400">Demo dataset</td>
                      <td className="p-3">
                        <button type="button" onClick={() => navigate(`/demo/article/${a.slug}`)} className="font-bold text-red-700 hover:underline text-sm">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-4 text-center text-xs text-slate-400">
                This is demo data. <button type="button" onClick={() => navigate('/pricing')} className="font-semibold text-red-600 hover:underline">Start your free trial</button> to manage real content.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ─── Main DemoPortal ──────────────────────────────────────────────────────────
export function DemoPortal({ mode }: { mode: 'home' | 'article' | 'category' | 'search' | 'admin' }) {
  const { navigate, pathname, search } = useAppNavigation();
  const [menu, setMenu] = useState(false);
  const q = new URLSearchParams(search).get('q') ?? '';
  const [query, setQuery] = useState(q);

  const slug = pathname.split('/article/')[1];
  const categorySlug = pathname.split('/category/')[1];
  const selected = articles.find(a => a.slug === slug) ?? articles[0];

  const shown = useMemo(() => {
    if (categorySlug) return articles.filter(a => a.category.toLowerCase() === categorySlug.toLowerCase());
    if (q) return articles.filter(a => `${a.title} ${a.category} ${a.tags.join(' ')}`.toLowerCase().includes(q.toLowerCase()));
    return articles;
  }, [categorySlug, q]);

  const goSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/demo/search?q=${encodeURIComponent(query)}`);
  };

  if (mode === 'admin') return <DemoAdmin />;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      {/* Demo banner */}
      <div className="bg-slate-900 px-4 py-2 text-center text-xs text-slate-200">
        <span>DEMO — Explore a sample SangTX-powered news platform. All editorial content is fictional.</span>
        <button type="button" className="ml-3 font-bold text-white underline hover:text-red-300 transition-colors" onClick={() => navigate('/')}>Back to SangTX</button>
      </div>

      {/* Header */}
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <button type="button" onClick={() => navigate('/demo')} className="text-2xl font-black tracking-tight text-red-700">
            {DEMO_PUB_NAME}
            <small className="ml-2 text-[10px] font-bold text-slate-400">{DEMO_PUB_TAGLINE}</small>
          </button>
          <form onSubmit={goSearch} className="hidden items-center rounded-full border bg-slate-50 px-3 md:flex">
            <Search size={16} className="text-slate-400 shrink-0" />
            <input
              aria-label="Search demo news"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-48 bg-transparent px-2 py-2 text-sm outline-none"
              placeholder="Search demo news"
            />
          </form>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => navigate('/pricing')} className="hidden md:inline-flex items-center gap-1 rounded-full bg-red-700 px-4 py-1.5 text-xs font-bold text-white hover:bg-red-600 transition-colors">
              Start Free Trial
            </button>
            <button type="button" className="md:hidden" onClick={() => setMenu(!menu)} aria-label="Toggle menu">
              {menu ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
        <nav className={`${menu ? 'block' : 'hidden'} border-t md:block`}>
          <div className="mx-auto flex max-w-7xl flex-wrap gap-x-6 gap-y-2 px-4 py-3 text-sm font-bold">
            {categories.slice(0, 9).map(c => (
              <button key={c} type="button" onClick={() => { navigate(`/demo/category/${c.toLowerCase()}`); setMenu(false); }} className="hover:text-red-700 transition-colors">{c}</button>
            ))}
            <button type="button" onClick={() => { navigate('/demo/admin'); setMenu(false); }} className="text-red-700 hover:underline">CMS Demo</button>
          </div>
        </nav>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4">
        <Ad kind="Patna Business Hub — build, connect, grow" />

        {/* Trending tags bar */}
        <div className="my-4 flex flex-wrap gap-2 border-y py-3 text-xs">
          <b className="mr-2 text-red-700">TRENDING NOW</b>
          {['#Bihar', '#Technology', '#Education', '#LocalNews', '#Sports', '#Startups'].map(t => (
            <button key={t} type="button" onClick={() => navigate(`/demo/search?q=${t.slice(1)}`)} className="rounded-full bg-slate-100 px-3 py-1 hover:bg-red-100 hover:text-red-700 transition-colors">{t}</button>
          ))}
        </div>

        {/* Breaking ticker */}
        <div className="flex items-center gap-3 rounded-lg bg-red-700 px-4 py-3 text-sm text-white mb-2">
          <Bell size={16} className="shrink-0" />
          <b className="shrink-0">BREAKING</b>
          <span className="truncate">Demo update: SangTX sample newsroom showcases a fully populated digital publication with breaking news, categories, search and CMS.</span>
        </div>

        {mode === 'article' ? (
          <ArticleView article={selected} />
        ) : (
          <>
            <div className="mt-7 grid gap-7 lg:grid-cols-[1fr_320px]">
              <section>
                {mode === 'category' && (
                  <div className="mb-6">
                    <p className="text-sm font-bold text-red-700 uppercase tracking-wide">Category · Demo Coverage</p>
                    <h1 className="text-3xl font-black capitalize">{categorySlug} News</h1>
                    <p className="mt-2 text-slate-600">Original fictional reporting curated to demonstrate a complete SangTX category experience.</p>
                  </div>
                )}
                {mode === 'search' && (
                  <div className="mb-6">
                    <p className="text-sm text-slate-500">Demo search</p>
                    <h1 className="text-3xl font-black">Results for &ldquo;{q}&rdquo;</h1>
                    <p className="mt-1 text-sm text-slate-500">{shown.length} article{shown.length !== 1 ? 's' : ''} found</p>
                  </div>
                )}
                {mode === 'home' && <HomeLead navigate={navigate} />}

                {shown.length === 0 ? (
                  <div className="rounded-xl border border-dashed bg-white p-10 text-center">
                    <Search className="mx-auto text-slate-400 h-10 w-10" />
                    <h2 className="mt-3 text-xl font-black">No demo stories found</h2>
                    <p className="mt-2 text-sm text-slate-600">Try a topic like Bihar, technology, education or sports.</p>
                    <button type="button" onClick={() => navigate('/demo')} className="mt-4 rounded bg-red-700 px-4 py-2 text-sm font-bold text-white hover:bg-red-600 transition-colors">Browse latest news</button>
                  </div>
                ) : (
                  <div className="grid gap-5 sm:grid-cols-2">
                    {shown.slice(mode === 'home' ? 5 : 0, mode === 'home' ? 17 : 20).map(a => (
                      <Card key={a.slug} a={a} navigate={navigate} />
                    ))}
                  </div>
                )}
              </section>
              <Sidebar navigate={navigate} />
            </div>
            {mode === 'home' && <MoreSections navigate={navigate} />}
          </>
        )}
      </main>

      <DemoFooter navigate={navigate} />
    </div>
  );
}
