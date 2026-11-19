/**
 * DEX STORES — High-Performance Image Optimization Utility (Phase 1)
 *
 * Implements a zero-dependency client-side image compression and resizing
 * pipeline powered by the native HTML5 Canvas API.
 *
 * Features:
 * - Conversion to modern WebP format (0.82 quality target)
 * - Proportional aspect-ratio resizing (up to 1200px max dimension)
 * - Automatic stripping of device/EXIF/GPS metadata via canvas rasterization
 * - Three responsive variant targets:
 *     1. Thumbnail: 200px
 *     2. Product Card: 400px
 *     3. Product Detail: 800px
 *     (+ Full/Master: 1200px)
 * - Graceful error handling for corrupt files and unsupported MIME types
 * - Returns File and Blob objects ready for Supabase Storage uploads
 */

export interface ImageDimensions {
  width: number;
  height: number;
}

export type VariantName = 'thumbnail' | 'card' | 'detail' | 'full';

export interface OptimizedImageVariant {
  variant: VariantName;
  targetDimension: number;
  width: number;
  height: number;
  blob: Blob;
  file: File;
  sizeBytes: number;
}

export interface ResponsiveImagePackage {
  originalFileName: string;
  originalSizeBytes: number;
  originalDimensions: ImageDimensions;
  thumbnail: OptimizedImageVariant; // 200px max dimension
  card: OptimizedImageVariant;      // 400px max dimension
  detail: OptimizedImageVariant;    // 800px max dimension
  full: OptimizedImageVariant;      // 1200px max dimension
}

export interface SingleOptimizationOptions {
  maxDimension?: number;
  quality?: number;
  customSuffix?: string;
}

export const DEFAULT_WEBP_QUALITY = 0.82;
export const MAX_CANVAS_DIMENSION = 1200;

export const VARIANT_SPECS = {
  thumbnail: { name: 'thumbnail' as const, maxDimension: 200, suffix: 'thumb' },
  card: { name: 'card' as const, maxDimension: 400, suffix: 'card' },
  detail: { name: 'detail' as const, maxDimension: 800, suffix: 'detail' },
  full: { name: 'full' as const, maxDimension: 1200, suffix: 'full' },
} as const;

/**
 * Calculates target dimensions while preserving the original aspect ratio.
 * Never upscales an image that is already smaller than the max dimension.
 */
export function calculateAspectRatioFit(
  srcWidth: number,
  srcHeight: number,
  maxDimension: number
): ImageDimensions {
  if (!Number.isFinite(srcWidth) || !Number.isFinite(srcHeight) || srcWidth <= 0 || srcHeight <= 0) {
    throw new Error(`Invalid source image dimensions: ${srcWidth}x${srcHeight}`);
  }

  const safeMax = Math.max(1, Math.round(maxDimension));

  // If already smaller than maxDimension in both axes, avoid upscaling
  if (srcWidth <= safeMax && srcHeight <= safeMax) {
    return {
      width: Math.round(srcWidth),
      height: Math.round(srcHeight),
    };
  }

  const aspectRatio = srcWidth / srcHeight;

  if (srcWidth >= srcHeight) {
    // Landscape or square orientation
    const width = safeMax;
    const height = Math.max(1, Math.round(safeMax / aspectRatio));
    return { width, height };
  } else {
    // Portrait orientation
    const height = safeMax;
    const width = Math.max(1, Math.round(safeMax * aspectRatio));
    return { width, height };
  }
}

/**
 * Loads a File or Blob into an HTMLImageElement using an object URL.
 * Cleans up memory immediately via URL.revokeObjectURL on success or failure.
 */
export function loadImageFromFile(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error('No file provided for image optimization.'));
    }

    if (file.type && !file.type.startsWith('image/')) {
      return reject(
        new Error(`Unsupported file type "${file.type}". Only image files can be optimized.`)
      );
    }

    if (file.size === 0) {
      return reject(new Error('Image file is empty (0 bytes).'));
    }

    let objectUrl = '';
    try {
      objectUrl = URL.createObjectURL(file);
    } catch {
      return reject(new Error('Failed to create object URL from file. Browser environment required.'));
    }

    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(
        new Error(
          'Failed to decode image. The file may be corrupt or in an unsupported format.'
        )
      );
    };

    img.src = objectUrl;
  });
}

