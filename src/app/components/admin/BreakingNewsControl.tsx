import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Radio, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import { listBreakingNews, markAuditLog, deleteBreakingNews, upsertBreakingNews } from '../../lib/admin';
import { Pagination, usePagination } from './Pagination';

export function BreakingNewsControl() {
  const [items, setItems] = useState<Awaited<ReturnType<typeof listBreakingNews>>>([]);
  const [newText, setNewText] = useState('');
  const [loading, setLoading] = useState(true);
  const { page, perPage, setPage, setPerPage, reset, paginate } = usePagination();

  const load = async () => {
    setLoading(true);
    try {
      setItems(await listBreakingNews());
    } catch (loadError) {
      toast.error(loadError instanceof Error ? loadError.message : 'Failed to load breaking news.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const toggle = async (id: string, active: boolean) => {
    try {
      await upsertBreakingNews({ id, headline: items.find(item => item.id === id)?.headline ?? '', is_active: !active });
      await markAuditLog({ action: 'breaking_news.updated', entity_type: 'breaking_news', entity_id: id, metadata: { active: !active } });
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update breaking news.');
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteBreakingNews(id);
      await markAuditLog({ action: 'breaking_news.deleted', entity_type: 'breaking_news', entity_id: id });
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete breaking news.');
    }
  };

  const add = async () => {
    if (!newText.trim()) return;
    try {
      await upsertBreakingNews({ headline: newText.trim(), is_active: true });
      await markAuditLog({ action: 'breaking_news.created', entity_type: 'breaking_news', metadata: { headline: newText } });
      setNewText('');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add breaking news.');
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-gray-500">Loading breaking news...</div>;
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Active Tickers', value: items.filter(item => item.is_active).length, color: '#dc2626', bg: '#fef2f2' },
          { label: 'Total In Queue', value: items.length, color: '#7c3aed', bg: '#f5f3ff' },
          { label: 'Today Published', value: items.filter(item => item.created_at.includes(new Date().toISOString().slice(0, 10))).length, color: '#16a34a', bg: '#f0fdf4' },
        ].map((item, index) => (
          <div key={index} className="rounded-xl border p-4 flex items-center gap-4" style={{ background: item.bg, borderColor: 'transparent' }}>
            <Radio size={24} style={{ color: item.color }} />
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, color: item.color }}>{item.value}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{item.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl overflow-hidden border" style={{ borderColor: '#dc2626' }}>
        <div className="flex items-center gap-3 px-4 py-2" style={{ background: '#dc2626' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', boxShadow: '0 0 8px rgba(255,255,255,0.8)', display: 'inline-block' }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: '0.08em' }}>BREAKING NEWS LIVE PREVIEW</span>
        </div>
        <div style={{ background: '#0f172a', padding: '10px 16px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', gap: 32, color: '#f1f5f9', fontSize: 13, whiteSpace: 'nowrap' }}>
            {items.filter(item => item.is_active).map((item, index) => (
              <span key={item.id}>
                <span style={{ color: '#dc2626', fontWeight: 700 }}>● </span>
                {item.headline}
                {index < items.filter(current => current.is_active).length - 1 && <span style={{ color: '#dc2626', marginLeft: 32 }}> ◆ </span>}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border p-5" style={{ background: '#fff', borderColor: 'rgba(15,23,42,0.08)' }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>Add Breaking News</h3>
        <div className="flex items-center gap-3">
          <input
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && void add()}
            placeholder="Breaking news ticker text..."
            style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(15,23,42,0.12)', fontSize: 13, color: '#0f172a', background: '#f8fafc', outline: 'none' }}
          />
          <button onClick={() => void add()} className="flex items-center gap-2" style={{ padding: '10px 20px', borderRadius: 8, background: '#dc2626', color: '#fff', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
            <Plus size={15} /> Add & Activate
          </button>
        </div>
      </div>

      <div className="rounded-xl border" style={{ background: '#fff', borderColor: 'rgba(15,23,42,0.08)' }}>
        <div className="p-4 border-b" style={{ borderColor: 'rgba(15,23,42,0.06)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>Breaking News Queue</h3>
        </div>
        <div className="flex flex-col gap-0">
          {paginate(items).map(item => (
            <div key={item.id} className="flex items-center gap-4 p-4 border-b" style={{ borderColor: 'rgba(15,23,42,0.05)' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: item.is_active ? '#dc2626' : '#f59e0b' }} />
              <div className="flex-1">
                <div style={{ fontSize: 13, color: '#0f172a' }}>{item.headline}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Order {item.sort_order}</div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => void toggle(item.id, item.is_active)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  {item.is_active ? <ToggleRight size={24} style={{ color: '#dc2626' }} /> : <ToggleLeft size={24} style={{ color: '#94a3b8' }} />}
                </button>
                <button onClick={() => void remove(item.id)} style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <Pagination total={items.length} page={page} perPage={perPage} onPageChange={setPage} onPerPageChange={setPerPage} />
      </div>
    </div>
  );
}
