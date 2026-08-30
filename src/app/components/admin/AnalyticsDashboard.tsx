import { useEffect, useState, useMemo } from 'react';
import { toast } from 'sonner';
import { 
  Activity, 
  Eye, 
  Users, 
  Clock, 
  RefreshCw, 
  Monitor, 
  Smartphone, 
  Tablet, 
  Globe2,
  UserCheck,
  UserPlus,
  FileText,
  Radio,
  Calendar,
  BarChart3,
  Filter,
  X
} from 'lucide-react';
import { 
  AreaChart, 
  Area,
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis, 
  CartesianGrid
} from 'recharts';
import { Button } from '../ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../ui/sheet';
import { MobilePagination, useMobilePagination } from '../ui/mobile-table';
import {
  getAnalyticsOverview,
  getRealTimeVisitors,
  getRecentPageViews,
  getTrafficTrends,
  getTopArticles,
  getTrafficSources,
  getDeviceStats,
  getBrowserStats,
  getOSStats,
  type AnalyticsOverview,
  type RealTimeVisitor,
  type RecentPageView,
  type TrendDataPoint,
  type TopArticle,
  type TrafficSource,
  type DeviceStats,
  type BrowserStats,
  type OSStats
} from '../../lib/admin';
import { useIsMobile } from '../ui/use-mobile';

type DateRange = 'today' | '7d' | '30d' | '90d' | 'all';

const COLORS = ['#dc2626', '#7c3aed', '#16a34a', '#f59e0b', '#0891b2', '#ec4899', '#6366f1', '#14b8a6'];

function getDeviceIcon(device: string) {
  if (device === 'Mobile') return Smartphone;
  if (device === 'Tablet') return Tablet;
  return Monitor;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

function formatTimeAgo(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  
  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

function getDateRangeLabel(range: DateRange): string {
  switch (range) {
    case 'today': return 'Today';
    case '7d': return '7 Days';
    case '30d': return '30 Days';
    case '90d': return '90 Days';
    case 'all': return 'All Time';
  }
}

function getDateRangeFilter(range: DateRange): { start: Date; end: Date } | undefined {
  const now = new Date();
  const end = new Date(now);
  
  switch (range) {
    case 'today': {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }
    case '7d': {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      return { start, end };
    }
    case '30d': {
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      return { start, end };
    }
    case '90d': {
      const start = new Date(now);
      start.setDate(start.getDate() - 90);
      return { start, end };
    }
    case 'all':
      return undefined;
  }
}

function KPICard({ icon: Icon, iconBg, iconColor, value, label }: { 
  icon: React.ElementType; 
  iconBg: string; 
  iconColor: string; 
  value: string | number; 
  label: string;
}) {
  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: iconBg }}>
          <Icon className="h-5 w-5" style={{ color: iconColor }} />
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{value}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
    </div>
  );
}

function StatRow({ label, value, percentage, color }: { label: string; value: string; percentage: string; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
        <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
      </div>
      <div className="text-right">
        <span className="text-sm font-bold text-gray-900 dark:text-white">{value}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">{percentage}%</span>
      </div>
    </div>
  );
}

