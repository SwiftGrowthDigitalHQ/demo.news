# Task #3: Google Search Console API Integration
**Status**: Ready to Implement  
**Date**: 2026-08-27

---

## Current State

### ✅ Already Working
1. **OAuth Flow Complete**
   - `gsc-oauth-start` Edge Function exists
   - `gsc-oauth-callback` Edge Function exists
   - Token encryption working
   - Database: `gsc_connections` table
   
2. **Frontend Components**
   - `GoogleSearchConsoleManager.tsx` UI complete
   - `gsc.ts` client library with:
     - `connectGSC()` - OAuth initiation
     - `getGSCConnectionStatus()` - connection check
     - `syncGSCData(dateRange)` - data sync
     - `disconnectGSC()` - disconnect
   - Displays data from database tables

3. **Database Tables**
   - `gsc_connections` - connection metadata
   - `gsc_performance_data` - daily aggregates
   - `gsc_top_queries` - top search queries
   - `gsc_top_pages` - top pages

### ⚠️ Missing: Real API Integration

Current `syncGSCData()` calls `gsc-connection/sync` but that Edge Function doesn't exist yet or doesn't call Google Search Console API.

---

## Implementation Plan

### Step 1: Create `gsc-fetch-metrics` Edge Function

**File**: `/supabase/functions/gsc-fetch-metrics/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface FetchMetricsRequest {
  date_range: 'last7days' | 'last28days' | 'last90days'
  dimension?: 'query' | 'page' | 'date'
}

serve(async (req) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': Deno.env.get('FRONTEND_URL') || '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    })
  }

  try {
    // Get auth token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Get current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Get tenant ID
    const { data: membership } = await supabaseClient
      .from('tenant_memberships')
      .select('tenant_id')
      .eq('auth_user_id', user.id)
      .limit(1)
      .single()

    if (!membership) {
      throw new Error('No tenant membership found')
    }

    const tenantId = membership.tenant_id

    // Get GSC connection
    const { data: connection, error: connError } = await supabaseClient
      .from('gsc_connections')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .is('deleted_at', null)
      .maybeSingle()

    if (connError || !connection) {
      throw new Error('No active GSC connection found')
    }

    // Decrypt access token
    const decryptedToken = await decryptToken(connection.encrypted_access_token)

    // Check if token expired
    const tokenExpiry = new Date(connection.token_expiry)
    const now = new Date()
    
    let accessToken = decryptedToken

    if (now >= tokenExpiry) {
      // Refresh token
      const refreshedTokens = await refreshAccessToken(connection.encrypted_refresh_token)
      accessToken = refreshedTokens.access_token

      // Update database
      await supabaseClient
        .from('gsc_connections')
        .update({
          encrypted_access_token: await encryptToken(refreshedTokens.access_token),
          token_expiry: new Date(Date.now() + refreshedTokens.expires_in * 1000).toISOString(),
        })
        .eq('id', connection.id)
    }

    // Parse request
    const body: FetchMetricsRequest = await req.json()
    const { date_range, dimension } = body

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    
    switch (date_range) {
      case 'last7days':
        startDate.setDate(startDate.getDate() - 7)
        break
      case 'last28days':
        startDate.setDate(startDate.getDate() - 28)
        break
      case 'last90days':
        startDate.setDate(startDate.getDate() - 90)
        break
      default:
        startDate.setDate(startDate.getDate() - 28)
    }

    const formatDate = (date: Date) => date.toISOString().split('T')[0]

    // Call Search Console API
    const siteUrl = connection.property_url
    const apiUrl = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`

    const searchRequest = {
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      dimensions: dimension ? [dimension] : ['query'],
      rowLimit: 100,
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(searchRequest),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[GSC API] Error:', errorText)
      throw new Error(`Search Console API error: ${response.status}`)
    }

    const data = await response.json()

    // Return formatted data
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          rows: data.rows || [],
          dateRange: {
            start: formatDate(startDate),
            end: formatDate(endDate),
          },
        },
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': Deno.env.get('FRONTEND_URL') || '*',
        },
      }
    )

  } catch (error) {
    console.error('[GSC Fetch Metrics] Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': Deno.env.get('FRONTEND_URL') || '*',
        },
      }
    )
  }
})

// Encryption/decryption helpers (similar to GA4)
async function encryptToken(token: string): Promise<string> {
  const key = Deno.env.get('GSC_ENCRYPTION_KEY')
  if (!key) throw new Error('GSC_ENCRYPTION_KEY not configured')
  
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const keyData = encoder.encode(key.padEnd(32, '0').substring(0, 32))
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  )
  
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    data
  )
  
  const combined = new Uint8Array(iv.length + encrypted.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(encrypted), iv.length)
  
  return btoa(String.fromCharCode(...combined))
}

