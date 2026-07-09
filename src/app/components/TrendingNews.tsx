import { TrendingUp } from 'lucide-react';
import { NewsCard } from './NewsCard';

interface TrendingNewsProps {
  newsItems: Array<{
    image: string;
    category: string;
    title: string;
    excerpt: string;
    time: string;
    href?: string;
  }>;
}

export function TrendingNews({ newsItems }: TrendingNewsProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-4">
      <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-200">
        <TrendingUp className="h-5 w-5 text-red-600" />
        <h3 className="text-xl">Trending News</h3>
      </div>
      {newsItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-slate-50 p-4 text-sm text-gray-600">
          No trending stories are available yet.
        </div>
      ) : (
        <div className="space-y-6">
          {newsItems.map((item, index) => (
            <NewsCard key={index} {...item} variant="horizontal" />
          ))}
        </div>
      )}
    </div>
  );
}
