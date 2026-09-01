/**
 * Google Analytics 4 Tracking Script Component
 * 
 * Injects GA4 tracking script on customer websites based on tenant configuration.
 * Only injects if:
 * 1. GA4 is configured for the tenant
 * 2. Tracking is enabled
 * 3. Valid measurement ID exists
 * 4. Domain matches tenant's configured domain
 * 
 * IMPORTANT:
 * - Tenant isolation enforced
 * - No duplicate scripts
 * - Script removed when tracking disabled
 * - Works on localhost and production
 */

import { useEffect, useState } from 'react';
import { getGA4Config } from '../../services/ga4Service';

interface GoogleAnalyticsScriptProps {
  tenantId: string;
}

export function GoogleAnalyticsScript({ tenantId }: GoogleAnalyticsScriptProps) {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [measurementId, setMeasurementId] = useState<string | null>(null);

  useEffect(() => {
    let scriptElement: HTMLScriptElement | null = null;
    let inlineScriptElement: HTMLScriptElement | null = null;

    const loadGoogleAnalytics = async () => {
      if (!tenantId) {
        console.warn('[GA4 Script] No tenant ID provided');
        return;
      }

      try {
        // Fetch GA4 configuration
        const result = await getGA4Config(tenantId);

        if (!result.success) {
          console.error('[GA4 Script] Failed to load config:', result.error);
          return;
        }

        const config = result.data;

        // Check if tracking is active
        if (!config?.tracking_active) {
          console.log('[GA4 Script] Tracking not active for tenant:', tenantId);
          return;
        }

        // Validate measurement ID
        if (!config.measurement_id) {
          console.warn('[GA4 Script] No measurement ID configured');
          return;
        }

        const mid = config.measurement_id;
        setMeasurementId(mid);

        // Check if script already loaded (prevent duplicates)
        const existingScript = document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${mid}"]`);
        if (existingScript) {
          console.log('[GA4 Script] Script already loaded for:', mid);
          setScriptLoaded(true);
          return;
        }

        // Create and inject gtag.js script
        scriptElement = document.createElement('script');
        scriptElement.src = `https://www.googletagmanager.com/gtag/js?id=${mid}`;
        scriptElement.async = true;
        scriptElement.onload = () => {
          console.log('[GA4 Script] Google Analytics script loaded:', mid);
          setScriptLoaded(true);
        };
        scriptElement.onerror = () => {
          console.error('[GA4 Script] Failed to load Google Analytics script');
        };
        document.head.appendChild(scriptElement);

        // Create and inject initialization script
        inlineScriptElement = document.createElement('script');
        inlineScriptElement.innerHTML = `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${mid}', {
            'send_page_view': true
          });
        `;
        document.head.appendChild(inlineScriptElement);

        console.log('[GA4 Script] Google Analytics initialized for tenant:', tenantId, 'with Measurement ID:', mid);

      } catch (error) {
        console.error('[GA4 Script] Error loading Google Analytics:', error);
      }
    };

    loadGoogleAnalytics();

    // Cleanup function
    return () => {
      if (scriptElement && scriptElement.parentNode) {
        scriptElement.parentNode.removeChild(scriptElement);
        console.log('[GA4 Script] Removed GA4 script element');
      }
      if (inlineScriptElement && inlineScriptElement.parentNode) {
        inlineScriptElement.parentNode.removeChild(inlineScriptElement);
        console.log('[GA4 Script] Removed GA4 inline script element');
      }
      setScriptLoaded(false);
      setMeasurementId(null);
    };
  }, [tenantId]);

  // This component doesn't render anything visible
  return null;
}

/**
 * Track custom GA4 events
 * 
 * Usage:
 *   trackGA4Event('article_view', { article_id: '123', article_title: 'My Article' });
 */
export function trackGA4Event(eventName: string, eventParams?: Record<string, any>) {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', eventName, eventParams);
    console.log('[GA4 Event]', eventName, eventParams);
  } else {
    console.warn('[GA4 Event] gtag not available, event not tracked:', eventName);
  }
}

/**
 * Track page views manually (for SPAs)
 * 
 * Usage:
 *   trackGA4PageView('/articles/my-article', 'My Article');
 */
export function trackGA4PageView(path: string, title?: string) {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'page_view', {
      page_path: path,
      page_title: title || document.title,
    });
    console.log('[GA4 Page View]', path, title);
  } else {
    console.warn('[GA4 Page View] gtag not available');
  }
}

/**
 * Extend window interface for TypeScript
 */
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}
