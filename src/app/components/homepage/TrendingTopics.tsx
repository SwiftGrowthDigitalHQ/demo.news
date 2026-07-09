import { AppLink } from '../../lib/navigation';

const TOPICS = [
  '#Bihar', '#Election', '#Patna', '#Bhojpur',
  '#BPSC', '#Nitish Kumar', '#Education',
  '#Crime', '#Weather', '#India',
];

export function TrendingTopics() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-900">Trending Tags</h3>
        <AppLink to="/search" className="text-[10px] font-semibold text-red-600 hover:underline">View All →</AppLink>
      </div>
      <div className="flex flex-wrap gap-2">
        {TOPICS.map(t => (
          <AppLink key={t} to={`/search?q=${encodeURIComponent(t.replace('#', ''))}`}
            className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 hover:bg-red-600 hover:text-white transition-all duration-200">
            {t}
          </AppLink>
        ))}
      </div>
    </div>
  );
}
