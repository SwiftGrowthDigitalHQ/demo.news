import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle, Edit2, Plus, RefreshCw, Search, TrendingUp, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { listSeoSettings, markAuditLog, upsertSeoSetting } from '../../lib/admin';

type SeoForm = {
  id?: string;
  page_path: string;
  meta_title: string;
  meta_description: string;
  og_title: string;
  og_description: string;
  twitter_title: string;
  twitter_description: string;
  canonical_url: string;
  is_indexed: boolean;
  schema_json: string;
};

const emptyForm: SeoForm = {
  page_path: '/',
  meta_title: '',
  meta_description: '',
  og_title: '',
  og_description: '',
  twitter_title: '',
  twitter_description: '',
  canonical_url: '',
  is_indexed: true,
  schema_json: '{}',
};

// Pre-defined page routes for easy selection
const COMMON_PAGES = [
  { path: '/', label: 'Homepage' },
  { path: '/category/:slug', label: 'Category Page' },
  { path: '/article/:slug', label: 'Article Page' },
  { path: '/search', label: 'Search Page' },
  { path: '/reporters', label: 'Reporters Page' },
  { path: '/about', label: 'About Page' },
  { path: '/contact', label: 'Contact Page' },
];

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-gray-600 mb-1">{children}</label>;
}

