/**
 * Google Analytics (GA4) Component
 * 
 * Automatically injects gtag.js and tracks pageviews when:
 * 1. google-analytics plugin is enabled in tenant_plugins
 * 2. A valid GA4 connection exists in ga4_connections table
 * 
 * This component should be rendered once at the App root level.
 */

import { useEffect, useState, useRef } from 'react';
import { useTenant } from '../lib/useTenant';
import { useActivePlugins } from '../lib/useActivePlugins';
import { getSupabaseClient } from '../../lib/supabase';
import { useAppNavigation } from '../lib/navigation';

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
  }
}

export function GoogleAnalytics() {
  const { tenant } = useTenant();
  const { isPluginActive } = useActivePlugins();
  const { pathname } = useAppNavigation();
  const [measurementId, setMeasurementId] = useState<string | null>(null);
  const scriptLoadedRef = useRef(false);

  // Load measurement ID from ga4_connections table
  useEffect(() => {
    if (!tenant?.id || !isPluginActive('google-analytics')) {
      setMeasurementId(null);
      return;
    }

    let cancelled = false;

    async function loadMeasurementId() {
      try {
        const supabase = getSupabaseClient();
        if (!supabase) return;

        const { data, error } = await supabase
          .from('ga4_connections')
          .select('measurement_id')
          .eq('tenant_id', tenant.id)
          .eq('status', 'active')
          .maybeSingle();

        if (error) {
          console.error('[GA4] Failed to load measurement ID:', error);
          return;
        }

        if (!cancelled && data?.measurement_id) {
          setMeasurementId(data.measurement_id);
        }
      } catch (err) {
        console.error('[GA4] Error loading measurement ID:', err);
      }
    }

    void loadMeasurementId();

    return () => {
      cancelled = true;
    };
  }, [tenant?.id, isPluginActive]);

  // Inject gtag.js script when measurement ID is available
  useEffect(() => {
    if (!measurementId || scriptLoadedRef.current) return;

    // Initialize dataLayer
    window.dataLayer = window.dataLayer || [];
    function gtag(...args: any[]) {
      window.dataLayer!.push(args);
    }
    window.gtag = gtag;

    // Configure GA4
    gtag('js', new Date());
    gtag('config', measurementId, {
      send_page_view: false, // We'll manually track pageviews
    });

    // Inject script tag
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    script.async = true;
    script.onerror = () => {
      console.error('[GA4] Failed to load gtag.js script');
    };

    document.head.appendChild(script);
    scriptLoadedRef.current = true;

    console.log('[GA4] Tracking initialized with ID:', measurementId);
  }, [measurementId]);

  // Track pageviews on route change
  useEffect(() => {
    if (!measurementId || !window.gtag) return;

    const page_path = pathname;
    
    window.gtag('event', 'page_view', {
      page_path,
      page_location: window.location.href,
      page_title: document.title,
    });

    console.log('[GA4] Pageview tracked:', page_path);
  }, [pathname, measurementId]);

  // This component renders nothing
  return null;
}
