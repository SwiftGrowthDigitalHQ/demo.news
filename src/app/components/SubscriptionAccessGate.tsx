import { ReactNode } from 'react';
import { useSubscriptionAccess } from '../lib/useSubscriptionAccess';
import { getStatusMessage, getStatusColor } from '../lib/subscriptionService';

// ═══════════════════════════════════════════════════════════════════════════
// SUBSCRIPTION ACCESS GATE COMPONENTS
// Guards that restrict access based on subscription status
// ═══════════════════════════════════════════════════════════════════════════

interface SubscriptionAccessGateProps {
  tenantId: string;
  children: ReactNode;
  fallback?: ReactNode;
  requirePublish?: boolean;
}

/**
 * Gate component that shows children only if user has required access
 * Shows fallback or default message if access is denied
 */
export function SubscriptionAccessGate({
  tenantId,
  children,
  fallback,
  requirePublish = false,
}: SubscriptionAccessGateProps) {
  const access = useSubscriptionAccess(tenantId);

  if (access.loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-slate-600">Checking access...</p>
        </div>
      </div>
    );
  }

  // Super admin always has access
  if (access.isSuperAdmin) {
    return <>{children}</>;
  }

  // Check required permission
  const hasAccess = requirePublish
    ? access.permissions.canPublish
    : access.permissions.canAccessAdmin;

  if (hasAccess) {
    return <>{children}</>;
  }

  // Access denied - show fallback or default message
  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <SubscriptionRestrictedMessage
      status={access.status || 'NOT_FOUND'}
      requirePublish={requirePublish}
    />
  );
}

interface SubscriptionRestrictedMessageProps {
  status: string;
  requirePublish?: boolean;
}

/**
 * Default message shown when subscription access is denied
 */
function SubscriptionRestrictedMessage({
  status,
  requirePublish,
}: SubscriptionRestrictedMessageProps) {
  const statusMessage = getStatusMessage(status as any);
  const statusColor = getStatusColor(status as any);

  let message = 'Access to this feature requires an active subscription.';
  let action = 'Please renew your subscription to continue.';

  if (status === 'PAYMENT_PENDING') {
    message = 'Your payment is being verified.';
    action = 'Access will be restored once payment is approved.';
  } else if (status === 'PAYMENT_DUE') {
    message = 'Your subscription payment is due.';
    action = 'Please submit payment to restore access.';
  } else if (status === 'PAST_DUE') {
    message = 'Your subscription payment is overdue.';
    action = 'Please submit payment immediately to restore access.';
  } else if (status === 'SUSPENDED') {
    message = 'Your account has been suspended.';
    action = 'Please contact support for assistance.';
  } else if (status === 'EXPIRED') {
    message = 'Your subscription has expired.';
    action = 'Please renew your subscription to continue.';
  } else if (status === 'CANCELLED') {
    message = 'Your subscription has been cancelled.';
    action = 'Please reactivate your subscription to continue.';
  }

  if (requirePublish) {
    message = 'Publishing requires an active subscription.';
  }

  return (
    <div className="min-h-[400px] flex items-center justify-center bg-slate-50 rounded-lg border-2 border-dashed border-slate-300 p-8">
      <div className="text-center max-w-md">
        <div className="mb-4">
          <span className={`inline-block px-4 py-2 rounded-lg text-sm font-medium ${statusColor}`}>
            {statusMessage}
          </span>
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">{message}</h3>
        <p className="text-slate-600 mb-6">{action}</p>
        <button
          onClick={() => (window.location.href = '/admin/subscription')}
          className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
        >
          View Subscription
        </button>
      </div>
    </div>
  );
}

interface PublishGuardProps {
  tenantId: string;
  children: ReactNode;
}

/**
 * Guard specifically for publishing features
 * Shows a more specific message about publishing restrictions
 */
export function PublishGuard({ tenantId, children }: PublishGuardProps) {
  return (
    <SubscriptionAccessGate tenantId={tenantId} requirePublish={true}>
      {children}
    </SubscriptionAccessGate>
  );
}

interface WebsiteAccessGateProps {
  tenantId: string;
  tenantName: string;
  children: ReactNode;
}

/**
 * Gate for public website access
 * Shows a professional unavailable message if subscription is inactive
 */
export function WebsiteAccessGate({
  tenantId,
  tenantName,
  children,
}: WebsiteAccessGateProps) {
  const access = useSubscriptionAccess(tenantId);

  if (access.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Check if website is accessible
  if (access.permissions.canAccessWebsite) {
    return <>{children}</>;
  }

  // Show professional unavailable message
  return <WebsiteUnavailablePage tenantName={tenantName} status={access.status} />;
}

interface WebsiteUnavailablePageProps {
  tenantName: string;
  status: string | null;
}

/**
 * Professional page shown when website is unavailable due to subscription
 */
function WebsiteUnavailablePage({ tenantName, status }: WebsiteUnavailablePageProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg p-8 md:p-12 text-center">
        <div className="mb-8">
          <div className="inline-block p-4 bg-red-50 rounded-full mb-4">
            <svg
              className="w-12 h-12 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">{tenantName}</h1>
          <p className="text-xl text-slate-600">Service Temporarily Unavailable</p>
        </div>

        <div className="mb-8 space-y-4">
          <p className="text-slate-700">
            This publication's service is currently unavailable due to a subscription issue.
          </p>
          {status === 'PAYMENT_DUE' && (
            <p className="text-slate-600">The subscription payment is due.</p>
          )}
          {status === 'PAST_DUE' && (
            <p className="text-slate-600">The subscription payment is overdue.</p>
          )}
          {status === 'EXPIRED' && (
            <p className="text-slate-600">The subscription has expired.</p>
          )}
          {status === 'SUSPENDED' && (
            <p className="text-slate-600">The account has been suspended.</p>
          )}
        </div>

        <div className="pt-6 border-t border-slate-200">
          <p className="text-sm text-slate-500">
            Please contact the publication administrator to restore service.
          </p>
        </div>
      </div>
    </div>
  );
}
