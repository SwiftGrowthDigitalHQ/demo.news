import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getSupabaseClient } from '../../lib/supabase';
import { useCms, type PublicArticle } from '../lib/cms';
import { useAppNavigation } from '../lib/navigation';
import { ArticleCard } from '../components/ArticleCard';
import { Mail, Twitter, Facebook, Instagram, Linkedin } from 'lucide-react';
import { ImageWithFallback } from '../components/ImageWithFallback';

type Reporter = {
  id: string;
  full_name: string;
  slug: string;
  bio: string | null;
  specialty: string | null;
  avatar_url: string | null;
  social_links: Record<string, string>;
  user_id: string | null;
};

export function ReporterPage() {
  const { slug } = useParams<{ slug: string }>();
  const { tenantId } = useCms();
  const { navigate } = useAppNavigation();
  const [reporter, setReporter] = useState<Reporter | null>(null);
  const [articles, setArticles] = useState<PublicArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetchReporter() {
      if (!slug || !tenantId) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        const client = getSupabaseClient();
        if (!client) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        // Fetch reporter - MUST filter by both tenant_id AND slug for security
        const { data: reporterData, error: reporterError } = await client
          .from('reporters')
          .select('id, full_name, slug, bio, specialty, avatar_url, social_links, user_id, status')
          .eq('tenant_id', tenantId)
          .eq('slug', slug)
          .eq('status', 'active')
          .is('deleted_at', null)
          .single();

        if (reporterError || !reporterData) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        setReporter(reporterData as Reporter);

        // Fetch articles by this reporter - MUST filter by tenant_id
        // Try both: articles where author_id matches reporter's user_id
        // AND articles table direct query
        let reporterArticles: PublicArticle[] = [];

        if (reporterData.user_id) {
          const { data: articlesData, error: articlesError } = await client
            .from('articles')
            .select(`
              id,
              slug,
              title,
              excerpt,
              content,
              category_id,
              featured_image,
              media_type,
              video_url,
              seo_title,
              seo_description,
              status,
              featured,
              trending,
              breaking,
              publish_at,
              read_time,
              views_count,
              category:categories!articles_category_id_fkey(id, name, slug),
              author:users!articles_author_id_fkey(
                id,
                full_name,
                role:roles(slug, name)
              ),
              tags:article_tags(tag)
            `)
            .eq('tenant_id', tenantId)
            .eq('author_id', reporterData.user_id)
            .eq('status', 'published')
            .is('deleted_at', null)
            .order('publish_at', { ascending: false, nullsFirst: false })
            .limit(50);

          if (!articlesError && articlesData) {
            reporterArticles = articlesData.map((row: any) => {
              const category = Array.isArray(row.category) ? row.category[0] : row.category;
              const author = Array.isArray(row.author) ? row.author[0] : row.author;
              const role = Array.isArray(author?.role) ? author.role[0] : author?.role;

              let contentArray: string[] = [];
              if (Array.isArray(row.content)) {
                contentArray = row.content.map((item: any) => String(item));
              } else if (typeof row.content === 'string') {
                try {
                  const parsed = JSON.parse(row.content);
                  contentArray = Array.isArray(parsed) ? parsed.map((item: any) => String(item)) : [row.content];
                } catch {
                  contentArray = [row.content];
                }
              }

              const tags = Array.isArray(row.tags)
                ? row.tags
                    .map((tag: any) => {
                      if (typeof tag === 'string') return tag;
                      if (tag && typeof tag === 'object' && 'tag' in tag) {
                        return String(tag.tag ?? '');
                      }
                      return '';
                    })
                    .filter(Boolean)
                : [];

              return {
                id: String(row.id),
                slug: String(row.slug),
                title: String(row.title),
                excerpt: String(row.excerpt),
                content: contentArray,
                category_id: String(row.category_id),
                category_name: String(category?.name ?? 'News'),
                category_slug: String(category?.slug ?? 'news'),
                author_name: String(author?.full_name ?? reporterData.full_name),
                author_role: String(role?.name ?? reporterData.specialty ?? 'Reporter'),
                publish_at: typeof row.publish_at === 'string' ? row.publish_at : null,
                read_time: typeof row.read_time === 'string' ? row.read_time : null,
                featured_image: typeof row.featured_image === 'string' ? row.featured_image : null,
                media_type: String(row.media_type ?? 'article'),
                video_url: typeof row.video_url === 'string' ? row.video_url : null,
                seo_title: typeof row.seo_title === 'string' ? row.seo_title : null,
                seo_description: typeof row.seo_description === 'string' ? row.seo_description : null,
                featured: Boolean(row.featured),
                trending: Boolean(row.trending),
                breaking: Boolean(row.breaking),
                views_count: Number(row.views_count ?? 0),
                tags,
              };
            });
          }
        }

        setArticles(reporterArticles);
      } catch (error) {
        console.error('[ReporterPage] Error fetching reporter:', error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    void fetchReporter();
  }, [slug, tenantId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading reporter profile...</p>
        </div>
      </div>
    );
  }

  if (notFound || !reporter) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">👤</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Reporter Not Found</h1>
          <p className="text-gray-600 mb-6">
            The reporter profile you're looking for doesn't exist or has been removed.
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const initials = reporter.full_name
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Reporter Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {reporter.avatar_url ? (
                <ImageWithFallback
                  src={reporter.avatar_url}
                  alt={reporter.full_name}
                  className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-red-100"
                />
              ) : (
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white text-3xl md:text-4xl font-bold border-4 border-red-100">
                  {initials}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                {reporter.full_name}
              </h1>
              {reporter.specialty && (
                <p className="text-lg text-red-600 font-semibold mb-3">{reporter.specialty}</p>
              )}
              {reporter.bio && (
                <p className="text-gray-600 leading-relaxed max-w-3xl">{reporter.bio}</p>
              )}

              {/* Social Links */}
              {reporter.social_links && Object.keys(reporter.social_links).length > 0 && (
                <div className="flex items-center gap-3 mt-4">
                  {reporter.social_links.email && (
                    <a
                      href={`mailto:${reporter.social_links.email}`}
                      className="text-gray-600 hover:text-red-600 transition-colors"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Mail size={20} />
                    </a>
                  )}
                  {reporter.social_links.twitter && (
                    <a
                      href={reporter.social_links.twitter}
                      className="text-gray-600 hover:text-red-600 transition-colors"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Twitter size={20} />
                    </a>
                  )}
                  {reporter.social_links.facebook && (
                    <a
                      href={reporter.social_links.facebook}
                      className="text-gray-600 hover:text-red-600 transition-colors"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Facebook size={20} />
                    </a>
                  )}
                  {reporter.social_links.instagram && (
                    <a
                      href={reporter.social_links.instagram}
                      className="text-gray-600 hover:text-red-600 transition-colors"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Instagram size={20} />
                    </a>
                  )}
                  {reporter.social_links.linkedin && (
                    <a
                      href={reporter.social_links.linkedin}
                      className="text-gray-600 hover:text-red-600 transition-colors"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Linkedin size={20} />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Articles Section */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Stories by {reporter.full_name}
          <span className="text-gray-500 font-normal ml-2">({articles.length})</span>
        </h2>

        {articles.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No stories yet</h3>
            <p className="text-gray-600">
              {reporter.full_name} hasn't published any stories yet. Check back soon!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map(article => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
