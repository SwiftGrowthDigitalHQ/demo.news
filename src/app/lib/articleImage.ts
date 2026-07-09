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
  // If featured_image exists and is NOT a YouTube URL, use it directly
  if (featuredImage && !isYouTubeUrl(featuredImage)) {
    return featuredImage;
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
