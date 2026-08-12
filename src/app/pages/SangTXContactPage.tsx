/**
 * /contact — SangTX SaaS contact page.
 * Standalone, no CmsProvider dependency.
 */
import { useEffect } from 'react';
import { useAppNavigation } from '../lib/navigation';

function SangTXHeader() {
  const { navigate } = useAppNavigation();
  return (
    <header style={{ background: '#fff', borderBottom: '1px solid #f1f5f9', padding: '0 24px', position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 1px 4px rgba(15,23,42,0.06)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/" onClick={e => { e.preventDefault(); navigate('/'); }}
          style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }} aria-label="SangTX home">
          <div style={{ width: 32, height: 32, background: '#dc2626', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontSize: 14, fontWeight: 800 }}>S</span>
          </div>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.04em' }}>SangTX</span>
        </a>
        <div style={{ display: 'flex', gap: 12 }}>
          <a href="/login" onClick={e => { e.preventDefault(); navigate('/login'); }}
            style={{ fontSize: 14, color: '#475569', textDecoration: 'none', fontWeight: 500 }}>Sign in</a>
          <a href="/register" onClick={e => { e.preventDefault(); navigate('/register'); }}
            style={{ fontSize: 14, color: '#fff', background: '#dc2626', padding: '7px 16px', borderRadius: 7, textDecoration: 'none', fontWeight: 600 }}>
            Start Free
          </a>
        </div>
      </div>
    </header>
  );
}

export function SangTXContactPage() {
  useEffect(() => {
    document.title = 'Contact — SangTX';
    window.scrollTo(0, 0);
  }, []);

  return (
    <div style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background: '#fff', minHeight: '100vh' }}>
      <SangTXHeader />
      <main style={{ maxWidth: 640, margin: '0 auto', padding: '64px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <span style={{ display: 'inline-block', background: '#fef2f2', color: '#b91c1c', fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 99, border: '1px solid #fecaca', marginBottom: 16 }}>
            Get in touch
          </span>
          <h1 style={{ fontSize: 38, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', lineHeight: 1.1, margin: '0 0 14px' }}>
            Contact SangTX
          </h1>
          <p style={{ fontSize: 16, color: '#64748b', lineHeight: 1.7, margin: 0 }}>
            Questions about the platform, pricing, or your account? We're here to help.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 40 }}>
          {[
            { emoji: '✉️', title: 'Email us', value: 'hello@swiftgrowthdigital.com', href: 'mailto:hello@swiftgrowthdigital.com' },
            { emoji: '📞', title: 'Call us', value: '+91 9229721835', href: 'tel:+919229721835' },
          ].map(item => (
            <a key={item.title} href={item.href}
              style={{ display: 'flex', flexDirection: 'column', gap: 6, background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 12, padding: '20px 18px', textDecoration: 'none', color: 'inherit', transition: 'border-color 0.15s' }}>
              <span style={{ fontSize: 22 }}>{item.emoji}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{item.title}</span>
              <span style={{ fontSize: 13, color: '#dc2626', fontWeight: 500 }}>{item.value}</span>
            </a>
          ))}
        </div>

        <div style={{ background: '#f8fafc', borderRadius: 14, border: '1px solid #f1f5f9', padding: '32px 28px' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 20, letterSpacing: '-0.02em' }}>Send a message</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {(['Name', 'Email', 'Subject'] as const).map(field => (
              <label key={field} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{field}</span>
                <input type={field === 'Email' ? 'email' : 'text'} placeholder={`Your ${field.toLowerCase()}`}
                  style={{ height: 42, borderRadius: 8, border: '1px solid #d1d5db', padding: '0 14px', fontSize: 14, color: '#0f172a', background: '#fff', outline: 'none' }} />
              </label>
            ))}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Message</span>
              <textarea rows={5} placeholder="Describe how we can help…"
                style={{ borderRadius: 8, border: '1px solid #d1d5db', padding: '10px 14px', fontSize: 14, color: '#0f172a', background: '#fff', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
            </label>
            <button type="button"
              onClick={() => alert('Message feature coming soon. Please email us directly at hello@swiftgrowthdigital.com')}
              style={{ height: 44, borderRadius: 9, border: 'none', background: '#dc2626', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 4 }}>
              Send Message
            </button>
            <p style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', margin: 0 }}>
              We typically respond within 24 hours on business days.
            </p>
          </div>
        </div>
      </main>

      <footer style={{ background: '#0f172a', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '24px', textAlign: 'center' }}>
        <span style={{ fontSize: 12, color: '#475569' }}>© {new Date().getFullYear()} SangTX · Built by SwiftGrowthDigital</span>
      </footer>
    </div>
  );
}
