/**
 * Google Search Console Service
 * 
 * Handles domain configuration and OAuth flow for GSC integration.
 * Works on localhost and production without hardcoded URLs.
 */

import { getSupabaseClient } from '../lib/supabase';

export interface GSCConfig {
  enabled: boolean;
  domain: string | null;
  site_url: string | null;
  connected: boolean;
  last_verified: string | null;
  configured: boolean;
}

export interface SaveGSCDomainParams {
  tenant_id: string;
  domain: string;
  site_url?: string;
}

export interface GSCServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Get GSC configuration for the current tenant
 */
export async function getGSCConfig(tenantId: string): Promise<GSCServiceResponse<GSCConfig>> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase client not configured'
      };
    }

    const { data, error } = await supabase.rpc('get_tenant_gsc_config', {
      p_tenant_id: tenantId
    });

    if (error) {
      console.error('Error fetching GSC config:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch GSC configuration'
      };
    }

    // RPC returns array, get first result or defaults
    const config = data && data.length > 0 ? data[0] : {
      enabled: false,
      domain: null,
      site_url: null,
      connected: false,
      last_verified: null,
      configured: false
    };

    return {
      success: true,
      data: config
    };
  } catch (error) {
    console.error('Unexpected error in getGSCConfig:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    };
  }
}

/**
 * Save GSC domain configuration
 */
export async function saveGSCDomain(params: SaveGSCDomainParams): Promise<GSCServiceResponse> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase client not configured'
      };
    }

    // Validate inputs before sending to database
    if (!params.domain || !params.domain.trim()) {
      return {
        success: false,
        error: 'Domain is required'
      };
    }

    const { data, error } = await supabase.rpc('save_tenant_gsc_domain', {
      p_tenant_id: params.tenant_id,
      p_domain: params.domain.trim(),
      p_site_url: params.site_url || null
    });

    if (error) {
      console.error('Error saving GSC domain:', error);
      return {
        success: false,
        error: error.message || 'Failed to save domain configuration'
      };
    }

    // Database function returns JSONB with success/error
    if (data && typeof data === 'object') {
      if (data.success === false) {
        return {
          success: false,
          error: data.error || 'Failed to save configuration'
        };
      }
      
      return {
        success: true,
        data: data.data,
        message: 'Domain configuration saved successfully'
      };
    }

    return {
      success: true,
      message: 'Domain configuration saved successfully'
    };
  } catch (error) {
    console.error('Unexpected error in saveGSCDomain:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    };
  }
}

/**
 * Mark GSC as connected (after OAuth success)
 */
export async function markGSCConnected(tenantId: string, connected: boolean = true): Promise<GSCServiceResponse> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase client not configured'
      };
    }

    const { data, error } = await supabase.rpc('mark_gsc_connected', {
      p_tenant_id: tenantId,
      p_connected: connected
    });

    if (error) {
      console.error('Error marking GSC connected:', error);
      return {
        success: false,
        error: error.message || 'Failed to update connection status'
      };
    }

    if (data && typeof data === 'object') {
      if (data.success === false) {
        return {
          success: false,
          error: data.error || 'Failed to update connection status'
        };
      }
      
      return {
        success: true,
        message: data.message || (connected ? 'Connected successfully' : 'Disconnected successfully')
      };
    }

    return {
      success: true,
      message: connected ? 'Connected successfully' : 'Disconnected successfully'
    };
  } catch (error) {
    console.error('Unexpected error in markGSCConnected:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    };
  }
}

/**
 * Disable GSC (keeps configuration)
 */
export async function disableGSC(tenantId: string): Promise<GSCServiceResponse> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase client not configured'
      };
    }

    const { data, error } = await supabase.rpc('disable_tenant_gsc', {
      p_tenant_id: tenantId
    });

    if (error) {
      console.error('Error disabling GSC:', error);
      return {
        success: false,
        error: error.message || 'Failed to disable GSC'
      };
    }

    if (data && typeof data === 'object') {
      if (data.success === false) {
        return {
          success: false,
          error: data.error || 'Failed to disable'
        };
      }
      
      return {
        success: true,
        message: data.message || 'GSC disabled successfully'
      };
    }

    return {
      success: true,
      message: 'GSC disabled successfully'
    };
  } catch (error) {
    console.error('Unexpected error in disableGSC:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    };
  }
}

/**
 * Disconnect GSC (removes configuration completely)
 */
export async function disconnectGSC(tenantId: string): Promise<GSCServiceResponse> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase client not configured'
      };
    }

    const { data, error } = await supabase.rpc('disconnect_tenant_gsc', {
      p_tenant_id: tenantId
    });

    if (error) {
      console.error('Error disconnecting GSC:', error);
      return {
        success: false,
        error: error.message || 'Failed to disconnect GSC'
      };
    }

    if (data && typeof data === 'object') {
      if (data.success === false) {
        return {
          success: false,
          error: data.error || 'Failed to disconnect'
        };
      }
      
      return {
        success: true,
        message: data.message || 'GSC disconnected successfully'
      };
    }

    return {
      success: true,
      message: 'GSC disconnected successfully'
    };
  } catch (error) {
    console.error('Unexpected error in disconnectGSC:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    };
  }
}

