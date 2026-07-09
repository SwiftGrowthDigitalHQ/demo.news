import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle, Clock, Edit2, Plus, Search, Star, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { deleteAdminReporter, listAdminReporters, markAuditLog, upsertAdminReporter } from '../../lib/admin';
import { Pagination, usePagination } from './Pagination';

type ReporterForm = {
  id?: string;
  full_name: string;
  slug: string;
  bio: string;
  specialty: string;
  avatar_url: string;
  status: string;
  user_id: string;
  social_links: string;
  _slugTouched?: boolean;
};

const emptyForm: ReporterForm = {
  full_name: '',
  slug: '',
  bio: '',
  specialty: '',
  avatar_url: '',
  status: 'active',
  user_id: '',
  social_links: '{}',
  _slugTouched: false,
};

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function JournalistManagement() {
  const [items, setItems] = useState<Awaited<ReturnType<typeof listAdminReporters>>>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ReporterForm>(emptyForm);
  const { page, perPage, setPage, setPerPage, reset, paginate } = usePagination();

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await listAdminReporters());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load reporters.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(
    () => items.filter(item => item.full_name.toLowerCase().includes(search.toLowerCase()) || (item.specialty ?? '').toLowerCase().includes(search.toLowerCase())),
    [items, search],
  );

  useEffect(() => { reset(); }, [search]);

  const stats = [
    { label: 'Total Reporters', value: String(items.length) },
    { label: 'Active', value: String(items.filter(item => item.status === 'active').length) },
    { label: 'Inactive', value: String(items.filter(item => item.status !== 'active').length) },
    { label: 'Pending Approvals', value: String(items.filter(item => item.status === 'pending').length) },
  ];

  const edit = (item?: (typeof items)[number]) => {
    setForm(item ? {
      id: item.id,
      full_name: item.full_name,
      slug: item.slug,
      bio: item.bio ?? '',
      specialty: item.specialty ?? '',
      avatar_url: item.avatar_url ?? '',
      status: item.status,
      user_id: item.user_id ?? '',
      social_links: JSON.stringify(item.social_links ?? {}, null, 2),
      _slugTouched: true,
    } : emptyForm);
    setOpen(true);
  };

  const save = async () => {
    if (!form.full_name.trim() || !form.slug.trim()) {
      toast.error('Reporter name and slug are required.');
      return;
    }

    setSaving(true);
    try {
      const saved = await upsertAdminReporter({
        id: form.id,
        full_name: form.full_name.trim(),
        slug: form.slug.trim(),
        bio: form.bio.trim() || null,
        specialty: form.specialty.trim() || null,
        avatar_url: form.avatar_url.trim() || null,
        status: form.status,
        user_id: form.user_id.trim() || null,
        social_links: form.social_links ? JSON.parse(form.social_links) : {},
      });
      await markAuditLog({
        action: form.id ? 'reporter.updated' : 'reporter.created',
        entity_type: 'reporters',
        entity_id: (saved as { id?: string }).id ?? form.id ?? null,
        metadata: { full_name: form.full_name },
      });
      toast.success(form.id ? 'Reporter updated.' : 'Reporter created.');
      setOpen(false);
      await load();
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : 'Failed to save reporter.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item: { id: string; full_name: string }) => {
    if (!confirm(`Delete reporter "${item.full_name}"?`)) return;
    try {
      await deleteAdminReporter(item.id);
      await markAuditLog({
        action: 'reporter.deleted',
        entity_type: 'reporters',
        entity_id: item.id,
        metadata: { full_name: item.full_name },
      });
      toast.success('Reporter deleted.');
      await load();
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : 'Failed to delete reporter.');
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-gray-500">Loading reporters...</div>;
  }

  if (error) {
    return <div className="p-6"><div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div></div>;
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="grid grid-cols-4 gap-4">
        {stats.map(item => (
          <Card key={item.label}>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-gray-900">{item.value}</div>
              <div className="text-sm text-gray-500">{item.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2 rounded-lg px-3" style={{ background: '#fff', border: '1px solid rgba(15,23,42,0.08)', height: 36 }}>
          <Search size={14} style={{ color: '#94a3b8' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search journalists..." style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: '#0f172a', width: 200 }} />
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-red-600 hover:bg-red-700" onClick={() => edit()}>
              <Plus size={15} /> Add Reporter
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{form.id ? 'Edit Reporter' : 'Create Reporter'}</DialogTitle>
              <DialogDescription>Persist reporter profile data to Supabase.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2 md:grid-cols-2">
              <Input value={form.full_name} onChange={event => setForm(current => ({ ...current, full_name: event.target.value, slug: current._slugTouched ? current.slug : slugify(event.target.value) }))} placeholder="Reporter name" />
              <Input value={form.slug} onChange={event => setForm(current => ({ ...current, slug: event.target.value, _slugTouched: true }))} placeholder="Slug (auto-generated)" />
              <Input value={form.specialty} onChange={event => setForm(current => ({ ...current, specialty: event.target.value }))} placeholder="Specialty" />
              <Input value={form.avatar_url} onChange={event => setForm(current => ({ ...current, avatar_url: event.target.value }))} placeholder="Avatar URL" />
              <Input value={form.status} onChange={event => setForm(current => ({ ...current, status: event.target.value }))} placeholder="Status" />
              <Input value={form.user_id} onChange={event => setForm(current => ({ ...current, user_id: event.target.value }))} placeholder="Linked user ID" />
            </div>
            <Textarea value={form.bio} onChange={event => setForm(current => ({ ...current, bio: event.target.value }))} placeholder="Bio" className="min-h-28" />
            <Textarea value={form.social_links} onChange={event => setForm(current => ({ ...current, social_links: event.target.value }))} placeholder='Social links JSON, e.g. {"twitter":"https://x.com/..." }' className="min-h-28" />
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button className="bg-red-600 hover:bg-red-700" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Reporter'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
        {paginate(filtered).map(item => (
          <div key={item.id} className="rounded-xl border p-5" style={{ background: '#fff', borderColor: 'rgba(15,23,42,0.08)' }}>
            <div className="flex items-start gap-4">
              {item.avatar_url ? (
                <img src={item.avatar_url} alt={item.full_name} className="rounded-xl flex-shrink-0 object-cover" style={{ width: 52, height: 52 }} />
              ) : (
                <div className="rounded-xl flex items-center justify-center flex-shrink-0" style={{ width: 52, height: 52, background: '#dc2626', color: '#fff', fontSize: 16, fontWeight: 700 }}>
                  {item.full_name.split(' ').map(part => part[0]).join('').slice(0, 2)}
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>{item.full_name}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{item.specialty ?? 'Reporter'}</div>
                    <span style={{ fontSize: 10, background: '#fef2f2', color: '#dc2626', padding: '1px 6px', borderRadius: 99, fontWeight: 500, display: 'inline-block', marginTop: 4 }}>{item.slug}</span>
                  </div>
                  <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 99, fontWeight: 500, background: item.status === 'active' ? '#f0fdf4' : '#f8fafc', color: item.status === 'active' ? '#16a34a' : '#94a3b8' }}>
                    {item.status === 'active' ? '● Active' : '○ Inactive'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t pt-4" style={{ borderColor: 'rgba(15,23,42,0.06)' }}>
              <div className="text-sm text-gray-500">{item.email ?? 'No linked user'}</div>
              <div className="flex items-center gap-2">
                <button onClick={() => edit(item)} style={{ color: '#7c3aed', background: 'none', border: 'none', cursor: 'pointer' }}><Edit2 size={15} /></button>
                <button onClick={() => void remove(item)} style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={15} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Pagination total={filtered.length} page={page} perPage={perPage} onPageChange={setPage} onPerPageChange={setPerPage} />

      <div className="rounded-xl border p-5" style={{ background: '#fff', borderColor: 'rgba(15,23,42,0.08)' }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 16 }}>Approval Queue</h3>
        <div className="space-y-3 text-sm text-gray-600">
          <div className="rounded-xl border border-gray-200 p-4">Reporter profiles are fully editable and persist to Supabase.</div>
          <div className="rounded-xl border border-gray-200 p-4">Use the reporter slug for author pages and article attribution.</div>
          <div className="rounded-xl border border-gray-200 p-4">Profile updates are logged in the audit trail.</div>
        </div>
      </div>

    </div>
  );
}
