/**
 * SubscriptionDashboard — Customer-facing subscription status widget.
 *
 * Security model:
 *  - All amounts displayed come from server-fetched PaymentConfig, never from
 *    local state or URL parameters.
 *  - submitPayment() calls submit_payment_rpc() (SECURITY DEFINER) which
 *    re-reads the authoritative price server-side. The amount shown in the UI
 *    is informational only — it is not passed to the RPC.
 *  - Double-click / double-submit is blocked with a React ref guard AND the
 *    button is disabled while submitting.
 *  - Duplicate UTR is caught server-side; the client surfaces the error.
 *  - QR codes are rendered locally by qrcode.react — no UPI URI is sent to
 *    any external service.
 *  - subscription_status is loaded from the DB; the UI never assumes a status.
 *
 * Handles all subscription states:
 *   TRIAL          → trial countdown + optional early-pay offer
 *   PAYMENT_DUE    → UPI QR + UTR submission form
 *   PAYMENT_PENDING→ waiting message (no action available)
 *   ACTIVE         → renewal info
 *   PAST_DUE       → urgent payment form
 *   EXPIRED        → payment form (access partially restricted)
 *   SUSPENDED      → suspended message + support contact
 *   CANCELLED      → cancelled message
 */
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
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

// ── Status colour map ─────────────────────────────────────────────────────────
const STATUS_COLORS: Record<SubscriptionStatus, { bg: string; color: string }> = {
  TRIAL:           { bg: '#eff6ff', color: '#1d4ed8' },
  PAYMENT_DUE:     { bg: '#fef2f2', color: '#dc2626' },
  PAYMENT_PENDING: { bg: '#fffbeb', color: '#d97706' },
  ACTIVE:          { bg: '#f0fdf4', color: '#16a34a' },
  PAST_DUE:        { bg: '#fff7ed', color: '#c2410c' },
  EXPIRED:         { bg: '#fef2f2', color: '#991b1b' },
  SUSPENDED:       { bg: '#fef2f2', color: '#dc2626' },
  CANCELLED:       { bg: '#f8fafc', color: '#64748b' },
};

const PAY_STATUS_COLORS: Record<PaymentStatus, { bg: string; color: string }> = {
  SUBMITTED: { bg: '#fffbeb', color: '#d97706' },
  APPROVED:  { bg: '#f0fdf4', color: '#16a34a' },
  REJECTED:  { bg: '#fef2f2', color: '#dc2626' },
};

// ── Shared input style ────────────────────────────────────────────────────────
const INPUT_STYLE: React.CSSProperties = {
  width: '100%', height: 42, padding: '0 12px',
  border: '1.5px solid #e2e8f0', borderRadius: 8,
  fontSize: 14, color: '#0f172a', background: '#fff',
  boxSizing: 'border-box', outline: 'none',
};

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: SubscriptionStatus }) {
  const { t } = useI18n();
  const c = STATUS_COLORS[status] ?? { bg: '#f8fafc', color: '#64748b' };
  const key = `sub.status.${status}` as TranslationKey;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 99, background: c.bg, color: c.color, fontSize: 12, fontWeight: 600 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
      {t(key)}
    </span>
  );
}

// ── Copy-to-clipboard button ──────────────────────────────────────────────────
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
    <button
      onClick={copy}
      type="button"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 7, border: '1.5px solid #e2e8f0', background: copied ? '#f0fdf4' : '#fff', color: copied ? '#16a34a' : '#475569', fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' }}
    >
      {copied ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
      )}
      {copied ? t('sub.copied') : label}
    </button>
  );
}

// ── QR code — rendered locally, NO external service ──────────────────────────
function UpiQrCode({ uri, size = 160 }: { uri: string; size?: number }) {
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, display: 'inline-flex', background: '#fff' }}>
      <QRCodeSVG
        value={uri}
        size={size}
        bgColor="#ffffff"
        fgColor="#0f172a"
        level="M"
      />
    </div>
  );
}

