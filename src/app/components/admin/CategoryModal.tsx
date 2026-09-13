/**
 * Category Create/Edit Modal
 * Comprehensive form with all fields: name, slug, description, icon, cover, color, toggles, status, SEO
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { getCategory, createCategory, updateCategory, generateSlug } from '../../lib/categoriesApi';

interface CategoryModalProps {
  categoryId: string | null;
  onClose: () => void;
  onSave: () => void;
}

export function CategoryModal({ categoryId, onClose, onSave }: CategoryModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState<Partial<{
    name: string;
    slug: string;
    description: string;
    icon: string;
    color: string;
    cover_image_url: string;
    show_in_navbar: boolean;
    show_on_homepage: boolean;
    status: 'published' | 'draft';
    is_featured: boolean;
    sort_order: number;
    seo_title: string;
    seo_description: string;
    og_image_url: string;
    canonical_url: string;
  }>>({
    name: '',
    slug: '',
    description: '',
    icon: '',
    color: '#dc2626',
    cover_image_url: '',
    show_in_navbar: true,
    show_on_homepage: true,
    status: 'published' as const,
    is_featured: false,
    sort_order: 0,
    seo_title: '',
    seo_description: '',
    og_image_url: '',
    canonical_url: '',
  });

  const [autoSlug, setAutoSlug] = useState(true);

  // Load category if editing
  useEffect(() => {
    if (!categoryId) {
      setForm({
        name: '',
        slug: '',
        description: '',
        icon: '',
        color: '#dc2626',
        cover_image_url: '',
        show_in_navbar: true,
        show_on_homepage: true,
        status: 'published' as const,
        is_featured: false,
        sort_order: 0,
        seo_title: '',
        seo_description: '',
        og_image_url: '',
        canonical_url: '',
      });
      setAutoSlug(true);
      return;
    }

    const loadCategory = async () => {
      try {
        setLoading(true);
        const category = await getCategory(categoryId);
        setForm({
          name: category.name,
          slug: category.slug,
          description: category.description || '',
          icon: category.icon || '',
          color: category.color || '#dc2626',
          cover_image_url: category.cover_image_url || '',
          show_in_navbar: category.show_in_navbar,
          show_on_homepage: category.show_on_homepage,
          status: category.status,
          is_featured: category.is_featured,
          sort_order: category.sort_order,
          seo_title: category.seo_title || '',
          seo_description: category.seo_description || '',
          og_image_url: category.og_image_url || '',
          canonical_url: category.canonical_url || '',
        });
        setAutoSlug(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load category');
      } finally {
        setLoading(false);
      }
    };

    loadCategory();
  }, [categoryId]);

  // Update slug when name changes (if auto-slug enabled)
  useEffect(() => {
    if (autoSlug && form.name) {
      setForm(prev => ({
        ...prev,
        slug: generateSlug(form.name),
      }));
    }
  }, [form.name, autoSlug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      setError('Category name is required');
      return;
    }

    if (!form.slug.trim()) {
      setError('Slug is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      if (categoryId) {
        await updateCategory(categoryId, form);
      } else {
        await createCategory(form);
      }

      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{categoryId ? 'Edit Category' : 'Create Category'}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-gray-500">Loading...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error message */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Basic Information</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Politics"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-red-600"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Slug *</label>
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={autoSlug}
                      onChange={(e) => setAutoSlug(e.target.checked)}
                      className="rounded"
                    />
                    Auto-generate
                  </label>
                </div>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => {
                    setForm({ ...form, slug: e.target.value });
                    setAutoSlug(false);
                  }}
                  placeholder="e.g., politics"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-red-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief description of this category..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-red-600"
                />
              </div>
            </div>

            {/* Appearance */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Appearance</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Icon Emoji
                  </label>
                  <input
                    type="text"
                    value={form.icon}
                    onChange={(e) => setForm({ ...form, icon: e.target.value.slice(0, 2) })}
                    placeholder="📰"
                    maxLength={2}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-red-600 text-xl text-center"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={form.color}
                      onChange={(e) => setForm({ ...form, color: e.target.value })}
                      className="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={form.color}
                      onChange={(e) => setForm({ ...form, color: e.target.value })}
                      placeholder="#dc2626"
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-red-600 font-mono text-sm"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cover Image URL
                </label>
                <input
                  type="url"
                  value={form.cover_image_url}
                  onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })}
                  placeholder="https://example.com/cover.jpg"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-red-600"
                />
                {form.cover_image_url && (
                  <img
                    src={form.cover_image_url}
                    alt="Preview"
                    className="mt-2 max-w-xs h-32 object-cover rounded-lg"
                  />
                )}
              </div>
            </div>

            {/* Visibility */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Visibility</h3>

              <div className="grid grid-cols-3 gap-4">
                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={form.show_in_navbar}
                    onChange={(e) => setForm({ ...form, show_in_navbar: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Show in Navbar</span>
                </label>

                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={form.show_on_homepage}
                    onChange={(e) => setForm({ ...form, show_on_homepage: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Show on Homepage</span>
                </label>

                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={form.is_featured}
                    onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Featured</span>
                </label>
              </div>
            </div>

            {/* Status & Sort */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as 'published' | 'draft' })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-red-600"
                >
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort Order
                </label>
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-red-600"
                />
              </div>
            </div>

            {/* SEO */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">SEO</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SEO Title
                </label>
                <input
                  type="text"
                  value={form.seo_title}
                  onChange={(e) => setForm({ ...form, seo_title: e.target.value })}
                  placeholder="Meta title for search engines"
                  maxLength={60}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-red-600"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {form.seo_title.length}/60
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SEO Description
                </label>
                <textarea
                  value={form.seo_description}
                  onChange={(e) => setForm({ ...form, seo_description: e.target.value })}
                  placeholder="Meta description for search engines"
                  maxLength={160}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-red-600"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {form.seo_description.length}/160
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  OG Image URL
                </label>
                <input
                  type="url"
                  value={form.og_image_url}
                  onChange={(e) => setForm({ ...form, og_image_url: e.target.value })}
                  placeholder="https://example.com/og-image.jpg"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-red-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Canonical URL
                </label>
                <input
                  type="url"
                  value={form.canonical_url}
                  onChange={(e) => setForm({ ...form, canonical_url: e.target.value })}
                  placeholder="https://example.com/category/politics"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-red-600"
                />
              </div>
            </div>

            {/* Footer */}
            <DialogFooter className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg font-semibold transition"
              >
                {saving ? 'Saving...' : categoryId ? 'Update' : 'Create'}
              </button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
