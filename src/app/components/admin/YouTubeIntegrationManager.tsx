/**
 * YouTube Integration Manager Component (OAuth-based)
 * 
 * Customer-friendly YouTube integration using Google OAuth 2.0.
 * No API keys or technical configuration required from users.
 * 
 * User Flow:
 * 1. Click "Connect YouTube"
 * 2. Google OAuth consent screen
 * 3. Automatic channel detection
 * 4. Connected ✓ with channel card
 * 5. Sync/Disconnect options
 */

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Save, RefreshCw, CheckCircle2, XCircle, Info, Youtube, Settings as SettingsIcon, Video, Play } from 'lucide-react';
import { getSupabaseClient } from '../../../lib/supabase';
import { useAuth } from '../../lib/auth';
import {
  connectYouTube,
  getYouTubeConnectionStatus,
  syncYouTubeChannel,
  disconnectYouTube,
  getCachedVideos,
  checkYouTubeOAuthCallback,
  getYouTubeErrorMessage,
  type YouTubeConnectionStatus,
} from '../../lib/youtube';

interface DisplayConfig {
  show_channel_stats: boolean;
  show_latest_videos: boolean;
  latest_videos_limit: number;
  show_video_thumbnails: boolean;
  show_video_titles: boolean;
  show_video_dates: boolean;
  show_video_descriptions: boolean;
  show_view_counts: boolean;
}

interface SyncConfig {
  auto_sync: boolean;
  sync_interval: number;
}

interface PluginConfig {
  display_settings: DisplayConfig;
  sync_settings: SyncConfig;
}

const DEFAULT_CONFIG: PluginConfig = {
  display_settings: {
    show_channel_stats: true,
    show_latest_videos: true,
    latest_videos_limit: 5,
    show_video_thumbnails: true,
    show_video_titles: true,
    show_video_dates: true,
    show_video_descriptions: false,
    show_view_counts: true,
  },
  sync_settings: {
    auto_sync: false,
    sync_interval: 3600,
  },
};

