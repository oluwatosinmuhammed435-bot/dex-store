import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, CheckCircle2, MessageCircle, ShoppingBag, Sparkles } from 'lucide-react';
import { HERO_SHOWCASE_IMAGE, PROMOTIONAL_BANNER, type Product } from '../data/storeData';
import { CategoryCard } from '../components/CategoryCard';
import { ProductCard } from '../components/ProductCard';
import { ProductImage } from '../components/ProductImage';
import { ProductCarouselRail } from '../components/ProductCarouselRail';
import { ProductQuickViewModal } from '../components/ProductQuickViewModal';
import { ProductCardSkeleton } from '../components/ui';
import { buildWhatsAppGeneralUrl } from '../utils/catalogue';
import { useCart } from '../context/CartContext';
import { useStoreData } from '../context/StoreDataContext';

export const HomePage: React.FC = () => {
  const { openCartDrawer, totalItems } = useCart();
  const { products, categories, storeConfig, isLoading, hasLiveProducts } = useStoreData();
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  const featuredProducts = products.filter((p) => p.featured);
  const recentlyAddedProducts = [...products].sort(
    (a, b) => b.createdAtOrder - a.createdAtOrder
  );

  // Build up to 2 dynamic department rails from live or sample categories that currently contain products
  const dynamicCategoryRails = categories
    .map((cat) => ({
      category: cat,
      items: recentlyAddedProducts.filter((p) => p.categorySlug === cat.slug),
    }))
    .filter((entry) => entry.items.length > 0)
    .slice(0, 2);

  const trustPillars = [
    {
      index: '01. Verified Hardware',
      description:
        'Each automotive replacement component, scale model, and utility tool is selected with clear specifications and part references.',
    },
    {
      index: '02. Transparent Fitment',
      description:
        'Detailed product descriptions, high-resolution imagery, and pre-order guidance help you confirm compatibility before ordering.',
    },
    {
      index: '03. Instant Cart & WhatsApp',
      description:
        'Build an itemized cart in seconds and dispatch a structured order sheet directly to our WhatsApp desk with one tap.',
    },
    {
      index: '04. Dedicated Order Desk',
      description:
        'Responsive communication via WhatsApp for live stock confirmation, dispatch scheduling, and order updates.',
    },
  ];

  return (
    <div>
      {/* Quick View Modal / Adaptive Bottom Sheet */}
      <ProductQuickViewModal
        product={quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
      />

      {/* 1. PREMIUM HERO SECTION */}
      <section className="bg-gradient-to-b from-[#EFF8F2] via-[#F7FAF8] to-[#FFFFFF] border-b border-[#E2EAE5]">
        <div className="max-w-[1200px] mx-auto px-3.5 sm:px-6 lg:px-8 py-6 sm:py-12 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-12 items-center">
            {/* Editorial Copy Column */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="lg:col-span-6 space-y-5 sm:space-y-6"
            >
              <div className="space-y-3.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFFFFF] border border-[#C6E5D2] text-[#176B45] text-[11px] sm:text-xs font-semibold shadow-2xs">
                  <Sparkles className="w-3.5 h-3.5 text-[#279B62]" aria-hidden="true" />
                  <span>Parts · Collectibles · Utility Gear</span>
                </span>

                <h1 className="text-[1.75rem] sm:text-4xl lg:text-[2.75rem] font-extrabold text-[#17231C] leading-[1.1] tracking-tight">
                  Dependable Car Parts, Scale Models &amp; Essential Gear.
                </h1>

                <p className="text-sm sm:text-base text-[#5C6B62] leading-relaxed max-w-xl">
                  Explore precision automotive components and collector vehicles in one fluid storefront. Preview specifications, add items to cart, and confirm directly via WhatsApp.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                <Link
                  to="/shop"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 sm:px-6 text-xs sm:text-sm font-semibold text-[#FFFFFF] bg-[#176B45] rounded-xl hover:bg-[#123D2A] shadow-xs whitespace-nowrap shrink-0 min-h-[44px] dex-press"
                >
                  <span>Shop Catalogue</span>
                  <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
                </Link>

                <button
                  type="button"
                  onClick={openCartDrawer}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 sm:px-5 text-xs sm:text-sm font-semibold text-[#123D2A] bg-[#FFFFFF] border border-[#E2EAE5] rounded-xl hover:bg-[#EAF5EE] hover:border-[#B8DCC5] whitespace-nowrap shrink-0 min-h-[44px] dex-press"
                >
                  <ShoppingBag className="w-4 h-4 shrink-0 text-[#176B45]" aria-hidden="true" />
                  <span>Open Cart ({totalItems})</span>
                </button>
              </div>

              {/* Scrollable Mobile Department Pills */}
              <div className="pt-3 border-t border-[#E2EAE5] space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5C6B62] block">
                  Browse Departments
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {categories.map((cat) => (
                    <Link
                      key={cat.id}
                      to={`/shop?category=${cat.slug}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFFFFF] border border-[#E2EAE5] hover:border-[#B8DCC5] hover:bg-[#EAF5EE] text-xs font-semibold text-[#123D2A] transition-colors dex-press min-h-[36px]"
                    >
                      <span>{cat.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Visual Showcase Column */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.34, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
              className="lg:col-span-6"
            >
              <div className="relative rounded-2xl overflow-hidden border border-[#C6E5D2] bg-[#0E3021] shadow-md">
                <ProductImage
                  src={HERO_SHOWCASE_IMAGE}
                  alt="DEX STORES automotive projector headlamp assembly and scale model coupe on stone plinth"
                  aspectClassName="aspect-[16/10] sm:aspect-[16/9] lg:aspect-[5/4]"
                  priority
                />

                {/* Subtle Floating Verification Pill */}
                <div className="absolute bottom-3 left-3 right-3 sm:left-4 sm:right-auto bg-[#FFFFFF]/95 backdrop-blur-md border border-[#E2EAE5] rounded-xl px-3.5 py-2.5 flex items-center gap-2.5 shadow-sm">
                  <div className="w-7 h-7 rounded-lg bg-[#EAF5EE] text-[#176B45] flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#17231C] truncate">
                      {hasLiveProducts ? 'Live Store Inventory Connected' : 'Direct WhatsApp Order Desk'}
                    </p>
                    <p className="text-[10px] text-[#5C6B62] truncate">
                      Quick preview · Instant cart checkout
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 2. SLIDEABLE STOREFRONT RAILS & PRODUCT FEED */}
      <section className="py-7 sm:py-12 bg-[#F7FAF8] border-b border-[#E2EAE5]">
        <div className="max-w-[1200px] mx-auto px-3 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
          {!hasLiveProducts && storeConfig.sampleInventoryNotice && (
            <div className="px-4 py-2.5 bg-[#EAF5EE] border border-[#C6E5D2] rounded-xl text-[11px] sm:text-xs text-[#123D2A]">
              {storeConfig.sampleInventoryNotice}
            </div>
          )}

          {/* Rail 1: Featured / Highlighted Picks */}
          <ProductCarouselRail
            title="Featured Products"
            subtitle="Swipe left or right to preview products and add to cart"
            products={featuredProducts.length > 0 ? featuredProducts : products}
            viewAllLink="/shop"
            viewAllLabel="See All"
            accentTone="forest"
            onQuickView={setQuickViewProduct}
          />

          {/* Dynamic Department Rails synced with active categories */}
          {dynamicCategoryRails.map(({ category, items }, index) => (
            <ProductCarouselRail
              key={category.id || category.slug}
              title={category.name}
              subtitle={`Explore curated ${category.name.toLowerCase()} listings`}
              products={items}
              viewAllLink={`/shop?category=${encodeURIComponent(category.slug)}`}
              viewAllLabel="Explore"
              accentTone={index % 2 === 0 ? 'mint' : 'fresh'}
              onQuickView={setQuickViewProduct}
            />
          ))}

          {/* Compact Storefront Feed Grid */}
          <div className="pt-3 space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-[#176B45] uppercase tracking-wider">
                  Complete Feed
                </p>
                <h2 className="text-xl sm:text-2xl font-bold text-[#17231C] tracking-tight mt-0.5">
                  All Available Products
                </h2>
              </div>
              <Link
                to="/shop"
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#176B45] hover:text-[#123D2A] whitespace-nowrap shrink-0 py-1"
              >
                <span>Filter &amp; Sort</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>

            {isLoading && products.length === 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
                {recentlyAddedProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onQuickView={setQuickViewProduct}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 3. CATEGORY DIRECTORY SECTION */}
      <section className="py-12 sm:py-16 bg-[#FFFFFF] border-b border-[#E2EAE5]">
        <div className="max-w-[1200px] mx-auto px-3 sm:px-6 lg:px-8 space-y-7">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-[#176B45] uppercase tracking-wider">
                Store Departments
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#17231C] tracking-tight">
                Shop by Category
              </h2>
            </div>
            <Link
              to="/categories"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#176B45] hover:text-[#123D2A] transition-colors whitespace-nowrap shrink-0"
            >
              <span>View Department Directory</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {categories.map((category) => {
              const count = products.filter((p) => p.categorySlug === category.slug).length;
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

      {/* 4. PROMOTIONAL WHATSAPP BANNER */}
      <section className="py-10 sm:py-16 bg-[#F7FAF8] border-b border-[#E2EAE5]">
        <div className="max-w-[1200px] mx-auto px-3 sm:px-6 lg:px-8">
          <div className="bg-[#123D2A] text-[#FFFFFF] rounded-2xl p-6 sm:p-10 lg:p-12 border border-[#0E3021] shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center">
              <div className="lg:col-span-8 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#B8DCC5]">
                  {PROMOTIONAL_BANNER.eyebrow}
                </p>
                <h2 className="text-xl sm:text-3xl font-bold text-[#FFFFFF] tracking-tight leading-snug">
                  {PROMOTIONAL_BANNER.headline}
                </h2>
                <p className="text-xs sm:text-base text-[#EAF5EE]/90 leading-relaxed max-w-2xl">
                  {PROMOTIONAL_BANNER.description}
                </p>
              </div>

              <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-3 justify-end">
                <Link
                  to={PROMOTIONAL_BANNER.primaryCtaLink}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 text-xs sm:text-sm font-semibold text-[#0E3021] bg-[#D9F0E2] rounded-xl hover:bg-[#EAF5EE] whitespace-nowrap shrink-0 min-h-[44px] dex-press"
                >
                  <span>{PROMOTIONAL_BANNER.primaryCtaLabel}</span>
                  <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
                </Link>
                <a
                  href={buildWhatsAppGeneralUrl(
                    `Hello ${storeConfig.brandName}, I have an enquiry regarding your product catalogue.`,
                    storeConfig.whatsappNumber
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 text-xs sm:text-sm font-semibold text-[#EAF5EE] bg-[#0E3021] border border-[#176B45] rounded-xl hover:bg-[#176B45] whitespace-nowrap shrink-0 min-h-[44px] dex-press"
                >
                  <MessageCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Chat with Order Desk</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. TRUST & OPERATING PILLARS */}
      <section className="py-12 sm:py-16 bg-[#FFFFFF]">
        <div className="max-w-[1200px] mx-auto px-3 sm:px-6 lg:px-8 space-y-7">
          <div className="max-w-2xl space-y-1">
            <p className="text-xs font-semibold text-[#176B45] uppercase tracking-wider">
              How {storeConfig.brandName} Operates
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#17231C] tracking-tight">
              Straightforward Product Sourcing &amp; Ordering
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 pt-2">
            {trustPillars.map((pillar) => (
              <div
                key={pillar.index}
                className="p-5 rounded-2xl bg-[#F7FAF8] border border-[#E2EAE5] space-y-2"
              >
                <h3 className="text-sm sm:text-base font-bold text-[#123D2A]">
                  {pillar.index}
                </h3>
                <p className="text-xs sm:text-sm text-[#5C6B62] leading-relaxed">
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
