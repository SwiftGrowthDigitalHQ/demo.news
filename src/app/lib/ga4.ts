/**
 * GA4 OAuth Integration Client Library
 * 
 * Handles OAuth flow initiation, connection status, sync, and disconnect operations.
 * Follows the same pattern as YouTube integration for consistency.
 * 
 * SECURITY:
 * - Never exposes OAuth tokens to frontend
 * - All sensitive operations go through Edge Functions
 * - Tenant membership validated server-side
 */

import { getSupabaseClient } from '../../lib/supabase';

// Helper to safely access Vite environment variables
function getEnv(key: string): string | undefined {
  return (import.meta.env as Record<string, string | undefined>)[key];
}

export interface GA4ConnectionStatus {
  connected: boolean;
  connection: {
    id: string;
    google_account_email: string;
    analytics_account_name: string | null;
    property_name: string;
    property_display_name: string;
    data_stream_url: string;
    measurement_id: string;
    status: string;
    last_sync_at: string | null;
    last_error: string | null;
  } | null;
}

export interface GA4SyncResult {
  success: boolean;
  property_name: string;
  measurement_id: string;
  synced_at: string;
}

/**
 * Get current user's tenant ID from tenant_memberships
 */
async function getCurrentTenantId(): Promise<string> {
  const supabase = await getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase not configured');
  }
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }
  
  // Get user's tenant membership
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

/**
 * Initiate GA4 OAuth flow
 * 
 * Calls ga4-oauth-start Edge Function to generate OAuth URL,
 * then redirects browser to Google consent screen.
 */
export async function connectGA4(): Promise<void> {
  const tenantId = await getCurrentTenantId();
  const supabase = await getSupabaseClient();
  
  if (!supabase) {
    throw new Error('Supabase not configured');
  }
  
  // Get session token
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }
  
  // Generate CSRF token for local validation
  const csrfToken = crypto.randomUUID();
  sessionStorage.setItem('ga4_csrf_token', csrfToken);
  sessionStorage.setItem('ga4_csrf_tenant', tenantId);
  
  // Call Edge Function to get OAuth URL
  const response = await fetch(
    `${getEnv('VITE_SUPABASE_URL')}/functions/v1/ga4-oauth-start`,
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
    throw new Error(error.error || 'Failed to initiate GA4 OAuth');
  }
  
  const result = await response.json();
  
  if (!result.success || !result.oauth_url) {
    throw new Error('Failed to generate OAuth URL');
  }
  
  // Redirect to Google OAuth
  window.location.href = result.oauth_url;
}

/**
 * Get GA4 connection status for current tenant
 * 
 * Returns connection information including property details and Measurement ID.
 * Does NOT include OAuth tokens (those are server-side only).
 */
export async function getGA4ConnectionStatus(): Promise<GA4ConnectionStatus> {
  const supabase = await getSupabaseClient();
  
  if (!supabase) {
    return {
      connected: false,
      connection: null,
    };
  }
  
  // Get session token
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }
  
  // Call Edge Function
  const response = await fetch(
    `${getEnv('VITE_SUPABASE_URL')}/functions/v1/ga4-connection/status`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    console.error('[GA4] Failed to get connection status:', error);
    return {
      connected: false,
      connection: null,
    };
  }
  
  const result = await response.json();
  return {
    connected: result.connected,
    connection: result.connection,
  };
}

/**
 * Sync GA4 property information
 * 
 * Fetches updated property and data stream details from GA4 API.
 * Updates Measurement ID if it changed.
 */
export async function syncGA4Property(): Promise<GA4SyncResult> {
  const supabase = await getSupabaseClient();
  
  if (!supabase) {
    throw new Error('Supabase not configured');
  }
  
  // Get session token
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }
  
  // Call Edge Function
  const response = await fetch(
    `${getEnv('VITE_SUPABASE_URL')}/functions/v1/ga4-connection/sync`,
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
    throw new Error(error.error || error.details || 'Failed to sync GA4 property');
  }
  
  return await response.json();
}

/**
 * Disconnect GA4 for current tenant
 * 
 * Soft-deletes the connection (can be reconnected later).
 */
export async function disconnectGA4(): Promise<void> {
  const supabase = await getSupabaseClient();
  
  if (!supabase) {
    throw new Error('Supabase not configured');
  }
  
  // Get session token
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }
  
  // Call Edge Function
  const response = await fetch(
    `${getEnv('VITE_SUPABASE_URL')}/functions/v1/ga4-connection/disconnect`,
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
    throw new Error(error.error || 'Failed to disconnect GA4');
  }
}

/**
 * Check if OAuth callback was successful
 * 
 * Called on page load to detect OAuth redirect parameters.
 * Returns success/error status and clears CSRF tokens.
 */
export function checkGA4OAuthCallback(): { 
  success: boolean; 
  error: string | null;
  selectProperty: string | null;
} {
  const params = new URLSearchParams(window.location.search);
  
  // Check for success
  if (params.get('ga4_success') === 'true') {
    // Clear CSRF tokens
    sessionStorage.removeItem('ga4_csrf_token');
    sessionStorage.removeItem('ga4_csrf_tenant');
    return { success: true, error: null, selectProperty: null };
  }
  
  // Check for property selection (multiple properties)
  const selectProperty = params.get('ga4_select_property');
  if (selectProperty) {
    return { success: false, error: null, selectProperty };
  }
  
  // Check for error
  const error = params.get('ga4_error');
  if (error) {
    // Clear CSRF tokens
    sessionStorage.removeItem('ga4_csrf_token');
    sessionStorage.removeItem('ga4_csrf_tenant');
    return { success: false, error, selectProperty: null };
  }
  
  return { success: false, error: null, selectProperty: null };
}

/**
 * Get display-friendly error message
 */
export function getGA4ErrorMessage(errorCode: string): string {
  const errorMessages: Record<string, string> = {
    'access_denied': 'You cancelled the Google Analytics authorization. Click "Connect Google Analytics" to try again.',
    'invalid_callback': 'Invalid OAuth callback. Please try connecting again.',
    'invalid_state': 'Security validation failed. Please try connecting again.',
    'no_account': 'No Google Analytics account found for this Google account.',
    'no_property': 'No GA4 properties found in your Analytics account. Create a GA4 property first.',
    'no_web_stream': 'No web data streams found in your GA4 properties. Add a web data stream to your property.',
    'connection_failed': 'Failed to connect Google Analytics. Please check your internet connection and try again.',
  };
  
  return errorMessages[errorCode] || 'An error occurred while connecting Google Analytics. Please try again.';
}

/**
 * Get Measurement ID from database for current tenant
 * Used by GoogleAnalytics.tsx tracking component
 */
export async function getMeasurementId(): Promise<string | null> {
  const supabase = await getSupabaseClient();
  
  if (!supabase) {
    return null;
  }
  
  try {
    const tenantId = await getCurrentTenantId();
    
    const { data } = await supabase
      .from('ga4_connections')
      .select('measurement_id')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .maybeSingle();
    
    return data?.measurement_id || null;
  } catch (error) {
    console.error('[GA4] Failed to get measurement ID:', error);
    return null;
  }
}
