import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle, Download, Edit2, Plus, Search, TrendingUp, Users, Trash2 } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { listSubscriptions, markAuditLog, deleteSubscription, upsertSubscription } from '../../lib/admin';
import { Pagination, usePagination } from './Pagination';

type SubscriptionForm = {
  id?: string;
  email: string;
  full_name: string;
  status: string;
  source: string;
};

const emptyForm: SubscriptionForm = {
  email: '',
  full_name: '',
  status: 'active',
  source: 'admin',
};

export function SubscriptionSystem() {
  const [items, setItems] = useState<Awaited<ReturnType<typeof listSubscriptions>>>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<SubscriptionForm>(emptyForm);
  const { page, perPage, setPage, setPerPage, reset, paginate } = usePagination();

  const load = async () => {
    setLoading(true);
    try {
      setItems(await listSubscriptions());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load subscriptions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(
    () => items.filter(item => item.email.toLowerCase().includes(search.toLowerCase()) || (item.full_name ?? '').toLowerCase().includes(search.toLowerCase())),
    [items, search],
  );

  useEffect(() => { reset(); }, [search]);

  const totalSubs = items.length;
  const activeSubs = items.filter(item => item.status === 'active').length;
  const pausedSubs = items.filter(item => item.status === 'paused').length;
  const cancelledSubs = items.filter(item => item.status === 'cancelled').length;
  const now = new Date();
  const newThisMonth = items.filter(item => {
    const created = new Date(item.created_at);
    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
  }).length;

  const growthData = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const month = date.toLocaleDateString('en-IN', { month: 'short' });
    const count = items.filter(item => {
      const created = new Date(item.created_at);
      return created.getFullYear() === date.getFullYear() && created.getMonth() === date.getMonth();
    }).length;
    return { month, count };
  });

  const sourceBreakdown = [
    { label: 'Homepage', value: items.filter(item => item.source === 'homepage').length, color: '#dc2626' },
    { label: 'Footer', value: items.filter(item => item.source === 'footer').length, color: '#16a34a' },
    { label: 'Admin', value: items.filter(item => item.source === 'admin').length, color: '#7c3aed' },
  ];

  const edit = (item?: (typeof items)[number]) => {
    setForm(item ? {
      id: item.id,
      email: item.email,
      full_name: item.full_name ?? '',
      status: item.status,
      source: item.source ?? 'admin',
    } : emptyForm);
    setOpen(true);
  };

  const save = async () => {
    if (!form.email.trim()) {
      toast.error('Email is required.');
      return;
    }

    setSaving(true);
    try {
      const saved = await upsertSubscription({
        id: form.id,
        email: form.email.trim(),
        full_name: form.full_name.trim() || null,
        status: form.status,
        source: form.source.trim() || null,
      });
      await markAuditLog({
        action: form.id ? 'subscription.updated' : 'subscription.created',
        entity_type: 'subscriptions',
        entity_id: (saved as { id?: string }).id ?? form.id ?? null,
        metadata: { email: form.email, status: form.status },
      });
      toast.success(form.id ? 'Subscription updated.' : 'Subscription created.');
      setOpen(false);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save subscription.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item: { id: string; email: string }) => {
    if (!confirm(`Delete subscription "${item.email}"?`)) return;
    try {
      await deleteSubscription(item.id);
      await markAuditLog({ action: 'subscription.deleted', entity_type: 'subscriptions', entity_id: item.id, metadata: { email: item.email } });
      toast.success('Subscription deleted.');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete subscription.');
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-gray-500">Loading subscriptions...</div>;
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Subscribers', value: totalSubs.toLocaleString('en-IN'), icon: Users, color: '#dc2626' },
          { label: 'Active Subscribers', value: activeSubs.toLocaleString('en-IN'), icon: CheckCircle, color: '#16a34a' },
          { label: 'Paused Subscribers', value: pausedSubs.toLocaleString('en-IN'), icon: TrendingUp, color: '#f59e0b' },
          { label: 'New This Month', value: newThisMonth.toLocaleString('en-IN'), icon: Plus, color: '#7c3aed' },
        ].map((item, index) => {
          const Icon = item.icon;
          return (
            <div key={index} className="rounded-xl border p-4" style={{ background: '#fff', borderColor: 'rgba(15,23,42,0.08)' }}>
              <Icon size={18} style={{ color: item.color, marginBottom: 8 }} />
              <div style={{ fontSize: 22, fontWeight: 700, color: '#0f172a' }}>{item.value}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{item.label}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {sourceBreakdown.map(source => (
          <div key={source.label} className="rounded-xl border p-5" style={{ background: '#fff', borderColor: 'rgba(15,23,42,0.08)' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>{source.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>{source.value.toLocaleString('en-IN')}</div>
            <div className="mt-3 rounded-lg p-2 text-center" style={{ background: '#f8fafc' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: source.color }}>{source.value.toLocaleString('en-IN')}</div>
              <div style={{ fontSize: 10, color: '#94a3b8' }}>Signups</div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <button onClick={() => edit()} style={{ flex: 1, padding: '6px', borderRadius: 8, background: '#dc2626', color: '#fff', fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer' }}>
                Edit Source
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border p-5" style={{ background: '#fff', borderColor: 'rgba(15,23,42,0.08)' }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>Subscriber Growth by Month</h3>
        <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>Actual signups grouped from live subscription records</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={growthData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.05)" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: 8, fontSize: 12, color: '#f1f5f9' }} formatter={(value: number) => [value.toLocaleString('en-IN'), 'Signups']} />
            <Bar dataKey="count" fill="#dc2626" radius={[3, 3, 0, 0]} name="Signups" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-xl border" style={{ background: '#fff', borderColor: 'rgba(15,23,42,0.08)' }}>
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'rgba(15,23,42,0.06)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>Subscriber Database</h3>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg px-3" style={{ background: '#f8fafc', border: '1px solid rgba(15,23,42,0.08)', height: 34 }}>
              <Search size={13} style={{ color: '#94a3b8' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search subscribers..." style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 12, color: '#0f172a', width: 180 }} />
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="bg-red-600 hover:bg-red-700" onClick={() => edit()}>
                  <Plus className="h-4 w-4" />
                  New Subscriber
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>{form.id ? 'Edit Subscriber' : 'Create Subscriber'}</DialogTitle>
                  <DialogDescription>Save subscription records directly to Supabase.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                  <Input value={form.email} onChange={event => setForm(current => ({ ...current, email: event.target.value }))} placeholder="Email" />
                  <Input value={form.full_name} onChange={event => setForm(current => ({ ...current, full_name: event.target.value }))} placeholder="Full name" />
                  <Input value={form.status} onChange={event => setForm(current => ({ ...current, status: event.target.value }))} placeholder="Status" />
                  <Input value={form.source} onChange={event => setForm(current => ({ ...current, source: event.target.value }))} placeholder="Source" />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button className="bg-red-600 hover:bg-red-700" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Subscriber'}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <button className="flex items-center gap-1" style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(15,23,42,0.08)', background: '#fff', color: '#64748b', fontSize: 12, cursor: 'pointer' }}>
              <Download size={13} /> Export CSV
            </button>
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Name', 'Source', 'Status', 'Created', 'Actions'].map(header => (
                <th key={header} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.05em' }}>{header.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginate(filtered).map(item => (
              <tr key={item.id} style={{ borderTop: '1px solid rgba(15,23,42,0.05)' }}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#0f172a' }}>{item.full_name ?? 'Anonymous'}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{item.email}</div>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <Badge variant="secondary">{item.source ?? 'admin'}</Badge>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <Badge variant="secondary" className={item.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-500'}>
                    {item.status === 'active' ? <CheckCircle size={12} /> : null}
                    {item.status}
                  </Badge>
                </td>
                <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748b' }}>{item.created_at ? new Date(item.created_at).toLocaleDateString('en-IN') : '—'}</td>
                <td style={{ padding: '12px 16px' }}>
                  <div className="flex items-center gap-2">
                    <button onClick={() => edit(item)} style={{ color: '#7c3aed', background: 'none', border: 'none', cursor: 'pointer' }}><Edit2 size={15} /></button>
                    <button onClick={() => void remove(item)} style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination total={filtered.length} page={page} perPage={perPage} onPageChange={setPage} onPerPageChange={setPerPage} />
      </div>
    </div>
  );
}
