/**
 * Image Compression Utility
 * 
 * Compresses images to optimized sizes before upload.
 * - Target: ~30 KB for web display
 * - Preserves aspect ratio
 * - Handles transparency
 * - Removes unnecessary metadata
 */

import imageCompressionLib from 'browser-image-compression';

export interface CompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
  fileType?: string;
  quality?: number;
  onProgress?: (progress: number) => void;
}

export interface CompressionResult {
  blob: Blob;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  originalDimensions?: { width: number; height: number };
  compressedDimensions?: { width: number; height: number };
}

/**
 * Get image dimensions from File/Blob
 */
async function getImageDimensions(file: File | Blob): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    } catch {
      resolve(null);
    }
  });
}

/**
 * Compress image file
 * 
 * Strategy:
 * 1. For images > 1 MB: aggressive compression
 * 2. For images 100 KB - 1 MB: moderate compression
 * 3. For images < 100 KB: minimal compression
 * 
 * Target output: ~30 KB (with intelligent quality/size tradeoff)
 */
export async function compressImage(
  file: File,
  options?: CompressionOptions
): Promise<CompressionResult> {
  const originalSize = file.size;
  const originalDimensions = await getImageDimensions(file);

  // Determine compression strategy based on original size
  let targetSizeMB = 0.04; // ~40 KB default
  let targetQuality = 0.75;
  let targetWidth = 1200;

  // Aggressive compression for large files
  if (originalSize > 5 * 1024 * 1024) {
    // > 5 MB
    targetSizeMB = 0.035;
    targetQuality = 0.65;
    targetWidth = 1000;
  } else if (originalSize > 2 * 1024 * 1024) {
    // > 2 MB
    targetSizeMB = 0.040;
    targetQuality = 0.70;
    targetWidth = 1100;
  } else if (originalSize > 1 * 1024 * 1024) {
    // > 1 MB
    targetSizeMB = 0.045;
    targetQuality = 0.75;
    targetWidth = 1200;
  } else if (originalSize > 500 * 1024) {
    // > 500 KB
    targetSizeMB = 0.050;
    targetQuality = 0.78;
    targetWidth = 1300;
  } else if (originalSize > 100 * 1024) {
    // > 100 KB but < 500 KB
    targetSizeMB = 0.060;
    targetQuality = 0.80;
    targetWidth = 1400;
  } else {
    // < 100 KB: already small, minimal compression
    targetSizeMB = 0.080;
    targetQuality = 0.85;
    targetWidth = 1600;
  }

  // Override with user options if provided
  const maxSizeMB = options?.maxSizeMB ?? targetSizeMB;
  const maxWidthOrHeight = options?.maxWidthOrHeight ?? targetWidth;
  const fileType = options?.fileType ?? 'image/webp';
  const quality = options?.quality ?? targetQuality;
  const useWebWorker = options?.useWebWorker ?? true;

  try {
    // Compress using browser-image-compression library
    // Default export is the compression function
    const compressedBlob = await imageCompressionLib(file, {
      maxSizeMB,
      maxWidthOrHeight,
      useWebWorker,
      fileType: fileType as string,
      initialQuality: quality,
      alwaysKeepResolution: false,
      onProgress: options?.onProgress,
    });

    // Get compressed dimensions
    const compressedDimensions = await getImageDimensions(compressedBlob);

    const compressedSize = compressedBlob.size;
    const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;

    return {
      blob: compressedBlob,
      originalSize,
      compressedSize,
      compressionRatio,
      originalDimensions: originalDimensions || undefined,
      compressedDimensions: compressedDimensions || undefined,
    };
  } catch (error) {
    console.error('[ImageCompression] Compression failed:', error);
    throw new Error(
      error instanceof Error
        ? `Image compression failed: ${error.message}`
        : 'Image compression failed'
    );
  }
}

/**
 * Format bytes as human-readable size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Get MIME type for compressed output
 */
export function getMimeType(originalFile: File): string {
  const mimeType = originalFile.type;
  
  // If original is PNG with transparency, keep PNG
  if (mimeType === 'image/png') {
    return 'image/png';
  }
  
  // Otherwise use WebP for best compression
  return 'image/webp';
}
