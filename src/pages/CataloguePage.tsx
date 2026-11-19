import React, { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import {
  CATEGORIES,
  CategorySlug,
  PRODUCTS,
  STORE_CONFIG,
} from '../data/storeData';
import {
  filterAndSortProducts,
  SortOption,
} from '../utils/catalogue';
import { ProductCard } from '../components/ProductCard';

const VALID_CATEGORIES: (CategorySlug | 'all')[] = [
  'all',
  'car-parts',
  'toy-cars',
  'other-products',
];

const VALID_SORTS: SortOption[] = [
  'featured',
  'newest',
  'price-asc',
  'price-desc',
];

export const CataloguePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const rawCategory = searchParams.get('category') as CategorySlug | 'all' | null;
  const activeCategory: CategorySlug | 'all' =
    rawCategory && VALID_CATEGORIES.includes(rawCategory) ? rawCategory : 'all';

  const rawSort = searchParams.get('sort') as SortOption | null;
  const activeSort: SortOption =
    rawSort && VALID_SORTS.includes(rawSort) ? rawSort : 'featured';

  const searchQuery = searchParams.get('q') ?? '';

  const filteredProducts = useMemo(
    () =>
      filterAndSortProducts(PRODUCTS, {
        searchQuery,
        categorySlug: activeCategory,
        sortBy: activeSort,
      }),
    [searchQuery, activeCategory, activeSort]
  );

  const updateParams = (updates: {
    q?: string;
    category?: CategorySlug | 'all';
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
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const activeCategoryName =
    activeCategory === 'all'
      ? 'All Categories'
      : CATEGORIES.find((c) => c.slug === activeCategory)?.name ?? 'All Categories';

  return (
    <div className="bg-[#FFFFFF] min-h-[70vh]">
      {/* Page Header & Breadcrumbs */}
      <section className="bg-[#F8FAF8] border-b border-[#E5EBE6]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-4">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#69746D]">
            <Link to="/" className="hover:text-[#123D2A] transition-colors">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-[#202923] font-medium">Product Catalogue</span>
            {activeCategory !== 'all' && (
              <>
                <span aria-hidden="true">/</span>
                <span className="text-[#176B45] font-medium">{activeCategoryName}</span>
              </>
            )}
          </nav>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#202923] tracking-tight">
                {activeCategory === 'all' ? 'Product Catalogue' : activeCategoryName}
              </h1>
              <p className="text-sm text-[#69746D] max-w-2xl">
                Browse replacement car parts, die-cast and remote control vehicles, and utility equipment. Select any product to inspect specifications or place a WhatsApp order.
              </p>
            </div>

            <div className="text-xs text-[#69746D] font-mono-num shrink-0">
              Showing <strong className="text-[#202923]">{filteredProducts.length}</strong> of{' '}
              <strong className="text-[#202923]">{PRODUCTS.length}</strong> sample products
            </div>
          </div>
        </div>
      </section>

      {/* Filter, Search & Sort Controls + Product Grid */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
        {/* Sample Inventory Notice */}
        <div className="px-4 py-3 bg-[#EAF3EC] border border-[#B8DCC5] rounded-md text-xs text-[#0E3021]">
          {STORE_CONFIG.sampleInventoryNotice}
        </div>

        {/* Control Toolbar */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 pb-6 border-b border-[#E5EBE6]">
          {/* Category Filter Segmented Controls */}
          <div
            role="group"
            aria-label="Filter products by category"
            className="flex flex-wrap items-center gap-1.5 p-1 bg-[#F8FAF8] border border-[#E5EBE6] rounded-lg"
          >
            <button
              type="button"
              onClick={() => updateParams({ category: 'all' })}
              className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 min-h-[36px] ${
                activeCategory === 'all'
                  ? 'bg-[#123D2A] text-[#FFFFFF]'
                  : 'text-[#69746D] hover:text-[#202923]'
              }`}
            >
              All Products
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => updateParams({ category: cat.slug })}
                className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 min-h-[36px] ${
                  activeCategory === cat.slug
                    ? 'bg-[#123D2A] text-[#FFFFFF]'
                    : 'text-[#69746D] hover:text-[#202923]'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Search Input & Sorting Select */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1 sm:w-64">
              <label htmlFor="catalogue-search" className="sr-only">
                Search products
              </label>
              <Search className="w-4 h-4 text-[#69746D] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="catalogue-search"
                type="search"
                value={searchQuery}
                onChange={(e) => updateParams({ q: e.target.value })}
                placeholder="Search name or SKU..."
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-[#FFFFFF] border border-[#E5EBE6] rounded-md text-[#202923] placeholder:text-[#69746D] focus:outline-none focus:border-[#176B45] min-h-[40px]"
              />
            </div>

            <div className="flex items-center gap-2">
              <label
                htmlFor="catalogue-sort"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#69746D] whitespace-nowrap shrink-0"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Sort by:</span>
              </label>
              <select
                id="catalogue-sort"
                value={activeSort}
                onChange={(e) => updateParams({ sort: e.target.value as SortOption })}
                className="px-3 py-2 text-xs sm:text-sm bg-[#FFFFFF] border border-[#E5EBE6] rounded-md text-[#202923] font-medium focus:outline-none focus:border-[#176B45] min-h-[40px]"
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
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="py-16 px-6 text-center bg-[#F8FAF8] border border-[#E5EBE6] rounded-lg max-w-lg mx-auto my-6 space-y-4">
            <h2 className="text-lg font-semibold text-[#202923]">
              No matching products found
            </h2>
            <p className="text-sm text-[#69746D] leading-relaxed">
              No products matched your current filter or search query{' '}
              {searchQuery ? `"${searchQuery}"` : ''}. Try clearing your search or switching to another category.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleResetAll}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-[#FFFFFF] bg-[#123D2A] rounded-md hover:bg-[#176B45] transition-colors min-h-[40px]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Search &amp; Filters</span>
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
