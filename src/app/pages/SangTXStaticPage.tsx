import { useEffect, type ReactNode } from 'react';
import { useAppNavigation } from '../lib/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { DURATION } from '../motion/variants';

interface SangTXStaticPageProps {
  title: string;
  description?: string;
  children: ReactNode;
}

/**
 * SangTX-branded static page for legal/policy pages.
 * Matches SangTX homepage design with consistent branding.
 */
export function SangTXStaticPage({ title, description, children }: SangTXStaticPageProps) {
  const shouldReduce = useReducedMotion();
  
  useEffect(() => {
    document.title = `${title} | SangTX`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && description) {
      metaDesc.setAttribute('content', description);
    }
  }, [title, description]);

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0' }}>
      {/* Header */}
      <SangTXPageHeader />
      
      {/* Main Content */}
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '60px 24px', minHeight: 'calc(100vh - 200px)' }}>
        <motion.div
          initial={shouldReduce ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 style={{
            fontSize: 32,
            fontWeight: 700,
            marginBottom: 12,
            background: 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            {title}
          </h1>
          {description && (
            <p style={{ fontSize: 15, color: '#94a3b8', marginBottom: 32, lineHeight: 1.6 }}>
              {description}
            </p>
          )}
        </motion.div>

        <motion.div
          initial={shouldReduce ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.5) 0%, rgba(30, 41, 59, 0.3) 100%)',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            borderRadius: 12,
            padding: '40px',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div style={{ fontSize: 14, lineHeight: 1.8, color: '#cbd5e1' }}>
            {children}
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <SangTXPageFooter />
    </div>
  );
}

function SangTXPageHeader() {
  const { navigate } = useAppNavigation();
  
  return (
    <header style={{
      borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
      padding: '16px 24px',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'rgba(15, 23, 42, 0.8)',
      backdropFilter: 'blur(10px)',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <motion.button
          onClick={() => { navigate('/'); window.scrollTo(0, 0); }}
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.2 }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <img src="/SangTXlogo.png" alt="SangTX" style={{ height: 32, objectFit: 'contain' }} />
        </motion.button>
        <motion.button
          onClick={() => { navigate('/'); window.scrollTo(0, 0); }}
          whileHover={{ color: '#60a5fa' }}
          transition={{ duration: 0.2 }}
          style={{
            fontSize: 13,
            color: '#94a3b8',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '8px 12px',
          }}
        >
          ← Back to SangTX
        </motion.button>
      </div>
    </header>
  );
}

function SangTXPageFooter() {
  const { navigate } = useAppNavigation();
  const shouldReduce = useReducedMotion();
  function nav(to: string) { navigate(to); window.scrollTo(0, 0); }
  
  return (
    <footer style={{
      borderTop: '1px solid rgba(255, 255, 255, 0.06)',
      padding: '40px 24px 24px',
      background: 'rgba(15, 23, 42, 0.5)',
    }}>
      <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 24,
          marginBottom: 32,
        }}>
          {/* Legal Links */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', marginBottom: 12 }}>
              LEGAL
            </div>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Privacy Policy', path: '/privacy-policy' },
                { label: 'Terms of Service', path: '/terms-of-service' },
                { label: 'Refund Policy', path: '/refund-policy' },
              ].map(link => (
                <motion.button
                  key={link.path}
                  onClick={() => nav(link.path)}
                  whileHover={shouldReduce ? undefined : { color: '#e2e8f0', x: 3 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    fontSize: 13,
                    color: '#64748b',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    textAlign: 'left',
                  }}
                >
                  {link.label}
                </motion.button>
              ))}
            </nav>
          </div>

          {/* Additional Legal Links */}
          <div>
            <div style={{ height: 28 }} />
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Cookie Policy', path: '/cookie-policy' },
                { label: 'Disclaimer', path: '/disclaimer' },
                { label: 'Acceptable Use', path: '/acceptable-use-policy' },
              ].map(link => (
                <motion.button
                  key={link.path}
                  onClick={() => nav(link.path)}
                  whileHover={shouldReduce ? undefined : { color: '#e2e8f0', x: 3 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    fontSize: 13,
                    color: '#64748b',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    textAlign: 'left',
                  }}
                >
                  {link.label}
                </motion.button>
              ))}
            </nav>
          </div>

          {/* Contact */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', marginBottom: 12 }}>
              SUPPORT
            </div>
            <motion.button
              onClick={() => nav('/legal-contact')}
              whileHover={shouldReduce ? undefined : { color: '#e2e8f0', x: 3 }}
              transition={{ duration: DURATION.fast }}
              style={{
                fontSize: 13,
                color: '#64748b',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                textAlign: 'left',
                display: 'block',
              }}
            >
              Legal Contact
            </motion.button>
            <motion.button
              onClick={() => nav('/contact')}
              whileHover={shouldReduce ? undefined : { color: '#e2e8f0', x: 3 }}
              transition={{ duration: DURATION.fast }}
              style={{
                fontSize: 13,
                color: '#64748b',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                textAlign: 'left',
                marginTop: 8,
                display: 'block',
              }}
            >
              Contact Us
            </motion.button>
          </div>
        </div>

        <div style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          paddingTop: 20,
          fontSize: 12,
          color: '#64748b',
        }}>
          <p>© {new Date().getFullYear()} SangTX. All rights reserved. Built by SwiftGrowthDigital</p>
        </div>
      </div>
    </footer>
  );
}

/* ═════════════════════════════════════════════════════
   Reusable prose components
═════════════════════════════════════════════════════ */

export function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h2 style={{
      fontSize: 18,
      fontWeight: 700,
      marginTop: 32,
      marginBottom: 16,
      color: '#e2e8f0',
      borderLeft: '3px solid #60a5fa',
      paddingLeft: 12,
    }}>
      {children}
    </h2>
  );
}

export function Para({ children }: { children: ReactNode }) {
  return (
    <p style={{
      fontSize: 14,
      color: '#cbd5e1',
      lineHeight: 1.7,
      marginBottom: 16,
    }}>
      {children}
    </p>
  );
}

export function List({ items }: { items: string[] }) {
  return (
    <ul style={{
      listStyle: 'disc',
      paddingLeft: 20,
      marginBottom: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      {items.map((item, i) => (
        <li key={i} style={{ fontSize: 14, color: '#cbd5e1' }}>
          {item}
        </li>
      ))}
    </ul>
  );
}

export function Emphasis({ children }: { children: ReactNode }) {
  return <strong style={{ color: '#e2e8f0', fontWeight: 600 }}>{children}</strong>;
}

export function Code({ children }: { children: string }) {
  return (
    <code style={{
      background: 'rgba(148, 163, 184, 0.1)',
      border: '1px solid rgba(148, 163, 184, 0.2)',
      borderRadius: 4,
      padding: '2px 6px',
      fontFamily: 'monospace',
      fontSize: 13,
      color: '#cbd5e1',
    }}>
      {children}
    </code>
  );
}
