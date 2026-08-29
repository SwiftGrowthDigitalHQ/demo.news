/**
 * Google AdSense Component
 * 
 * Renders Google AdSense ads based on tenant configuration.
 * Handles script loading, ad rendering, and placement management.
 */

import { useEffect, useRef, useState } from 'react';
import { getSupabaseClient } from '../../lib/supabase';
import { useTenant } from '../lib/useTenant';

interface AdSenseConfig {
  publisher_id?: string;
  auto_ads_enabled?: boolean;
  responsive_ads?: boolean;
  ads_txt_enabled?: boolean;
  test_mode?: boolean;
  default_ad_format?: 'auto' | 'display' | 'in-article' | 'in-feed';
  placements?: {
    header?: { enabled: boolean; slot?: string };
    before_article?: { enabled: boolean; slot?: string };
    after_article_title?: { enabled: boolean; slot?: string };
    in_article?: { enabled: boolean; slot?: string };
    after_article?: { enabled: boolean; slot?: string };
    between_articles?: { enabled: boolean; slot?: string };
    sidebar?: { enabled: boolean; slot?: string };
    footer?: { enabled: boolean; slot?: string };
    mobile?: { enabled: boolean; slot?: string };
  };
}

interface GoogleAdSenseProps {
  placement: 
    | 'header'
    | 'before_article'
    | 'after_article_title'
    | 'in_article'
    | 'after_article'
    | 'between_articles'
    | 'sidebar'
    | 'footer'
    | 'mobile';
  format?: 'auto' | 'display' | 'in-article' | 'in-feed';
  className?: string;
}

// Track if AdSense script has been loaded globally
let adsenseScriptLoaded = false;
let adsenseScriptLoading = false;

// Store active config per tenant
const tenantConfigCache = new Map<string, AdSenseConfig | null>();

export function GoogleAdSense({ placement, format, className = '' }: GoogleAdSenseProps) {
  const { tenant } = useTenant();
  const [config, setConfig] = useState<AdSenseConfig | null>(null);
  const [enabled, setEnabled] = useState(false);
  const adContainerRef = useRef<HTMLDivElement>(null);
  const [scriptReady, setScriptReady] = useState(adsenseScriptLoaded);

  // Load configuration
  useEffect(() => {
    if (!tenant?.id) return;

    // Check cache first
    const cached = tenantConfigCache.get(tenant.id);
    if (cached !== undefined) {
      setConfig(cached);
      setEnabled(!!cached);
      return;
    }

    // Load from database
    const loadConfig = async () => {
      try {
        const supabase = getSupabaseClient();
        if (!supabase) return;

        const { data, error } = await supabase
          .from('tenant_plugins')
          .select('enabled, configuration')
          .eq('tenant_id', tenant.id)
          .eq('plugin_key', 'google-adsense')
          .maybeSingle();

        if (error) {
          console.error('[AdSense] Failed to load config:', error);
          tenantConfigCache.set(tenant.id, null);
          return;
        }

        if (data && data.enabled) {
          const adConfig = data.configuration as AdSenseConfig;
          tenantConfigCache.set(tenant.id, adConfig);
          setConfig(adConfig);
          setEnabled(true);
        } else {
          tenantConfigCache.set(tenant.id, null);
          setConfig(null);
          setEnabled(false);
        }
      } catch (err) {
        console.error('[AdSense] Error loading config:', err);
        tenantConfigCache.set(tenant.id, null);
      }
    };

    void loadConfig();
  }, [tenant?.id]);

  // Load AdSense script
  useEffect(() => {
    if (!enabled || !config?.publisher_id) return;
    if (adsenseScriptLoaded || adsenseScriptLoading) {
      setScriptReady(true);
      return;
    }

    adsenseScriptLoading = true;

    const script = document.createElement('script');
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${config.publisher_id}`;
    script.async = true;
    script.crossOrigin = 'anonymous';
    
    script.onload = () => {
      adsenseScriptLoaded = true;
      adsenseScriptLoading = false;
      setScriptReady(true);
    };

    script.onerror = () => {
      console.error('[AdSense] Failed to load script');
      adsenseScriptLoading = false;
    };

    document.head.appendChild(script);

    return () => {
      // Don't remove script on unmount - it should persist across navigation
    };
  }, [enabled, config?.publisher_id]);

  // Initialize ad unit
  useEffect(() => {
    if (!scriptReady || !enabled || !config) return;
    if (!adContainerRef.current) return;

    // Check if placement is enabled
    const placementEnabled = config.placements?.[placement] ?? false;
    if (!placementEnabled) return;

    // Initialize ad
    try {
      const adsbygoogle = (window as unknown as { adsbygoogle?: unknown[] }).adsbygoogle;
      if (adsbygoogle) {
        adsbygoogle.push({});
      }
    } catch (err) {
      console.error('[AdSense] Error pushing ad:', err);
    }
  }, [scriptReady, enabled, config, placement]);

  // Don't render if plugin is disabled or not configured
  if (!enabled || !config?.publisher_id) {
    return null;
  }

  // Check if this placement is enabled
  const placementConfig = config.placements?.[placement];
  
  // Support both old boolean format and new object format for backwards compatibility
  const placementEnabled = typeof placementConfig === 'boolean' 
    ? placementConfig 
    : placementConfig?.enabled ?? false;
    
  if (!placementEnabled) {
    return null;
  }

  // Get slot ID (optional - if not provided, AdSense will use auto ads)
  const slotId = typeof placementConfig === 'object' ? placementConfig.slot : undefined;

  // Determine ad format
  const adFormat = format || config.default_ad_format || 'auto';

  return (
    <div className={className} ref={adContainerRef}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={config.publisher_id}
        {...(slotId && { 'data-ad-slot': slotId })}
        data-ad-format={adFormat}
        data-full-width-responsive={config.responsive_ads ? 'true' : 'false'}
        data-adtest={config.test_mode ? 'on' : 'off'}
      />
    </div>
  );
}

/**
 * Hook to check if AdSense is enabled for the current tenant
 */
export function useAdSenseEnabled(): boolean {
  const { tenant } = useTenant();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!tenant?.id) {
      setEnabled(false);
      return;
    }

    // Check cache first
    const cached = tenantConfigCache.get(tenant.id);
    if (cached !== undefined) {
      setEnabled(!!cached);
      return;
    }

    // Load from database
    const loadEnabled = async () => {
      try {
        const supabase = getSupabaseClient();
        if (!supabase) return;

        const { data, error } = await supabase
          .from('tenant_plugins')
          .select('enabled')
          .eq('tenant_id', tenant.id)
          .eq('plugin_key', 'google-adsense')
          .maybeSingle();

        if (error) {
          console.error('[AdSense] Failed to check enabled status:', error);
          return;
        }

        setEnabled(data?.enabled ?? false);
      } catch (err) {
        console.error('[AdSense] Error checking enabled status:', err);
      }
    };

    void loadEnabled();
  }, [tenant?.id]);

  return enabled;
}

/**
 * Clear tenant config cache (useful when configuration changes)
 */
export function clearAdSenseCache(tenantId?: string) {
  if (tenantId) {
    tenantConfigCache.delete(tenantId);
  } else {
    tenantConfigCache.clear();
  }
}
