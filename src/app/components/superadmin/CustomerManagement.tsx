import { useState, useEffect } from 'react';
import {
  getAllTenants,
  getTenantById,
  updateTenantStatus,
  extendTenantTrial,
  updateAndroidAppStatus,
  getTenantContentStats,
  type Tenant,
  type TenantSubscriptionStatus,
  type AndroidAppStatus,
} from '../../lib/superAdmin';

export function CustomerManagement() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TenantSubscriptionStatus | 'ALL'>('ALL');
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadTenants();
  }, [statusFilter]);

  async function loadTenants() {
    setLoading(true);
    const data = await getAllTenants({
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      search: search || undefined,
      sortBy: 'created_at',
      sortOrder: 'desc',
    });
    setTenants(data);
    setLoading(false);
  }

  async function handleViewDetails(tenant: Tenant) {
    const fullTenant = await getTenantById(tenant.id);
    if (fullTenant) {
      setSelectedTenant(fullTenant);
      setShowDetails(true);
    }
  }

  async function handleStatusChange(tenantId: string, status: TenantSubscriptionStatus) {
    const reason = prompt(`Reason for changing status to ${status}:`);
    if (reason === null) return;
    
    const result = await updateTenantStatus(tenantId, status, reason);
    if (result.success) {
      alert('Status updated successfully');
      loadTenants();
      if (selectedTenant?.id === tenantId) {
        const updated = await getTenantById(tenantId);
        setSelectedTenant(updated);
      }
    } else {
      alert(`Error: ${result.error}`);
    }
  }

  async function handleExtendTrial(tenantId: string) {
    const days = prompt('Number of days to extend trial:');
    if (!days) return;
    
    const result = await extendTenantTrial(tenantId, parseInt(days));
    if (result.success) {
      alert('Trial extended successfully');
      loadTenants();
      if (selectedTenant?.id === tenantId) {
        const updated = await getTenantById(tenantId);
        setSelectedTenant(updated);
      }
    } else {
      alert(`Error: ${result.error}`);
    }
  }

  const filteredTenants = tenants.filter(t =>
    search === '' || 
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.slug.toLowerCase().includes(search.toLowerCase()) ||
    t.owner_email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Customer Management</h1>
        <div className="text-sm text-slate-600">
          {filteredTenants.length} {filteredTenants.length === 1 ? 'customer' : 'customers'}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Search
            </label>
            <input
              type="text"
              placeholder="Search by name, slug, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadTenants()}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Status Filter
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TenantSubscriptionStatus | 'ALL')}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="ALL">All Statuses</option>
              <option value="TRIAL">Trial</option>
              <option value="ACTIVE">Active</option>
              <option value="PAYMENT_DUE">Payment Due</option>
              <option value="PAYMENT_PENDING">Payment Pending</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customer Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
            <p className="mt-4 text-slate-600">Loading customers...</p>
          </div>
        </div>
      ) : filteredTenants.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-600">No customers found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Owner
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Expires
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Android App
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredTenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-slate-900">{tenant.name}</p>
                        <p className="text-sm text-slate-500">/{tenant.slug}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm text-slate-900">{tenant.owner_name || 'N/A'}</p>
                        <p className="text-sm text-slate-500">{tenant.owner_email || 'N/A'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={tenant.subscription_status} />
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-900 capitalize">{tenant.subscription_plan}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        {tenant.subscription_ends_at ? (
                          <>
                            <p className="text-sm text-slate-900">
                              {new Date(tenant.subscription_ends_at).toLocaleDateString()}
                            </p>
                            <ExpiryWarning expiresAt={tenant.subscription_ends_at} />
                          </>
                        ) : (
                          <span className="text-sm text-slate-500">N/A</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <AndroidAppBadge status={tenant.android_app_status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleViewDetails(tenant)}
                        className="text-sm text-red-600 hover:text-red-700 font-medium"
                      >
                        View Details →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Customer Details Modal */}
      {showDetails && selectedTenant && (
        <CustomerDetailsModal
          tenant={selectedTenant}
          onClose={() => setShowDetails(false)}
          onStatusChange={handleStatusChange}
          onExtendTrial={handleExtendTrial}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: TenantSubscriptionStatus }) {
  const styles: Record<TenantSubscriptionStatus, string> = {
    TRIAL: 'bg-blue-100 text-blue-700',
    ACTIVE: 'bg-green-100 text-green-700',
    PAYMENT_DUE: 'bg-orange-100 text-orange-700',
    PAYMENT_PENDING: 'bg-amber-100 text-amber-700',
    SUSPENDED: 'bg-red-100 text-red-700',
    CANCELLED: 'bg-slate-100 text-slate-700',
  };

  return (
    <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${styles[status]}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function AndroidAppBadge({ status }: { status: AndroidAppStatus }) {
  const styles: Record<AndroidAppStatus, string> = {
    NOT_REQUESTED: 'bg-slate-100 text-slate-600',
    REQUESTED: 'bg-amber-100 text-amber-700',
    IN_PROGRESS: 'bg-blue-100 text-blue-700',
    READY: 'bg-green-100 text-green-700',
    ACTIVE: 'bg-emerald-100 text-emerald-700',
  };

  return (
    <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${styles[status]}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function ExpiryWarning({ expiresAt }: { expiresAt: string }) {
  const now = new Date();
  const expires = new Date(expiresAt);
  const daysUntil = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntil < 0) {
    return <p className="text-xs text-red-600 font-medium">Expired {Math.abs(daysUntil)} days ago</p>;
  }
  if (daysUntil <= 7) {
    return <p className="text-xs text-amber-600 font-medium">Expires in {daysUntil} days</p>;
  }
  return null;
}

interface CustomerDetailsModalProps {
  tenant: Tenant;
  onClose: () => void;
  onStatusChange: (tenantId: string, status: TenantSubscriptionStatus) => void;
  onExtendTrial: (tenantId: string) => void;
}

function CustomerDetailsModal({ tenant, onClose, onStatusChange, onExtendTrial }: CustomerDetailsModalProps) {
  const [contentStats, setContentStats] = useState<any>(null);

  useEffect(() => {
    async function loadStats() {
      const stats = await getTenantContentStats(tenant.id);
      setContentStats(stats);
    }
    loadStats();
  }, [tenant.id]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Customer Details</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <InfoField label="Name" value={tenant.name} />
              <InfoField label="Slug" value={tenant.slug} />
              <InfoField label="Language" value={tenant.language} />
              <InfoField label="Owner" value={tenant.owner_name || 'N/A'} />
              <InfoField label="Email" value={tenant.owner_email || 'N/A'} />
              <InfoField label="Phone" value={tenant.contact_phone || 'N/A'} />
            </div>
          </div>

          {/* Subscription Info */}
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-4">Subscription</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-500 mb-1">Status</p>
                <StatusBadge status={tenant.subscription_status} />
              </div>
              <InfoField label="Plan" value={tenant.subscription_plan} />
              <InfoField 
                label="Started" 
                value={tenant.subscription_started_at ? new Date(tenant.subscription_started_at).toLocaleDateString() : 'N/A'} 
              />
              <InfoField 
                label="Ends" 
                value={tenant.subscription_ends_at ? new Date(tenant.subscription_ends_at).toLocaleDateString() : 'N/A'} 
              />
              {tenant.trial_ends_at && (
                <InfoField 
                  label="Trial Ends" 
                  value={new Date(tenant.trial_ends_at).toLocaleDateString()} 
                />
              )}
            </div>
          </div>

          {/* Content Stats */}
          {contentStats && (
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-4">Content Statistics</h3>
              <div className="grid grid-cols-3 gap-4">
                <StatCard label="Total Articles" value={contentStats.articles_count} />
                <StatCard label="Published" value={contentStats.published_articles} />
                <StatCard label="Drafts" value={contentStats.draft_articles} />
                <StatCard label="Categories" value={contentStats.categories_count} />
                <StatCard label="Media Files" value={contentStats.media_count} />
                <StatCard label="Users" value={contentStats.users_count} />
              </div>
            </div>
          )}

          {/* Android App */}
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-4">Android App</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-500 mb-1">Status</p>
                <AndroidAppBadge status={tenant.android_app_status} />
              </div>
              <InfoField label="Package Name" value={tenant.android_app_package_name || 'N/A'} />
            </div>
          </div>

          {/* Actions */}
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-4">Actions</h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => onStatusChange(tenant.id, 'ACTIVE')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                Activate
              </button>
              <button
                onClick={() => onStatusChange(tenant.id, 'SUSPENDED')}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
              >
                Suspend
              </button>
              <button
                onClick={() => onExtendTrial(tenant.id)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Extend Trial
              </button>
              <button
                onClick={() => onStatusChange(tenant.id, 'CANCELLED')}
                className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-slate-500 mb-1">{label}</p>
      <p className="text-sm text-slate-900 font-medium">{value}</p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-slate-50 rounded-lg p-4">
      <p className="text-sm text-slate-600 mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
