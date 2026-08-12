/**
 * SubscriptionDashboard — Customer-facing subscription status widget.
 * Shown inside the admin panel for tenant owners.
 *
 * Handles all subscription states:
 *   TRIAL → show trial countdown
 *   PAYMENT_DUE → show UPI payment details + UTR submission form
 *   PAYMENT_PENDING → show pending message
 *   ACTIVE → show renewal info
 *   SUSPENDED → show suspended message
 */
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../lib/auth';
import { useI18n, type TranslationKey } from '../../lib/i18n';
import {
  loadMyTenant,
  loadMyPayments,
  loadPaymentConfig,
  submitPayment,
  buildUpiUri,
  trialDaysRemaining,
  periodDaysRemaining,
  formatDate,
  formatCurrency,
  getPlanPrice,
  type TenantRow,
  type PaymentRow,
  type PaymentConfig,
  type SubscriptionStatus,
  type PaymentStatus,
  type PlanId,
} from '../../lib/payment';

/* ── Status badge ─────────────────────────────────────────────────────────── */
const STATUS_COLORS: Record<SubscriptionStatus, { bg: string; color: string }> = {
  TRIAL:           { bg: '#eff6ff', color: '#1d4ed8' },
  PAYMENT_DUE:     { bg: '#fef2f2', color: '#dc2626' },
  PAYMENT_PENDING: { bg: '#fffbeb', color: '#d97706' },
  ACTIVE:          { bg: '#f0fdf4', color: '#16a34a' },
  SUSPENDED:       { bg: '#fef2f2', color: '#dc2626' },
  CANCELLED:       { bg: '#f8fafc', color: '#64748b' },
};

const PAY_STATUS_COLORS: Record<PaymentStatus, { bg: string; color: string }> = {
  SUBMITTED: { bg: '#fffbeb', color: '#d97706' },
  APPROVED:  { bg: '#f0fdf4', color: '#16a34a' },
  REJECTED:  { bg: '#fef2f2', color: '#dc2626' },
};

function StatusBadge({ status }: { status: SubscriptionStatus }) {
  const { t } = useI18n();
  const c = STATUS_COLORS[status] ?? { bg: '#f8fafc', color: '#64748b' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 99, background: c.bg, color: c.color, fontSize: 12, fontWeight: 600 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
      {t(`sub.status.${status}` as TranslationKey)}
    </span>
  );
}

/* ── Copy button ──────────────────────────────────────────────────────────── */
function CopyButton({ text, label }: { text: string; label: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button onClick={copy} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 7, border: '1.5px solid #e2e8f0', background: copied ? '#f0fdf4' : '#fff', color: copied ? '#16a34a' : '#475569', fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
      {copied ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
      )}
      {copied ? t('sub.copied') : label}
    </button>
  );
}

