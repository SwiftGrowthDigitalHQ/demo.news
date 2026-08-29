import { useEffect, useState } from 'react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { useCms } from '../lib/cms';
import { getCustomPage, type CustomPage as CustomPageType } from '../lib/footerApi';
import { Helmet } from 'react-helmet-async';

export function CustomPage() {
  // Extract slug from current pathname
  const { tenantId } = useCms();
  const [page, setPage] = useState<CustomPageType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Get slug from window location
  const slug = typeof window !== 'undefined' 
    ? window.location.pathname.split('/').filter(Boolean).pop() || '' 
    : '';

  useEffect(() => {
    if (!slug || !tenantId) return;

    const load = async () => {
      setLoading(true);
      setError(false);
      try {
        const data = await getCustomPage(slug, tenantId);
        if (data) {
          setPage(data);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error('[CustomPage] Error loading page:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [slug, tenantId]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
            <p className="text-xl text-gray-600 mb-6">Page not found</p>
            <a href="/" className="inline-block bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors">
              Go Home
            </a>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>{page.seo_title || page.title}</title>
        {page.seo_description && <meta name="description" content={page.seo_description} />}
        {page.seo_keywords && <meta name="keywords" content={page.seo_keywords} />}
      </Helmet>

      <Header />
      
      <main className="flex-1 bg-gray-50 py-8 md:py-12">
        <article className="max-w-4xl mx-auto px-4">
          <header className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{page.title}</h1>
            <div className="h-1 w-20 bg-red-600 rounded"></div>
          </header>

          <div 
            className="prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: page.content }}
            style={{
              fontSize: '16px',
              lineHeight: '1.75',
              color: '#374151'
            }}
          />
        </article>
      </main>

      <Footer />
    </div>
  );
}
