import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Globe, Plus, CheckCircle2, XCircle, Clock, AlertCircle, Trash2, ExternalLink } from 'lucide-react';
import { getSupabaseClient } from '../../../lib/supabase';
import { useAuth } from '../../lib/auth';

interface CustomDomain {
  id: string;
  domain: string;
  status: 'pending' | 'approved' | 'rejected' | 'verified' | 'connected';
  is_primary: boolean;
  verification_status: string;
  verification_token: string;
  ssl_status: string;
  requested_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
}

export function CustomDomainManager() {
  const { profile } = useAuth();
  const [domains, setDomains] = useState<CustomDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const tenantId = profile?.owned_tenant_id;
  const tenantSlug = profile?.owned_tenant_slug;

  useEffect(() => {
    if (tenantId) {
      void loadDomains();
    }
  }, [tenantId]);

  const loadDomains = async () => {
    if (!tenantId) return;
    
    setLoading(true);
    const client = getSupabaseClient();
    if (!client) {
      toast.error('Database connection unavailable');
      setLoading(false);
      return;
    }

    const { data, error } = await client
      .from('tenant_domains')
      .select('*')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to load domains:', error);
      toast.error('Failed to load domains');
    } else {
      setDomains(data || []);
    }
    
    setLoading(false);
  };

  const handleSubmitRequest = async () => {
    if (!newDomain.trim() || !tenantId) return;

    setSubmitting(true);
    const client = getSupabaseClient();
    if (!client) {
      toast.error('Database connection unavailable');
      setSubmitting(false);
      return;
    }

    // Client-side validation
    const normalized = newDomain.toLowerCase().trim()
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '');

    if (!normalized || normalized.includes(' ')) {
      toast.error('Invalid domain format');
      setSubmitting(false);
      return;
    }

    if (normalized === 'localhost' || normalized.startsWith('127.') || normalized.startsWith('192.168.')) {
      toast.error('Cannot use localhost or local IPs');
      setSubmitting(false);
      return;
    }

    const { error } = await client
      .from('tenant_domains')
      .insert({
        tenant_id: tenantId,
        domain: normalized,
        status: 'pending'
      });

    if (error) {
      console.error('Failed to submit domain request:', error);
      if (error.code === '23505') {
        toast.error('This domain is already registered');
      } else {
        toast.error('Failed to submit domain request');
      }
    } else {
      toast.success('Domain request submitted for approval');
      setNewDomain('');
      setShowAddForm(false);
      void loadDomains();
    }

    setSubmitting(false);
  };

  const handleDelete = async (domainId: string) => {
    if (!confirm('Are you sure you want to delete this domain request?')) return;

    const client = getSupabaseClient();
    if (!client) {
      toast.error('Database connection unavailable');
      return;
    }

    const { error } = await client
      .from('tenant_domains')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', domainId)
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('Failed to delete domain:', error);
      toast.error('Failed to delete domain');
    } else {
      toast.success('Domain removed');
      void loadDomains();
    }
  };

  const getStatusBadge = (domain: CustomDomain) => {
    // Determine display status based on status and verification_status
    let displayStatus = domain.status;
    let displayText = '';
    
    if (domain.status === 'pending') {
      displayText = 'Pending Approval';
    } else if (domain.status === 'approved' && domain.verification_status === 'not_verified') {
      displayText = 'Pending DNS Verification';
    } else if (domain.status === 'approved' && domain.verification_status === 'verified') {
      displayText = 'DNS Verified';
    } else if (domain.status === 'rejected') {
      displayText = 'Rejected';
    } else if (domain.status === 'connected') {
      displayText = 'Connected';
    } else {
      displayText = 'Approved';
    }

    const badges: Record<string, { icon: any; color: string; bg: string }> = {
      pending: { icon: Clock, color: '#f59e0b', bg: '#fef3c7' },
      approved: { icon: CheckCircle2, color: '#3b82f6', bg: '#dbeafe' },
      rejected: { icon: XCircle, color: '#ef4444', bg: '#fee2e2' },
      verified: { icon: CheckCircle2, color: '#10b981', bg: '#d1fae5' },
      connected: { icon: CheckCircle2, color: '#16a34a', bg: '#dcfce7' }
    };

    const badge = badges[domain.status] || badges.pending;
    const Icon = badge.icon;

    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, color: badge.color, background: badge.bg }}>
        <Icon size={12} />
        {displayText}
      </span>
    );
  };

  if (loading) {
    return <div style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>Loading domains...</div>;
  }

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Custom Domains</h2>
          <p style={{ fontSize: 13, color: '#64748b' }}>Connect your own domain to your news website</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: '#dc2626', color: '#fff', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer' }}
        >
          <Plus size={16} />
          Request Domain
        </button>
      </div>

      {/* Default Domain Info */}
      <div style={{ padding: 16, borderRadius: 12, background: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Default URL</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
          {window.location.origin}/{tenantSlug}
        </div>
      </div>

      {/* Add Domain Form */}
      {showAddForm && (
        <div style={{ padding: 16, borderRadius: 12, background: '#fff', border: '1px solid #e2e8f0', marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>Request New Domain</h3>
          <div style={{ marginBottom: 12 }}>
            <input
              type="text"
              value={newDomain}
              onChange={e => setNewDomain(e.target.value)}
              placeholder="yourdomain.com"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }}
            />
            <p style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
              Enter your domain without http:// or https:// (e.g., yourdomain.com)
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => void handleSubmitRequest()}
              disabled={submitting || !newDomain.trim()}
              style={{ padding: '8px 16px', borderRadius: 8, background: '#dc2626', color: '#fff', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', opacity: submitting || !newDomain.trim() ? 0.5 : 1 }}
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
            <button
              onClick={() => { setShowAddForm(false); setNewDomain(''); }}
              style={{ padding: '8px 16px', borderRadius: 8, background: '#f1f5f9', color: '#0f172a', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Domains List */}
      {domains.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', border: '2px dashed #e2e8f0', borderRadius: 12 }}>
          <Globe size={48} style={{ color: '#cbd5e1', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>No custom domains</h3>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>Click "Request Domain" to connect your own domain</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {domains.map(domain => (
            <div key={domain.id} style={{ padding: 16, borderRadius: 12, background: '#fff', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>{domain.domain}</span>
                    {getStatusBadge(domain)}
                    {domain.is_primary && (
                      <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600, color: '#7c3aed', background: '#f3e8ff' }}>PRIMARY</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    Requested: {new Date(domain.requested_at).toLocaleDateString()}
                  </div>
                  {domain.status === 'rejected' && domain.rejection_reason && (
                    <div style={{ marginTop: 8, padding: 8, borderRadius: 6, background: '#fee2e2', display: 'flex', alignItems: 'start', gap: 6 }}>
                      <AlertCircle size={14} style={{ color: '#ef4444', marginTop: 2, flexShrink: 0 }} />
                      <div style={{ fontSize: 12, color: '#991b1b' }}>
                        <strong>Rejected:</strong> {domain.rejection_reason}
                      </div>
                    </div>
                  )}
                  {domain.status === 'approved' && (
                    <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: '#f8fafc', fontSize: 12 }}>
                      <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>DNS Configuration:</div>
                      
                      {/* Step 1: Domain Ownership Verification */}
                      <div style={{ marginBottom: 12, padding: 10, borderRadius: 6, background: '#fff', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontWeight: 600, color: '#dc2626', marginBottom: 6 }}>Step 1: Verify Domain Ownership</div>
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>
                          Add this TXT record to prove you own the domain:
                        </div>
                        <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#0f172a', background: '#f8fafc', padding: 8, borderRadius: 4 }}>
                          Type: <strong>TXT</strong><br />
                          Host: <strong>_domain-verification</strong><br />
                          Value: <strong>{domain.verification_token}</strong><br />
                          TTL: <strong>3600</strong>
                        </div>
                      </div>

                      {/* Step 2: Point Domain to Platform */}
                      <div style={{ padding: 10, borderRadius: 6, background: '#fff', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontWeight: 600, color: '#dc2626', marginBottom: 6 }}>Step 2: Point Domain</div>
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>
                          After verification is complete, point your domain:
                        </div>
                        <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#0f172a', background: '#f8fafc', padding: 8, borderRadius: 4 }}>
                          Type: <strong>CNAME</strong><br />
                          Host: <strong>www</strong> (or @)<br />
                          Value: <strong>csuocfxbucohfvowfwtq.supabase.co</strong><br />
                          TTL: <strong>3600</strong>
                        </div>
                      </div>

                      <div style={{ marginTop: 8, fontSize: 11, color: '#64748b' }}>
                        ℹ️ DNS changes may take up to 48 hours to propagate. Contact support if you need help.
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {domain.status === 'connected' && (
                    <a
                      href={`https://${domain.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ padding: '6px 12px', borderRadius: 6, background: '#f1f5f9', color: '#0f172a', fontSize: 12, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <ExternalLink size={14} />
                      Visit
                    </a>
                  )}
                  {domain.status === 'pending' && (
                    <button
                      onClick={() => void handleDelete(domain.id)}
                      style={{ padding: '6px 12px', borderRadius: 6, background: '#fee2e2', color: '#dc2626', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <Trash2 size={14} />
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