/* ── Simple QR using a public QR API (no third-party library needed) ─────── */
function UpiQrCode({ uri, size = 160 }: { uri: string; size?: number }) {
  const encoded = encodeURIComponent(uri);
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&margin=8&color=0f172a`;
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, display: 'inline-flex', background: '#fff' }}>
      <img src={src} alt="UPI QR Code" width={size} height={size} style={{ display: 'block', borderRadius: 4 }} />
    </div>
  );
}

/* ── Payment submission form ──────────────────────────────────────────────── */
function PaymentForm({
  tenant, config, onSuccess,
}: { tenant: TenantRow; config: PaymentConfig; onSuccess: () => void }) {
  const { t } = useI18n();
  const amount = getPlanPrice(config, tenant.subscription_plan as PlanId);
  const upiUri = buildUpiUri(amount, config.upi_id, config.merchant_name);
  const isMobile = window.innerWidth <= 768;

  const [utr, setUtr] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<'pay' | 'form'>('pay');

  const inputS: React.CSSProperties = { width: '100%', height: 42, padding: '0 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, color: '#0f172a', background: '#fff', boxSizing: 'border-box', outline: 'none' };

  const handleSubmit = async () => {
    if (!utr.trim()) { toast.error(t('sub.utrLabel') + ' is required.'); return; }
    if (!payDate) { toast.error(t('sub.paymentDateLabel') + ' is required.'); return; }
    setSubmitting(true);
    try {
      await submitPayment({
        tenantId: tenant.id,
        plan: tenant.subscription_plan as PlanId,
        amount,           // server-determined amount from config
        upiIdUsed: config.upi_id,
        utr: utr.trim(),
        paymentDate: payDate,
        notes: notes || null,
      });
      toast.success(t('sub.submitSuccess'));
      onSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('sub.submitError'));
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 'form') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Amount summary */}
        <div style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>{t('sub.plan')}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{tenant.subscription_plan === 'yearly' ? t('sub.yearlyPlan') : t('sub.monthlyPlan')}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>{t('sub.amountDue')}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#dc2626' }}>{formatCurrency(amount)}</div>
          </div>
        </div>

        {/* UTR */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
            {t('sub.utrLabel')} <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input value={utr} onChange={e => setUtr(e.target.value)} style={inputS} placeholder={t('sub.utrPlaceholder')} maxLength={30} />
        </div>

        {/* Payment date */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
            {t('sub.paymentDateLabel')} <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} style={inputS} max={new Date().toISOString().split('T')[0]} />
        </div>

        {/* Notes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{t('sub.notesLabel')}</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} style={{ ...inputS, height: 72, padding: '10px 12px', resize: 'none' }} placeholder={t('sub.notesPlaceholder')} rows={3} />
        </div>

        {/* Verification notice */}
        <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#92400e', lineHeight: 1.5 }}>
          ℹ️ {t('sub.manualVerification')}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setStep('pay')} style={{ flex: 1, height: 44, borderRadius: 9, border: '1.5px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            ← Back
          </button>
          <button onClick={() => void handleSubmit()} disabled={submitting} style={{ flex: 2, height: 44, borderRadius: 9, border: 'none', background: '#dc2626', color: '#fff', fontSize: 14, fontWeight: 700, cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
            {submitting ? t('sub.submitting') : t('sub.submitPayment')}
          </button>
        </div>
      </div>
    );
  }

  // step === 'pay'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Amount due */}
      <div style={{ background: '#fef2f2', borderRadius: 10, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, border: '1px solid #fecaca' }}>
        <div>
          <div style={{ fontSize: 12, color: '#b91c1c', fontWeight: 600 }}>{t('sub.amountDue')}</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#dc2626', letterSpacing: '-0.03em' }}>{formatCurrency(amount)}</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{tenant.subscription_plan === 'yearly' ? 'Yearly plan' : 'Monthly plan'}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>{t('sub.upiId')}</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', fontFamily: 'monospace', letterSpacing: '0.02em', marginBottom: 8 }}>{config.upi_id}</div>
          <CopyButton text={config.upi_id} label={t('sub.copyUpiId')} />
        </div>
      </div>

      {/* QR + Pay button */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {!isMobile && (
          <div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8, fontWeight: 500 }}>{t('sub.scanQr')}</div>
            <UpiQrCode uri={upiUri} size={160} />
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
          {isMobile && (
            <a href={upiUri} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 10, background: '#0f172a', color: '#fff', fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
              {t('sub.openUpiApp')} — {formatCurrency(amount)}
            </a>
          )}
          <button onClick={() => setStep('form')} style={{ height: 48, borderRadius: 10, border: 'none', background: '#dc2626', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            {t('sub.submitPayment')} →
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Payment history table ────────────────────────────────────────────────── */
function PaymentHistory({ payments }: { payments: PaymentRow[] }) {
  const { t } = useI18n();
  if (payments.length === 0) {
    return <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>{t('sub.historyEmpty')}</p>;
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#f8fafc' }}>
            {([
              ['sub.colDate', '120px'], ['sub.colPlan', '100px'], ['sub.colAmount', '80px'],
              ['sub.colUtr', '140px'], ['sub.colStatus', '110px'],
            ] as Array<[TranslationKey, string]>).map(([k, w]) => (
              <th key={k} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.05em', width: w }}>{t(k).toUpperCase()}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {payments.map(p => {
            const sc = PAY_STATUS_COLORS[p.status] ?? { bg: '#f8fafc', color: '#64748b' };
            return (
              <tr key={p.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 12px', color: '#0f172a' }}>{formatDate(p.submitted_at)}</td>
                <td style={{ padding: '10px 12px', color: '#475569', textTransform: 'capitalize' }}>{p.plan}</td>
                <td style={{ padding: '10px 12px', color: '#0f172a', fontWeight: 600 }}>{formatCurrency(p.amount)}</td>
                <td style={{ padding: '10px 12px', color: '#64748b', fontFamily: 'monospace', fontSize: 12 }}>{p.utr ?? '—'}</td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 99, background: sc.bg, color: sc.color, fontSize: 11, fontWeight: 600 }}>
                    {t(`sub.payStatus.${p.status}` as TranslationKey)}
                  </span>
                  {p.status === 'REJECTED' && p.rejection_reason && (
                    <div style={{ fontSize: 11, color: '#dc2626', marginTop: 3 }}>{p.rejection_reason}</div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────────────────── */
export function SubscriptionDashboard() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [tenant, setTenant] = useState<TenantRow | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [cfg, t_] = await Promise.all([
        loadPaymentConfig(),
        loadMyTenant(user.id),
      ]);
      setConfig(cfg);
      setTenant(t_);
      if (t_) {
        const pays = await loadMyPayments(t_.id);
        setPayments(pays);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load subscription.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [user?.id]);

  if (loading) return <div style={{ padding: '24px', fontSize: 13, color: '#94a3b8' }}>Loading subscription...</div>;
  if (error) return <div style={{ padding: '24px', fontSize: 13, color: '#dc2626' }}>{error}</div>;
  if (!tenant || !config) {
    return (
      <div style={{ padding: '24px', maxWidth: 600 }}>
        <div style={{ background: '#f8fafc', borderRadius: 12, border: '1px dashed #e2e8f0', padding: '32px', textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: '#64748b' }}>No subscription found for your account.</div>
          <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 6 }}>Complete the onboarding to create your news platform.</div>
        </div>
      </div>
    );
  }

  const status = tenant.subscription_status;
  const plan = tenant.subscription_plan as PlanId;
  const trialDays = trialDaysRemaining(tenant.trial_ends_at);
  const periodDays = periodDaysRemaining(tenant.current_period_end);

  return (
    <div style={{ padding: '24px', maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>{t('sub.title')}</h2>
        <StatusBadge status={status} />
      </div>

      {/* Info card */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 4 }}>{t('sub.plan').toUpperCase()}</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{plan === 'yearly' ? t('sub.yearlyPlan') : t('sub.monthlyPlan')}</div>
        </div>

        {status === 'TRIAL' && (
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 4 }}>{t('sub.trialEnds').toUpperCase()}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1d4ed8' }}>{t('sub.daysLeft', { n: trialDays })}</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{formatDate(tenant.trial_ends_at)}</div>
          </div>
        )}

        {status === 'ACTIVE' && tenant.current_period_end && (
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 4 }}>{t('sub.renewalDate').toUpperCase()}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{formatDate(tenant.current_period_end)}</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{t('sub.daysLeft', { n: periodDays })}</div>
          </div>
        )}

        {(status === 'PAYMENT_DUE' || status === 'PAYMENT_PENDING') && (
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 4 }}>{t('sub.amountDue').toUpperCase()}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#dc2626' }}>{formatCurrency(getPlanPrice(config, plan))}</div>
          </div>
        )}
      </div>

      {/* Status-specific content */}
      {status === 'TRIAL' && trialDays <= 3 && (
        <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 10, padding: '14px 16px', fontSize: 13, color: '#92400e', lineHeight: 1.6 }}>
          ⏰ {t('sub.daysLeft', { n: trialDays })} {t('sub.afterTrial')}: {formatCurrency(getPlanPrice(config, plan))}
        </div>
      )}

      {status === 'PAYMENT_DUE' && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '20px' }}>
          <p style={{ margin: '0 0 16px', fontSize: 14, color: '#475569', lineHeight: 1.6 }}>
            {t('sub.trialExpired')} {t('sub.paymentDueMsg')}
          </p>
          <PaymentForm tenant={tenant} config={config} onSuccess={() => void load()} />
        </div>
      )}

      {status === 'PAYMENT_PENDING' && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '16px 20px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>⏳</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#d97706', marginBottom: 4 }}>{t('sub.status.PAYMENT_PENDING')}</div>
            <div style={{ fontSize: 13, color: '#92400e', lineHeight: 1.6 }}>{t('sub.pendingMsg')}</div>
          </div>
        </div>
      )}

      {status === 'ACTIVE' && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '14px 16px', display: 'flex', gap: 10, alignItems: 'center' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          <div style={{ fontSize: 13, color: '#15803d', fontWeight: 500 }}>{t('sub.activeMsg')}</div>
        </div>
      )}

      {status === 'SUSPENDED' && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '16px 20px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#dc2626', marginBottom: 6 }}>{t('sub.status.SUSPENDED')}</div>
          <div style={{ fontSize: 13, color: '#b91c1c', lineHeight: 1.6 }}>{t('sub.suspendedMsg')}</div>
        </div>
      )}

      {/* Payment history */}
      {payments.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9' }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{t('sub.history')}</h3>
          </div>
          <div style={{ padding: '0 0 4px' }}>
            <PaymentHistory payments={payments} />
          </div>
          {/* Rejection resubmit */}
          {payments[0]?.status === 'REJECTED' && status === 'PAYMENT_DUE' && (
            <div style={{ padding: '16px', borderTop: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: 13, color: '#dc2626', marginBottom: 12 }}>
                <strong>{t('sub.rejectionReason')}:</strong> {payments[0].rejection_reason}
              </div>
              <PaymentForm tenant={tenant} config={config} onSuccess={() => void load()} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
