/**
 * Custom hook to load tenant SEO defaults
 * Used by public pages to apply SEO Manager configuration
 */

import { useState, useEffect } from 'react';
import { getPublicTenantSEODefaults, type TenantSEODefaults } from './admin';
import { useTenant } from './useTenant';

export function useSEODefaults() {
  const { tenant } = useTenant();
  const [seoDefaults, setSeoDefaults] = useState<TenantSEODefaults | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Capture tenantId at effect run time to avoid stale closure in async load()
    const tenantId = tenant?.id;

    if (!tenantId) {
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
  }, [tenant?.id]);

  return { seoDefaults, loading };
}
