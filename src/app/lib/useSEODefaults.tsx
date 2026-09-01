/**
 * Custom hook to load tenant SEO defaults
 * Used by public pages to apply SEO Manager configuration
 * 
 * NOW WITH ACTIVATION CHECK: Only loads if seo-manager plugin is enabled
 */

import { useState, useEffect } from 'react';
import { getPublicTenantSEODefaults, type TenantSEODefaults } from './admin';
import { useTenant } from './useTenant';
import { useActivePlugins } from './useActivePlugins';

export function useSEODefaults() {
  const { tenant } = useTenant();
  const { isPluginActive, loading: pluginsLoading } = useActivePlugins();
  const [seoDefaults, setSeoDefaults] = useState<TenantSEODefaults | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait for plugins to load first
    if (pluginsLoading) {
      return;
    }

    const tenantId = tenant?.id;

    if (!tenantId) {
      setSeoDefaults(null);
      setLoading(false);
      return;
    }

    // ✅ NEW: Check if seo-manager plugin is active
    if (!isPluginActive('seo-manager')) {
      setSeoDefaults(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const data = await getPublicTenantSEODefaults(tenantId!);
        if (!cancelled) setSeoDefaults(data);
      } catch (error) {
        console.error('[useSEODefaults] Failed to load:', error);
        if (!cancelled) setSeoDefaults(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    // Cleanup: if tenant changes before the request finishes, discard the result
    return () => { cancelled = true; };
  }, [tenant?.id, isPluginActive, pluginsLoading]);

  return { seoDefaults, loading };
}
