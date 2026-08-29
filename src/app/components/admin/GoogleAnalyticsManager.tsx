/**
 * Google Analytics Manager Component (OAuth-based)
 * 
 * Customer-friendly GA4 integration using Google OAuth 2.0.
 * No manual Measurement ID required - automatically detected from GA4 property.
 * 
 * User Flow:
 * 1. Click "Connect Google Analytics"
 * 2. Google OAuth consent screen
 * 3. Automatic property/data stream detection
 * 4. Measurement ID automatically retrieved
 * 5. Connected ✓ with property card
 * 6. Configure tracking options
 */

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Save, RefreshCw, CheckCircle2, XCircle, Info, BarChart3, Settings as SettingsIcon } from 'lucide-react';
import { getSupabaseClient } from '../../../lib/supabase';
import { useAuth } from '../../lib/auth';
import {
  connectGA4,
  getGA4ConnectionStatus,
  syncGA4Property,
  disconnectGA4,
  checkGA4OAuthCallback,
  getGA4ErrorMessage,
  type GA4ConnectionStatus,
} from '../../lib/ga4';

interface TrackingConfig {
  track_page_views: boolean;
  track_article_views: boolean;
  track_search: boolean;
  consent_mode: boolean;
  debug_mode: boolean;
}

interface PluginConfig {
  tracking_settings: TrackingConfig;
}

const DEFAULT_CONFIG: PluginConfig = {
  tracking_settings: {
    track_page_views: true,
    track_article_views: true,
    track_search: true,
    consent_mode: false,
    debug_mode: false,
  },
};

