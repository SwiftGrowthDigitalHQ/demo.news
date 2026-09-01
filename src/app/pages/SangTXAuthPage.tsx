import { useEffect, useMemo, useState } from 'react';
import { useAppNavigation } from '../lib/navigation';
import { useAuth } from '../lib/auth';
import { Eye, EyeOff } from 'lucide-react';

type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

function SangTXLogo() {
  const { navigate } = useAppNavigation();
  return (
    <a
      href="/"
      onClick={e => { e.preventDefault(); navigate('/'); }}
      style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}
      aria-label="SangTX home"
    >
      <img src="/SangTXlogo.png" alt="SangTX" style={{ height: 48, objectFit: 'contain' }} />
    </a>
  );
}

export function SangTXAuthPage({ mode }: { mode: AuthMode }) {
  const { navigate } = useAppNavigation();
  const auth = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);
  const [resendingConfirmation, setResendingConfirmation] = useState(false);

  // Display auth errors from URL (e.g., expired verification link)
  useEffect(() => {
    if (auth.authError && mode === 'login') {
      setError(auth.authError.message);
      // If it's an OTP expired error, enable the resend button
      if (auth.authError.type === 'access_denied') {
        setNeedsEmailConfirmation(true);
      }
      auth.clearAuthError();
    }
  }, [auth.authError, mode]);

  const title = useMemo(() => {
    switch (mode) {
      case 'register':      return 'Start your free trial';
      case 'forgot':        return 'Forgot your password?';
      case 'reset':         return 'Set a new password';
      default:              return 'Sign in to SangTX';
    }
  }, [mode]);

  const subtitle = useMemo(() => {
    switch (mode) {
      case 'register': return '7 days free — no credit card required. Create your news platform today.';
      case 'forgot':   return 'Enter your email and we\'ll send you a reset link.';
      case 'reset':    return 'Choose a strong password for your SangTX account.';
      default:         return 'Welcome back. Sign in to manage your news platform.';
    }
  }, [mode]);

  const handleLogin = async () => {
    console.log('[LOGIN DEBUG 1] Login attempt started for:', email);
    setError(null); setMessage(null); setNeedsEmailConfirmation(false); setLoading(true);
    
    const result = await auth.signIn(email, password);
    setLoading(false);
    
    console.log('[LOGIN DEBUG 2] signIn result:', {
      hasError: !!result.error,
      error: result.error,
      hasProfile: !!result.profile,
      profileEmail: result.profile?.email ?? null,
      roleSlug: result.profile?.role_slug ?? null,
      ownedTenantId: result.profile?.owned_tenant_id ?? null,
      ownedTenantSlug: result.profile?.owned_tenant_slug ?? null,
      needsEmailConfirmation: result.needsEmailConfirmation,
      noRole: result.noRole,
    });
    
    if (result.error) {
      console.error('[LOGIN DEBUG 3] Login failed:', result.error);
      setError(result.error);
      if (result.needsEmailConfirmation) {
        setNeedsEmailConfirmation(true);
      }
      if (result.noRole) {
        // User has no role - show error but don't allow login
        return;
      }
      return;
    }
    
    // Redirect based on role or tenant ownership
    const roleSlug = result.profile?.role_slug;
    const ownsTenant = result.profile?.owned_tenant_id;
    
    console.log('[LOGIN DEBUG 4] Determining redirect:', {
      roleSlug,
      ownsTenant: !!ownsTenant,
      ownedTenantId: ownsTenant ?? null,
    });
    
    if (roleSlug === 'super_admin') {
      console.log('[LOGIN DEBUG 5] Redirecting to /super-admin (super_admin role)');
      navigate('/super-admin');
    } else if (roleSlug === 'admin' || roleSlug === 'editor') {
      console.log('[LOGIN DEBUG 6] Redirecting to /admin (admin/editor role)');
      navigate('/admin');
    } else if (ownsTenant) {
      // Tenant owners go to admin panel to manage their tenant
      console.log('[LOGIN DEBUG 7] Redirecting to /admin (tenant owner)');
      navigate('/admin');
    } else {
      // Regular users with no tenant go to homepage
      console.log('[LOGIN DEBUG 8] Redirecting to / (no role, no tenant)');
      navigate('/');
    }
  };

  const handleResendConfirmation = async () => {
    setError(null); setMessage(null); setResendingConfirmation(true);
    const result = await auth.resendConfirmationEmail(email);
    setResendingConfirmation(false);
    
    if (result.error) {
      setError(result.error);
      return;
    }
    
    setMessage('Confirmation email sent! Please check your inbox and spam folder.');
    setNeedsEmailConfirmation(false);
  };

  const handleRegister = async () => {
    setError(null); setMessage(null); setNeedsEmailConfirmation(false);
    if (!name.trim())          { setError('Full name is required.'); return; }
    if (!email.trim())         { setError('Email address is required.'); return; }
    if (password.length < 6)   { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    
    setLoading(true);
    const result = await auth.signUp(email, password, name);
    setLoading(false);
    
    if (result.error) {
      setError(result.error);
      return;
    }
    
    if (result.needsEmailConfirmation) {
      setMessage(result.message || 'Account created! Please check your email to confirm your account.');
      setNeedsEmailConfirmation(true);
    } else {
      setMessage(result.message || 'Account created successfully!');
      // If no confirmation needed, user is automatically logged in
      setTimeout(() => navigate('/'), 1500);
    }
  };

  const handleForgot = async () => {
    setError(null); setMessage(null); setLoading(true);
    const result = await auth.sendPasswordReset(email);
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    setMessage('Password reset link sent — check your inbox.');
  };

  const handleReset = async () => {
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    setError(null); setMessage(null); setLoading(true);
    const result = await auth.updatePassword(password);
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    setMessage('Password updated. You can now sign in.');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <header style={{ background: '#fff', borderBottom: '1px solid #f1f5f9', padding: '0 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <SangTXLogo />
          <a
            href={mode === 'login' ? '/register' : '/login'}
            onClick={e => { e.preventDefault(); navigate(mode === 'login' ? '/register' : '/login'); }}
            style={{ fontSize: 13, color: '#475569', textDecoration: 'none' }}
          >
            {mode === 'login'
              ? <span>No account? <strong style={{ color: '#dc2626' }}>Start free trial</strong></span>
              : <span>Already have an account? <strong style={{ color: '#dc2626' }}>Sign in</strong></span>
            }
          </a>
        </div>
      </header>

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 4px 24px rgba(15,23,42,0.07)', padding: 32 }}>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>{title}</h1>
              <p style={{ fontSize: 13, color: '#64748b', marginTop: 8, lineHeight: 1.6 }}>{subtitle}</p>
            </div>

            {mode === 'register' && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>🎉</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#dc2626' }}>7-day free trial</div>
                  <div style={{ fontSize: 11, color: '#b91c1c' }}>Full access · No credit card · UPI payment after trial</div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {mode === 'register' && (
                <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Full Name</span>
                  <input
                    type="text"
                    placeholder="Your full name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    style={inputStyle}
                  />
                </label>
              )}

              {mode !== 'reset' && (
                <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Email Address</span>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    style={inputStyle}
                    autoComplete="email"
                  />
                </label>
              )}

              {mode !== 'forgot' && (
                <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                    {mode === 'reset' ? 'New Password' : 'Password'}
                  </span>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      style={{ ...inputStyle, paddingRight: 40 }}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(p => !p)}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2 }}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </label>
              )}

              {(mode === 'register' || mode === 'reset') && (
                <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Confirm Password</span>
                  <input
                    type="password"
                    placeholder="Repeat your password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    style={inputStyle}
                    autoComplete="new-password"
                  />
                </label>
              )}
            </div>

            {mode === 'login' && (
              <div style={{ textAlign: 'right', marginTop: 8 }}>
                <a href="/forgot-password" onClick={e => { e.preventDefault(); navigate('/forgot-password'); }}
                  style={{ fontSize: 12, color: '#dc2626', textDecoration: 'none', fontWeight: 500 }}>
                  Forgot password?
                </a>
              </div>
            )}

            {error && (
              <div style={{ marginTop: 16, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626' }}>
                {error}
                
                {needsEmailConfirmation && mode === 'login' && (
                  <button
                    type="button"
                    onClick={handleResendConfirmation}
                    disabled={resendingConfirmation}
                    style={{
                      marginTop: 10,
                      width: '100%',
                      height: 36,
                      borderRadius: 6,
                      background: '#dc2626',
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 600,
                      border: 'none',
                      cursor: resendingConfirmation ? 'default' : 'pointer',
                      opacity: resendingConfirmation ? 0.6 : 1,
                    }}
                  >
                    {resendingConfirmation ? 'Sending...' : 'Resend confirmation email'}
                  </button>
                )}
              </div>
            )}
            {message && (
              <div style={{ marginTop: 16, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#16a34a' }}>
                {message}
                
                {needsEmailConfirmation && mode === 'register' && (
                  <button
                    type="button"
                    onClick={handleResendConfirmation}
                    disabled={resendingConfirmation}
                    style={{
                      marginTop: 10,
                      width: '100%',
                      height: 36,
                      borderRadius: 6,
                      background: '#16a34a',
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 600,
                      border: 'none',
                      cursor: resendingConfirmation ? 'default' : 'pointer',
                      opacity: resendingConfirmation ? 0.6 : 1,
                    }}
                  >
                    {resendingConfirmation ? 'Resending...' : 'Didn\'t receive email? Resend'}
                  </button>
                )}
              </div>
            )}

            <div style={{ marginTop: 24 }}>
              {mode === 'login' && (
                <button type="button" onClick={handleLogin} disabled={loading} style={primaryBtn}>
                  {loading ? 'Signing in…' : 'Sign in'}
                </button>
              )}
              {mode === 'register' && (
                <button type="button" onClick={handleRegister} disabled={loading} style={primaryBtn}>
                  {loading ? 'Creating account…' : 'Start 7-day free trial'}
                </button>
              )}
              {mode === 'forgot' && (
                <button type="button" onClick={handleForgot} disabled={loading} style={primaryBtn}>
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              )}
              {mode === 'reset' && (
                <button type="button" onClick={handleReset} disabled={loading} style={primaryBtn}>
                  {loading ? 'Updating…' : 'Update password'}
                </button>
              )}
            </div>

            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8' }}>
              {mode === 'login' && (
                <>
                  <a href="/register" onClick={e => { e.preventDefault(); navigate('/register'); }} style={linkStyle}>
                    Create account
                  </a>
                  <a href="/" onClick={e => { e.preventDefault(); navigate('/'); }} style={linkStyle}>
                    Return home
                  </a>
                </>
              )}
              {mode === 'register' && (
                <>
                  <a href="/login" onClick={e => { e.preventDefault(); navigate('/login'); }} style={linkStyle}>
                    Already have an account
                  </a>
                  <a href="/" onClick={e => { e.preventDefault(); navigate('/'); }} style={linkStyle}>
                    Return home
                  </a>
                </>
              )}
              {(mode === 'forgot' || mode === 'reset') && (
                <>
                  <a href="/login" onClick={e => { e.preventDefault(); navigate('/login'); }} style={linkStyle}>
                    ← Back to sign in
                  </a>
                  <a href="/" onClick={e => { e.preventDefault(); navigate('/'); }} style={linkStyle}>
                    Return home
                  </a>
                </>
              )}
            </div>
          </div>

          <p style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8', marginTop: 20, lineHeight: 1.6 }}>
            By continuing, you agree to SangTX's{' '}
            <a href="/terms" onClick={e => { e.preventDefault(); navigate('/terms'); }} style={{ color: '#64748b', textDecoration: 'underline' }}>Terms</a>
            {' '}and{' '}
            <a href="/privacy" onClick={e => { e.preventDefault(); navigate('/privacy'); }} style={{ color: '#64748b', textDecoration: 'underline' }}>Privacy Policy</a>.
          </p>
        </div>
      </main>

      <footer style={{ background: '#fff', borderTop: '1px solid #f1f5f9', padding: '16px 24px', textAlign: 'center' }}>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>© {new Date().getFullYear()} SangTX · Built by SwiftGrowthDigital</span>
      </footer>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 42,
  borderRadius: 8,
  border: '1px solid #d1d5db',
  padding: '0 14px',
  fontSize: 14,
  color: '#0f172a',
  background: '#fff',
  boxSizing: 'border-box',
  outline: 'none',
};

const primaryBtn: React.CSSProperties = {
  width: '100%',
  height: 44,
  borderRadius: 9,
  border: 'none',
  background: '#dc2626',
  color: '#fff',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  letterSpacing: '-0.01em',
};

const linkStyle: React.CSSProperties = {
  color: '#64748b',
  textDecoration: 'none',
  fontWeight: 500,
};
