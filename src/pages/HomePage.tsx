import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MessageCircle, ShoppingBag } from 'lucide-react';
import {
  CATEGORIES,
  HERO_SHOWCASE_IMAGE,
  PRODUCTS,
  PROMOTIONAL_BANNER,
  STORE_CONFIG,
} from '../data/storeData';
import { CategoryCard } from '../components/CategoryCard';
import { ProductCard } from '../components/ProductCard';
import { ProductImage } from '../components/ProductImage';
import { ProductCarouselRail } from '../components/ProductCarouselRail';
import { buildWhatsAppGeneralUrl } from '../utils/catalogue';
import { useCart } from '../context/CartContext';

export const HomePage: React.FC = () => {
  const { openCartDrawer, totalItems } = useCart();

  const featuredProducts = PRODUCTS.filter((p) => p.featured);
  const recentlyAddedProducts = [...PRODUCTS].sort(
    (a, b) => b.createdAtOrder - a.createdAtOrder
  );
  const carPartsProducts = PRODUCTS.filter((p) => p.categorySlug === 'car-parts');
  const toyAndUtilityProducts = PRODUCTS.filter(
    (p) => p.categorySlug === 'toy-cars' || p.categorySlug === 'other-products'
  );

  const trustPillars = [
    {
      index: '01. Product Quality',
      description:
        'Each automotive replacement component, scale model, and utility tool is selected with clear specification details and part references.',
    },
    {
      index: '02. Customer Assistance',
      description:
        'Clear product descriptions, fitment references, and direct pre-order consultation help you verify compatibility before ordering.',
    },
    {
      index: '03. Easy Cart & WhatsApp Ordering',
      description:
        'Add multiple preferred items to your cart and send a complete, itemized order sheet to our WhatsApp desk in one click.',
    },
    {
      index: '04. Customer Support',
      description:
        'Responsive communication via our WhatsApp order desk for stock confirmation, dispatch scheduling, and order updates.',
    },
  ];

  return (
    <div>
      {/* 1. HERO SECTION */}
      <section className="bg-[#F8FAF8] border-b border-[#E5EBE6]">
        <div className="max-w-[1200px] mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
            {/* Editorial Copy Column */}
            <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-medium text-[#176B45]">
                  <span className="whitespace-nowrap">Automotive Replacement Parts</span>
                  <span aria-hidden="true">·</span>
                  <span className="whitespace-nowrap">Collector Scale Models</span>
                  <span aria-hidden="true">·</span>
                  <span className="whitespace-nowrap">Utility Equipment</span>
                </div>

                <h1 className="text-2xl sm:text-4xl lg:text-[2.65rem] font-bold text-[#202923] leading-[1.12] tracking-tight [text-wrap:balance]">
                  Dependable Car Parts, Scale Model Vehicles &amp; Essential Gear.
                </h1>

                <p className="text-sm sm:text-base text-[#69746D] leading-relaxed max-w-xl">
                  Slide through available products, add your preferred items to the cart in the top-right corner, and complete your order directly on WhatsApp.
                </p>
              </div>

              <div className="space-y-5 pt-1">
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    to="/shop"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 text-xs sm:text-sm font-semibold text-[#FFFFFF] bg-[#123D2A] rounded-md hover:bg-[#176B45] transition-colors whitespace-nowrap shrink-0 min-h-[42px]"
                  >
                    <span>Shop All Products</span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  </Link>

                  <button
                    type="button"
                    onClick={openCartDrawer}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:px-5 sm:py-3 text-xs sm:text-sm font-semibold text-[#123D2A] bg-[#FFFFFF] border border-[#E5EBE6] rounded-md hover:bg-[#EAF3EC] hover:border-[#B8DCC5] transition-colors whitespace-nowrap shrink-0 min-h-[42px]"
                  >
                    <ShoppingBag className="w-4 h-4 shrink-0" />
                    <span>Open Cart ({totalItems})</span>
                  </button>
                </div>

                {/* Quick Department Filter Links */}
                <div className="pt-4 border-t border-[#E5EBE6] flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-[#69746D] font-medium">Quick Departments:</span>
                  {CATEGORIES.map((cat, idx) => (
                    <React.Fragment key={cat.id}>
                      {idx > 0 && <span aria-hidden="true" className="text-[#69746D]">·</span>}
                      <Link
                        to={`/shop?category=${cat.slug}`}
                        className="font-semibold text-[#123D2A] hover:text-[#176B45] underline-offset-2 hover:underline"
                      >
                        {cat.name}
                      </Link>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>

            {/* Visual Showcase Column */}
            <div className="lg:col-span-6 flex">
              <div className="w-full rounded-lg overflow-hidden border border-[#E5EBE6] bg-[#0E3021] flex flex-col justify-between">
                <ProductImage
                  src={HERO_SHOWCASE_IMAGE}
                  alt="DEX STORES automotive projector headlamp assembly and scale model coupe on stone plinth"
                  aspectClassName="aspect-[16/9] lg:aspect-auto lg:h-full"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. IMMEDIATE PRODUCTS SECTION: SLIDEABLE JUMIA/TEMU RAILS + COMPACT PRODUCT GRID */}
      <section className="py-8 sm:py-12 bg-[#F8FAF8] border-b border-[#E5EBE6]">
        <div className="max-w-[1200px] mx-auto px-3 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
          {/* Transparent Sample Inventory Notice */}
          <div className="px-3.5 py-2.5 bg-[#EAF3EC] border border-[#B8DCC5] rounded-md text-[11px] sm:text-xs text-[#0E3021]">
            {STORE_CONFIG.sampleInventoryNotice}
          </div>

          {/* Rail 1: Featured & Top Picks (Slide Left / Right) */}
          <ProductCarouselRail
            title="Featured Products — Slide to Browse"
            subtitle="Swipe left or right to inspect products and tap Add to Cart"
            products={PRODUCTS}
            viewAllLink="/shop"
            viewAllLabel="See All"
            headerBgClass="bg-[#123D2A] text-[#FFFFFF]"
          />

          {/* Rail 2: Car Parts & Replacement Hardware */}
          <ProductCarouselRail
            title="Car Parts & Exterior Hardware"
            subtitle="Headlamps, power mirrors, and brake rotor sets"
            products={[
              ...carPartsProducts,
              ...featuredProducts.filter((p) => p.categorySlug !== 'car-parts'),
            ]}
            viewAllLink="/shop?category=car-parts"
            viewAllLabel="All Car Parts"
            headerBgClass="bg-[#0E3021] text-[#EAF3EC]"
          />

          {/* Rail 3: Toy Cars & Utility Gear */}
          <ProductCarouselRail
            title="Toy Cars & Essential Vehicle Gear"
            subtitle="Die-cast scale models, 4WD RC buggies, tire inflators & 4K dashcams"
            products={toyAndUtilityProducts}
            viewAllLink="/shop?category=toy-cars"
            viewAllLabel="Explore More"
            headerBgClass="bg-[#176B45] text-[#FFFFFF]"
          />

          {/* Compact 2-Column Mobile / 3-Col Tablet / 4-Col Desktop Product Grid */}
          <div className="pt-4 space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-[#176B45]">Complete Storefront Feed</p>
                <h2 className="text-xl sm:text-2xl font-bold text-[#202923] tracking-tight">
                  All Available Products
                </h2>
              </div>
              <Link
                to="/shop"
                className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-[#123D2A] hover:text-[#176B45] whitespace-nowrap shrink-0"
              >
                <span>Filter &amp; Sort</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
              {recentlyAddedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. CATEGORY SECTION */}
      <section className="py-12 sm:py-16 bg-[#FFFFFF] border-b border-[#E5EBE6]">
        <div className="max-w-[1200px] mx-auto px-3 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-[#176B45]">Store Departments</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#202923] tracking-tight">
                Shop by Category
              </h2>
            </div>
            <Link
              to="/categories"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#123D2A] hover:text-[#176B45] transition-colors whitespace-nowrap shrink-0"
            >
              <span>View Department Directory</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {CATEGORIES.map((category) => {
              const count = PRODUCTS.filter((p) => p.categorySlug === category.slug).length;
              return (
                <CategoryCard
                  key={category.id}
                  category={category}
                  productCount={count}
                />
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. PROMOTIONAL SECTION */}
      <section className="py-12 sm:py-16 bg-[#F8FAF8] border-b border-[#E5EBE6]">
        <div className="max-w-[1200px] mx-auto px-3 sm:px-6 lg:px-8">
          <div className="bg-[#123D2A] text-[#FFFFFF] rounded-lg p-6 sm:p-10 lg:p-12 border border-[#0E3021]">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-8 space-y-3">
                <p className="text-xs font-semibold text-[#B8DCC5]">
                  {PROMOTIONAL_BANNER.eyebrow}
                </p>
                <h2 className="text-xl sm:text-3xl font-bold text-[#FFFFFF] tracking-tight leading-snug [text-wrap:balance]">
                  {PROMOTIONAL_BANNER.headline}
                </h2>
                <p className="text-xs sm:text-base text-[#EAF3EC]/90 leading-relaxed max-w-2xl">
                  {PROMOTIONAL_BANNER.description}
                </p>
              </div>

              <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-3 justify-end">
                <Link
                  to={PROMOTIONAL_BANNER.primaryCtaLink}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 text-xs sm:text-sm font-semibold text-[#0E3021] bg-[#B8DCC5] rounded-md hover:bg-[#EAF3EC] transition-colors whitespace-nowrap shrink-0 min-h-[42px]"
                >
                  <span>{PROMOTIONAL_BANNER.primaryCtaLabel}</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </Link>
                <a
                  href={buildWhatsAppGeneralUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 text-xs sm:text-sm font-semibold text-[#EAF3EC] bg-[#0E3021] border border-[#176B45] rounded-md hover:bg-[#176B45] transition-colors whitespace-nowrap shrink-0 min-h-[42px]"
                >
                  <MessageCircle className="w-4 h-4 shrink-0" />
                  <span>Chat with Order Desk</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. TRUST AND INFORMATION SECTION */}
      <section className="py-12 sm:py-16 bg-[#FFFFFF]">
        <div className="max-w-[1200px] mx-auto px-3 sm:px-6 lg:px-8 space-y-8">
          <div className="max-w-2xl space-y-1.5">
            <p className="text-xs font-semibold text-[#176B45]">How DEX STORES Operates</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#202923] tracking-tight">
              Straightforward Product Sourcing &amp; Ordering
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-4 border-t border-[#E5EBE6]">
            {trustPillars.map((pillar) => (
              <div key={pillar.index} className="space-y-2">
                <h3 className="text-sm sm:text-base font-semibold text-[#123D2A]">
                  {pillar.index}
                </h3>
                <p className="text-xs sm:text-sm text-[#69746D] leading-relaxed">
                  {pillar.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
