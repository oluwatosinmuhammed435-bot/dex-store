import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Product } from '../data/storeData';
import { ProductCard } from './ProductCard';

interface ProductCarouselRailProps {
  title: string;
  subtitle?: string;
  products: Product[];
  viewAllLink?: string;
  viewAllLabel?: string;
  headerBgClass?: string;
}

export const ProductCarouselRail: React.FC<ProductCarouselRailProps> = ({
  title,
  subtitle,
  products,
  viewAllLink = '/shop',
  viewAllLabel = 'See All',
  headerBgClass = 'bg-[#123D2A] text-[#FFFFFF]',
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleSlide = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const scrollAmount = Math.max(220, container.clientWidth * 0.72);
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  if (products.length === 0) return null;

  return (
    <div className="bg-[#FFFFFF] border border-[#E5EBE6] rounded-lg overflow-hidden">
      {/* Jumia / Commercial Retail Style Section Header Strip */}
      <div className={`px-3.5 sm:px-5 py-3 flex items-center justify-between gap-3 ${headerBgClass}`}>
        <div className="min-w-0">
          <h2 className="text-sm sm:text-base font-bold tracking-tight truncate">
            {title}
          </h2>
          {subtitle && (
            <p className="text-[11px] sm:text-xs opacity-85 truncate">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleSlide('left')}
              aria-label={`Slide ${title} left`}
              className="w-7 h-7 inline-flex items-center justify-center rounded bg-[#FFFFFF]/15 hover:bg-[#FFFFFF]/25 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleSlide('right')}
              aria-label={`Slide ${title} right`}
              className="w-7 h-7 inline-flex items-center justify-center rounded bg-[#FFFFFF]/15 hover:bg-[#FFFFFF]/25 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <Link
            to={viewAllLink}
            className="inline-flex items-center gap-1 text-xs font-semibold hover:underline whitespace-nowrap shrink-0 pl-1"
          >
            <span>{viewAllLabel}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Horizontal Touch-Swipeable & Button-Slideable Product Strip */}
      <div className="relative p-2.5 sm:p-4 bg-[#F8FAF8]">
        <div
          ref={scrollContainerRef}
          className="flex items-stretch gap-2.5 sm:gap-3.5 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-1"
        >
          {products.map((product, idx) => (
            <div
              key={`${product.id}-${idx}`}
              className="w-[155px] sm:w-[190px] md:w-[215px] shrink-0 snap-start flex"
            >
              <ProductCard product={product} compact />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
