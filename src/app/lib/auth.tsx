import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../lib/supabase';

export type AuthProfile = {
  id: string;
  full_name: string;
  email: string;
  role_slug: string | null;
  role_name: string | null;
  status: string | null;
  avatar_url: string | null;
  // Tenant ownership
  owned_tenant_id: string | null;
  owned_tenant_slug: string | null;
  owned_tenant_name: string | null;
};

type SignInResult = {
  error: string | null;
  profile: AuthProfile | null;
  needsEmailConfirmation?: boolean;
  noRole?: boolean;
};

type SignUpResult = {
  error: string | null;
  needsEmailConfirmation: boolean;
  message?: string;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: AuthProfile | null;
  loading: boolean;
  ready: boolean;
  authError: { type: string; message: string } | null;
  clearAuthError: () => void;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signUp: (email: string, password: string, fullName: string) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
  resendConfirmationEmail: (email: string) => Promise<{ error: string | null }>;
  canAccessAdmin: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadProfile(userId: string): Promise<AuthProfile | null> {
  const client = getSupabaseClient();
  if (!client) {
    return null;
  }

  // Load user profile with role
  const { data, error } = await client
    .from('users')
    .select('id, full_name, email, status, avatar_url, role:roles(slug, name)')
    .eq('auth_user_id', userId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error || !data) {
    return null;
  }
  
  const role = Array.isArray(data.role) ? data.role[0] : data.role;

  // Check if user owns a tenant
  const { data: tenantData } = await client
    .from('tenants')
    .select('id, slug, name, owner_auth_user_id, subscription_status')
    .eq('owner_auth_user_id', userId)
    .is('deleted_at', null)
    .maybeSingle();

  const profile = {
    id: data.id,
    full_name: data.full_name,
    email: data.email,
    status: data.status ?? null,
    avatar_url: typeof data.avatar_url === 'string' ? data.avatar_url : null,
    role_slug: role?.slug ?? null,
    role_name: role?.name ?? null,
    owned_tenant_id: tenantData?.id ?? null,
    owned_tenant_slug: tenantData?.slug ?? null,
    owned_tenant_name: tenantData?.name ?? null,
  };

  return profile;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [authError, setAuthError] = useState<{ type: string; message: string } | null>(null);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) {
      setLoading(false);
      setReady(true);
      return;
    }

    let isMounted = true;
    let isInitialLoad = true;

    // Check for auth errors in URL (query params or hash)
    const detectAuthError = () => {
      const queryParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));
      
      const errorFromQuery = queryParams.get('error');
      const errorFromHash = hashParams.get('error');
      const error = errorFromQuery || errorFromHash;
      
      const errorCodeFromQuery = queryParams.get('error_code');
      const errorCodeFromHash = hashParams.get('error_code');
      const errorCode = errorCodeFromQuery || errorCodeFromHash;
      
      const errorDescFromQuery = queryParams.get('error_description');
      const errorDescFromHash = hashParams.get('error_description');
      const errorDesc = errorDescFromQuery || errorDescFromHash;

      if (error) {
        let message = errorDesc ? decodeURIComponent(errorDesc.replace(/\+/g, ' ')) : 'Authentication error occurred';
        
        if (error === 'access_denied' && (errorCode === 'otp_expired' || errorCode === '403')) {
          message = 'This verification link has expired. Please request a new confirmation email.';
        }
        
        setAuthError({ type: error, message });
        
        // Clean up URL to remove error params
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, '', cleanUrl);
      }
    };

    detectAuthError();

    const syncAuthState = async (nextSession: Session | null, isInitial: boolean) => {
      setSession(nextSession);
      
      // Only set loading=true during initial load
      // Background refreshes should NOT trigger loading state
      if (isInitial) {
        setLoading(true);
      }
      
      const nextProfile = nextSession?.user ? await loadProfile(nextSession.user.id) : null;
      if (!isMounted) return;
      
      setProfile(nextProfile);
      
      if (isInitial) {
        setLoading(false);
        setReady(true);
      }
    };

    void client.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (isMounted) {
        void syncAuthState(currentSession, true);
        isInitialLoad = false;
      }
    });

    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (isMounted) {
        // After initial load, background auth changes should NOT set loading=true
        void syncAuthState(nextSession, isInitialLoad);
      }
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const client = getSupabaseClient();
    
    const hasAdminRole = profile && ['super_admin', 'admin', 'editor'].includes(profile.role_slug ?? '');
    const ownsTenant = profile && !!profile.owned_tenant_id;
    const canAccessAdmin = Boolean(hasAdminRole || ownsTenant);

    return {
      session,
      user: session?.user ?? null,
      profile,
      loading,
      ready,
      canAccessAdmin,
      authError,
      clearAuthError: () => setAuthError(null),
      signIn: async (email: string, password: string): Promise<SignInResult> => {
        if (!client) {
          return { error: 'Supabase is not configured.', profile: null };
        }
        
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        
        // Handle email confirmation error specifically
        if (error) {
          const errorMsg = error.message.toLowerCase();
          
          // Supabase returns "Email not confirmed" when user hasn't verified their email
          if (errorMsg.includes('email not confirmed') || errorMsg.includes('email confirmation')) {
            return {
              error: 'Please verify your email address before logging in. Check your inbox for the confirmation link.',
              profile: null,
              needsEmailConfirmation: true,
            };
          }
          
          // Handle other errors (wrong password, user not found, etc.)
          return { error: error.message, profile: null };
        }
        
        if (!data.user) {
          return { error: 'No authenticated user was returned.', profile: null };
        }

        setSession(data.session);
        setLoading(true);
        const resolvedProfile = await loadProfile(data.user.id);
        setProfile(resolvedProfile);
        setLoading(false);
        setReady(true);

        // Check if user has no role AND no tenant ownership
        if (resolvedProfile && !resolvedProfile.role_slug && !resolvedProfile.owned_tenant_id) {
          return { 
            error: 'Your account is not set up yet. Please complete the onboarding process or contact support.',
            profile: resolvedProfile,
            noRole: true,
          };
        }

        return { error: null, profile: resolvedProfile };
      },
      signUp: async (email: string, password: string, fullName: string): Promise<SignUpResult> => {
        if (!client) {
          return { error: 'Supabase is not configured.', needsEmailConfirmation: false };
        }
        
        // Use VITE_SITE_URL from env if it is a real production URL, fallback to current origin.
        // This guards against a localhost value accidentally baked into the bundle.
        const rawSiteUrl = import.meta.env.VITE_SITE_URL as string | undefined;
        const siteUrl = (rawSiteUrl && !rawSiteUrl.includes('localhost'))
          ? rawSiteUrl
          : window.location.origin;
        
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
            emailRedirectTo: `${siteUrl}/`,
          },
        });
        
        if (error) {
          return { error: error.message, needsEmailConfirmation: false };
        }
        
        if (!data.user) {
          return { error: 'Signup failed. No user was created.', needsEmailConfirmation: false };
        }
        
        // Check if email confirmation is required
        // If user.email_confirmed_at is null, confirmation is needed
        const needsConfirmation = !data.user.email_confirmed_at;
        
        if (needsConfirmation) {
          return {
            error: null,
            needsEmailConfirmation: true,
            message: 'Account created! Please check your email and click the confirmation link to activate your account.',
          };
        }
        
        // If no confirmation needed, session will be automatically set by onAuthStateChange
        return {
          error: null,
          needsEmailConfirmation: false,
          message: 'Account created successfully! You are now logged in.',
        };
      },
      signOut: async () => {
        if (!client) return;
        await client.auth.signOut();
      },
      sendPasswordReset: async (email: string) => {
        if (!client) {
          return { error: 'Supabase is not configured.' };
        }
        // Guard against localhost VITE_SITE_URL being baked into the bundle.
        const rawSiteUrl = import.meta.env.VITE_SITE_URL as string | undefined;
        const siteUrl = (rawSiteUrl && !rawSiteUrl.includes('localhost'))
          ? rawSiteUrl
          : window.location.origin;
        const { error } = await client.auth.resetPasswordForEmail(email, {
          redirectTo: `${siteUrl}/reset-password`,
        });
        return { error: error ? error.message : null };
      },
      updatePassword: async (password: string) => {
        if (!client) {
          return { error: 'Supabase is not configured.' };
        }
        const { error } = await client.auth.updateUser({ password });
        return { error: error ? error.message : null };
      },
      resendConfirmationEmail: async (email: string) => {
        if (!client) {
          return { error: 'Supabase is not configured.' };
        }
        const { error } = await client.auth.resend({
          type: 'signup',
          email,
        });
        return { error: error ? error.message : null };
      },
    };
  }, [loading, profile, ready, session, authError]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
