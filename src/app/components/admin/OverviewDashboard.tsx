import { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  CartesianGrid,
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  TrendingUp,
  Eye,
  Users,
  FileText,
  Clock,
  Radio,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { listAdminAds, listAdminArticles, listAdminReporters, listAuditLogs, listBreakingNews } from '../../lib/admin';
import { useIsMobile } from '../ui/use-mobile';

type DashboardState = {
  totalArticles: number;
  publishedArticles: number;
  draftArticles: number;
  totalViews: number;
  activeReporters: number;
  activeAds: number;
  breakingNewsCount: number;
  latestActivity: Awaited<ReturnType<typeof listAuditLogs>>;
  topArticles: Awaited<ReturnType<typeof listAdminArticles>>;
  articleTrend: { day: string; articles: number }[];
  viewTrend: { day: string; views: number }[];
  adPerformance: { title: string; impressions: number; clicks: number }[];
};

const emptyState: DashboardState = {
  totalArticles: 0,
  publishedArticles: 0,
  draftArticles: 0,
  totalViews: 0,
  activeReporters: 0,
  activeAds: 0,
  breakingNewsCount: 0,
  latestActivity: [],
  topArticles: [],
  articleTrend: [],
  viewTrend: [],
  adPerformance: [],
};

function dayKey(value: string) {
  return new Date(value).toLocaleDateString('en-IN', { weekday: 'short' });
}

export function OverviewDashboard() {
  const isMobile = useIsMobile();
  const [state, setState] = useState<DashboardState>(emptyState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      const [articles, reporters, ads, breakingNews, activity] = await Promise.all([
        listAdminArticles(),
        listAdminReporters(),
        listAdminAds(),
        listBreakingNews(),
        listAuditLogs(),
      ]);

      const totalViews = articles.reduce((sum, article) => sum + Number(article.views_count ?? 0), 0);
      const articleTrendMap = new Map<string, number>();
      const viewTrendMap = new Map<string, number>();

      for (const article of articles) {
        if (article.created_at) {
          const key = dayKey(article.created_at);
          articleTrendMap.set(key, (articleTrendMap.get(key) ?? 0) + 1);
        }
        if (article.views_count > 0) {
          const key = dayKey(article.updated_at || article.created_at);
          viewTrendMap.set(key, (viewTrendMap.get(key) ?? 0) + Number(article.views_count));
        }
      }

      const orderedDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const articleTrend = orderedDays.map(day => ({ day, articles: articleTrendMap.get(day) ?? 0 }));
      const viewTrend = orderedDays.map(day => ({ day, views: viewTrendMap.get(day) ?? 0 }));

      setState({
        totalArticles: articles.length,
        publishedArticles: articles.filter(article => article.status === 'published').length,
        draftArticles: articles.filter(article => article.status === 'draft').length,
        totalViews,
        activeReporters: reporters.filter(reporter => reporter.status === 'active').length,
        activeAds: ads.filter(ad => ad.is_active).length,
        breakingNewsCount: breakingNews.filter(item => item.is_active).length,
        latestActivity: activity.slice(0, 5),
        topArticles: articles
          .slice()
          .sort((a, b) => Number(b.views_count ?? 0) - Number(a.views_count ?? 0)),
        articleTrend,
        viewTrend,
        adPerformance: ads
          .slice()
          .sort((a, b) => Number(b.impression_count ?? 0) - Number(a.impression_count ?? 0))
          .slice(0, 5)
          .map(ad => ({
            title: ad.title,
            impressions: Number(ad.impression_count ?? 0),
            clicks: Number(ad.click_count ?? 0),
          })),
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const kpis = [
    { label: 'Total Articles', value: state.totalArticles, sub: 'All content records', icon: FileText, color: '#dc2626', bg: '#fef2f2' },
    { label: 'Published Articles', value: state.publishedArticles, sub: 'Visible on the public site', icon: Activity, color: '#16a34a', bg: '#f0fdf4' },
    { label: 'Draft Articles', value: state.draftArticles, sub: 'Waiting for review', icon: Clock, color: '#f59e0b', bg: '#fffbeb' },
    { label: 'Total Views', value: state.totalViews.toLocaleString('en-IN'), sub: 'Sum of article views', icon: Eye, color: '#7c3aed', bg: '#f5f3ff' },
    { label: 'Active Reporters', value: state.activeReporters, sub: 'Currently active profiles', icon: Users, color: '#0891b2', bg: '#ecfeff' },
    { label: 'Active Ads', value: state.activeAds, sub: 'Live advertisements', icon: TrendingUp, color: '#f97316', bg: '#fff7ed' },
    { label: 'Breaking News', value: state.breakingNewsCount, sub: 'Enabled ticker items', icon: Radio, color: '#dc2626', bg: '#fef2f2' },
  ];

  const latestActivity = state.latestActivity.map(item => ({
    text: `${item.action} · ${item.entity_type}`,
    time: new Date(item.created_at).toLocaleString('en-IN'),
    color: item.action.includes('delete') ? '#dc2626' : item.action.includes('update') ? '#7c3aed' : '#16a34a',
  }));

  const topArticles = state.topArticles.map((article, index) => ({
    title: article.title,
    views: Number(article.views_count ?? 0),
    cat: article.category_name,
    trend: index === 0 ? 'up' : article.trending ? 'up' : 'neutral',
  }));

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="grid gap-3 sm:gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
          {Array.from({ length: 7 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="p-4 flex flex-col gap-3">
                <div className="animate-pulse rounded-lg" style={{ width: 40, height: 40, background: '#e2e8f0' }} />
                <div className="animate-pulse h-8 w-20 rounded" style={{ background: '#e2e8f0' }} />
                <div className="animate-pulse h-4 w-24 rounded" style={{ background: '#e2e8f0' }} />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-4 p-4 sm:p-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        <Button className="w-fit bg-red-600 hover:bg-red-700" onClick={() => void load()}>
          Retry
        </Button>
      </div>
    );
  }

  const chartHeight = isMobile ? 200 : 220;
  const cardPadding = isMobile ? 'p-4' : 'p-5';
  const titleSize = isMobile ? 13 : 14;
  const subtitleSize = isMobile ? 11 : 12;
  const gap = isMobile ? 'gap-4' : 'gap-6';

  return (
    <div className={`flex flex-col ${gap} p-4 sm:p-6`}>
      {/* KPI Cards - Responsive Grid */}
      <div className="grid gap-3 sm:gap-4" style={{ 
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(160px, 1fr))' 
      }}>
        {kpis.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <Card key={index}>
              <CardContent className={`p-3 sm:p-4 flex flex-col gap-2 sm:gap-3`}>
                <div className="flex items-start justify-between">
                  <div className="rounded-lg flex items-center justify-center" style={{ width: isMobile ? 36 : 40, height: isMobile ? 36 : 40, background: kpi.bg }}>
                    <Icon size={isMobile ? 16 : 18} style={{ color: kpi.color }} />
                  </div>
                  <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                    <ArrowUpRight size={isMobile ? 10 : 12} /> Live
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, color: '#0f172a' }}>{kpi.value}</div>
                  <div style={{ fontSize: isMobile ? 11 : 12, color: '#64748b', marginTop: 1 }}>{kpi.label}</div>
                  <div style={{ fontSize: isMobile ? 10 : 11, color: '#94a3b8', marginTop: 2 }}>{kpi.sub}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row - Stack on Mobile */}
      <div className="grid gap-4 sm:gap-6" style={{ 
        gridTemplateColumns: isMobile ? '1fr' : '1.2fr 0.8fr' 
      }}>
        <div className={`rounded-xl border ${cardPadding}`} style={{ background: '#fff', borderColor: 'rgba(15,23,42,0.08)' }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 style={{ fontSize: titleSize, fontWeight: 600, color: '#0f172a' }}>Article & View Trends</h3>
              <p style={{ fontSize: subtitleSize, color: '#94a3b8' }}>Derived from live Supabase records</p>
            </div>
            <div className="flex items-center gap-3" style={{ fontSize: isMobile ? 10 : 11 }}>
              <span className="flex items-center gap-1" style={{ color: '#dc2626' }}>
                <span style={{ width: 8, height: 3, background: '#dc2626', borderRadius: 2, display: 'inline-block' }} /> Articles
              </span>
              <span className="flex items-center gap-1" style={{ color: '#7c3aed' }}>
                <span style={{ width: 8, height: 3, background: '#7c3aed', borderRadius: 2, display: 'inline-block' }} /> Views
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <AreaChart data={state.articleTrend.map((point, index) => ({ ...point, views: state.viewTrend[index]?.views ?? 0 }))}>
              <defs>
                <linearGradient id="gradArticles" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#dc2626" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.14} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.05)" />
              <XAxis dataKey="day" tick={{ fontSize: isMobile ? 10 : 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: isMobile ? 10 : 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: 8, fontSize: 12, color: '#f1f5f9' }} formatter={(v: number) => [v.toLocaleString('en-IN'), '']} />
              <Area type="monotone" dataKey="articles" stroke="#dc2626" strokeWidth={2} fill="url(#gradArticles)" />
              <Area type="monotone" dataKey="views" stroke="#7c3aed" strokeWidth={2} fill="url(#gradViews)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className={`rounded-xl border ${cardPadding}`} style={{ background: '#fff', borderColor: 'rgba(15,23,42,0.08)' }}>
          <div className="mb-3">
            <h3 style={{ fontSize: titleSize, fontWeight: 600, color: '#0f172a' }}>Ad Performance</h3>
            <p style={{ fontSize: subtitleSize, color: '#94a3b8' }}>Real impressions and clicks from live ad records</p>
          </div>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart data={state.adPerformance} barGap={4} barSize={isMobile ? 20 : 30}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.05)" vertical={false} />
              <XAxis dataKey="title" tick={{ fontSize: isMobile ? 10 : 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} hide />
              <YAxis tick={{ fontSize: isMobile ? 10 : 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => v.toLocaleString('en-IN')} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: 'none', borderRadius: 8, fontSize: 12, color: '#f1f5f9' }}
                formatter={(v: number, name) => [v.toLocaleString('en-IN'), name === 'impressions' ? 'Impressions' : 'Clicks']}
              />
              <Bar dataKey="impressions" fill="#dc2626" radius={[4, 4, 0, 0]} />
              <Bar dataKey="clicks" fill="#7c3aed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Articles & Latest Activity - Stack on Mobile */}
      <div className="grid gap-4 sm:gap-6" style={{ 
        gridTemplateColumns: isMobile ? '1fr' : '1fr 320px' 
      }}>
        <div className={`rounded-xl border ${cardPadding}`} style={{ background: '#fff', borderColor: 'rgba(15,23,42,0.08)' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 style={{ fontSize: titleSize, fontWeight: 600, color: '#0f172a' }}>Top Articles Today</h3>
            <button style={{ fontSize: isMobile ? 11 : 12, color: '#dc2626', fontWeight: 500 }}>View All →</button>
          </div>
          <div className="flex flex-col gap-2">
            {topArticles.map((article, index) => (
              <div key={`${article.title}-${index}`} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: '#f8fafc' }}>
                <span className="flex items-center justify-center rounded-lg flex-shrink-0" style={{ width: isMobile ? 24 : 28, height: isMobile ? 24 : 28, background: index === 0 ? '#dc2626' : '#e2e8f0', color: index === 0 ? '#fff' : '#64748b', fontSize: isMobile ? 11 : 12, fontWeight: 700 }}>
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 500, color: '#0f172a', lineHeight: 1.3 }} className="truncate">
                    {article.title}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span style={{ fontSize: isMobile ? 9 : 10, background: '#fef2f2', color: '#dc2626', padding: '1px 5px', borderRadius: 99, fontWeight: 500 }}>{article.cat}</span>
                    <span style={{ fontSize: isMobile ? 10 : 11, color: '#94a3b8' }}>{article.views.toLocaleString('en-IN')} views</span>
                  </div>
                </div>
                <span style={{ color: article.trend === 'up' ? '#16a34a' : '#ef4444' }}>
                  {article.trend === 'up' ? <ArrowUpRight size={isMobile ? 14 : 16} /> : <ArrowDownRight size={isMobile ? 14 : 16} />}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className={`rounded-xl border ${cardPadding}`} style={{ background: '#fff', borderColor: 'rgba(15,23,42,0.08)' }}>
          <h3 style={{ fontSize: titleSize, fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>Latest Activity</h3>
          <div className="flex flex-col gap-3">
            {latestActivity.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-500">No recent activity yet.</div>
            ) : (
              latestActivity.map((item, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="rounded-full flex-shrink-0 mt-0.5" style={{ width: 8, height: 8, background: item.color, marginTop: 6 }} />
                  <div>
                    <div style={{ fontSize: isMobile ? 11 : 12, color: '#0f172a', lineHeight: 1.4 }}>{item.text}</div>
                    <div style={{ fontSize: isMobile ? 10 : 11, color: '#94a3b8', marginTop: 1 }}>{item.time}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Views by Day & Quick Summary - Stack on Mobile */}
      <div className="grid gap-4 sm:gap-6" style={{ 
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr' 
      }}>
        <div className={`rounded-xl border ${cardPadding}`} style={{ background: '#fff', borderColor: 'rgba(15,23,42,0.08)' }}>
          <h3 style={{ fontSize: titleSize, fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>Views by Day</h3>
          <ResponsiveContainer width="100%" height={isMobile ? 180 : 200}>
            <LineChart data={state.viewTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.05)" />
              <XAxis dataKey="day" tick={{ fontSize: isMobile ? 10 : 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: isMobile ? 10 : 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: 8, fontSize: 12, color: '#f1f5f9' }} formatter={(v: number) => [v.toLocaleString('en-IN'), 'Views']} />
              <Line type="monotone" dataKey="views" stroke="#dc2626" strokeWidth={3} dot={{ r: 4, fill: '#dc2626' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className={`rounded-xl border ${cardPadding}`} style={{ background: '#fff', borderColor: 'rgba(15,23,42,0.08)' }}>
          <h3 style={{ fontSize: titleSize, fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>Quick Summary</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="rounded-xl border border-gray-200 p-3">Total articles and views are pulled from Supabase live records.</div>
            <div className="rounded-xl border border-gray-200 p-3">Reporters, ads, and breaking news counts are also live.</div>
            <div className="rounded-xl border border-gray-200 p-3">Latest activity reflects the most recent audit log entries.</div>
          </div>
        </div>
      </div>
    </div>
  );
}