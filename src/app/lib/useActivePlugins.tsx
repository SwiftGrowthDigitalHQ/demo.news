/**
 * useActivePlugins Hook
 * 
 * Loads all ENABLED plugins for the current tenant.
 * Returns a Map of plugin_key → configuration.
 * 
 * This is the SINGLE SOURCE OF TRUTH for plugin activation state.
 * All runtime integrations must check this before rendering/executing.
 */

import { useState, useEffect } from 'react';
import { getSupabaseClient } from '../../lib/supabase';
import { useTenant } from './useTenant';

export interface PluginConfig {
  [key: string]: any;
}

export function useActivePlugins() {
  const { tenant } = useTenant();
  const [plugins, setPlugins] = useState<Map<string, PluginConfig>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenant?.id) {
      setPlugins(new Map());
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadActivePlugins() {
      try {
        const supabase = getSupabaseClient();
        if (!supabase) {
          throw new Error('Supabase client not initialized');
        }

        // Load ONLY enabled plugins
        const { data, error: fetchError } = await supabase
          .from('tenant_plugins')
          .select('plugin_key, configuration')
          .eq('tenant_id', tenant.id)
          .eq('enabled', true); // ← CRITICAL: Only load enabled plugins

        if (fetchError) {
          throw fetchError;
        }

        if (!cancelled) {
          const pluginMap = new Map<string, PluginConfig>();
          data?.forEach(plugin => {
            pluginMap.set(plugin.plugin_key, plugin.configuration || {});
          });
          setPlugins(pluginMap);
          setError(null);
        }
      } catch (err) {
        console.error('[useActivePlugins] Failed to load:', err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load plugins');
          setPlugins(new Map());
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadActivePlugins();

    return () => {
      cancelled = true;
    };
  }, [tenant?.id]);

  return { 
    plugins, 
    loading, 
    error,
    isPluginActive: (pluginKey: string) => plugins.has(pluginKey),
    getPluginConfig: <T = PluginConfig>(pluginKey: string): T | null => {
      return (plugins.get(pluginKey) as T) || null;
    }
  };
}
