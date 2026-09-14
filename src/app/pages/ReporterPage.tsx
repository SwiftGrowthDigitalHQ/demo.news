import { useParams } from 'react-router-dom';
import { useCms, type PublicArticle } from '../lib/cms';
import { useAppNavigation } from '../lib/navigation';
import { ArticleCard } from '../components/ArticleCard';
import { ImageWithFallback } from '../components/ImageWithFallback';

export function ReporterPage() {
  const { slug } = useParams<{ slug: string }>();
  // Get reporters and articles from CMS context - already tenant-scoped
  const { reporters, articles } = useCms();
  const { navigate } = useAppNavigation();
  const [notFound, setNotFound] = useState(false);

  // Find the reporter from the CMS context
  const reporter = reporters.find(r => r.slug === slug);
  
  // Find articles by this reporter
  const reporterArticles = reporter
    ? articles.filter(article => {
        // Match by author name or author_id (if available)
        return article.author_name.toLowerCase() === reporter.full_name.toLowerCase();
      })
    : [];

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
            </div>
          </div>
        </div>
      </div>

      {/* Articles Section */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Stories by {reporter.full_name}
          <span className="text-gray-500 font-normal ml-2">({reporterArticles.length})</span>
        </h2>

        {reporterArticles.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No stories yet</h3>
            <p className="text-gray-600">
              {reporter.full_name} hasn't published any stories yet. Check back soon!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reporterArticles.map(article => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
