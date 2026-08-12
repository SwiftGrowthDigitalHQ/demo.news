/**
 * TenantPaymentsPanel — Superadmin view of all subscription payments.
 * Route: /admin/tenant-payments
 *
 * Features:
 *  - List all payments (filter by status)
 *  - Approve / Reject with confirmation
 *  - View full payment details
 *  - All actions are audited
 */
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../lib/auth';
import {
  listAllPayments,
  approvePayment,
  rejectPayment,
  formatDate,
  formatCurrency,
  type PaymentRow,
  type PaymentStatus,
} from '../../lib/payment';

const S = {
  badge: (status: PaymentStatus): React.CSSProperties => {
    const map: Record<PaymentStatus, { bg: string; color: string }> = {
      SUBMITTED: { bg: '#fffbeb', color: '#d97706' },
      APPROVED:  { bg: '#f0fdf4', color: '#16a34a' },
      REJECTED:  { bg: '#fef2f2', color: '#dc2626' },
    };
    const c = map[status] ?? { bg: '#f8fafc', color: '#64748b' };
    return { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 99, background: c.bg, color: c.color, fontSize: 11, fontWeight: 600 };
  },
  th: { padding: '10px 12px', textAlign: 'left' as const, fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.05em', whiteSpace: 'nowrap' as const },
  td: { padding: '12px 12px', fontSize: 13, color: '#0f172a', verticalAlign: 'top' as const },
  actionBtn: (color: string): React.CSSProperties => ({
    padding: '5px 12px', borderRadius: 6, border: 'none', background: color, color: '#fff',
    fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' as const,
  }),
  outlineBtn: { padding: '5px 10px', borderRadius: 6, border: '1.5px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: 12, fontWeight: 500, cursor: 'pointer' } as React.CSSProperties,
};

/* ── Payment detail modal ─────────────────────────────────────────────────── */
function PaymentDetailModal({ payment, onClose, onApprove, onReject }: {
  payment: PaymentRow;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const rows: Array<[string, string | null | undefined]> = [
    ['Tenant', payment.tenant_name],
    ['Plan', payment.plan?.toUpperCase()],
    ['Amount', payment.amount ? formatCurrency(payment.amount) : null],
    ['UPI ID Paid To', payment.upi_id_used],
    ['UTR / Transaction', payment.utr],
    ['Payment Date', formatDate(payment.payment_date)],
    ['Submitted At', formatDate(payment.submitted_at)],
    ['Status', payment.status],
    ['Rejection Reason', payment.rejection_reason],
    ['Reviewed At', payment.reviewed_at ? formatDate(payment.reviewed_at) : null],
    ['Notes', payment.notes],
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 14, padding: 28, maxWidth: 520, width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(15,23,42,0.22)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Payment Details</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 20, lineHeight: 1 }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {rows.filter(([, v]) => v != null).map(([label, value]) => (
            <div key={label} style={{ display: 'flex', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ width: 150, flexShrink: 0, fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>{label}</div>
              <div style={{ fontSize: 13, color: '#0f172a', fontWeight: 500, flex: 1, wordBreak: 'break-all' }}>{value}</div>
            </div>
          ))}
        </div>

        {payment.screenshot_url && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>Screenshot</div>
            <img src={payment.screenshot_url} alt="Payment screenshot" style={{ maxWidth: '100%', borderRadius: 8, border: '1px solid #e2e8f0' }} />
          </div>
        )}

        {payment.status === 'SUBMITTED' && (
          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button onClick={onClose} style={S.outlineBtn}>Close</button>
            <button onClick={onReject} style={{ ...S.actionBtn('#64748b'), flex: 1 }}>Reject</button>
            <button onClick={onApprove} style={{ ...S.actionBtn('#16a34a'), flex: 2 }}>✓ Approve Payment</button>
          </div>
        )}
        {payment.status !== 'SUBMITTED' && (
          <button onClick={onClose} style={{ ...S.outlineBtn, marginTop: 20, width: '100%' }}>Close</button>
        )}
      </div>
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────────────────── */
export function TenantPaymentsPanel() {
  const { profile } = useAuth();
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<PaymentStatus | 'ALL'>('SUBMITTED');
  const [selected, setSelected] = useState<PaymentRow | null>(null);
  const [rejecting, setRejecting] = useState<PaymentRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setPayments(await listAllPayments());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load payments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const displayed = useMemo(() =>
    filter === 'ALL' ? payments : payments.filter(p => p.status === filter),
    [payments, filter],
  );

  const pendingCount = payments.filter(p => p.status === 'SUBMITTED').length;

  const handleApprove = async (payment: PaymentRow) => {
    if (!profile?.id) { toast.error('Not authenticated.'); return; }
    if (!confirm('Approve this payment and activate the tenant subscription?')) return;
    setProcessing(true);
    try {
      await approvePayment({ paymentId: payment.id, reviewerUserId: profile.id });
      toast.success('Payment approved. Subscription activated.');
      setSelected(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to approve payment.');
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejecting || !profile?.id) return;
    if (!rejectReason.trim()) { toast.error('Rejection reason is required.'); return; }
    setProcessing(true);
    try {
      await rejectPayment({ paymentId: rejecting.id, reviewerUserId: profile.id, reason: rejectReason });
      toast.success('Payment rejected.');
      setRejecting(null);
      setRejectReason('');
      setSelected(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to reject payment.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div style={{ padding: '24px', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.025em' }}>Subscription Payments</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>Review and approve manual UPI payments from tenants.</p>
        </div>
        {pendingCount > 0 && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 99, padding: '4px 14px', fontSize: 13, fontWeight: 700, color: '#dc2626' }}>
            {pendingCount} pending
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
        {([
          ['Pending', payments.filter(p => p.status === 'SUBMITTED').length, '#d97706', '#fffbeb'],
          ['Approved', payments.filter(p => p.status === 'APPROVED').length, '#16a34a', '#f0fdf4'],
          ['Rejected', payments.filter(p => p.status === 'REJECTED').length, '#dc2626', '#fef2f2'],
          ['Total', payments.length, '#475569', '#f8fafc'],
        ] as Array<[string, number, string, string]>).map(([label, count, color, bg]) => (
          <div key={label} style={{ background: bg, borderRadius: 10, padding: '14px 16px', border: `1px solid ${color}22` }}>
            <div style={{ fontSize: 22, fontWeight: 800, color }}>{count}</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: '#f1f5f9', borderRadius: 9, padding: 4, width: 'fit-content' }}>
        {(['SUBMITTED', 'APPROVED', 'REJECTED', 'ALL'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '6px 14px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: filter === f ? 600 : 400, background: filter === f ? '#fff' : 'transparent', color: filter === f ? '#0f172a' : '#64748b', boxShadow: filter === f ? '0 1px 4px rgba(0,0,0,0.06)' : 'none' }}>
            {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ fontSize: 13, color: '#94a3b8', padding: '20px 0' }}>Loading payments...</div>
      ) : displayed.length === 0 ? (
        <div style={{ fontSize: 13, color: '#94a3b8', padding: '40px 0', textAlign: 'center' }}>No payments found.</div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Tenant', 'Plan', 'Amount', 'Payment Date', 'UTR', 'Submitted', 'Status', 'Actions'].map(h => (
                  <th key={h} style={S.th}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.map(p => (
                <tr key={p.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={S.td}>
                    <div style={{ fontWeight: 600 }}>{p.tenant_name || '—'}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{p.tenant_slug}</div>
                  </td>
                  <td style={{ ...S.td, textTransform: 'capitalize' }}>{p.plan}</td>
                  <td style={{ ...S.td, fontWeight: 700 }}>{formatCurrency(p.amount)}</td>
                  <td style={{ ...S.td, color: '#64748b' }}>{formatDate(p.payment_date)}</td>
                  <td style={{ ...S.td, fontFamily: 'monospace', fontSize: 12, color: '#64748b' }}>{p.utr || '—'}</td>
                  <td style={{ ...S.td, color: '#64748b' }}>{formatDate(p.submitted_at)}</td>
                  <td style={S.td}>
                    <span style={S.badge(p.status)}>
                      {p.status === 'SUBMITTED' ? 'Pending' : p.status.charAt(0) + p.status.slice(1).toLowerCase()}
                    </span>
                  </td>
                  <td style={S.td}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button onClick={() => setSelected(p)} style={S.outlineBtn}>View</button>
                      {p.status === 'SUBMITTED' && (
                        <>
                          <button onClick={() => void handleApprove(p)} disabled={processing} style={S.actionBtn('#16a34a')}>Approve</button>
                          <button onClick={() => setRejecting(p)} disabled={processing} style={S.actionBtn('#dc2626')}>Reject</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <PaymentDetailModal
          payment={selected}
          onClose={() => setSelected(null)}
          onApprove={() => void handleApprove(selected)}
          onReject={() => { setRejecting(selected); setSelected(null); }}
        />
      )}

      {/* Reject reason modal */}
      {rejecting && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 28, maxWidth: 420, width: '100%', boxShadow: '0 24px 64px rgba(15,23,42,0.22)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Reject Payment</h3>
            <p style={{ margin: '0 0 12px', fontSize: 13, color: '#64748b' }}>
              Tenant: <strong>{rejecting.tenant_name}</strong> — {formatCurrency(rejecting.amount)}
            </p>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
              Rejection reason <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              placeholder="e.g. UTR could not be verified. Please resubmit with a valid transaction ID."
              style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, resize: 'none', boxSizing: 'border-box', outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={() => { setRejecting(null); setRejectReason(''); }} style={S.outlineBtn}>Cancel</button>
              <button onClick={() => void handleRejectConfirm()} disabled={processing} style={{ ...S.actionBtn('#dc2626'), flex: 1 }}>
                {processing ? 'Rejecting...' : 'Reject Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
