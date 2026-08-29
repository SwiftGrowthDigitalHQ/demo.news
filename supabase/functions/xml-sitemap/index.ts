/**
 * XML Sitemap Edge Function
 *
 * Public endpoint: GET /functions/v1/xml-sitemap?tenant=<slug>
 *
 * Responsibilities:
 *   1. Resolve tenant from ?tenant= query param (slug)
 *   2. Check xml-sitemap plugin is enabled for that tenant (via get_sitemap_config)
 *   3. Verify a valid canonical_base_url is configured
 *   4. Stream paginated sitemap data from get_sitemap_data()
 *   5. Build valid XML and return with correct Content-Type + Cache headers
 *   6. For large datasets (> max_urls_per_file), return a sitemap index instead
 *
 * Security:
 *   - No authentication required (public sitemap endpoint)
 *   - Uses SERVICE ROLE key only for data queries — never exposed to client
 *   - All data queries filtered by tenant_id resolved from slug
 *   - Cross-tenant data is structurally impossible (SECURITY DEFINER functions)
 *   - No credentials, tokens, or private config returned in the XML
 *
 * Called by:
 *   - Search engines crawling /sitemap.xml (routed via vercel.json rewrites)
 *   - Admin UI "Regenerate" button (with ?preview=true to return XML + count)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Sitemap protocol limits:
 *   • Max 50,000 URLs per sitemap file
 *   • Max 50MB per sitemap file
 *   • Sitemap index required when limits are exceeded
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── Environment ───────────────────────────────────────────────────────────────
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

// Maximum URLs per individual sitemap file (protocol limit is 50,000)
const SITEMAP_URL_LIMIT = 50_000;
// Chunk size when fetching articles (avoids single huge query)
const FETCH_CHUNK_SIZE = 1_000;

// ── CORS / response headers ───────────────────────────────────────────────────
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const XML_HEADERS = {
  ...CORS_HEADERS,
  'Content-Type': 'application/xml; charset=utf-8',
  // 1-hour public cache, 5-minute stale-while-revalidate
  'Cache-Control': 'public, max-age=3600, stale-while-revalidate=300',
  'X-Robots-Tag': 'noindex', // Don't let robots index the function URL itself
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface SitemapConfig {
  plugin_enabled: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plugin_config: Record<string, any>;
  canonical_base_url: string | null;
  site_url_fallback: string | null;
  tenant_id: string;
}

interface SitemapRow {
  url_type: 'homepage' | 'article' | 'category' | 'author';
  slug: string;
  updated_at: string;
  priority: string;
  changefreq: string;
}

// ── XML helpers ───────────────────────────────────────────────────────────────

/** Escape XML special characters */
function xmlEsc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Format a date as ISO-8601 date (YYYY-MM-DD) — the lastmod format Google prefers */
function fmtDate(iso: string | null | undefined): string {
  if (!iso) return new Date().toISOString().split('T')[0];
  try {
    return new Date(iso).toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

/** Normalise a base URL: remove trailing slash, ensure https scheme */
function normaliseBase(raw: string): string {
  let url = raw.trim().replace(/\/+$/, '');
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  return url;
}

/** Build the <loc> for a given row */
function buildLoc(base: string, row: SitemapRow): string {
  switch (row.url_type) {
    case 'homepage':  return `${base}/`;
    case 'article':   return `${base}/article/${xmlEsc(row.slug)}`;
    case 'category':  return `${base}/category/${xmlEsc(row.slug)}`;
    case 'author':    return `${base}/author/${xmlEsc(row.slug)}`;
    default:          return `${base}/`;
  }
}

/** Render a single <url> block */
function renderUrl(loc: string, lastmod: string, changefreq: string, priority: string): string {
  return [
    '  <url>',
    `    <loc>${loc}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    '  </url>',
  ].join('\n');
}

/** Render a complete <urlset> sitemap from an array of rows */
function renderUrlset(base: string, rows: SitemapRow[], cfg: SitemapConfig): string {
  const parts: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ];

  for (const row of rows) {
    const loc        = buildLoc(base, row);
    const lastmod    = fmtDate(row.updated_at);
    // Use per-type changefreq / priority from config when available
    const changefreq = getConfigValue(cfg, row.url_type, 'changefreq', row.changefreq);
    const priority   = getConfigValue(cfg, row.url_type, 'priority',   row.priority);

    parts.push(renderUrl(loc, lastmod, changefreq, priority));
  }

  parts.push('</urlset>');
  return parts.join('\n');
}

/** Render a sitemap index pointing to chunked article sitemaps */
function renderSitemapIndex(base: string, chunkCount: number): string {
  const parts: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ];

  for (let i = 0; i < chunkCount; i++) {
    parts.push('  <sitemap>');
    parts.push(`    <loc>${base}/sitemap-articles-${i + 1}.xml</loc>`);
    parts.push(`    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>`);
    parts.push('  </sitemap>');
  }

  parts.push('</sitemapindex>');
  return parts.join('\n');
}

/**
 * Read a per-type setting from plugin_config JSONB.
 * Falls back to the row-level default (from the DB function).
 */
function getConfigValue(
  cfg: SitemapConfig,
  urlType: string,
  field: 'changefreq' | 'priority',
  rowDefault: string,
): string {
  const pc = cfg.plugin_config ?? {};
  if (field === 'changefreq') {
    if (urlType === 'article'  && pc.changefreq_articles)   return pc.changefreq_articles;
    if (urlType === 'category' && pc.changefreq_categories) return pc.changefreq_categories;
  }
  if (field === 'priority') {
    if (urlType === 'homepage' && pc.priority_homepage)  return pc.priority_homepage;
    if (urlType === 'article'  && pc.priority_articles)  return pc.priority_articles;
    if (urlType === 'category' && pc.priority_categories) return pc.priority_categories;
    if (urlType === 'author'   && pc.priority_authors)   return pc.priority_authors;
  }
  return rowDefault;
}

// ── XML error responses ───────────────────────────────────────────────────────

function xmlError(status: number, message: string): Response {
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<!-- ${xmlEsc(message)} -->`,
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    '</urlset>',
  ].join('\n');

  return new Response(body, {
    status,
    headers: { ...XML_HEADERS, 'Cache-Control': 'no-cache' },
  });
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== 'GET') {
    return xmlError(405, 'Method not allowed');
  }

  // ── 1. Parse query params ───────────────────────────────────────────────
  const url        = new URL(req.url);
  const tenantSlug = url.searchParams.get('tenant')?.trim() ?? '';
  const isPreview  = url.searchParams.get('preview') === 'true';
  // For sitemap index chunk requests: ?page=1&type=articles
  const pageParam  = parseInt(url.searchParams.get('page') ?? '1', 10);
  const typeParam  = url.searchParams.get('type') ?? 'all'; // 'all' | 'articles'

  if (!tenantSlug) {
    return xmlError(400, 'Missing required query parameter: tenant');
  }

  // ── 2. Create service-role Supabase client ──────────────────────────────
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[xml-sitemap] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return xmlError(500, 'Server configuration error');
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // ── 3. Load sitemap config (plugin enabled? base URL? settings?) ────────
  const { data: cfgRows, error: cfgError } = await supabase
    .rpc('get_sitemap_config', { p_tenant_slug: tenantSlug });

  if (cfgError) {
    console.error('[xml-sitemap] get_sitemap_config error:', cfgError);
    return xmlError(500, 'Database error when loading sitemap configuration');
  }

  if (!cfgRows || cfgRows.length === 0) {
    return xmlError(404, `Tenant not found: ${tenantSlug}`);
  }

  const cfg = cfgRows[0] as SitemapConfig;

  // ── 4. Check plugin is enabled ──────────────────────────────────────────
  // Preview requests (from admin UI "Regenerate" button) bypass this check
  // so admins can preview/test before enabling.
  if (!cfg.plugin_enabled && !isPreview) {
    return xmlError(404, 'XML Sitemap is not enabled for this tenant');
  }

  // ── 5. Resolve base URL ─────────────────────────────────────────────────
  // Priority: canonical_base_url (SEO Manager) → site_url_fallback (site_settings)
  const rawBase = cfg.canonical_base_url || cfg.site_url_fallback;
  if (!rawBase) {
    return xmlError(
      503,
      'Site URL is not configured. Set the Canonical URL in SEO Manager.',
    );
  }
  const baseUrl = normaliseBase(rawBase);

  // ── 6. Extract include flags from plugin_config ─────────────────────────
  const pc                = cfg.plugin_config ?? {};
  const includeArticles   = pc.include_articles   !== false; // default true
  const includeCategories = pc.include_categories !== false; // default true
  const includeAuthors    = pc.include_authors    === true;  // default false
  const maxUrls           = Math.min(Number(pc.max_urls ?? SITEMAP_URL_LIMIT), SITEMAP_URL_LIMIT);

  // ── 7. Handle chunked article requests (sitemap index sub-pages) ─────────
  // When a sitemap index was returned on a previous request and a crawler
  // follows /sitemap-articles-N.xml, the proxy rewrites it to this function
  // with ?type=articles&page=N.
  if (typeParam === 'articles') {
    const offset = (Math.max(1, pageParam) - 1) * SITEMAP_URL_LIMIT;
    const { data: rows, error } = await supabase.rpc('get_sitemap_data', {
      p_tenant_slug:        tenantSlug,
      p_include_articles:   true,
      p_include_categories: false,
      p_include_authors:    false,
      p_max_articles:       SITEMAP_URL_LIMIT,
      p_offset:             offset,
    });

    if (error) {
      console.error('[xml-sitemap] get_sitemap_data (chunk) error:', error);
      return xmlError(500, 'Database error when fetching article chunk');
    }

    const xml = renderUrlset(baseUrl, (rows ?? []) as SitemapRow[], cfg);
    return new Response(xml, { status: 200, headers: XML_HEADERS });
  }

  // ── 8. Main sitemap — fetch all data ─────────────────────────────────────
  // We call get_sitemap_data once for non-article content (homepage, cats, authors)
  // then loop in chunks for articles to avoid hitting a single large query.
  const allRows: SitemapRow[] = [];

  // Fetch homepage + categories + authors first (these are small sets)
  {
    const { data, error } = await supabase.rpc('get_sitemap_data', {
      p_tenant_slug:        tenantSlug,
      p_include_articles:   false,
      p_include_categories: includeCategories,
      p_include_authors:    includeAuthors,
      p_max_articles:       0,
      p_offset:             0,
    });

    if (error) {
      console.error('[xml-sitemap] get_sitemap_data (non-articles) error:', error);
      return xmlError(500, 'Database error when fetching sitemap data');
    }

    allRows.push(...((data ?? []) as SitemapRow[]));
  }

  // Fetch articles in chunks (avoids >50k row single query)
  if (includeArticles) {
    let offset = 0;
    let fetched = 0;

    while (true) {
      const chunkSize = Math.min(FETCH_CHUNK_SIZE, maxUrls - fetched);
      if (chunkSize <= 0) break;

      const { data, error } = await supabase.rpc('get_sitemap_data', {
        p_tenant_slug:        tenantSlug,
        p_include_articles:   true,
        p_include_categories: false,
        p_include_authors:    false,
        p_max_articles:       chunkSize,
        p_offset:             offset,
      });

      if (error) {
        console.error('[xml-sitemap] get_sitemap_data (articles chunk) error:', error);
        return xmlError(500, 'Database error when fetching article data');
      }

      const chunk = (data ?? []) as SitemapRow[];
      // Filter to only article-type rows (the function may return homepage row on first call)
      const articles = chunk.filter(r => r.url_type === 'article');
      allRows.push(...articles);
      fetched += articles.length;

      if (articles.length < chunkSize) break; // exhausted
      offset += chunkSize;
    }
  }

  const totalUrls = allRows.length;

  // ── 9. Decide: single sitemap or sitemap index ────────────────────────────
  // Only article volume can exceed the limit in practice.
  const articleRows    = allRows.filter(r => r.url_type === 'article');
  const nonArticleRows = allRows.filter(r => r.url_type !== 'article');

  if (articleRows.length > SITEMAP_URL_LIMIT) {
    // Return a sitemap index
    const chunkCount = Math.ceil(articleRows.length / SITEMAP_URL_LIMIT);
    const xml = renderSitemapIndex(baseUrl, chunkCount);

    console.log(
      `[xml-sitemap] tenant=${tenantSlug} returning sitemap index ` +
      `(${articleRows.length} articles, ${chunkCount} chunks)`,
    );

    return new Response(xml, {
      status: 200,
      headers: {
        ...XML_HEADERS,
        'X-Sitemap-Type':  'index',
        'X-Sitemap-Chunks': String(chunkCount),
      },
    });
  }

  // ── 10. Render single <urlset> ────────────────────────────────────────────
  const orderedRows = [
    ...nonArticleRows.filter(r => r.url_type === 'homepage'),
    ...nonArticleRows.filter(r => r.url_type !== 'homepage'),
    ...articleRows,
  ];

  const xml = renderUrlset(baseUrl, orderedRows, cfg);

  console.log(
    `[xml-sitemap] tenant=${tenantSlug} generated ${totalUrls} URLs ` +
    `(${articleRows.length} articles, ${nonArticleRows.length} non-articles)`,
  );

  // For preview requests, add URL count in a response header
  const extraHeaders: Record<string, string> = isPreview
    ? { 'X-Sitemap-Url-Count': String(totalUrls) }
    : {};

  return new Response(xml, {
    status: 200,
    headers: { ...XML_HEADERS, ...extraHeaders },
  });
});
