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
 * For STORAGE/CANONICAL URLs (from database fields like featured_image):
 * - Supabase Storage URLs (passthrough)
 * - Google Drive canonical URLs (passthrough - never convert to proxy)
 * - Regular HTTPS URLs (passthrough)
 * 
 * For RENDERING (see ImageWithFallback component):
 * - The browser will intelligently try media-proxy first, then fallback to direct URL
 * 
 * @param url - The raw URL from database or input
 * @returns Publicly accessible URL or empty string
 */
export function resolveAssetUrl(url: string | null | undefined): string {
  if (!url || url.trim() === '') return '';
  
  const trimmed = url.trim();
  
  // Google Drive canonical URL - return as-is (NEVER convert to proxy here)
  // Proxy conversion happens in ImageWithFallback component for rendering only
  if (trimmed.includes('drive.google.com/file/d/')) {
    return trimmed;
  }
  
  // Already a thumbnail URL, return as-is
  if (trimmed.includes('drive.google.com/thumbnail')) {
    return trimmed;
  }
  
  // Supabase Storage URL - return as-is
  if (trimmed.includes('.supabase.co/storage/')) {
    return trimmed;
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
