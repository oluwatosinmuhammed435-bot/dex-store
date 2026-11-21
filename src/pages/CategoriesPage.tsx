import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { CATEGORIES, PRODUCTS, type Product } from '../data/storeData';
import { fetchStorefrontProducts } from '../utils/productService';
import { ProductImage } from '../components/ProductImage';
import { ProductCarouselRail } from '../components/ProductCarouselRail';

export const CategoriesPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>(PRODUCTS);

  useEffect(() => {
    let isMounted = true;
    fetchStorefrontProducts().then((liveProducts) => {
      if (isMounted && liveProducts && liveProducts.length > 0) {
        setProducts(liveProducts);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="bg-[#FFFFFF]">
      <section className="bg-[#F8FAF8] border-b border-[#E5EBE6]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-3">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#69746D]">
            <Link to="/" className="hover:text-[#123D2A]">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-[#202923] font-medium">Categories</span>
          </nav>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#202923] tracking-tight">
            Product Categories
          </h1>
          <p className="text-sm text-[#69746D] max-w-2xl">
            Explore the three primary departments at DEX STORES: replacement Car Parts, scale &amp; remote control Toy Cars, and essential Other Products. Slide left or right on any department rail to inspect products and add to cart.
          </p>
        </div>
      </section>

      <div className="max-w-[1200px] mx-auto px-3 sm:px-6 lg:px-8 py-10 space-y-12">
        {CATEGORIES.map((category) => {
          const categoryProducts = products.filter(
            (p) => p.categorySlug === category.slug
          );

          return (
            <section
              key={category.id}
              className="space-y-5 pb-10 border-b border-[#E5EBE6] last:border-b-0 last:pb-0"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center bg-[#F8FAF8] border border-[#E5EBE6] rounded-lg p-5 sm:p-7">
                <div className="lg:col-span-4 rounded-md overflow-hidden border border-[#E5EBE6]">
                  <ProductImage
                    src={category.image}
                    alt={category.name}
                    aspectClassName="aspect-[16/10]"
                  />
                </div>

                <div className="lg:col-span-8 space-y-3">
                  <div className="flex items-center gap-2 text-xs text-[#69746D]">
                    <span className="font-semibold text-[#176B45]">Department</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-num">
                      {categoryProducts.length} Sample Products
                    </span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-bold text-[#202923] tracking-tight">
                    {category.name}
                  </h2>

                  <p className="text-xs sm:text-sm text-[#69746D] leading-relaxed">
                    {category.editorialSummary}
                  </p>

                  <div className="pt-1">
                    <Link
                      to={`/shop?category=${category.slug}`}
                      className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#FFFFFF] bg-[#123D2A] rounded-md hover:bg-[#176B45] transition-colors min-h-[38px]"
                    >
                      <span>Open {category.name} Catalogue</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>

              <ProductCarouselRail
                title={`${category.name} — Slide Left or Right`}
                products={categoryProducts}
                viewAllLink={`/shop?category=${category.slug}`}
                viewAllLabel={`View All ${category.name}`}
              />
            </section>
          );
        })}
      </div>
    </div>
  );
};
