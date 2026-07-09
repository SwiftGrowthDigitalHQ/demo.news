import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Activity, Globe, RefreshCw, TrendingUp, Users, Monitor, Smartphone, Tablet, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell } from 'recharts';
import { Button } from '../ui/button';
import { listAnalyticsEvents } from '../../lib/admin';

type AnalyticsEvent = Awaited<ReturnType<typeof listAnalyticsEvents>>[number];

function getDeviceBucket(ua?: string | null) {
  const s = (ua ?? '').toLowerCase();
  if (!s) return 'Unknown';
  if (s.includes('ipad') || s.includes('tablet')) return 'Tablet';
  if (s.includes('mobi') || s.includes('android') || s.includes('iphone')) return 'Mobile';
  return 'Desktop';
}

function getReferrerDomain(ref?: string | null) {
  if (!ref) return 'Direct';
  try { return new URL(ref).hostname.replace(/^www\./, ''); } catch { return ref; }
}

function countBy(items: string[]) {
  const map = new Map<string, number>();
  for (const item of items) map.set(item, (map.get(item) ?? 0) + 1);
  return map;
}

function topEntries(map: Map<string, number>, limit: number) {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([name, value]) => ({ name, value }));
}

const COLORS = ['#dc2626', '#7c3aed', '#16a34a', '#f59e0b', '#0891b2', '#ec4899'];
type DateRange = 'today' | '7d' | '30d' | 'all';

