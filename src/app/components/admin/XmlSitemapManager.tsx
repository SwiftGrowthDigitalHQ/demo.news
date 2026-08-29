/**
 * XML Sitemap Plugin — Admin Configuration UI
 *
 * Professional configuration interface for managing the tenant XML sitemap.
 * All values are read from and written to Supabase (tenant_plugins.configuration).
 * URL counts come from the get_sitemap_url_count() database function.
 *
 * Sections:
 *   1. General  — enable toggle, sitemap URL, status
 *   2. Content  — include articles / categories / authors
 *   3. Settings — change frequency, priority
 *   4. Preview  — URL count, last generated, copy/open buttons
 *   5. Generate — regenerate button
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Save, Loader2, AlertCircle, CheckCircle2, Info, RefreshCw,
  Copy, ExternalLink, Globe, FileText, Tag, Users,
  BarChart2, Clock, ToggleLeft, ToggleRight,
} from 'lucide-react';
import {
  getXmlSitemapState,
  saveXmlSitemapConfig,
  getSitemapUrlCount,
  recordSitemapGenerated,
  DEFAULT_SITEMAP_CONFIG,
  type XmlSitemapConfig,
} from '../../lib/admin';
import { useTenant } from '../../lib/useTenant';
import { useAuth } from '../../lib/auth';
import { getSupabaseClient } from '../../../lib/supabase';

// ── Types ────────────────────────────────────────────────────────────────────

type Changefreq =
  | 'always' | 'hourly' | 'daily'
  | 'weekly' | 'monthly' | 'yearly' | 'never';

// ── Constants ────────────────────────────────────────────────────────────────

const CHANGEFREQ_OPTIONS: Changefreq[] = [
  'always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never',
];

const PRIORITY_OPTIONS = ['1.0', '0.9', '0.8', '0.7', '0.6', '0.5', '0.4', '0.3', '0.2', '0.1'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return 'Never';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ── Main Component ────────────────────────────────────────────────────────────

export function XmlSitemapManager() {
  const auth = useAuth();
  const { tenant } = useTenant();

  // ── page state ─────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  // ── form state ─────────────────────────────────────────────────────────────
  const [enabled, setEnabled] = useState(false);
  const [config, setConfig] = useState<XmlSitemapConfig>({ ...DEFAULT_SITEMAP_CONFIG });

  // ── url counts (from DB) ───────────────────────────────────────────────────
  const [counts, setCounts] = useState({ articles: 0, categories: 0, authors: 0 });
  const [countsLoaded, setCountsLoaded] = useState(false);

  // ── resolved canonical base URL (from SEO Manager or site_settings) ────────
  const [baseUrl, setBaseUrl] = useState<string>('');
  const [baseUrlSource, setBaseUrlSource] = useState<'seo_manager' | 'site_settings' | 'none'>('none');

  // ─────────────────────────────────────────────────────────────────────────
  // Load on mount — wait for auth.ready
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!auth.ready) return;
    if (!auth.profile?.owned_tenant_id) {
      setLoading(false);
      return;
    }
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.ready, auth.profile?.owned_tenant_id]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setErrors([]);
    try {
      await Promise.all([loadPluginState(), loadBaseUrl(), loadCounts()]);
    } finally {
      setLoading(false);
    }
  }, []);

  async function loadPluginState() {
    const { enabled: en, config: cfg } = await getXmlSitemapState();
    setEnabled(en);
    setConfig(cfg);
  }

  async function loadBaseUrl() {
    const supabase = getSupabaseClient();
    if (!supabase || !auth.profile?.owned_tenant_id) return;

    // Priority 1: tenant_seo_defaults.canonical_base_url (SEO Manager)
    const { data: seoRow } = await supabase
      .from('tenant_seo_defaults')
      .select('canonical_base_url')
      .eq('tenant_id', auth.profile.owned_tenant_id)
      .maybeSingle();

    if (seoRow?.canonical_base_url) {
      setBaseUrl(seoRow.canonical_base_url.replace(/\/$/, ''));
      setBaseUrlSource('seo_manager');
      return;
    }

    // Priority 2: site_settings.theme_config->>'site_url'
    const { data: ssRow } = await supabase
      .from('site_settings')
      .select('theme_config')
      .eq('tenant_id', auth.profile.owned_tenant_id)
      .is('deleted_at', null)
      .maybeSingle();

    const siteUrl = (ssRow?.theme_config as Record<string, string> | null)?.site_url;
    if (siteUrl) {
      setBaseUrl(siteUrl.replace(/\/$/, ''));
      setBaseUrlSource('site_settings');
      return;
    }

    setBaseUrlSource('none');
  }

  async function loadCounts() {
    if (!auth.profile?.owned_tenant_id) return;
    try {
      const { article_count, category_count, author_count } =
        await getSitemapUrlCount(auth.profile.owned_tenant_id);
      setCounts({ articles: article_count, categories: category_count, authors: author_count });
      setCountsLoaded(true);
    } catch {
      // Counts are best-effort — don't block UI
      setCountsLoaded(true);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Computed values
  // ─────────────────────────────────────────────────────────────────────────
  const sitemapUrl = baseUrl ? `${baseUrl}/sitemap.xml` : '/sitemap.xml';

  const totalUrlCount =
    1 + // homepage
    (config.include_articles ? counts.articles : 0) +
    (config.include_categories ? counts.categories : 0) +
    (config.include_authors ? counts.authors : 0);

  // ─────────────────────────────────────────────────────────────────────────
  // Validation
  // ─────────────────────────────────────────────────────────────────────────
  function validate(): { errors: string[]; warnings: string[] } {
    const errs: string[] = [];
    const warns: string[] = [];

    if (enabled && baseUrlSource === 'none') {
      warns.push(
        'Site URL is not configured. Sitemap <loc> entries will use relative paths. ' +
        'Set the Canonical URL in SEO Manager first.',
      );
    }

    if (enabled && baseUrl.startsWith('http://localhost')) {
      warns.push('Canonical URL is localhost. Production sitemap should use a real domain.');
    }

    if (config.max_urls < 1 || config.max_urls > 50000) {
      errs.push('Max URLs must be between 1 and 50,000.');
    }

    const priorities = [
      config.priority_homepage, config.priority_articles,
      config.priority_categories, config.priority_authors,
    ];
    for (const p of priorities) {
      const n = parseFloat(p);
      if (isNaN(n) || n < 0 || n > 1) {
        errs.push('Priority values must be between 0.0 and 1.0.');
        break;
      }
    }

    return { errors: errs, warnings: warns };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Save
  // ─────────────────────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setErrors([]);
    setWarnings([]);

    const { errors: errs, warnings: warns } = validate();
    if (errs.length > 0) {
      setErrors(errs);
      setSaving(false);
      return;
    }
    setWarnings(warns);

    try {
      await saveXmlSitemapConfig(enabled, config);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setErrors([err instanceof Error ? err.message : 'Failed to save configuration']);
    } finally {
      setSaving(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Generate / Regenerate sitemap
  // Calls the Edge Function directly and records the result
  // ─────────────────────────────────────────────────────────────────────────
  async function handleGenerate() {
    if (!tenant?.slug) {
      setErrors(['Cannot generate: tenant information not available.']);
      return;
    }
    if (baseUrlSource === 'none') {
      setErrors(['Cannot generate: no site URL configured. Set canonical URL in SEO Manager.']);
      return;
    }

    setGenerating(true);
    setErrors([]);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const fnUrl = `${supabaseUrl}/functions/v1/xml-sitemap?tenant=${encodeURIComponent(tenant.slug)}&preview=true`;

      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase!.auth.getSession();

      const res = await fetch(fnUrl, {
        headers: {
          'Authorization': `Bearer ${session?.access_token ?? ''}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
        },
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Generation failed (${res.status}): ${body}`);
      }

      // Parse URL count from the XML
      const xml = await res.text();
      const urlMatches = xml.match(/<url>/g);
      const count = urlMatches ? urlMatches.length : 0;

      await recordSitemapGenerated(count);

      // Refresh config to show updated last_generated_at / url_count
      await loadPluginState();
      await loadCounts();

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setErrors([
        err instanceof Error ? err.message : 'Failed to generate sitemap',
        'Ensure the xml-sitemap Edge Function is deployed.',
      ]);
    } finally {
      setGenerating(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Copy sitemap URL
  // ─────────────────────────────────────────────────────────────────────────
  async function handleCopyUrl() {
    try {
      await navigator.clipboard.writeText(sitemapUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the text
    }
  }

  function update(partial: Partial<XmlSitemapConfig>) {
    setConfig(prev => ({ ...prev, ...partial }));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: loading state
  // ─────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-red-600 mx-auto mb-3" />
          <p className="text-sm text-gray-600">
            {!auth.ready ? 'Authenticating…' : 'Loading XML Sitemap configuration…'}
          </p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: main UI
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Sticky Header ─────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Globe className="h-6 w-6 text-red-600" />
                XML Sitemap
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Generate and manage the XML sitemap for{' '}
                <span className="font-medium text-gray-700">{tenant?.name ?? 'your site'}</span>
              </p>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
            >
              {saving ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Saving…</>
              ) : saved ? (
                <><CheckCircle2 className="h-4 w-4" />Saved!</>
              ) : (
                <><Save className="h-4 w-4" />Save Changes</>
              )}
            </button>
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                <ul className="text-sm text-red-700 list-disc list-inside space-y-0.5">
                  {errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                <ul className="text-sm text-yellow-700 list-disc list-inside space-y-0.5">
                  {warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* ── 1. General ─────────────────────────────────────────────────── */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Globe className="h-4 w-4 text-red-600" />
            General
          </h2>

          {/* Enable toggle */}
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-800">Enable XML Sitemap</p>
              <p className="text-xs text-gray-500 mt-0.5">
                When enabled, <code className="bg-gray-100 px-1 rounded">/sitemap.xml</code> returns
                dynamic XML for search engines.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEnabled(prev => !prev)}
              aria-pressed={enabled}
              className="flex-shrink-0"
            >
              {enabled
                ? <ToggleRight className="h-8 w-8 text-green-600" />
                : <ToggleLeft className="h-8 w-8 text-gray-400" />}
            </button>
          </div>

          {/* Sitemap URL */}
          <div className="mt-4">
            <p className="text-xs font-medium text-gray-600 mb-1">Sitemap URL</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-700 truncate">
                {sitemapUrl}
              </code>
              <button
                type="button"
                onClick={handleCopyUrl}
                title="Copy URL"
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-gray-600"
              >
                {copied
                  ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                  : <Copy className="h-4 w-4" />}
              </button>
              {baseUrl && (
                <a
                  href={sitemapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open sitemap"
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-gray-600"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>

            {/* Base URL source indicator */}
            {baseUrlSource === 'none' ? (
              <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                No site URL configured. Set Canonical URL in SEO Manager to generate absolute URLs.
              </p>
            ) : (
              <p className="text-xs text-green-700 mt-1.5 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Base URL from{' '}
                {baseUrlSource === 'seo_manager' ? 'SEO Manager' : 'Site Settings'}
                {': '}
                <span className="font-mono">{baseUrl}</span>
              </p>
            )}
          </div>
        </section>

        {/* ── 2. Content Inclusion ────────────────────────────────────────── */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="h-4 w-4 text-red-600" />
            Content
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            Choose which content types to include in the sitemap.
          </p>

          <div className="space-y-3">
            {[
              {
                key: 'include_articles' as const,
                icon: <FileText className="h-4 w-4" />,
                label: 'Articles',
                desc: 'Published articles',
                count: countsLoaded ? counts.articles : null,
              },
              {
                key: 'include_categories' as const,
                icon: <Tag className="h-4 w-4" />,
                label: 'Categories',
                desc: 'Active categories',
                count: countsLoaded ? counts.categories : null,
              },
              {
                key: 'include_authors' as const,
                icon: <Users className="h-4 w-4" />,
                label: 'Authors',
                desc: 'Active reporter profiles',
                count: countsLoaded ? counts.authors : null,
              },
            ].map(({ key, icon, label, desc, count }) => (
              <label
                key={key}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-gray-200 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-gray-500">{icon}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{label}</p>
                    <p className="text-xs text-gray-500">{desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {count !== null && (
                    <span className="text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded px-2 py-0.5">
                      {count.toLocaleString()} URLs
                    </span>
                  )}
                  <input
                    type="checkbox"
                    checked={config[key]}
                    onChange={e => update({ [key]: e.target.checked })}
                    className="h-4 w-4 text-red-600 rounded focus:ring-red-500"
                  />
                </div>
              </label>
            ))}
          </div>
        </section>

        {/* ── 3. SEO Settings ─────────────────────────────────────────────── */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-red-600" />
            SEO Settings
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Change frequency */}
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                Change Frequency
              </p>
              <div className="space-y-2">
                {[
                  { label: 'Articles', key: 'changefreq_articles' as const },
                  { label: 'Categories', key: 'changefreq_categories' as const },
                ].map(({ label, key }) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 w-24 flex-shrink-0">{label}</span>
                    <select
                      value={config[key]}
                      onChange={e => update({ [key]: e.target.value as Changefreq })}
                      className="flex-1 text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    >
                      {CHANGEFREQ_OPTIONS.map(f => (
                        <option key={f} value={f}>
                          {f.charAt(0).toUpperCase() + f.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Priority */}
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                Priority
              </p>
              <div className="space-y-2">
                {[
                  { label: 'Homepage', key: 'priority_homepage' as const },
                  { label: 'Articles', key: 'priority_articles' as const },
                  { label: 'Categories', key: 'priority_categories' as const },
                  { label: 'Authors', key: 'priority_authors' as const },
                ].map(({ label, key }) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 w-24 flex-shrink-0">{label}</span>
                    <select
                      value={config[key]}
                      onChange={e => update({ [key]: e.target.value })}
                      className="flex-1 text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    >
                      {PRIORITY_OPTIONS.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Max URLs */}
          <div className="mt-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Max URLs per Sitemap
            </label>
            <input
              type="number"
              min={1}
              max={50000}
              value={config.max_urls}
              onChange={e => update({ max_urls: Math.max(1, Math.min(50000, parseInt(e.target.value) || 50000)) })}
              className="w-40 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              The XML sitemap protocol supports up to 50,000 URLs per file. Larger sites will get a sitemap index automatically.
            </p>
          </div>
        </section>

        {/* ── 4. Status & Preview ─────────────────────────────────────────── */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-red-600" />
            Status &amp; Preview
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              {
                label: 'Total URLs',
                value: countsLoaded ? totalUrlCount.toLocaleString() : '…',
                sub: 'with current settings',
              },
              {
                label: 'Articles',
                value: countsLoaded ? counts.articles.toLocaleString() : '…',
                sub: 'published',
              },
              {
                label: 'Categories',
                value: countsLoaded ? counts.categories.toLocaleString() : '…',
                sub: 'active',
              },
              {
                label: 'Last Generated',
                value: config.last_generated_at ? formatDate(config.last_generated_at) : '—',
                sub: config.last_generated_at ? `${config.url_count ?? 0} URLs` : 'not generated yet',
              },
            ].map(({ label, value, sub }) => (
              <div key={label} className="rounded-lg bg-gray-50 border border-gray-100 p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className="text-lg font-bold text-gray-900 leading-tight">{value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
              </div>
            ))}
          </div>

          {/* XML preview */}
          <div>
            <p className="text-xs font-medium text-gray-600 mb-2">XML Preview (first 3 entries)</p>
            <pre className="text-xs bg-gray-900 text-green-400 rounded-lg p-4 overflow-x-auto leading-relaxed">
              {[
                '<?xml version="1.0" encoding="UTF-8"?>',
                '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
                '  <url>',
                `    <loc>${escapeXml(baseUrl || 'https://yoursite.com')}/</loc>`,
                `    <changefreq>daily</changefreq>`,
                `    <priority>${config.priority_homepage}</priority>`,
                '  </url>',
                '  <url>',
                `    <loc>${escapeXml(baseUrl || 'https://yoursite.com')}/article/example-article</loc>`,
                `    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>`,
                `    <changefreq>${config.changefreq_articles}</changefreq>`,
                `    <priority>${config.priority_articles}</priority>`,
                '  </url>',
                '  <!-- ... -->',
                '</urlset>',
              ].join('\n')}
            </pre>
          </div>
        </section>

        {/* ── 5. Generate ─────────────────────────────────────────────────── */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1 flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-red-600" />
            Generate Sitemap
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Trigger an on-demand generation. The sitemap is also generated automatically when
            visitors access <code className="bg-gray-100 px-1 rounded">/sitemap.xml</code>.
          </p>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating || !enabled || baseUrlSource === 'none'}
              className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium text-sm"
            >
              {generating
                ? <><Loader2 className="h-4 w-4 animate-spin" />Generating…</>
                : <><RefreshCw className="h-4 w-4" />Regenerate Now</>}
            </button>

            {!enabled && (
              <span className="text-xs text-amber-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Enable the plugin first to generate the sitemap.
              </span>
            )}
            {enabled && baseUrlSource === 'none' && (
              <span className="text-xs text-amber-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Configure a site URL in SEO Manager before generating.
              </span>
            )}
          </div>

          {config.last_generated_at && (
            <p className="text-xs text-gray-500 mt-3">
              Last generated: {formatDate(config.last_generated_at)} •{' '}
              {config.url_count?.toLocaleString() ?? 0} URLs
            </p>
          )}
        </section>

      </div>
    </div>
  );
}
