import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle, Plus, Search, Settings2, Trash2 } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { deleteAdminRole, listAdminRoles, markAuditLog, upsertAdminRole } from '../../lib/admin';
import { Pagination, usePagination } from './Pagination';

type RoleForm = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  is_system: boolean;
  _slugTouched?: boolean;
};

const emptyForm: RoleForm = {
  name: '',
  slug: '',
  description: '',
  is_system: true,
  _slugTouched: false,
};

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function AdminRoles() {
  const [items, setItems] = useState<Awaited<ReturnType<typeof listAdminRoles>>>([]);
  const [search, setSearch] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<RoleForm>(emptyForm);
  const { page, perPage, setPage, setPerPage, reset, paginate } = usePagination();

  const load = async () => {
    setLoading(true);
    try {
      setItems(await listAdminRoles());
    } catch (loadError) {
      toast.error(loadError instanceof Error ? loadError.message : 'Failed to load roles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => items.filter(role => role.name.toLowerCase().includes(search.toLowerCase()) || role.slug.toLowerCase().includes(search.toLowerCase())), [items, search]);

  useEffect(() => { reset(); }, [search]);

  const edit = (role?: (typeof items)[number]) => {
    setForm(role ? {
      id: role.id,
      name: role.name,
      slug: role.slug,
      description: role.description ?? '',
      is_system: role.is_system,
      _slugTouched: true,
    } : emptyForm);
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.slug.trim()) {
      toast.error('Role name and slug are required.');
      return;
    }
    setSaving(true);
    try {
      const saved = await upsertAdminRole({
        id: form.id,
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description.trim() || null,
        is_system: form.is_system,
      });
      await markAuditLog({
        action: form.id ? 'role.updated' : 'role.created',
        entity_type: 'roles',
        entity_id: (saved as { id?: string }).id ?? form.id ?? null,
        metadata: { name: form.name, slug: form.slug },
      });
      toast.success(form.id ? 'Role updated.' : 'Role created.');
      setOpen(false);
      await load();
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : 'Failed to save role.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (role: { id: string; name: string }) => {
    if (!confirm(`Delete role "${role.name}"?`)) return;
    try {
      await deleteAdminRole(role.id);
      await markAuditLog({ action: 'role.deleted', entity_type: 'roles', entity_id: role.id, metadata: { name: role.name } });
      toast.success('Role deleted.');
      await load();
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : 'Failed to delete role.');
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-gray-500">Loading roles...</div>;
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="grid gap-4 md:grid-cols-4">
        {items.map(role => (
          <Card key={role.id}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-base font-semibold text-gray-900">{role.name}</div>
                  <div className="text-sm text-gray-500">{role.description ?? 'Permission role'}</div>
                </div>
                <CheckCircle className="h-5 w-5 text-red-600" />
              </div>
              <div className="mt-4 text-2xl font-bold text-gray-900">{role.user_count ?? 0}</div>
              <div className="text-sm text-gray-500">Assigned users</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-gray-200 p-4 md:flex-row md:items-center md:justify-between">
          <div className="relative md:max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search roles..." className="pl-10" />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
              <Settings2 className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-700">RBAC enabled</span>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="bg-red-600 hover:bg-red-700" onClick={() => edit()}>
                  <Plus className="h-4 w-4" />
                  New Role
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>{form.id ? 'Edit Role' : 'Create Role'}</DialogTitle>
                  <DialogDescription>Define role access, permissions, and access level.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                  <Input value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value, slug: current._slugTouched ? current.slug : slugify(event.target.value) }))} placeholder="Role name" />
                  <Input value={form.slug} onChange={event => setForm(current => ({ ...current, slug: event.target.value, _slugTouched: true }))} placeholder="Slug (auto-generated)" />
                  <Input value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} placeholder="Description" />
                  <div className="rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between text-sm text-gray-700">
                      <span>System role</span>
                      <Switch checked={form.is_system} onCheckedChange={checked => setForm(current => ({ ...current, is_system: checked }))} />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button className="bg-red-600 hover:bg-red-700" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Role'}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role</TableHead>
              <TableHead>Users</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginate(filtered).map(role => (
              <TableRow key={role.id}>
                <TableCell className="font-medium text-gray-900">{role.name}</TableCell>
                <TableCell>{role.user_count ?? 0}</TableCell>
                <TableCell className="text-gray-500">{role.description ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="gap-1 bg-red-50 text-red-600">
                    <CheckCircle className="h-3 w-3" />
                    {role.is_system ? 'System' : 'Custom'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <button onClick={() => edit(role)} style={{ color: '#7c3aed', background: 'none', border: 'none', cursor: 'pointer' }}>Edit</button>
                    <button onClick={() => void remove(role)} style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Pagination total={filtered.length} page={page} perPage={perPage} onPageChange={setPage} onPerPageChange={setPerPage} />
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h3 className="text-lg font-semibold mb-4">Permission Matrix</h3>
          <div className="space-y-3">
            {['Create Article', 'Edit Any Article', 'Delete Article', 'Publish Article', 'Manage Users', 'Manage Ads', 'View Analytics', 'Manage SEO'].map(permission => (
              <div key={permission} className="flex items-center justify-between rounded-xl border border-gray-200 p-3">
                <span className="text-sm text-gray-700">{permission}</span>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs text-gray-500">Stored in database</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h3 className="text-lg font-semibold mb-4">Role Activity</h3>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="rounded-xl border border-gray-200 p-4">Role updates and deletions are recorded in the audit log.</div>
            <div className="rounded-xl border border-gray-200 p-4">Use the users screen to assign roles to accounts.</div>
          </div>
        </div>
      </section>

    </div>
  );
}
