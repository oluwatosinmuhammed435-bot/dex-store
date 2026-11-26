import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { type Product } from '../data/storeData';
import { useStoreData } from '../context/StoreDataContext';
import { ProductImage } from '../components/ProductImage';
import { ProductCarouselRail } from '../components/ProductCarouselRail';
import { ProductQuickViewModal } from '../components/ProductQuickViewModal';
import { Badge } from '../components/ui';

export const CategoriesPage: React.FC = () => {
  const { products, categories } = useStoreData();
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  return (
    <div className="bg-[#FFFFFF]">
      <ProductQuickViewModal
        product={quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
      />

      <section className="bg-[#F7FAF8] border-b border-[#E2EAE5]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-7 sm:py-10 space-y-2.5">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#5C6B62]">
            <Link to="/" className="hover:text-[#176B45]">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-[#17231C] font-semibold">Categories</span>
          </nav>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#17231C] tracking-tight">
            Product Categories
          </h1>
          <p className="text-xs sm:text-sm text-[#5C6B62] max-w-2xl">
            Explore curated departments at DEX STORES. Swipe across any department rail to inspect products, quick-preview specifications, or add to cart.
          </p>
        </div>
      </section>

      <div className="max-w-[1200px] mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-10 sm:space-y-12">
        {categories.map((category) => {
          const categoryProducts = products.filter(
            (p) => p.categorySlug === category.slug
          );

          return (
            <section
              key={category.id}
              className="space-y-5 pb-10 border-b border-[#E2EAE5] last:border-b-0 last:pb-0"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-center bg-[#F7FAF8] border border-[#E2EAE5] rounded-2xl p-4 sm:p-7 shadow-xs">
                <div className="lg:col-span-4 rounded-xl overflow-hidden border border-[#E2EAE5] bg-[#FFFFFF]">
                  <ProductImage
                    src={category.image}
                    alt={category.name}
                    aspectClassName="aspect-[16/10]"
                  />
                </div>

                <div className="lg:col-span-8 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#176B45] uppercase tracking-wider">
                      Department
                    </span>
                    <Badge variant="brand" className="font-mono-num">
                      {categoryProducts.length} {categoryProducts.length === 1 ? 'Product' : 'Products'}
                    </Badge>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-bold text-[#17231C] tracking-tight">
                    {category.name}
                  </h2>

                  <p className="text-xs sm:text-sm text-[#5C6B62] leading-relaxed">
                    {category.editorialSummary}
                  </p>

                  <div className="pt-1">
                    <Link
                      to={`/shop?category=${category.slug}`}
                      className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-[#FFFFFF] bg-[#176B45] rounded-xl hover:bg-[#123D2A] min-h-[42px] dex-press"
                    >
                      <span>Open {category.name} Catalogue</span>
                      <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </div>

              {categoryProducts.length > 0 ? (
                <ProductCarouselRail
                  title={`${category.name} — Swipe to Browse`}
                  products={categoryProducts}
                  viewAllLink={`/shop?category=${category.slug}`}
                  viewAllLabel={`View All ${category.name}`}
                  accentTone="mint"
                  onQuickView={setQuickViewProduct}
                />
              ) : (
                <div className="bg-[#F7FAF8] border border-dashed border-[#C6E5D2] rounded-2xl px-4 py-5 text-xs sm:text-sm text-[#5C6B62]">
                  No published products listed in {category.name} yet. Check back soon or explore our main catalogue.
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
};