function TrafficSourceCard({ source, index }: { source: TrafficSource; index: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: COLORS[index % COLORS.length] + '15' }}>
        <Globe2 className="h-5 w-5" style={{ color: COLORS[index % COLORS.length] }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-gray-900 dark:text-white">{source.source}</span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
            {source.category}
          </span>
        </div>
        <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${source.percentage}%`,
              background: COLORS[index % COLORS.length]
            }}
          />
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm font-bold text-gray-900 dark:text-white">{source.visits.toLocaleString()}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">{source.percentage}%</div>
      </div>
    </div>
  );
}

export function AnalyticsDashboard() {
  const isMobile = useIsMobile();
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [realTimeVisitors, setRealTimeVisitors] = useState<RealTimeVisitor[]>([]);
  const [recentPageViews, setRecentPageViews] = useState<RecentPageView[]>([]);
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [topArticles, setTopArticles] = useState<TopArticle[]>([]);
  const [trafficSources, setTrafficSources] = useState<TrafficSource[]>([]);
  const [deviceStats, setDeviceStats] = useState<DeviceStats[]>([]);
  const [browserStats, setBrowserStats] = useState<BrowserStats[]>([]);
  const [osStats, setOSStats] = useState<OSStats[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<DateRange>('7d');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [topArticlesPage, setTopArticlesPage] = useState(0);

  const dateFilter = useMemo(() => getDateRangeFilter(range), [range]);

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [
        overviewData,
        realTimeData,
        recentViewsData,
        trendsData,
        topArticlesData,
        sourcesData,
        devicesData,
        browsersData,
        osData
      ] = await Promise.all([
        getAnalyticsOverview(dateFilter),
        getRealTimeVisitors(),
        getRecentPageViews(50),
        dateFilter ? getTrafficTrends(dateFilter) : Promise.resolve([]),
        getTopArticles(10, dateFilter),
        getTrafficSources(dateFilter),
        getDeviceStats(dateFilter),
        getBrowserStats(dateFilter),
        getOSStats(dateFilter)
      ]);

      setOverview(overviewData);
      setRealTimeVisitors(realTimeData);
      setRecentPageViews(recentViewsData);
      setTrendData(trendsData);
      setTopArticles(topArticlesData);
      setTrafficSources(sourcesData);
      setDeviceStats(devicesData);
      setBrowserStats(browsersData);
      setOSStats(osData);
      setLastUpdated(new Date());
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load analytics';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAnalytics();
  }, [range]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => void loadAnalytics(), 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, range]);

  if (loading && !overview) {
    return (
      <div className="p-4 sm:p-6 flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error && !overview) {
    return (
      <div className="p-4 sm:p-6">
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          <Button size="sm" className="mt-3 bg-red-600 hover:bg-red-700" onClick={() => void loadAnalytics()}>
            <RefreshCw className="h-3 w-3 mr-1.5" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  const hasData = overview && overview.totalPageViews > 0;
  const chartHeight = isMobile ? 220 : 300;
  const cardPadding = isMobile ? 'p-4' : 'p-5';

  return (
    <div className={`flex flex-col ${isMobile ? 'gap-4' : 'gap-5'} p-4 sm:p-6`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Analytics Dashboard</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {hasData 
              ? `${overview!.totalPageViews.toLocaleString()} page views • ${overview!.uniqueVisitors.toLocaleString()} visitors`
              : 'No analytics data yet'}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Date Range Filter - Mobile: Sheet */}
          {isMobile ? (
            <Button variant="outline" onClick={() => setFiltersOpen(true)} style={{ minHeight: 40 }}>
              <Filter className="h-4 w-4 mr-1.5" />
              {getDateRangeLabel(range)}
            </Button>
          ) : (
            <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              {(['today', '7d', '30d', '90d', 'all'] as DateRange[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setRange(key)}
                  className={`px-3 py-1.5 text-xs font-semibold transition-colors min-h-[40px] ${
                    range === key
                      ? 'bg-red-600 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {getDateRangeLabel(key)}
                </button>
              ))}
            </div>
          )}
          
          {/* Auto-refresh toggle */}
          <Button
            size="sm"
            variant={autoRefresh ? 'default' : 'outline'}
            className={autoRefresh ? 'bg-green-600 hover:bg-green-700' : ''}
            onClick={() => setAutoRefresh(!autoRefresh)}
            style={{ minHeight: 40 }}
          >
            <Radio className={`h-3.5 w-3.5 mr-1.5 ${autoRefresh ? 'animate-pulse' : ''}`} />
            Live
          </Button>
          
          {/* Refresh button */}
          <Button 
            size="sm" 
            className="gap-1.5 bg-red-600 hover:bg-red-700" 
            onClick={() => void loadAnalytics()}
            disabled={loading}
            style={{ minHeight: 40 }}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> 
            Refresh
          </Button>
        </div>
      </div>

      {!hasData ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 sm:p-12 text-center">
          <BarChart3 className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Analytics Data Yet</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-4">
            Analytics will appear here once visitors start viewing your articles. Publish and share your articles to start collecting data!
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Tracking is automatic for all published articles on your news website.
          </p>
        </div>
      ) : (
        <>
          {/* 1. OVERVIEW CARDS - Responsive Grid */}
          <div className="grid gap-3" style={{ 
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)' 
          }}>
            <KPICard icon={Eye} iconBg="#fee2e2" iconColor="#dc2626" value={overview!.totalPageViews.toLocaleString()} label="Total Page Views" />
            <KPICard icon={Users} iconBg="#f3e8ff" iconColor="#7c3aed" value={overview!.uniqueVisitors.toLocaleString()} label="Unique Visitors" />
            <KPICard icon={Activity} iconBg="#dbeafe" iconColor="#3b82f6" value={overview!.totalSessions.toLocaleString()} label="Total Sessions" />
            <KPICard icon={Clock} iconBg="#ffedd5" iconColor="#f97316" value={formatDuration(overview!.avgSessionDuration)} label="Avg Session Duration" />
            <KPICard icon={FileText} iconBg="#dcfce7" iconColor="#16a34a" value={overview!.pagesPerSession.toFixed(1)} label="Pages per Session" />
            <KPICard icon={UserCheck} iconBg="#e0e7ff" iconColor="#6366f1" value={overview!.returningVisitors.toLocaleString()} label="Returning Visitors" />
            <KPICard icon={UserPlus} iconBg="#f0fdfa" iconColor="#14b8a6" value={overview!.newVisitors.toLocaleString()} label="New Visitors" />
            <KPICard icon={Calendar} iconBg="#fce7f3" iconColor="#ec4899" value={overview!.publishedArticles.toLocaleString()} label="Published Articles" />
          </div>

          {/* 2. REAL-TIME SECTION */}
          <div className="grid gap-4" style={{ gridTemplateColumns: isMobile ? '1fr' : '1fr 2fr' }}>
            <div className={`rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 ${cardPadding}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Radio className="h-4 w-4 text-green-500 animate-pulse" />
                  Visitors Online
                </h3>
                <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {realTimeVisitors.length}
                </span>
              </div>
              {realTimeVisitors.length === 0 ? (
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-4">No active visitors right now</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {realTimeVisitors.slice(0, 10).map((visitor) => (
                    <div key={visitor.sessionId} className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-gray-700 dark:text-gray-300 truncate flex-1">{visitor.currentPage}</span>
                      <span className="text-gray-400 dark:text-gray-500 text-[10px]">{formatTimeAgo(visitor.lastSeen)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={`rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 ${cardPadding}`}>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Recent Page Views</h3>
              {recentPageViews.length === 0 ? (
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-8">No page views yet</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {recentPageViews.slice(0, 10).map((view) => (
                    <div key={view.id} className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <Eye className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                          {view.articleTitle || view.pagePath}
                        </div>
                        {view.referrer && (
                          <div className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                            from {new URL(view.referrer).hostname}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0">{formatTimeAgo(view.timestamp)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 3. TRAFFIC TREND */}
          {trendData.length > 0 && (
            <div className={`rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 ${cardPadding}`}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Traffic Trends</h3>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-600" />
                    <span className="text-gray-600 dark:text-gray-400">Views</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                    <span className="text-gray-600 dark:text-gray-400">Visitors</span>
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={chartHeight}>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#dc2626" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
                  <XAxis dataKey="date" tick={{ fontSize: isMobile ? 10 : 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: isMobile ? 10 : 11, fill: '#6b7280' }} axisLine={false} tickLine={false} width={50} />
                  <Tooltip contentStyle={{ background: '#1f2937', border: 'none', borderRadius: 8, fontSize: 12, color: '#f9fafb' }} />
                  <Area type="monotone" dataKey="views" stroke="#dc2626" fillOpacity={1} fill="url(#colorViews)" strokeWidth={2} />
                  <Area type="monotone" dataKey="visitors" stroke="#7c3aed" fillOpacity={1} fill="url(#colorVisitors)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* 4. TOP CONTENT - Table on Desktop, Cards on Mobile */}
          <div className={`rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 ${cardPadding}`}>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Top Performing Articles</h3>
            {topArticles.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No article views yet</p>
            ) : (
              <>
                {isMobile ? (
                  // Mobile: Cards
                  <div className="space-y-3">
                    {topArticles.slice(topArticlesPage * 5, (topArticlesPage + 1) * 5).map((article, index) => (
                      <div key={article.id} className="rounded-lg border border-gray-100 dark:border-gray-700 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">{article.title}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 truncate block">/article/{article.slug}</span>
                          </div>
                          <span className="text-sm font-bold text-gray-400 dark:text-gray-500 flex-shrink-0">{index + 1 + topArticlesPage * 5}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>{article.views.toLocaleString()} views</span>
                          <span>{article.uniqueVisitors.toLocaleString()} visitors</span>
                          <span>{formatDuration(article.avgReadingTime)}</span>
                        </div>
                      </div>
                    ))}
                    {topArticles.length > 5 && (
                      <MobilePagination total={topArticles.length} page={topArticlesPage} perPage={5} onPageChange={setTopArticlesPage} />
                    )}
                  </div>
                ) : (
                  // Desktop: Table
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 pb-3 pr-4">#</th>
                          <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 pb-3 pr-4">Article</th>
                          <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 pb-3 px-4">Views</th>
                          <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 pb-3 px-4">Visitors</th>
                          <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 pb-3 px-4">Avg Time</th>
                          <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 pb-3 pl-4">Published</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topArticles.map((article, index) => (
                          <tr key={article.id} className="border-b border-gray-100 dark:border-gray-700/50 last:border-0">
                            <td className="py-3 pr-4"><span className="text-sm font-bold text-gray-400 dark:text-gray-500">{index + 1}</span></td>
                            <td className="py-3 pr-4">
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">{article.title}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400 truncate">/article/{article.slug}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right"><span className="text-sm font-bold text-gray-900 dark:text-white">{article.views.toLocaleString()}</span></td>
                            <td className="py-3 px-4 text-right"><span className="text-sm text-gray-600 dark:text-gray-400">{article.uniqueVisitors.toLocaleString()}</span></td>
                            <td className="py-3 px-4 text-right"><span className="text-sm text-gray-600 dark:text-gray-400">{formatDuration(article.avgReadingTime)}</span></td>
                            <td className="py-3 pl-4 text-right"><span className="text-xs text-gray-500 dark:text-gray-400">{new Date(article.publishedAt).toLocaleDateString()}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>

          {/* 5. TRAFFIC SOURCES */}
          <div className={`rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 ${cardPadding}`}>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Traffic Sources</h3>
            {trafficSources.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No traffic data yet</p>
            ) : (
              <div className="space-y-3">
                {trafficSources.slice(0, 10).map((source, index) => (
                  <TrafficSourceCard key={source.source} source={source} index={index} />
                ))}
              </div>
            )}
          </div>

          {/* 6. DEVICE / BROWSER / OS - Responsive Grid */}
          <div className="grid gap-4" style={{ gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)' }}>
            <div className={`rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 ${cardPadding}`}>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Devices</h3>
              {deviceStats.length === 0 ? (
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-4">No data</p>
              ) : (
                <div className="space-y-3">
                  {deviceStats.map((device, index) => {
                    const Icon = getDeviceIcon(device.device);
                    return (
                      <StatRow key={device.device} label={device.device} value={`${device.percentage}%`} percentage={`${device.percentage}`} color={COLORS[index % COLORS.length]} />
                    );
                  })}
                </div>
              )}
            </div>

            <div className={`rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 ${cardPadding}`}>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Browsers</h3>
              {browserStats.length === 0 ? (
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-4">No data</p>
              ) : (
                <div className="space-y-2.5">
                  {browserStats.map((browser) => (
                    <StatRow key={browser.browser} label={browser.browser} value={browser.count.toLocaleString()} percentage={browser.percentage.toString()} color={COLORS[0]} />
                  ))}
                </div>
              )}
            </div>

            <div className={`rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 ${cardPadding}`}>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Operating Systems</h3>
              {osStats.length === 0 ? (
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-4">No data</p>
              ) : (
                <div className="space-y-2.5">
                  {osStats.map((os) => (
                    <StatRow key={os.os} label={os.os} value={os.count.toLocaleString()} percentage={os.percentage.toString()} color={COLORS[1]} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 7. ENGAGEMENT SECTION */}
          <div className={`rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 ${cardPadding}`}>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Engagement Metrics</h3>
            <div className="grid gap-4" style={{ gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)' }}>
              <div className="text-center p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">{formatDuration(overview!.avgSessionDuration)}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Average Session Duration</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">{overview!.pagesPerSession.toFixed(1)}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Pages per Session</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  {overview!.newVisitors > 0 ? Math.round((overview!.returningVisitors / overview!.uniqueVisitors) * 100) : 0}%
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Returning Visitor Rate</div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Mobile Filters Sheet */}
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Date Range</SheetTitle>
            <SheetDescription>Select the time period for analytics data</SheetDescription>
          </SheetHeader>
          <div className="grid gap-2 py-2" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            {(['today', '7d', '30d', '90d', 'all'] as DateRange[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => { setRange(key); setFiltersOpen(false); }}
                className={`px-4 py-3 rounded-lg text-sm font-semibold transition-colors ${range === key ? 'bg-red-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
              >
                {getDateRangeLabel(key)}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}