// ── Payment submission form ───────────────────────────────────────────────────
function PaymentForm({
  tenant,
  config,
  onSuccess,
}: {
  tenant: TenantRow;
  config: PaymentConfig;
  onSuccess: () => void;
}) {
  const { t } = useI18n();

  // Amount comes exclusively from server-fetched config — never from React state
  const amount  = getPlanPrice(config, tenant.subscription_plan as PlanId);
  const upiUri  = buildUpiUri(amount, config.upi_id, config.merchant_name);
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  const [utr,         setUtr]         = useState('');
  const [payDate,     setPayDate]     = useState(new Date().toISOString().split('T')[0]);
  const [notes,       setNotes]       = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [step,        setStep]        = useState<'pay' | 'form'>('pay');

  // Ref guard prevents double-submission even if the button state update is
  // delayed by a re-render (e.g. strict-mode double-invoke or fast double-click)
  const submittingRef = useRef(false);

  const handleSubmit = async () => {
    if (submittingRef.current) return;   // guard against double-click
    if (!utr.trim()) { toast.error(t('sub.utrLabel') + ' is required.'); return; }
    if (!payDate)    { toast.error(t('sub.paymentDateLabel') + ' is required.'); return; }

    submittingRef.current = true;
    setSubmitting(true);
    try {
      // Amount is NOT passed — the RPC reads it from payment_config server-side
      await submitPayment({
        tenantId:    tenant.id,
        plan:        tenant.subscription_plan as PlanId,
        upiIdUsed:   config.upi_id,
        utr:         utr.trim(),
        paymentDate: payDate,
        notes:       notes || null,
        paymentType: 'subscription',
      });
      toast.success(t('sub.paymentRecorded'));
      onSuccess();
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('sub.submitError');
      // Friendly surface of server-side guard errors
      if (msg.includes('already pending review') || msg.includes('utr_already_submitted')) {
        toast.error(t('sub.utrDuplicate'));
      } else if (msg.includes('payment_already_pending')) {
        toast.error(t('sub.duplicatePayment'));
      } else {
        toast.error(msg);
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  if (step === 'form') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Amount summary — from DB config, read-only */}
        <div style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>{t('sub.plan')}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
              {tenant.subscription_plan === 'yearly' ? t('sub.yearlyPlan') : t('sub.monthlyPlan')} — {formatCurrency(amount)}
            </div>
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
          <input
            value={utr}
            onChange={e => setUtr(e.target.value)}
            style={INPUT_STYLE}
            placeholder={t('sub.utrPlaceholder')}
            maxLength={30}
            autoComplete="off"
          />
        </div>

        {/* Payment date */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
            {t('sub.paymentDateLabel')} <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            type="date"
            value={payDate}
            onChange={e => setPayDate(e.target.value)}
            style={INPUT_STYLE}
            max={new Date().toISOString().split('T')[0]}
          />
        </div>

        {/* Notes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{t('sub.notesLabel')}</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            style={{ ...INPUT_STYLE, height: 72, padding: '10px 12px', resize: 'none' }}
            placeholder={t('sub.notesPlaceholder')}
            rows={3}
          />
        </div>

        {/* Verification notice */}
        <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#92400e', lineHeight: 1.5 }}>
          ℹ️ {t('sub.manualVerification')}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={() => setStep('pay')}
            style={{ flex: 1, height: 44, borderRadius: 9, border: '1.5px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting}
            style={{ flex: 2, height: 44, borderRadius: 9, border: 'none', background: '#dc2626', color: '#fff', fontSize: 14, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.65 : 1 }}
          >
            {submitting ? t('sub.submitting') : t('sub.submitPayment')}
          </button>
        </div>
      </div>
    );
  }

  // step === 'pay'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Amount due — read from DB config, displayed for reference */}
      <div style={{ background: '#fef2f2', borderRadius: 10, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, border: '1px solid #fecaca' }}>
        <div>
          <div style={{ fontSize: 12, color: '#b91c1c', fontWeight: 600 }}>{t('sub.amountDue')}</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#dc2626', letterSpacing: '-0.03em' }}>
            {formatCurrency(amount)}
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
            {tenant.subscription_plan === 'yearly' ? 'Yearly plan' : 'Monthly plan'}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>{t('sub.upiId')}</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', fontFamily: 'monospace', letterSpacing: '0.02em', marginBottom: 6 }}>
            {config.upi_id}
          </div>
          <CopyButton text={config.upi_id} label={t('sub.copyUpiId')} />
        </div>
      </div>

      {/* QR code rendered locally — no external API call */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {!isMobile && (
          <div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8, fontWeight: 500 }}>
              {t('sub.scanQr')}
            </div>
            <UpiQrCode uri={upiUri} size={160} />
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minWidth: 160 }}>
          {isMobile && (
            <a
              href={upiUri}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 10, background: '#0f172a', color: '#fff', fontSize: 15, fontWeight: 700, textDecoration: 'none' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
              {t('sub.openUpiApp')} — {formatCurrency(amount)}
            </a>
          )}
          <button
            type="button"
            onClick={() => setStep('form')}
            style={{ height: 48, borderRadius: 10, border: 'none', background: '#dc2626', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
          >
            {t('sub.submitPayment')} →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Payment history table ─────────────────────────────────────────────────────
function PaymentHistory({ payments }: { payments: PaymentRow[] }) {
  const { t } = useI18n();
  if (payments.length === 0) {
    return (
      <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>
        {t('sub.historyEmpty')}
      </p>
    );
  }
  const cols: Array<[TranslationKey, string]> = [
    ['sub.colDate', '120px'],
    ['sub.colPlan', '100px'],
    ['sub.colAmount', '90px'],
    ['sub.colUtr', '140px'],
    ['sub.colStatus', '120px'],
  ];
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#f8fafc' }}>
            {cols.map(([k, w]) => (
              <th key={k} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.05em', width: w }}>
                {t(k).toUpperCase()}
              </th>
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

// ── Info row (label + value) ──────────────────────────────────────────────────
function InfoRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 4 }}>
        {label.toUpperCase()}
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: valueColor ?? '#0f172a' }}>{value}</div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function SubscriptionDashboard() {
  const { t } = useI18n();
  const { user } = useAuth();

  const [tenant,   setTenant]   = useState<TenantRow | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [config,   setConfig]   = useState<PaymentConfig | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  const load = async () => {
    if (!user?.id) return;
    setLoading(true);
    setError('');
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

  useEffect(() => { void load(); }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Loading / error / empty states ─────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#94a3b8' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
          <line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" />
          <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" /><line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
          <line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" />
          <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" /><line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
        </svg>
        Loading subscription…
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '14px 16px', fontSize: 13, color: '#dc2626' }}>
          {error}
          <button
            type="button"
            onClick={() => void load()}
            style={{ marginLeft: 12, padding: '2px 10px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fff', color: '#dc2626', fontSize: 12, cursor: 'pointer' }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!tenant || !config) {
    return (
      <div style={{ padding: 24, maxWidth: 600 }}>
        <div style={{ background: '#f8fafc', borderRadius: 12, border: '1px dashed #e2e8f0', padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: '#64748b' }}>No subscription found for your account.</div>
          <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 6 }}>Complete the onboarding to create your news platform.</div>
        </div>
      </div>
    );
  }

  // ── Derived values — all from server data ───────────────────────────────────
  const status    = tenant.subscription_status;
  const plan      = tenant.subscription_plan as PlanId;
  const trialDays = trialDaysRemaining(tenant.trial_ends_at);
  const periodDays = periodDaysRemaining(tenant.current_period_end ?? tenant.subscription_ends_at);
  const needsPayment = ['PAYMENT_DUE', 'PAST_DUE', 'EXPIRED'].includes(status);
  const lastPayment  = payments[0] ?? null;

  return (
    <div style={{ padding: '24px', maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
          {t('sub.title')}
        </h2>
        <StatusBadge status={status} />
      </div>

      {/* Info card */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <InfoRow
          label={t('sub.plan')}
          value={`${plan === 'yearly' ? t('sub.yearlyPlan') : t('sub.monthlyPlan')} — ${formatCurrency(getPlanPrice(config, plan))}`}
        />

        {status === 'TRIAL' && (
          <InfoRow
            label={t('sub.trialEnds')}
            value={t('sub.daysLeft', { n: trialDays })}
            valueColor="#1d4ed8"
          />
        )}

        {status === 'ACTIVE' && (tenant.current_period_end ?? tenant.subscription_ends_at) && (
          <div>
            <InfoRow
              label={t('sub.renewalDate')}
              value={formatDate(tenant.current_period_end ?? tenant.subscription_ends_at)}
            />
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
              {t('sub.daysLeft', { n: periodDays })}
            </div>
          </div>
        )}

        {(status === 'PAST_DUE' || status === 'EXPIRED') && (
          <InfoRow
            label={t('sub.subscriptionEnded')}
            value={formatDate(tenant.subscription_ends_at ?? tenant.current_period_end)}
            valueColor="#dc2626"
          />
        )}

        {needsPayment && (
          <InfoRow
            label={t('sub.amountDue')}
            value={formatCurrency(getPlanPrice(config, plan))}
            valueColor="#dc2626"
          />
        )}

        {status === 'PAYMENT_PENDING' && (
          <InfoRow
            label={t('sub.amountDue')}
            value={formatCurrency(getPlanPrice(config, plan))}
            valueColor="#d97706"
          />
        )}
      </div>

      {/* Trial expiry warning (≤ 3 days left) */}
      {status === 'TRIAL' && trialDays <= 3 && (
        <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 10, padding: '14px 16px', fontSize: 13, color: '#92400e', lineHeight: 1.6 }}>
          ⏰ {t('sub.daysLeft', { n: trialDays })} — {t('sub.afterTrial')}: {formatCurrency(getPlanPrice(config, plan))}
        </div>
      )}

      {/* Status-specific content */}

      {/* PAYMENT_DUE */}
      {status === 'PAYMENT_DUE' && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20 }}>
          <p style={{ margin: '0 0 16px', fontSize: 14, color: '#475569', lineHeight: 1.6 }}>
            {t('sub.trialExpired')} {t('sub.paymentDueMsg')}
          </p>
          <PaymentForm tenant={tenant} config={config} onSuccess={() => void load()} />
        </div>
      )}

      {/* PAST_DUE — urgent */}
      {status === 'PAST_DUE' && (
        <div style={{ background: '#fff', borderRadius: 12, border: '2px solid #fed7aa', padding: 20 }}>
          <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#c2410c', lineHeight: 1.5 }}>
            ⚠️ {t('sub.pastDueMsg')}
          </div>
          <PaymentForm tenant={tenant} config={config} onSuccess={() => void load()} />
        </div>
      )}

      {/* EXPIRED */}
      {status === 'EXPIRED' && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #fecaca', padding: 20 }}>
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#991b1b', lineHeight: 1.5 }}>
            🔒 {t('sub.expiredMsg')}
          </div>
          <PaymentForm tenant={tenant} config={config} onSuccess={() => void load()} />
        </div>
      )}

      {/* PAYMENT_PENDING */}
      {status === 'PAYMENT_PENDING' && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '16px 20px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>⏳</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#d97706', marginBottom: 4 }}>
              {t('sub.status.PAYMENT_PENDING')}
            </div>
            <div style={{ fontSize: 13, color: '#92400e', lineHeight: 1.6 }}>{t('sub.pendingMsg')}</div>
          </div>
        </div>
      )}

      {/* ACTIVE */}
      {status === 'ACTIVE' && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '14px 16px', display: 'flex', gap: 10, alignItems: 'center' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          <div style={{ fontSize: 13, color: '#15803d', fontWeight: 500 }}>{t('sub.activeMsg')}</div>
        </div>
      )}

      {/* SUSPENDED */}
      {status === 'SUSPENDED' && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '16px 20px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#dc2626', marginBottom: 6 }}>
            {t('sub.status.SUSPENDED')}
          </div>
          <div style={{ fontSize: 13, color: '#b91c1c', lineHeight: 1.6 }}>{t('sub.suspendedMsg')}</div>
        </div>
      )}

      {/* CANCELLED */}
      {status === 'CANCELLED' && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '16px 20px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
            {t('sub.status.CANCELLED')}
          </div>
          <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>{t('sub.cancelledMsg')}</div>
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

          {/* Re-submit after rejection (only if status is PAYMENT_DUE/EXPIRED and last payment was rejected) */}
          {lastPayment?.status === 'REJECTED' && needsPayment && (
            <div style={{ padding: 16, borderTop: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: 13, color: '#dc2626', marginBottom: 12 }}>
                <strong>{t('sub.rejectionReason')}:</strong> {lastPayment.rejection_reason}
              </div>
              <PaymentForm tenant={tenant} config={config} onSuccess={() => void load()} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
