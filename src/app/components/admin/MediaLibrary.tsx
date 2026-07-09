import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Copy, Download, Eye, Film, FileText, Grid, Image, List, Search, Trash2, Upload } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { AdminMediaItem, deleteAdminMedia, listAdminMedia, markAuditLog, updateAdminMedia, uploadAdminMedia } from '../../lib/admin';
import { Pagination, usePagination } from './Pagination';

type MediaForm = {
  id?: string;
  alt_text: string;
  caption: string;
  is_featured: boolean;
};

const emptyForm: MediaForm = {
  alt_text: '',
  caption: '',
  is_featured: false,
};

export function MediaLibrary() {
  const [items, setItems] = useState<AdminMediaItem[]>([]);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<AdminMediaItem | null>(null);
  const [form, setForm] = useState<MediaForm>(emptyForm);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { page, perPage, setPage, setPerPage, reset, paginate } = usePagination();

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await listAdminMedia());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load media items.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    return items.filter(item => {
      const matchType = filter === 'all' || item.mime_type.startsWith(filter) || (filter === 'image' && item.mime_type.startsWith('image/')) || (filter === 'video' && item.mime_type.startsWith('video/')) || (filter === 'document' && !item.mime_type.startsWith('image/') && !item.mime_type.startsWith('video/'));
      const matchSearch = item.file_name.toLowerCase().includes(search.toLowerCase()) || (item.caption ?? '').toLowerCase().includes(search.toLowerCase());
      return matchType && matchSearch;
    });
  }, [filter, items, search]);

  useEffect(() => { reset(); }, [filter, search]);

  const stats = useMemo(() => {
    const images = items.filter(item => item.mime_type.startsWith('image/')).length;
    const videos = items.filter(item => item.mime_type.startsWith('video/')).length;
    const totalBytes = items.reduce((sum, item) => sum + item.file_size, 0);
    return [
      { label: 'Total Files', value: String(items.length), color: '#dc2626' },
      { label: 'Images', value: String(images), color: '#7c3aed' },
      { label: 'Videos', value: String(videos), color: '#0891b2' },
      { label: 'Storage Used', value: `${(totalBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`, color: '#f59e0b' },
    ];
  }, [items]);

  const pickFile = () => inputRef.current?.click();

  const handleUpload = async (file?: File) => {
    if (!file) return;
    setSaving(true);
    try {
      const uploaded = await uploadAdminMedia(file);
      await markAuditLog({
        action: 'media.uploaded',
        entity_type: 'media',
        entity_id: uploaded.id,
        metadata: { file_name: uploaded.file_name },
      });
      toast.success('Media uploaded.');
      await load();
    } catch (uploadError) {
      toast.error(uploadError instanceof Error ? uploadError.message : 'Failed to upload media.');
    } finally {
      setSaving(false);
    }
  };

  const saveMetadata = async () => {
    if (!activeItem) return;
    setSaving(true);
    try {
      await updateAdminMedia(activeItem.id, {
        ...activeItem,
        alt_text: form.alt_text || null,
        caption: form.caption || null,
        is_featured: form.is_featured,
      });
      await markAuditLog({
        action: 'media.updated',
        entity_type: 'media',
        entity_id: activeItem.id,
        metadata: { file_name: activeItem.file_name },
      });
      toast.success('Media updated.');
      setOpen(false);
      await load();
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : 'Failed to update media.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item: AdminMediaItem) => {
    if (!confirm(`Delete "${item.file_name}"?`)) return;
    try {
      await deleteAdminMedia(item.id, item.file_path);
      await markAuditLog({
        action: 'media.deleted',
        entity_type: 'media',
        entity_id: item.id,
        metadata: { file_name: item.file_name },
      });
      toast.success('Media deleted.');
      await load();
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : 'Failed to delete media.');
    }
  };

  const openEditor = (item: AdminMediaItem) => {
    setActiveItem(item);
    setForm({
      id: item.id,
      alt_text: item.alt_text ?? '',
      caption: item.caption ?? '',
      is_featured: item.is_featured,
    });
    setOpen(true);
  };

  const getPublicUrl = (item: AdminMediaItem) => {
    return `${import.meta.env.VITE_SUPABASE_URL ?? ''}/storage/v1/object/public/${item.storage_bucket}/${item.file_path}`;
  };

  const copyUrl = (item: AdminMediaItem) => {
    const url = getPublicUrl(item);
    navigator.clipboard.writeText(url).then(() => {
      toast.success('Image URL copied! Paste it in the article Featured Image field.');
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast.success('URL copied!');
    });
  };

  if (loading) {
    return <div className="p-6 text-sm text-gray-500">Loading media library...</div>;
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
      <div className="grid grid-cols-4 gap-4">
        {stats.map(item => (
          <Card key={item.label} className="rounded-xl border p-4">
            <div style={{ fontSize: 20, fontWeight: 700, color: item.color }}>{item.value}</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{item.label}</div>
          </Card>
        ))}
      </div>

      <div
        onDragOver={event => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={async event => {
          event.preventDefault();
          setDragOver(false);
          await handleUpload(event.dataTransfer.files?.[0]);
        }}
        className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 py-10 cursor-pointer"
        style={{
          borderColor: dragOver ? '#dc2626' : 'rgba(15,23,42,0.12)',
          background: dragOver ? '#fef2f2' : '#fff',
          transition: 'all 0.2s ease',
        }}
        onClick={pickFile}
      >
        <div className="rounded-full flex items-center justify-center" style={{ width: 56, height: 56, background: '#fef2f2' }}>
          <Upload size={24} style={{ color: '#dc2626' }} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>Drop files here to upload</div>
          <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>Supports JPG, PNG, MP4, PDF · Max 100MB per file</div>
        </div>
        <input ref={inputRef} type="file" className="hidden" onChange={async event => handleUpload(event.target.files?.[0] ?? undefined)} />
        <button
          type="button"
          disabled={saving}
          style={{ padding: '8px 20px', borderRadius: 8, background: '#dc2626', color: '#fff', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer' }}
        >
          {saving ? 'Uploading...' : 'Browse Files'}
        </button>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg px-3" style={{ background: '#fff', border: '1px solid rgba(15,23,42,0.08)', height: 36 }}>
            <Search size={14} style={{ color: '#94a3b8' }} />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search media..."
              style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: '#0f172a', width: 160 }}
            />
          </div>
          {['all', 'image', 'video', 'document'].map(item => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              style={{
                padding: '6px 14px',
                borderRadius: 99,
                fontSize: 12,
                background: filter === item ? '#dc2626' : '#fff',
                color: filter === item ? '#fff' : '#64748b',
                border: filter === item ? 'none' : '1px solid rgba(15,23,42,0.08)',
                cursor: 'pointer',
                fontWeight: filter === item ? 500 : 400,
                textTransform: 'capitalize',
              }}
            >
              {item === 'all' ? 'All' : `${item}s`}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setView('grid')} style={{ padding: 8, borderRadius: 8, border: '1px solid rgba(15,23,42,0.08)', background: view === 'grid' ? '#dc2626' : '#fff', color: view === 'grid' ? '#fff' : '#64748b', cursor: 'pointer' }}>
            <Grid size={15} />
          </button>
          <button onClick={() => setView('list')} style={{ padding: 8, borderRadius: 8, border: '1px solid rgba(15,23,42,0.08)', background: view === 'list' ? '#dc2626' : '#fff', color: view === 'list' ? '#fff' : '#64748b', cursor: 'pointer' }}>
            <List size={15} />
          </button>
        </div>
      </div>

      {view === 'grid' ? (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
          {paginate(filtered).map(item => (
            <div key={item.id} className="rounded-xl border overflow-hidden group" style={{ background: '#fff', borderColor: 'rgba(15,23,42,0.08)', cursor: 'pointer' }}>
              <div className="relative flex items-center justify-center" style={{ height: 120, background: '#f8fafc', overflow: 'hidden' }}>
                {item.mime_type.startsWith('image/') ? (
                  <img src={`${import.meta.env.VITE_SUPABASE_URL ?? ''}/storage/v1/object/public/${item.storage_bucket}/${item.file_path}`} alt={item.alt_text ?? item.file_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    {item.mime_type.startsWith('video/') ? <Film size={32} style={{ color: '#94a3b8' }} /> : <FileText size={32} style={{ color: '#94a3b8' }} />}
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100" style={{ background: 'rgba(15,23,42,0.6)', transition: 'opacity 0.2s ease' }}>
                  <button onClick={() => copyUrl(item)} title="Copy Image URL" style={{ background: 'none', border: 'none', color: '#4ade80', cursor: 'pointer' }}><Copy size={18} /></button>
                  <button onClick={() => openEditor(item)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><Eye size={18} /></button>
                  <button onClick={() => void remove(item)} style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer' }}><Trash2 size={18} /></button>
                </div>
              </div>
              <div className="p-3">
                <div style={{ fontSize: 12, fontWeight: 500, color: '#0f172a' }} className="truncate">{item.file_name}</div>
                <div className="flex items-center justify-between mt-1">
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>{(item.file_size / (1024 * 1024)).toFixed(1)} MB</span>
                  {item.usage_count > 0 && <span style={{ fontSize: 10, background: '#f0fdf4', color: '#16a34a', padding: '1px 6px', borderRadius: 99 }}>Used in {item.usage_count}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border" style={{ background: '#fff', borderColor: 'rgba(15,23,42,0.08)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['File', 'Type', 'Size', 'Used In', 'Actions'].map(header => (
                  <th key={header} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.05em' }}>{header.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginate(filtered).map(item => (
                <tr key={item.id} style={{ borderTop: '1px solid rgba(15,23,42,0.05)' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div className="flex items-center gap-3">
                      {item.mime_type.startsWith('image/') ? (
                        <img src={`${import.meta.env.VITE_SUPABASE_URL ?? ''}/storage/v1/object/public/${item.storage_bucket}/${item.file_path}`} alt={item.alt_text ?? item.file_name} style={{ width: 36, height: 28, objectFit: 'cover', borderRadius: 4 }} />
                      ) : (
                        <div className="rounded flex items-center justify-center" style={{ width: 36, height: 28, background: '#f1f5f9' }}>
                          {item.mime_type.startsWith('video/') ? <Film size={14} style={{ color: '#94a3b8' }} /> : <FileText size={14} style={{ color: '#94a3b8' }} />}
                        </div>
                      )}
                      <span style={{ fontSize: 13, color: '#0f172a', fontWeight: 500 }}>{item.file_name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748b' }}>{item.mime_type}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748b' }}>{(item.file_size / (1024 * 1024)).toFixed(1)} MB</td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: item.usage_count > 0 ? '#16a34a' : '#94a3b8' }}>{item.usage_count > 0 ? `${item.usage_count} articles` : 'Unused'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div className="flex items-center gap-2">
                      <button onClick={() => copyUrl(item)} title="Copy URL" style={{ color: '#16a34a', background: 'none', border: 'none', cursor: 'pointer' }}><Copy size={15} /></button>
                      <button onClick={() => openEditor(item)} style={{ color: '#0891b2', background: 'none', border: 'none', cursor: 'pointer' }}><Eye size={15} /></button>
                      <button onClick={() => void remove(item)} style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination total={filtered.length} page={page} perPage={perPage} onPageChange={setPage} onPerPageChange={setPerPage} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Media Details</DialogTitle>
            <DialogDescription>Update metadata for this uploaded asset.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {activeItem && (
              <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Public URL</div>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={getPublicUrl(activeItem)}
                    className="flex-1 text-xs text-gray-700 bg-white border border-gray-200 rounded px-2 py-1.5 truncate"
                    onClick={e => (e.target as HTMLInputElement).select()}
                  />
                  <Button size="sm" variant="outline" className="shrink-0 h-8 px-3 text-xs" onClick={() => copyUrl(activeItem)}>
                    <Copy className="h-3 w-3 mr-1" /> Copy
                  </Button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Use this URL in the article "Featured Image URL" field</p>
              </div>
            )}
            <Input value={form.alt_text} onChange={event => setForm(current => ({ ...current, alt_text: event.target.value }))} placeholder="Alt text" />
            <Textarea value={form.caption} onChange={event => setForm(current => ({ ...current, caption: event.target.value }))} placeholder="Caption" className="min-h-28" />
            <button
              onClick={() => setForm(current => ({ ...current, is_featured: !current.is_featured }))}
              className="rounded-xl border px-4 py-3 text-left"
              style={{ background: form.is_featured ? '#fef2f2' : '#fff' }}
            >
              <div className="text-sm font-medium text-gray-900">Featured asset</div>
              <div className="text-xs text-gray-500">Use this media in spotlight and banner placements.</div>
            </button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={saveMetadata} disabled={saving}>{saving ? 'Saving...' : 'Save Media'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
