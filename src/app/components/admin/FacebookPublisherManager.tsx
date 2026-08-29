/**
 * Facebook Publisher Manager Component (OAuth-based)
 * 
 * Customer-friendly Facebook Page publishing integration using Facebook OAuth 2.0.
 * No manual App ID, App Secret, Page ID, or Access Token required.
 * 
 * User Flow:
 * 1. Click "Connect Facebook"
 * 2. Facebook OAuth consent screen
 * 3. Automatic Page detection
 * 4. Select Page (if multiple Pages)
 * 5. Connected ✓ with Page card
 * 6. Publish articles directly from NewsManagement
 */

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Save, RefreshCw, CheckCircle2, XCircle, Info, Facebook, Settings as SettingsIcon, ExternalLink, Calendar } from 'lucide-react';
import { getSupabaseClient } from '../../../lib/supabase';
import { useAuth } from '../../lib/auth';
import {
  connectFacebook,
  getFacebookConnectionStatus,
  disconnectFacebook,
  checkFacebookOAuthCallback,
  getFacebookErrorMessage,
  selectFacebookPage,
  getFacebookPublishHistory,
  type FacebookConnectionStatus,
  type FacebookPublishHistory,
} from '../../lib/facebook';

interface PluginConfig {
  publishing_settings: {
    default_behavior: 'ask' | 'automatic' | 'never';
    include_featured_image: boolean;
    post_format: 'title_excerpt_url' | 'title_url' | 'custom';
  };
  post_template: {
    include_title: boolean;
    include_excerpt: boolean;
    excerpt_length: number;
    include_url: boolean;
    custom_template?: string;
  };
}

const DEFAULT_CONFIG: PluginConfig = {
  publishing_settings: {
    default_behavior: 'ask',
    include_featured_image: true,
    post_format: 'title_excerpt_url',
  },
  post_template: {
    include_title: true,
    include_excerpt: true,
    excerpt_length: 150,
    include_url: true,
  },
};

