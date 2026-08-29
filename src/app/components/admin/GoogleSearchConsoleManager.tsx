/**
 * Google Search Console Manager Component (OAuth-based)
 * 
 * Customer-friendly GSC integration using Google OAuth 2.0.
 * No manual API keys required - automatically connects to verified property.
 * 
 * User Flow:
 * 1. Click "Connect Google Search Console"
 * 2. Google OAuth consent screen
 * 3. Automatic property detection (verified sites only)
 * 4. Property selection if multiple sites found
 * 5. Connected ✓ with property card
 * 6. View search performance data
 * 7. Sync data on demand
 */

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Save, RefreshCw, CheckCircle2, XCircle, Info, Search, TrendingUp, Settings as SettingsIcon, ExternalLink, Calendar } from 'lucide-react';
import { getSupabaseClient } from '../../../lib/supabase';
import { useAuth } from '../../lib/auth';
import {
  connectGSC,
  getGSCConnectionStatus,
  syncGSCData,
  disconnectGSC,
  checkGSCOAuthCallback,
  getGSCErrorMessage,
  type GSCConnectionStatus,
  type GSCSyncResult,
} from '../../lib/gsc';

interface PerformanceData {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  date_range: {
    start: string;
    end: string;
  };
}

interface QueryData {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface PageData {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface PluginConfig {
  date_range: string;
  show_top_queries: boolean;
  show_top_pages: boolean;
  queries_limit: number;
  pages_limit: number;
}

const DEFAULT_CONFIG: PluginConfig = {
  date_range: 'last28days',
  show_top_queries: true,
  show_top_pages: true,
  queries_limit: 10,
  pages_limit: 10,
};

export function GoogleSearchConsoleManager() {
  const auth = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<GSCConnectionStatus | null>(null);
  const [config, setConfig] = useState<PluginConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [pluginEnabled, setPluginEnabled] = useState(false);
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [topQueries, setTopQueries] = useState<QueryData[]>([]);
  const [topPages, setTopPages] = useState<PageData[]>([]);
  const [selectedDateRange, setSelectedDateRange] = useState('last28days');

  // Load connection status and configuration
  const loadData = useCallback(async () => {
    if (!auth.ready || !auth.profile?.owned_tenant_id) {
      setLoading(false);
      return;
    }

    const tenantId = auth.profile.owned_tenant_id;
    setLoading(true);

    try {
      const supabase = getSupabaseClient();
      
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      // Load connection status
      const status = await getGSCConnectionStatus();
      setConnectionStatus(status);

      // Load plugin configuration
      const { data, error } = await supabase
        .from('tenant_plugins')
        .select('enabled, configuration')
        .eq('tenant_id', tenantId)
        .eq('plugin_key', 'google-search-console')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPluginEnabled(data.enabled);
        if (data.configuration) {
          setConfig({ ...DEFAULT_CONFIG, ...data.configuration });
          setSelectedDateRange(data.configuration.date_range || 'last28days');
        }
      }

      // Load performance data if connected
      if (status.connected) {
        await loadPerformanceData(selectedDateRange);
      }
    } catch (error: any) {
      console.error('[GSC Manager] Error loading data:', error);
      setMessage({ type: 'error', text: `Failed to load: ${error.message}` });
    } finally {
      setLoading(false);
    }
  }, [auth.ready, auth.profile?.owned_tenant_id, selectedDateRange]);