export function YouTubeIntegrationManager() {
  const auth = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<YouTubeConnectionStatus | null>(null);
  const [config, setConfig] = useState<PluginConfig>(DEFAULT_CONFIG);
  const [cachedVideos, setCachedVideos] = useState<any[]>([]);
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
      const status = await getYouTubeConnectionStatus();
      setConnectionStatus(status);

      // Load plugin configuration
      const { data, error } = await supabase
        .from('tenant_plugins')
        .select('enabled, configuration')
        .eq('tenant_id', tenantId)
        .eq('plugin_key', 'youtube-integration')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPluginEnabled(data.enabled);
        if (data.configuration) {
          setConfig({ ...DEFAULT_CONFIG, ...data.configuration });
        }
      }

      // Load cached videos if connected
      if (status.connected) {
        const videos = await getCachedVideos(10);
        setCachedVideos(videos);
      }
    } catch (error: any) {
      console.error('[YouTube Manager] Error loading data:', error);
      setMessage({ type: 'error', text: `Failed to load: ${error.message}` });
    } finally {
      setLoading(false);
    }
  }, [auth.ready, auth.profile?.owned_tenant_id]);

  // Check OAuth callback on mount
  useEffect(() => {
    const callback = checkYouTubeOAuthCallback();

    if (callback.success) {
      setMessage({ type: 'success', text: 'YouTube connected successfully!' });
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      // Reload data
      setTimeout(() => loadData(), 500);
    } else if (callback.error) {
      setMessage({ type: 'error', text: getYouTubeErrorMessage(callback.error) });
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (callback.selectChannel) {
      // Multiple channels detected - Phase 1: just show message
      setMessage({ 
        type: 'info', 
        text: 'Multiple YouTube channels found. Please contact support to select your channel.' 
      });
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Connect YouTube
  const handleConnect = async () => {
    setConnecting(true);
    setMessage(null);

    try {
      await connectYouTube();
      // Will redirect to Google OAuth
    } catch (error: any) {
      console.error('[YouTube Manager] Connect error:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to connect YouTube' });
      setConnecting(false);
    }
  };

  // Sync channel data
  const handleSync = async () => {
    setSyncing(true);
    setMessage(null);

    try {
      const result = await syncYouTubeChannel(config.display_settings.latest_videos_limit);
      
      setMessage({ 
        type: 'success', 
        text: `Synced successfully! Retrieved ${result.videos.length} latest videos.` 
      });

      // Reload data
      await loadData();
    } catch (error: any) {
      console.error('[YouTube Manager] Sync error:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to sync YouTube channel' });
    } finally {
      setSyncing(false);
    }
  };

  // Disconnect YouTube
  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect YouTube? You can reconnect anytime.')) {
      return;
    }

    setMessage(null);

    try {
      await disconnectYouTube();
      setMessage({ type: 'success', text: 'YouTube disconnected successfully' });
      
      // Reload data
      await loadData();
    } catch (error: any) {
      console.error('[YouTube Manager] Disconnect error:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to disconnect YouTube' });
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
        .eq('plugin_key', 'youtube-integration')
        .maybeSingle();

      const payload = {
        tenant_id: tenantId,
        plugin_key: 'youtube-integration',
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
      console.error('[YouTube Manager] Save error:', error);
      setMessage({ type: 'error', text: `Failed to save: ${error.message}` });
    } finally {
      setSaving(false);
    }
  };

  // Update config helper
  const updateDisplayConfig = (updates: Partial<DisplayConfig>) => {
    setConfig(prev => ({
      ...prev,
      display_settings: { ...prev.display_settings, ...updates }
    }));
  };

  const updateSyncConfig = (updates: Partial<SyncConfig>) => {
    setConfig(prev => ({
      ...prev,
      sync_settings: { ...prev.sync_settings, ...updates }
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
            <Youtube className="h-8 w-8 text-red-600" />
            YouTube Integration
          </h1>
          <p className="text-gray-600 mt-2">
            Connect your YouTube channel and automatically bring your videos into your news portal
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
            <div className="bg-red-50 rounded-full p-4">
              <Youtube className="h-12 w-12 text-red-600" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Connect your YouTube channel</h2>
            <p className="text-gray-600">
              Connect securely with Google. No API key required.
            </p>
          </div>
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="inline-flex items-center gap-3 px-8 py-4 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-lg shadow-lg"
          >
            {connecting ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Youtube className="h-6 w-6" />
                Connect YouTube
              </>
            )}
          </button>
          <p className="text-sm text-gray-500">
            You'll be redirected to Google to authorize access
          </p>
        </div>
      ) : (
        <>
          {/* Connected Channel Card */}
          <div className="bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <img
                  src={connection.channel_thumbnail_url}
                  alt={connection.channel_title}
                  className="w-24 h-24 rounded-full border-4 border-white shadow-lg"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm font-medium text-green-700">YouTube Connected</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">
                  {connection.channel_title}
                </h3>
                {connection.channel_handle && (
                  <p className="text-gray-600 mb-3">{connection.channel_handle}</p>
                )}
                
                {/* Channel Stats */}
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-gray-900">{connection.subscriber_count}</span>
                    <span className="text-gray-600">subscribers</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-gray-900">{connection.video_count}</span>
                    <span className="text-gray-600">videos</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-gray-900">{connection.view_count}</span>
                    <span className="text-gray-600">views</span>
                  </div>
                </div>

                {/* Google Account */}
                <div className="mt-4 pt-4 border-t border-red-200">
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
            <div className="flex gap-3 mt-6 pt-6 border-t border-red-200">
              <button
                onClick={handleSync}
                disabled={syncing}
                className="flex items-center gap-2 px-4 py-2 bg-white text-red-700 border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {syncing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Sync Now
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

          {/* Cached Videos Preview */}
          {cachedVideos.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Video className="h-5 w-5" />
                Latest Videos ({cachedVideos.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cachedVideos.slice(0, 6).map((video) => (
                  <a
                    key={video.video_id}
                    href={video.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block border border-gray-200 rounded-lg overflow-hidden hover:border-red-300 hover:shadow-md transition-all"
                  >
                    <div className="relative aspect-video bg-gray-100">
                      <img
                        src={video.thumbnail_url}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity flex items-center justify-center">
                        <Play className="h-12 w-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <div className="p-3">
                      <h4 className="font-medium text-gray-900 text-sm line-clamp-2 mb-1">
                        {video.title}
                      </h4>
                      <p className="text-xs text-gray-600">
                        {video.view_count} views • {new Date(video.published_at).toLocaleDateString()}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Configuration */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <SettingsIcon className="h-5 w-5" />
          Plugin Settings
        </h2>

        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="font-medium text-gray-900">Enable YouTube Integration</label>
            <p className="text-sm text-gray-600">Display YouTube content on your website</p>
          </div>
          <button
            onClick={() => setPluginEnabled(!pluginEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
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

        {/* Display Settings */}
        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-medium text-gray-900">Display Settings</h3>

          <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={config.display_settings.show_channel_stats}
              onChange={(e) => updateDisplayConfig({ show_channel_stats: e.target.checked })}
              disabled={!pluginEnabled}
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <div>
              <div className="font-medium text-gray-900">Show Channel Statistics</div>
              <div className="text-sm text-gray-600">Display subscriber count, video count, and view count</div>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={config.display_settings.show_latest_videos}
              onChange={(e) => updateDisplayConfig({ show_latest_videos: e.target.checked })}
              disabled={!pluginEnabled}
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <div>
              <div className="font-medium text-gray-900">Show Latest Videos</div>
              <div className="text-sm text-gray-600">Display recent videos from your channel</div>
            </div>
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Latest Videos Limit
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={config.display_settings.latest_videos_limit}
              onChange={(e) => updateDisplayConfig({ latest_videos_limit: parseInt(e.target.value) || 5 })}
              disabled={!pluginEnabled || !config.display_settings.show_latest_videos}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:bg-gray-100"
            />
          </div>
        </div>

        {/* Sync Settings */}
        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-medium text-gray-900">Sync Settings</h3>

          <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={config.sync_settings.auto_sync}
              onChange={(e) => updateSyncConfig({ auto_sync: e.target.checked })}
              disabled={!pluginEnabled}
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <div>
              <div className="font-medium text-gray-900">Enable Automatic Sync</div>
              <div className="text-sm text-gray-600">Automatically refresh channel data periodically (Phase 2 feature)</div>
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
              <li>Click "Connect YouTube" to start</li>
              <li>Sign in with your Google account</li>
              <li>Authorize YouTube access (read-only)</li>
              <li>Your channel will be automatically detected</li>
              <li>Click "Sync Now" to fetch latest videos</li>
              <li>Videos are cached to avoid repeated API calls</li>
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
