import React, { useEffect, useState } from 'react';
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
 * Features:
 * - Zero CLS aspect-ratio frame with subtle green shimmer placeholder while decoding
 * - Native responsive srcset and sizes support
 * - Smooth fade-in reveal upon load completion
 * - Resets error/load states cleanly when `src` changes (e.g., gallery or quick-view switch)
 * - Clean accessible fallback UI when image is unavailable
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
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setHasError(false);
    setIsLoaded(false);
  }, [src]);

  if (hasError || !src) {
    return (
      <div
        className={`relative flex flex-col items-center justify-center bg-[#EAF5EE] text-[#123D2A] p-4 select-none overflow-hidden ${aspectClassName} ${className}`}
        role="img"
        aria-label={alt}
      >
        <div className="w-10 h-10 rounded-full bg-[#FFFFFF] border border-[#C6E5D2] flex items-center justify-center mb-2 shadow-2xs">
          <Package className="w-5 h-5 text-[#176B45] stroke-[1.6]" aria-hidden="true" />
        </div>
        <span className="text-[11px] font-medium text-[#123D2A] text-center max-w-[20ch] line-clamp-2">
          {alt}
        </span>
      </div>
    );
  }

  const effectiveLoading: 'eager' | 'lazy' = priority ? 'eager' : 'lazy';
  const effectiveFetchPriority: 'high' | 'low' | 'auto' =
    fetchPriority ?? (priority ? 'high' : 'auto');
  const effectiveDecoding: 'async' | 'sync' | 'auto' =
    decoding ?? (priority ? 'sync' : 'async');

  const effectiveSizes =
    sizes || (srcSet ? '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw' : undefined);

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setIsLoaded(true);
    onLoad?.(e);
  };

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setHasError(true);
    onError?.(e);
  };

  return (
    <div className={`relative overflow-hidden bg-[#F2F6F3] ${aspectClassName}`}>
      {!isLoaded && (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[#EAF5EE]/75 motion-safe:animate-pulse"
        />
      )}
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
        onLoad={handleLoad}
        className={`w-full h-full object-cover transition-[opacity,transform] duration-300 ease-out ${
          isLoaded || priority ? 'opacity-100' : 'opacity-0'
        } ${className}`}
      />
    </div>
  );
};
