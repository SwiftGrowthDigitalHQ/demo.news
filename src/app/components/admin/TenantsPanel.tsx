/**
 * TenantsPanel — Superadmin view of all tenants and their subscription status.
 * Route: /admin/tenants
 */
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../lib/auth';
import {
  listAllTenants,
  adminSetTenantStatus,
  formatDate,
  type TenantRow,
  type SubscriptionStatus,
} from '../../lib/payment';

const STATUS_COLORS: Record<SubscriptionStatus, { bg: string; color: string }> = {
  TRIAL:           { bg: '#eff6ff', color: '#1d4ed8' },
  PAYMENT_DUE:     { bg: '#fef2f2', color: '#dc2626' },
  PAYMENT_PENDING: { bg: '#fffbeb', color: '#d97706' },
  ACTIVE:          { bg: '#f0fdf4', color: '#16a34a' },
  PAST_DUE:        { bg: '#fff7ed', color: '#c2410c' },
  EXPIRED:         { bg: '#fef2f2', color: '#991b1b' },
  SUSPENDED:       { bg: '#fee2e2', color: '#991b1b' },
  CANCELLED:       { bg: '#f1f5f9', color: '#64748b' },
};

const S = {
  th: { padding: '10px 12px', textAlign: 'left' as const, fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.05em', whiteSpace: 'nowrap' as const },
  td: { padding: '12px 12px', fontSize: 13, color: '#0f172a', verticalAlign: 'middle' as const },
};

export function TenantsPanel() {
  const { profile } = useAuth();
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setTenants(await listAllTenants());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load tenants.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const filtered = tenants.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.slug.toLowerCase().includes(search.toLowerCase()) ||
    (t.contact_email ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  const handleStatusChange = async (tenant: TenantRow, newStatus: SubscriptionStatus, msg: string) => {
    if (!profile?.id) return;
    if (!confirm(msg)) return;
    setProcessing(tenant.id);
    try {
      await adminSetTenantStatus({ tenantId: tenant.id, status: newStatus, actorUserId: profile.id });
      toast.success(`Tenant ${newStatus.toLowerCase()}.`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update tenant.');
    } finally {
      setProcessing(null);
    }
  };

  // Summary counts
  const counts = tenants.reduce((acc, t) => {
    acc[t.subscription_status] = (acc[t.subscription_status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div style={{ padding: '24px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.025em' }}>Tenants</h2>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>All customer news platforms and their subscription status.</p>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12, marginBottom: 20 }}>
        {([
          ['Trial', 'TRIAL', '#1d4ed8', '#eff6ff'],
          ['Active', 'ACTIVE', '#16a34a', '#f0fdf4'],
          ['Payment Due', 'PAYMENT_DUE', '#dc2626', '#fef2f2'],
          ['Pending', 'PAYMENT_PENDING', '#d97706', '#fffbeb'],
          ['Suspended', 'SUSPENDED', '#991b1b', '#fee2e2'],
        ] as Array<[string, string, string, string]>).map(([label, key, color, bg]) => (
          <div key={key} style={{ background: bg, borderRadius: 10, padding: '14px 16px', border: `1px solid ${color}22` }}>
            <div style={{ fontSize: 22, fontWeight: 800, color }}>{counts[key] ?? 0}</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 9, padding: '6px 12px', maxWidth: 380 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
        </svg>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tenants..." style={{ background: 'none', border: 'none', outline: 'none', fontSize: 13, color: '#0f172a', flex: 1 }} />
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: '#94a3b8', padding: '20px 0' }}>Loading tenants...</div>
      ) : filtered.length === 0 ? (
        <div style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: '40px 0' }}>No tenants found.</div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Name / Slug', 'Plan', 'Status', 'Trial / Period Ends', 'Contact', 'Created', 'Actions'].map(h => (
                  <th key={h} style={S.th}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => {
                const sc = STATUS_COLORS[t.subscription_status] ?? { bg: '#f8fafc', color: '#64748b' };
                const isProcessing = processing === t.id;
                const periodEnd = t.current_period_end ?? t.trial_ends_at;
                return (
                  <tr key={t.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={S.td}>
                      <div style={{ fontWeight: 600 }}>{t.name}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{t.slug}</div>
                    </td>
                    <td style={{ ...S.td, textTransform: 'capitalize' }}>{t.subscription_plan}</td>
                    <td style={S.td}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 99, background: sc.bg, color: sc.color, fontSize: 11, fontWeight: 600 }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: sc.color }} />
                        {t.subscription_status}
                      </span>
                    </td>
                    <td style={{ ...S.td, color: '#64748b', fontSize: 12 }}>{formatDate(periodEnd)}</td>
                    <td style={{ ...S.td, fontSize: 12, color: '#64748b' }}>
                      {t.contact_email && <div>{t.contact_email}</div>}
                      {t.contact_phone && <div>{t.contact_phone}</div>}
                    </td>
                    <td style={{ ...S.td, fontSize: 12, color: '#94a3b8' }}>{formatDate(t.created_at)}</td>
                    <td style={S.td}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {t.subscription_status !== 'ACTIVE' && t.subscription_status !== 'TRIAL' && (
                          <button
                            disabled={isProcessing}
                            onClick={() => void handleStatusChange(t, 'ACTIVE', `Activate subscription for "${t.name}"?`)}
                            style={{ padding: '5px 10px', borderRadius: 6, border: 'none', background: '#16a34a', color: '#fff', fontSize: 12, fontWeight: 600, cursor: isProcessing ? 'default' : 'pointer', opacity: isProcessing ? 0.6 : 1 }}>
                            Activate
                          </button>
                        )}
                        {t.subscription_status !== 'SUSPENDED' && (
                          <button
                            disabled={isProcessing}
                            onClick={() => void handleStatusChange(t, 'SUSPENDED', `Suspend "${t.name}"? Their public site will show a service unavailable message.`)}
                            style={{ padding: '5px 10px', borderRadius: 6, border: '1.5px solid #e2e8f0', background: '#fff', color: '#dc2626', fontSize: 12, fontWeight: 600, cursor: isProcessing ? 'default' : 'pointer', opacity: isProcessing ? 0.6 : 1 }}>
                            Suspend
                          </button>
                        )}
                        {t.subscription_status === 'SUSPENDED' && (
                          <button
                            disabled={isProcessing}
                            onClick={() => void handleStatusChange(t, 'ACTIVE', `Restore service for "${t.name}"?`)}
                            style={{ padding: '5px 10px', borderRadius: 6, border: 'none', background: '#dc2626', color: '#fff', fontSize: 12, fontWeight: 600, cursor: isProcessing ? 'default' : 'pointer', opacity: isProcessing ? 0.6 : 1 }}>
                            Restore
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
