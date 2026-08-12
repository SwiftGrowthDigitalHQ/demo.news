/**
 * TenantSuspendedPage — shown on the public news portal when a tenant is SUSPENDED.
 * Does NOT expose internal info (no IDs, no payment records, no admin email).
 */
export function TenantSuspendedPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8fafc',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      textAlign: 'center',
    }}>
      {/* Icon */}
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fef2f2', border: '2px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 10px', letterSpacing: '-0.02em' }}>
        Service Temporarily Unavailable
      </h1>

      <p style={{ fontSize: 15, color: '#475569', maxWidth: 400, margin: '0 auto 28px', lineHeight: 1.7 }}>
        This news publication is temporarily unavailable. Please contact the publisher for more information about service restoration.
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, color: '#94a3b8' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        Powered by SangTX
      </div>
    </div>
  );
}
