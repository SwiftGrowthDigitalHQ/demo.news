import { useMemo, useState } from 'react';
import { AppLink, useAppNavigation } from '../lib/navigation';
import { useAuth } from '../lib/auth';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { Eye, EyeOff } from 'lucide-react';

type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

export function AuthPage({ mode }: { mode: AuthMode }) {
  const { navigate } = useAppNavigation();
  const auth = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const title = useMemo(() => {
    switch (mode) {
      case 'register': return 'Create Account';
      case 'forgot': return 'Forgot Password';
      case 'reset': return 'Reset Password';
      default: return 'Login';
    }
  }, [mode]);

  const subtitle = useMemo(() => {
    switch (mode) {
      case 'register': return 'Join Buxar News to save articles, get personalized news, and more.';
      case 'forgot': return 'Enter your email to receive a password reset link.';
      case 'reset': return 'Set a new password for your account.';
      default: return 'Sign in to your account to access personalized features.';
    }
  }, [mode]);

  const handleLogin = async () => {
    setError(null); setMessage(null); setLoading(true);
    const result = await auth.signIn(email, password);
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    navigate('/');
  };

  const handleRegister = async () => {
    setError(null); setMessage(null);
    if (!name.trim()) { setError('Name is required.'); return; }
    if (!email.trim()) { setError('Email is required.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    setLoading(true);
    // Use signIn for demo (Supabase sign-up would need email confirmation flow)
    const result = await auth.signIn(email, password);
    setLoading(false);
    if (result.error) {
      setError('Registration is currently handled by admin. Please contact support or login with existing credentials.');
      return;
    }
    navigate('/');
  };

  const handleForgot = async () => {
    setError(null); setMessage(null); setLoading(true);
    const result = await auth.sendPasswordReset(email);
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    setMessage('Password reset link sent to your email.');
  };

  const handleReset = async () => {
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    setError(null); setMessage(null); setLoading(true);
    const result = await auth.updatePassword(password);
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    setMessage('Password updated successfully. You can now login.');
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-7">
            {/* Header */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
              <p className="text-sm text-gray-500 mt-1.5">{subtitle}</p>
            </div>

            {/* Form */}
            <div className="space-y-4">
              {/* Name (register only) */}
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Full Name</label>
                  <input type="text" placeholder="Enter your full name" value={name} onChange={e => setName(e.target.value)}
                    className="w-full h-11 rounded-lg border border-gray-300 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400" />
                </div>
              )}

              {/* Email (all except reset) */}
              {mode !== 'reset' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email Address</label>
                  <input type="email" placeholder="Enter your email" value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full h-11 rounded-lg border border-gray-300 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400" />
                </div>
              )}

              {/* Mobile (register only) */}
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Mobile Number</label>
                  <input type="tel" placeholder="Enter your mobile number" value={mobile} onChange={e => setMobile(e.target.value)}
                    className="w-full h-11 rounded-lg border border-gray-300 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400" />
                </div>
              )}

              {/* Password (login, register, reset) */}
              {mode !== 'forgot' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    {mode === 'reset' ? 'New Password' : 'Password'}
                  </label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} placeholder="Enter password" value={password} onChange={e => setPassword(e.target.value)}
                      className="w-full h-11 rounded-lg border border-gray-300 px-4 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400" />
                    <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Confirm Password (register, reset) */}
              {(mode === 'register' || mode === 'reset') && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Confirm Password</label>
                  <input type="password" placeholder="Confirm your password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full h-11 rounded-lg border border-gray-300 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400" />
                </div>
              )}
            </div>

            {/* Error / Success messages */}
            {error && <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
            {message && <div className="mt-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">{message}</div>}

            {/* Actions */}
            <div className="mt-6 space-y-3">
              {mode === 'login' && (
                <button type="button" onClick={handleLogin} disabled={loading}
                  className="w-full h-11 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-60">
                  {loading ? 'Signing in...' : 'Login'}
                </button>
              )}
              {mode === 'register' && (
                <button type="button" onClick={handleRegister} disabled={loading}
                  className="w-full h-11 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-60">
                  {loading ? 'Creating account...' : 'Create Account'}
                </button>
              )}
              {mode === 'forgot' && (
                <button type="button" onClick={handleForgot} disabled={loading}
                  className="w-full h-11 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-60">
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              )}
              {mode === 'reset' && (
                <button type="button" onClick={handleReset} disabled={loading}
                  className="w-full h-11 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-60">
                  {loading ? 'Updating...' : 'Reset Password'}
                </button>
              )}

              {/* Footer links */}
              <div className="flex items-center justify-between text-xs pt-2">
                {mode === 'login' && (
                  <>
                    <AppLink to="/forgot-password" className="text-red-600 hover:underline font-medium">Forgot password?</AppLink>
                    <AppLink to="/register" className="text-gray-600 hover:text-red-600">Don't have an account? <span className="font-semibold text-red-600">Register</span></AppLink>
                  </>
                )}
                {mode === 'register' && (
                  <>
                    <AppLink to="/login" className="text-gray-600 hover:text-red-600">Already have an account? <span className="font-semibold text-red-600">Login</span></AppLink>
                    <AppLink to="/" className="text-gray-500 hover:underline">Return home</AppLink>
                  </>
                )}
                {(mode === 'forgot' || mode === 'reset') && (
                  <>
                    <AppLink to="/login" className="text-red-600 hover:underline font-medium">Back to login</AppLink>
                    <AppLink to="/" className="text-gray-500 hover:underline">Return home</AppLink>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
