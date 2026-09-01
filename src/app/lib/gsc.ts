/**
 * Google Search Console Client Library
 * 
 * Customer-friendly interface for GSC OAuth integration.
 * NO manual API keys, NO technical configuration required.
 */

import { getSupabaseClient } from '../../lib/supabase';

// Helper to access Vite environment variables
function getEnv(key: string): string | undefined {
  return (import.meta.env as Record<string, string | undefined>)[key];
}

export interface GSCConnectionStatus {
  connected: boolean;
  connection: {
    id: string;
    google_account_email: string;
    property_url: string;
    property_type: string;
    permission_level: string;
    status: string;
    last_sync_at: string | null;
    last_error: string | null;
    created_at: string;
  } | null;
}

export interface GSCSyncResult {
  success: boolean;
  synced_at: string;
  date_range: {
    start: string;
    end: string;
  };
  summary: {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  };
}

async function getCurrentTenantId(): Promise<string> {
  const supabase = await getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase not configured');
  }
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }
  
  const { data, error } = await supabase
    .from('tenant_memberships')
    .select('tenant_id')
    .eq('auth_user_id', user.id)
    .limit(1)
    .single();
  
  if (error || !data) {
    throw new Error('No tenant membership found');
  }
  
  return data.tenant_id;
}

export async function connectGSC(): Promise<void> {
  const tenantId = await getCurrentTenantId();
  const supabase = await getSupabaseClient();
  
  if (!supabase) {
    throw new Error('Supabase not configured');
  }
  
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }
  
  // Generate CSRF token
  const csrfToken = crypto.randomUUID();
  sessionStorage.setItem('gsc_csrf_token', csrfToken);
  sessionStorage.setItem('gsc_csrf_tenant', tenantId);
  
  // Call Edge Function
  const response = await fetch(
    `${getEnv('VITE_SUPABASE_URL')}/functions/v1/gsc-oauth-start`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tenant_id: tenantId }),
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to initiate GSC OAuth');
  }
  
  const result = await response.json();
  
  if (!result.success || !result.oauth_url) {
    throw new Error('Failed to generate OAuth URL');
  }
  
  // Redirect to Google OAuth
  window.location.href = result.oauth_url;
}

export async function getGSCConnectionStatus(): Promise<GSCConnectionStatus> {
  const supabase = await getSupabaseClient();
  
  if (!supabase) {
    return { connected: false, connection: null };
  }
  
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }
  
  const response = await fetch(
    `${getEnv('VITE_SUPABASE_URL')}/functions/v1/gsc-connection/status`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    console.error('[GSC] Failed to get connection status:', error);
    return { connected: false, connection: null };
  }
  
  return await response.json();
}

export async function syncGSCData(dateRange: string = 'last28days'): Promise<GSCSyncResult> {
  const supabase = await getSupabaseClient();
  
  if (!supabase) {
    throw new Error('Supabase not configured');
  }
  
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }
  
  const response = await fetch(
    `${getEnv('VITE_SUPABASE_URL')}/functions/v1/gsc-connection/sync`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ date_range: dateRange }),
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || error.details || 'Failed to sync GSC data');
  }
  
  return await response.json();
}

export async function disconnectGSC(): Promise<void> {
  const supabase = await getSupabaseClient();
  
  if (!supabase) {
    throw new Error('Supabase not configured');
  }
  
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }
  
  const response = await fetch(
    `${getEnv('VITE_SUPABASE_URL')}/functions/v1/gsc-connection/disconnect`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to disconnect GSC');
  }
}

export function checkGSCOAuthCallback(): {
  success: boolean;
  error: string | null;
  selectProperty: string | null;
} {
  const params = new URLSearchParams(window.location.search);
  
  if (params.get('gsc_success') === 'true') {
    sessionStorage.removeItem('gsc_csrf_token');
    sessionStorage.removeItem('gsc_csrf_tenant');
    return { success: true, error: null, selectProperty: null };
  }
  
  const selectProperty = params.get('gsc_select_property');
  if (selectProperty) {
    return { success: false, error: null, selectProperty };
  }
  
  const error = params.get('gsc_error');
  if (error) {
    sessionStorage.removeItem('gsc_csrf_token');
    sessionStorage.removeItem('gsc_csrf_tenant');
    return { success: false, error, selectProperty: null };
  }
  
  return { success: false, error: null, selectProperty: null };
}

