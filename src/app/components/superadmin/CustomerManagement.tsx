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
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    loadTenants();
  }, [statusFilter, currentPage]);

  async function loadTenants() {
    setLoading(true);
    const result = await getAllTenants({
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      search: search || undefined,
      sortBy: 'created_at',
      sortOrder: 'desc',
      page: currentPage,
      pageSize: 25,
    });
    setTenants(result.data);
    setTotalCount(result.total);
    setTotalPages(result.totalPages);
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
    const daysStr = prompt('Extend trial by how many days?');
    if (!daysStr) return;
    const days = parseInt(daysStr);
    if (isNaN(days) || days < 1) {
      alert('Invalid number of days');
      return;
    }
    
    const result = await extendTenantTrial(tenantId, days);
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

  async function handleAndroidAppStatusChange(tenantId: string, status: AndroidAppStatus) {
    const result = await updateAndroidAppStatus(tenantId, status);
    if (result.success) {
      alert('Android app status updated');
      if (selectedTenant?.id === tenantId) {
        const updated = await getTenantById(tenantId);
        setSelectedTenant(updated);
      }
    } else {
      alert(`Error: ${result.error}`);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setCurrentPage(1);
    loadTenants();
  }

  if (loading) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <p style={{ fontSize: 14, color: '#64748b' }}>Loading customers...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 32 }}>
      <div style={{ marginBottom: 24, display: 'flex', gap: 16, alignItems: 'center' }}>
        <form onSubmit={handleSearch} style={{ flex: 1, display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder="Search by name, slug, or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: 1,
              height: 40,
              padding: '0 12px',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              fontSize: 14,
            }}
          />
          <button
            type="submit"
            style={{
              height: 40,
              padding: '0 20px',
              background: '#dc2626',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Search
          </button>
        </form>

        <select
          value={statusFilter}
          onChange={e => {
            setStatusFilter(e.target.value as TenantSubscriptionStatus | 'ALL');
            setCurrentPage(1);
          }}
          style={{
            height: 40,
            padding: '0 12px',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            fontSize: 14,
          }}
        >
          <option value="ALL">All Status</option>
          <option value="TRIAL">Trial</option>
          <option value="ACTIVE">Active</option>
          <option value="PAYMENT_DUE">Payment Due</option>
          <option value="PAST_DUE">Past Due</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="EXPIRED">Expired</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <div style={{ marginBottom: 16, fontSize: 14, color: '#64748b' }}>
        Showing {tenants.length} of {totalCount} customers (Page {currentPage} of {totalPages})
      </div>

      <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Slug</th>
              <th style={thStyle}>Owner</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Plan</th>
              <th style={thStyle}>Created</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map(tenant => (
              <tr key={tenant.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={tdStyle}>{tenant.name}</td>
                <td style={tdStyle}>
                  <code style={{ fontSize: 12, color: '#dc2626' }}>{tenant.slug}</code>
                </td>
                <td style={tdStyle}>
                  <div style={{ fontSize: 13 }}>{tenant.owner_name || '—'}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{tenant.owner_email || '—'}</div>
                </td>
                <td style={tdStyle}>
                  <span style={getStatusStyle(tenant.subscription_status)}>
                    {tenant.subscription_status}
                  </span>
                </td>
                <td style={tdStyle}>{tenant.subscription_plan || '—'}</td>
                <td style={tdStyle}>{new Date(tenant.created_at).toLocaleDateString()}</td>
                <td style={tdStyle}>
                  <button
                    onClick={() => handleViewDetails(tenant)}
                    style={{
                      padding: '6px 12px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: 6,
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', gap: 8 }}>
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={paginationButtonStyle}
          >
            Previous
          </button>
          <span style={{ padding: '8px 16px', fontSize: 14 }}>
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            style={paginationButtonStyle}
          >
            Next
          </button>
        </div>
      )}

      {showDetails && selectedTenant && (
        <TenantDetailsModal
          tenant={selectedTenant}
          onClose={() => setShowDetails(false)}
          onStatusChange={handleStatusChange}
          onExtendTrial={handleExtendTrial}
          onAndroidAppStatusChange={handleAndroidAppStatusChange}
        />
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: 12,
  textAlign: 'left',
  fontSize: 12,
  fontWeight: 600,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const tdStyle: React.CSSProperties = {
  padding: 12,
  fontSize: 14,
  color: '#0f172a',
};

const paginationButtonStyle: React.CSSProperties = {
  padding: '8px 16px',
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: 6,
  fontSize: 14,
  cursor: 'pointer',
};

function getStatusStyle(status: TenantSubscriptionStatus): React.CSSProperties {
  const baseStyle = { padding: '4px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600 };
  const styles: Record<TenantSubscriptionStatus, React.CSSProperties> = {
    TRIAL: { ...baseStyle, background: '#dbeafe', color: '#1e40af' },
    ACTIVE: { ...baseStyle, background: '#dcfce7', color: '#166534' },
    PAYMENT_DUE: { ...baseStyle, background: '#fef3c7', color: '#92400e' },
    PAYMENT_PENDING: { ...baseStyle, background: '#fef3c7', color: '#92400e' },
    PAST_DUE: { ...baseStyle, background: '#fed7aa', color: '#9a3412' },
    SUSPENDED: { ...baseStyle, background: '#fecaca', color: '#991b1b' },
    EXPIRED: { ...baseStyle, background: '#e5e7eb', color: '#374151' },
    CANCELLED: { ...baseStyle, background: '#e5e7eb', color: '#374151' },
  };
  return styles[status] || { ...baseStyle, background: '#f3f4f6', color: '#6b7280' };
}

function TenantDetailsModal({
  tenant,
  onClose,
  onStatusChange,
  onExtendTrial,
  onAndroidAppStatusChange,
}: {
  tenant: Tenant;
  onClose: () => void;
  onStatusChange: (id: string, status: TenantSubscriptionStatus) => void;
  onExtendTrial: (id: string) => void;
  onAndroidAppStatusChange: (id: string, status: AndroidAppStatus) => void;
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 32, maxWidth: 600, width: '90%', maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{tenant.name}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Status</div>
            <span style={getStatusStyle(tenant.subscription_status)}>{tenant.subscription_status}</span>
          </div>

          <div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Plan</div>
            <div style={{ fontSize: 14 }}>{tenant.subscription_plan || '—'}</div>
          </div>

          <div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Trial Period</div>
            <div style={{ fontSize: 14 }}>
              {tenant.trial_started_at ? new Date(tenant.trial_started_at).toLocaleDateString() : '—'} →{' '}
              {tenant.trial_ends_at ? new Date(tenant.trial_ends_at).toLocaleDateString() : '—'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Owner</div>
            <div style={{ fontSize: 14 }}>{tenant.owner_name || '—'}</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>{tenant.owner_email || '—'}</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            onClick={() => onStatusChange(tenant.id, 'ACTIVE')}
            style={{ padding: '10px 16px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}
          >
            Activate
          </button>
          <button
            onClick={() => onStatusChange(tenant.id, 'SUSPENDED')}
            style={{ padding: '10px 16px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}
          >
            Suspend
          </button>
          <button
            onClick={() => onExtendTrial(tenant.id)}
            style={{ padding: '10px 16px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}
          >
            Extend Trial
          </button>
        </div>
      </div>
    </div>
  );
}
