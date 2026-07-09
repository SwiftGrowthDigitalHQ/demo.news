import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;

function getEnv(key: string) {
  return (import.meta.env as Record<string, string | undefined>)[key];
}

export function hasSupabaseConfig() {
  return Boolean(getEnv('VITE_SUPABASE_URL') && getEnv('VITE_SUPABASE_ANON_KEY'));
}

export function getSupabaseClient() {
  if (!hasSupabaseConfig()) {
    return null;
  }

  if (!browserClient) {
    browserClient = createClient(getEnv('VITE_SUPABASE_URL')!, getEnv('VITE_SUPABASE_ANON_KEY')!, {
      auth: {
        persistSession: true,
        // Avoid auth bootstrap deadlocks from stale browser sessions.
        // The app hydrates the session explicitly in AuthProvider instead.
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  return browserClient;
}
