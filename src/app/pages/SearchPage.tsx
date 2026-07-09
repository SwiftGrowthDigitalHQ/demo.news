import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { Header } from '../components/Header';
import { Navigation } from '../components/Navigation';
import { BreakingNewsTicker } from '../components/BreakingNewsTicker';
import { NewsCard } from '../components/NewsCard';
import { AdBanner } from '../components/AdBanner';
import { Footer } from '../components/Footer';
import { AppLink, useAppNavigation } from '../lib/navigation';
import { useCms } from '../lib/cms';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '../components/ui/pagination';
import { trackAnalyticsEvent } from '../lib/admin';

export function SearchPage() {
  const { search, navigate } = useAppNavigation();
  const { searchArticles } = useCms();
  const query = new URLSearchParams(search).get('q') ?? '';
  const page = Math.max(1, Number(new URLSearchParams(search).get('page') ?? '1') || 1);
  const pageSize = 9;
  const [results, setResults] = useState<Awaited<ReturnType<typeof searchArticles>>>([]);

  useEffect(() => {
    let active = true;
    searchArticles(query)
      .then(data => {
        if (active) {
          setResults(data);
        }
      })
      .catch(() => {
        if (active) {
          setResults([]);
        }
      });
    return () => {
      active = false;
    };
  }, [query, searchArticles]);

  useEffect(() => {
    void trackAnalyticsEvent({
      event_type: 'page_view',
      page_path: '/search',
      metadata: { page: 'search', query },
    }).catch(() => {});
  }, [query]);

  const totalPages = Math.max(1, Math.ceil(results.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedResults = results.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const pageUrl = (nextPage: number) => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (nextPage > 1) params.set('page', String(nextPage));
    const next = params.toString();
    return next ? `/search?${next}` : '/search';
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <Navigation />
      <BreakingNewsTicker />

      <main className="max-w-[1440px] mx-auto px-4 py-6">
        <section className="rounded-2xl bg-white border border-gray-200 p-6 mb-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-sm text-gray-500 mb-2">Search Results</div>
              <h1 className="text-3xl font-semibold text-gray-900">
                Search: {query || 'All News'}
              </h1>
            <p className="text-gray-600 mt-2">{results.length} results found</p>
            </div>
            <form
              className="flex gap-2 w-full md:w-auto"
              onSubmit={event => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                navigate(`/search?q=${encodeURIComponent(String(form.get('q') ?? ''))}`);
              }}
            >
              <div className="relative flex-1 md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  name="q"
                  defaultValue={query}
                  placeholder="Search news..."
                  className="h-11 w-full rounded-md border border-gray-200 pl-10 pr-3"
                />
              </div>
              <button className="h-11 rounded-md bg-red-600 px-5 text-white">
                Search
              </button>
            </form>
          </div>
        </section>

        {results.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <h2 className="text-2xl font-semibold text-gray-900">No results found</h2>
            <p className="text-gray-600 mt-2">Try a different keyword or browse the categories.</p>
            <div className="mt-6 flex justify-center gap-3 flex-wrap">
              <AppLink to="/" className="rounded-md bg-red-600 px-5 py-2 text-white">Go Home</AppLink>
              <AppLink to="/category/bihar" className="rounded-md border border-gray-200 px-5 py-2 text-gray-700">Browse Bihar</AppLink>
            </div>
          </section>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
            <section className="space-y-6">
              <AdBanner placement="search-result" title="Search Result Ad" subtitle="Sponsored slot inserted into search discovery" />

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {pagedResults.map(article => (
                  <NewsCard
                    key={article.slug}
                    image={article.featured_image || ''}
                    category={article.category_name}
                    title={article.title}
                    excerpt={article.excerpt}
                    time={article.publish_at ? new Date(article.publish_at).toLocaleDateString('en-IN') : 'Recent'}
                    href={`/article/${article.slug}`}
                  />
                ))}
              </div>

              {totalPages > 1 ? (
                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious href={pageUrl(Math.max(1, currentPage - 1))} aria-disabled={currentPage === 1} />
                      </PaginationItem>
                      {Array.from({ length: totalPages }, (_, index) => index + 1).map(pageNumber => (
                        <PaginationItem key={pageNumber}>
                          <PaginationLink href={pageUrl(pageNumber)} isActive={pageNumber === currentPage}>
                            {pageNumber}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext href={pageUrl(Math.min(totalPages, currentPage + 1))} aria-disabled={currentPage === totalPages} />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              ) : null}
            </section>

            <aside className="space-y-6">
              <AdBanner
                placement="sidebar"
                compact
                type="direct"
                title="School Admission Campaign"
                subtitle="Admissions open for the upcoming academic session"
                advertiser="School Admission Campaign"
                image="https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=80"
                ctaLabel="Apply Now"
              />

              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <h3 className="text-lg font-semibold mb-4">Search Filters</h3>
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="rounded-xl bg-slate-50 p-3">Latest posts only</div>
                  <div className="rounded-xl bg-slate-50 p-3">Include photos and videos</div>
                  <div className="rounded-xl bg-slate-50 p-3">Sort by relevance</div>
                </div>
              </div>
            </aside>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
