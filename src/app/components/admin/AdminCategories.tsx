import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Search, Tag, Trash2, Edit2 } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { MobilePagination, useMobilePagination } from '../ui/mobile-table';
import { deleteAdminCategory, listAdminCategories, markAuditLog, upsertAdminCategory } from '../../lib/admin';
import { useIsMobile } from '../ui/use-mobile';

type CategoryForm = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  sort_order: string;
  seo_title: string;
  seo_description: string;
  is_featured: boolean;
};

const emptyForm: CategoryForm = {
  name: '',
  slug: '',
  description: '',
  sort_order: '0',
  seo_title: '',
  seo_description: '',
  is_featured: false,
};

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function CategoryCard({ category, onEdit, onDelete }: { 
  category: { id: string; name: string; slug: string; description: string | null; sort_order: number; is_featured: boolean; updated_at: string };
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4" style={{ borderColor: 'rgba(15,23,42,0.08)' }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-red-600" />
            <span className="font-medium text-gray-900 truncate">{category.name}</span>
          </div>
          <div className="text-sm text-gray-500 mt-1 truncate">{category.slug}</div>
          {category.description && (
            <div className="text-xs text-gray-400 mt-1 line-clamp-2">{category.description}</div>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-gray-500">Sort: {category.sort_order}</span>
            <Badge variant={category.is_featured ? 'default' : 'secondary'} className={category.is_featured ? 'bg-red-50 text-red-600' : ''}>
              {category.is_featured ? 'Featured' : 'Standard'}
            </Badge>
            <span className="text-xs text-gray-500">{new Date(category.updated_at).toLocaleDateString('en-IN')}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Edit category">
            <Edit2 size={16} style={{ color: '#7c3aed' }} />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Delete category">
            <Trash2 size={16} style={{ color: '#dc2626' }} />
          </Button>
        </div>
      </div>
    </div>
  );
}

function CategoryTableRow({ category, onEdit, onDelete }: { 
  category: { id: string; name: string; slug: string; description: string | null; sort_order: number; is_featured: boolean; updated_at: string };
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <tr style={{ borderTop: '1px solid rgba(15,23,42,0.05)' }}>
      <td style={{ padding: '12px 16px' }}>
        <div className="flex items-center gap-2 font-medium text-gray-900">
          <Tag className="h-4 w-4 text-red-600" />
          {category.name}
        </div>
      </td>
      <td style={{ padding: '12px 16px', color: '#64748b' }}>{category.slug}</td>
      <td style={{ padding: '12px 16px' }}>{category.sort_order}</td>
      <td style={{ padding: '12px 16px' }}>
        <Badge variant={category.is_featured ? 'default' : 'secondary'} className={category.is_featured ? 'bg-red-50 text-red-600' : ''}>
          {category.is_featured ? 'Featured' : 'Standard'}
        </Badge>
      </td>
      <td style={{ padding: '12px 16px', color: '#64748b' }}>{new Date(category.updated_at).toLocaleDateString('en-IN')}</td>
      <td style={{ padding: '12px 16px' }}>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Edit category">
            <Edit2 size={15} style={{ color: '#7c3aed' }} />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Delete category">
            <Trash2 size={15} style={{ color: '#dc2626' }} />
          </Button>
        </div>
      </td>
    </tr>
  );
}

export function AdminCategories() {
  const isMobile = useIsMobile();
  const [items, setItems] = useState<{ id: string; name: string; slug: string; description: string | null; sort_order: number; is_featured: boolean; updated_at: string }[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const { page, perPage, setPage, setPerPage, reset, paginate } = useMobilePagination(10);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await listAdminCategories());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load categories.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(
    () => items.filter(item => item.name.toLowerCase().includes(search.toLowerCase()) || item.slug.toLowerCase().includes(search.toLowerCase())),
    [items, search],
  );

  useEffect(() => { reset(); }, [search]);

  const stats = useMemo(() => [
    { label: 'Total Categories', value: String(items.length) },
    { label: 'Published', value: String(items.filter(item => item.sort_order >= 0).length) },
    { label: 'Featured', value: String(items.filter(item => item.is_featured).length) },
    { label: 'Unused', value: String(Math.max(0, 2 - items.length)) },
  ], [items]);

  const edit = (item?: (typeof items)[number]) => {
    setForm(item ? {
      id: item.id,
      name: item.name,
      slug: item.slug,
      description: item.description ?? '',
      sort_order: String(item.sort_order ?? 0),
      seo_title: '',
      seo_description: '',
      is_featured: item.is_featured,
    } : emptyForm);
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.slug.trim()) {
      toast.error('Category name and slug are required.');
      return;
    }

    setSaving(true);
    try {
      const saved = await upsertAdminCategory({
        id: form.id,
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description.trim() || null,
        sort_order: Number(form.sort_order || 0),
        seo_title: form.seo_title.trim() || null,
        seo_description: form.seo_description.trim() || null,
        is_featured: form.is_featured,
      });

      await markAuditLog({
        action: form.id ? 'category.updated' : 'category.created',
        entity_type: 'categories',
        entity_id: (saved as { id?: string }).id ?? form.id ?? null,
        metadata: { name: form.name },
      });

      toast.success(form.id ? 'Category updated.' : 'Category created.');
      setOpen(false);
      await load();
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : 'Failed to save category.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item: { id: string; name: string }) => {
    if (!confirm(`Delete category "${item.name}"?`)) return;
    try {
      await deleteAdminCategory(item.id);
      await markAuditLog({
        action: 'category.deleted',
        entity_type: 'categories',
        entity_id: item.id,
        metadata: { name: item.name },
      });
      toast.success('Category deleted.');
      await load();
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : 'Failed to delete category.');
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="grid gap-3 sm:gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="h-8 w-20 animate-pulse rounded bg-slate-100" />
                <div className="mt-2 h-4 w-28 animate-pulse rounded bg-slate-100" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 mt-4">
          Loading categories...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      </div>
    );
  }

  const paginatedCategories = paginate(filtered);

  return (
    <div className="flex flex-col gap-4 sm:gap-6 p-4 sm:p-6">
      {/* Stats Cards */}
      <div className="grid gap-3 sm:gap-4" style={{ gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)' }}>
        {stats.map(item => (
          <Card key={item.label}>
            <CardContent className="pt-4 sm:pt-6">
              <div className="text-xl sm:text-2xl font-bold text-gray-900">{item.value}</div>
              <div className="text-xs sm:text-sm text-gray-500 mt-1">{item.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white" style={{ borderColor: 'rgba(15,23,42,0.08)' }}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 border-b" style={{ borderColor: 'rgba(15,23,42,0.06)' }}>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search categories..." className="pl-10 h-10 sm:h-9" />
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-red-600 hover:bg-red-700 w-full sm:w-auto" onClick={() => edit()} style={{ minHeight: 44 }}>
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">New Category</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{form.id ? 'Edit Category' : 'Create Category'}</DialogTitle>
                <DialogDescription>Save the category record directly to Supabase.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <Input value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value, slug: current.slug || slugify(event.target.value) }))} placeholder="Category name" className="h-10" />
                <Input value={form.slug} onChange={event => setForm(current => ({ ...current, slug: event.target.value }))} placeholder="Slug" className="h-10" />
                <Textarea value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} placeholder="Category description" className="min-h-28" />
                <Input value={form.sort_order} onChange={event => setForm(current => ({ ...current, sort_order: event.target.value }))} placeholder="Sort order" className="h-10" />
                <Input value={form.seo_title} onChange={event => setForm(current => ({ ...current, seo_title: event.target.value }))} placeholder="SEO title" className="h-10" />
                <Input value={form.seo_description} onChange={event => setForm(current => ({ ...current, seo_description: event.target.value }))} placeholder="SEO description" className="h-10" />
                <button
                  onClick={() => setForm(current => ({ ...current, is_featured: !current.is_featured }))}
                  className="rounded-xl border px-4 py-3 text-left"
                  style={{ background: form.is_featured ? '#fef2f2' : '#fff', minHeight: 48 }}
                >
                  <div className="text-sm font-medium text-gray-900">Featured category</div>
                  <div className="text-xs text-gray-500">Mark this category as featured in the homepage and navigation.</div>
                </button>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button className="bg-red-600 hover:bg-red-700" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Category'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Category List */}
        {isMobile ? (
          <div className="p-4 space-y-3">
            {filtered.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No categories found.</div>
            ) : (
              <>
                {paginatedCategories.map(category => (
                  <CategoryCard
                    key={category.id}
                    category={category}
                    onEdit={() => edit(category)}
                    onDelete={() => remove(category)}
                  />
                ))}
                {filtered.length > 10 && (
                  <MobilePagination total={filtered.length} page={page} perPage={perPage} onPageChange={setPage} onPerPageChange={setPerPage} />
                )}
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Slug</th>
                  <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Sort</th>
                  <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Updated</th>
                  <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCategories.map(category => (
                  <CategoryTableRow key={category.id} category={category} onEdit={() => edit(category)} onDelete={() => remove(category)} />
                ))}
              </tbody>
            </table>
            {filtered.length > 10 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <span className="text-xs text-gray-500">Showing {page * 10 + 1}–{Math.min((page + 1) * 10, filtered.length)} of {filtered.length}</span>
                <div className="flex items-center gap-1.5">
                  <button type="button" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-2.5 py-1 rounded border border-gray-200 text-xs font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">← Prev</button>
                  {Array.from({ length: Math.min(Math.ceil(filtered.length / 10), 5) }, (_, i) => {
                    const totalPages = Math.ceil(filtered.length / 10);
                    const pn = totalPages <= 5 ? i : Math.min(Math.max(page - 2, 0), totalPages - 5) + i;
                    return (
                      <button key={pn} type="button" onClick={() => setPage(pn)} className={`w-7 h-7 rounded text-[10px] font-bold transition-colors ${pn === page ? 'bg-red-600 text-white' : 'border border-gray-200 text-gray-600 hover:bg-red-50'}`}>{pn + 1}</button>
                    );
                  })}
                  <button type="button" onClick={() => setPage(p => Math.min(Math.ceil(filtered.length / 10) - 1, p + 1))} disabled={page === Math.ceil(filtered.length / 10) - 1} className="px-2.5 py-1 rounded border border-gray-200 text-xs font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Next →</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}