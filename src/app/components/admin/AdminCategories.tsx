import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Search, Tag, Trash2 } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Textarea } from '../ui/textarea';
import { deleteAdminCategory, listAdminCategories, markAuditLog, upsertAdminCategory } from '../../lib/admin';

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

export function AdminCategories() {
  const [items, setItems] = useState<{ id: string; name: string; slug: string; description: string | null; sort_order: number; is_featured: boolean; updated_at: string }[]>([]);
  const [search, setSearch] = useState('');
  const [catPage, setCatPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CategoryForm>(emptyForm);

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

  const stats = useMemo(() => [
    { label: 'Total Categories', value: String(items.length) },
    { label: 'Published', value: String(items.filter(item => item.sort_order >= 0).length) },
    { label: 'Drafts', value: String(items.filter(item => item.is_featured).length) },
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
    return <div className="p-6 text-sm text-gray-500">Loading categories...</div>;
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="grid gap-4 md:grid-cols-4">
        {stats.map(item => (
          <Card key={item.label}>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-gray-900">{item.value}</div>
              <div className="text-sm text-gray-500">{item.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-gray-200 p-4 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 md:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search categories..." className="pl-10" />
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-red-600 hover:bg-red-700" onClick={() => edit()}>
                <Plus className="h-4 w-4" />
                New Category
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{form.id ? 'Edit Category' : 'Create Category'}</DialogTitle>
                <DialogDescription>Save the category record directly to Supabase.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <Input value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value, slug: current.slug || slugify(event.target.value) }))} placeholder="Category name" />
                <Input value={form.slug} onChange={event => setForm(current => ({ ...current, slug: event.target.value }))} placeholder="Slug" />
                <Textarea value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} placeholder="Category description" className="min-h-28" />
                <Input value={form.sort_order} onChange={event => setForm(current => ({ ...current, sort_order: event.target.value }))} placeholder="Sort order" />
                <Input value={form.seo_title} onChange={event => setForm(current => ({ ...current, seo_title: event.target.value }))} placeholder="SEO title" />
                <Input value={form.seo_description} onChange={event => setForm(current => ({ ...current, seo_description: event.target.value }))} placeholder="SEO description" />
                <button
                  onClick={() => setForm(current => ({ ...current, is_featured: !current.is_featured }))}
                  className="rounded-xl border px-4 py-3 text-left"
                  style={{ background: form.is_featured ? '#fef2f2' : '#fff' }}
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

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Sort</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.slice(catPage * 10, (catPage + 1) * 10).map(category => (
              <TableRow key={category.id}>
                <TableCell>
                  <div className="flex items-center gap-2 font-medium text-gray-900">
                    <Tag className="h-4 w-4 text-red-600" />
                    {category.name}
                  </div>
                </TableCell>
                <TableCell className="text-gray-500">{category.slug}</TableCell>
                <TableCell>{category.sort_order}</TableCell>
                <TableCell>
                  <Badge variant={category.is_featured ? 'default' : 'secondary'} className={category.is_featured ? 'bg-red-50 text-red-600' : ''}>
                    {category.is_featured ? 'Featured' : 'Standard'}
                  </Badge>
                </TableCell>
                <TableCell className="text-gray-500">{new Date(category.updated_at).toLocaleDateString('en-IN')}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <button onClick={() => edit(category)} style={{ color: '#7c3aed', background: 'none', border: 'none', cursor: 'pointer' }}>
                      <Plus size={15} />
                    </button>
                    <button onClick={() => void remove(category)} style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filtered.length > 10 && (() => {
          const totalPages = Math.ceil(filtered.length / 10);
          return (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <span className="text-xs text-gray-500">Showing {catPage * 10 + 1}–{Math.min((catPage + 1) * 10, filtered.length)} of {filtered.length}</span>
              <div className="flex items-center gap-1.5">
                <button type="button" onClick={() => setCatPage(p => Math.max(0, p - 1))} disabled={catPage === 0}
                  className="px-2.5 py-1 rounded border border-gray-200 text-xs font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">← Prev</button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const pn = totalPages <= 5 ? i : Math.min(Math.max(catPage - 2, 0), totalPages - 5) + i;
                  return (
                    <button key={pn} type="button" onClick={() => setCatPage(pn)}
                      className={`w-7 h-7 rounded text-[10px] font-bold transition-colors ${pn === catPage ? 'bg-red-600 text-white' : 'border border-gray-200 text-gray-600 hover:bg-red-50'}`}>{pn + 1}</button>
                  );
                })}
                <button type="button" onClick={() => setCatPage(p => Math.min(totalPages - 1, p + 1))} disabled={catPage === totalPages - 1}
                  className="px-2.5 py-1 rounded border border-gray-200 text-xs font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Next →</button>
              </div>
            </div>
          );
        })()}
      </div>

    </div>
  );
}
