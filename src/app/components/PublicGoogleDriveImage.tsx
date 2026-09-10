import React, { useState, useRef } from 'react';

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
 * 
 * Object URL Lifecycle:
 * - Created when blob is received
 * - Stored in useRef (not state) to avoid closure bugs
 * - Revoked when: (1) new blob arrives, (2) component unmounts, (3) fileId changes
 * - Never revoked while img element might be using it
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
  
  // Track current blob URL in ref to avoid closure bugs in cleanup
  // This ref is NOT included in dependency array to prevent stale closure
  const currentBlobUrlRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

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

    // Create new abort controller for this fetch
    abortControllerRef.current = new AbortController();
    const abortSignal = abortControllerRef.current.signal;

    (async () => {
      try {
        // Use media-proxy Edge Function
        // The endpoint extracts fileId from the path: /functions/v1/media-proxy/{fileId}
        // It validates file authorization server-side using tenant credentials
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/media-proxy/${fileId}`, {
          headers: {
            'Accept': 'image/*',
          },
          signal: abortSignal,
        });

        if (!response.ok) {
          if (!abortSignal.aborted) {
            setDidError(true);
          }
          return;
        }

        // Check abort before blob conversion
        if (abortSignal.aborted) return;

        const blob = await response.blob();
        
        // CRITICAL FIX: Validate blob is not empty
        // Empty blobs result in naturalWidth=0 on img element even though HTTP=200
        if (blob.size === 0) {
          console.warn('[PublicGoogleDriveImage] Error: Empty blob received from proxy endpoint', { url });
          if (!abortSignal.aborted) {
            setDidError(true);
          }
          return;
        }
        
        if (!blob.type.startsWith('image/')) {
          if (!abortSignal.aborted) {
            setDidError(true);
          }
          return;
        }

        // Check abort before creating object URL
        if (abortSignal.aborted) return;

        // Create object URL from blob for reliable rendering
        const objectUrl = URL.createObjectURL(blob);

        // Check abort one more time before state update
        if (abortSignal.aborted) {
          URL.revokeObjectURL(objectUrl);
          return;
        }

        // Revoke previous object URL before setting new one
        if (currentBlobUrlRef.current) {
          URL.revokeObjectURL(currentBlobUrlRef.current);
        }

        // Update ref and state with new object URL
        currentBlobUrlRef.current = objectUrl;
        setBlobUrl(objectUrl);
        setDidError(false);
      } catch (err) {
        // Only update state if not aborted (AbortError means intentional cancellation)
        if (err instanceof Error && err.name === 'AbortError') {
          // Request was aborted - do not update state
          return;
        }
        if (!abortSignal.aborted) {
          setDidError(true);
        }
      }
    })();

    // Cleanup function: abort fetch and revoke object URL
    return () => {
      // Abort in-flight requests
      abortControllerRef.current?.abort();
      
      // Revoke object URL on unmount or fileId change
      if (currentBlobUrlRef.current) {
        URL.revokeObjectURL(currentBlobUrlRef.current);
        currentBlobUrlRef.current = '';
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
