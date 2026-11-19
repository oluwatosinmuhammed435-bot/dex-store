import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { CategoryItem } from '../data/storeData';
import { ProductImage } from './ProductImage';

interface CategoryCardProps {
  category: CategoryItem;
  productCount: number;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({ category, productCount }) => {
  return (
    <article className="group flex flex-col bg-[#FFFFFF] border border-[#E5EBE6] rounded-lg overflow-hidden transition-transform duration-150 ease-out hover:-translate-y-0.5 hover:border-[#B8DCC5]">
      <Link
        to={`/shop?category=${category.slug}`}
        className="block focus-visible:outline-2 focus-visible:outline-[#176B45]"
        aria-label={`Explore ${category.name}`}
      >
        <ProductImage
          src={category.image}
          alt={category.name}
          aspectClassName="aspect-[4/3]"
          className="group-hover:scale-[1.02]"
        />
      </Link>

      <div className="flex flex-col flex-1 p-6 justify-between gap-5">
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-xs text-[#69746D]">
            <span className="font-medium text-[#176B45]">Department</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-num">
              {productCount} {productCount === 1 ? 'Sample Item' : 'Sample Items'}
            </span>
          </div>

          <h3 className="text-xl font-semibold text-[#202923] tracking-tight">
            <Link
              to={`/shop?category=${category.slug}`}
              className="hover:text-[#176B45] transition-colors"
            >
              {category.name}
            </Link>
          </h3>

          <p className="text-sm text-[#69746D] leading-relaxed">
            {category.shortDescription}
          </p>
        </div>

        <div className="pt-4 border-t border-[#E5EBE6] flex items-center justify-between">
          <Link
            to={`/shop?category=${category.slug}`}
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#123D2A] group-hover:text-[#176B45] transition-colors whitespace-nowrap shrink-0 py-1"
          >
            <span>Explore {category.name}</span>
            <ArrowRight className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </article>
  );
};
