import { useState, useEffect } from 'react';
import { getAllPayments, approvePayment, rejectPayment, type TenantPayment } from '../../lib/superAdmin';

export function PaymentApprovalPanel() {
  const [payments, setPayments] = useState<TenantPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'ALL'>('SUBMITTED');

  useEffect(() => {
    loadPayments();
  }, [filter]);

  async function loadPayments() {
    setLoading(true);
    const data = await getAllPayments({
      status: filter === 'ALL' ? undefined : filter,
      sortBy: 'submitted_at',
      sortOrder: 'desc',
    });
    setPayments(data);
    setLoading(false);
  }

  async function handleApprove(paymentId: string, plan: 'monthly' | 'yearly') {
    const months = plan === 'monthly' ? 1 : 12;
    const confirmed = confirm(`Approve payment for ${months} month(s)?`);
    if (!confirmed) return;

    const result = await approvePayment(paymentId, months);
    if (result.success) {
      alert('Payment approved successfully');
      loadPayments();
    } else {
      alert(`Error: ${result.error}`);
    }
  }

  async function handleReject(paymentId: string) {
    const reason = prompt('Reason for rejection:');
    if (!reason) return;

    const result = await rejectPayment(paymentId, reason);
    if (result.success) {
      alert('Payment rejected');
      loadPayments();
    } else {
      alert(`Error: ${result.error}`);
    }
  }

  const pendingCount = payments.filter(p => p.status === 'SUBMITTED').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payment Approvals</h1>
          {pendingCount > 0 && (
            <p className="text-sm text-amber-600 mt-1 font-medium">
              {pendingCount} payment{pendingCount !== 1 ? 's' : ''} pending review
            </p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <FilterButton
          active={filter === 'SUBMITTED'}
          onClick={() => setFilter('SUBMITTED')}
          label={`Pending (${payments.filter(p => p.status === 'SUBMITTED').length})`}
        />
        <FilterButton
          active={filter === 'APPROVED'}
          onClick={() => setFilter('APPROVED')}
          label="Approved"
        />
        <FilterButton
          active={filter === 'REJECTED'}
          onClick={() => setFilter('REJECTED')}
          label="Rejected"
        />
        <FilterButton
          active={filter === 'ALL'}
          onClick={() => setFilter('ALL')}
          label="All"
        />
      </div>

      {/* Payment List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
            <p className="mt-4 text-slate-600">Loading payments...</p>
          </div>
        </div>
      ) : payments.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-600">No payments found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {payments.map((payment) => (
            <div
              key={payment.id}
              className="bg-white rounded-xl border border-slate-200 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{payment.tenant_name}</h3>
                  <p className="text-sm text-slate-500">/{payment.tenant_slug}</p>
                </div>
                <PaymentStatusBadge status={payment.status} />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Amount</p>
                  <p className="text-lg font-bold text-slate-900">₹{payment.amount}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Plan</p>
                  <p className="text-sm text-slate-900 capitalize">{payment.plan}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">UTR</p>
                  <p className="text-sm text-slate-900">{payment.utr || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Submitted</p>
                  <p className="text-sm text-slate-900">
                    {new Date(payment.submitted_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {payment.notes && (
                <div className="mb-4">
                  <p className="text-sm text-slate-500 mb-1">Notes</p>
                  <p className="text-sm text-slate-900">{payment.notes}</p>
                </div>
              )}

              {payment.rejection_reason && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-medium text-red-900 mb-1">Rejection Reason</p>
                  <p className="text-sm text-red-700">{payment.rejection_reason}</p>
                </div>
              )}

              {payment.status === 'SUBMITTED' && (
                <div className="flex gap-3 pt-4 border-t border-slate-200">
                  <button
                    onClick={() => handleApprove(payment.id, payment.plan)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(payment.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                  >
                    Reject
                  </button>
                </div>
              )}

              {payment.reviewed_at && (
                <div className="pt-4 border-t border-slate-200 text-sm text-slate-500">
                  Reviewed by {payment.reviewed_by_name || 'Unknown'} on{' '}
                  {new Date(payment.reviewed_at).toLocaleDateString()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'bg-red-600 text-white'
          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
      }`}
    >
      {label}
    </button>
  );
}

function PaymentStatusBadge({ status }: { status: 'SUBMITTED' | 'APPROVED' | 'REJECTED' }) {
  const styles = {
    SUBMITTED: 'bg-amber-100 text-amber-700',
    APPROVED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
  };

  return (
    <span className={`inline-block px-3 py-1 text-sm font-medium rounded ${styles[status]}`}>
      {status}
    </span>
  );
}
