import React, { useState } from 'react';
import { Package } from 'lucide-react';

export interface ProductImageProps {
  src: string;
  alt: string;
  srcSet?: string;
  sizes?: string;
  className?: string;
  aspectClassName?: string;
  priority?: boolean;
  width?: number | string;
  height?: number | string;
  fetchPriority?: 'high' | 'low' | 'auto';
  decoding?: 'async' | 'sync' | 'auto';
  onLoad?: React.ReactEventHandler<HTMLImageElement>;
  onError?: React.ReactEventHandler<HTMLImageElement>;
}

/**
 * DEX STORES High-Performance Responsive Image Component
 *
 * Implements:
 * - Native responsive srcset and sizes resolution
 * - LCP prioritization (fetchpriority="high", loading="eager")
 * - Native lazy loading and asynchronous decoding for below-the-fold images
 * - Cumulative Layout Shift (CLS) prevention via aspect ratio containers
 * - Resilient placeholder fallback on missing or failed images
 */
export const ProductImage: React.FC<ProductImageProps> = ({
  src,
  alt,
  srcSet,
  sizes,
  className = '',
  aspectClassName = 'aspect-[4/3]',
  priority = false,
  width,
  height,
  fetchPriority,
  decoding,
  onLoad,
  onError,
}) => {
  const [hasError, setHasError] = useState(false);

  // Fallback placeholder with accessible role and label
  if (hasError || !src) {
    return (
      <div
        className={`relative flex flex-col items-center justify-center bg-[#EAF3EC] text-[#123D2A] p-6 select-none overflow-hidden ${aspectClassName} ${className}`}
        role="img"
        aria-label={alt}
      >
        <Package className="w-8 h-8 text-[#176B45] mb-2 stroke-[1.5]" />
        <span className="text-xs font-medium text-[#0E3021] text-center max-w-[20ch] line-clamp-2">
          {alt}
        </span>
      </div>
    );
  }

  // Derive network priority & loading semantics
  const effectiveLoading: 'eager' | 'lazy' = priority ? 'eager' : 'lazy';
  const effectiveFetchPriority: 'high' | 'low' | 'auto' =
    fetchPriority ?? (priority ? 'high' : 'auto');
  const effectiveDecoding: 'async' | 'sync' | 'auto' =
    decoding ?? (priority ? 'sync' : 'async');

  // Default responsive sizes when srcSet is passed without explicit sizes
  const effectiveSizes =
    sizes || (srcSet ? '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw' : undefined);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setHasError(true);
    onError?.(e);
  };

  return (
    <div className={`relative overflow-hidden bg-[#F8FAF8] ${aspectClassName}`}>
      <img
        src={src}
        srcSet={srcSet}
        sizes={effectiveSizes}
        alt={alt}
        width={width}
        height={height}
        loading={effectiveLoading}
        fetchPriority={effectiveFetchPriority}
        decoding={effectiveDecoding}
        referrerPolicy="no-referrer"
        onError={handleError}
        onLoad={onLoad}
        className={`w-full h-full object-cover transition-transform duration-200 ease-out ${className}`}
      />
    </div>
  );
};
