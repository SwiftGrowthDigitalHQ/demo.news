import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Bell, Send, Search, Trash2 } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Textarea } from '../ui/textarea';
import { deleteNotification, listNotifications, markAuditLog, type NotificationRow, upsertNotification } from '../../lib/admin';
import { Pagination, usePagination } from './Pagination';

type NotificationForm = {
  id?: string;
  title: string;
  message: string;
  channel: string;
  status: NotificationRow['status'];
  scheduled_at: string;
  sent_at: string;
};

const emptyForm: NotificationForm = {
  title: '',
  message: '',
  channel: 'in-app',
  status: 'draft',
  scheduled_at: '',
  sent_at: '',
};

export function AdminNotifications() {
  const [items, setItems] = useState<Awaited<ReturnType<typeof listNotifications>>>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<NotificationForm>(emptyForm);
  const { page, perPage, setPage, setPerPage, reset, paginate } = usePagination();

  const load = async () => {
    setLoading(true);
    try {
      setItems(await listNotifications());
    } catch (loadError) {
      toast.error(loadError instanceof Error ? loadError.message : 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => items.filter(item => item.title.toLowerCase().includes(search.toLowerCase()) || item.channel.toLowerCase().includes(search.toLowerCase())), [items, search]);

  useEffect(() => { reset(); }, [search]);

  const stats = [
    { label: 'Sent', value: String(items.filter(item => item.status === 'sent').length) },
    { label: 'Scheduled', value: String(items.filter(item => item.status === 'scheduled').length) },
    { label: 'Drafts', value: String(items.filter(item => item.status === 'draft').length) },
    { label: 'Failures', value: String(items.filter(item => item.status === 'cancelled').length) },
  ];

  const edit = (item?: (typeof items)[number]) => {
    setForm(item ? {
      id: item.id,
      title: item.title,
      message: item.message,
      channel: item.channel,
      status: item.status,
      scheduled_at: item.scheduled_at ?? '',
      sent_at: item.sent_at ?? '',
    } : emptyForm);
    setOpen(true);
  };

  const save = async () => {
    if (!form.title.trim() || !form.message.trim()) {
      toast.error('Notification title and message are required.');
      return;
    }
    setSaving(true);
    try {
      const saved = await upsertNotification({
        id: form.id,
        title: form.title.trim(),
        message: form.message.trim(),
        channel: form.channel,
        status: form.status,
        scheduled_at: form.scheduled_at || null,
        sent_at: form.sent_at || null,
      });
      await markAuditLog({
        action: form.id ? 'notification.updated' : 'notification.created',
        entity_type: 'notifications',
        entity_id: (saved as { id?: string }).id ?? form.id ?? null,
        metadata: { title: form.title, channel: form.channel },
      });
      toast.success(form.id ? 'Notification updated.' : 'Notification created.');
      setOpen(false);
      await load();
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : 'Failed to save notification.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item: { id: string; title: string }) => {
    if (!confirm(`Delete notification "${item.title}"?`)) return;
    try {
      await deleteNotification(item.id);
      await markAuditLog({ action: 'notification.deleted', entity_type: 'notifications', entity_id: item.id, metadata: { title: item.title } });
      toast.success('Notification deleted.');
      await load();
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : 'Failed to delete notification.');
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-gray-500">Loading notifications...</div>;
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
          <div className="relative md:max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search notifications..." className="pl-10" />
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-red-600 hover:bg-red-700" onClick={() => edit()}>
                <Send className="h-4 w-4" />
                Compose
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>{form.id ? 'Edit Notification' : 'Compose Notification'}</DialogTitle>
                <DialogDescription>Prepare a push, email, or in-app update.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <Input value={form.title} onChange={event => setForm(current => ({ ...current, title: event.target.value }))} placeholder="Notification title" />
                <Input value={form.channel} onChange={event => setForm(current => ({ ...current, channel: event.target.value }))} placeholder="Channel" />
                <Input value={form.status} onChange={event => setForm(current => ({ ...current, status: event.target.value as NotificationRow['status'] }))} placeholder="Status" />
                <Textarea value={form.message} onChange={event => setForm(current => ({ ...current, message: event.target.value }))} placeholder="Notification body" className="min-h-32" />
                <Input value={form.scheduled_at} onChange={event => setForm(current => ({ ...current, scheduled_at: event.target.value }))} placeholder="Scheduled at" />
                <Input value={form.sent_at} onChange={event => setForm(current => ({ ...current, sent_at: event.target.value }))} placeholder="Sent at" />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button className="bg-red-600 hover:bg-red-700" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Send Now'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="inbox" className="p-4">
          <TabsList className="mb-4">
            <TabsTrigger value="inbox">Inbox</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
            <TabsTrigger value="drafts">Drafts</TabsTrigger>
          </TabsList>
          <TabsContent value="inbox" className="space-y-3">
            {paginate(filtered).map(item => (
              <div key={item.id} className="flex items-center justify-between rounded-xl border border-gray-200 p-4">
                <div>
                  <div className="font-medium text-gray-900">{item.title}</div>
                  <div className="text-sm text-gray-500">{item.channel} • {item.created_at}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{item.status}</Badge>
                  <button onClick={() => edit(item)} style={{ color: '#7c3aed', background: 'none', border: 'none', cursor: 'pointer' }}>
                    <Search size={14} />
                  </button>
                  <button onClick={() => void remove(item)} style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            <Pagination total={filtered.length} page={page} perPage={perPage} onPageChange={setPage} onPerPageChange={setPerPage} />
          </TabsContent>
          <TabsContent value="scheduled" className="text-sm text-gray-500">Scheduled notifications will appear here.</TabsContent>
          <TabsContent value="drafts" className="text-sm text-gray-500">Draft notifications will appear here.</TabsContent>
        </Tabs>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-5 w-5 text-red-600" />
          <h3 className="text-xl font-semibold">Delivery Status</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {['Push', 'Email', 'SMS', 'In-app'].map(channel => (
            <div key={channel} className="rounded-xl border border-gray-200 p-4">
              <div className="text-sm text-gray-500">{channel}</div>
              <div className="mt-2 text-2xl font-bold text-gray-900">98%</div>
              <p className="text-sm text-gray-500 mt-1">Delivery success rate</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
