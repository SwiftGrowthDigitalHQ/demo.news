import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle, Edit2, Plus, Search, Shield, Trash2, XCircle } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { deleteAdminUser, listAdminRoles, listAdminUsers, markAuditLog, upsertAdminUser } from '../../lib/admin';
import { Pagination, usePagination } from './Pagination';

type UserForm = {
  id?: string;
  full_name: string;
  email: string;
  role_id: string;
  status: string;
  avatar_url: string;
  phone: string;
  bio: string;
};

const emptyForm: UserForm = {
  full_name: '',
  email: '',
  role_id: '',
  status: 'active',
  avatar_url: '',
  phone: '',
  bio: '',
};

export function UserManagement() {
  const [users, setUsers] = useState<Awaited<ReturnType<typeof listAdminUsers>>>([]);
  const [roles, setRoles] = useState<Awaited<ReturnType<typeof listAdminRoles>>>([]);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('users');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const { page, perPage, setPage, setPerPage, reset, paginate } = usePagination();

  const load = async () => {
    setLoading(true);
    try {
      const [userRows, roleRows] = await Promise.all([listAdminUsers(), listAdminRoles()]);
      setUsers(userRows);
      setRoles(roleRows);
    } catch (loadError) {
      toast.error(loadError instanceof Error ? loadError.message : 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(
    () => users.filter(user => user.full_name.toLowerCase().includes(search.toLowerCase()) || user.email.toLowerCase().includes(search.toLowerCase())),
    [search, users],
  );

  useEffect(() => { reset(); }, [search]);

  const roleColors: Record<string, string> = {
    'super-admin': '#dc2626',
    admin: '#dc2626',
    editor: '#7c3aed',
    reporter: '#0891b2',
    subscriber: '#16a34a',
  };

  const edit = (user?: (typeof users)[number]) => {
    setForm(user ? {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role_id: user.role_id ?? '',
      status: user.status,
      avatar_url: user.avatar_url ?? '',
      phone: user.phone ?? '',
      bio: user.bio ?? '',
    } : emptyForm);
    setOpen(true);
  };

  const save = async () => {
    if (!form.full_name.trim() || !form.email.trim()) {
      toast.error('Full name and email are required.');
      return;
    }

    setSaving(true);
    try {
      const saved = await upsertAdminUser({
        id: form.id,
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        role_id: form.role_id || null,
        status: form.status,
        avatar_url: form.avatar_url || null,
        phone: form.phone || null,
        bio: form.bio || null,
      });
      await markAuditLog({
        action: form.id ? 'user.updated' : 'user.created',
        entity_type: 'users',
        entity_id: (saved as { id?: string }).id ?? form.id ?? null,
        metadata: { email: form.email, role_id: form.role_id },
      });
      toast.success(form.id ? 'User updated.' : 'User created.');
      setOpen(false);
      await load();
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : 'Failed to save user.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (user: { id: string; full_name: string }) => {
    if (!confirm(`Delete user "${user.full_name}"?`)) return;
    try {
      await deleteAdminUser(user.id);
      await markAuditLog({ action: 'user.deleted', entity_type: 'users', entity_id: user.id, metadata: { full_name: user.full_name } });
      toast.success('User deleted.');
      await load();
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : 'Failed to delete user.');
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-gray-500">Loading users...</div>;
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="grid grid-cols-4 gap-4">
        {roles.map(role => (
          <Card key={role.id}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="rounded-lg flex items-center justify-center" style={{ width: 40, height: 40, background: (roleColors[role.slug] ?? '#64748b') + '15' }}>
                  <Shield size={18} style={{ color: roleColors[role.slug] ?? '#64748b' }} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{role.name}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: roleColors[role.slug] ?? '#64748b' }}>{role.user_count ?? 0}</div>
                </div>
              </div>
              <div className="text-sm text-gray-500">{role.description ?? 'Role permissions are managed in the roles screen.'}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-1 border-b" style={{ borderColor: 'rgba(15,23,42,0.08)' }}>
        {[{ id: 'users', label: 'All Users' }, { id: 'permissions', label: 'Permission Matrix' }].map(item => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            style={{
              padding: '10px 16px',
              fontSize: 13,
              color: tab === item.id ? '#dc2626' : '#64748b',
              background: 'none',
              border: 'none',
              borderBottom: tab === item.id ? '2px solid #dc2626' : '2px solid transparent',
              cursor: 'pointer',
              fontWeight: tab === item.id ? 600 : 400,
              marginBottom: -1,
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'users' && (
        <div className="rounded-xl border" style={{ background: '#fff', borderColor: 'rgba(15,23,42,0.08)' }}>
          <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'rgba(15,23,42,0.06)' }}>
            <div className="flex items-center gap-2 rounded-lg px-3" style={{ background: '#f8fafc', border: '1px solid rgba(15,23,42,0.08)', height: 36 }}>
              <Search size={14} style={{ color: '#94a3b8' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: '#0f172a', width: 200 }} />
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="bg-red-600 hover:bg-red-700" onClick={() => edit()}>
                  <Plus size={15} /> Add User
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{form.id ? 'Edit User' : 'Create User'}</DialogTitle>
                  <DialogDescription>Save the account profile to Supabase.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-2 md:grid-cols-2">
                  <Input value={form.full_name} onChange={event => setForm(current => ({ ...current, full_name: event.target.value }))} placeholder="Full name" />
                  <Input value={form.email} onChange={event => setForm(current => ({ ...current, email: event.target.value }))} placeholder="Email" type="email" />
                  <select
                    value={form.role_id}
                    onChange={event => setForm(current => ({ ...current, role_id: event.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">— Select Role —</option>
                    {roles.map(role => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </select>
                  <select
                    value={form.status}
                    onChange={event => setForm(current => ({ ...current, status: event.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                  <Input value={form.avatar_url} onChange={event => setForm(current => ({ ...current, avatar_url: event.target.value }))} placeholder="Avatar URL" />
                  <Input value={form.phone} onChange={event => setForm(current => ({ ...current, phone: event.target.value }))} placeholder="Phone" />
                </div>
                <Input value={form.bio} onChange={event => setForm(current => ({ ...current, bio: event.target.value }))} placeholder="Bio" />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button className="bg-red-600 hover:bg-red-700" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save User'}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                {['User', 'Role', 'Last Login', 'Status', 'Actions'].map(header => <TableHead key={header}>{header}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginate(filtered).map(user => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium text-gray-900">{user.full_name}</div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" style={{ background: (roleColors[user.role_slug ?? ''] ?? '#64748b') + '15', color: roleColors[user.role_slug ?? ''] ?? '#64748b' }}>
                      {user.role_name ?? 'No role'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-500">{user.last_login_at ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={user.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-500'}>
                      {user.status === 'active' ? <CheckCircle className="mr-1 h-3 w-3" /> : <XCircle className="mr-1 h-3 w-3" />}
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <button onClick={() => edit(user)} style={{ color: '#7c3aed', background: 'none', border: 'none', cursor: 'pointer' }}><Edit2 size={15} /></button>
                      <button onClick={() => void remove(user)} style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={15} /></button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination total={filtered.length} page={page} perPage={perPage} onPageChange={setPage} onPerPageChange={setPerPage} />
        </div>
      )}

      {tab === 'permissions' && (
        <div className="rounded-xl border overflow-hidden" style={{ background: '#fff', borderColor: 'rgba(15,23,42,0.08)' }}>
          <div className="p-4 border-b" style={{ borderColor: 'rgba(15,23,42,0.06)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>Permission Matrix</h3>
            <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Role-based access control is stored in Supabase.</p>
          </div>
          <div className="space-y-3 p-4 text-sm text-gray-600">
            <div className="rounded-xl border border-gray-200 p-4">Use the roles screen to edit permissions and the users table to assign them.</div>
            <div className="rounded-xl border border-gray-200 p-4">All user actions write audit logs automatically.</div>
          </div>
        </div>
      )}

    </div>
  );
}