export function AnalyticsDashboard() {
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<DateRange>('7d');
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [showAllPages, setShowAllPages] = useState(false);

  const load = async () => {
    setLoading(true); setError(null);
    try { setEvents(await listAnalyticsEvents(500)); }
    catch (e) { const msg = e instanceof Error ? e.message : 'Failed'; setError(msg); toast.error(msg); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  // Filter by date range
  const filtered = useMemo(() => {
    const now = Date.now();
    return events.filter(e => {
      if (range === 'all') return true;
      const age = now - new Date(e.created_at).getTime();
      if (range === 'today') return age < 86400000;
      if (range === '7d') return age < 604800000;
      return age < 2592000000; // 30d
    });
  }, [events, range]);

  // Metrics
  const totalEvents = filtered.length;
  const uniqueSessions = new Set(filtered.map(e => e.session_id).filter(Boolean)).size;
  const trackedPages = new Set(filtered.map(e => e.page_path).filter(Boolean)).size;
  const referrerSources = new Set(filtered.map(e => getReferrerDomain(e.referrer)).filter(Boolean)).size;

  // Chart data
  const hourlyData = useMemo(() => {
    const counts = Array.from({ length: 24 }, (_, h) => ({ hour: `${h}:00`, events: 0 }));
    for (const e of filtered) counts[new Date(e.created_at).getHours()].events += 1;
    return counts;
  }, [filtered]);

  const eventTypes = useMemo(() => topEntries(countBy(filtered.map(e => e.event_type)), 5), [filtered]);
  const devices = useMemo(() => topEntries(countBy(filtered.map(e => getDeviceBucket(e.user_agent))), 4), [filtered]);
  const pages = useMemo(() => topEntries(countBy(filtered.map(e => e.page_path || '/')), 10), [filtered]);
  const referrers = useMemo(() => topEntries(countBy(filtered.map(e => getReferrerDomain(e.referrer))), 5), [filtered]);

  if (loading) return <div className="p-6 text-sm text-gray-500 animate-pulse">Loading analytics...</div>;
  if (error) return <div className="p-6"><div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div></div>;

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Analytics</h2>
          <p className="text-xs text-gray-500">{totalEvents} events tracked</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Date Range Filter */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {([['today', 'Today'], ['7d', '7 Days'], ['30d', '30 Days'], ['all', 'All']] as [DateRange, string][]).map(([key, label]) => (
              <button key={key} type="button" onClick={() => setRange(key)}
                className={`px-3 py-1.5 text-[10px] font-semibold transition-colors ${range === key ? 'bg-red-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                {label}
              </button>
            ))}
          </div>
          <Button size="sm" className="gap-1.5 bg-red-600 hover:bg-red-700 h-8 text-xs" onClick={() => void load()}>
            <RefreshCw className="h-3 w-3" /> Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards — 4 columns */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Events', value: totalEvents, icon: Activity, color: '#dc2626' },
          { label: 'Sessions', value: uniqueSessions, icon: Users, color: '#7c3aed' },
          { label: 'Pages', value: trackedPages, icon: Globe, color: '#16a34a' },
          { label: 'Sources', value: referrerSources, icon: TrendingUp, color: '#f59e0b' },
        ].map(kpi => (
          <div key={kpi.label} className="rounded-xl border border-gray-100 bg-white p-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: kpi.color + '12' }}>
              <kpi.icon className="h-4 w-4" style={{ color: kpi.color }} />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{kpi.value.toLocaleString()}</div>
              <div className="text-[10px] text-gray-500">{kpi.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Row: Chart (8) + Insights (4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Traffic Chart */}
        <div className="lg:col-span-8 rounded-xl border border-gray-100 bg-white p-4">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Hourly Traffic</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={hourlyData}>
              <XAxis dataKey="hour" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={3} />
              <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={30} />
              <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: 8, fontSize: 11, color: '#f1f5f9' }} />
              <Bar dataKey="events" fill="#dc2626" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Insights Card: Device + Event Types */}
        <div className="lg:col-span-4 rounded-xl border border-gray-100 bg-white p-4">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Insights</h3>
          {/* Device Pie */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-20 h-20">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={devices} dataKey="value" cx="50%" cy="50%" outerRadius={36} innerRadius={20}>
                    {devices.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1">
              {devices.map((d, i) => (
                <div key={d.name} className="flex items-center gap-1.5 text-[10px]">
                  <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-gray-600">{d.name}</span>
                  <span className="text-gray-400 ml-auto">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Event Types */}
          <div className="border-t border-gray-100 pt-3">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Event Types</div>
            {eventTypes.map(et => (
              <div key={et.name} className="flex items-center justify-between py-1">
                <span className="text-xs text-gray-700">{et.name}</span>
                <span className="text-xs font-bold text-gray-900">{et.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Third Row: Top Pages + Referrers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Pages */}
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-900">Top Pages</h3>
            {pages.length > 5 && (
              <button type="button" onClick={() => setShowAllPages(!showAllPages)} className="text-[10px] font-semibold text-red-600 hover:underline flex items-center gap-0.5">
                {showAllPages ? 'Show Less' : 'See More'} {showAllPages ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            )}
          </div>
          <div className="space-y-1.5">
            {(showAllPages ? pages : pages.slice(0, 5)).map((p, i) => (
              <div key={p.name} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-50 transition-colors">
                <span className="text-[10px] font-bold text-gray-400 w-4">{i + 1}</span>
                <span className="text-xs text-gray-700 truncate flex-1">{p.name}</span>
                <span className="text-xs font-bold text-gray-900">{p.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Referrer Sources */}
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Referrer Sources</h3>
          <div className="space-y-1.5">
            {referrers.map((r, i) => (
              <div key={r.name} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-50 transition-colors">
                <span className="text-[10px] font-bold text-gray-400 w-4">{i + 1}</span>
                <span className="text-xs text-gray-700 truncate flex-1">{r.name}</span>
                <span className="text-xs font-bold text-gray-900">{r.value}</span>
                <ExternalLink className="h-3 w-3 text-gray-300" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Events — Collapsible */}
      <div className="rounded-xl border border-gray-100 bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-900">Recent Events</h3>
          <button type="button" onClick={() => setShowAllEvents(!showAllEvents)} className="text-[10px] font-semibold text-red-600 hover:underline flex items-center gap-0.5">
            {showAllEvents ? 'Show Less' : 'View All'} {showAllEvents ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>
        <div className="space-y-1.5">
          {(showAllEvents ? filtered.slice(0, 50) : filtered.slice(0, 5)).map(event => (
            <div key={event.id} className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-gray-50 transition-colors">
              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
              <span className="text-xs font-medium text-gray-800">{event.event_type}</span>
              <span className="text-[10px] text-gray-400 truncate flex-1">{event.page_path || '/'}</span>
              <span className="text-[10px] text-gray-400 shrink-0">{new Date(event.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
