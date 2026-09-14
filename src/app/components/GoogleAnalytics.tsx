/**
 * Google Analytics (GA4) Component
 * 
 * Automatically injects gtag.js and tracks pageviews when:
 * 1. google-analytics plugin is enabled and configured in tenant_plugins
 * 2. A valid measurement ID exists in plugin configuration
 * 
 * This component should be rendered once at the App root level.
 * 
 * Configuration format in tenant_plugins.configuration:
 * {
 *   "domain": "example.com",
 *   "measurement_id": "G-XXXXXXXXXX"
 * }
 */

import { useEffect, useState, useRef } from 'react';
import { useTenant } from '../lib/useTenant';
import { useAppNavigation } from '../lib/navigation';
import { getGA4Config } from '../../services/ga4Service';

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
  }
}

export function GoogleAnalytics() {
  const { tenant } = useTenant();
  const { pathname } = useAppNavigation();
  const [measurementId, setMeasurementId] = useState<string | null>(null);
  const scriptLoadedRef = useRef(false);

  // Load measurement ID from tenant_plugins configuration
  useEffect(() => {
    if (!tenant?.id) {
      setMeasurementId(null);
      return;
    }

    let cancelled = false;

    async function loadMeasurementId() {
      try {
        const result = await getGA4Config(tenant.id);

        if (!result.success) {
          return;
        }

        // Only set measurement ID if tracking is active
        if (!cancelled && result.data?.tracking_active && result.data?.measurement_id) {
          setMeasurementId(result.data.measurement_id);
        } else if (!cancelled) {
          // GA4 not configured - normal state
          setMeasurementId(null);
        }
      } catch {
      }
    }

    void loadMeasurementId();

    return () => {
      cancelled = true;
    };
  }, [tenant?.id]);

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
    };

    document.head.appendChild(script);
    scriptLoadedRef.current = true;
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
  }, [pathname, measurementId]);

  // This component renders nothing
  return null;
}
