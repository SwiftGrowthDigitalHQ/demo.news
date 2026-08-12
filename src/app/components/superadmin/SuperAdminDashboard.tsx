import { useState, useEffect } from 'react';
import { getPlatformMetrics, getAllTenants, type PlatformMetrics, type Tenant } from '../../lib/superAdmin';
import { useAppNavigation } from '../../lib/navigation';

export function SuperAdminDashboard() {
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [expiring, setExpiring] = useState<Tenant[]>([]);
  const [overdue, setOverdue] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [metricsData, allTenants] = await Promise.all([
      getPlatformMetrics(),
      getAllTenants(),
    ]);
    
    setMetrics(metricsData);
    
    if (allTenants) {
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const expiringTenants = allTenants.filter(t => {
        const endsAt = t.subscription_ends_at ? new Date(t.subscription_ends_at) : null;
        return endsAt && endsAt >= now && endsAt <= sevenDaysFromNow;
      });
      
      const overdueTenants = allTenants.filter(t => {
        const endsAt = t.subscription_ends_at ? new Date(t.subscription_ends_at) : null;
        return endsAt && endsAt < now && t.subscription_status !== 'SUSPENDED' && t.subscription_status !== 'CANCELLED';
      });
      
      setExpiring(expiringTenants);
      setOverdue(overdueTenants);
    }
    
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">Failed to load metrics</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Customers"
          value={metrics.total_customers}
          icon="👥"
          color="blue"
        />
        <MetricCard
          title="Active Customers"
          value={metrics.active_customers}
          icon="✅"
          color="green"
        />
        <MetricCard
          title="Trial Customers"
          value={metrics.trial_customers}
          icon="🎯"
          color="yellow"
        />
        <MetricCard
          title="Total Revenue"
          value={`₹${metrics.total_revenue.toLocaleString()}`}
          icon="💰"
          color="emerald"
        />
      </div>

      {/* Status Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatusCard
          label="Payment Due"
          count={metrics.payment_due_customers}
          color="orange"
        />
        <StatusCard
          label="Payment Pending"
          count={metrics.payment_pending_customers}
          color="amber"
        />
        <StatusCard
          label="Suspended"
          count={metrics.suspended_customers}
          color="red"
        />
        <StatusCard
          label="Cancelled"
          count={metrics.cancelled_customers}
          color="slate"
        />
        <StatusCard
          label="Overdue"
          count={overdue.length}
          color="rose"
        />
      </div>

      {/* Revenue Breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Revenue Breakdown</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-slate-500 mb-1">Monthly Plans</p>
            <p className="text-2xl font-bold text-slate-900">₹{metrics.monthly_revenue.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500 mb-1">Yearly Plans</p>
            <p className="text-2xl font-bold text-slate-900">₹{metrics.yearly_revenue.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500 mb-1">Total Revenue</p>
            <p className="text-2xl font-bold text-red-600">₹{metrics.total_revenue.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Growth Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">This Month</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">New Customers</span>
              <span className="text-2xl font-bold text-green-600">+{metrics.new_customers_this_month}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Churned</span>
              <span className="text-2xl font-bold text-red-600">-{metrics.churned_this_month}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Android Apps</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Active Apps</span>
              <span className="text-2xl font-bold text-green-600">{metrics.android_apps_active}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Pending Requests</span>
              <span className="text-2xl font-bold text-amber-600">{metrics.android_app_requests}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {(expiring.length > 0 || overdue.length > 0) && (
        <div className="space-y-4">
          {expiring.length > 0 && (
            <AlertSection
              title="⚠️ Expiring Soon"
              description={`${expiring.length} customers expiring within 7 days`}
              tenants={expiring}
              type="warning"
            />
          )}
          {overdue.length > 0 && (
            <AlertSection
              title="🚨 Overdue"
              description={`${overdue.length} customers past their subscription end date`}
              tenants={overdue}
              type="danger"
            />
          )}
        </div>
      )}
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: string;
  color: 'blue' | 'green' | 'yellow' | 'emerald';
}

function MetricCard({ title, value, icon, color }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    emerald: 'bg-emerald-50 text-emerald-600',
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${colorClasses[color]}`}>
          {icon}
        </div>
        <h3 className="text-sm font-medium text-slate-600">{title}</h3>
      </div>
      <p className="text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

interface StatusCardProps {
  label: string;
  count: number;
  color: 'orange' | 'amber' | 'red' | 'slate' | 'rose';
}

function StatusCard({ label, count, color }: StatusCardProps) {
  const colorClasses = {
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    slate: 'bg-slate-50 border-slate-200 text-slate-700',
    rose: 'bg-rose-50 border-rose-200 text-rose-700',
  };

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <p className="text-sm font-medium mb-1">{label}</p>
      <p className="text-2xl font-bold">{count}</p>
    </div>
  );
}

interface AlertSectionProps {
  title: string;
  description: string;
  tenants: Tenant[];
  type: 'warning' | 'danger';
}

function AlertSection({ title, description, tenants, type }: AlertSectionProps) {
  const { navigate } = useAppNavigation();
  const bgColor = type === 'warning' ? 'bg-amber-50' : 'bg-red-50';
  const borderColor = type === 'warning' ? 'border-amber-200' : 'border-red-200';
  const textColor = type === 'warning' ? 'text-amber-900' : 'text-red-900';

  return (
    <div className={`rounded-xl border ${bgColor} ${borderColor} p-6`}>
      <h3 className={`text-lg font-bold ${textColor} mb-2`}>{title}</h3>
      <p className={`text-sm ${textColor} opacity-75 mb-4`}>{description}</p>
      <div className="space-y-2">
        {tenants.slice(0, 5).map(tenant => (
          <div
            key={tenant.id}
            className="flex items-center justify-between bg-white rounded-lg p-3 border border-slate-200"
          >
            <div>
              <p className="font-medium text-slate-900">{tenant.name}</p>
              <p className="text-sm text-slate-500">
                {tenant.subscription_ends_at
                  ? `Ends: ${new Date(tenant.subscription_ends_at).toLocaleDateString()}`
                  : 'No end date'}
              </p>
            </div>
            <button
              onClick={() => navigate(`/super-admin/customers?id=${tenant.id}`)}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              View →
            </button>
          </div>
        ))}
      </div>
      {tenants.length > 5 && (
        <p className="text-sm text-slate-600 mt-3">
          +{tenants.length - 5} more
        </p>
      )}
    </div>
  );
}
