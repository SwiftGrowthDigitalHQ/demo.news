import React, { useState, useRef } from 'react';
import { convertToPublicImageUrl } from '../../lib/articleImage';

export function ImageWithFallback(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [didError, setDidError] = useState(false);
  const [delayedSrc, setDelayedSrc] = useState<string | undefined>(props.src);
  const [blobUrl, setBlobUrl] = useState<string>('');
  
  // Track current blob URL in ref to avoid closure bugs in cleanup
  const currentBlobUrlRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const { src, alt, style, className, ...rest } = props;

  // convertToPublicImageUrl returns URLs as-is
  // Google Drive images are handled via blob URL creation below
  const imageUrl = src ? convertToPublicImageUrl(src) : '';

  // Handle Google Drive URLs by fetching via appropriate endpoint
  // - Authenticated users: google-drive-thumbnail (requires JWT, validates tenant ownership)
  // - Unauthenticated (public): media-proxy (no auth, validates file is referenced in articles/media)
  React.useEffect(() => {
    if (!src) {
      // Cleanup when src becomes empty
      setDelayedSrc(undefined);
      setBlobUrl('');
      if (currentBlobUrlRef.current) {
        URL.revokeObjectURL(currentBlobUrlRef.current);
        currentBlobUrlRef.current = '';
      }
      return;
    }
    
    const isGoogleDrive = src.includes('drive.google.com');
    if (!isGoogleDrive) {
      // Not a Google Drive URL, use directly
      // Revoke any previous object URL since we're not using blobs anymore
      if (currentBlobUrlRef.current) {
        URL.revokeObjectURL(currentBlobUrlRef.current);
        currentBlobUrlRef.current = '';
      }
      setDelayedSrc(src);
      setBlobUrl('');
      return;
    }

    // Create new abort controller for this fetch
    abortControllerRef.current = new AbortController();
    const abortSignal = abortControllerRef.current.signal;

    // For Google Drive URLs, route based on authentication context
    (async () => {
      try {
        const fileId = src.match(/drive\.google\.com\/file\/d\/([^/?]+)/)?.[1];
        if (!fileId) {
          if (!abortSignal.aborted) {
            setDidError(true);
          }
          return;
        }

        const { getSupabaseClient } = await import('../../../lib/supabase');
        const supabase = getSupabaseClient();
        
        if (!supabase) {
          if (!abortSignal.aborted) {
            setDidError(true);
          }
          return;
        }
        
        const { data: { session } } = await supabase.auth.getSession();
        const isAuthenticated = !!session?.access_token;
        
        let thumbnailUrl: string;
        let fetchOptions: RequestInit = {};
        
        if (isAuthenticated) {
          // Authenticated: Use google-drive-thumbnail (validates tenant ownership)
          thumbnailUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-drive-thumbnail?fileId=${fileId}&size=w400`;
          fetchOptions.headers = {
            'Authorization': `Bearer ${session.access_token}`,
          };
        } else {
          // Unauthenticated (public page): Use media-proxy Edge Function
          // Note: media-proxy extracts fileId from path, not query params
          // It validates file authorization server-side using tenant credentials
          thumbnailUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/media-proxy/${fileId}`;
          fetchOptions.headers = {
            'Accept': 'image/*',
          };
        }
        
        // Check abort before fetching
        if (abortSignal.aborted) return;
        
        const response = await fetch(thumbnailUrl, {
          ...fetchOptions,
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
        if (!blob.type.startsWith('image/')) {
          if (!abortSignal.aborted) {
            setDidError(true);
          }
          return;
        }
        
        // Check abort before creating object URL
        if (abortSignal.aborted) return;
        
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
        setDelayedSrc(src);
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

    // Cleanup function
    return () => {
      // Abort in-flight requests
      abortControllerRef.current?.abort();
      
      // Revoke object URL only on unmount or src change
      // Do NOT revoke if this abort is due to React StrictMode remount
      // (the URL will be needed by the img element)
      // Instead, we track and revoke only when absolutely certain it's safe
      if (currentBlobUrlRef.current && src) {
        // Only revoke if we're changing sources (src parameter changed)
        // This prevents premature revocation during rendering
        URL.revokeObjectURL(currentBlobUrlRef.current);
        currentBlobUrlRef.current = '';
      }
    };
  }, [src]);

  // Don't render if src is empty/null
  if (!delayedSrc || !imageUrl) {
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
    // Image failed to load - show placeholder
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

  return (
    <img
      src={blobUrl || imageUrl}
      alt={alt}
      className={className}
      style={style}
      {...rest}
      onError={handleError}
      loading="lazy"
    />
  );
}
