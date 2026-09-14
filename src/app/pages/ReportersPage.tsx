import { useCms } from '../lib/cms';
import { AppLink } from '../lib/navigation';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { User } from 'lucide-react';

export function ReportersPage() {
  // Use reporters from CMS context - already tenant-scoped
  const { reporters, loading } = useCms();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading reporters...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
          <div className="flex items-center gap-3 mb-3">
            <User className="h-8 w-8 text-red-600" />
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Our Reporters</h1>
          </div>
          <p className="text-gray-600 text-lg">
            Meet our team of dedicated journalists bringing you the latest news and stories.
          </p>
        </div>
      </div>

      {/* Reporters Grid */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {reporters.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">👥</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">No reporters yet</h2>
            <p className="text-gray-600">
              Our team of reporters will be featured here soon. Check back later!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {reporters.map(reporter => {
              const initials = reporter.full_name
                .split(' ')
                .map(w => w[0])
                .join('')
                .slice(0, 2)
                .toUpperCase();

              return (
                <AppLink
                  key={reporter.id}
                  to={`/reporter/${reporter.slug}`}
                  className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-red-200 transition-all group block"
                >
                  {/* Avatar */}
                  <div className="flex flex-col items-center text-center mb-4">
                    {reporter.avatar_url ? (
                      <ImageWithFallback
                        src={reporter.avatar_url}
                        alt={reporter.full_name}
                        className="w-24 h-24 rounded-full object-cover border-4 border-gray-100 group-hover:border-red-100 transition-colors mb-3"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white text-2xl font-bold border-4 border-gray-100 group-hover:border-red-100 transition-colors mb-3">
                        {initials}
                      </div>
                    )}

                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-red-600 transition-colors">
                      {reporter.full_name}
                    </h3>

                    {reporter.specialty && (
                      <p className="text-sm font-semibold text-red-600 mt-1">
                        {reporter.specialty}
                      </p>
                    )}
                  </div>

                  {/* Bio */}
                  {reporter.bio && (
                    <p className="text-sm text-gray-600 leading-relaxed line-clamp-3 mb-4">
                      {reporter.bio}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                      <span className="font-semibold text-gray-900">
                        {reporter.article_count}
                      </span>
                      <span>
                        {reporter.article_count === 1 ? 'Story' : 'Stories'}
                      </span>
                    </div>
                  </div>
                </AppLink>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