export function getGSCErrorMessage(errorCode: string): string {
  const errorMessages: Record<string, string> = {
    'access_denied': 'You cancelled the Google Search Console authorization.',
    'invalid_callback': 'Invalid OAuth callback. Please try connecting again.',
    'invalid_state': 'Security validation failed. Please try connecting again.',
    'no_properties': 'No verified website found in this Google account. Please verify your website in Google Search Console first.',
    'connection_failed': 'Failed to connect Google Search Console. Please try again.',
    'property_mismatch': 'This Search Console property does not match your website.',
  };
  
  return errorMessages[errorCode] || 'An error occurred. Please try again.';
}

// ══════════════════════════════════════════════════════════════════════════════
// Real-time Metrics Fetching from Search Console API
// ══════════════════════════════════════════════════════════════════════════════

export interface GSCPerformanceMetrics {
  summary: {
    clicks: number
    impressions: number
    ctr: number
    position: number
  }
  queries: Array<{
    query: string
    clicks: number
    impressions: number
    ctr: number
    position: number
  }>
  pages: Array<{
    page: string
    clicks: number
    impressions: number
    ctr: number
    position: number
  }>
  timeline: Array<{
    date: string
    clicks: number
    impressions: number
    ctr: number
    position: number
  }>
}

/**
 * Fetch real-time GSC metrics from Search Console API
 */
export async function fetchGSCMetrics(
  dateRange: 'last7days' | 'last28days' | 'last90days' = 'last28days'
): Promise<GSCPerformanceMetrics> {
  const supabase = await getSupabaseClient()
  
  if (!supabase) {
    throw new Error('Supabase not configured')
  }
  
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    throw new Error('Not authenticated')
  }

  // Fetch queries, pages, and timeline in parallel
  const [queriesResponse, pagesResponse, timelineResponse] = await Promise.all([
    fetch(
      `${getEnv('VITE_SUPABASE_URL')}/functions/v1/gsc-fetch-metrics`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date_range: dateRange,
          dimension: 'query',
        }),
      }
    ),
    fetch(
      `${getEnv('VITE_SUPABASE_URL')}/functions/v1/gsc-fetch-metrics`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date_range: dateRange,
          dimension: 'page',
        }),
      }
    ),
    fetch(
      `${getEnv('VITE_SUPABASE_URL')}/functions/v1/gsc-fetch-metrics`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date_range: dateRange,
          dimension: 'date',
        }),
      }
    ),
  ])

  if (!queriesResponse.ok) {
    const error = await queriesResponse.json()
    throw new Error(error.error || 'Failed to fetch GSC queries')
  }

  if (!pagesResponse.ok) {
    const error = await pagesResponse.json()
    throw new Error(error.error || 'Failed to fetch GSC pages')
  }

  if (!timelineResponse.ok) {
    const error = await timelineResponse.json()
    throw new Error(error.error || 'Failed to fetch GSC timeline')
  }

  const queriesData = await queriesResponse.json()
  const pagesData = await pagesResponse.json()
  const timelineData = await timelineResponse.json()

  // Calculate summary from queries
  let totalClicks = 0
  let totalImpressions = 0
  let totalCtr = 0
  let totalPosition = 0
  let count = 0

  for (const row of queriesData.data.rows || []) {
    totalClicks += row.clicks || 0
    totalImpressions += row.impressions || 0
    totalCtr += row.ctr || 0
    totalPosition += row.position || 0
    count++
  }

  return {
    summary: {
      clicks: totalClicks,
      impressions: totalImpressions,
      ctr: count > 0 ? totalCtr / count : 0,
      position: count > 0 ? totalPosition / count : 0,
    },
    queries: (queriesData.data.rows || []).map((row: any) => ({
      query: row.keys?.[0] || '',
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: row.ctr || 0,
      position: row.position || 0,
    })),
    pages: (pagesData.data.rows || []).map((row: any) => ({
      page: row.keys?.[0] || '',
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: row.ctr || 0,
      position: row.position || 0,
    })),
    timeline: (timelineData.data.rows || []).map((row: any) => ({
      date: row.keys?.[0] || '',
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: row.ctr || 0,
      position: row.position || 0,
    })),
  }
}
