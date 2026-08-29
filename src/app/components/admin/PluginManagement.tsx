import { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Loader2, Check, X, Settings, Info, Package, Download } from 'lucide-react';
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

interface TenantPlugin {
  id: string;
  plugin_key: string;
  enabled: boolean;
  configuration: Record<string, unknown>;
  installed_version: string | null;
  created_at: string;
  updated_at: string;
}

type FilterType = 'all' | 'installed' | 'active' | 'inactive' | 'available';

export function PluginManagement() {
  const auth = useAuth();
  const [tenantPlugins, setTenantPlugins] = useState<TenantPlugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [categoryFilter, setCategoryFilter] = useState<PluginCategory | 'all'>('all');
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Load tenant plugins
  useEffect(() => {
    if (auth.profile?.owned_tenant_id) {
      void loadTenantPlugins();
    }
  }, [auth.profile?.owned_tenant_id]);

  const loadTenantPlugins = async () => {
    try {
      setLoading(true);
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase not configured');

      const { data, error: fetchError } = await supabase
        .from('tenant_plugins')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setTenantPlugins(data || []);
      setError(null);
    } catch (err) {
      console.error('[Plugins] Failed to load:', err);
      setError(err instanceof Error ? err.message : 'Failed to load plugins');
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
        // Update existing
        const { error: updateError } = await supabase
          .from('tenant_plugins')
          .update({ enabled: !tenantPlugin.enabled })
          .eq('id', tenantPlugin.id);

        if (updateError) throw updateError;
      } else {
        // Insert new
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

    // Apply search
    if (searchQuery.trim()) {
      plugins = searchPlugins(searchQuery);
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      plugins = getPluginsByCategory(categoryFilter);
    }

    // Apply type filter
    if (filterType !== 'all') {
      plugins = plugins.filter(plugin => {
        const status = getPluginStatus(plugin);
        switch (filterType) {
          case 'installed':
            return tenantPlugins.some(tp => tp.plugin_key === plugin.key);
          case 'active':
            return status === 'active';
          case 'inactive':
            return status === 'inactive';
          case 'available':
            return status === 'available';
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
    };
  }, [tenantPlugins]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--primary)' }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
          Plugins
        </h1>
        <p className="mt-1" style={{ color: 'var(--muted-foreground)' }}>
          Extend your news portal with powerful features.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg border" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
          <div className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>{stats.total}</div>
          <div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Total Plugins</div>
        </div>
        <div className="p-4 rounded-lg border" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
          <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          <div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Active</div>
        </div>
        <div className="p-4 rounded-lg border" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
          <div className="text-2xl font-bold text-slate-600">{stats.inactive}</div>
          <div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Inactive</div>
        </div>
        <div className="p-4 rounded-lg border" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
          <div className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>{stats.total - stats.installed}</div>
          <div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Available</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--muted-foreground)' }} />
          <input
            type="text"
            placeholder="Search plugins..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border"
            style={{
              background: 'var(--background)',
              borderColor: 'var(--border)',
              color: 'var(--foreground)',
            }}
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
              filterType === 'all' ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950' : ''
            }`}
            style={filterType !== 'all' ? {
              borderColor: 'var(--border)',
              color: 'var(--foreground)',
            } : {}}
          >
            All
          </button>
          <button
            onClick={() => setFilterType('installed')}
            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
              filterType === 'installed' ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950' : ''
            }`}
            style={filterType !== 'installed' ? {
              borderColor: 'var(--border)',
              color: 'var(--foreground)',
            } : {}}
          >
            Installed
          </button>
          <button
            onClick={() => setFilterType('active')}
            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
              filterType === 'active' ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-950' : ''
            }`}
            style={filterType !== 'active' ? {
              borderColor: 'var(--border)',
              color: 'var(--foreground)',
            } : {}}
          >
            Active
          </button>
          <button
            onClick={() => setFilterType('inactive')}
            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
              filterType === 'inactive' ? 'border-slate-500 bg-slate-50 text-slate-700 dark:bg-slate-950' : ''
            }`}
            style={filterType !== 'inactive' ? {
              borderColor: 'var(--border)',
              color: 'var(--foreground)',
            } : {}}
          >
            Inactive
          </button>
          <button
            onClick={() => setFilterType('available')}
            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
              filterType === 'available' ? 'border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-950' : ''
            }`}
            style={filterType !== 'available' ? {
              borderColor: 'var(--border)',
              color: 'var(--foreground)',
            } : {}}
          >
            Available
          </button>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4" style={{ color: 'var(--muted-foreground)' }} />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as PluginCategory | 'all')}
            className="px-3 py-1.5 rounded-lg border text-sm"
            style={{
              background: 'var(--background)',
              borderColor: 'var(--border)',
              color: 'var(--foreground)',
            }}
          >
            <option value="all">All Categories</option>
            {PLUGIN_CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>
                {cat.icon} {cat.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      {/* Plugin Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPlugins.map(plugin => {
          const status = getPluginStatus(plugin);
          const isActive = status === 'active';
          const isInstalled = tenantPlugins.some(tp => tp.plugin_key === plugin.key);

          return (
            <div
              key={plugin.key}
              className="p-6 rounded-lg border"
              style={{
                background: 'var(--card)',
                borderColor: 'var(--border)',
              }}
            >
              {/* Icon and Name */}
              <div className="flex items-start gap-3 mb-3">
                <div className="text-3xl">{plugin.icon}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold" style={{ color: 'var(--foreground)' }}>
                    {plugin.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 rounded" style={{
                      background: 'var(--muted)',
                      color: 'var(--muted-foreground)',
                    }}>
                      {PLUGIN_CATEGORIES.find(c => c.value === plugin.category)?.label}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                      v{plugin.version}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm mb-4" style={{ color: 'var(--muted-foreground)' }}>
                {plugin.description}
              </p>

              {/* Status Badge */}
              <div className="mb-4">
                {isActive && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300">
                    <Check className="w-3 h-3" /> Active
                  </span>
                )}
                {status === 'inactive' && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    <X className="w-3 h-3" /> Inactive
                  </span>
                )}
                {status === 'available' && !plugin.isImplemented && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                    <Package className="w-3 h-3" /> Coming Soon
                  </span>
                )}
                {status === 'available' && plugin.isImplemented && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                    <Download className="w-3 h-3" /> Available
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {plugin.isImplemented && (
                  <button
                    onClick={() => togglePlugin(plugin)}
                    className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{
                      background: isActive ? 'var(--muted)' : 'var(--primary)',
                      color: isActive ? 'var(--foreground)' : '#fff',
                    }}
                  >
                    {isActive ? 'Disable' : 'Enable'}
                  </button>
                )}
                
                {plugin.hasConfiguration && plugin.configurationRoute && isInstalled && (
                  <button
                    onClick={() => window.location.hash = plugin.configurationRoute || ''}
                    className="px-3 py-2 rounded-lg border text-sm font-medium"
                    style={{
                      borderColor: 'var(--border)',
                      color: 'var(--foreground)',
                    }}
                    title="Configure"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                )}
                
                <button
                  onClick={() => {
                    setSelectedPlugin(plugin);
                    setShowDetails(true);
                  }}
                  className="px-3 py-2 rounded-lg border text-sm font-medium"
                  style={{
                    borderColor: 'var(--border)',
                    color: 'var(--foreground)',
                  }}
                  title="Details"
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>

              {/* Not Implemented Notice */}
              {!plugin.isImplemented && (
                <div className="mt-3 text-xs p-2 rounded" style={{
                  background: 'var(--muted)',
                  color: 'var(--muted-foreground)',
                }}>
                  Backend functionality coming in future release
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* No Results */}
      {filteredPlugins.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--muted-foreground)' }} />
          <p style={{ color: 'var(--muted-foreground)' }}>No plugins found</p>
        </div>
      )}

      {/* Plugin Details Modal */}
      {showDetails && selectedPlugin && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowDetails(false)}
        >
          <div
            className="max-w-2xl w-full rounded-lg shadow-xl max-h-[90vh] overflow-auto"
            style={{ background: 'var(--card)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start gap-4 mb-6">
                <div className="text-5xl">{selectedPlugin.icon}</div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
                    {selectedPlugin.name}
                  </h2>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-sm px-2 py-1 rounded" style={{
                      background: 'var(--muted)',
                      color: 'var(--muted-foreground)',
                    }}>
                      {PLUGIN_CATEGORIES.find(c => c.value === selectedPlugin.category)?.label}
                    </span>
                    <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                      Version {selectedPlugin.version}
                    </span>
                    <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                      by {selectedPlugin.developer}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetails(false)}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Description */}
              <div className="mb-6">
                <h3 className="font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
                  Description
                </h3>
                <p style={{ color: 'var(--muted-foreground)' }}>
                  {selectedPlugin.description}
                </p>
              </div>

              {/* Features */}
              <div className="mb-6">
                <h3 className="font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
                  Features
                </h3>
                <ul className="space-y-1">
                  {selectedPlugin.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-600" />
                      <span style={{ color: 'var(--muted-foreground)' }}>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Requirements */}
              {selectedPlugin.requirements && selectedPlugin.requirements.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
                    Requirements
                  </h3>
                  <ul className="space-y-1">
                    {selectedPlugin.requirements.map((req, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--primary)' }} />
                        <span style={{ color: 'var(--muted-foreground)' }}>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Status */}
              <div className="mb-6">
                <h3 className="font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
                  Status
                </h3>
                <div className="flex items-center gap-2">
                  {getPluginStatus(selectedPlugin) === 'active' && (
                    <span className="inline-flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300">
                      <Check className="w-4 h-4" /> Active
                    </span>
                  )}
                  {getPluginStatus(selectedPlugin) === 'inactive' && (
                    <span className="inline-flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      <X className="w-4 h-4" /> Inactive
                    </span>
                  )}
                  {getPluginStatus(selectedPlugin) === 'available' && (
                    <span className="inline-flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                      <Download className="w-4 h-4" /> Available
                    </span>
                  )}
                  {!selectedPlugin.isImplemented && (
                    <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                      (Backend functionality coming soon)
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {selectedPlugin.isImplemented && (
                  <button
                    onClick={() => {
                      togglePlugin(selectedPlugin);
                      setShowDetails(false);
                    }}
                    className="px-4 py-2 rounded-lg text-sm font-medium"
                    style={{
                      background: getPluginStatus(selectedPlugin) === 'active' ? 'var(--muted)' : 'var(--primary)',
                      color: getPluginStatus(selectedPlugin) === 'active' ? 'var(--foreground)' : '#fff',
                    }}
                  >
                    {getPluginStatus(selectedPlugin) === 'active' ? 'Deactivate' : 'Activate'}
                  </button>
                )}
                {selectedPlugin.hasConfiguration && selectedPlugin.configurationRoute && (
                  <button
                    onClick={() => {
                      window.location.hash = selectedPlugin.configurationRoute || '';
                      setShowDetails(false);
                    }}
                    className="px-4 py-2 rounded-lg border text-sm font-medium"
                    style={{
                      borderColor: 'var(--border)',
                      color: 'var(--foreground)',
                    }}
                  >
                    Configure
                  </button>
                )}
                <button
                  onClick={() => setShowDetails(false)}
                  className="px-4 py-2 rounded-lg border text-sm font-medium"
                  style={{
                    borderColor: 'var(--border)',
                    color: 'var(--foreground)',
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
