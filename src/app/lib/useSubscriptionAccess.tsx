import { useState, useEffect } from 'react';
import {
  getTenantSubscriptionStatus,
  getAccessPermissions,
  getSubscriptionDetails,
  type SubscriptionStatus,
  type AccessPermissions,
  type SubscriptionDetails,
} from './subscriptionService';
import { isSuperAdmin } from './superAdmin';

// ═══════════════════════════════════════════════════════════════════════════
// SUBSCRIPTION ACCESS HOOKS
// React hooks for subscription-based access control
// ═══════════════════════════════════════════════════════════════════════════

export interface SubscriptionAccessState {
  status: SubscriptionStatus | null;
  details: SubscriptionDetails | null;
  permissions: AccessPermissions;
  isSuperAdmin: boolean;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to get subscription access information for a tenant
 * Checks both subscription status and super admin status
 */
export function useSubscriptionAccess(tenantId?: string): SubscriptionAccessState {
  const [state, setState] = useState<SubscriptionAccessState>({
    status: null,
    details: null,
    permissions: {
      canAccessAdmin: false,
      canPublish: false,
      canAccessWebsite: false,
      canUseAndroidApp: false,
    },
    isSuperAdmin: false,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!tenantId) {
      setState((prev) => ({ ...prev, loading: false }));
      return;
    }

    let mounted = true;

    async function checkAccess() {
      try {
        // Check super admin first (always has access)
        const superAdmin = await isSuperAdmin();

        if (superAdmin) {
          setState({
            status: null,
            details: null,
            permissions: {
              canAccessAdmin: true,
              canPublish: true,
              canAccessWebsite: true,
              canUseAndroidApp: true,
            },
            isSuperAdmin: true,
            loading: false,
            error: null,
          });
          return;
        }

        // Ensure tenantId is defined before calling functions
        if (!tenantId) {
          if (!mounted) return;
          setState((prev) => ({ ...prev, loading: false }));
          return;
        }

        // Get subscription details
        const [status, details, permissions] = await Promise.all([
          getTenantSubscriptionStatus(tenantId),
          getSubscriptionDetails(tenantId),
          getAccessPermissions(tenantId),
        ]);

        if (!mounted) return;

        setState({
          status,
          details,
          permissions,
          isSuperAdmin: false,
          loading: false,
          error: null,
        });
      } catch (error) {
        if (!mounted) return;

        console.error('Error checking subscription access:', error);
        setState({
          status: null,
          details: null,
          permissions: {
            canAccessAdmin: false,
            canPublish: false,
            canAccessWebsite: false,
            canUseAndroidApp: false,
          },
          isSuperAdmin: false,
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    checkAccess();

    return () => {
      mounted = false;
    };
  }, [tenantId]);

  return state;
}

/**
 * Hook to check if current user can access admin panel
 */
export function useCanAccessAdmin(tenantId?: string): {
  canAccess: boolean;
  loading: boolean;
  status: SubscriptionStatus | null;
} {
  const access = useSubscriptionAccess(tenantId);

  return {
    canAccess: access.isSuperAdmin || access.permissions.canAccessAdmin,
    loading: access.loading,
    status: access.status,
  };
}

/**
 * Hook to check if current user can publish content
 */
export function useCanPublish(tenantId?: string): {
  canPublish: boolean;
  loading: boolean;
  status: SubscriptionStatus | null;
} {
  const access = useSubscriptionAccess(tenantId);

  return {
    canPublish: access.isSuperAdmin || access.permissions.canPublish,
    loading: access.loading,
    status: access.status,
  };
}

/**
 * Hook to check if website is accessible
 */
export function useCanAccessWebsite(tenantId?: string): {
  canAccess: boolean;
  loading: boolean;
  status: SubscriptionStatus | null;
} {
  const access = useSubscriptionAccess(tenantId);

  return {
    canAccess: access.permissions.canAccessWebsite,
    loading: access.loading,
    status: access.status,
  };
}

/**
 * Simplified hook for checking active subscription
 */
export function useIsSubscriptionActive(tenantId?: string): {
  isActive: boolean;
  loading: boolean;
} {
  const access = useSubscriptionAccess(tenantId);

  const isActive =
    access.isSuperAdmin ||
    access.status === 'TRIAL' ||
    access.status === 'ACTIVE';

  return {
    isActive,
    loading: access.loading,
  };
}
