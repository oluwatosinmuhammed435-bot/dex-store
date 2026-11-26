import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { CategoryItem } from '../data/storeData';
import { ProductImage } from './ProductImage';
import { Badge } from './ui';

interface CategoryCardProps {
  category: CategoryItem;
  productCount: number;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({ category, productCount }) => {
  return (
    <article className="group flex flex-col bg-[#FFFFFF] border border-[#E2EAE5] rounded-2xl overflow-hidden shadow-xs dex-card-interactive">
      <Link
        to={`/shop?category=${category.slug}`}
        className="block overflow-hidden bg-[#F7FAF8] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#176B45]"
        aria-label={`Explore ${category.name}`}
      >
        <ProductImage
          src={category.image}
          alt={category.name}
          aspectClassName="aspect-[16/10]"
          className="group-hover:scale-[1.03]"
        />
      </Link>

      <div className="flex flex-col flex-1 p-5 sm:p-6 justify-between gap-4">
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-[#176B45] uppercase tracking-wider">
              Department
            </span>
            <Badge variant="brand" className="font-mono-num">
              {productCount} {productCount === 1 ? 'Item' : 'Items'}
            </Badge>
          </div>

          <h3 className="text-lg sm:text-xl font-bold text-[#17231C] tracking-tight">
            <Link
              to={`/shop?category=${category.slug}`}
              className="hover:text-[#176B45] transition-colors"
            >
              {category.name}
            </Link>
          </h3>

          <p className="text-xs sm:text-sm text-[#5C6B62] leading-relaxed line-clamp-2">
            {category.shortDescription}
          </p>
        </div>

        <div className="pt-3.5 border-t border-[#E2EAE5]">
          <Link
            to={`/shop?category=${category.slug}`}
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#123D2A] group-hover:text-[#176B45] transition-colors whitespace-nowrap py-1"
          >
            <span>Explore {category.name}</span>
            <ArrowRight className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
};
