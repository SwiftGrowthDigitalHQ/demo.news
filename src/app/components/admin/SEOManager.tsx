/**
 * SEO Manager Plugin - Admin UI
 * 
 * Professional configuration interface for managing tenant-level SEO defaults.
 * Includes General SEO, Robots, Social Media, and Preview sections.
 */

import { useState, useEffect } from 'react';
import { Save, Loader2, AlertCircle, CheckCircle2, Globe, Search, Share2, Eye, Info } from 'lucide-react';
import { getTenantSEODefaults, upsertTenantSEODefaults, validateSEOConfig, type TenantSEODefaults } from '../../lib/admin';
import { useTenant } from '../../lib/useTenant';
import { useAuth } from '../../lib/auth';

export function SEOManager() {
  const { tenant } = useTenant();
  const auth = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  
  const [config, setConfig] = useState<Partial<TenantSEODefaults>>({
    site_title: '',
    site_description: '',
    site_keywords: '',
    canonical_base_url: '',
    default_author: '',
    default_language: 'en',
    default_locale: 'en_US',
    default_image_url: '',
    robots_index: true,
    robots_follow: true,
    robots_archive: true,
    robots_snippet: true,
    robots_max_image_preview: 'large',
    robots_max_snippet: -1,
    category_indexing: true,
    tag_indexing: true,
    author_indexing: true,
    og_site_name: '',
    og_type: 'website',
    og_title: '',
    og_description: '',
    og_image: '',
    og_image_width: 1200,
    og_image_height: 630,
    twitter_card: 'summary_large_image',
    twitter_site: '',
    twitter_creator: '',
    twitter_title: '',
    twitter_description: '',
    twitter_image: '',
    show_publication_schema: true,
    show_breadcrumb_schema: true,
    show_article_schema: true,
  });
  
  // Wait for auth.ready before loading — avoids "Authentication required"
  // error when component mounts before session is established.
  useEffect(() => {
    if (!auth.ready) return;
    if (!auth.profile?.owned_tenant_id) {
      // Auth settled but no tenant — nothing to load
      setLoading(false);
      return;
    }
    void loadConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.ready, auth.profile?.owned_tenant_id]);
  
  async function loadConfig() {
    setLoading(true);
    try {
      const data = await getTenantSEODefaults();
      if (data) {
        setConfig(data);
      }
    } catch (error) {
      console.error('[SEO Manager] Failed to load:', error);
      setErrors(['Failed to load SEO configuration. Please refresh the page.']);
    } finally {
      setLoading(false);
    }
  }
  
  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setErrors([]);
    setWarnings([]);
    
    try {
      // Validate before saving
      const validation = validateSEOConfig(config);
      
      if (validation.errors.length > 0) {
        setErrors(validation.errors);
        setSaving(false);
        return;
      }
      
      if (validation.warnings.length > 0) {
        setWarnings(validation.warnings);
      }
      
      await upsertTenantSEODefaults(config);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('[SEO Manager] Failed to save:', error);
      setErrors([error instanceof Error ? error.message : 'Failed to save SEO configuration']);
    } finally {
      setSaving(false);
    }
  }
  
  function updateConfig(updates: Partial<TenantSEODefaults>) {
    setConfig(prev => ({ ...prev, ...updates }));
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-red-600 mx-auto mb-3" />
          <p className="text-sm text-gray-600">
            {!auth.ready ? 'Authenticating...' : 'Loading SEO configuration...'}
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Search className="h-6 w-6 text-red-600" />
                SEO Manager
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Configure search engine optimization and social media metadata for {tenant?.name || 'your site'}
              </p>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : saved ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Saved!
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
          
          {/* Errors */}
          {errors.length > 0 && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-900">Please fix the following errors:</p>
                  <ul className="mt-1 text-sm text-red-700 list-disc list-inside">
                    {errors.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
          
          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Info className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-900">Recommendations:</p>
                  <ul className="mt-1 text-sm text-yellow-700 list-disc list-inside">
                    {warnings.map((warning, idx) => (
                      <li key={idx}>{warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        
        {/* ═══ GENERAL SEO ═══ */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="h-5 w-5 text-red-600" />
            <h2 className="text-lg font-bold text-gray-900">General SEO</h2>
          </div>
          
          <div className="space-y-4">
            {/* Site Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Site Title *
              </label>
              <input
                type="text"
                value={config.site_title || ''}
                onChange={(e) => updateConfig({ site_title: e.target.value })}
                placeholder="Your News Site - Latest News & Updates"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                {config.site_title?.length || 0} characters (recommended: 30-60)
              </p>
            </div>
            
            {/* Site Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Meta Description *
              </label>
              <textarea
                value={config.site_description || ''}
                onChange={(e) => updateConfig({ site_description: e.target.value })}
                placeholder="Your trusted source for breaking news, in-depth analysis, and the latest updates from around the world."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                {config.site_description?.length || 0} characters (recommended: 120-160)
              </p>
            </div>
            
            {/* Keywords */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Keywords (optional)
              </label>
              <input
                type="text"
                value={config.site_keywords || ''}
                onChange={(e) => updateConfig({ site_keywords: e.target.value })}
                placeholder="news, breaking news, updates, latest news"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Comma-separated keywords (mostly ignored by modern search engines)
              </p>
            </div>
            
            {/* Canonical Base URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Canonical Base URL *
              </label>
              <input
                type="url"
                value={config.canonical_base_url || ''}
                onChange={(e) => updateConfig({ canonical_base_url: e.target.value })}
                placeholder="https://example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Your site's primary domain (without trailing slash)
              </p>
            </div>
            
            {/* Default Image */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default SEO Image
              </label>
              <input
                type="url"
                value={config.default_image_url || ''}
                onChange={(e) => updateConfig({ default_image_url: e.target.value })}
                placeholder="https://example.com/default-share-image.jpg"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Fallback image for pages without specific images (1200×630 recommended)
              </p>
            </div>
          </div>
        </div>
        
        {/* ═══ ROBOTS & INDEXING ═══ */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Search className="h-5 w-5 text-red-600" />
            <h2 className="text-lg font-bold text-gray-900">Search Engine Indexing</h2>
          </div>
          
          <div className="space-y-4">
            {/* Basic Robots */}
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.robots_index}
                  onChange={(e) => updateConfig({ robots_index: e.target.checked })}
                  className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                />
                <span className="text-sm font-medium text-gray-700">Allow Indexing</span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.robots_follow}
                  onChange={(e) => updateConfig({ robots_follow: e.target.checked })}
                  className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                />
                <span className="text-sm font-medium text-gray-700">Follow Links</span>
              </label>
            </div>
            
            {/* Category/Tag Indexing */}
            <div className="border-t border-gray-200 pt-4">
              <p className="text-sm font-medium text-gray-700 mb-3">Content Type Indexing</p>
              <div className="grid grid-cols-3 gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.category_indexing}
                    onChange={(e) => updateConfig({ category_indexing: e.target.checked })}
                    className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                  />
                  <span className="text-sm text-gray-700">Categories</span>
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.tag_indexing}
                    onChange={(e) => updateConfig({ tag_indexing: e.target.checked })}
                    className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                  />
                  <span className="text-sm text-gray-700">Tags</span>
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.author_indexing}
                    onChange={(e) => updateConfig({ author_indexing: e.target.checked })}
                    className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                  />
                  <span className="text-sm text-gray-700">Authors</span>
                </label>
              </div>
            </div>
          </div>
        </div>
        
        {/* ═══ SOCIAL MEDIA ═══ */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Share2 className="h-5 w-5 text-red-600" />
            <h2 className="text-lg font-bold text-gray-900">Social Media Metadata</h2>
          </div>
          
          <div className="space-y-6">
            {/* Open Graph */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Open Graph (Facebook, WhatsApp, LinkedIn)</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">OG Title</label>
                  <input
                    type="text"
                    value={config.og_title || ''}
                    onChange={(e) => updateConfig({ og_title: e.target.value })}
                    placeholder="Leave empty to use site title"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-700 mb-1">OG Description</label>
                  <textarea
                    value={config.og_description || ''}
                    onChange={(e) => updateConfig({ og_description: e.target.value })}
                    placeholder="Leave empty to use site description"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-700 mb-1">OG Image URL</label>
                  <input
                    type="url"
                    value={config.og_image || ''}
                    onChange={(e) => updateConfig({ og_image: e.target.value })}
                    placeholder="https://example.com/og-image.jpg"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>
            </div>
            
            {/* Twitter/X */}
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Twitter/X Card</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Twitter Site Handle</label>
                  <input
                    type="text"
                    value={config.twitter_site || ''}
                    onChange={(e) => updateConfig({ twitter_site: e.target.value })}
                    placeholder="@YourSite"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Twitter Creator Handle</label>
                  <input
                    type="text"
                    value={config.twitter_creator || ''}
                    onChange={(e) => updateConfig({ twitter_creator: e.target.value })}
                    placeholder="@YourName"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Twitter Image URL</label>
                  <input
                    type="url"
                    value={config.twitter_image || ''}
                    onChange={(e) => updateConfig({ twitter_image: e.target.value })}
                    placeholder="https://example.com/twitter-image.jpg"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* ═══ PREVIEW ═══ */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Eye className="h-5 w-5 text-red-600" />
            <h2 className="text-lg font-bold text-gray-900">Search Result Preview</h2>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-blue-600 text-lg hover:underline cursor-pointer">
              {config.site_title || 'Your Site Title'}
            </div>
            <div className="text-green-700 text-sm mt-1">
              {config.canonical_base_url || 'https://example.com'}
            </div>
            <div className="text-gray-600 text-sm mt-1">
              {config.site_description || 'Your site description will appear here in search results.'}
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
