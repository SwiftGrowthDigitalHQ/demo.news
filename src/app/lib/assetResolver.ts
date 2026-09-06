/**
/**
 * Centralized Asset Resolver for Tenant Branding Assets
 * 
 * Handles logo, favicon, and other tenant-specific images from multiple sources:
 * - Supabase Storage
 * - Google Drive (returns canonical URLs for authenticated Edge Function handling)
 * - External HTTPS URLs
 */

/**
 * Resolve any asset URL to a publicly accessible URL
 * 
 * For asset URLs from database fields (like logo_url, favicon_url):
 * - Supabase Storage URLs (passthrough - public)
 * - Google Drive canonical URLs (passthrough - backend handles via Edge Function)
 * - Regular HTTPS URLs (passthrough)
 * 
 * Components like Header, Footer use this to display logos/favicon.
 * For Google Drive URLs, components should use GoogleDriveImagePreview 
 * or ImageWithFallback which handle authenticated fetching via Edge Function.
 * 
 * @param url - The raw URL from database or input
 * @returns URL to use for display
 */
export function resolveAssetUrl(url: string | null | undefined): string {
  if (!url || url.trim() === '') return '';
  
  const trimmed = url.trim();
  
  // Return all URLs as-is
  // - Supabase Storage URLs work directly
  // - Google Drive URLs are handled by components via authenticated Edge Function
  // - External HTTPS URLs work directly
  // - Relative paths work for static assets
  return trimmed;
}

/**
 * Resolve logo URL with fallback to empty string
 */
export function resolveLogoUrl(url: string | null | undefined): string {
  return resolveAssetUrl(url);
}

/**
 * Resolve favicon URL with fallback to empty string
 */
export function resolveFaviconUrl(url: string | null | undefined): string {
  return resolveAssetUrl(url);
}

/**
 * Check if an asset URL is valid and likely to work
 */
export function isValidAssetUrl(url: string | null | undefined): boolean {
  if (!url || url.trim() === '') return false;
  
  const trimmed = url.trim();
  
  // Check for common valid patterns
  return (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.includes('drive.google.com') ||
    trimmed.includes('.supabase.co') ||
    trimmed.startsWith('/api/media-proxy/')
  );
}

/**
 * Get display URL for showing in forms (original URL, not proxy)
 */
export function getDisplayUrl(url: string | null | undefined): string {
  if (!url) return '';
  return url.trim();
}