/**
 * Draws an image onto an offscreen canvas with high-quality smoothing.
 */
function renderToCanvas(
  img: HTMLImageElement,
  targetWidth: number,
  targetHeight: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Unable to acquire 2D canvas context for image optimization.');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
  return canvas;
}

/**
 * Converts a canvas element to a WebP Blob, falling back to JPEG if WebP is unsupported.
 */
function canvasToBlobAsync(
  canvas: HTMLCanvasElement,
  quality = DEFAULT_WEBP_QUALITY
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          // Fallback to JPEG if the browser environment cannot encode WebP
          canvas.toBlob(
            (fallbackBlob) => {
              if (fallbackBlob) {
                resolve(fallbackBlob);
              } else {
                reject(new Error('Canvas image encoding failed.'));
              }
            },
            'image/jpeg',
            quality
          );
          return;
        }
        resolve(blob);
      },
      'image/webp',
      quality
    );
  });
}

/**
 * Generates a clean, sanitized WebP File object with consistent naming conventions.
 */
function createWebPFile(
  blob: Blob,
  originalFileName: string,
  suffix: string
): File {
  const baseName = originalFileName
    .replace(/\.[^/.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 50);

  const extension = blob.type === 'image/jpeg' ? 'jpg' : 'webp';
  const newFileName = `${baseName || 'product'}-${suffix}.${extension}`;

  return new File([blob], newFileName, {
    type: blob.type || 'image/webp',
    lastModified: Date.now(),
  });
}

/**
 * Optimizes a loaded image element into a single specified variant.
 */
export async function optimizeImageVariant(
  img: HTMLImageElement,
  originalFileName: string,
  variantSpec: {
    name: VariantName;
    maxDimension: number;
    suffix: string;
  },
  quality = DEFAULT_WEBP_QUALITY
): Promise<OptimizedImageVariant> {
  const srcWidth = img.naturalWidth || img.width;
  const srcHeight = img.naturalHeight || img.height;

  const { width, height } = calculateAspectRatioFit(srcWidth, srcHeight, variantSpec.maxDimension);

  const canvas = renderToCanvas(img, width, height);
  const blob = await canvasToBlobAsync(canvas, quality);
  const file = createWebPFile(blob, originalFileName, variantSpec.suffix);

  return {
    variant: variantSpec.name,
    targetDimension: variantSpec.maxDimension,
    width,
    height,
    blob,
    file,
    sizeBytes: blob.size,
  };
}

/**
 * Compresses a single uploaded image to a maximum dimension (default 1200px)
 * and exports as an optimized WebP variant.
 */
export async function compressImage(
  file: File,
  options?: SingleOptimizationOptions
): Promise<OptimizedImageVariant> {
  const quality = options?.quality ?? DEFAULT_WEBP_QUALITY;
  const maxDim = options?.maxDimension ?? MAX_CANVAS_DIMENSION;
  const suffix = options?.customSuffix ?? 'optimized';

  const img = await loadImageFromFile(file);

  return optimizeImageVariant(
    img,
    file.name,
    {
      name: 'full',
      maxDimension: maxDim,
      suffix,
    },
    quality
  );
}

/**
 * Generates all three responsive image variants (Thumbnail 200px, Card 400px, Detail 800px)
 * plus the full 1200px master in WebP format from an uploaded File.
 */
export async function generateResponsiveImageVariants(
  file: File,
  quality = DEFAULT_WEBP_QUALITY
): Promise<ResponsiveImagePackage> {
  const img = await loadImageFromFile(file);

  const originalDimensions: ImageDimensions = {
    width: img.naturalWidth || img.width,
    height: img.naturalHeight || img.height,
  };

  const [thumbnail, card, detail, full] = await Promise.all([
    optimizeImageVariant(img, file.name, VARIANT_SPECS.thumbnail, quality),
    optimizeImageVariant(img, file.name, VARIANT_SPECS.card, quality),
    optimizeImageVariant(img, file.name, VARIANT_SPECS.detail, quality),
    optimizeImageVariant(img, file.name, VARIANT_SPECS.full, quality),
  ]);

  return {
    originalFileName: file.name,
    originalSizeBytes: file.size,
    originalDimensions,
    thumbnail,
    card,
    detail,
    full,
  };
}
