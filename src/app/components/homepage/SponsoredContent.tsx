import { ExternalLink } from 'lucide-react';

const SPONSORS = [
  { name: 'Libriofy', tagline: 'Smart Library Management Made Simple & Powerful.', url: '#', logo: '📖', color: 'from-orange-50 to-amber-50' },
  { name: 'SwiftGrowthDigital', tagline: 'Grow Your Business Faster With Digital', url: 'https://swiftgrowthdigital.com', logo: '🚀', color: 'from-blue-50 to-indigo-50' },
  { name: 'Bihar Startups', tagline: 'Innovation & Growth from Bihar', url: '#', logo: '💡', color: 'from-green-50 to-emerald-50' },
];

export function SponsoredContent() {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[9px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Sponsored</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {SPONSORS.map(s => (
          <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer sponsored"
            className={`flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r ${s.color} border border-gray-100 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group`}>
            <span className="text-3xl shrink-0">{s.logo}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-gray-900 group-hover:text-red-600 transition-colors">{s.name}</div>
              <div className="text-[10px] text-gray-600 line-clamp-2 mt-0.5">{s.tagline}</div>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-gray-300 group-hover:text-red-500 shrink-0" />
          </a>
        ))}
      </div>
    </section>
  );
}
