import { Clock } from 'lucide-react';
import { Badge } from './ui/badge';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { AppLink } from '../lib/navigation';

interface HeroSectionProps {
  image: string;
  href?: string;
  title?: string;
  excerpt?: string;
  category?: string;
  time?: string;
  author?: string;
}

export function HeroSection({
  image,
  href = '/article/cm-nitish-visit-sitamarhi-major-announcements',
  title = 'बिहार में विकास की नई रफ्तार: मुख्यमंत्री ने 50 नई परियोजनाओं का शुभारंभ किया',
  excerpt = 'राज्य के समग्र विकास के लिए शिक्षा, स्वास्थ्य और बुनियादी ढांचे में बड़े निवेश की घोषणा की गई है।',
  category = 'राजनीति',
  time = '2 घंटे पहले',
  author = 'राहुल कुमार',
}: HeroSectionProps) {
  return (
    <AppLink to={href} className="relative group cursor-pointer overflow-hidden rounded-lg block">
      <div className="aspect-[4/3] sm:aspect-[16/9] lg:aspect-[21/9] relative">
        <ImageWithFallback
          src={image}
          alt="Featured News"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 lg:p-8">
        <Badge className="bg-red-600 hover:bg-red-700 mb-3">मुख्य समाचार</Badge>
        <h2 className="text-xl sm:text-2xl lg:text-4xl text-white mb-2 sm:mb-3 line-clamp-2">{title}</h2>
        <p className="text-gray-200 text-sm sm:text-base lg:text-lg mb-3 sm:mb-4 line-clamp-2">{excerpt}</p>
        <div className="flex items-center gap-3 sm:gap-4 text-gray-300 text-xs sm:text-sm flex-wrap">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
            {time}
          </span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline">{category}</span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline">संवाददाता: {author}</span>
        </div>
      </div>
    </AppLink>
  );
}
