import { ImageWithFallback } from './figma/ImageWithFallback';
import { Play } from 'lucide-react';
import { AppLink } from '../lib/navigation';

interface VideoNewsProps {
  videos: Array<{
    thumbnail: string;
    title: string;
    duration: string;
    href?: string;
  }>;
}

export function VideoNews({ videos }: VideoNewsProps) {
  return (
    <div className="my-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl border-l-4 border-red-600 pl-4">Video News</h2>
        <AppLink to="/search?q=video" className="text-red-600 hover:underline">
          View all
        </AppLink>
      </div>
      {videos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-600">
          No video stories are available yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {videos.map((video, index) => (
            <AppLink key={index} to={video.href ?? `/article/${index}`} className="group cursor-pointer block">
              <div className="relative aspect-video rounded-lg overflow-hidden mb-3">
                <ImageWithFallback
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/50 transition-colors">
                  <div className="bg-red-600 rounded-full p-4">
                    <Play className="h-6 w-6 text-white" fill="white" />
                  </div>
                </div>
                <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                  {video.duration}
                </span>
              </div>
              <h4 className="text-sm line-clamp-2 group-hover:text-red-600 transition-colors">
                {video.title}
              </h4>
            </AppLink>
          ))}
        </div>
      )}
    </div>
  );
}