export function FacebookPublisherManager() {
  const auth = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<FacebookConnectionStatus | null>(null);
  const [config, setConfig] = useState<PluginConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [pluginEnabled, setPluginEnabled] = useState(false);
  const [publishHistory, setPublishHistory] = useState<FacebookPublishHistory[]>([]);
  const [showPageSelection, setShowPageSelection] = useState(false);
  const [availablePages, setAvailablePages] = useState<any[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string>('');
  const [selectingPage, setSelectingPage] = useState(false);

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
      const status = await getFacebookConnectionStatus();
      setConnectionStatus(status);

      // Load plugin configuration
      const { data, error } = await supabase
        .from('tenant_plugins')
        .select('enabled, configuration')
        .eq('tenant_id', tenantId)
        .eq('plugin_key', 'facebook-publisher')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPluginEnabled(data.enabled);
        if (data.configuration) {
          setConfig({ ...DEFAULT_CONFIG, ...data.configuration });
        }
      }

      // Load publish history if connected
      if (status.connected) {
        const history = await getFacebookPublishHistory(20);
        setPublishHistory(history);
      }
    } catch (error: any) {
      console.error('[Facebook Manager] Error loading data:', error);
      setMessage({ type: 'error', text: `Failed to load: ${error.message}` });
    } finally {
      setLoading(false);
    }
  }, [auth.ready, auth.profile?.owned_tenant_id]);

  // Check OAuth callback on mount
  useEffect(() => {
    const callback = checkFacebookOAuthCallback();

    if (callback.success) {
      setMessage({ type: 'success', text: 'Facebook Page connected successfully!' });
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      // Reload data
      setTimeout(() => loadData(), 500);
    } else if (callback.error) {
      setMessage({ type: 'error', text: getFacebookErrorMessage(callback.error) });
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (callback.selectPage) {
      // Multiple Pages detected - show selection UI
      try {
        const selectionData = JSON.parse(atob(decodeURIComponent(callback.selectPage)));
        setAvailablePages(selectionData.pages || []);
        setShowPageSelection(true);
        setMessage({ 
          type: 'info', 
          text: 'Multiple Facebook Pages found. Please select the Page you want to connect.' 
        });
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (err) {
        console.error('[Facebook Manager] Failed to parse Page selection data:', err);
        setMessage({ type: 'error', text: 'Failed to load Page selection. Please try again.' });
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Connect Facebook
  const handleConnect = async () => {
    setConnecting(true);
    setMessage(null);

    try {
      await connectFacebook();
      // Will redirect to Facebook OAuth
    } catch (error: any) {
      console.error('[Facebook Manager] Connect error:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to connect Facebook' });
      setConnecting(false);
    }
  };

  // Select Page from multiple options
  const handleSelectPage = async () => {
    if (!selectedPageId) {
      setMessage({ type: 'error', text: 'Please select a Facebook Page' });
      return;
    }

    setSelectingPage(true);
    setMessage(null);

    try {
      const selectedPage = availablePages.find(p => p.id === selectedPageId);
      if (!selectedPage) {
        throw new Error('Selected Page not found');
      }

      // Get selection data from URL parameter
      const params = new URLSearchParams(window.location.search);
      const selectionParam = params.get('facebook_select_page');
      if (!selectionParam) {
        throw new Error('Selection data not found');
      }

      const selectionData = JSON.parse(atob(decodeURIComponent(selectionParam)));

      await selectFacebookPage({
        user_id: selectionData.user_id,
        user_name: selectionData.user_name,
        user_email: selectionData.user_email,
        page_id: selectedPage.id,
        page_name: selectedPage.name,
        page_username: selectedPage.username,
        page_category: selectedPage.category,
        page_image: selectedPage.image,
        page_access_token: selectedPage.access_token,
        permissions: selectionData.permissions,
        token_expires_at: selectionData.token_expires_at,
      });

      setMessage({ type: 'success', text: `Connected to ${selectedPage.name}` });
      setShowPageSelection(false);
      setAvailablePages([]);
      
      // Reload data
      await loadData();
    } catch (error: any) {
      console.error('[Facebook Manager] Page selection error:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to select Page' });
    } finally {
      setSelectingPage(false);
    }
  };

  // Disconnect Facebook
  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Facebook? You can reconnect anytime.')) {
      return;
    }

    setMessage(null);

    try {
      await disconnectFacebook();
      setMessage({ type: 'success', text: 'Facebook disconnected successfully' });
      
      // Clear data
      setPublishHistory([]);
      
      // Reload data
      await loadData();
    } catch (error: any) {
      console.error('[Facebook Manager] Disconnect error:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to disconnect Facebook' });
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
        .eq('plugin_key', 'facebook-publisher')
        .maybeSingle();

      const payload = {
        tenant_id: tenantId,
        plugin_key: 'facebook-publisher',
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
      console.error('[Facebook Manager] Save error:', error);
      setMessage({ type: 'error', text: `Failed to save: ${error.message}` });
    } finally {
      setSaving(false);
    }
  };

  // Format date
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
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
            <Facebook className="h-8 w-8 text-blue-600" />
            Facebook Publisher
          </h1>
          <p className="text-gray-600 mt-2">
            Connect your Facebook Page to publish news articles automatically
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

      {/* Page Selection UI */}
      {showPageSelection && availablePages.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Select Your Facebook Page</h2>
          <p className="text-gray-600 mb-6">
            You manage multiple Facebook Pages. Please select which Page you want to connect for publishing.
          </p>
          
          <div className="space-y-3 mb-6">
            {availablePages.map((page) => (
              <label
                key={page.id}
                className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedPageId === page.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="facebook_page"
                  value={page.id}
                  checked={selectedPageId === page.id}
                  onChange={(e) => setSelectedPageId(e.target.value)}
                  className="h-4 w-4 text-blue-600"
                />
                {page.image && (
                  <img
                    src={page.image}
                    alt={page.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                )}
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{page.name}</div>
                  {page.category && (
                    <div className="text-sm text-gray-600">{page.category}</div>
                  )}
                  {page.subscribers && (
                    <div className="text-sm text-gray-500">{page.subscribers} subscribers</div>
                  )}
                </div>
              </label>
            ))}
          </div>

          <button
            onClick={handleSelectPage}
            disabled={selectingPage || !selectedPageId}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {selectingPage ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5" />
                Connect Selected Page
              </>
            )}
          </button>
        </div>
      )}

      {/* Connection Status Card */}
      {!isConnected || !connection ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="bg-blue-50 rounded-full p-4">
              <Facebook className="h-12 w-12 text-blue-600" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Connect Facebook Page</h2>
            <p className="text-gray-600">
              Connect securely with Facebook OAuth. Publish articles directly to your Facebook Page.
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
                <Facebook className="h-6 w-6" />
                Connect Facebook
              </>
            )}
          </button>
          <p className="text-sm text-gray-500">
            You'll be redirected to Facebook to authorize access (read-only)
          </p>
        </div>
      ) : (
        <>
          {/* Connected Page Card */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                {connection.facebook_page_image_url ? (
                  <img
                    src={connection.facebook_page_image_url}
                    alt={connection.facebook_page_name}
                    className="w-20 h-20 rounded-lg object-cover shadow-md"
                  />
                ) : (
                  <div className="w-20 h-20 bg-white rounded-lg flex items-center justify-center shadow-md">
                    <Facebook className="h-10 w-10 text-blue-600" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm font-medium text-green-700">Facebook Page Connected</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">
                  {connection.facebook_page_name}
                </h3>
                <div className="space-y-2 text-sm">
                  {connection.facebook_page_username && (
                    <div>
                      <span className="font-semibold text-gray-700">Handle:</span>{' '}
                      <span className="text-gray-900">@{connection.facebook_page_username}</span>
                    </div>
                  )}
                  {connection.facebook_page_category && (
                    <div>
                      <span className="font-semibold text-gray-700">Category:</span>{' '}
                      <span className="text-gray-900">{connection.facebook_page_category}</span>
                    </div>
                  )}
                  <div>
                    <a
                      href={connection.facebook_page_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
                    >
                      View Page on Facebook
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>

                {/* Connected User */}
                <div className="mt-4 pt-4 border-t border-blue-200">
                  {connection.facebook_user_name && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Connected by:</span>{' '}
                      {connection.facebook_user_name}
                      {connection.facebook_user_email && ` (${connection.facebook_user_email})`}
                    </p>
                  )}
                  {connection.last_used_at && (
                    <p className="text-sm text-gray-600 mt-1">
                      <span className="font-medium">Last used:</span>{' '}
                      {formatDate(connection.last_used_at)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6 pt-6 border-t border-blue-200">
              <button
                onClick={handleDisconnect}
                className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                <XCircle className="h-4 w-4" />
                Disconnect
              </button>
            </div>
          </div>

          {/* Publishing History */}
          {publishHistory.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Recent Publishing Activity
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Article</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Published</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {publishHistory.map((item) => (
                      <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-900">{item.article_title}</td>
                        <td className="py-3 px-4 text-sm">
                          {item.status === 'published' && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                              <CheckCircle2 className="h-3 w-3" />
                              Published
                            </span>
                          )}
                          {item.status === 'failed' && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">
                              <XCircle className="h-3 w-3" />
                              Failed
                            </span>
                          )}
                          {item.status === 'pending' && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                              <Loader2 className="h-3 w-3" />
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {formatDate(item.published_at)}
                        </td>
                        <td className="py-3 px-4 text-sm text-right">
                          {item.post_url && item.status === 'published' && (
                            <a
                              href={item.post_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
                            >
                              View Post
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                          {item.error_message && item.status === 'failed' && (
                            <span className="text-xs text-red-600" title={item.error_message}>
                              See error
                            </span>
                          )}
                        </td>
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
          Publishing Settings
        </h2>

        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="font-medium text-gray-900">Enable Facebook Publishing</label>
            <p className="text-sm text-gray-600">
              {isConnected ? 'Allow articles to be published to Facebook' : 'Connect Facebook first to enable publishing'}
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

        {/* Publishing Behavior */}
        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-medium text-gray-900">Default Publishing Behavior</h3>

          <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
            <input
              type="radio"
              checked={config.publishing_settings.default_behavior === 'ask'}
              onChange={() => setConfig(prev => ({
                ...prev,
                publishing_settings: { ...prev.publishing_settings, default_behavior: 'ask' }
              }))}
              disabled={!pluginEnabled}
              className="h-4 w-4 text-indigo-600 border-gray-300"
            />
            <div>
              <div className="font-medium text-gray-900">Ask before publishing (Recommended)</div>
              <div className="text-sm text-gray-600">Manually choose when to publish to Facebook</div>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
            <input
              type="radio"
              checked={config.publishing_settings.default_behavior === 'automatic'}
              onChange={() => setConfig(prev => ({
                ...prev,
                publishing_settings: { ...prev.publishing_settings, default_behavior: 'automatic' }
              }))}
              disabled={!pluginEnabled}
              className="h-4 w-4 text-indigo-600 border-gray-300"
            />
            <div>
              <div className="font-medium text-gray-900">Publish automatically</div>
              <div className="text-sm text-gray-600">Every published article is automatically posted to Facebook</div>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
            <input
              type="radio"
              checked={config.publishing_settings.default_behavior === 'never'}
              onChange={() => setConfig(prev => ({
                ...prev,
                publishing_settings: { ...prev.publishing_settings, default_behavior: 'never' }
              }))}
              disabled={!pluginEnabled}
              className="h-4 w-4 text-indigo-600 border-gray-300"
            />
            <div>
              <div className="font-medium text-gray-900">Never publish automatically</div>
              <div className="text-sm text-gray-600">Manual publishing only from history</div>
            </div>
          </label>
        </div>

        {/* Post Format */}
        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-medium text-gray-900">Post Format</h3>

          <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={config.publishing_settings.include_featured_image}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                publishing_settings: { ...prev.publishing_settings, include_featured_image: e.target.checked }
              }))}
              disabled={!pluginEnabled}
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <div>
              <div className="font-medium text-gray-900">Include Featured Image</div>
              <div className="text-sm text-gray-600">Show article's featured image in Facebook post</div>
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
              <li>Click "Connect Facebook" to start</li>
              <li>Sign in with your Facebook account</li>
              <li>Authorize Page management permissions</li>
              <li>Select your Facebook Page (if you manage multiple)</li>
              <li>Your Page will be automatically connected</li>
              <li>Publish articles directly from the article editor</li>
              <li>View publishing history and post links</li>
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
