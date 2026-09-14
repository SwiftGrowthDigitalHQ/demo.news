import { useEffect, useMemo } from 'react';
import { Clock, Eye, User } from 'lucide-react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { AppLink, getArticleUrl } from '../lib/navigation';
import { useCms, type PublicArticle } from '../lib/cms';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '../components/ui/pagination';
import { trackAnalyticsEvent } from '../lib/admin';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { getArticleThumbnail } from '../lib/articleImage';
import { SmartAd } from '../components/SmartAd';
import { useAppNavigation } from '../lib/navigation';
import { useOlderPosts } from '../lib/useOlderPosts';

/** Get the best thumbnail for an article */
function thumb(a: PublicArticle): string {
  return getArticleThumbnail(a.featured_image, a.video_url);
}

function getRelativeTime(dateString: string | null): string {
  if (!dateString) return 'Just now';
  const diffMs = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

function formatViews(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return String(count);
}

export function OlderPostsPage() {
  const { search } = useAppNavigation();
  const { tenantSlug } = useCms();
  const page = Math.max(1, Number(new URLSearchParams(search).get('page') ?? '1') || 1);
  const pageSize = 12;

  useEffect(() => {
    void trackAnalyticsEvent({
      event_type: 'page_view',
      page_path: '/older-posts',
      metadata: { page: 'older-posts' },
    }).catch(() => {});
  }, []);

  // Fetch older posts directly from Supabase with larger limit for pagination
  const { olderPosts: olderArticles, loading } = useOlderPosts(100); // Fetch up to 100 posts for pagination

  const totalPages = Math.max(1, Math.ceil(olderArticles.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedResults = olderArticles.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  
  const pageUrl = (nextPage: number) => {
    const params = new URLSearchParams();
    if (nextPage > 1) params.set('page', String(nextPage));
    const next = params.toString();
    return next ? `/older-posts?${next}` : '/older-posts';
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <Header />

      <main className="max-w-[1400px] mx-auto px-4 py-6">
        {/* Page Header */}
        <section className="rounded-xl bg-white border border-gray-200 p-6 mb-6 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1 h-6 bg-red-600 rounded-full" />
            <h1 className="text-3xl font-bold text-gray-900">Older Posts</h1>
          </div>
          <p className="text-gray-600 mt-2">
            Browse through our archive of older news articles and stories
          </p>
          {!loading && (
            <div className="flex items-center gap-3 mt-3 text-sm text-gray-500">
              <span>{olderArticles.length} articles found</span>
              {page > 1 && <span>• Page {currentPage} of {totalPages}</span>}
            </div>
          )}
        </section>

        {/* Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6">
          {/* Main Content */}
          <div className="space-y-6">
            {/* Ad Banner */}
            <SmartAd placement="older_posts_top" />

            {loading ? (
              /* Loading skeleton */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-lg border border-gray-100 overflow-hidden animate-pulse">
                    <div className="aspect-[16/10] bg-gray-200" />
                    <div className="p-4 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                      <div className="h-3 bg-gray-200 rounded w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : pagedResults.length === 0 ? (
              <section className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
                <h2 className="text-2xl font-semibold text-gray-900">No older posts available</h2>
                <p className="text-gray-600 mt-2">Check back later for archived content.</p>
                <div className="mt-6">
                  <AppLink to="/" className="inline-block rounded-lg bg-red-600 px-6 py-3 text-white font-semibold hover:bg-red-700 transition-colors">
                    Go to Homepage
                  </AppLink>
                </div>
              </section>
            ) : (
              <>
                {/* Article Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {pagedResults.map(article => (
                    <AppLink
                      key={article.id}
                      to={getArticleUrl(article.slug, tenantSlug)}
                      className="bg-white rounded-lg border border-gray-100 overflow-hidden hover:shadow-md hover:border-red-200 transition-all group"
                    >
                      {/* Image */}
                      <div className="relative aspect-[16/10] overflow-hidden">
                        <ImageWithFallback
                          src={thumb(article)}
                          alt={article.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {article.category_name && (
                          <span className="absolute top-2 left-2 bg-red-600 text-white text-[9px] font-bold uppercase px-2 py-0.5 rounded shadow">
                            {article.category_name}
                          </span>
                        )}
                      </div>
                      {/* Content */}
                      <div className="p-4">
                        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-red-600 transition-colors mb-2 leading-snug">
                          {article.title}
                        </h3>
                        {article.excerpt && (
                          <p className="text-xs text-gray-600 line-clamp-2 mb-3">
                            {article.excerpt}
                          </p>
                        )}
                        <div className="flex items-center justify-between text-[10px] text-gray-400 border-t border-gray-100 pt-2">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {getRelativeTime(article.publish_at)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {formatViews(article.views_count)}
                          </span>
                        </div>
                        {article.author_name && (
                          <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-2">
                            <User className="h-3 w-3" />
                            {article.author_name}
                          </div>
                        )}
                      </div>
                    </AppLink>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            href={pageUrl(Math.max(1, currentPage - 1))}
                            aria-disabled={currentPage === 1}
                          />
                        </PaginationItem>
                        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                          let pageNumber: number;
                          if (totalPages <= 7) {
                            pageNumber = i + 1;
                          } else if (currentPage <= 4) {
                            pageNumber = i + 1;
                          } else if (currentPage >= totalPages - 3) {
                            pageNumber = totalPages - 6 + i;
                          } else {
                            pageNumber = currentPage - 3 + i;
                          }
                          return (
                            <PaginationItem key={pageNumber}>
                              <PaginationLink
                                href={pageUrl(pageNumber)}
                                isActive={pageNumber === currentPage}
                              >
                                {pageNumber}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        })}
                        <PaginationItem>
                          <PaginationNext
                            href={pageUrl(Math.min(totalPages, currentPage + 1))}
                            aria-disabled={currentPage === totalPages}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}

                {/* Mid Content Ad */}
                <SmartAd placement="older_posts_bottom" />
              </>
            )}
          </div>

          {/* Sidebar */}
          <aside className="hidden xl:block">
            <div className="sticky top-[72px] space-y-4">
              <SmartAd placement="sidebar_1" />
              
              {/* Quick Stats */}
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Archive Stats</h3>
                <div className="space-y-2 text-xs text-gray-600">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span>Total Posts</span>
                    <span className="font-bold text-gray-900">{olderArticles.length}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span>Current Page</span>
                    <span className="font-bold text-gray-900">{currentPage}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span>Total Pages</span>
                    <span className="font-bold text-gray-900">{totalPages}</span>
                  </div>
                </div>
              </div>

              <SmartAd placement="sidebar_2" showLabel={true} />
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}
