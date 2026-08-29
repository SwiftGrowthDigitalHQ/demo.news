import { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Loader2, Check, X, Settings, Info, MoreVertical, Grid3x3, List, Plus, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
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

export function PluginManagementPremium() {
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

  // Load tenant plugins
  useEffect(() => {
    if (auth.profile?.owned_tenant_id) {
      void loadTenantPlugins();
    }
  }, [auth.profile?.owned_tenant_id]);

  const loadTenantPlugins = async () => {
    try {
      setLoading(true);
      setError(null);
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase not configured');

      const { data, error: fetchError } = await supabase
        .from('tenant_plugins')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setTenantPlugins(data || []);
    } catch (err) {
      console.error('[Plugins] Failed to load:', err);
      setError(err instanceof Error ? err.message : 'Failed to load plugin state');
    } finally {
      setLoading(false);
    }
  };

  // Get plugin status
  const getPluginStatus = (plugin: Plugin): 'active' | 'inactive' | 'available' => {
    const tenantPlugin = tenantPlugins.find(tp => tp.plugin_key === plugin.key);
    if (!tenantPlugin) return 'available';
    return tenantPlugin.enabled ? 'active' : 'inactive';
  };

  // Toggle plugin enabled state
  const togglePlugin = async (plugin: Plugin) => {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase not configured');
      if (!auth.profile?.owned_tenant_id) throw new Error('No tenant context');

      const tenantPlugin = tenantPlugins.find(tp => tp.plugin_key === plugin.key);
      
      if (tenantPlugin) {
        const { error: updateError } = await supabase
          .from('tenant_plugins')
          .update({ enabled: !tenantPlugin.enabled })
          .eq('id', tenantPlugin.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('tenant_plugins')
          .insert({
            tenant_id: auth.profile.owned_tenant_id,
            plugin_key: plugin.key,
            enabled: true,
            configuration: {},
            installed_version: plugin.version,
          });

        if (insertError) throw insertError;
      }

      await loadTenantPlugins();
    } catch (err) {
      console.error('[Plugins] Failed to toggle:', err);
      alert(err instanceof Error ? err.message : 'Failed to update plugin');
    }
  };

  // Filter and search plugins
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
            return false; // No updates system yet
          default:
            return true;
        }
      });
    }

    return plugins;
  }, [searchQuery, filterType, categoryFilter, tenantPlugins]);

  // Summary stats
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: 'var(--primary)' }} />
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Loading plugins...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[32px] font-semibold leading-tight" style={{ color: 'var(--foreground)' }}>
            Plugins
          </h1>
          <p className="mt-1.5 text-[15px]" style={{ color: 'var(--muted-foreground)' }}>
            Manage and extend your news platform with powerful integrations, tools, and publishing capabilities.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-4 py-2 rounded-lg border text-sm font-medium flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
          >
            <Plus className="w-4 h-4" />
            Add Plugin
          </button>
          <button
            className="p-2 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            style={{ borderColor: 'var(--border)' }}
          >
            <MoreVertical className="w-4 h-4" style={{ color: 'var(--foreground)' }} />
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-6 px-4 py-3 rounded-lg border" style={{ 
        borderColor: 'var(--border)', 
        background: 'var(--card)' 
      }}>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold" style={{ color: 'var(--foreground)' }}>{stats.total}</span>
          <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Plugins</span>
        </div>
        <div className="h-6 w-px" style={{ background: 'var(--border)' }} />
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold text-green-600">{stats.active}</span>
          <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Active</span>
        </div>
        <div className="h-6 w-px" style={{ background: 'var(--border)' }} />
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold text-slate-500">{stats.inactive}</span>
          <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Inactive</span>
        </div>
        {stats.updates > 0 && (
          <>
            <div className="h-6 w-px" style={{ background: 'var(--border)' }} />
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold" style={{ color: 'var(--primary)' }}>{stats.updates}</span>
              <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Updates</span>
            </div>
          </>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-red-200 dark:border-red-800" style={{ background: 'var(--card)' }}>
          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mt-0.5">
            <X className="w-3 h-3 text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-red-900 dark:text-red-100">Unable to load plugin state</p>
            <p className="text-sm mt-1 text-red-700 dark:text-red-300">{error}</p>
          </div>
          <button
            onClick={() => loadTenantPlugins()}
            className="text-sm font-medium text-red-600 dark:text-red-400 hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--muted-foreground)' }} />
            <input
              type="text"
              placeholder="Search plugins..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-offset-0 transition-shadow"
              style={{
                background: 'var(--background)',
                borderColor: 'var(--border)',
                color: 'var(--foreground)',
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            {(['all', 'installed', 'active', 'updates'] as FilterType[]).map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  filterType === type 
                    ? 'bg-slate-100 dark:bg-slate-800' 
                    : 'hover:bg-slate-50 dark:hover:bg-slate-900'
                }`}
                style={filterType === type ? {} : { color: 'var(--muted-foreground)' }}
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
              className="pl-3 pr-8 py-1.5 rounded-md border text-sm font-medium appearance-none cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
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
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--muted-foreground)' }} />
          </div>
          <div className="flex items-center border rounded-md" style={{ borderColor: 'var(--border)' }}>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-l-md transition-colors ${viewMode === 'grid' ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-900'}`}
              title="Grid view"
            >
              <Grid3x3 className="w-4 h-4" style={{ color: 'var(--foreground)' }} />
            </button>
            <div className="w-px h-4" style={{ background: 'var(--border)' }} />
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-r-md transition-colors ${viewMode === 'list' ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-900'}`}
              title="List view"
            >
              <List className="w-4 h-4" style={{ color: 'var(--foreground)' }} />
            </button>
          </div>
        </div>
      </div>

      {/* Category Tabs (Horizontal Scroll) */}
      <div className="relative">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              categoryFilter === 'all' 
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900' 
                : 'border hover:border-slate-300 dark:hover:border-slate-600'
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
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900' 
                  : 'border hover:border-slate-300 dark:hover:border-slate-600'
              }`}
              style={categoryFilter !== cat.value ? { borderColor: 'var(--border)', color: 'var(--foreground)' } : {}}
            >
              <span className="mr-1.5">{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Plugin Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPlugins.map(plugin => (
            <PluginCard
              key={plugin.key}
              plugin={plugin}
              status={getPluginStatus(plugin)}
              onToggle={togglePlugin}
              onDetails={() => {
                setSelectedPlugin(plugin);
                setShowDrawer(true);
              }}
            />
          ))}
        </div>
      ) : (
        <PluginListView
          plugins={filteredPlugins}
          getStatus={getPluginStatus}
          onToggle={togglePlugin}
          onDetails={(plugin) => {
            setSelectedPlugin(plugin);
            setShowDrawer(true);
          }}
        />
      )}

      {/* No Results */}
      {filteredPlugins.length === 0 && (
        <div className="text-center py-16">
          <div className="w-12 h-12 rounded-lg mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--muted)' }}>
            <Search className="w-6 h-6" style={{ color: 'var(--muted-foreground)' }} />
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>No plugins found</p>
          <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
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
            setSelectedPlugin(null);
          }}
          onToggle={() => {
            togglePlugin(selectedPlugin);
            setShowDrawer(false);
          }}
        />
      )}
    </div>
  );
}

// Plugin Card Component
function PluginCard({ 
  plugin, 
  status, 
  onToggle, 
  onDetails 
}: { 
  plugin: Plugin; 
  status: 'active' | 'inactive' | 'available';
  onToggle: (plugin: Plugin) => void;
  onDetails: () => void;
}) {
  const IconComponent = getPluginIcon(plugin.key);
  const isActive = status === 'active';
  const isInstalled = status !== 'available';

  return (
    <div
      className="p-5 rounded-lg border hover:border-slate-300 dark:hover:border-slate-600 transition-all group"
      style={{
        background: 'var(--card)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Icon and Status */}
      <div className="flex items-start justify-between mb-4">
        <div 
          className="w-12 h-12 rounded-lg border flex items-center justify-center flex-shrink-0"
          style={{ borderColor: 'var(--border)', background: 'var(--background)' }}
        >
          <IconComponent size={24} className="text-slate-700 dark:text-slate-300" />
        </div>
        <div className="flex items-center gap-1.5">
          {isActive && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-600 dark:bg-green-400" />
              Active
            </span>
          )}
          {status === 'inactive' && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
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
        <h3 className="text-base font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>
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
        <span>v{plugin.version}</span>
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
        {plugin.isImplemented && isInstalled && plugin.hasConfiguration && plugin.configurationRoute && (
          <button
            onClick={() => window.location.hash = plugin.configurationRoute || ''}
            className="flex-1 px-3 py-2 rounded-md border text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
          >
            Configure
          </button>
        )}
        {plugin.isImplemented && (
          <button
            onClick={() => onToggle(plugin)}
            className="flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            style={{
              background: isActive ? 'var(--muted)' : 'var(--primary)',
              color: isActive ? 'var(--foreground)' : '#fff',
            }}
          >
            {isActive ? 'Disable' : 'Enable'}
          </button>
        )}
        <button
          onClick={onDetails}
          className="p-2 rounded-md border hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          style={{ borderColor: 'var(--border)' }}
          title="Details"
        >
          <Info className="w-4 h-4" style={{ color: 'var(--foreground)' }} />
        </button>
      </div>

      {!plugin.isImplemented && (
        <div className="mt-3 text-xs px-2 py-1.5 rounded" style={{
          background: 'var(--muted)',
          color: 'var(--muted-foreground)',
        }}>
          Backend functionality coming in future release
        </div>
      )}
    </div>
  );
}

// Plugin List View Component
function PluginListView({ 
  plugins, 
  getStatus, 
  onToggle, 
  onDetails 
}: {
  plugins: Plugin[];
  getStatus: (plugin: Plugin) => 'active' | 'inactive' | 'available';
  onToggle: (plugin: Plugin) => void;
  onDetails: (plugin: Plugin) => void;
}) {
  return (
    <div className="border rounded-lg overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
      <table className="w-full">
        <thead>
          <tr className="border-b" style={{ borderColor: 'var(--border)', background: 'var(--muted)' }}>
            <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>Plugin</th>
            <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>Category</th>
            <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>Version</th>
            <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>Status</th>
            <th className="text-right px-4 py-3 text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {plugins.map(plugin => {
            const status = getStatus(plugin);
            const IconComponent = getPluginIcon(plugin.key);
            const isActive = status === 'active';
            
            return (
              <tr key={plugin.key} className="border-b hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors" style={{ borderColor: 'var(--border)' }}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-lg border flex items-center justify-center flex-shrink-0"
                      style={{ borderColor: 'var(--border)', background: 'var(--background)' }}
                    >
                      <IconComponent size={20} className="text-slate-700 dark:text-slate-300" />
                    </div>
                    <div>
                      <div className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{plugin.name}</div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{plugin.description}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--muted-foreground)' }}>
                  {PLUGIN_CATEGORIES.find(c => c.value === plugin.category)?.label}
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--muted-foreground)' }}>
                  v{plugin.version}
                </td>
                <td className="px-4 py-3">
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
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {plugin.isImplemented && (
                      <button
                        onClick={() => onToggle(plugin)}
                        className="px-3 py-1 rounded text-xs font-medium transition-colors"
                        style={{
                          background: isActive ? 'var(--muted)' : 'var(--primary)',
                          color: isActive ? 'var(--foreground)' : '#fff',
                        }}
                      >
                        {isActive ? 'Disable' : 'Enable'}
                      </button>
                    )}
                    <button
                      onClick={() => onDetails(plugin)}
                      className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
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

// Plugin Drawer Component
function PluginDrawer({
  plugin,
  status,
  onClose,
  onToggle
}: {
  plugin: Plugin;
  status: 'active' | 'inactive' | 'available';
  onClose: () => void;
  onToggle: () => void;
}) {
  const IconComponent = getPluginIcon(plugin.key);
  const isActive = status === 'active';

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div 
        className="fixed right-0 top-0 h-full w-full max-w-md shadow-2xl z-50 overflow-y-auto"
        style={{ background: 'var(--background)' }}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
              Plugin Details
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" style={{ color: 'var(--foreground)' }} />
            </button>
          </div>

          {/* Plugin Header */}
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

          {/* Status */}
          <div className="mb-6">
            {isActive && (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300">
                <span className="w-2 h-2 rounded-full bg-green-600 dark:bg-green-400" />
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

          {/* Features */}
          {plugin.features.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--foreground)' }}>
                Features
              </h4>
              <ul className="space-y-2">
                {plugin.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <span style={{ color: 'var(--muted-foreground)' }}>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Requirements */}
          {plugin.requirements && plugin.requirements.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--foreground)' }}>
                Requirements
              </h4>
              <ul className="space-y-2">
                {plugin.requirements.map((req, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--primary)' }} />
                    <span style={{ color: 'var(--muted-foreground)' }}>{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action */}
          {plugin.isImplemented && (
            <button
              onClick={onToggle}
              className="w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: isActive ? 'var(--muted)' : 'var(--primary)',
                color: isActive ? 'var(--foreground)' : '#fff',
              }}
            >
              {isActive ? 'Deactivate Plugin' : 'Activate Plugin'}
            </button>
          )}

          {/* Plugin Information */}
          <div className="mt-6 pt-6 border-t space-y-3" style={{ borderColor: 'var(--border)' }}>
            <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--foreground)' }}>
              Plugin Information
            </h4>
            <div className="flex justify-between text-sm">
              <span style={{ color: 'var(--muted-foreground)' }}>Version</span>
              <span style={{ color: 'var(--foreground)' }}>v{plugin.version}</span>
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
              <div className="mt-4 p-3 rounded-lg text-sm" style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}>
                Backend functionality will be available in a future release
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
