/**
 * Google AdSense Manager Component
 * 
 * Comprehensive AdSense configuration interface for tenant administrators.
 * Manages publisher ID, auto ads, placements, and ads.txt generation.
 */

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Save, RefreshCw, CheckCircle2, XCircle, Info, DollarSign, Settings as SettingsIcon } from 'lucide-react';
import { getSupabaseClient } from '../../../lib/supabase';
import { useAuth } from '../../lib/auth';

interface AdSenseConfig {
  publisher_id: string;
  auto_ads_enabled: boolean;
  responsive_ads: boolean;
  ads_txt_enabled: boolean;
  test_mode: boolean;
  default_ad_format: 'auto' | 'display' | 'in-article' | 'in-feed';
  placements: {
    header: { enabled: boolean; slot: string };
    before_article: { enabled: boolean; slot: string };
    after_article_title: { enabled: boolean; slot: string };
    in_article: { enabled: boolean; slot: string };
    after_article: { enabled: boolean; slot: string };
    between_articles: { enabled: boolean; slot: string };
    sidebar: { enabled: boolean; slot: string };
    footer: { enabled: boolean; slot: string };
    mobile: { enabled: boolean; slot: string };
  };
}

const DEFAULT_CONFIG: AdSenseConfig = {
  publisher_id: '',
  auto_ads_enabled: false,
  responsive_ads: true,
  ads_txt_enabled: true,
  test_mode: false,
  default_ad_format: 'auto',
  placements: {
    header: { enabled: false, slot: '' },
    before_article: { enabled: false, slot: '' },
    after_article_title: { enabled: false, slot: '' },
    in_article: { enabled: false, slot: '' },
    after_article: { enabled: true, slot: '' },
    between_articles: { enabled: false, slot: '' },
    sidebar: { enabled: true, slot: '' },
    footer: { enabled: false, slot: '' },
    mobile: { enabled: true, slot: '' },
  },
};

