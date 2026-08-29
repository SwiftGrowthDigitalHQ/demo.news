import { useState, useEffect } from 'react';
import { getSupabaseClient } from '../../lib/supabase';
import { useAuth } from './auth';

// ═══════════════════════════════════════════════════════════════════════════
// TENANT HOOKS
// Get current user's tenant information
// ═══════════════════════════════════════════════════════════════════════════

export interface TenantInfo {
  id: string;
  slug: string;
  name: string;
  subscriptionStatus: string;
  subscriptionPlan: string;
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
  // Branding
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
}

/**
 * Hook to get the current authenticated user's tenant
 * Returns null if user is not a tenant owner or if loading
 */
export function useTenant(): {
  tenant: TenantInfo | null;
  loading: boolean;
  error: string | null;
} {
  const auth = useAuth();
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Extract stable userId to prevent unnecessary re-runs
  const userId = auth.user?.id ?? null;

  useEffect(() => {
    if (!auth.ready) return;
    if (!userId) {
      setTenant(null);
      setLoading(false);
      return;
    }

    let mounted = true;

    async function loadTenant() {
      try {
        const supabase = getSupabaseClient();
        if (!supabase) {
          if (mounted) {
            setTenant(null);
            setLoading(false);
          }
          return;
        }

        const { data, error: fetchError } = await supabase
          .from('tenants')
          .select(`
            id, 
            slug, 
            name, 
            subscription_status, 
            subscription_plan, 
            trial_ends_at, 
            subscription_ends_at, 
            owner_auth_user_id,
            site_settings:site_settings!site_settings_tenant_id_fkey(
              logo_url,
              theme_config
            )
          `)
          .eq('owner_auth_user_id', userId)
          .is('deleted_at', null)
          .maybeSingle();

        if (!mounted) return;

        if (fetchError) {
          setError(fetchError.message);
          setTenant(null);
        } else if (data) {
          // Extract site_settings (may be array or single object from join)
          const siteSettings = Array.isArray(data.site_settings) 
            ? data.site_settings[0] 
            : data.site_settings;
          
          // Extract theme_config fields safely
          const themeConfig = siteSettings?.theme_config as Record<string, unknown> | null | undefined;
          const logoUrl = siteSettings?.logo_url ?? null;
          const faviconUrl = (themeConfig?.favicon as string | null) ?? null;
          const primaryColor = (themeConfig?.primary_color as string | null) ?? '#dc2626';
          const secondaryColor = (themeConfig?.secondary_color as string | null) ?? '#1e40af';
          
          setTenant({
            id: data.id,
            slug: data.slug,
            name: data.name,
            subscriptionStatus: data.subscription_status,
            subscriptionPlan: data.subscription_plan,
            trialEndsAt: data.trial_ends_at,
            subscriptionEndsAt: data.subscription_ends_at,
            logoUrl,
            faviconUrl,
            primaryColor,
            secondaryColor,
          });
        } else {
          setTenant(null);
        }

        setLoading(false);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Unknown error');
        setTenant(null);
        setLoading(false);
      }
    }

    loadTenant();

    return () => {
      mounted = false;
    };
  }, [auth.ready, userId]); // Use stable userId instead of auth.user object

  return { tenant, loading, error };
}
