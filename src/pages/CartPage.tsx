import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { type Product } from '../data/storeData';
import { useCart } from '../context/CartContext';
import { useStoreData } from '../context/StoreDataContext';
import {
  buildWhatsAppCartOrderMessage,
  buildWhatsAppCartOrderUrl,
  formatNaira,
} from '../utils/catalogue';
import { ProductImage } from '../components/ProductImage';
import { ProductCarouselRail } from '../components/ProductCarouselRail';
import { ProductQuickViewModal } from '../components/ProductQuickViewModal';

export const CartPage: React.FC = () => {
  const { items, totalItems, subtotalNgn, updateQuantity, removeFromCart, clearCart } =
    useCart();
  const { products, storeConfig } = useStoreData();
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  const whatsappUrl = buildWhatsAppCartOrderUrl(items, storeConfig.whatsappNumber, storeConfig.brandName);
  const whatsappPreview = buildWhatsAppCartOrderMessage(items, storeConfig.brandName);

  return (
    <div className="bg-[#F7FAF8] min-h-[75vh]">
      <ProductQuickViewModal
        product={quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
      />

      {/* Header & Breadcrumbs */}
      <section className="bg-[#FFFFFF] border-b border-[#E2EAE5]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-2">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#5C6B62]">
            <Link to="/" className="hover:text-[#176B45]">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <Link to="/shop" className="hover:text-[#176B45]">
              Shop
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-[#17231C] font-semibold">Shopping Cart</span>
          </nav>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#17231C] tracking-tight">
              Shopping Cart ({totalItems})
            </h1>
            <Link
              to="/shop"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#176B45] hover:text-[#123D2A]"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Continue Shopping</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-[1200px] mx-auto px-3.5 sm:px-6 lg:px-8 py-7 sm:py-9 space-y-10">
        {items.length === 0 ? (
          <div className="bg-[#FFFFFF] border border-[#E2EAE5] rounded-2xl p-8 sm:p-10 text-center max-w-lg mx-auto space-y-4 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-[#EAF5EE] border border-[#C6E5D2] text-[#176B45] flex items-center justify-center mx-auto">
              <ShoppingBag className="w-6 h-6" aria-hidden="true" />
            </div>
            <h2 className="text-lg font-bold text-[#17231C]">Your cart is empty</h2>
            <p className="text-xs sm:text-sm text-[#5C6B62]">
              Explore our catalogue of car parts, scale model vehicles, and utility gear to add items to your cart.
            </p>
            <div className="pt-2">
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-[#FFFFFF] bg-[#176B45] rounded-xl hover:bg-[#123D2A] min-h-[44px] dex-press"
              >
                <span>Browse Products</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
            {/* Cart Items List (8 cols) */}
            <div className="lg:col-span-8 bg-[#FFFFFF] border border-[#E2EAE5] rounded-2xl overflow-hidden shadow-xs">
              <div className="px-5 py-3.5 bg-[#F7FAF8] border-b border-[#E2EAE5] flex items-center justify-between">
                <span className="text-xs font-semibold text-[#17231C]">
                  Cart Items ({items.length} {items.length === 1 ? 'product' : 'products'})
                </span>
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-xs font-semibold text-[#5C6B62] hover:text-red-700 transition-colors"
                >
                  Clear Cart
                </button>
              </div>

              <ul className="divide-y divide-[#E2EAE5]">
                {items.map(({ product, quantity }) => (
                  <li
                    key={product.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <Link
                        to={`/product/${product.slug}`}
                        className="w-20 h-20 rounded-xl overflow-hidden border border-[#E2EAE5] shrink-0 bg-[#F7FAF8]"
                      >
                        <ProductImage
                          src={product.image}
                          alt={product.name}
                          aspectClassName="aspect-square"
                        />
                      </Link>
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#5C6B62]">
                          <span className="text-[#176B45] font-semibold">{product.category}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono-num">{product.reference}</span>
                        </div>
                        <Link
                          to={`/product/${product.slug}`}
                          className="text-sm sm:text-base font-semibold text-[#17231C] hover:text-[#176B45] block"
                        >
                          {product.name}
                        </Link>
                        <p className="text-xs sm:text-sm font-bold text-[#0E3021] font-mono-num">
                          {formatNaira(product.priceNgn)} <span className="font-normal text-[#5C6B62]">each</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E2EAE5]">
                      <div className="inline-flex items-center border border-[#E2EAE5] rounded-xl bg-[#F7FAF8] p-0.5">
                        <button
                          type="button"
                          onClick={() => updateQuantity(product.id, quantity - 1)}
                          aria-label={`Decrease quantity of ${product.name}`}
                          className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-[#17231C] hover:bg-[#EAF5EE] dex-press"
                        >
                          <Minus className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                        <span className="w-9 text-center text-xs font-bold font-mono-num">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(product.id, quantity + 1)}
                          aria-label={`Increase quantity of ${product.name}`}
                          className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-[#17231C] hover:bg-[#EAF5EE] dex-press"
                        >
                          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>

                      <div className="text-right min-w-[90px]">
                        <p className="text-sm font-bold text-[#0E3021] font-mono-num">
                          {formatNaira(product.priceNgn * quantity)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(product.id)}
                        aria-label={`Remove ${product.name}`}
                        className="p-2 text-[#7B8A80] hover:text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Order Summary & WhatsApp Checkout (4 cols) */}
            <div className="lg:col-span-4 bg-[#FFFFFF] border border-[#E2EAE5] rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs">
              <h2 className="text-base font-bold text-[#17231C] pb-3 border-b border-[#E2EAE5]">
                Cart Order Summary
              </h2>

              <div className="space-y-2.5 text-xs sm:text-sm">
                <div className="flex justify-between text-[#5C6B62]">
                  <span>Total Quantity</span>
                  <span className="font-mono-num font-semibold text-[#17231C]">
                    {totalItems} {totalItems === 1 ? 'unit' : 'units'}
                  </span>
                </div>
                <div className="flex justify-between items-baseline pt-2 border-t border-[#E2EAE5]">
                  <span className="font-semibold text-[#17231C]">Estimated Total</span>
                  <span className="text-xl font-extrabold text-[#0E3021] font-mono-num">
                    {formatNaira(subtotalNgn)}
                  </span>
                </div>
              </div>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 text-sm font-semibold text-[#FFFFFF] bg-[#176B45] rounded-xl hover:bg-[#123D2A] min-h-[48px] dex-press shadow-xs"
              >
                <MessageCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Send Cart Order on WhatsApp</span>
              </a>

              <div className="space-y-1.5 pt-1">
                <p className="text-[11px] font-semibold text-[#5C6B62]">
                  Prepared Multi-Item WhatsApp Message:
                </p>
                <pre className="p-3 bg-[#F7FAF8] border border-[#E2EAE5] rounded-xl text-[11px] text-[#17231C] font-mono-num whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                  {whatsappPreview}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Slideable Product Recommendations Rail */}
        <ProductCarouselRail
          title="Recommended Products to Add"
          subtitle="Swipe left or right to browse more items"
          products={products}
          viewAllLink="/shop"
          viewAllLabel="Full Catalogue"
          accentTone="mint"
          onQuickView={setQuickViewProduct}
        />
      </section>
    </div>
  );
};
