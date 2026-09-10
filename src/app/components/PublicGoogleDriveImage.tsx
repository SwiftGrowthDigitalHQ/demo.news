import React, { useState } from 'react';

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
 * Uses the same blob-fetching mechanism as ImageWithFallback for reliability.
 * This approach:
 * - Avoids ORB (Origin Request Policy) blocks on cross-origin image requests
 * - Fetches via /api/media-proxy Edge Function
 * - Creates blob URL for reliable rendering
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
  const [blobUrl, setBlobUrl] = useState<string>('');

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

  // Fetch Google Drive image as blob for reliable rendering
  React.useEffect(() => {
    if (!fileId) return;

    (async () => {
      try {
        // Use local /api/media-proxy endpoint (Vercel rewrite to Edge Function)
        // This avoids ORB blocks and uses tenant-level credentials
        const response = await fetch(`/api/media-proxy/${fileId}`, {
          headers: {
            'Accept': 'image/*',
          },
        });

        if (!response.ok) {
          setDidError(true);
          return;
        }

        const blob = await response.blob();
        
        if (!blob.type.startsWith('image/')) {
          setDidError(true);
          return;
        }

        // Create object URL from blob for reliable rendering
        const objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      } catch (err) {
        setDidError(true);
      }
    })();

    return () => {
      // Cleanup object URL
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [fileId]);

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

  // Don't render until blob is ready
  if (!blobUrl) {
    return (
      <div className={`bg-gray-100 flex items-center justify-center ${className ?? ''}`} style={style}>
        <div className="text-center">
          <div className="w-8 h-8 mx-auto border-2 border-gray-300 border-t-red-600 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const handleError = () => {
    setDidError(true);
    onError?.();
  };

  return (
    <img
      src={blobUrl}
      alt={alt}
      className={className}
      style={style}
      onError={handleError}
      loading="lazy"
    />
  );
}
