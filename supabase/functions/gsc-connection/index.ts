/**
 * Google Search Console Connection Management
 * 
 * Operations:
 * - GET /status - Retrieve connection status (safe, no token exposure)
 * - POST /sync - Sync Search Console performance data
 * - POST /disconnect - Remove connection
 * 
 * Security:
 * - Validates tenant membership
 * - Never exposes encrypted tokens to frontend
 * - Automatic token refresh when expired
 * - Tenant isolation enforced
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const GOOGLE_OAUTH_CLIENT_ID = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID') || '';
const GOOGLE_OAUTH_CLIENT_SECRET = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET') || '';
const GSC_ENCRYPTION_KEY = Deno.env.get('GA4_ENCRYPTION_KEY') || '';
const FRONTEND_URL = Deno.env.get('SITE_URL') || 'http://localhost:5173';

interface TokenRefreshResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

interface SearchAnalyticsRow {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
}

interface SearchAnalyticsResponse {
  rows?: SearchAnalyticsRow[];
  responseAggregationType?: string;
}

/**
 * AES-256-GCM decryption
 */
async function decryptToken(encryptedToken: string): Promise<string> {
  const combined = Uint8Array.from(atob(encryptedToken), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);
  
  const keyData = Uint8Array.from(atob(GSC_ENCRYPTION_KEY), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encrypted
  );
  
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * AES-256-GCM encryption
 */
async function encryptToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const keyData = Uint8Array.from(atob(GSC_ENCRYPTION_KEY), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    data
  );
  
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

/**
 * Refresh Google access token
 */
async function refreshAccessToken(refreshToken: string): Promise<TokenRefreshResponse> {
  const tokenUrl = 'https://oauth2.googleapis.com/token';
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_OAUTH_CLIENT_ID,
      client_secret: GOOGLE_OAUTH_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }
  
  return await response.json();
}

/**
 * Get valid access token (refreshes if needed)
 */
async function getValidAccessToken(
  connectionId: string,
  accessTokenEncrypted: string,
  refreshTokenEncrypted: string,
  tokenExpiresAt: string
): Promise<string> {
  const now = new Date();
  const expiresAt = new Date(tokenExpiresAt);
  
  // If token expires in less than 5 minutes, refresh it
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    console.log('[GSC Connection] Token expired or expiring soon, refreshing...');
    
    const refreshToken = await decryptToken(refreshTokenEncrypted);
    const newTokens = await refreshAccessToken(refreshToken);
    
    // Encrypt new access token
    const newAccessTokenEncrypted = await encryptToken(newTokens.access_token);
    const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000).toISOString();
    
    // Update in database
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    await supabase
      .from('google_search_console_connections')
      .update({
        access_token_encrypted: newAccessTokenEncrypted,
        token_expires_at: newExpiresAt,
      })
      .eq('id', connectionId);
    
    console.log('[GSC Connection] Token refreshed successfully');
    
    return newTokens.access_token;
  }
  
  // Token still valid, decrypt and return
  return await decryptToken(accessTokenEncrypted);
}

/**
 * Get tenant ID from authenticated user
 */
async function getTenantIdFromAuth(authToken: string): Promise<string | null> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  const { data: { user }, error: authError } = await supabase.auth.getUser(authToken);
  
  if (authError || !user) {
    return null;
  }
  
  const { data } = await supabase
    .from('tenant_memberships')
    .select('tenant_id')
    .eq('auth_user_id', user.id)
    .limit(1)
    .maybeSingle();
  
  return data?.tenant_id || null;
}

/**
 * Format date for Search Console API
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Handle GET /status - Retrieve connection status
 */
async function handleStatus(tenantId: string) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  const { data, error } = await supabase
    .from('google_search_console_connections')
    .select('id, google_account_email, property_url, property_type, permission_level, status, last_sync_at, last_error, created_at')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .is('deleted_at', null)
    .maybeSingle();
  
  if (error) {
    throw new Error(`Failed to get connection: ${error.message}`);
  }
  
  if (!data) {
    return {
      connected: false,
      connection: null,
    };
  }
  
  return {
    connected: true,
    connection: {
      id: data.id,
      google_account_email: data.google_account_email,
      property_url: data.property_url,
      property_type: data.property_type,
      permission_level: data.permission_level,
      status: data.status,
      last_sync_at: data.last_sync_at,
      last_error: data.last_error,
      created_at: data.created_at,
    },
  };
}

/**
 * Handle POST /sync - Sync Search Console data
 */
