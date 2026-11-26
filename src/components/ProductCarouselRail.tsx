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
  accentTone?: 'forest' | 'fresh' | 'mint';
  onQuickView?: (product: Product) => void;
}

const TONE_MAP = {
  forest: 'bg-[#123D2A] text-[#FFFFFF] border-b border-[#0E3021]',
  fresh: 'bg-[#176B45] text-[#FFFFFF] border-b border-[#123D2A]',
  mint: 'bg-[#EAF5EE] text-[#123D2A] border-b border-[#D9F0E2]',
};

export const ProductCarouselRail: React.FC<ProductCarouselRailProps> = ({
  title,
  subtitle,
  products,
  viewAllLink = '/shop',
  viewAllLabel = 'See All',
  accentTone = 'forest',
  onQuickView,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleSlide = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const scrollAmount = Math.max(240, container.clientWidth * 0.72);
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
    });
  };

  if (products.length === 0) return null;

  const isLightHeader = accentTone === 'mint';

  return (
    <section
      aria-roledescription="carousel"
      aria-label={title}
      className="bg-[#FFFFFF] border border-[#E2EAE5] rounded-2xl overflow-hidden shadow-xs"
    >
      {/* Header Strip */}
      <div className={`px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 ${TONE_MAP[accentTone]}`}>
        <div className="min-w-0">
          <h2 className="text-sm sm:text-base font-bold tracking-tight truncate">
            {title}
          </h2>
          {subtitle && (
            <p className={`text-[11px] sm:text-xs truncate ${isLightHeader ? 'text-[#5C6B62]' : 'opacity-85'}`}>
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleSlide('left')}
              aria-label={`Scroll ${title} left`}
              className={`w-8 h-8 inline-flex items-center justify-center rounded-lg transition-colors dex-press ${
                isLightHeader
                  ? 'bg-[#FFFFFF] text-[#123D2A] border border-[#C6E5D2] hover:bg-[#D9F0E2]'
                  : 'bg-[#FFFFFF]/15 hover:bg-[#FFFFFF]/25 text-[#FFFFFF]'
              }`}
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => handleSlide('right')}
              aria-label={`Scroll ${title} right`}
              className={`w-8 h-8 inline-flex items-center justify-center rounded-lg transition-colors dex-press ${
                isLightHeader
                  ? 'bg-[#FFFFFF] text-[#123D2A] border border-[#C6E5D2] hover:bg-[#D9F0E2]'
                  : 'bg-[#FFFFFF]/15 hover:bg-[#FFFFFF]/25 text-[#FFFFFF]'
              }`}
            >
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          <Link
            to={viewAllLink}
            className={`inline-flex items-center gap-1 text-xs font-semibold whitespace-nowrap shrink-0 pl-1.5 hover:underline ${
              isLightHeader ? 'text-[#176B45]' : 'text-[#FFFFFF]'
            }`}
          >
            <span>{viewAllLabel}</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* Horizontal Touch-Swipeable Snap Track */}
      <div className="relative p-3 sm:p-4 bg-[#F7FAF8]">
        <div
          ref={scrollContainerRef}
          tabIndex={0}
          role="group"
          aria-label={`${title} slides`}
          className="dex-snap-rail gap-2.5 sm:gap-4 pb-1"
        >
          {products.map((product, idx) => (
            <div
              key={`${product.id}-${idx}`}
              role="group"
              aria-roledescription="slide"
              aria-label={`${idx + 1} of ${products.length}`}
              className="w-[162px] sm:w-[200px] md:w-[224px] shrink-0 snap-start flex"
            >
              <ProductCard product={product} compact onQuickView={onQuickView} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
