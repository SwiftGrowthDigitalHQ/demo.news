import { Clock } from 'lucide-react';
import { Badge } from './ui/badge';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { AppLink } from '../lib/navigation';

interface NewsCardProps {
  image: string;
  category: string;
  title: string;
  excerpt: string;
  time: string;
  variant?: 'default' | 'horizontal';
  href?: string;
}

export function NewsCard({
  image,
  category,
  title,
  excerpt,
  time,
  variant = 'default',
  href = `/article/${title}`,
}: NewsCardProps) {
  if (variant === 'horizontal') {
    return (
      <AppLink to={href} className="flex gap-4 group cursor-pointer block">
        <div className="w-32 h-24 flex-shrink-0 overflow-hidden rounded-md">
          <ImageWithFallback
            src={image}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
        </div>
        <div className="flex-1">
          <Badge variant="secondary" className="mb-2 text-xs">{category}</Badge>
          <h4 className="text-sm mb-2 line-clamp-2 group-hover:text-red-600 transition-colors">
            {title}
          </h4>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock className="h-3 w-3" />
            <span>{time}</span>
          </div>
        </div>
      </AppLink>
    );
  }

  return (
    <AppLink to={href} className="bg-white rounded-lg overflow-hidden border border-gray-200 group cursor-pointer hover:shadow-lg transition-shadow block">
      <div className="aspect-[16/10] overflow-hidden">
        <ImageWithFallback
          src={image}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="p-4">
        <Badge variant="secondary" className="mb-2">{category}</Badge>
        <h3 className="text-lg mb-2 line-clamp-2 group-hover:text-red-600 transition-colors">
          {title}
        </h3>
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {excerpt}
        </p>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Clock className="h-4 w-4" />
          <span>{time}</span>
        </div>
      </div>
    </AppLink>
  );
}
