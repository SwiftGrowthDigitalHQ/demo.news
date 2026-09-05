import React, { useState } from 'react';
import { convertToPublicImageUrl, extractGoogleDriveFileId } from '../../lib/articleImage';

export function ImageWithFallback(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [didError, setDidError] = useState(false);
  const [attemptedProxy, setAttemptedProxy] = useState(false);
  const [attemptedDirect, setAttemptedDirect] = useState(false);
  const [delayedSrc, setDelayedSrc] = useState<string | undefined>(props.src);

  const { src, alt, style, className, ...rest } = props;

  // Extract FILE_ID if this is a Google Drive URL
  const fileId = src ? extractGoogleDriveFileId(src) : null;
  const mediaProxyUrl = fileId ? `/api/media-proxy/${fileId}` : null;
  
  // Thumbnail URL is always direct (no proxy needed for direct access)
  const thumbnailUrl = src ? convertToPublicImageUrl(src) : '';

  // Add staggered delays to avoid Google rate limiting
  React.useEffect(() => {
    if (!src) return;
    const delay = Math.random() * 500; // Random delay up to 500ms
    const timer = setTimeout(() => {
      setDelayedSrc(src);
    }, delay);
    return () => clearTimeout(timer);
  }, [src]);

  // Don't render if src is empty/null
  if (!delayedSrc || (!mediaProxyUrl && !thumbnailUrl)) {
    return (
      <div className={`bg-gray-100 flex items-center justify-center ${className ?? ''}`} style={style}>
        <div className="text-center p-4">
          <svg className="w-10 h-10 mx-auto text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-[10px] text-gray-400 mt-1">No image</p>
        </div>
      </div>
    );
  }

  const handleError = () => {
    // Priority order for Google Drive files:
    // 1. Try media-proxy first (works for private files if OAuth exists)
    if (mediaProxyUrl && !attemptedProxy) {
      setAttemptedProxy(true);
      return; // Re-render with mediaProxyUrl
    }
    
    // 2. Fall back to direct thumbnail URL
    if (!attemptedDirect && thumbnailUrl !== mediaProxyUrl) {
      setAttemptedDirect(true);
      return;
    }
    
    // 3. All options failed - show placeholder
    setDidError(true);
  };

  if (didError) {
    return (
      <div className={`bg-gray-100 flex items-center justify-center ${className ?? ''}`} style={style}>
        <div className="text-center p-4">
          <svg className="w-10 h-10 mx-auto text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-[10px] text-gray-400 mt-1">Image unavailable</p>
        </div>
      </div>
    );
  }

  // Determine which URL to use based on attempt flags:
  // 1. If not attempted proxy yet and media-proxy available, try it
  // 2. Otherwise use direct thumbnail URL
  let urlToUse = delayedSrc;
  if (!attemptedProxy && mediaProxyUrl) {
    urlToUse = mediaProxyUrl;
  } else if (attemptedProxy || !mediaProxyUrl) {
    // Either proxy failed or proxy unavailable, use thumbnail
    urlToUse = thumbnailUrl;
  }

  return (
    <img
      src={urlToUse}
      alt={alt}
      className={className}
      style={style}
      {...rest}
      onError={handleError}
      loading="lazy"
    />
  );
}
