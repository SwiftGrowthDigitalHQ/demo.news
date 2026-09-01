/**
 * GA4 Fetch Metrics Edge Function
 * 
 * Fetches real analytics data from Google Analytics Data API (GA4)
 * Supports: pageviews, sessions, users, realtime data
 * 
 * Endpoint: POST /functions/v1/ga4-fetch-metrics
 * Body: { 
 *   metric_type: 'overview' | 'realtime' | 'pages' | 'sources',
 *   date_range: 'today' | '7days' | '30days' | '90days',
 *   tenant_id: string (optional, auto-detected from auth)
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ENCRYPTION_KEY = Deno.env.get('GA4_ENCRYPTION_KEY') ?? '';

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('[GA4 Metrics] Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const body = await req.json();
    const { metric_type = 'overview', date_range = '7days', tenant_id } = body;

    // Get user's tenant ID
    const { data: profile } = await supabase
      .from('users')
      .select('owned_tenant_id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    const resolvedTenantId = tenant_id || profile?.owned_tenant_id;

    if (!resolvedTenantId) {
      return new Response(JSON.stringify({ error: 'No tenant found for user' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('[GA4 Metrics] Fetching', metric_type, 'for tenant:', resolvedTenantId);

    // Get GA4 connection
    const { data: connection, error: connError } = await supabase
      .from('ga4_connections')
      .select('*')
      .eq('tenant_id', resolvedTenantId)
      .eq('status', 'active')
      .maybeSingle();

    if (connError || !connection) {
      console.error('[GA4 Metrics] Connection error:', connError);
      return new Response(JSON.stringify({ 
        error: 'GA4 not connected',
        message: 'Please connect Google Analytics in plugin settings'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Decrypt access token
    const accessToken = await decryptToken(connection.access_token_encrypted);

    // Check if token is expired
    const expiresAt = new Date(connection.token_expires_at);
    if (expiresAt < new Date()) {
      console.log('[GA4 Metrics] Token expired, refreshing...');
      
      const refreshedToken = await refreshAccessToken(
        connection.refresh_token_encrypted,
        connection.id,
        supabase
      );
      
      if (!refreshedToken) {
        return new Response(JSON.stringify({ 
          error: 'Token expired',
          message: 'Please reconnect Google Analytics'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Get property ID from connection
    const propertyId = connection.property_id;

    if (!propertyId) {
      return new Response(JSON.stringify({ 
        error: 'No property ID found',
        message: 'Please reconnect Google Analytics'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch metrics based on type
    let metrics;
    
    switch (metric_type) {
      case 'overview':
        metrics = await fetchOverviewMetrics(accessToken, propertyId, date_range);
        break;
      case 'realtime':
        metrics = await fetchRealtimeMetrics(accessToken, propertyId);
        break;
      case 'pages':
        metrics = await fetchTopPagesMetrics(accessToken, propertyId, date_range);
        break;
      case 'sources':
        metrics = await fetchTrafficSourcesMetrics(accessToken, propertyId, date_range);
        break;
      default:
        return new Response(JSON.stringify({ error: 'Invalid metric_type' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify({ success: true, data: metrics }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('[GA4 Metrics] Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

// ── Token Management ──────────────────────────────────────────────────────────

async function decryptToken(encrypted: string): Promise<string> {
  if (!ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY not configured');
  
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)),
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const [ivHex, cipherHex] = encrypted.split(':');
  const iv = hexToBytes(ivHex);
  const ciphertext = hexToBytes(cipherHex);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}

async function encryptToken(token: string): Promise<string> {
  if (!ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY not configured');
  
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)),
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(token)
  );

  return bytesToHex(iv) + ':' + bytesToHex(new Uint8Array(encrypted));
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

async function refreshAccessToken(
  encryptedRefreshToken: string,
  connectionId: string,
  supabase: any
): Promise<string | null> {
  try {
    const refreshToken = await decryptToken(encryptedRefreshToken);
    
    // Exchange refresh token for new access token
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: Deno.env.get('GOOGLE_OAUTH_CLIENT_ID') ?? '',
        client_secret: Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET') ?? '',
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      console.error('[GA4 Metrics] Token refresh failed:', await response.text());
      return null;
    }

    const tokens = await response.json();
    const newAccessToken = tokens.access_token;
    const expiresIn = tokens.expires_in;

    // Encrypt and store new access token
    const accessTokenEncrypted = await encryptToken(newAccessToken);
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    await supabase
      .from('ga4_connections')
      .update({
        access_token_encrypted: accessTokenEncrypted,
        token_expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId);

    console.log('[GA4 Metrics] Token refreshed successfully');
    return newAccessToken;

  } catch (error) {
    console.error('[GA4 Metrics] Error refreshing token:', error);
    return null;
  }
}

// ── Analytics API Calls ───────────────────────────────────────────────────────

async function fetchOverviewMetrics(
  accessToken: string,
  propertyId: string,
  dateRange: string
): Promise<any> {
  const { startDate, endDate } = getDateRange(dateRange);

  const response = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        metrics: [
          { name: 'activeUsers' },
          { name: 'sessions' },
          { name: 'screenPageViews' },
          { name: 'averageSessionDuration' },
          { name: 'bounceRate' },
        ],
        dimensions: [{ name: 'date' }],
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`GA4 API error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return parseOverviewData(data);
}

async function fetchRealtimeMetrics(
  accessToken: string,
  propertyId: string
): Promise<any> {
  const response = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runRealtimeReport`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        metrics: [
          { name: 'activeUsers' },
          { name: 'screenPageViews' },
        ],
        dimensions: [{ name: 'unifiedScreenName' }],
        limit: 10,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`GA4 Realtime API error: ${response.status}`);
  }

  const data = await response.json();
  return parseRealtimeData(data);
}

async function fetchTopPagesMetrics(
  accessToken: string,
  propertyId: string,
  dateRange: string
): Promise<any> {
  const { startDate, endDate } = getDateRange(dateRange);

  const response = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        metrics: [
          { name: 'screenPageViews' },
          { name: 'activeUsers' },
          { name: 'averageSessionDuration' },
        ],
        dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 20,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`GA4 API error: ${response.status}`);
  }

  const data = await response.json();
  return parseTopPagesData(data);
}

async function fetchTrafficSourcesMetrics(
  accessToken: string,
  propertyId: string,
  dateRange: string
): Promise<any> {
  const { startDate, endDate } = getDateRange(dateRange);

  const response = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        metrics: [
          { name: 'sessions' },
          { name: 'activeUsers' },
        ],
        dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 10,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`GA4 API error: ${response.status}`);
  }

  const data = await response.json();
  return parseTrafficSourcesData(data);
}

// ── Data Parsers ──────────────────────────────────────────────────────────────

function getDateRange(range: string): { startDate: string; endDate: string } {
  const today = new Date();
  const endDate = today.toISOString().split('T')[0];

  let startDate: string;
  switch (range) {
    case 'today':
      startDate = endDate;
      break;
    case '7days':
      startDate = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      break;
    case '30days':
      startDate = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      break;
    case '90days':
      startDate = new Date(today.getTime() - 89 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      break;
    default:
      startDate = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  }

  return { startDate, endDate };
}

function parseOverviewData(data: any): any {
  const rows = data.rows || [];
  
  let totalUsers = 0;
  let totalSessions = 0;
  let totalPageViews = 0;
  let totalDuration = 0;
  let totalBounceRate = 0;

  const timeline: any[] = [];

  rows.forEach((row: any) => {
    const date = row.dimensionValues[0].value;
    const users = parseInt(row.metricValues[0].value);
    const sessions = parseInt(row.metricValues[1].value);
    const pageViews = parseInt(row.metricValues[2].value);
    const duration = parseFloat(row.metricValues[3].value);
    const bounceRate = parseFloat(row.metricValues[4].value);

    totalUsers += users;
    totalSessions += sessions;
    totalPageViews += pageViews;
    totalDuration += duration * sessions;
    totalBounceRate += bounceRate * sessions;

    timeline.push({
      date,
      users,
      sessions,
      pageViews,
    });
  });

  const avgDuration = totalSessions > 0 ? totalDuration / totalSessions : 0;
  const avgBounceRate = totalSessions > 0 ? totalBounceRate / totalSessions : 0;

  return {
    summary: {
      totalUsers,
      totalSessions,
      totalPageViews,
      avgSessionDuration: Math.round(avgDuration),
      bounceRate: avgBounceRate.toFixed(2),
    },
    timeline,
  };
}

function parseRealtimeData(data: any): any {
  const rows = data.rows || [];
  
  let activeUsers = 0;
  const pages: any[] = [];

  rows.forEach((row: any) => {
    const pageName = row.dimensionValues[0].value;
    const users = parseInt(row.metricValues[0].value);
    const views = parseInt(row.metricValues[1].value);

    activeUsers += users;
    pages.push({ pageName, users, views });
  });

  return {
    activeUsers,
    pages,
  };
}

function parseTopPagesData(data: any): any {
  const rows = data.rows || [];
  
  return rows.map((row: any) => ({
    path: row.dimensionValues[0].value,
    title: row.dimensionValues[1].value,
    pageViews: parseInt(row.metricValues[0].value),
    users: parseInt(row.metricValues[1].value),
    avgDuration: parseFloat(row.metricValues[2].value).toFixed(2),
  }));
}

function parseTrafficSourcesData(data: any): any {
  const rows = data.rows || [];
  
  return rows.map((row: any) => ({
    source: row.dimensionValues[0].value,
    medium: row.dimensionValues[1].value,
    sessions: parseInt(row.metricValues[0].value),
    users: parseInt(row.metricValues[1].value),
  }));
}