  // Load performance data
  const loadPerformanceData = async (dateRange: string) => {
    try {
      const supabase = getSupabaseClient();
      if (!supabase || !auth.profile?.owned_tenant_id) return;

      const tenantId = auth.profile.owned_tenant_id;

      // Get latest performance data from database
      const { data: perfData, error: perfError } = await supabase
        .from('gsc_performance_data')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (perfError) {
        console.error('[GSC Manager] Error loading performance data:', perfError);
        return;
      }

      if (perfData) {
        setPerformanceData({
          clicks: perfData.clicks,
          impressions: perfData.impressions,
          ctr: perfData.ctr,
          position: perfData.position,
          date_range: {
            start: perfData.date,
            end: perfData.date,
          },
        });
      }

      // Get top queries
      const { data: queriesData, error: queriesError } = await supabase
        .from('gsc_top_queries')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('clicks', { ascending: false })
        .limit(config.queries_limit);

      if (queriesError) {
        console.error('[GSC Manager] Error loading queries:', queriesError);
      } else if (queriesData) {
        setTopQueries(queriesData);
      }

      // Get top pages
      const { data: pagesData, error: pagesError } = await supabase
        .from('gsc_top_pages')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('clicks', { ascending: false })
        .limit(config.pages_limit);

      if (pagesError) {
        console.error('[GSC Manager] Error loading pages:', pagesError);
      } else if (pagesData) {
        setTopPages(pagesData);
      }
    } catch (error: any) {
      console.error('[GSC Manager] Error loading performance data:', error);
    }
  };

  // Check OAuth callback on mount
  useEffect(() => {
    const callback = checkGSCOAuthCallback();

    if (callback.success) {
      setMessage({ type: 'success', text: 'Google Search Console connected successfully!' });
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      // Reload data
      setTimeout(() => loadData(), 500);
    } else if (callback.error) {
      setMessage({ type: 'error', text: getGSCErrorMessage(callback.error) });
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (callback.selectProperty) {
      // Multiple properties detected - Phase 1: just show message
      setMessage({ 
        type: 'info', 
        text: 'Multiple Search Console properties found. The first verified property was automatically selected. Use "Sync Data" to refresh if needed.' 
      });
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Connect Google Search Console
  const handleConnect = async () => {
    setConnecting(true);
    setMessage(null);

    try {
      await connectGSC();
      // Will redirect to Google OAuth
    } catch (error: any) {
      console.error('[GSC Manager] Connect error:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to connect Google Search Console' });
      setConnecting(false);
    }
  };

  // Sync data
  const handleSync = async () => {
    setSyncing(true);
    setMessage(null);

    try {
      const result = await syncGSCData(selectedDateRange);
      
      setMessage({ 
        type: 'success', 
        text: `Data synced successfully! ${result.summary.clicks} clicks, ${result.summary.impressions} impressions` 
      });

      // Reload data
      await loadPerformanceData(selectedDateRange);
    } catch (error: any) {
      console.error('[GSC Manager] Sync error:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to sync GSC data' });
    } finally {
      setSyncing(false);
    }
  };

  // Disconnect Google Search Console
  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Google Search Console? You can reconnect anytime.')) {
      return;
    }

    setMessage(null);

    try {
      await disconnectGSC();
      setMessage({ type: 'success', text: 'Google Search Console disconnected successfully' });
      
      // Clear data
      setPerformanceData(null);
      setTopQueries([]);
      setTopPages([]);
      
      // Reload data
      await loadData();
    } catch (error: any) {
      console.error('[GSC Manager] Disconnect error:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to disconnect Google Search Console' });
    }
  };

  // Save configuration
  const handleSaveConfig = async () => {
    if (!auth.profile?.owned_tenant_id) {
      setMessage({ type: 'error', text: 'No tenant context available' });
      return;
    }

    const tenantId = auth.profile.owned_tenant_id;
    setSaving(true);
    setMessage(null);

    try {
      const supabase = getSupabaseClient();
      
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      // Check if plugin entry exists
      const { data: existing } = await supabase
        .from('tenant_plugins')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('plugin_key', 'google-search-console')
        .maybeSingle();

      const payload = {
        tenant_id: tenantId,
        plugin_key: 'google-search-console',
        enabled: pluginEnabled,
        configuration: config,
      };

      let error;

      if (existing) {
        // Update existing
        ({ error } = await supabase
          .from('tenant_plugins')
          .update(payload)
          .eq('id', existing.id));
      } else {
        // Insert new
        ({ error } = await supabase
          .from('tenant_plugins')
          .insert(payload));
      }

      if (error) throw error;

      setMessage({ type: 'success', text: 'Configuration saved successfully' });
    } catch (error: any) {
      console.error('[GSC Manager] Save error:', error);
      setMessage({ type: 'error', text: `Failed to save: ${error.message}` });
    } finally {
      setSaving(false);
    }
  };

