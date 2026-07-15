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
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: AuthProfile | null;
  loading: boolean;
  ready: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
  canAccessAdmin: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadProfile(userId: string): Promise<AuthProfile | null> {
  const client = getSupabaseClient();
  if (!client) {
    return null;
  }

  const { data, error } = await client
    .from('users')
    .select('id, full_name, email, status, role:roles(slug, name)')
    .eq('auth_user_id', userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const role = Array.isArray(data.role) ? data.role[0] : data.role;

  return {
    id: data.id,
    full_name: data.full_name,
    email: data.email,
    status: data.status ?? null,
    role_slug: role?.slug ?? null,
    role_name: role?.name ?? null,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) {
      setLoading(false);
      setReady(true);
      return;
    }

    let isMounted = true;

    void client.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (!isMounted) return;
      setSession(currentSession);
      if (currentSession?.user) {
        void loadProfile(currentSession.user.id).then(result => {
          if (isMounted) setProfile(result);
        });
      }
      setLoading(false);
      setReady(true);
    });

    const { data: listener } = client.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!isMounted) return;
      setSession(nextSession);
      if (nextSession?.user) {
        setProfile(await loadProfile(nextSession.user.id));
      } else {
        setProfile(null);
      }
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const client = getSupabaseClient();
    const canAccessAdmin = Boolean(
      profile && ['super_admin', 'admin', 'editor'].includes(profile.role_slug ?? ''),
    );

    return {
      session,
      user: session?.user ?? null,
      profile,
      loading,
      ready,
      canAccessAdmin,
      signIn: async (email: string, password: string) => {
        if (!client) {
          return { error: 'Supabase is not configured.' };
        }
        const { error } = await client.auth.signInWithPassword({ email, password });
        return { error: error ? error.message : null };
      },
      signOut: async () => {
        if (!client) return;
        await client.auth.signOut();
      },
      sendPasswordReset: async (email: string) => {
        if (!client) {
          return { error: 'Supabase is not configured.' };
        }
        const { error } = await client.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
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
    };
  }, [loading, profile, ready, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
