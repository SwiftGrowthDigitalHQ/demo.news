import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle, Eye, Globe, Lock, User } from 'lucide-react';
import { listAuditLogs, markAuditLog } from '../../lib/admin';

const blockedIPs = [
  { ip: '185.220.101.45', reason: 'Tor exit node · multiple failed logins', since: '31 May 2026' },
  { ip: '91.108.56.22', reason: 'Suspicious POST requests', since: '31 May 2026' },
  { ip: '194.165.16.40', reason: 'Brute force attempt', since: '28 May 2026' },
];

export function SecurityPanel() {
  const [tab, setTab] = useState('logs');
  const [securityFlags, setSecurityFlags] = useState({
    superAdmin2fa: true,
    editor2fa: true,
    reporter2fa: false,
    loginNotifications: true,
  });
  const [logs, setLogs] = useState<Awaited<ReturnType<typeof listAuditLogs>>>([]);
  const [loading, setLoading] = useState(true);
  const twoFAEnabled = securityFlags.superAdmin2fa && securityFlags.editor2fa;

  const load = async () => {
    setLoading(true);
    try {
      setLogs(await listAuditLogs());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const activityLogs = useMemo(() => logs.slice(0, 20), [logs]);

  if (loading) {
    return <div className="p-6 text-sm text-gray-500">Loading security logs...</div>;
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="rounded-xl border p-5" style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', borderColor: 'transparent' }}>
        <div className="flex items-center gap-4">
          <div className="relative">
            <svg width="80" height="80" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
              <circle cx="40" cy="40" r="34" fill="none" stroke="#16a34a" strokeWidth="8" strokeDasharray={`${(82 / 100) * 213.6} 213.6`} strokeLinecap="round" transform="rotate(-90 40 40)" />
            </svg>
            <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>82</span>
          </div>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>Security Score: Good</h3>
            <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>Audit logs are now sourced from Supabase.</p>
          </div>
          <div className="ml-auto grid grid-cols-2 gap-3">
            {[
              { label: 'SSL Active', ok: true },
              { label: '2FA Enabled', ok: twoFAEnabled },
              { label: 'Firewall', ok: true },
              { label: 'All Reporters 2FA', ok: false },
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,0.06)' }}>
                {item.ok ? <CheckCircle size={14} style={{ color: '#16a34a' }} /> : <AlertTriangle size={14} style={{ color: '#f59e0b' }} />}
                <span style={{ fontSize: 12, color: item.ok ? '#86efac' : '#fde68a' }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 border-b" style={{ borderColor: 'rgba(15,23,42,0.08)' }}>
        {[
          { id: 'logs', label: 'Activity Logs' },
          { id: 'logins', label: 'Login History' },
          { id: 'ip', label: 'IP Restrictions' },
          { id: 'settings', label: '2FA & Settings' },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            style={{ padding: '10px 16px', fontSize: 13, color: tab === item.id ? '#dc2626' : '#64748b', background: 'none', border: 'none', borderBottom: tab === item.id ? '2px solid #dc2626' : '2px solid transparent', cursor: 'pointer', fontWeight: tab === item.id ? 600 : 400, marginBottom: -1 }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'logs' && (
        <div className="rounded-xl border" style={{ background: '#fff', borderColor: 'rgba(15,23,42,0.08)' }}>
          <div className="p-4 border-b" style={{ borderColor: 'rgba(15,23,42,0.06)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>Audit Trail</h3>
          </div>
          <div className="flex flex-col gap-0">
            {activityLogs.map(log => (
              <div key={log.id} className="flex items-start gap-4 p-4 border-b" style={{ borderColor: 'rgba(15,23,42,0.04)' }}>
                <div className="rounded-full flex items-center justify-center mt-0.5 flex-shrink-0" style={{ width: 28, height: 28, background: '#ecfeff' }}>
                  <Eye size={13} style={{ color: '#0891b2' }} />
                </div>
                <div className="flex-1">
                  <div style={{ fontSize: 13, color: '#0f172a' }}>
                    <strong style={{ color: '#0891b2' }}>{log.entity_type}</strong> · {log.action}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1" style={{ fontSize: 11, color: '#94a3b8' }}><Globe size={10} /> {log.ip_address ?? 'Unknown IP'}</span>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>{new Date(log.created_at).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'logins' && (
        <div className="rounded-xl border" style={{ background: '#fff', borderColor: 'rgba(15,23,42,0.08)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['User', 'Device & Browser', 'IP Address', 'Time', 'Status'].map(header => (
                  <th key={header} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.05em' }}>{header.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activityLogs.slice(0, 10).map((log, index) => (
                <tr key={index} style={{ borderTop: '1px solid rgba(15,23,42,0.05)' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div className="flex items-center gap-2">
                      <User size={13} style={{ color: '#94a3b8' }} />
                      <span style={{ fontSize: 13, color: '#0f172a' }}>{log.entity_type}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748b' }}>{log.metadata ? JSON.stringify(log.metadata) : '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: '#0f172a', fontFamily: 'monospace' }}>{log.ip_address ?? '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: '#94a3b8' }}>{new Date(log.created_at).toLocaleString('en-IN')}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, fontWeight: 500, background: '#f0fdf4', color: '#16a34a' }}>✓ Success</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'ip' && (
        <div className="rounded-xl border p-5" style={{ background: '#fff', borderColor: 'rgba(15,23,42,0.08)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>Blocked IP Addresses</h3>
            <button style={{ padding: '6px 16px', borderRadius: 8, background: '#dc2626', color: '#fff', fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer' }}>
              + Block IP
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {blockedIPs.map((item, index) => (
              <div key={index} className="flex items-center gap-4 p-4 rounded-lg border" style={{ background: '#fef2f2', borderColor: '#fecaca' }}>
                <Lock size={16} style={{ color: '#dc2626', flexShrink: 0 }} />
                <div className="flex-1">
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', fontFamily: 'monospace' }}>{item.ip}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{item.reason}</div>
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>Blocked: {item.since}</div>
                <button style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #fecaca', background: '#fff', color: '#dc2626', fontSize: 12, cursor: 'pointer' }}>Unblock</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'settings' && (
        <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="rounded-xl border p-5" style={{ background: '#fff', borderColor: 'rgba(15,23,42,0.08)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 16 }}>Two-Factor Authentication</h3>
            <div className="flex flex-col gap-4">
            {[
                { key: 'superAdmin2fa', label: 'Super Admin 2FA', desc: 'Mandatory for all admin accounts' },
                { key: 'editor2fa', label: 'Editor 2FA', desc: 'Required for content editors' },
                { key: 'reporter2fa', label: 'Reporter 2FA', desc: 'Recommended for reporters' },
                { key: 'loginNotifications', label: 'Login Notifications', desc: 'Email alert on new login' },
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg" style={{ background: '#f8fafc' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#0f172a' }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{item.desc}</div>
                  </div>
                  <button
                    onClick={() => setSecurityFlags(current => ({ ...current, [item.key]: !current[item.key as keyof typeof current] }))}
                    style={{ width: 40, height: 22, borderRadius: 99, border: 'none', cursor: 'pointer', background: securityFlags[item.key as keyof typeof securityFlags] ? '#dc2626' : '#e2e8f0', position: 'relative' }}
                  >
                    <span style={{ position: 'absolute', top: 3, left: securityFlags[item.key as keyof typeof securityFlags] ? 20 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s ease' }} />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border p-5" style={{ background: '#fff', borderColor: 'rgba(15,23,42,0.08)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 16 }}>Session Settings</h3>
            <div className="flex flex-col gap-4">
              {[
                { label: 'Session Timeout', value: '4 hours' },
                { label: 'Max Login Attempts', value: '5 attempts' },
                { label: 'Lockout Duration', value: '30 minutes' },
                { label: 'Password Expiry', value: '90 days' },
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg" style={{ background: '#f8fafc' }}>
                  <span style={{ fontSize: 13, color: '#64748b' }}>{item.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{item.value}</span>
                </div>
              ))}
              <button onClick={() => void markAuditLog({ action: 'security.settings.saved', entity_type: 'security', metadata: securityFlags })} style={{ padding: '8px', borderRadius: 8, background: '#dc2626', color: '#fff', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer' }}>
                Save Security Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
