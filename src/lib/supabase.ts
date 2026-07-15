import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;

function getEnv(key: string) {
  return (import.meta.env as Record<string, string | undefined>)[key];
}

export function hasSupabaseConfig() {
  return Boolean(getEnv('VITE_SUPABASE_URL') && getEnv('VITE_SUPABASE_PUBLISHABLE_KEY'));
}

export function getSupabaseClient() {
  if (!hasSupabaseConfig()) {
    return null;
  }

  if (!browserClient) {
    browserClient = createClient(getEnv('VITE_SUPABASE_URL')!, getEnv('VITE_SUPABASE_PUBLISHABLE_KEY')!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  return browserClient;
}