async function decryptToken(encryptedToken: string): Promise<string> {
  const key = Deno.env.get('GSC_ENCRYPTION_KEY')
  if (!key) throw new Error('GSC_ENCRYPTION_KEY not configured')
  
  const combined = Uint8Array.from(atob(encryptedToken), c => c.charCodeAt(0))
  const iv = combined.slice(0, 12)
  const data = combined.slice(12)
  
  const encoder = new TextEncoder()
  const keyData = encoder.encode(key.padEnd(32, '0').substring(0, 32))
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  )
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    data
  )
  
  const decoder = new TextDecoder()
  return decoder.decode(decrypted)
}

async function refreshAccessToken(encryptedRefreshToken: string): Promise<{
  access_token: string
  expires_in: number
}> {
  const refreshToken = await decryptToken(encryptedRefreshToken)
  
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_OAUTH_CLIENT_ID') ?? '',
      client_secret: Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET') ?? '',
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  
  if (!response.ok) {
    throw new Error('Failed to refresh access token')
  }
  
  return await response.json()
}
```

**Deploy**:
```bash
supabase functions deploy gsc-fetch-metrics
```

---

### Step 2: Update `gsc.ts` Client Library

Add new function to fetch real-time metrics:

```typescript
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

  // Fetch queries
  const queriesResponse = await fetch(
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
  )

  if (!queriesResponse.ok) {
    throw new Error('Failed to fetch GSC queries')
  }

  const queriesData = await queriesResponse.json()

  // Fetch pages
  const pagesResponse = await fetch(
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
  )

  if (!pagesResponse.ok) {
    throw new Error('Failed to fetch GSC pages')
  }

  const pagesData = await pagesResponse.json()

  // Fetch timeline
  const timelineResponse = await fetch(
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
  )

  if (!timelineResponse.ok) {
    throw new Error('Failed to fetch GSC timeline')
  }

  const timelineData = await timelineResponse.json()

  // Calculate summary
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
```

---

### Step 3: Update `GoogleSearchConsoleManager.tsx`

Replace `loadPerformanceData()` to use real API:

```typescript
// Replace loadPerformanceData function
const loadPerformanceData = async (dateRange: string) => {
  try {
    setLoadingMetrics(true)
    
    const metrics = await fetchGSCMetrics(
      dateRange === 'last7days' ? 'last7days' :
      dateRange === 'last28days' ? 'last28days' :
      'last90days'
    )
    
    setPerformanceData({
      clicks: metrics.summary.clicks,
      impressions: metrics.summary.impressions,
      ctr: metrics.summary.ctr,
      position: metrics.summary.position,
      date_range: {
        start: metrics.timeline[0]?.date || '',
        end: metrics.timeline[metrics.timeline.length - 1]?.date || '',
      },
    })
    
    setTopQueries(metrics.queries.slice(0, config.queries_limit))
    setTopPages(metrics.pages.slice(0, config.pages_limit))
  } catch (error: any) {
    console.error('[GSC Manager] Error loading performance data:', error)
    setMessage({ type: 'error', text: `Failed to load metrics: ${error.message}` })
  } finally {
    setLoadingMetrics(false)
  }
}

// Add state
const [loadingMetrics, setLoadingMetrics] = useState(false)
```

---

## Testing Checklist

### Deployment
- [ ] Deploy `gsc-fetch-metrics`: `supabase functions deploy gsc-fetch-metrics`
- [ ] Verify `GSC_ENCRYPTION_KEY` secret is set
- [ ] Check Edge Function logs for errors

### Functionality Testing
- [ ] Connect GSC OAuth successfully
- [ ] Verify property detected correctly
- [ ] Click "Sync Data" - should fetch from API
- [ ] Check performance metrics display
- [ ] Verify top queries display
- [ ] Verify top pages display
- [ ] Test date range switching (7d, 28d, 90d)
- [ ] Test token refresh (wait for expiry or force)
- [ ] Disconnect and reconnect
- [ ] Check browser console for errors
- [ ] Verify no database errors in Supabase logs

### Production Testing
- [ ] Deploy to production
- [ ] Test OAuth with production redirect URL
- [ ] Verify metrics load correctly
- [ ] Monitor Edge Function performance
- [ ] Check API quota usage in Google Cloud Console

---

## Files to Create/Modify

### Create:
1. `/supabase/functions/gsc-fetch-metrics/index.ts`

### Modify:
1. `/demo.news/src/app/lib/gsc.ts` - add `fetchGSCMetrics()`
2. `/demo.news/src/app/components/admin/GoogleSearchConsoleManager.tsx` - update `loadPerformanceData()`

---

## Next Steps

After GSC is complete:
1. **Task #5**: Fix Google AdSense (script injection on public pages)
2. **Task #6**: Facebook Publisher (Graph API posting)
3. **Task #7**: Google Drive (file upload API)
4. **Task #9**: Fix CORS/NetworkError issues
5. **Task #10**: Update plugin status display
6. **Task #11**: End-to-end testing
7. **Task #12**: Production deployment

---

**Estimated Time**: 2-3 hours  
**Priority**: High (critical for SEO optimization)  
**Dependencies**: Google Search Console API enabled in GCP
