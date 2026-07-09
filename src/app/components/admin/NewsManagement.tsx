import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  CheckCircle,
  Clock,
  Edit2,
  Eye,
  Filter,
  Plus,
  Radio,
  Search,
  Star,
  Trash2,
  XCircle,
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import {
  AdminArticle,
  AdminUser,
  deleteAdminArticle,
  listAdminArticles,
  listAdminCategories,
  listAdminUsers,
  markAuditLog,
  setArticleStatus,
  upsertAdminArticle,
} from '../../lib/admin';

const statusConfig = {
  published: { label: 'Published', color: '#16a34a', bg: '#f0fdf4', icon: CheckCircle },
  draft: { label: 'Draft', color: '#64748b', bg: '#f8fafc', icon: Clock },
  scheduled: { label: 'Scheduled', color: '#0891b2', bg: '#ecfeff', icon: Clock },
  review: { label: 'Review', color: '#f59e0b', bg: '#fffbeb', icon: Clock },
  archived: { label: 'Archived', color: '#dc2626', bg: '#fef2f2', icon: XCircle },
} as const;

type ArticleFormState = {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category_id: string;
  author_id: string;
  status: AdminArticle['status'];
  featured_image: string;
  media_type: string;
  video_url: string;
  seo_title: string;
  seo_description: string;
  tags: string;
  publish_at: string;
  read_time: string;
  featured: boolean;
  trending: boolean;
  breaking: boolean;
};

const emptyForm: ArticleFormState = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  category_id: '',
  author_id: '',
  status: 'draft',
  featured_image: '',
  media_type: 'article',
  video_url: '',
  seo_title: '',
  seo_description: '',
  tags: '',
  publish_at: '',
  read_time: '',
  featured: false,
  trending: false,
  breaking: false,
};

function toFormState(article: AdminArticle): ArticleFormState {
  return {
    id: article.id,
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt,
    content: article.content.join('\n\n'),
    category_id: article.category_id,
    author_id: '',
    status: article.status,
    featured_image: article.featured_image ?? '',
    media_type: article.media_type ?? 'article',
    video_url: article.video_url ?? '',
    seo_title: article.seo_title ?? '',
    seo_description: article.seo_description ?? '',
    tags: article.tags.join(', '),
    publish_at: article.publish_at ?? '',
    read_time: article.read_time ?? '',
    featured: article.featured,
    trending: article.trending,
    breaking: article.breaking,
  };
}