/**
 * Validate domain format (client-side pre-validation)
 */
export function validateDomainFormat(domain: string): { valid: boolean; error?: string } {
  if (!domain || !domain.trim()) {
    return { valid: false, error: 'Domain is required' };
  }

  const trimmed = domain.trim().toLowerCase();
  
  // Remove protocol if present
  let normalized = trimmed.replace(/^https?:\/\//, '');
  
  // Remove www. prefix
  normalized = normalized.replace(/^www\./, '');
  
  // Remove trailing slash
  normalized = normalized.replace(/\/$/, '');
  
  // Remove any path
  normalized = normalized.split('/')[0];
  
  // Check if localhost
  if (normalized === 'localhost') {
    return { valid: true };
  }
  
  // Basic domain validation: must contain at least one dot
  const domainPattern = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;
  if (!domainPattern.test(normalized)) {
    return { 
      valid: false, 
      error: 'Invalid domain format. Use format: example.com or subdomain.example.com' 
    };
  }
  
  return { valid: true };
}

/**
 * Initiate Google OAuth flow for Search Console
 * This constructs the OAuth URL and redirects the user to Google
 */
export async function initiateGSCOAuth(tenantId: string): Promise<void> {
  try {
    // Get environment variables
    const clientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID;
    const frontendUrl = import.meta.env.VITE_SITE_URL || window.location.origin;
    
    if (!clientId) {
      throw new Error('Google OAuth Client ID not configured. Please set VITE_GOOGLE_OAUTH_CLIENT_ID in environment variables.');
    }

    // Store tenant ID in session storage for OAuth callback
    sessionStorage.setItem('gsc_oauth_tenant_id', tenantId);
    sessionStorage.setItem('gsc_oauth_state', crypto.randomUUID());
    
    // Construct OAuth URL
    const redirectUri = `${frontendUrl}/admin/plugins/google-search-console/callback`;
    const scope = 'https://www.googleapis.com/auth/webmasters.readonly';
    const state = sessionStorage.getItem('gsc_oauth_state');
    
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('state', state || '');
    
    console.log('[GSC OAuth] Initiating OAuth flow:', {
      redirectUri,
      scope,
      state
    });
    
    // Redirect to Google OAuth
    window.location.href = authUrl.toString();
  } catch (error) {
    console.error('[GSC OAuth] Error initiating OAuth:', error);
    throw error;
  }
}

/**
 * Handle OAuth callback from Google
 * This exchanges the authorization code for tokens
 */
export async function handleGSCOAuthCallback(
  code: string,
  state: string
): Promise<GSCServiceResponse> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase client not configured'
      };
    }

    // Verify state matches
    const savedState = sessionStorage.getItem('gsc_oauth_state');
    if (state !== savedState) {
      return {
        success: false,
        error: 'Invalid OAuth state. Possible CSRF attack detected.'
      };
    }

    // Get tenant ID from session
    const tenantId = sessionStorage.getItem('gsc_oauth_tenant_id');
    if (!tenantId) {
      return {
        success: false,
        error: 'OAuth session expired. Please try connecting again.'
      };
    }

    // Get current session for authorization
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return {
        success: false,
        error: 'Not authenticated. Please log in and try again.'
      };
    }

    // Call Edge Function to exchange code for tokens
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const response = await fetch(`${supabaseUrl}/functions/v1/gsc-oauth-callback`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        tenant_id: tenantId,
        redirect_uri: `${window.location.origin}/admin/plugins/google-search-console/callback`
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `OAuth callback failed with status ${response.status}`);
    }

    const result = await response.json();

    // Clean up session storage
    sessionStorage.removeItem('gsc_oauth_state');
    sessionStorage.removeItem('gsc_oauth_tenant_id');

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'OAuth callback failed'
      };
    }

    return {
      success: true,
      data: result.data,
      message: 'Successfully connected to Google Search Console'
    };
  } catch (error) {
    console.error('[GSC OAuth] Error handling callback:', error);
    
    // Clean up session storage on error
    sessionStorage.removeItem('gsc_oauth_state');
    sessionStorage.removeItem('gsc_oauth_tenant_id');
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred during OAuth'
    };
  }
}

/**
 * Fetch GSC metrics from the API
 */
export async function fetchGSCMetrics(
  tenantId: string,
  dateRange: 'last7days' | 'last28days' | 'last3months' | 'last12months' = 'last28days'
): Promise<GSCServiceResponse<any>> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase client not configured'
      };
    }

    // Get current session for authorization
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return {
        success: false,
        error: 'Not authenticated'
      };
    }

    // Call Edge Function to fetch metrics
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const response = await fetch(`${supabaseUrl}/functions/v1/gsc-fetch-metrics`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tenant_id: tenantId,
        date_range: dateRange
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `Failed to fetch metrics: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to fetch metrics'
      };
    }

    return {
      success: true,
      data: result.data
    };
  } catch (error) {
    console.error('[GSC Metrics] Error fetching metrics:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch metrics'
    };
  }
}
