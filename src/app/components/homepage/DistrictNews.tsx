import { AppLink } from '../../lib/navigation';
import { MapPin } from 'lucide-react';

const DISTRICTS = [
  { name: 'Patna', emoji: '🏛️' },
  { name: 'Buxar', emoji: '🏰' },
  { name: 'Ara', emoji: '📍' },
  { name: 'Gaya', emoji: '🛕' },
  { name: 'Nalanda', emoji: '📚' },
  { name: 'Muzaffarpur', emoji: '🥭' },
  { name: 'Darbhanga', emoji: '🎭' },
  { name: 'Bhagalpur', emoji: '🌊' },
];

export function DistrictNews() {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
          <span className="w-1 h-5 bg-red-600 rounded-full" />
          <MapPin className="h-4 w-4 text-red-600" />
          Bihar District News
        </h2>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
        {DISTRICTS.map(d => (
          <AppLink key={d.name} to={`/search?q=${d.name}`}
            className="group flex flex-col items-center gap-1.5 p-2.5 rounded-lg bg-white border border-gray-100 hover:border-red-200 hover:shadow-md hover:-translate-y-1 transition-all duration-200">
            <span className="text-xl">{d.emoji}</span>
            <span className="text-[10px] font-semibold text-gray-700 group-hover:text-red-600 transition-colors">{d.name}</span>
          </AppLink>
        ))}
      </div>
    </section>
  );
}
