import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Loader2, Check, X, Info, MoreVertical, Grid3x3, List, Plus, ChevronDown } from 'lucide-react';
import { getSupabaseClient } from '../../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { 
  PLUGIN_REGISTRY, 
  PLUGIN_CATEGORIES, 
  type Plugin, 
  type PluginCategory,
  searchPlugins,
  getPluginsByCategory
} from '../../lib/pluginRegistry';
import { getPluginIcon } from '../../lib/pluginIcons';

interface TenantPlugin {
  id: string;
  plugin_key: string;
  enabled: boolean;
  configuration: Record<string, unknown>;
  installed_version: string | null;
  created_at: string;
  updated_at: string;
}

type FilterType = 'all' | 'installed' | 'active' | 'updates';
type ViewMode = 'grid' | 'list';

export function PluginManagementRefined() {
  const auth = useAuth();
  const [tenantPlugins, setTenantPlugins] = useState<TenantPlugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [categoryFilter, setCategoryFilter] = useState<PluginCategory | 'all'>('all');
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Wait for auth.ready before deciding what to do.
  // auth.ready means the initial session + profile load has fully settled.
  useEffect(() => {
    if (!auth.ready) return; // auth still initialising — wait

    if (!auth.profile?.owned_tenant_id) {
      // Auth is ready but this user owns no tenant.
      // Treat as an empty-but-valid state — NOT an error.
      setTenantPlugins([]);
      setLoading(false);
      setIsInitialLoad(false);
      return;
    }

    // Tenant is known — load plugin state
    void loadTenantPlugins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.ready, auth.profile?.owned_tenant_id]);

  const loadTenantPlugins = async () => {
    try {
      setLoading(true);
      setError(null);
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase not configured');

      const tenantId = auth.profile?.owned_tenant_id;
      if (!tenantId) {
        // No tenant — valid empty state, not an error
        setTenantPlugins([]);
        return;
      }

      // Explicit tenant_id filter in addition to RLS — belt-and-suspenders
      const { data, error: fetchError } = await supabase
        .from('tenant_plugins')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Empty result (new tenant, 0 plugins enabled) is valid — not an error
      setTenantPlugins(data ?? []);

      if (isInitialLoad) {
        await new Promise(resolve => setTimeout(resolve, 300));
        setIsInitialLoad(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plugin state');
    } finally {
      setLoading(false);
    }
  };

  const getPluginStatus = useCallback((plugin: Plugin): 'active' | 'inactive' | 'available' => {
    const tenantPlugin = tenantPlugins.find(tp => tp.plugin_key === plugin.key);
    if (!tenantPlugin) return 'available';
    return tenantPlugin.enabled ? 'active' : 'inactive';
  }, [tenantPlugins]);

  const togglePlugin = async (plugin: Plugin) => {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase not configured');
      const tenantId = auth.profile?.owned_tenant_id;
      if (!tenantId) throw new Error('No tenant context — cannot toggle plugin');

      const tenantPlugin = tenantPlugins.find(tp => tp.plugin_key === plugin.key);
      
      if (tenantPlugin) {
        // Update existing row — scope to both id AND tenant_id for safety
        const { error: updateError } = await supabase
          .from('tenant_plugins')
          .update({ enabled: !tenantPlugin.enabled })
          .eq('id', tenantPlugin.id)
          .eq('tenant_id', tenantId);

        if (updateError) throw updateError;
      } else {
        // Insert new row for this tenant+plugin combination
        const { error: insertError } = await supabase
          .from('tenant_plugins')
          .insert({
            tenant_id: tenantId,
            plugin_key: plugin.key,
            enabled: true,
            configuration: {},
            installed_version: plugin.version,
          });

        if (insertError) throw insertError;
      }

      await loadTenantPlugins();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update plugin');
    }
  };

  const filteredPlugins = useMemo(() => {
    let plugins = [...PLUGIN_REGISTRY];

    if (searchQuery.trim()) {
      plugins = searchPlugins(searchQuery);
    }

    if (categoryFilter !== 'all') {
      plugins = getPluginsByCategory(categoryFilter);
    }

    if (filterType !== 'all') {
      plugins = plugins.filter(plugin => {
        const status = getPluginStatus(plugin);
        switch (filterType) {
          case 'installed':
            return tenantPlugins.some(tp => tp.plugin_key === plugin.key);
          case 'active':
            return status === 'active';
          case 'updates':
            return false;
          default:
            return true;
        }
      });
    }

    return plugins;
  }, [searchQuery, filterType, categoryFilter, tenantPlugins, getPluginStatus]);

  const stats = useMemo(() => {
    const installed = tenantPlugins.length;
    const active = tenantPlugins.filter(tp => tp.enabled).length;
    const inactive = tenantPlugins.filter(tp => !tp.enabled).length;
    
    return {
      total: PLUGIN_REGISTRY.length,
      installed,
      active,
      inactive,
      updates: 0,
    };
  }, [tenantPlugins]);

  if (loading && isInitialLoad) {
    return (
      <div className="plugin-page-container">
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center animate-fade-in">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: 'var(--primary)' }} />
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              {!auth.ready ? 'Authenticating...' : 'Loading plugins...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Subtle Background Pattern */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.015] dark:opacity-[0.02]" style={{
        backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
        backgroundSize: '32px 32px',
        color: 'var(--foreground)',
      }} />

      <div className="plugin-page-container">
        {/* Header */}
        <div className="flex items-start justify-between mb-8 animate-slide-up" style={{ animationDelay: '0ms' }}>
          <div className="flex-1">
            <h1 className="text-[32px] font-semibold leading-tight mb-2" style={{ color: 'var(--foreground)' }}>
              Plugins
            </h1>
            <p className="text-[15px] leading-relaxed max-w-2xl" style={{ color: 'var(--muted-foreground)' }}>
              Manage and extend your news platform with powerful integrations, tools, and publishing capabilities.
            </p>
          </div>
          <div className="flex items-center gap-2 ml-6">
            <button
              className="px-4 py-2 rounded-lg border text-sm font-medium flex items-center gap-2 transition-all hover:border-slate-400 dark:hover:border-slate-500 hover:shadow-sm"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
            >
              <Plus className="w-4 h-4" />
              Add Plugin
            </button>
            <button
              className="p-2 rounded-lg border transition-all hover:border-slate-400 dark:hover:border-slate-500 hover:shadow-sm"
              style={{ borderColor: 'var(--border)' }}
            >
              <MoreVertical className="w-4 h-4" style={{ color: 'var(--foreground)' }} />
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div 
          className="flex items-center gap-6 px-5 py-4 rounded-xl border mb-6 animate-slide-up backdrop-blur-sm"
          style={{ 
            borderColor: 'var(--border)', 
            background: 'var(--card)',
            animationDelay: '50ms'
          }}
        >
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums" style={{ color: 'var(--foreground)' }}>{stats.total}</span>
            <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Plugins</span>
          </div>
          <div className="h-6 w-px" style={{ background: 'var(--border)' }} />
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums text-green-600">{stats.active}</span>
            <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Active</span>
          </div>
          <div className="h-6 w-px" style={{ background: 'var(--border)' }} />
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums text-slate-500">{stats.inactive}</span>
            <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Inactive</span>
          </div>
          {stats.updates > 0 && (
            <>
              <div className="h-6 w-px" style={{ background: 'var(--border)' }} />
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold tabular-nums" style={{ color: 'var(--primary)' }}>{stats.updates}</span>
                <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Updates</span>
              </div>
            </>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="flex items-start gap-3 p-4 rounded-lg border border-red-200 dark:border-red-800 mb-6 animate-slide-up" 
            style={{ background: 'var(--card)', animationDelay: '100ms' }}
          >
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mt-0.5">
              <X className="w-3 h-3 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-red-900 dark:text-red-100">Unable to load plugin state</p>
              <p className="text-sm mt-1 text-red-700 dark:text-red-300">
                {error}
              </p>
              <p className="text-xs mt-1 text-red-500 dark:text-red-400">
                If this is your first time using Plugins, run the database migration in Supabase Dashboard.
              </p>
            </div>
            <button
              onClick={() => auth.profile?.owned_tenant_id ? loadTenantPlugins() : undefined}
              disabled={!auth.profile?.owned_tenant_id}
              className="text-sm font-medium text-red-600 dark:text-red-400 hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Retry
            </button>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 mb-5 animate-slide-up" style={{ animationDelay: '150ms' }}>
          <div className="flex-1 flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--muted-foreground)' }} />
              <input
                type="text"
                placeholder="Search plugins..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all"
                style={{
                  background: 'var(--background)',
                  borderColor: 'var(--border)',
                  color: 'var(--foreground)',
                  '--tw-ring-color': 'var(--primary)',
                } as React.CSSProperties}
              />
            </div>
            <div className="flex items-center gap-2">
              {(['all', 'installed', 'active', 'updates'] as FilterType[]).map(type => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    filterType === type 
                      ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm' 
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  style={filterType !== type ? { color: 'var(--muted-foreground)' } : {}}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as PluginCategory | 'all')}
                className="pl-3 pr-9 py-1.5 rounded-lg border text-sm font-medium appearance-none cursor-pointer transition-all hover:border-slate-400 dark:hover:border-slate-500"
                style={{
                  background: 'var(--background)',
                  borderColor: 'var(--border)',
                  color: 'var(--foreground)',
                }}
              >
                <option value="all">All categories</option>
                {PLUGIN_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--muted-foreground)' }} />
            </div>
            <div className="flex items-center border rounded-lg overflow-hidden" style={{ borderColor: 'var(--border)' }}>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 transition-all ${viewMode === 'grid' ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-900'}`}
                title="Grid view"
              >
                <Grid3x3 className="w-4 h-4" style={{ color: 'var(--foreground)' }} />
              </button>
              <div className="w-px h-5" style={{ background: 'var(--border)' }} />
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 transition-all ${viewMode === 'list' ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-900'}`}
                title="List view"
              >
                <List className="w-4 h-4" style={{ color: 'var(--foreground)' }} />
              </button>
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="relative mb-6 animate-slide-up" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                categoryFilter === 'all' 
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm' 
                  : 'border hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm'
              }`}
              style={categoryFilter !== 'all' ? { borderColor: 'var(--border)', color: 'var(--foreground)' } : {}}
            >
              All
            </button>
            {PLUGIN_CATEGORIES.map(cat => (
              <button
                key={cat.value}
                onClick={() => setCategoryFilter(cat.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  categoryFilter === cat.value 
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm' 
                    : 'border hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm'
                }`}
                style={categoryFilter !== cat.value ? { borderColor: 'var(--border)', color: 'var(--foreground)' } : {}}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Plugin Grid */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPlugins.map((plugin, index) => (
              <PluginCard
                key={plugin.key}
                plugin={plugin}
                status={getPluginStatus(plugin)}
                onToggle={togglePlugin}
                onDetails={() => {
                  setSelectedPlugin(plugin);
                  setShowDrawer(true);
                }}
                index={index}
              />
            ))}
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <div className="animate-fade-in">
            <PluginListView
              plugins={filteredPlugins}
              getStatus={getPluginStatus}
              onToggle={togglePlugin}
              onDetails={(plugin) => {
                setSelectedPlugin(plugin);
                setShowDrawer(true);
              }}
            />
          </div>
        )}

        {/* No Results */}
        {filteredPlugins.length === 0 && (
          <div className="text-center py-20 animate-fade-in">
            <div className="w-14 h-14 rounded-xl mx-auto mb-4 flex items-center justify-center transition-all" 
              style={{ background: 'var(--muted)' }}
            >
              <Search className="w-7 h-7" style={{ color: 'var(--muted-foreground)' }} />
            </div>
            <p className="text-base font-medium mb-1" style={{ color: 'var(--foreground)' }}>No plugins found</p>
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              Try adjusting your search or filters
            </p>
          </div>
        )}

        {/* Details Drawer */}
        {showDrawer && selectedPlugin && (
          <PluginDrawer
            plugin={selectedPlugin}
            status={getPluginStatus(selectedPlugin)}
            onClose={() => {
              setShowDrawer(false);
              setTimeout(() => setSelectedPlugin(null), 300);
            }}
            onToggle={() => {
              togglePlugin(selectedPlugin);
              setShowDrawer(false);
            }}
          />
        )}
      </div>

      <style>{`
        .plugin-page-container {
          padding: 32px 40px;
          max-width: 1600px;
          margin: 0 auto;
        }

        @media (max-width: 1024px) {
          .plugin-page-container {
            padding: 24px 32px;
          }
        }

        @media (max-width: 768px) {
          .plugin-page-container {
            padding: 20px 16px;
          }
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate-slide-up {
          animation: slide-up 0.4s ease-out backwards;
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }

        .scrollbar-thin::-webkit-scrollbar {
          height: 6px;
        }

        .scrollbar-thin::-webkit-scrollbar-track {
          background: var(--muted);
          border-radius: 3px;
        }

        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: var(--border);
          border-radius: 3px;
        }

        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: var(--muted-foreground);
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-slide-up,
          .animate-fade-in,
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </>
  );
}

// Plugin Card Component with Motion
function PluginCard({ 
  plugin, 
  status, 
  onToggle, 
  onDetails,
  index
}: { 
  plugin: Plugin; 
  status: 'active' | 'inactive' | 'available';
  onToggle: (plugin: Plugin) => void;
  onDetails: () => void;
  index: number;
}) {
  const IconComponent = getPluginIcon(plugin.key);
  const isActive = status === 'active';
  const isInstalled = status !== 'available';

  return (
    <div
      className="plugin-card group"
      style={{
        background: 'var(--card)',
        borderColor: 'var(--border)',
        animationDelay: `${250 + index * 50}ms`,
      }}
    >
      {/* Icon and Status */}
      <div className="flex items-start justify-between mb-4">
        <div 
          className="plugin-icon-container"
          style={{ borderColor: 'var(--border)', background: 'var(--background)' }}
        >
          <IconComponent size={24} className="text-slate-700 dark:text-slate-300 transition-transform group-hover:scale-105" />
        </div>
        <div className="flex items-center gap-1.5">
          {isActive && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 dark:text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-600 dark:bg-green-400 animate-pulse" />
              Active
            </span>
          )}
          {status === 'inactive' && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              Inactive
            </span>
          )}
          {status === 'available' && !plugin.isImplemented && (
            <span className="inline-flex items-center text-xs font-medium text-slate-500 dark:text-slate-400">
              Coming soon
            </span>
          )}
        </div>
      </div>

      {/* Plugin Info */}
      <div className="mb-4">
        <h3 className="text-base font-semibold mb-1.5 line-clamp-1" style={{ color: 'var(--foreground)' }}>
          {plugin.name}
        </h3>
        <p className="text-sm leading-relaxed line-clamp-2" style={{ color: 'var(--muted-foreground)' }}>
          {plugin.description}
        </p>
      </div>

      {/* Metadata */}
      <div className="flex items-center gap-3 mb-4 text-xs" style={{ color: 'var(--muted-foreground)' }}>
        <span>{PLUGIN_CATEGORIES.find(c => c.value === plugin.category)?.label || plugin.category}</span>
        <span>·</span>
        <span className="tabular-nums">v{plugin.version}</span>
      </div>

      <div className="h-px mb-4" style={{ background: 'var(--border)' }} />

      {/* Developer */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
          Built by {plugin.developer}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {plugin.isImplemented ? (
          <>
            {isInstalled && plugin.hasConfiguration && plugin.configurationRoute && (
              <button
                onClick={() => {
                  window.history.pushState({}, '', plugin.configurationRoute);
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
                className="flex-1 px-3 py-2 rounded-md border text-sm font-medium transition-all hover:border-slate-400 dark:hover:border-slate-500 hover:shadow-sm"
                style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
              >
                Configure
              </button>
            )}
            <button
              onClick={() => onToggle(plugin)}
              className="flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all hover:shadow-sm"
              style={{
                background: isActive ? 'var(--muted)' : 'var(--primary)',
                color: isActive ? 'var(--foreground)' : '#fff',
              }}
            >
              {isActive ? 'Disable' : 'Enable'}
            </button>
            <button
              onClick={onDetails}
              className="p-2 rounded-md border transition-all hover:border-slate-400 dark:hover:border-slate-500 hover:shadow-sm"
              style={{ borderColor: 'var(--border)' }}
              title="Details"
            >
              <Info className="w-4 h-4" style={{ color: 'var(--foreground)' }} />
            </button>
          </>
        ) : (
          <>
            <button
              disabled
              className="flex-1 px-3 py-2 rounded-md text-sm font-medium cursor-not-allowed"
              style={{
                background: '#8B4513',
                color: '#ffffff',
                opacity: 0.9,
                border: 'none',
              }}
              title="This plugin is under development"
            >
              Coming Soon
            </button>
            <button
              onClick={onDetails}
              className="p-2 rounded-md border transition-all hover:border-slate-400 dark:hover:border-slate-500 hover:shadow-sm"
              style={{ borderColor: 'var(--border)' }}
              title="Details"
            >
              <Info className="w-4 h-4" style={{ color: 'var(--foreground)' }} />
            </button>
          </>
        )}
      </div>

      {!plugin.isImplemented && (
        <div className="mt-3 text-xs px-3 py-2 rounded text-center leading-relaxed" style={{
          background: 'var(--muted)',
          color: 'var(--muted-foreground)',
        }}>
          This plugin is under development and will be available in a future release.
        </div>
      )}
    </div>
  );
}

// List View - Compact implementation
function PluginListView({ plugins, getStatus, onToggle, onDetails }: any) {
  return (
    <div className="border rounded-xl overflow-hidden animate-fade-in" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
      <table className="w-full">
        <thead>
          <tr className="border-b" style={{ borderColor: 'var(--border)', background: 'var(--muted)' }}>
            <th className="text-left px-5 py-3 text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>Plugin</th>
            <th className="text-left px-5 py-3 text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>Category</th>
            <th className="text-left px-5 py-3 text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>Status</th>
            <th className="text-right px-5 py-3 text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {plugins.map((plugin: Plugin) => {
            const status = getStatus(plugin);
            const IconComponent = getPluginIcon(plugin.key);
            const isActive = status === 'active';
            
            return (
              <tr key={plugin.key} className="border-b transition-colors hover:bg-slate-50 dark:hover:bg-slate-900" style={{ borderColor: 'var(--border)' }}>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-lg border flex items-center justify-center flex-shrink-0"
                      style={{ borderColor: 'var(--border)', background: 'var(--background)' }}
                    >
                      <IconComponent size={20} className="text-slate-700 dark:text-slate-300" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>{plugin.name}</div>
                      <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--muted-foreground)' }}>{plugin.description}</div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm" style={{ color: 'var(--muted-foreground)' }}>
                  {PLUGIN_CATEGORIES.find(c => c.value === plugin.category)?.label}
                </td>
                <td className="px-5 py-4">
                  {isActive && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 dark:text-green-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-600 dark:bg-green-400" />
                      Active
                    </span>
                  )}
                  {status === 'inactive' && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                      Inactive
                    </span>
                  )}
                  {status === 'available' && (
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {plugin.isImplemented ? 'Available' : 'Coming soon'}
                    </span>
                  )}
                </td>
                <td className="px-5 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {plugin.isImplemented ? (
                      <button
                        onClick={() => onToggle(plugin)}
                        className="px-3 py-1.5 rounded text-xs font-medium transition-all hover:shadow-sm"
                        style={{
                          background: isActive ? 'var(--muted)' : 'var(--primary)',
                          color: isActive ? 'var(--foreground)' : '#fff',
                        }}
                      >
                        {isActive ? 'Disable' : 'Enable'}
                      </button>
                    ) : (
                      <button
                        disabled
                        className="px-3 py-1.5 rounded text-xs font-medium cursor-not-allowed"
                        style={{
                          background: '#8B4513',
                          color: '#ffffff',
                          opacity: 0.9,
                          border: 'none',
                        }}
                        title="This plugin is under development"
                      >
                        Coming Soon
                      </button>
                    )}
                    <button
                      onClick={() => onDetails(plugin)}
                      className="p-1.5 rounded transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Details"
                    >
                      <Info className="w-4 h-4" style={{ color: 'var(--foreground)' }} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Drawer - with smooth animation
function PluginDrawer({ plugin, status, onClose, onToggle }: any) {
  const IconComponent = getPluginIcon(plugin.key);
  const isActive = status === 'active';

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      
      <div 
        className="fixed right-0 top-0 h-full w-full max-w-md shadow-2xl z-50 overflow-y-auto drawer-slide-in"
        style={{ background: 'var(--background)' }}
      >
        <div className="p-6">
          <div className="flex items-start justify-between mb-6">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
              Plugin Details
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" style={{ color: 'var(--foreground)' }} />
            </button>
          </div>

          <div className="mb-6">
            <div 
              className="w-16 h-16 rounded-xl border flex items-center justify-center mb-4"
              style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
            >
              <IconComponent size={32} className="text-slate-700 dark:text-slate-300" />
            </div>
            <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
              {plugin.name}
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
              {plugin.description}
            </p>
          </div>

          <div className="mb-6">
            {isActive && (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300">
                <span className="w-2 h-2 rounded-full bg-green-600 dark:bg-green-400 animate-pulse" />
                Active
              </span>
            )}
            {status === 'inactive' && (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                Inactive
              </span>
            )}
            {status === 'available' && (
              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                Available
              </span>
            )}
          </div>

          {plugin.features.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--foreground)' }}>
                Features
              </h4>
              <ul className="space-y-2">
                {plugin.features.map((feature: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <span style={{ color: 'var(--muted-foreground)' }}>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {plugin.requirements && plugin.requirements.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--foreground)' }}>
                Requirements
              </h4>
              <ul className="space-y-2">
                {plugin.requirements.map((req: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--primary)' }} />
                    <span style={{ color: 'var(--muted-foreground)' }}>{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {plugin.isImplemented ? (
            <button
              onClick={onToggle}
              className="w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all hover:shadow-sm"
              style={{
                background: isActive ? 'var(--muted)' : 'var(--primary)',
                color: isActive ? 'var(--foreground)' : '#fff',
              }}
            >
              {isActive ? 'Deactivate Plugin' : 'Activate Plugin'}
            </button>
          ) : (
            <button
              disabled
              className="w-full px-4 py-2.5 rounded-lg text-sm font-medium cursor-not-allowed"
              style={{
                background: '#8B4513',
                color: '#ffffff',
                opacity: 0.9,
                border: 'none',
              }}
              title="This plugin is under development"
            >
              Coming Soon
            </button>
          )}

          <div className="mt-6 pt-6 border-t space-y-3" style={{ borderColor: 'var(--border)' }}>
            <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--foreground)' }}>
              Plugin Information
            </h4>
            <div className="flex justify-between text-sm">
              <span style={{ color: 'var(--muted-foreground)' }}>Version</span>
              <span className="tabular-nums" style={{ color: 'var(--foreground)' }}>v{plugin.version}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span style={{ color: 'var(--muted-foreground)' }}>Developer</span>
              <span style={{ color: 'var(--foreground)' }}>{plugin.developer}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span style={{ color: 'var(--muted-foreground)' }}>Category</span>
              <span style={{ color: 'var(--foreground)' }}>
                {PLUGIN_CATEGORIES.find(c => c.value === plugin.category)?.label}
              </span>
            </div>
            {!plugin.isImplemented && (
              <div className="mt-4 p-3 rounded-lg text-sm text-center leading-relaxed" style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}>
                This plugin is under development and will be available in a future release.
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
