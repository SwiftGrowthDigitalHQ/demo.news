/**
 * Categories Management - Production-ready Admin Component
 * Features: CRUD, search, filters, pagination, drag & drop, bulk operations, SEO
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Search, Edit2, Trash2, Copy, Eye, EyeOff, Star, GripVertical } from 'lucide-react';
import { Category, listCategories, deleteCategory, duplicateCategory, bulkDeleteCategories, bulkUpdateCategoryStatus, updateCategorySort, CategoryFilter } from '../../lib/categoriesApi';
import { CategoryModal } from './CategoryModal';

export function CategoriesManagement() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [featuredFilter, setFeaturedFilter] = useState<'all' | 'featured' | 'regular'>('all');
  
  // Pagination
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;
  
  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Drag & drop
  const [draggedId, setDraggedId] = useState<string | null>(null);

  // Load categories
  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      const filter: CategoryFilter = {
        search: search || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        featured: featuredFilter === 'featured' ? true : featuredFilter === 'regular' ? false : undefined,
      };
      const data = await listCategories(filter);
      setCategories(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, featuredFilter]);

  useEffect(() => {
    loadCategories();
  }, [search, statusFilter, featuredFilter, loadCategories]);

  // Paginate
  const paginatedCategories = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return categories.slice(start, start + itemsPerPage);
  }, [categories, page]);

  const totalPages = Math.ceil(categories.length / itemsPerPage);

  // Handlers
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this category?')) return;
    try {
      await deleteCategory(id);
      await loadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await duplicateCategory(id);
      await loadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate');
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.size} categories?`)) return;
    try {
      await bulkDeleteCategories(Array.from(selectedIds));
      setSelectedIds(new Set());
      await loadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const handleBulkPublish = async () => {
    try {
      await bulkUpdateCategoryStatus(Array.from(selectedIds), 'published');
      setSelectedIds(new Set());
      await loadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    }
  };

  const handleBulkDraft = async () => {
    try {
      await bulkUpdateCategoryStatus(Array.from(selectedIds), 'draft');
      setSelectedIds(new Set());
      await loadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    }
  };

  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (targetId: string) => {
    if (!draggedId || draggedId === targetId) return;

    const draggedIndex = paginatedCategories.findIndex(c => c.id === draggedId);
    const targetIndex = paginatedCategories.findIndex(c => c.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newOrder = [...paginatedCategories];
    [newOrder[draggedIndex], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[draggedIndex]];

    try {
      await updateCategorySort(newOrder.map((c, i) => ({ id: c.id, sort_order: i })));
      await loadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update sort order');
    } finally {
      setDraggedId(null);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(paginatedCategories.map(c => c.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectCategory = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Categories</h1>
          <p className="text-gray-600 mt-1">{categories.length} total categories</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setModalOpen(true);
          }}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition"
        >
          <Plus className="h-5 w-5" />
          New Category
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search categories..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-red-600"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as 'all' | 'published' | 'draft');
            setPage(1);
          }}
          className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-red-600"
        >
          <option value="all">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>

        <select
          value={featuredFilter}
          onChange={(e) => {
            setFeaturedFilter(e.target.value as 'all' | 'featured' | 'regular');
            setPage(1);
          }}
          className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-red-600"
        >
          <option value="all">All Categories</option>
          <option value="featured">Featured Only</option>
          <option value="regular">Regular Only</option>
        </select>

        <div className="flex gap-2">
          {selectedIds.size > 0 && (
            <>
              <button
                onClick={handleBulkPublish}
                className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition"
              >
                Publish
              </button>
              <button
                onClick={handleBulkDraft}
                className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition"
              >
                Draft
              </button>
              <button
                onClick={handleBulkDelete}
                className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedIds.size === paginatedCategories.length && paginatedCategories.length > 0}
                  onChange={handleSelectAll}
                  className="rounded"
                />
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Slug</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Articles</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Navbar</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Homepage</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Featured</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Sort</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Updated</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={11} className="px-6 py-8 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : paginatedCategories.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-6 py-8 text-center text-gray-500">
                  No categories found
                </td>
              </tr>
            ) : (
              paginatedCategories.map((category) => (
                <tr
                  key={category.id}
                  draggable
                  onDragStart={() => handleDragStart(category.id)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(category.id)}
                  className="border-b border-gray-200 hover:bg-gray-50 transition"
                >
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(category.id)}
                      onChange={(e) => handleSelectCategory(category.id, e.target.checked)}
                      className="rounded"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {category.icon && <span className="text-2xl">{category.icon}</span>}
                      <div>
                        <div className="font-semibold text-gray-900">{category.name}</div>
                        {category.description && (
                          <div className="text-sm text-gray-600 truncate max-w-xs">{category.description}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{category.slug}</td>
                  <td className="px-6 py-4">
                    <span className="inline-block bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-semibold">
                      {category.article_count}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                        category.status === 'published'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {category.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {category.show_in_navbar ? (
                      <Eye className="h-5 w-5 text-green-600" />
                    ) : (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {category.show_on_homepage ? (
                      <Eye className="h-5 w-5 text-green-600" />
                    ) : (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {category.is_featured && <Star className="h-5 w-5 text-yellow-500" fill="currentColor" />}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 cursor-grab active:cursor-grabbing">
                      <GripVertical className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{category.sort_order}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(category.updated_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingId(category.id);
                          setModalOpen(true);
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg transition"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4 text-blue-600" />
                      </button>
                      <button
                        onClick={() => handleDuplicate(category.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition"
                        title="Duplicate"
                      >
                        <Copy className="h-4 w-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => handleDelete(category.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <CategoryModal
          categoryId={editingId}
          onClose={() => {
            setModalOpen(false);
            setEditingId(null);
          }}
          onSave={() => {
            loadCategories();
            setModalOpen(false);
            setEditingId(null);
          }}
        />
      )}
    </div>
  );
}
