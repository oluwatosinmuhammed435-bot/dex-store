import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import { type Product } from '../data/storeData';
import { filterAndSortProducts, SortOption } from '../utils/catalogue';
import { useStoreData } from '../context/StoreDataContext';
import { ProductCard } from '../components/ProductCard';
import { ProductQuickViewModal } from '../components/ProductQuickViewModal';
import { ProductCardSkeleton } from '../components/ui';

const VALID_SORTS: SortOption[] = ['featured', 'newest', 'price-asc', 'price-desc'];

export const CataloguePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { products, categories, storeConfig, isLoading, hasLiveProducts } = useStoreData();
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  const rawCategory = searchParams.get('category');
  const activeCategory: string = rawCategory && rawCategory.trim() ? rawCategory : 'all';

  const rawSort = searchParams.get('sort') as SortOption | null;
  const activeSort: SortOption =
    rawSort && VALID_SORTS.includes(rawSort) ? rawSort : 'featured';

  const searchQuery = searchParams.get('q') ?? '';

  const filteredProducts = useMemo(
    () =>
      filterAndSortProducts(products, {
        searchQuery,
        categorySlug: activeCategory,
        sortBy: activeSort,
      }),
    [products, searchQuery, activeCategory, activeSort]
  );

  const updateParams = (updates: {
    q?: string;
    category?: string;
    sort?: SortOption;
  }) => {
    const next = new URLSearchParams(searchParams);

    if (updates.q !== undefined) {
      if (updates.q.trim()) {
        next.set('q', updates.q);
      } else {
        next.delete('q');
      }
    }

    if (updates.category !== undefined) {
      if (updates.category === 'all') {
        next.delete('category');
      } else {
        next.set('category', updates.category);
      }
    }

    if (updates.sort !== undefined) {
      if (updates.sort === 'featured') {
        next.delete('sort');
      } else {
        next.set('sort', updates.sort);
      }
    }

    setSearchParams(next, { replace: true });
  };

  const handleResetAll = () => {
    setSearchParams({}, { replace: true });
  };

  const activeCategoryName =
    activeCategory === 'all'
      ? 'Full Product Catalogue'
      : categories.find((c) => c.slug === activeCategory)?.name ?? 'Filtered Catalogue';

  return (
    <div className="bg-[#FFFFFF]">
      <ProductQuickViewModal
        product={quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
      />

      {/* Page Header */}
      <section className="bg-[#F7FAF8] border-b border-[#E2EAE5]">
        <div className="max-w-[1200px] mx-auto px-3.5 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-2.5">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#5C6B62]">
            <Link to="/" className="hover:text-[#176B45]">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-[#17231C] font-semibold">Shop</span>
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#17231C] tracking-tight">
                {activeCategoryName}
              </h1>
              <p className="text-xs sm:text-sm text-[#5C6B62] max-w-2xl">
                Browse automotive replacement components, die-cast &amp; remote control vehicles, and utility equipment.
              </p>
            </div>

            <div className="text-xs text-[#5C6B62] font-mono-num shrink-0 bg-[#FFFFFF] px-3 py-1.5 rounded-full border border-[#E2EAE5]">
              Showing <strong className="text-[#123D2A]">{filteredProducts.length}</strong> of{' '}
              <strong className="text-[#123D2A]">{products.length}</strong> items
            </div>
          </div>
        </div>
      </section>

      {/* Filter, Search & Sort Controls + Product Grid */}
      <section className="max-w-[1200px] mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6">
        {!hasLiveProducts && storeConfig.sampleInventoryNotice && (
          <div className="px-4 py-2.5 bg-[#EAF5EE] border border-[#C6E5D2] rounded-xl text-xs text-[#123D2A]">
            {storeConfig.sampleInventoryNotice}
          </div>
        )}

        {/* Control Toolbar */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3.5 pb-5 border-b border-[#E2EAE5]">
          {/* Horizontal Scrollable Category Pills on Mobile, Clean Wrap on Desktop */}
          <div
            role="group"
            aria-label="Filter products by category"
            className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 sm:flex-wrap"
          >
            <button
              type="button"
              onClick={() => updateParams({ category: 'all' })}
              className={`px-4 py-2 text-xs font-semibold rounded-full transition-colors whitespace-nowrap shrink-0 min-h-[40px] dex-press ${activeCategory === 'all'
                  ? 'bg-[#176B45] text-[#FFFFFF] shadow-2xs'
                  : 'bg-[#F7FAF8] text-[#5C6B62] border border-[#E2EAE5] hover:border-[#B8DCC5] hover:text-[#123D2A]'
                }`}
            >
              All Products
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => updateParams({ category: cat.slug })}
                className={`px-4 py-2 text-xs font-semibold rounded-full transition-colors whitespace-nowrap shrink-0 min-h-[40px] dex-press ${activeCategory === cat.slug
                    ? 'bg-[#176B45] text-[#FFFFFF] shadow-2xs'
                    : 'bg-[#F7FAF8] text-[#5C6B62] border border-[#E2EAE5] hover:border-[#B8DCC5] hover:text-[#123D2A]'
                  }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Search Input & Sorting Select */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1 sm:w-64">
              <label htmlFor="catalogue-search" className="sr-only">
                Search products
              </label>
              <Search
                className="w-4 h-4 text-[#5C6B62] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="catalogue-search"
                type="search"
                value={searchQuery}
                onChange={(e) => updateParams({ q: e.target.value })}
                placeholder="Search name or SKU…"
                className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm bg-[#FFFFFF] border border-[#E2EAE5] rounded-xl text-[#17231C] placeholder:text-[#7B8A80] focus:outline-none focus:border-[#176B45] min-h-[44px]"
              />
            </div>

            <div className="flex items-center gap-2">
              <label
                htmlFor="catalogue-sort"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5C6B62] whitespace-nowrap shrink-0"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Sort:</span>
              </label>
              <select
                id="catalogue-sort"
                value={activeSort}
                onChange={(e) => updateParams({ sort: e.target.value as SortOption })}
                className="flex-1 sm:flex-initial px-3.5 py-2 text-xs sm:text-sm bg-[#FFFFFF] border border-[#E2EAE5] rounded-xl text-[#17231C] font-medium focus:outline-none focus:border-[#176B45] min-h-[44px]"
              >
                <option value="featured">Featured</option>
                <option value="newest">Newest</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Product Grid or Empty State */}
        {isLoading && filteredProducts.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {Array.from({ length: 8 }).map((_, idx) => (
              <ProductCardSkeleton key={idx} />
            ))}
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onQuickView={setQuickViewProduct}
              />
            ))}
          </div>
        ) : (
          <div className="py-16 px-6 text-center bg-[#F7FAF8] border border-[#E2EAE5] rounded-2xl max-w-lg mx-auto my-6 space-y-4">
            <h2 className="text-lg font-bold text-[#17231C]">No matching products found</h2>
            <p className="text-sm text-[#5C6B62] leading-relaxed">
              No products matched your current filter or search query{' '}
              {searchQuery ? `"${searchQuery}"` : ''}. Try clearing your search or switching to another category.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleResetAll}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-[#FFFFFF] bg-[#176B45] rounded-xl hover:bg-[#123D2A] min-h-[44px] dex-press"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Reset Search &amp; Filters</span>
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
