import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Globe, CheckCircle2, XCircle, Trash2, Shield, AlertCircle } from 'lucide-react';
import { getSupabaseClient } from '../../../lib/supabase';

interface DomainRequest {
  id: string;
  tenant_id: string;
  domain: string;
  status: 'pending' | 'approved' | 'rejected' | 'verified' | 'connected';
  is_primary: boolean;
  verification_status: string;
  ssl_status: string;
  requested_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  tenant_name?: string;
  tenant_slug?: string;
}

export function SuperAdminDomains() {
  const [domains, setDomains] = useState<DomainRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  useEffect(() => {
    void loadDomains();
  }, []);

  const loadDomains = async () => {
    setLoading(true);
    const client = getSupabaseClient();
    if (!client) {
      toast.error('Database connection unavailable');
      setLoading(false);
      return;
    }

    const { data, error } = await client
      .from('tenant_domains')
      .select(`
        *,
        tenants:tenant_id (
          name,
          slug
        )
      `)
      .is('deleted_at', null)
      .order('requested_at', { ascending: false });

    if (error) {
      console.error('Failed to load domain requests:', error);
      toast.error('Failed to load domain requests');
    } else {
      const formatted = (data || []).map((d: any) => ({
        ...d,
        tenant_name: d.tenants?.name || 'Unknown',
        tenant_slug: d.tenants?.slug || 'unknown'
      }));
      setDomains(formatted);
    }
    
    setLoading(false);
  };

  const handleApprove = async (domainId: string) => {
    const client = getSupabaseClient();
    if (!client) {
      toast.error('Database connection unavailable');
      return;
    }

    const { error } = await client
      .from('tenant_domains')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString()
      })
      .eq('id', domainId);

    if (error) {
      console.error('Failed to approve domain:', error);
      toast.error('Failed to approve domain');
    } else {
      toast.success('Domain approved successfully');
      void loadDomains();
    }
  };

  const handleReject = async (domainId: string, reason: string) => {
    if (!reason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      toast.error('Database connection unavailable');
      return;
    }

    const { error } = await client
      .from('tenant_domains')
      .update({
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        rejection_reason: reason
      })
      .eq('id', domainId);

    if (error) {
      console.error('Failed to reject domain:', error);
      toast.error('Failed to reject domain');
    } else {
      toast.success('Domain rejected');
      setRejectingId(null);
      setRejectionReason('');
      void loadDomains();
    }
  };

  const handleSetPrimary = async (domainId: string) => {
    const client = getSupabaseClient();
    if (!client) {
      toast.error('Database connection unavailable');
      return;
    }

    const { error } = await client
      .from('tenant_domains')
      .update({ is_primary: true })
      .eq('id', domainId);

    if (error) {
      console.error('Failed to set primary domain:', error);
      toast.error('Failed to set primary domain');
    } else {
      toast.success('Primary domain updated');
      void loadDomains();
    }
  };

  const handleDelete = async (domainId: string) => {
    if (!confirm('Are you sure you want to permanently delete this domain?')) return;

    const client = getSupabaseClient();
    if (!client) {
      toast.error('Database connection unavailable');
      return;
    }

    const { error } = await client
      .from('tenant_domains')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', domainId);

    if (error) {
      console.error('Failed to delete domain:', error);
      toast.error('Failed to delete domain');
    } else {
      toast.success('Domain deleted');
      void loadDomains();
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { icon: any; text: string; color: string; bg: string }> = {
      pending: { icon: AlertCircle, text: 'Pending', color: '#f59e0b', bg: '#fef3c7' },
      approved: { icon: CheckCircle2, text: 'Approved', color: '#10b981', bg: '#d1fae5' },
      rejected: { icon: XCircle, text: 'Rejected', color: '#ef4444', bg: '#fee2e2' },
      verified: { icon: CheckCircle2, text: 'Verified', color: '#3b82f6', bg: '#dbeafe' },
      connected: { icon: CheckCircle2, text: 'Connected', color: '#16a34a', bg: '#dcfce7' }
    };

    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;

    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, color: badge.color, background: badge.bg }}>
        <Icon size={12} />
        {badge.text}
      </span>
    );
  };

  const filteredDomains = filter === 'all' 
    ? domains 
    : domains.filter(d => d.status === filter);

  if (loading) {
    return <div style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>Loading domains...</div>;
  }

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Globe size={24} style={{ color: '#dc2626' }} />
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Custom Domain Management</h2>
        </div>
        <p style={{ fontSize: 13, color: '#64748b' }}>Approve, reject, or manage tenant custom domain requests</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              background: filter === f ? '#dc2626' : '#f1f5f9',
              color: filter === f ? '#fff' : '#64748b'
            }}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === 'pending' && domains.filter(d => d.status === 'pending').length > 0 && (
              <span style={{ marginLeft: 6, padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.2)' }}>
                {domains.filter(d => d.status === 'pending').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Domain Requests Table */}
      {filteredDomains.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', border: '2px dashed #e2e8f0', borderRadius: 12 }}>
          <Globe size={48} style={{ color: '#cbd5e1', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>
            No {filter !== 'all' ? filter : ''} domain requests
          </h3>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <tr>
                <th style={{ padding: 12, textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Tenant</th>
                <th style={{ padding: 12, textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Domain</th>
                <th style={{ padding: 12, textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: 12, textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Requested</th>
                <th style={{ padding: 12, textAlign: 'right', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDomains.map(domain => (
                <tr key={domain.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{domain.tenant_name}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>/{domain.tenant_slug}</div>
                  </td>
                  <td style={{ padding: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{domain.domain}</span>
                      {domain.is_primary && (
                        <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 600, color: '#7c3aed', background: '#f3e8ff' }}>PRIMARY</span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: 12 }}>
                    {getStatusBadge(domain.status)}
                    {domain.status === 'rejected' && domain.rejection_reason && (
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, maxWidth: 200 }}>
                        {domain.rejection_reason}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: 12, fontSize: 12, color: '#64748b' }}>
                    {new Date(domain.requested_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: 12 }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      {domain.status === 'pending' && (
                        <>
                          <button
                            onClick={() => void handleApprove(domain.id)}
                            style={{ padding: '6px 12px', borderRadius: 6, background: '#dcfce7', color: '#16a34a', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            <CheckCircle2 size={12} />
                            Approve
                          </button>
                          <button
                            onClick={() => setRejectingId(domain.id)}
                            style={{ padding: '6px 12px', borderRadius: 6, background: '#fee2e2', color: '#dc2626', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            <XCircle size={12} />
                            Reject
                          </button>
                        </>
                      )}
                      {domain.status === 'approved' && !domain.is_primary && (
                        <button
                          onClick={() => void handleSetPrimary(domain.id)}
                          style={{ padding: '6px 12px', borderRadius: 6, background: '#f3e8ff', color: '#7c3aed', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                          <Shield size={12} />
                          Set Primary
                        </button>
                      )}
                      <button
                        onClick={() => void handleDelete(domain.id)}
                        style={{ padding: '6px 12px', borderRadius: 6, background: '#f1f5f9', color: '#64748b', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectingId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, maxWidth: 500, width: '90%' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', marginBottom: 16 }}>Reject Domain Request</h3>
            <textarea
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              placeholder="Provide a reason for rejection..."
              style={{ width: '100%', minHeight: 100, padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setRejectingId(null); setRejectionReason(''); }}
                style={{ padding: '8px 16px', borderRadius: 8, background: '#f1f5f9', color: '#0f172a', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={() => void handleReject(rejectingId, rejectionReason)}
                disabled={!rejectionReason.trim()}
                style={{ padding: '8px 16px', borderRadius: 8, background: '#dc2626', color: '#fff', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', opacity: !rejectionReason.trim() ? 0.5 : 1 }}
              >
                Reject Domain
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
