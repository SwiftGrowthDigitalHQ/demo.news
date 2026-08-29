/**
 * Centralized Asset Resolver for Tenant Branding Assets
 * 
 * Handles logo, favicon, and other tenant-specific images from multiple sources:
 * - Supabase Storage
 * - Google Drive (via media proxy)
 * - External HTTPS URLs
 */

import { extractGoogleDriveFileId } from './articleImage';

/**
 * Resolve any asset URL to a publicly accessible URL
 * 
 * Supports:
 * - Supabase Storage URLs (passthrough)
 * - Google Drive URLs (converts to media proxy)
 * - Regular HTTPS URLs (passthrough)
 * - Empty/null URLs (returns empty string)
 * 
 * @param url - The raw URL from database or input
 * @returns Publicly accessible URL or empty string
 */
export function resolveAssetUrl(url: string | null | undefined): string {
  if (!url || url.trim() === '') return '';
  
  const trimmed = url.trim();
  
  // Already a proxy URL, return as-is
  if (trimmed.includes('/functions/v1/media-proxy/')) {
    return trimmed;
  }
  
  // Supabase Storage URL - return as-is
  if (trimmed.includes('.supabase.co/storage/')) {
    return trimmed;
  }
  
  // Google Drive URL - extract file ID and route through media proxy
  if (trimmed.includes('drive.google.com')) {
    const fileId = extractGoogleDriveFileId(trimmed);
    if (fileId) {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
      return `${supabaseUrl}/functions/v1/media-proxy/${fileId}`;
    }
  }
  
  // Regular HTTPS URL - return as-is
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    return trimmed;
  }
  
  // Unknown format - return as-is and let browser handle it
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
    trimmed.includes('.supabase.co')
  );
}

/**
 * Get display URL for showing in forms (original URL, not proxy)
 */
export function getDisplayUrl(url: string | null | undefined): string {
  if (!url) return '';
  return url.trim();
}
