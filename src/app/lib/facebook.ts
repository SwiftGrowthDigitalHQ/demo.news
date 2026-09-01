/**
 * Facebook Publisher Client Library
 * 
 * Customer-friendly interface for Facebook Page publishing integration.
 * NO manual API keys, NO technical configuration required.
 */

import { getSupabaseClient } from '../../lib/supabase';

// Helper to access Vite environment variables
function getEnv(key: string): string | undefined {
  return (import.meta.env as Record<string, string | undefined>)[key];
}

export interface FacebookConnectionStatus {
  connected: boolean;
  connection: {
    id: string;
    facebook_user_name: string | null;
    facebook_user_email: string | null;
    facebook_page_id: string;
    facebook_page_name: string;
    facebook_page_username: string | null;
    facebook_page_category: string | null;
    facebook_page_image_url: string | null;
    facebook_page_url: string;
    status: string;
    last_used_at: string | null;
    last_error: string | null;
    created_at: string;
    updated_at: string;
  } | null;
}

export interface FacebookPublishResult {
  success: boolean;
  post_id: string;
  post_url: string;
  page_name: string;
  published_at: string;
}

export interface FacebookPublishHistory {
  id: string;
  article_id: string;
  article_title: string;
  facebook_page_name: string;
  facebook_post_id: string | null;
  post_url: string | null;
  status: string;
  error_message: string | null;
  published_at: string | null;
  created_at: string;
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

export async function connectFacebook(): Promise<void> {
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
  sessionStorage.setItem('facebook_csrf_token', csrfToken);
  sessionStorage.setItem('facebook_csrf_tenant', tenantId);
  
  // Call Edge Function
  const response = await fetch(
    `${getEnv('VITE_SUPABASE_URL')}/functions/v1/facebook-oauth-start`,
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
    throw new Error(error.error || 'Failed to initiate Facebook OAuth');
  }
  
  const result = await response.json();
  
  if (!result.success || !result.oauth_url) {
    throw new Error('Failed to generate OAuth URL');
  }
  
  // Redirect to Facebook OAuth
  window.location.href = result.oauth_url;
}

export async function getFacebookConnectionStatus(): Promise<FacebookConnectionStatus> {
  const supabase = await getSupabaseClient();
  
  if (!supabase) {
    return { connected: false, connection: null };
  }
  
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }
  
  const response = await fetch(
    `${getEnv('VITE_SUPABASE_URL')}/functions/v1/facebook-connection/status`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    console.error('[Facebook] Failed to get connection status:', error);
    return { connected: false, connection: null };
  }
  
  return await response.json();
}

export async function selectFacebookPage(pageData: any): Promise<void> {
  const supabase = await getSupabaseClient();
  
  if (!supabase) {
    throw new Error('Supabase not configured');
  }
  
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }
  
  const response = await fetch(
    `${getEnv('VITE_SUPABASE_URL')}/functions/v1/facebook-connection/select-page`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pageData),
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || error.details || 'Failed to select Facebook Page');
  }
  
  const result = await response.json();
  
  if (!result.success) {
    throw new Error('Failed to save Page selection');
  }
}

export async function disconnectFacebook(): Promise<void> {
  const supabase = await getSupabaseClient();
  
  if (!supabase) {
    throw new Error('Supabase not configured');
  }
  
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }
  
  const response = await fetch(
    `${getEnv('VITE_SUPABASE_URL')}/functions/v1/facebook-connection/disconnect`,
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
    throw new Error(error.error || 'Failed to disconnect Facebook');
  }
}

export async function publishToFacebook(
  articleId: string,
  message: string,
  link?: string,
  published: boolean = true
): Promise<FacebookPublishResult> {
  const supabase = await getSupabaseClient();
  
  if (!supabase) {
    throw new Error('Supabase not configured');
  }
  
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }
  
  const response = await fetch(
    `${getEnv('VITE_SUPABASE_URL')}/functions/v1/facebook-publish-post`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        article_id: articleId,
        message,
        link,
        published,
      }),
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to publish to Facebook');
  }
  
  const result = await response.json();
  return {
    success: result.success,
    post_id: result.post_id,
    post_url: result.post_url,
    page_name: '', // Will be filled from connection data
    published_at: new Date().toISOString(),
  };
}

export async function getFacebookPublishHistory(
  limit: number = 50
): Promise<FacebookPublishHistory[]> {
  const tenantId = await getCurrentTenantId();
  const supabase = await getSupabaseClient();
  
  if (!supabase) {
    return [];
  }
  
  const { data, error } = await supabase
    .rpc('get_facebook_publish_history', {
      p_tenant_id: tenantId,
      p_limit: limit,
    });
  
  if (error) {
    console.error('[Facebook] Failed to get publish history:', error);
    return [];
  }
  
  return data || [];
}

export async function isArticlePublishedToFacebook(articleId: string): Promise<boolean> {
  const tenantId = await getCurrentTenantId();
  const supabase = await getSupabaseClient();
  
  if (!supabase) {
    return false;
  }
  
  const { data, error } = await supabase
    .rpc('is_article_published_to_facebook', {
      p_tenant_id: tenantId,
      p_article_id: articleId,
    });
  
  if (error) {
    console.error('[Facebook] Failed to check publish status:', error);
    return false;
  }
  
  return data || false;
}

export function checkFacebookOAuthCallback(): {
  success: boolean;
  error: string | null;
  selectPage: string | null;
} {
  const params = new URLSearchParams(window.location.search);
  
  if (params.get('facebook_success') === 'true') {
    sessionStorage.removeItem('facebook_csrf_token');
    sessionStorage.removeItem('facebook_csrf_tenant');
    return { success: true, error: null, selectPage: null };
  }
  
  const selectPage = params.get('facebook_select_page');
  if (selectPage) {
    return { success: false, error: null, selectPage };
  }
  
  const error = params.get('facebook_error');
  if (error) {
    sessionStorage.removeItem('facebook_csrf_token');
    sessionStorage.removeItem('facebook_csrf_tenant');
    return { success: false, error, selectPage: null };
  }
  
  return { success: false, error: null, selectPage: null };
}

export function getFacebookErrorMessage(errorCode: string): string {
  const errorMessages: Record<string, string> = {
    'access_denied': 'You cancelled the Facebook authorization.',
    'invalid_callback': 'Invalid OAuth callback. Please try connecting again.',
    'invalid_state': 'Security validation failed. Please try connecting again.',
    'no_pages': 'No Facebook Pages found in this account. Please create a Facebook Page first.',
    'connection_failed': 'Failed to connect Facebook. Please try again.',
    'configuration_missing': 'Facebook integration is not configured. Please contact your administrator to set up Meta App credentials.',
  };
  
  return errorMessages[errorCode] || 'An error occurred. Please try again.';
}
