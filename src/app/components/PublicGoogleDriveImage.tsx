import { useState } from 'react';

interface PublicGoogleDriveImageProps {
  /**
   * Google Drive URL in format: https://drive.google.com/file/d/{fileId}/view?...
   * or just the file ID
   */
  url: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  onError?: () => void;
}

/**
 * Renders Google Drive images on public website without authentication.
 * 
 * Uses the /api/media-proxy local endpoint which proxies to the media-proxy Edge Function.
 * This approach:
 * - Avoids ORB (Origin Request Policy) blocks on cross-origin image requests
 * - Uses tenant-level server-side Google Drive credentials
 * - Handles token refresh automatically
 * - Works for private Google Drive files owned by the tenant
 * 
 * This approach preserves the private Google Drive architecture -
 * files do NOT need to be publicly shared.
 */
export function PublicGoogleDriveImage({
  url,
  alt,
  className,
  style,
  onError,
}: PublicGoogleDriveImageProps) {
  const [didError, setDidError] = useState(false);

  // Extract file ID from Google Drive URL
  // Format: https://drive.google.com/file/d/{fileId}/view?...
  const fileId = url.match(/drive\.google\.com\/file\/d\/([^/?]+)/)?.[1] || url;

  if (!fileId) {
    return (
      <div className={`bg-gray-100 flex items-center justify-center ${className ?? ''}`} style={style}>
        <span className="text-xs text-gray-400">Invalid image URL</span>
      </div>
    );
  }

  if (didError) {
    return (
      <div className={`bg-gray-100 flex items-center justify-center ${className ?? ''}`} style={style}>
        <div className="text-center">
          <svg className="w-8 h-8 mx-auto text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-[9px] text-gray-400 mt-1">Image unavailable</p>
        </div>
      </div>
    );
  }

  // Use the local /api/media-proxy endpoint which proxies to the Edge Function
  // This avoids ORB blocks on cross-origin image requests
  const proxyImageUrl = `/api/media-proxy/${fileId}`;

  const handleError = () => {
    setDidError(true);
    onError?.();
  };

  return (
    <img
      src={proxyImageUrl}
      alt={alt}
      className={className}
      style={style}
      onError={handleError}
      loading="lazy"
    />
  );
}