export function SEOManagement() {
  const [items, setItems] = useState<Awaited<ReturnType<typeof listSeoSettings>>>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<SeoForm>(emptyForm);

  const load = async () => {
    setLoading(true);
    try {
      setItems(await listSeoSettings());
    } catch (loadError) {
      toast.error(loadError instanceof Error ? loadError.message : 'Failed to load SEO settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(
    () => items.filter(item => item.page_path.toLowerCase().includes(search.toLowerCase()) || (item.meta_title ?? '').toLowerCase().includes(search.toLowerCase())),
    [items, search],
  );

  const edit = (item?: (typeof items)[number]) => {
    setForm(item ? {
      id: item.id,
      page_path: item.page_path,
      meta_title: item.meta_title ?? '',
      meta_description: item.meta_description ?? '',
      og_title: item.og_title ?? '',
      og_description: item.og_description ?? '',
      twitter_title: item.twitter_title ?? '',
      twitter_description: item.twitter_description ?? '',
      canonical_url: item.canonical_url ?? '',
      is_indexed: item.is_indexed,
      schema_json: JSON.stringify(item.schema_json ?? {}, null, 2),
    } : emptyForm);
    setOpen(true);
  };

  // Auto-fill OG and Twitter from meta if empty
  const autoFill = () => {
    setForm(current => ({
      ...current,
      og_title: current.og_title || current.meta_title,
      og_description: current.og_description || current.meta_description,
      twitter_title: current.twitter_title || current.meta_title,
      twitter_description: current.twitter_description || current.meta_description,
    }));
    toast.success('Auto-filled OG & Twitter from Meta fields!');
  };

  const save = async () => {
    if (!form.page_path.trim()) {
      toast.error('Page path is required.');
      return;
    }

    setSaving(true);
    try {
      const saved = await upsertSeoSetting({
        id: form.id,
        page_path: form.page_path.trim(),
        meta_title: form.meta_title.trim() || null,
        meta_description: form.meta_description.trim() || null,
        og_title: form.og_title.trim() || null,
        og_description: form.og_description.trim() || null,
        twitter_title: form.twitter_title.trim() || null,
        twitter_description: form.twitter_description.trim() || null,
        canonical_url: form.canonical_url.trim() || null,
        is_indexed: form.is_indexed,
        schema_json: form.schema_json ? JSON.parse(form.schema_json) : {},
      });
      await markAuditLog({
        action: form.id ? 'seo.updated' : 'seo.created',
        entity_type: 'seo_settings',
        entity_id: (saved as { id?: string }).id ?? form.id ?? null,
        metadata: { page_path: form.page_path },
      });
      toast.success(form.id ? 'SEO updated!' : 'SEO entry created!');
      setOpen(false);
      await load();
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-gray-500">Loading SEO settings...</div>;
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'SEO Score', value: '82/100', color: '#16a34a' },
          { label: 'Pages Configured', value: String(items.length), color: '#7c3aed' },
          { label: 'Indexed Pages', value: String(items.filter(i => i.is_indexed).length), color: '#dc2626' },
          { label: 'Not Indexed', value: String(items.filter(i => !i.is_indexed).length), color: '#f59e0b' },
        ].map((s, i) => (
          <div key={i} className="rounded-xl border border-gray-100 bg-white p-4">
            <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search & Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search pages..." className="pl-10" />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className="h-3.5 w-3.5" /> Reload
          </Button>
          <Button className="bg-red-600 hover:bg-red-700" size="sm" onClick={() => edit()}>
            <Plus className="h-3.5 w-3.5" /> New SEO Entry
          </Button>
        </div>
      </div>

      {/* Page List */}
      <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            No SEO entries yet. Click "New SEO Entry" to add one.
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map(item => (
              <div key={item.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-gray-900 truncate">{item.meta_title || item.page_path}</span>
                    <Badge variant={item.is_indexed ? 'default' : 'secondary'} className="text-[10px] shrink-0">
                      {item.is_indexed ? '✓ Indexed' : '✗ Noindex'}
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{item.page_path}</div>
                  {item.meta_description && (
                    <div className="text-xs text-gray-500 mt-1 truncate max-w-lg">{item.meta_description}</div>
                  )}
                </div>
                <button
                  onClick={() => edit(item)}
                  className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 px-3 py-1.5 rounded-lg border border-purple-100 hover:bg-purple-50 transition-colors"
                >
                  <Edit2 size={12} /> Edit
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Tips */}
      <div className="rounded-xl border border-gray-100 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-red-600" /> Quick Tips
        </h3>
        <div className="grid gap-2 text-xs text-gray-600">
          <div className="flex items-start gap-2">
            <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
            <span>Meta title 50-60 characters mein rakho for best results</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
            <span>Meta description 150-160 characters — short & meaningful</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
            <span>"Auto-fill" button se OG & Twitter fields automatically copy honge Meta se</span>
          </div>
        </div>
      </div>

      {/* Dialog Form */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Edit SEO' : 'New SEO Entry'}</DialogTitle>
            <DialogDescription>Page ka SEO metadata set karo. OG & Twitter auto-fill ho sakta hai.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Page Path */}
            <div>
              <FieldLabel>Page Path *</FieldLabel>
              <div className="flex gap-2">
                <Input
                  value={form.page_path}
                  onChange={e => setForm(c => ({ ...c, page_path: e.target.value }))}
                  placeholder="/article/my-story"
                  className="flex-1"
                />
                <select
                  onChange={e => { if (e.target.value) setForm(c => ({ ...c, page_path: e.target.value })); }}
                  className="text-xs border border-gray-200 rounded-md px-2 text-gray-600"
                  defaultValue=""
                >
                  <option value="" disabled>Quick select</option>
                  {COMMON_PAGES.map(p => (
                    <option key={p.path} value={p.path}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Meta Title & Description */}
            <div className="rounded-lg border border-gray-100 p-3 space-y-3">
              <div className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Meta (Google Search)</div>
              <div>
                <FieldLabel>Title ({form.meta_title.length}/60)</FieldLabel>
                <Input
                  value={form.meta_title}
                  onChange={e => setForm(c => ({ ...c, meta_title: e.target.value }))}
                  placeholder="Page ka title — Google mein dikhega"
                  maxLength={70}
                />
              </div>
              <div>
                <FieldLabel>Description ({form.meta_description.length}/160)</FieldLabel>
                <Textarea
                  value={form.meta_description}
                  onChange={e => setForm(c => ({ ...c, meta_description: e.target.value }))}
                  placeholder="Short description — search results mein dikhegi"
                  className="min-h-16"
                  maxLength={200}
                />
              </div>
            </div>

            {/* Auto-fill button */}
            <Button type="button" variant="outline" size="sm" onClick={autoFill} className="w-full">
              ✨ Auto-fill OG & Twitter from Meta
            </Button>

            {/* OG & Twitter (collapsible feel) */}
            <div className="rounded-lg border border-gray-100 p-3 space-y-3">
              <div className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Social Sharing (OG & Twitter)</div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <FieldLabel>OG Title</FieldLabel>
                  <Input
                    value={form.og_title}
                    onChange={e => setForm(c => ({ ...c, og_title: e.target.value }))}
                    placeholder="Facebook/WhatsApp title"
                  />
                </div>
                <div>
                  <FieldLabel>Twitter Title</FieldLabel>
                  <Input
                    value={form.twitter_title}
                    onChange={e => setForm(c => ({ ...c, twitter_title: e.target.value }))}
                    placeholder="Twitter card title"
                  />
                </div>
              </div>
              <div>
                <FieldLabel>OG Description</FieldLabel>
                <Textarea
                  value={form.og_description}
                  onChange={e => setForm(c => ({ ...c, og_description: e.target.value }))}
                  placeholder="Facebook/WhatsApp description"
                  className="min-h-14"
                />
              </div>
              <div>
                <FieldLabel>Twitter Description</FieldLabel>
                <Textarea
                  value={form.twitter_description}
                  onChange={e => setForm(c => ({ ...c, twitter_description: e.target.value }))}
                  placeholder="Twitter card description"
                  className="min-h-14"
                />
              </div>
            </div>

            {/* Settings */}
            <div className="rounded-lg border border-gray-100 p-3 space-y-3">
              <div className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Settings</div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <FieldLabel>Canonical URL</FieldLabel>
                  <Input
                    value={form.canonical_url}
                    onChange={e => setForm(c => ({ ...c, canonical_url: e.target.value }))}
                    placeholder="https://buxarnews.com/..."
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
                  <div>
                    <div className="text-sm font-medium text-gray-900">Index this page</div>
                    <div className="text-[10px] text-gray-500">Google search mein dikhana hai?</div>
                  </div>
                  <Switch checked={form.is_indexed} onCheckedChange={v => setForm(c => ({ ...c, is_indexed: v }))} />
                </div>
              </div>
              <div>
                <FieldLabel>Schema JSON (Advanced)</FieldLabel>
                <Textarea
                  value={form.schema_json}
                  onChange={e => setForm(c => ({ ...c, schema_json: e.target.value }))}
                  placeholder='{"@context": "https://schema.org", ...}'
                  className="min-h-20 font-mono text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={save} disabled={saving}>
              {saving ? 'Saving...' : 'Save SEO'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