  // Handle date range change
  const handleDateRangeChange = async (newRange: string) => {
    setSelectedDateRange(newRange);
    setConfig(prev => ({ ...prev, date_range: newRange }));
    
    if (connectionStatus?.connected) {
      await loadPerformanceData(newRange);
    }
  };

  // Format number with commas
  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  // Format percentage
  const formatPercentage = (num: number): string => {
    return `${(num * 100).toFixed(2)}%`;
  };

  // Format position
  const formatPosition = (num: number): string => {
    return num.toFixed(1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const isConnected = connectionStatus?.connected && connectionStatus.connection;
  const connection = isConnected ? connectionStatus.connection : null;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Search className="h-8 w-8 text-blue-600" />
            Google Search Console
          </h1>
          <p className="text-gray-600 mt-2">
            Connect your Google Search Console to monitor search performance and discover optimization opportunities
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Message Banner */}
      {message && (
        <div className={`border rounded-lg p-4 ${
          message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
          message.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
          'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          <div className="flex items-start gap-3">
            {message.type === 'success' && <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />}
            {message.type === 'error' && <XCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />}
            {message.type === 'info' && <Info className="h-5 w-5 flex-shrink-0 mt-0.5" />}
            <p className="text-sm">{message.text}</p>
          </div>
        </div>
      )}

      {/* Connection Status Card */}
      {!isConnected || !connection ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="bg-blue-50 rounded-full p-4">
              <Search className="h-12 w-12 text-blue-600" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Connect Google Search Console</h2>
            <p className="text-gray-600">
              Connect securely with Google OAuth. Monitor your site's search performance automatically.
            </p>
          </div>
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="inline-flex items-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-lg shadow-lg"
          >
            {connecting ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Search className="h-6 w-6" />
                Connect Google Search Console
              </>
            )}
          </button>
          <p className="text-sm text-gray-500">
            You'll be redirected to Google to authorize access (read-only)
          </p>
        </div>
      ) : (
        <>
          {/* Connected Property Card */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 bg-white rounded-lg p-3 shadow-md">
                <Search className="h-12 w-12 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm font-medium text-green-700">Search Console Connected</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">
                  {connection.property_url}
                </h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-semibold text-gray-700">Property Type:</span>{' '}
                    <span className="text-gray-900 capitalize">{connection.property_type}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Permission Level:</span>{' '}
                    <span className="text-gray-900 capitalize">{connection.permission_level}</span>
                  </div>
                </div>

                {/* Google Account */}
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Connected Google Account:</span>{' '}
                    {connection.google_account_email}
                  </p>
                  {connection.last_sync_at && (
                    <p className="text-sm text-gray-600 mt-1">
                      <span className="font-medium">Last Sync:</span>{' '}
                      {new Date(connection.last_sync_at).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6 pt-6 border-t border-blue-200">
              <button
                onClick={handleSync}
                disabled={syncing}
                className="flex items-center gap-2 px-4 py-2 bg-white text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {syncing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Syncing Data...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Sync Data
                  </>
                )}
              </button>
              <button
                onClick={handleDisconnect}
                className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                <XCircle className="h-4 w-4" />
                Disconnect
              </button>
            </div>
          </div>

          {/* Date Range Selector */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center gap-4">
              <Calendar className="h-5 w-5 text-gray-600" />
              <label className="font-medium text-gray-900">Date Range:</label>
              <select
                value={selectedDateRange}
                onChange={(e) => handleDateRangeChange(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="last7days">Last 7 Days</option>
                <option value="last28days">Last 28 Days</option>
                <option value="last90days">Last 90 Days</option>
              </select>
            </div>
          </div>

          {/* Performance Metrics */}
          {performanceData && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Total Clicks</span>
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{formatNumber(performanceData.clicks)}</p>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Total Impressions</span>
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{formatNumber(performanceData.impressions)}</p>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Average CTR</span>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{formatPercentage(performanceData.ctr)}</p>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Average Position</span>
                  <TrendingUp className="h-4 w-4 text-orange-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{formatPosition(performanceData.position)}</p>
              </div>
            </div>
          )}

          {/* Top Queries Table */}
          {config.show_top_queries && topQueries.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Search Queries</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Query</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Clicks</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Impressions</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">CTR</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Position</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topQueries.map((query, index) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-900">{query.query}</td>
                        <td className="py-3 px-4 text-sm text-gray-900 text-right">{formatNumber(query.clicks)}</td>
                        <td className="py-3 px-4 text-sm text-gray-600 text-right">{formatNumber(query.impressions)}</td>
                        <td className="py-3 px-4 text-sm text-gray-600 text-right">{formatPercentage(query.ctr)}</td>
                        <td className="py-3 px-4 text-sm text-gray-600 text-right">{formatPosition(query.position)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Top Pages Table */}
          {config.show_top_pages && topPages.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Pages</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Page</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Clicks</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Impressions</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">CTR</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Position</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topPages.map((page, index) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm">
                          <a 
                            href={page.page} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          >
                            <span className="truncate max-w-md">{page.page}</span>
                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
                          </a>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900 text-right">{formatNumber(page.clicks)}</td>
                        <td className="py-3 px-4 text-sm text-gray-600 text-right">{formatNumber(page.impressions)}</td>
                        <td className="py-3 px-4 text-sm text-gray-600 text-right">{formatPercentage(page.ctr)}</td>
                        <td className="py-3 px-4 text-sm text-gray-600 text-right">{formatPosition(page.position)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Configuration */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <SettingsIcon className="h-5 w-5" />
          Display Settings
        </h2>

        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="font-medium text-gray-900">Enable Search Console Integration</label>
            <p className="text-sm text-gray-600">
              {isConnected ? 'Display search performance data in admin dashboard' : 'Connect Google Search Console first to enable'}
            </p>
          </div>
          <button
            onClick={() => setPluginEnabled(!pluginEnabled)}
            disabled={!isConnected}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              pluginEnabled ? 'bg-indigo-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                pluginEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Display Options */}
        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-medium text-gray-900">Display Options</h3>

          <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={config.show_top_queries}
              onChange={(e) => setConfig(prev => ({ ...prev, show_top_queries: e.target.checked }))}
              disabled={!pluginEnabled}
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <div>
              <div className="font-medium text-gray-900">Show Top Search Queries</div>
              <div className="text-sm text-gray-600">Display table of top performing search queries</div>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={config.show_top_pages}
              onChange={(e) => setConfig(prev => ({ ...prev, show_top_pages: e.target.checked }))}
              disabled={!pluginEnabled}
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <div>
              <div className="font-medium text-gray-900">Show Top Pages</div>
              <div className="text-sm text-gray-600">Display table of top performing pages</div>
            </div>
          </label>

          {/* Queries Limit */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <label className="font-medium text-gray-900 block mb-2">Number of Top Queries to Display</label>
            <input
              type="number"
              min="5"
              max="50"
              value={config.queries_limit}
              onChange={(e) => setConfig(prev => ({ ...prev, queries_limit: parseInt(e.target.value) || 10 }))}
              disabled={!pluginEnabled}
              className="w-32 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
            />
          </div>

          {/* Pages Limit */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <label className="font-medium text-gray-900 block mb-2">Number of Top Pages to Display</label>
            <input
              type="number"
              min="5"
              max="50"
              value={config.pages_limit}
              onChange={(e) => setConfig(prev => ({ ...prev, pages_limit: parseInt(e.target.value) || 10 }))}
              disabled={!pluginEnabled}
              className="w-32 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-2">How it works</p>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              <li>Click "Connect Google Search Console" to start</li>
              <li>Sign in with your Google account</li>
              <li>Authorize Search Console access (read-only)</li>
              <li>Your verified website properties will be automatically detected</li>
              <li>If you have multiple properties, the first verified one is selected</li>
              <li>Click "Sync Data" to fetch latest search performance metrics</li>
              <li>View clicks, impressions, CTR, and position for your site</li>
              <li>Discover top search queries and pages driving traffic</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-end gap-4 pt-4">
        <button
          onClick={handleSaveConfig}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {saving ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              Save Configuration
            </>
          )}
        </button>
      </div>
    </div>
  );
}
