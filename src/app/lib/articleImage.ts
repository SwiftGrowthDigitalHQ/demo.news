/**
 * Resolves the best available thumbnail image for an article.
 *
 * Priority:
 * 1. featured_image (if it's a valid image URL, not a YouTube URL)
 * 2. YouTube thumbnail from video_url
 * 3. YouTube thumbnail from featured_image (if it's a YT URL)
 * 4. Empty string (fallback placeholder)
 */
export function getArticleThumbnail(
  featuredImage: string | null | undefined,
  videoUrl?: string | null | undefined
): string {
  // If featured_image exists and is NOT a YouTube URL, convert if needed and return
  if (featuredImage && !isYouTubeUrl(featuredImage)) {
    return convertToPublicImageUrl(featuredImage);
  }

  // Try to get YouTube thumbnail from video_url
  if (videoUrl && isYouTubeUrl(videoUrl)) {
    const id = extractYouTubeId(videoUrl);
    if (id) return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
  }

  // Try to get YouTube thumbnail from featured_image (if user put YT URL there)
  if (featuredImage && isYouTubeUrl(featuredImage)) {
    const id = extractYouTubeId(featuredImage);
    if (id) return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
  }

  return '';
}

/**
 * Convert various image URL formats to publicly accessible URLs
 * 
 * For Google Drive URLs, routes them through the application's media proxy
 * which uses server-side authentication to fetch private files.
 */
export function convertToPublicImageUrl(url: string): string {
  if (!url) return '';
  
  // Already a proxy URL, return as-is
  if (url.includes('/functions/v1/media-proxy/')) {
    return url;
  }
  
  // If it's a Supabase Storage URL or regular HTTPS, return as-is
  if (url.includes('.supabase.co/storage/') || 
      (!url.includes('drive.google.com') && url.startsWith('https://'))) {
    return url;
  }
  
  // Extract Google Drive file ID from various URL formats
  const driveFileId = extractGoogleDriveFileId(url);
  
  if (driveFileId) {
    // Route through our media proxy which handles authentication server-side
    // This works for both public and private Google Drive files
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    return `${supabaseUrl}/functions/v1/media-proxy/${driveFileId}`;
  }
  
  // Return original URL (external image)
  return url;
}

/**
 * Extract Google Drive file ID from various URL formats
 */
export function extractGoogleDriveFileId(url: string): string | null {
  if (!url || !url.includes('drive.google.com')) return null;
  
  // Format: https://drive.google.com/file/d/FILE_ID/view
  const viewMatch = url.match(/drive\.google\.com\/file\/d\/([^/?]+)/);
  if (viewMatch) return viewMatch[1];
  
  // Format: https://drive.google.com/open?id=FILE_ID
  const openMatch = url.match(/drive\.google\.com\/open\?id=([^&]+)/);
  if (openMatch) return openMatch[1];
  
  // Format: https://drive.google.com/uc?id=FILE_ID
  const ucMatch = url.match(/drive\.google\.com\/uc\?.*id=([^&]+)/);
  if (ucMatch) return ucMatch[1];
  
  // Format: https://drive.google.com/thumbnail?id=FILE_ID
  const thumbnailMatch = url.match(/drive\.google\.com\/thumbnail\?.*id=([^&]+)/);
  if (thumbnailMatch) return thumbnailMatch[1];
  
  return null;
}

/**
 * Check if a URL is a YouTube video URL
 */
export function isYouTubeUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return /(?:youtube\.com\/(?:watch|embed|shorts)|youtu\.be\/)/.test(url);
}

/**
 * Extract YouTube video ID from various URL formats
 */
export function extractYouTubeId(url: string): string | null {
  // youtu.be/VIDEO_ID
  const shortMatch = url.match(/youtu\.be\/([^?&#]+)/);
  if (shortMatch) return shortMatch[1];

  // youtube.com/watch?v=VIDEO_ID
  const watchMatch = url.match(/youtube\.com\/watch\?v=([^&#]+)/);
  if (watchMatch) return watchMatch[1];

  // youtube.com/embed/VIDEO_ID
  const embedMatch = url.match(/youtube\.com\/embed\/([^?&#]+)/);
  if (embedMatch) return embedMatch[1];

  // youtube.com/shorts/VIDEO_ID
  const shortsMatch = url.match(/youtube\.com\/shorts\/([^?&#]+)/);
  if (shortsMatch) return shortsMatch[1];

  return null;
}

/**
 * Get YouTube embed URL from any YouTube URL format
 */
export function getYouTubeEmbedUrl(url: string): string {
  const id = extractYouTubeId(url);
  if (id) return `https://www.youtube.com/embed/${id}`;
  return url.replace('watch?v=', 'embed/');
}
