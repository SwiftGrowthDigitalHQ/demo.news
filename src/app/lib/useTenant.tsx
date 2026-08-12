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

  useEffect(() => {
    if (!auth.ready) return;
    if (!auth.user) {
      setTenant(null);
      setLoading(false);
      return;
    }

    let mounted = true;

    async function loadTenant() {
      try {
        const supabase = await getSupabaseClient();
        if (!supabase) {
          if (mounted) {
            setTenant(null);
            setLoading(false);
          }
          return;
        }

        const { data, error: fetchError } = await supabase
          .from('tenants')
          .select('id, slug, name, subscription_status, subscription_plan, trial_ends_at, subscription_ends_at')
          .eq('owner_auth_user_id', auth.user!.id)
          .is('deleted_at', null)
          .maybeSingle();

        if (!mounted) return;

        if (fetchError) {
          console.error('Error loading tenant:', fetchError);
          setError(fetchError.message);
          setTenant(null);
        } else if (data) {
          setTenant({
            id: data.id,
            slug: data.slug,
            name: data.name,
            subscriptionStatus: data.subscription_status,
            subscriptionPlan: data.subscription_plan,
            trialEndsAt: data.trial_ends_at,
            subscriptionEndsAt: data.subscription_ends_at,
          });
        } else {
          setTenant(null);
        }

        setLoading(false);
      } catch (err) {
        if (!mounted) return;
        console.error('Error loading tenant:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setTenant(null);
        setLoading(false);
      }
    }

    loadTenant();

    return () => {
      mounted = false;
    };
  }, [auth.ready, auth.user]);

  return { tenant, loading, error };
}
