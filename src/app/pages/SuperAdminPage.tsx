import { useState, useEffect } from 'react';
import { getAuthLevel, type AuthLevelResult } from '../lib/superAdmin';
import { useAppNavigation } from '../lib/navigation';
import { SuperAdminDashboard } from '../components/superadmin/SuperAdminDashboard';
import { CustomerManagement } from '../components/superadmin/CustomerManagement';
import { PaymentApprovalPanel } from '../components/superadmin/PaymentApprovalPanel';
import { PlatformSettingsPanel } from '../components/superadmin/PlatformSettingsPanel';
import { AuditLogsPanel } from '../components/superadmin/AuditLogsPanel';
import { SuperAdminDomains } from '../components/super-admin/SuperAdminDomains';

type SuperAdminView = 'dashboard' | 'customers' | 'payments' | 'settings' | 'audit' | 'domains';

export function SuperAdminPage() {
  const { navigate, pathname } = useAppNavigation();
  const [authorization, setAuthorization] = useState<AuthLevelResult | null>(null);
  const [currentView, setCurrentView] = useState<SuperAdminView>(() => pathname.startsWith('/super-admin/customers') ? 'customers' : 'dashboard');

  const selectView = (view: SuperAdminView) => {
    setCurrentView(view);
    navigate(view === 'dashboard' ? '/super-admin' : `/super-admin/${view}`);
  };

  useEffect(() => {
    async function checkAuth() {
      const level = await getAuthLevel();
      setAuthorization(level);
      
      if (level.kind === 'authorization_result' && level.level !== 'SUPER_ADMIN') {
        // Redirect to login after a short delay for non-authenticated users
        if (level.level === 'NOT_AUTHENTICATED') {
          setTimeout(() => navigate('/login'), 2000);
        }
      }
    }
    checkAuth();
  }, [navigate]);

  if (authorization === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-slate-600">Verifying authorization...</p>
        </div>
      </div>
    );
  }

  if (authorization.kind !== 'authorization_result') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-md px-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-3">Authorization Check Unavailable</h1>
          <p className="text-slate-600">
            {import.meta.env.DEV
              ? authorization.message
              : 'The server authorization check could not be completed. Please try again.'}
          </p>
        </div>
      </div>
    );
  }

  if (authorization.level !== 'SUPER_ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-3">Access Denied</h1>
          <p className="text-slate-600 mb-2">
            You do not have permission to access the Super Admin Control Center.
          </p>
          <p className="text-sm text-slate-500 mb-6">
            {authorization.level === 'NOT_AUTHENTICATED' && 'Please login to continue.'}
            {authorization.level === 'CUSTOMER' && 'This area is restricted to platform administrators only.'}
            {authorization.level === 'CUSTOMER_ADMIN' && 'Customer admins cannot access the platform control center.'}
          </p>
          <div className="flex gap-3 justify-center">
            {authorization.level === 'NOT_AUTHENTICATED' ? (
              <button
                onClick={() => navigate('/login')}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
              >
                Go to Login
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigate('/admin')}
                  className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-medium"
                >
                  Customer Admin
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                >
                  Go to Homepage
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-slate-900">
              <span className="text-red-600">SangTX</span> Super Admin
            </h1>
            <div className="h-6 w-px bg-slate-300" />
            <span className="text-sm text-slate-500">Platform Control Center</span>
          </div>
          <button
            onClick={() => navigate('/')}
            className="text-sm text-slate-600 hover:text-slate-900 font-medium"
          >
            Exit Super Admin
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex gap-1 px-6 pb-2">
          <NavButton
            active={currentView === 'dashboard'}
            onClick={() => selectView('dashboard')}
            icon="📊"
            label="Dashboard"
          />
          <NavButton
            active={currentView === 'customers'}
            onClick={() => selectView('customers')}
            icon="👥"
            label="Customers"
          />
          <NavButton
            active={currentView === 'payments'}
            onClick={() => selectView('payments')}
            icon="💳"
            label="Payments"
          />
          <NavButton
            active={currentView === 'domains'}
            onClick={() => selectView('domains')}
            icon="🌐"
            label="Domains"
          />
          <NavButton
            active={currentView === 'settings'}
            onClick={() => selectView('settings')}
            icon="⚙️"
            label="Settings"
          />
          <NavButton
            active={currentView === 'audit'}
            onClick={() => selectView('audit')}
            icon="📋"
            label="Audit Logs"
          />
        </nav>
      </header>

      {/* Content */}
      <main className="p-6">
        {currentView === 'dashboard' && <SuperAdminDashboard />}
        {currentView === 'customers' && <CustomerManagement />}
        {currentView === 'payments' && <PaymentApprovalPanel />}
        {currentView === 'domains' && <SuperAdminDomains />}
        {currentView === 'settings' && <PlatformSettingsPanel />}
        {currentView === 'audit' && <AuditLogsPanel />}
      </main>
    </div>
  );
}

interface NavButtonProps {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}

function NavButton({ active, onClick, icon, label }: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
        ${active
          ? 'bg-red-600 text-white'
          : 'text-slate-700 hover:bg-slate-100'
        }
      `}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