export function GoogleAnalyticsManager() {
  const auth = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<GA4ConnectionStatus | null>(null);
  const [config, setConfig] = useState<PluginConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [pluginEnabled, setPluginEnabled] = useState(false);

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
      const status = await getGA4ConnectionStatus();
      setConnectionStatus(status);

      // Load plugin configuration
      const { data, error } = await supabase
        .from('tenant_plugins')
        .select('enabled, configuration')
        .eq('tenant_id', tenantId)
        .eq('plugin_key', 'google-analytics')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPluginEnabled(data.enabled);
        if (data.configuration) {
          setConfig({ ...DEFAULT_CONFIG, ...data.configuration });
        }
      }
    } catch (error: any) {
      console.error('[GA4 Manager] Error loading data:', error);
      setMessage({ type: 'error', text: `Failed to load: ${error.message}` });
    } finally {
      setLoading(false);
    }
  }, [auth.ready, auth.profile?.owned_tenant_id]);

  // Check OAuth callback on mount
  useEffect(() => {
    const callback = checkGA4OAuthCallback();

    if (callback.success) {
      setMessage({ type: 'success', text: 'Google Analytics connected successfully!' });
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      // Reload data
      setTimeout(() => loadData(), 500);
    } else if (callback.error) {
      setMessage({ type: 'error', text: getGA4ErrorMessage(callback.error) });
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (callback.selectProperty) {
      // Multiple properties detected - Phase 1: just show message
      setMessage({ 
        type: 'info', 
        text: 'Multiple GA4 properties found. The first web data stream was automatically selected. Use "Sync Property" to refresh if needed.' 
      });
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Connect Google Analytics
  const handleConnect = async () => {
    setConnecting(true);
    setMessage(null);

    try {
      await connectGA4();
      // Will redirect to Google OAuth
    } catch (error: any) {
      console.error('[GA4 Manager] Connect error:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to connect Google Analytics' });
      setConnecting(false);
    }
  };

  // Sync property data
  const handleSync = async () => {
    setSyncing(true);
    setMessage(null);

    try {
      const result = await syncGA4Property();
      
      setMessage({ 
        type: 'success', 
        text: `Property synced successfully! Measurement ID: ${result.measurement_id}` 
      });

      // Reload data
      await loadData();
    } catch (error: any) {
      console.error('[GA4 Manager] Sync error:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to sync GA4 property' });
    } finally {
      setSyncing(false);
    }
  };

  // Disconnect Google Analytics
  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Google Analytics? You can reconnect anytime.')) {
      return;
    }

    setMessage(null);

    try {
      await disconnectGA4();
      setMessage({ type: 'success', text: 'Google Analytics disconnected successfully' });
      
      // Reload data
      await loadData();
    } catch (error: any) {
      console.error('[GA4 Manager] Disconnect error:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to disconnect Google Analytics' });
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
        .eq('plugin_key', 'google-analytics')
        .maybeSingle();

      const payload = {
        tenant_id: tenantId,
        plugin_key: 'google-analytics',
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
      console.error('[GA4 Manager] Save error:', error);
      setMessage({ type: 'error', text: `Failed to save: ${error.message}` });
    } finally {
      setSaving(false);
    }
  };

  // Update tracking config helper
  const updateTrackingConfig = (updates: Partial<TrackingConfig>) => {
    setConfig(prev => ({
      ...prev,
      tracking_settings: { ...prev.tracking_settings, ...updates }
    }));
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
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-blue-600" />
            Google Analytics 4
          </h1>
          <p className="text-gray-600 mt-2">
            Connect your Google Analytics account to automatically track website activity
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
              <BarChart3 className="h-12 w-12 text-blue-600" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Connect Google Analytics</h2>
            <p className="text-gray-600">
              Connect securely with Google OAuth. No manual Measurement ID required.
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
                <BarChart3 className="h-6 w-6" />
                Connect Google Analytics
              </>
            )}
          </button>
          <p className="text-sm text-gray-500">
            You'll be redirected to Google to authorize access
          </p>
        </div>
      ) : (
        <>
          {/* Connected Property Card */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 bg-white rounded-lg p-3 shadow-md">
                <BarChart3 className="h-12 w-12 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm font-medium text-green-700">Google Analytics Connected</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">
                  {connection.property_display_name}
                </h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-semibold text-gray-700">Website:</span>{' '}
                    <span className="text-gray-900">{connection.data_stream_url}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Measurement ID:</span>{' '}
                    <code className="bg-white px-2 py-1 rounded border border-blue-200 text-blue-700 font-mono">
                      {connection.measurement_id}
                    </code>
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
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Sync Property
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
        </>
      )}

      {/* Configuration */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <SettingsIcon className="h-5 w-5" />
          Tracking Settings
        </h2>

        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="font-medium text-gray-900">Enable Analytics Tracking</label>
            <p className="text-sm text-gray-600">
              {isConnected ? 'Start tracking with your connected GA4 property' : 'Connect Google Analytics first to enable tracking'}
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

        {/* Tracking Options */}
        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-medium text-gray-900">Tracking Options</h3>

          <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={config.tracking_settings.track_page_views}
              onChange={(e) => updateTrackingConfig({ track_page_views: e.target.checked })}
              disabled={!pluginEnabled}
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <div>
              <div className="font-medium text-gray-900">Track Page Views</div>
              <div className="text-sm text-gray-600">Automatically track when users visit pages</div>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={config.tracking_settings.track_article_views}
              onChange={(e) => updateTrackingConfig({ track_article_views: e.target.checked })}
              disabled={!pluginEnabled}
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <div>
              <div className="font-medium text-gray-900">Track Article Views</div>
              <div className="text-sm text-gray-600">Track article views with article ID and title</div>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={config.tracking_settings.track_search}
              onChange={(e) => updateTrackingConfig({ track_search: e.target.checked })}
              disabled={!pluginEnabled}
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <div>
              <div className="font-medium text-gray-900">Track Search</div>
              <div className="text-sm text-gray-600">Track search queries and result counts</div>
            </div>
          </label>
        </div>

        {/* Privacy Settings */}
        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-medium text-gray-900">Privacy Settings</h3>

          <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={config.tracking_settings.consent_mode}
              onChange={(e) => updateTrackingConfig({ consent_mode: e.target.checked })}
              disabled={!pluginEnabled}
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <div>
              <div className="font-medium text-gray-900">Enable Consent Mode</div>
              <div className="text-sm text-gray-600">Respect user consent choices for analytics tracking</div>
            </div>
          </label>
        </div>

        {/* Debug Settings */}
        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-medium text-gray-900">Developer Settings</h3>

          <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={config.tracking_settings.debug_mode}
              onChange={(e) => updateTrackingConfig({ debug_mode: e.target.checked })}
              disabled={!pluginEnabled}
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <div>
              <div className="font-medium text-gray-900">Debug Mode</div>
              <div className="text-sm text-gray-600">Enable debug logging in browser console (development only)</div>
            </div>
          </label>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-2">How it works</p>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              <li>Click "Connect Google Analytics" to start</li>
              <li>Sign in with your Google account</li>
              <li>Authorize Analytics access (read-only)</li>
              <li>Your GA4 property will be automatically detected</li>
              <li>Measurement ID is retrieved automatically from your data stream</li>
              <li>Enable tracking to start sending events to GA4</li>
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