export function GoogleAdSenseManager() {
  const auth = useAuth();
  const [config, setConfig] = useState<AdSenseConfig>(DEFAULT_CONFIG);
  const [pluginEnabled, setPluginEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [publisherIdValid, setPublisherIdValid] = useState(false);

  useEffect(() => {
    if (!auth.ready) return;
    if (!auth.profile?.owned_tenant_id) {
      setError('No tenant context available');
      setLoading(false);
      return;
    }
    void loadConfiguration();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.ready, auth.profile?.owned_tenant_id]);

  // Validate publisher ID format whenever it changes
  useEffect(() => {
    const isValid = /^ca-pub-[0-9]{16}$/.test(config.publisher_id);
    setPublisherIdValid(isValid);
  }, [config.publisher_id]);

  const loadConfiguration = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase not configured');
      if (!auth.profile?.owned_tenant_id) throw new Error('No tenant context');

      // Load plugin state
      const { data: pluginData, error: pluginError } = await supabase
        .from('tenant_plugins')
        .select('enabled, configuration')
        .eq('tenant_id', auth.profile.owned_tenant_id)
        .eq('plugin_key', 'google-adsense')
        .maybeSingle();

      if (pluginError) throw pluginError;

      if (pluginData) {
        setPluginEnabled(pluginData.enabled);
        
        // Merge loaded config with defaults to ensure all fields exist
        const loadedConfig = pluginData.configuration as Partial<AdSenseConfig> | null;
        if (loadedConfig) {
          setConfig({
            ...DEFAULT_CONFIG,
            ...loadedConfig,
            placements: {
              ...DEFAULT_CONFIG.placements,
              ...(loadedConfig.placements || {}),
            },
          });
        }
      } else {
        // Plugin not yet installed for this tenant
        setPluginEnabled(false);
        setConfig(DEFAULT_CONFIG);
      }
    } catch (err) {
      console.error('[AdSense] Failed to load configuration:', err);
      setError(err instanceof Error ? err.message : 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  }, [auth.profile?.owned_tenant_id]);

  const saveConfiguration = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase not configured');
      if (!auth.profile?.owned_tenant_id) throw new Error('No tenant context');

      // Validate publisher ID if not in test mode
      if (!config.test_mode && !publisherIdValid) {
        throw new Error('Invalid publisher ID format. Expected: ca-pub-XXXXXXXXXXXXXXXX');
      }

      // Upsert plugin configuration
      const { error: upsertError } = await supabase
        .from('tenant_plugins')
        .upsert({
          tenant_id: auth.profile.owned_tenant_id,
          plugin_key: 'google-adsense',
          enabled: pluginEnabled,
          configuration: config,
          installed_version: '1.0.0',
        }, {
          onConflict: 'tenant_id,plugin_key',
        });

      if (upsertError) throw upsertError;

      setSuccessMessage('AdSense configuration saved successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('[AdSense] Failed to save configuration:', err);
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = <K extends keyof AdSenseConfig>(key: K, value: AdSenseConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const updatePlacement = (key: keyof AdSenseConfig['placements'], enabled: boolean) => {
    setConfig(prev => ({
      ...prev,
      placements: { ...prev.placements, [key]: { ...prev.placements[key], enabled } },
    }));
  };

  const updatePlacementSlot = (key: keyof AdSenseConfig['placements'], slot: string) => {
    setConfig(prev => ({
      ...prev,
      placements: { ...prev.placements, [key]: { ...prev.placements[key], slot } },
    }));
  };

  const enabledPlacementsCount = Object.values(config.placements).filter(p => p.enabled).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--primary)' }} />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
            Google AdSense
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Configure Google AdSense integration for your news website
          </p>
        </div>
        <button
          onClick={() => void loadConfiguration()}
          className="p-2 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          style={{ borderColor: 'var(--border)' }}
          title="Refresh"
        >
          <RefreshCw className="w-5 h-5" style={{ color: 'var(--foreground)' }} />
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-900 dark:text-red-100">Error</p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-green-900 dark:text-green-100">Success</p>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Plugin Status */}
      <div className="p-6 rounded-lg border" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DollarSign className="w-6 h-6" style={{ color: 'var(--primary)' }} />
            <div>
              <h3 className="font-semibold" style={{ color: 'var(--foreground)' }}>
                Plugin Status
              </h3>
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                {pluginEnabled ? 'AdSense is active' : 'AdSense is disabled'}
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={pluginEnabled}
              onChange={(e) => setPluginEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      {/* General Settings */}
      <div className="p-6 rounded-lg border" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
        <div className="flex items-center gap-2 mb-4">
          <SettingsIcon className="w-5 h-5" style={{ color: 'var(--primary)' }} />
          <h3 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
            General Settings
          </h3>
        </div>

        <div className="space-y-4">
          {/* Publisher ID */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
              Publisher ID *
            </label>
            <input
              type="text"
              value={config.publisher_id}
              onChange={(e) => updateConfig('publisher_id', e.target.value)}
              placeholder="ca-pub-XXXXXXXXXXXXXXXX"
              className="w-full px-4 py-2 rounded-lg border"
              style={{
                background: 'var(--background)',
                borderColor: config.publisher_id && !publisherIdValid ? '#ef4444' : 'var(--border)',
                color: 'var(--foreground)',
              }}
            />
            {config.publisher_id && !publisherIdValid && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                Invalid format. Expected: ca-pub-XXXXXXXXXXXXXXXX (16 digits)
              </p>
            )}
            {config.publisher_id && publisherIdValid && (
              <p className="mt-1 text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Valid publisher ID
              </p>
            )}
            <p className="mt-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>
              Your Google AdSense publisher ID. Find it in your AdSense dashboard.
            </p>
          </div>

          {/* Ad Format */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
              Default Ad Format
            </label>
            <select
              value={config.default_ad_format}
              onChange={(e) => updateConfig('default_ad_format', e.target.value as AdSenseConfig['default_ad_format'])}
              className="w-full px-4 py-2 rounded-lg border"
              style={{
                background: 'var(--background)',
                borderColor: 'var(--border)',
                color: 'var(--foreground)',
              }}
            >
              <option value="auto">Auto (Responsive)</option>
              <option value="display">Display Ads</option>
              <option value="in-article">In-Article Ads</option>
              <option value="in-feed">In-Feed Ads</option>
            </select>
            <p className="mt-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>
              Default ad format for all placements
            </p>
          </div>
        </div>
      </div>

      {/* Ad Settings */}
      <div className="p-6 rounded-lg border" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
          Ad Settings
        </h3>

        <div className="space-y-3">
          {[
            {
              key: 'auto_ads_enabled' as const,
              label: 'Auto Ads',
              description: 'Let Google automatically place ads on your site',
            },
            {
              key: 'responsive_ads' as const,
              label: 'Responsive Ads',
              description: 'Enable responsive ad units that adapt to screen size',
            },
            {
              key: 'ads_txt_enabled' as const,
              label: 'ads.txt Generation',
              description: 'Automatically generate ads.txt file for your site',
            },
            {
              key: 'test_mode' as const,
              label: 'Test Mode',
              description: 'Use test ads (for development/testing only)',
            },
          ].map((setting) => (
            <div
              key={setting.key}
              className="flex items-center justify-between p-4 rounded-lg"
              style={{ background: 'var(--muted)' }}
            >
              <div>
                <p className="font-medium" style={{ color: 'var(--foreground)' }}>
                  {setting.label}
                </p>
                <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                  {setting.description}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config[setting.key]}
                  onChange={(e) => updateConfig(setting.key, e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Ad Placements */}
      <div className="p-6 rounded-lg border" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
              Ad Placements
            </h3>
            <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
              Configure where ads appear. Slot IDs are optional - leave empty to use Auto Ads.
            </p>
          </div>
          <span className="text-sm font-medium px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
            {enabledPlacementsCount} enabled
          </span>
        </div>

        <div className="space-y-4">
          {[
            { key: 'header' as const, label: 'Header', description: 'Top of page' },
            { key: 'before_article' as const, label: 'Before Article', description: 'Above article content' },
            { key: 'after_article_title' as const, label: 'After Title', description: 'Below article title' },
            { key: 'in_article' as const, label: 'In Article', description: 'Inside article content' },
            { key: 'after_article' as const, label: 'After Article', description: 'Below article content' },
            { key: 'between_articles' as const, label: 'Between Articles', description: 'In article lists' },
            { key: 'sidebar' as const, label: 'Sidebar', description: 'Right sidebar' },
            { key: 'footer' as const, label: 'Footer', description: 'Bottom of page' },
            { key: 'mobile' as const, label: 'Mobile', description: 'Mobile-specific ads' },
          ].map((placement) => (
            <div
              key={placement.key}
              className="p-4 rounded-lg border"
              style={{
                borderColor: config.placements[placement.key].enabled ? 'var(--primary)' : 'var(--border)',
                background: config.placements[placement.key].enabled ? 'var(--muted)' : 'transparent',
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-medium text-sm" style={{ color: 'var(--foreground)' }}>
                    {placement.label}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                    {placement.description}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.placements[placement.key].enabled}
                    onChange={(e) => updatePlacement(placement.key, e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              {config.placements[placement.key].enabled && (
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--foreground)' }}>
                    Ad Slot ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={config.placements[placement.key].slot}
                    onChange={(e) => updatePlacementSlot(placement.key, e.target.value)}
                    placeholder="Leave empty for Auto Ads"
                    className="w-full px-3 py-1.5 text-sm rounded border"
                    style={{
                      background: 'var(--background)',
                      borderColor: 'var(--border)',
                      color: 'var(--foreground)',
                    }}
                  />
                  <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                    Get slot IDs from your AdSense dashboard. Leave empty to use Auto Ads.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Info Box */}
      <div className="p-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900 dark:text-blue-100">
            <p className="font-medium mb-1">Important Information</p>
            <ul className="list-disc list-inside space-y-1" style={{ color: 'var(--muted-foreground)' }}>
              <li>AdSense script will only load when the plugin is enabled</li>
              <li>Ads will only appear in configured placements</li>
              <li>Publisher ID must be verified in your AdSense account</li>
              <li>Test mode should only be used for development</li>
              <li>Changes take effect immediately after saving</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <button
          onClick={() => void saveConfiguration()}
          disabled={saving || (!publisherIdValid && !config.test_mode)}
          className="px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: 'var(--primary)',
            color: '#fff',
          }}
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Save Configuration
            </>
          )}
        </button>
      </div>
    </div>
  );
}
