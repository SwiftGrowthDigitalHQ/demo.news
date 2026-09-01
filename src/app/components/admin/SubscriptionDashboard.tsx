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
 *  - Plan switching reuses the existing UPI payment flow: the customer pays
 *    for the new plan and the admin approves it. The active plan only changes
 *    after server-side approval — never from client state alone.
 *
 * Handles all subscription states:
 *   TRIAL          → trial countdown + plan selector + optional early-pay
 *   PAYMENT_DUE    → UPI QR + UTR submission form
 *   PAYMENT_PENDING→ waiting message (no action available)
 *   ACTIVE         → renewal info + plan switcher
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
  PLANS,
  loadMyTenant,
  loadMyPayments,
  loadPaymentConfig,
  submitPayment,
  markPlanChangePending,
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
      <QRCodeSVG value={uri} size={size} bgColor="#ffffff" fgColor="#0f172a" level="M" />
    </div>
  );
}

// ── Payment submission form ───────────────────────────────────────────────────
// overridePlan: when set (for plan switches), the form pays for this plan
//               instead of the tenant's current plan.
function PaymentForm({
  tenant,
  config,
  onSuccess,
  overridePlan,
  isPlanSwitch = false,
}: {
  tenant: TenantRow;
  config: PaymentConfig;
  onSuccess: () => void;
  overridePlan?: PlanId;
  isPlanSwitch?: boolean;
}) {
  const { t } = useI18n();

  // The plan being paid for: override (for plan switch) or current plan (for renewal)
  const payingForPlan: PlanId = overridePlan ?? (tenant.subscription_plan as PlanId);

  // Amount comes exclusively from server-fetched config — never from React state
  const amount  = getPlanPrice(config, payingForPlan);
  const upiUri  = buildUpiUri(amount, config.upi_id, config.merchant_name);
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  const [utr,        setUtr]        = useState('');
  const [payDate,    setPayDate]    = useState(new Date().toISOString().split('T')[0]);
  const [notes,      setNotes]      = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [step,       setStep]       = useState<'pay' | 'form'>('pay');

  const submittingRef = useRef(false);

  const handleSubmit = async () => {
    if (submittingRef.current) return;
    if (!utr.trim()) { toast.error(t('sub.utrLabel') + ' is required.'); return; }
    if (!payDate)    { toast.error(t('sub.paymentDateLabel') + ' is required.'); return; }

    submittingRef.current = true;
    setSubmitting(true);
    try {
      const result = await submitPayment({
        tenantId:    tenant.id,
        plan:        payingForPlan,   // new plan for plan switch; current plan for renewal
        upiIdUsed:   config.upi_id,
        utr:         utr.trim(),
        paymentDate: payDate,
        notes:       notes || null,
        paymentType: 'subscription',
      });

      // For plan switches, also record the intent in the tenants table so
      // the dashboard can show the correct pending state immediately.
      if (isPlanSwitch && overridePlan) {
        try {
          await markPlanChangePending(tenant.id, overridePlan);
        } catch {
          // Non-fatal: the payment was already submitted successfully.
          // The plan_change_status column will be out of sync but the payment
          // and approve flow still work correctly.
        }
      }

      void result; // amount is already shown in the UI; we don't need it here
      toast.success(isPlanSwitch ? t('sub.planSwitchSubmitted') : t('sub.paymentRecorded'));
      onSuccess();
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('sub.submitError');
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

  const planLabel = payingForPlan === 'yearly' ? t('sub.yearlyPlan') : t('sub.monthlyPlan');

  if (step === 'form') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Amount summary */}
        <div style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>{t('sub.plan')}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
              {planLabel} — {formatCurrency(amount)}
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

        {isPlanSwitch && (
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#1d4ed8', lineHeight: 1.5 }}>
            ℹ️ {t('sub.planSwitchNote')}
          </div>
        )}

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
      {/* Amount due */}
      <div style={{ background: '#fef2f2', borderRadius: 10, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, border: '1px solid #fecaca' }}>
        <div>
          <div style={{ fontSize: 12, color: '#b91c1c', fontWeight: 600 }}>{t('sub.amountDue')}</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#dc2626', letterSpacing: '-0.03em' }}>
            {formatCurrency(amount)}
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{planLabel}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>{t('sub.upiId')}</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', fontFamily: 'monospace', letterSpacing: '0.02em', marginBottom: 6 }}>
            {config.upi_id}
          </div>
          <CopyButton text={config.upi_id} label={t('sub.copyUpiId')} />
        </div>
      </div>

      {/* QR / mobile */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {!isMobile && (
          <div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8, fontWeight: 500 }}>{t('sub.scanQr')}</div>
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

// ── Plan switcher section ─────────────────────────────────────────────────────
// Shows when the customer has an ACTIVE or TRIAL subscription and can switch.
// Renders a confirmation modal, then reuses PaymentForm for the actual payment.
function PlanSwitcher({
  tenant,
  config,
  onSwitchSubmitted,
}: {
  tenant: TenantRow;
  config: PaymentConfig;
  onSwitchSubmitted: () => void;
}) {
  const { t } = useI18n();

  const currentPlan: PlanId = tenant.subscription_plan as PlanId;
  const otherPlan: PlanId   = currentPlan === 'monthly' ? 'yearly' : 'monthly';

  const monthlySaving = config.monthly_price * 12 - config.yearly_price;

  // switch flow state
  const [confirmingPlan, setConfirmingPlan] = useState<PlanId | null>(null);
  const [paying,         setPaying]         = useState(false);

  // Already has a pending plan-change payment
  const changePending = tenant.plan_change_status === 'pending';

  if (changePending) {
    return (
      <div style={{
        borderRadius: 14,
        border: '1.5px solid #e2e8f0',
        background: '#fff',
        padding: 20,
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>
          {t('sub.changePlanTitle')}
        </div>
        <div style={{
          background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
          border: '1.5px solid #fde68a',
          borderRadius: 10,
          padding: '14px 16px',
          fontSize: 13,
          color: '#92400e',
          lineHeight: 1.6,
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          <span>
            {t('sub.planChangePending', {
              plan: tenant.requested_plan === 'yearly' ? t('sub.yearlyPlan') : t('sub.monthlyPlan'),
            })}
          </span>
        </div>
      </div>
    );
  }

  // Show the full payment form for the target plan
  if (paying && confirmingPlan) {
    return (
      <div style={{
        borderRadius: 14,
        border: '1.5px solid #e2e8f0',
        background: '#fff',
        padding: 20,
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <button
            type="button"
            onClick={() => { setPaying(false); setConfirmingPlan(null); }}
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              cursor: 'pointer',
              color: '#475569',
              fontSize: 13,
              fontWeight: 600,
              padding: '6px 12px',
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#e2e8f0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#f8fafc';
            }}
          >
            ← {t('sub.back')}
          </button>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
            {t('sub.switchingTo', {
              plan: confirmingPlan === 'yearly' ? t('sub.yearlyPlan') : t('sub.monthlyPlan'),
            })}
          </div>
        </div>
        <PaymentForm
          tenant={tenant}
          config={config}
          overridePlan={confirmingPlan}
          isPlanSwitch={true}
          onSuccess={() => {
            setPaying(false);
            setConfirmingPlan(null);
            onSwitchSubmitted();
          }}
        />
      </div>
    );
  }

  return (
    <div style={{
      borderRadius: 14,
      border: '1.5px solid #e2e8f0',
      background: '#fff',
      padding: 20,
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
        {t('sub.changePlanTitle')}
      </div>
      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 18, lineHeight: 1.5 }}>
        {t('sub.changePlanDesc')}
      </div>

      {/* Confirmation modal (inline) - responsive design */}
      {confirmingPlan && !paying && (
        <div style={{
          background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
          border: '2px solid #e2e8f0',
          borderRadius: 12,
          padding: '20px',
          marginBottom: 16,
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
        }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            {t('sub.confirmSwitchTitle')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16, fontSize: 14 }}>
            <div style={{
              background: '#fff',
              border: '1.5px solid #e2e8f0',
              borderRadius: 8,
              padding: '12px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 8,
            }}>
              <div>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2, fontWeight: 600, letterSpacing: '0.05em' }}>
                  {t('sub.confirmCurrentPlan').toUpperCase()}
                </div>
                <div style={{ color: '#0f172a', fontWeight: 700 }}>
                  {currentPlan === 'yearly' ? t('sub.yearlyPlan') : t('sub.monthlyPlan')}
                </div>
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#64748b' }}>
                {formatCurrency(getPlanPrice(config, currentPlan))}
              </div>
            </div>

            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 20, padding: '4px 0' }}>↓</div>

            <div style={{
              background: '#fef2f2',
              border: '2px solid #dc2626',
              borderRadius: 8,
              padding: '12px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 8,
            }}>
              <div>
                <div style={{ fontSize: 11, color: '#b91c1c', marginBottom: 2, fontWeight: 600, letterSpacing: '0.05em' }}>
                  {t('sub.confirmNewPlan').toUpperCase()}
                </div>
                <div style={{ color: '#dc2626', fontWeight: 700 }}>
                  {confirmingPlan === 'yearly' ? t('sub.yearlyPlan') : t('sub.monthlyPlan')}
                </div>
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#dc2626' }}>
                {formatCurrency(getPlanPrice(config, confirmingPlan))}
              </div>
            </div>

            {confirmingPlan === 'yearly' && monthlySaving > 0 && (
              <div style={{
                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                border: '1.5px solid #bbf7d0',
                borderRadius: 8,
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23"/><polyline points="17 5 12 1 7 5"/><polyline points="7 19 12 23 17 19"/>
                </svg>
                <span style={{ color: '#16a34a', fontWeight: 700, fontSize: 13 }}>
                  {t('sub.yearlySaving', { amount: formatCurrency(monthlySaving) })}
                </span>
              </div>
            )}
          </div>

          <div style={{
            background: '#eff6ff',
            border: '1.5px solid #bfdbfe',
            borderRadius: 8,
            padding: '12px 14px',
            fontSize: 12,
            color: '#1e40af',
            lineHeight: 1.6,
            marginBottom: 16,
            display: 'flex',
            gap: 8,
            alignItems: 'flex-start',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12" stroke="#fff" strokeWidth="2"/>
              <line x1="12" y1="8" x2="12.01" y2="8" stroke="#fff" strokeWidth="2"/>
            </svg>
            <span>{t('sub.planSwitchNote')}</span>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setConfirmingPlan(null)}
              style={{
                flex: '1 1 120px',
                height: 44,
                borderRadius: 9,
                border: '1.5px solid #e2e8f0',
                background: '#fff',
                color: '#475569',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f8fafc';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#fff';
              }}
            >
              {t('sub.cancel')}
            </button>
            <button
              type="button"
              onClick={() => setPaying(true)}
              style={{
                flex: '2 1 200px',
                height: 44,
                borderRadius: 9,
                border: 'none',
                background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
                color: '#fff',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(220, 38, 38, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.3)';
              }}
            >
              {t('sub.continueToPayment')} →
            </button>
          </div>
        </div>
      )}

      {/* Plan cards - responsive grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 12,
      }}>
        {(['monthly', 'yearly'] as PlanId[]).map(p => {
          const isCurrent = p === currentPlan;
          const price     = getPlanPrice(config, p);
          const label     = p === 'yearly' ? t('sub.yearlyPlan') : t('sub.monthlyPlan');
          const interval  = p === 'yearly' ? t('sub.perYear') : t('sub.perMonth');

          return (
            <div
              key={p}
              style={{
                borderRadius: 12,
                border: isCurrent ? '2px solid #16a34a' : '1.5px solid #e2e8f0',
                background: isCurrent ? '#f0fdf4' : '#fff',
                padding: 18,
                position: 'relative',
                transition: 'all 0.2s ease',
                boxShadow: isCurrent ? '0 4px 12px rgba(22, 163, 74, 0.15)' : '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              {isCurrent && (
                <div style={{
                  position: 'absolute', top: -10, left: 14,
                  background: '#16a34a', color: '#fff',
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
                  padding: '3px 10px', borderRadius: 99,
                  boxShadow: '0 2px 6px rgba(22, 163, 74, 0.3)',
                }}>
                  {t('sub.currentPlan').toUpperCase()}
                </div>
              )}
              {p === 'yearly' && monthlySaving > 0 && !isCurrent && (
                <div style={{
                  position: 'absolute', top: -10, right: 14,
                  background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
                  color: '#fff',
                  fontSize: 10, fontWeight: 700,
                  padding: '3px 10px', borderRadius: 99,
                  boxShadow: '0 2px 6px rgba(220, 38, 38, 0.3)',
                }}>
                  {t('sub.saveBadge', { amount: formatCurrency(monthlySaving) })}
                </div>
              )}

              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 6, marginTop: isCurrent || (p === 'yearly' && monthlySaving > 0) ? 6 : 0 }}>
                {label}
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                {formatCurrency(price)}
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 14, marginTop: 2 }}>{interval}</div>

              {isCurrent ? (
                <div style={{
                  height: 38,
                  borderRadius: 8,
                  background: '#dcfce7',
                  color: '#16a34a',
                  fontSize: 13,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  border: '1.5px solid #bbf7d0',
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  {t('sub.currentPlan')}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingPlan(p)}
                  style={{
                    width: '100%',
                    height: 38,
                    borderRadius: 8,
                    border: 'none',
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.2)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(15, 23, 42, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(15, 23, 42, 0.2)';
                  }}
                >
                  {p === 'yearly' ? t('sub.switchToYearly') : t('sub.switchToMonthly')}
                </button>
              )}
            </div>
          );
        })}
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

  const status     = tenant.subscription_status;
  const plan       = tenant.subscription_plan as PlanId;
  const trialDays  = trialDaysRemaining(tenant.trial_ends_at);
  const periodDays = periodDaysRemaining(tenant.current_period_end ?? tenant.subscription_ends_at);
  const needsPayment = ['PAYMENT_DUE', 'PAST_DUE', 'EXPIRED'].includes(status);
  const lastPayment  = payments[0] ?? null;

  // Plan switcher is always shown (regardless of subscription status) unless
  // there is already a pending plan-change payment.
  const canSwitchPlan = status !== 'PAYMENT_PENDING';

  // Yearly saving (for the yearly badge on the plan cards)
  const _ = PLANS; // keep import used

  return (
    <div style={{
      padding: '20px',
      maxWidth: 680,
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
    }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
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

      {/* ── Status-specific content ── */}

      {status === 'PAYMENT_DUE' && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20 }}>
          <p style={{ margin: '0 0 16px', fontSize: 14, color: '#475569', lineHeight: 1.6 }}>
            {t('sub.trialExpired')} {t('sub.paymentDueMsg')}
          </p>
          <PaymentForm tenant={tenant} config={config} onSuccess={() => void load()} />
        </div>
      )}

      {status === 'PAST_DUE' && (
        <div style={{ background: '#fff', borderRadius: 12, border: '2px solid #fed7aa', padding: 20 }}>
          <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#c2410c', lineHeight: 1.5 }}>
            ⚠️ {t('sub.pastDueMsg')}
          </div>
          <PaymentForm tenant={tenant} config={config} onSuccess={() => void load()} />
        </div>
      )}

      {status === 'EXPIRED' && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #fecaca', padding: 20 }}>
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#991b1b', lineHeight: 1.5 }}>
            🔒 {t('sub.expiredMsg')}
          </div>
          <PaymentForm tenant={tenant} config={config} onSuccess={() => void load()} />
        </div>
      )}

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

      {status === 'ACTIVE' && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '14px 16px', display: 'flex', gap: 10, alignItems: 'center' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          <div style={{ fontSize: 13, color: '#15803d', fontWeight: 500 }}>{t('sub.activeMsg')}</div>
        </div>
      )}

      {status === 'SUSPENDED' && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '16px 20px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#dc2626', marginBottom: 6 }}>
            {t('sub.status.SUSPENDED')}
          </div>
          <div style={{ fontSize: 13, color: '#b91c1c', lineHeight: 1.6 }}>{t('sub.suspendedMsg')}</div>
        </div>
      )}

      {status === 'CANCELLED' && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '16px 20px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
            {t('sub.status.CANCELLED')}
          </div>
          <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>{t('sub.cancelledMsg')}</div>
        </div>
      )}

      {/* ── Plan switcher — only shown when subscription is active/trial ── */}
      {canSwitchPlan && (
        <PlanSwitcher
          tenant={tenant}
          config={config}
          onSwitchSubmitted={() => void load()}
        />
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