async function handleSync(tenantId: string, dateRange: string = 'last28days') {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  // Get connection
  const { data: connection, error: connError } = await supabase
    .from('google_search_console_connections')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .is('deleted_at', null)
    .single();
  
  if (connError || !connection) {
    throw new Error('No active Search Console connection found');
  }
  
  // Get valid access token
  const accessToken = await getValidAccessToken(
    connection.id,
    connection.access_token_encrypted,
    connection.refresh_token_encrypted,
    connection.token_expires_at
  );
  
  // Calculate date range
  const endDate = new Date();
  const startDate = new Date();
  
  switch (dateRange) {
    case 'last7days':
      startDate.setDate(endDate.getDate() - 7);
      break;
    case 'last28days':
      startDate.setDate(endDate.getDate() - 28);
      break;
    case 'last3months':
      startDate.setMonth(endDate.getMonth() - 3);
      break;
    default:
      startDate.setDate(endDate.getDate() - 28);
  }
  
  // Fetch Search Console data
  const siteUrl = connection.property_url;
  const analyticsUrl = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  
  // Summary query
  const summaryResponse = await fetch(analyticsUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      dimensions: [],
    }),
  });
  
  if (!summaryResponse.ok) {
    const errorBody = await summaryResponse.text();
    throw new Error(`Search Console API error: ${errorBody}`);
  }
  
  const summaryData: SearchAnalyticsResponse = await summaryResponse.json();
  const summaryRow = summaryData.rows?.[0];
  
  // Store summary analytics
  await supabase
    .from('google_search_console_analytics')
    .upsert({
      connection_id: connection.id,
      tenant_id: tenantId,
      date_start: formatDate(startDate),
      date_end: formatDate(endDate),
      total_clicks: summaryRow?.clicks || 0,
      total_impressions: summaryRow?.impressions || 0,
      average_ctr: summaryRow?.ctr || 0,
      average_position: summaryRow?.position || 0,
    }, {
      onConflict: 'connection_id,date_start,date_end',
    });
  
  // Fetch top queries
  const queriesResponse = await fetch(analyticsUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      dimensions: ['query'],
      rowLimit: 100,
    }),
  });
  
  if (queriesResponse.ok) {
    const queriesData: SearchAnalyticsResponse = await queriesResponse.json();
    
    if (queriesData.rows) {
      // Delete old queries for this date range
      await supabase
        .from('google_search_console_queries')
        .delete()
        .eq('connection_id', connection.id)
        .eq('date_start', formatDate(startDate))
        .eq('date_end', formatDate(endDate));
      
      // Insert new queries
      const queryRows = queriesData.rows.map(row => ({
        connection_id: connection.id,
        tenant_id: tenantId,
        date_start: formatDate(startDate),
        date_end: formatDate(endDate),
        query: row.keys?.[0] || '',
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0,
      }));
      
      await supabase
        .from('google_search_console_queries')
        .insert(queryRows);
    }
  }
  
  // Fetch top pages
  const pagesResponse = await fetch(analyticsUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      dimensions: ['page'],
      rowLimit: 100,
    }),
  });
  
  if (pagesResponse.ok) {
    const pagesData: SearchAnalyticsResponse = await pagesResponse.json();
    
    if (pagesData.rows) {
      // Delete old pages for this date range
      await supabase
        .from('google_search_console_pages')
        .delete()
        .eq('connection_id', connection.id)
        .eq('date_start', formatDate(startDate))
        .eq('date_end', formatDate(endDate));
      
      // Insert new pages
      const pageRows = pagesData.rows.map(row => ({
        connection_id: connection.id,
        tenant_id: tenantId,
        date_start: formatDate(startDate),
        date_end: formatDate(endDate),
        page_url: row.keys?.[0] || '',
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0,
      }));
      
      await supabase
        .from('google_search_console_pages')
        .insert(pageRows);
    }
  }
  
  // Update last_sync_at
  await supabase
    .from('google_search_console_connections')
    .update({ last_sync_at: new Date().toISOString() })
    .eq('id', connection.id);
  
  return {
    success: true,
    synced_at: new Date().toISOString(),
    date_range: {
      start: formatDate(startDate),
      end: formatDate(endDate),
    },
    summary: {
      clicks: summaryRow?.clicks || 0,
      impressions: summaryRow?.impressions || 0,
      ctr: summaryRow?.ctr || 0,
      position: summaryRow?.position || 0,
    },
  };
}

/**
 * Handle POST /disconnect - Remove connection
 */
async function handleDisconnect(tenantId: string) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  // Soft delete connection
  const { error } = await supabase
    .from('google_search_console_connections')
    .update({ deleted_at: new Date().toISOString(), status: 'revoked' })
    .eq('tenant_id', tenantId)
    .is('deleted_at', null);
  
  if (error) {
    throw new Error(`Failed to disconnect: ${error.message}`);
  }
  
  return {
    success: true,
    message: 'Google Search Console disconnected successfully',
  };
}

/**
 * Main handler
 */
serve(async (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': FRONTEND_URL,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Extract authorization token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authToken = authHeader.substring(7);

    // Get tenant ID from authenticated user
    const tenantId = await getTenantIdFromAuth(authToken);
    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: No tenant access' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse URL path
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(p => p);
    const operation = pathParts[pathParts.length - 1]; // 'status', 'sync', 'disconnect'

    let result;

    if (req.method === 'GET' && operation === 'status') {
      result = await handleStatus(tenantId);
    } else if (req.method === 'POST' && operation === 'sync') {
      const body = await req.json().catch(() => ({}));
      const dateRange = body.date_range || 'last28days';
      result = await handleSync(tenantId, dateRange);
    } else if (req.method === 'POST' && operation === 'disconnect') {
      result = await handleDisconnect(tenantId);
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid operation' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('[GSC Connection] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