function formatDate(value: string | null) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function NewsManagement() {
  const [articles, setArticles] = useState<AdminArticle[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState('All');
  const [activeStatus, setActiveStatus] = useState('All');
  const [newsPage, setNewsPage] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editor, setEditor] = useState<ArticleFormState>(emptyForm);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [articleRows, categoryRows, userRows] = await Promise.all([
        listAdminArticles(),
        listAdminCategories(),
        listAdminUsers(),
      ]);
      setArticles(articleRows);
      setCategories(categoryRows);
      setUsers(userRows);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load articles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    setNewsPage(0); // Reset page on filter change
    return articles.filter(article => {
      const matchSearch =
        article.title.toLowerCase().includes(search.toLowerCase()) ||
        article.excerpt.toLowerCase().includes(search.toLowerCase()) ||
        article.author_name.toLowerCase().includes(search.toLowerCase());
      const matchCat = activeCat === 'All' || article.category_slug === activeCat || article.category_name === activeCat;
      const matchStatus = activeStatus === 'All' || article.status === activeStatus;
      return matchSearch && matchCat && matchStatus;
    });
  }, [activeCat, activeStatus, articles, search]);

  const stats = useMemo(() => {
    const published = articles.filter(article => article.status === 'published').length;
    const draft = articles.filter(article => article.status === 'draft').length;
    const review = articles.filter(article => article.status === 'review').length;
    return [
      { label: 'Total Articles', value: String(articles.length), color: '#dc2626' },
      { label: 'Published', value: String(published), color: '#16a34a' },
      { label: 'Pending Review', value: String(review), color: '#f59e0b' },
      { label: 'Drafts', value: String(draft), color: '#64748b' },
    ];
  }, [articles]);

  const openCreate = () => {
    setEditor(emptyForm);
    setEditorOpen(true);
  };

  const openEdit = (article: AdminArticle) => {
    setEditor(toFormState(article));
    setEditorOpen(true);
  };

  const saveArticle = async () => {
    if (!editor.title.trim() || !editor.slug.trim() || !editor.category_id) {
      toast.error('Title, slug, and category are required.');
      return;
    }

    setSaving(true);
    try {
      const saved = await upsertAdminArticle({
        id: editor.id,
        title: editor.title.trim(),
        slug: editor.slug.trim(),
        excerpt: editor.excerpt.trim(),
        content: editor.content
          .split('\n')
          .map(part => part.trim())
          .filter(Boolean),
        category_id: editor.category_id,
        author_id: editor.author_id || null,
        status: editor.status,
        featured_image: editor.featured_image || null,
        media_type: editor.media_type,
        video_url: editor.video_url || null,
        seo_title: editor.seo_title || null,
        seo_description: editor.seo_description || null,
        tags: editor.tags
          .split(',')
          .map(tag => tag.trim())
          .filter(Boolean),
        publish_at: editor.publish_at || null,
        read_time: editor.read_time || null,
        featured: editor.featured,
        trending: editor.trending,
        breaking: editor.breaking,
      });

      await markAuditLog({
        action: editor.id ? 'article.updated' : 'article.created',
        entity_type: 'articles',
        entity_id: (saved as { id?: string }).id ?? editor.id ?? null,
        metadata: { title: editor.title, status: editor.status },
      });

      toast.success(editor.id ? 'Article updated.' : 'Article created.');
      setEditorOpen(false);
      await load();
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : 'Failed to save article.');
    } finally {
      setSaving(false);
    }
  };

  const removeArticle = async (article: AdminArticle) => {
    if (!confirm(`Delete "${article.title}"?`)) return;
    try {
      await deleteAdminArticle(article.id);
      await markAuditLog({
        action: 'article.deleted',
        entity_type: 'articles',
        entity_id: article.id,
        metadata: { title: article.title },
      });
      toast.success('Article deleted.');
      await load();
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : 'Failed to delete article.');
    }
  };

  const changeStatus = async (article: AdminArticle, status: AdminArticle['status']) => {
    try {
      await setArticleStatus(article.id, status);
      await markAuditLog({
        action: `article.${status}`,
        entity_type: 'articles',
        entity_id: article.id,
        metadata: { title: article.title, status },
      });
      toast.success(`Article marked as ${status}.`);
      await load();
    } catch (statusError) {
      toast.error(statusError instanceof Error ? statusError.message : 'Failed to update article status.');
    }
  };

  const categoryTabs = ['All', ...categories.map(category => category.name)];

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="h-8 w-20 animate-pulse rounded bg-slate-100" />
                <div className="mt-2 h-4 w-28 animate-pulse rounded bg-slate-100" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
          Loading articles...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {error}
        </div>
        <Button className="w-fit bg-red-600 hover:bg-red-700" onClick={() => void load()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="grid gap-4 md:grid-cols-4">
        {stats.map(item => (
          <Card key={item.label}>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-gray-900" style={{ color: item.color }}>{item.value}</div>
              <div className="text-sm text-gray-500">{item.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-gray-200 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative flex-1 lg:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search articles..." className="pl-10" />
            </div>
            <Select value={activeStatus} onValueChange={setActiveStatus}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Status</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="bg-red-600 hover:bg-red-700" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New Article
          </Button>
        </div>

        <div className="flex gap-2 overflow-x-auto border-b border-gray-200 px-4 py-3">
          {categoryTabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveCat(tab)}
              className="whitespace-nowrap rounded-full px-4 py-1.5 text-sm"
              style={{
                background: activeCat === tab ? '#dc2626' : '#f8fafc',
                color: activeCat === tab ? '#fff' : '#64748b',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: '10px 16px', textAlign: 'left' }}>
                  <input
                    type="checkbox"
                    checked={selected.length === filtered.length && filtered.length > 0}
                    onChange={() => setSelected(selected.length === filtered.length ? [] : filtered.map(article => article.id))}
                  />
                </th>
                {['Title', 'Category', 'Author', 'Status', 'Views', 'Updated', 'Actions'].map(label => (
                  <th key={label} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.05em' }}>
                    {label.toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '24px 16px', textAlign: 'center', color: '#64748b' }}>
                    No articles match the current filters.
                  </td>
                </tr>
              ) : (
                filtered.slice(newsPage * 10, (newsPage + 1) * 10).map(article => {
                  const config = statusConfig[article.status] ?? statusConfig.draft;
                  const StatusIcon = config.icon;
                  return (
                    <tr
                      key={article.id}
                      style={{
                        borderTop: '1px solid rgba(15,23,42,0.05)',
                        background: selected.includes(article.id) ? '#fef2f2' : 'transparent',
                      }}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <input
                          type="checkbox"
                          checked={selected.includes(article.id)}
                          onChange={() => setSelected(current => current.includes(article.id) ? current.filter(id => id !== article.id) : [...current, article.id])}
                        />
                      </td>
                      <td style={{ padding: '12px 16px', maxWidth: 300 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#0f172a', lineHeight: 1.3 }} className="line-clamp-2">
                          {article.title}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {article.featured && <Badge className="gap-1 bg-amber-500 text-white"><Star size={10} /> Featured</Badge>}
                          {article.breaking && <Badge className="gap-1 bg-red-600 text-white"><Radio size={10} /> Breaking</Badge>}
                          {article.trending && <Badge variant="secondary">Trending</Badge>}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: 11, background: '#fef2f2', color: '#dc2626', padding: '2px 8px', borderRadius: 99, fontWeight: 500 }}>
                          {article.category_name}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748b', whiteSpace: 'nowrap' }}>
                        {article.author_name}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          className="flex w-fit items-center gap-1 rounded-full px-2 py-1 text-xs font-medium"
                          style={{ background: config.bg, color: config.color }}
                        >
                          <StatusIcon size={10} />
                          {config.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748b', whiteSpace: 'nowrap' }}>
                        {article.views_count > 0 ? article.views_count.toLocaleString('en-IN') : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                        {formatDate(article.updated_at)}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEdit(article)} style={{ color: '#7c3aed', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                            <Edit2 size={15} />
                          </button>
                          <button onClick={() => void changeStatus(article, 'published')} style={{ color: '#16a34a', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                            <CheckCircle size={15} />
                          </button>
                          <button onClick={() => void removeArticle(article)} style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          {/* Pagination */}
          {filtered.length > 10 && (() => {
            const totalPages = Math.ceil(filtered.length / 10);
            return (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <span className="text-xs text-gray-500">Showing {newsPage * 10 + 1}–{Math.min((newsPage + 1) * 10, filtered.length)} of {filtered.length}</span>
                <div className="flex items-center gap-1.5">
                  <button type="button" onClick={() => setNewsPage(p => Math.max(0, p - 1))} disabled={newsPage === 0}
                    className="px-2.5 py-1 rounded border border-gray-200 text-xs font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">← Prev</button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const pn = totalPages <= 5 ? i : Math.min(Math.max(newsPage - 2, 0), totalPages - 5) + i;
                    return (
                      <button key={pn} type="button" onClick={() => setNewsPage(pn)}
                        className={`w-7 h-7 rounded text-[10px] font-bold transition-colors ${pn === newsPage ? 'bg-red-600 text-white' : 'border border-gray-200 text-gray-600 hover:bg-red-50'}`}>{pn + 1}</button>
                    );
                  })}
                  <button type="button" onClick={() => setNewsPage(p => Math.min(totalPages - 1, p + 1))} disabled={newsPage === totalPages - 1}
                    className="px-2.5 py-1 rounded border border-gray-200 text-xs font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Next →</button>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editor.id ? 'Edit Article' : 'Create Article'}</DialogTitle>
            <DialogDescription>Save article content directly to Supabase.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 md:grid-cols-2">
            <Input value={editor.title} onChange={event => setEditor(current => ({ ...current, title: event.target.value, slug: current.slug || event.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }))} placeholder="Headline" />
            <Input value={editor.slug} onChange={event => setEditor(current => ({ ...current, slug: event.target.value }))} placeholder="Slug" />
            <Select value={editor.category_id} onValueChange={value => setEditor(current => ({ ...current, category_id: value }))}>
              <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={editor.author_id} onValueChange={value => setEditor(current => ({ ...current, author_id: value }))}>
              <SelectTrigger><SelectValue placeholder="Author" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">No author</SelectItem>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>{user.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={editor.status} onValueChange={value => setEditor(current => ({ ...current, status: value as AdminArticle['status'] }))}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select value={editor.media_type} onValueChange={value => setEditor(current => ({ ...current, media_type: value }))}>
              <SelectTrigger><SelectValue placeholder="Media type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="article">Article</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="gallery">Gallery</SelectItem>
              </SelectContent>
            </Select>
            <Input value={editor.featured_image} onChange={event => setEditor(current => ({ ...current, featured_image: event.target.value }))} placeholder="Image URL (direct .jpg/.png link OR upload to Media Library)" />
            <Input value={editor.video_url} onChange={event => setEditor(current => ({ ...current, video_url: event.target.value }))} placeholder="YouTube Video URL (e.g. https://youtu.be/xxxxx)" />
            <Input value={editor.seo_title} onChange={event => setEditor(current => ({ ...current, seo_title: event.target.value }))} placeholder="SEO title" />
            <Input value={editor.seo_description} onChange={event => setEditor(current => ({ ...current, seo_description: event.target.value }))} placeholder="SEO description" />
            <Input value={editor.read_time} onChange={event => setEditor(current => ({ ...current, read_time: event.target.value }))} placeholder="Read time, e.g. 4 min read" />
            <Input value={editor.publish_at} onChange={event => setEditor(current => ({ ...current, publish_at: event.target.value }))} placeholder="Publish date/time" />
          </div>

          <div className="grid gap-4">
            <Textarea value={editor.excerpt} onChange={event => setEditor(current => ({ ...current, excerpt: event.target.value }))} placeholder="Article excerpt" className="min-h-24" />
            <Textarea value={editor.content} onChange={event => setEditor(current => ({ ...current, content: event.target.value }))} placeholder="Write article body here. Each paragraph on a new line.&#10;&#10;Paragraph 1 content goes here...&#10;&#10;Paragraph 2 content goes here...&#10;&#10;Paragraph 3 content goes here..." className="min-h-48" />
            <Textarea value={editor.tags} onChange={event => setEditor(current => ({ ...current, tags: event.target.value }))} placeholder="Tags separated by commas" className="min-h-24" />

            <div className="grid gap-3 md:grid-cols-3">
              {[
                { key: 'featured', label: 'Featured' },
                { key: 'trending', label: 'Trending' },
                { key: 'breaking', label: 'Breaking' },
              ].map(item => (
                <button
                  key={item.key}
                  onClick={() => setEditor(current => ({ ...current, [item.key]: !current[item.key as keyof ArticleFormState] }))}
                  className="rounded-xl border px-4 py-3 text-left"
                  style={{ background: editor[item.key as keyof ArticleFormState] ? '#fef2f2' : '#fff', borderColor: 'rgba(15,23,42,0.08)' }}
                >
                  <div className="text-sm font-medium text-gray-900">{item.label}</div>
                  <div className="text-xs text-gray-500">Toggle on or off for this article.</div>
                </button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={saveArticle} disabled={saving}>
              {saving ? 'Saving...' : 'Save Article'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
