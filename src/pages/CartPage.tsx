import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import {
  buildWhatsAppCartOrderMessage,
  buildWhatsAppCartOrderUrl,
  formatNaira,
} from '../utils/catalogue';
import { ProductImage } from '../components/ProductImage';
import { PRODUCTS, STORE_CONFIG } from '../data/storeData';
import { ProductCarouselRail } from '../components/ProductCarouselRail';

export const CartPage: React.FC = () => {
  const { items, totalItems, subtotalNgn, updateQuantity, removeFromCart, clearCart } =
    useCart();

  const whatsappUrl = buildWhatsAppCartOrderUrl(items);
  const whatsappPreview = buildWhatsAppCartOrderMessage(items);

  return (
    <div className="bg-[#F8FAF8] min-h-[75vh]">
      {/* Header & Breadcrumbs */}
      <section className="bg-[#FFFFFF] border-b border-[#E5EBE6]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-2">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#69746D]">
            <Link to="/" className="hover:text-[#123D2A]">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <Link to="/shop" className="hover:text-[#123D2A]">
              Shop
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-[#202923] font-medium">Shopping Cart</span>
          </nav>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#202923] tracking-tight">
              Shopping Cart ({totalItems})
            </h1>
            <Link
              to="/shop"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#123D2A] hover:text-[#176B45]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Continue Shopping</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {items.length === 0 ? (
          <div className="bg-[#FFFFFF] border border-[#E5EBE6] rounded-lg p-10 text-center max-w-lg mx-auto space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#EAF3EC] text-[#123D2A] flex items-center justify-center mx-auto">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-[#202923]">Your cart is empty</h2>
            <p className="text-xs sm:text-sm text-[#69746D]">
              Explore our catalogue of car parts, scale model vehicles, and utility gear to add items to your cart.
            </p>
            <div className="pt-2">
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-[#FFFFFF] bg-[#123D2A] rounded-md hover:bg-[#176B45] transition-colors min-h-[40px]"
              >
                <span>Browse Products</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Cart Items List (8 cols) */}
            <div className="lg:col-span-8 bg-[#FFFFFF] border border-[#E5EBE6] rounded-lg overflow-hidden">
              <div className="px-5 py-3.5 bg-[#F8FAF8] border-b border-[#E5EBE6] flex items-center justify-between">
                <span className="text-xs font-semibold text-[#202923]">
                  Cart Items ({items.length} {items.length === 1 ? 'product' : 'products'})
                </span>
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-xs font-medium text-[#69746D] hover:text-red-700 transition-colors"
                >
                  Clear Cart
                </button>
              </div>

              <ul className="divide-y divide-[#E5EBE6]">
                {items.map(({ product, quantity }) => (
                  <li
                    key={product.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <Link
                        to={`/product/${product.slug}`}
                        className="w-20 h-20 rounded-md overflow-hidden border border-[#E5EBE6] shrink-0"
                      >
                        <ProductImage
                          src={product.image}
                          alt={product.name}
                          aspectClassName="aspect-square"
                        />
                      </Link>
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#69746D]">
                          <span className="text-[#176B45] font-medium">{product.category}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono-num">{product.reference}</span>
                        </div>
                        <Link
                          to={`/product/${product.slug}`}
                          className="text-sm sm:text-base font-semibold text-[#202923] hover:text-[#176B45] block"
                        >
                          {product.name}
                        </Link>
                        <p className="text-xs sm:text-sm font-bold text-[#0E3021] font-mono-num">
                          {formatNaira(product.priceNgn)} <span className="font-normal text-[#69746D]">each</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E5EBE6]">
                      <div className="inline-flex items-center border border-[#E5EBE6] rounded-md bg-[#F8FAF8]">
                        <button
                          type="button"
                          onClick={() => updateQuantity(product.id, quantity - 1)}
                          aria-label={`Decrease quantity of ${product.name}`}
                          className="w-8 h-8 inline-flex items-center justify-center text-[#202923] hover:bg-[#EAF3EC]"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-9 text-center text-xs font-semibold font-mono-num">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(product.id, quantity + 1)}
                          aria-label={`Increase quantity of ${product.name}`}
                          className="w-8 h-8 inline-flex items-center justify-center text-[#202923] hover:bg-[#EAF3EC]"
                        >
                          <Plus className="w-3.5 h-3.5" />
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
                        className="p-1.5 text-[#69746D] hover:text-red-700 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Order Summary & WhatsApp Checkout (4 cols) */}
            <div className="lg:col-span-4 bg-[#FFFFFF] border border-[#E5EBE6] rounded-lg p-5 sm:p-6 space-y-5">
              <h2 className="text-base font-bold text-[#202923] pb-3 border-b border-[#E5EBE6]">
                Cart Order Summary
              </h2>

              <div className="space-y-2.5 text-xs sm:text-sm">
                <div className="flex justify-between text-[#69746D]">
                  <span>Total Quantity</span>
                  <span className="font-mono-num font-semibold text-[#202923]">
                    {totalItems} {totalItems === 1 ? 'unit' : 'units'}
                  </span>
                </div>
                <div className="flex justify-between items-baseline pt-2 border-t border-[#E5EBE6]">
                  <span className="font-semibold text-[#202923]">Estimated Total</span>
                  <span className="text-xl font-bold text-[#0E3021] font-mono-num">
                    {formatNaira(subtotalNgn)}
                  </span>
                </div>
              </div>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 text-sm font-semibold text-[#FFFFFF] bg-[#123D2A] rounded-md hover:bg-[#176B45] transition-colors min-h-[46px]"
              >
                <MessageCircle className="w-4 h-4 shrink-0" />
                <span>Send Cart Order on WhatsApp</span>
              </a>

              <div className="space-y-1.5 pt-2">
                <p className="text-[11px] font-medium text-[#69746D]">
                  Prepared Multi-Item WhatsApp Message:
                </p>
                <pre className="p-3 bg-[#F8FAF8] border border-[#E5EBE6] rounded text-[11px] text-[#202923] font-mono-num whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                  {whatsappPreview}
                </pre>
              </div>

              <p className="text-[11px] text-[#69746D]">
                {STORE_CONFIG.sampleInventoryNotice}
              </p>
            </div>
          </div>
        )}

        {/* Slideable Product Recommendations Rail */}
        <ProductCarouselRail
          title="Recommended Products to Add"
          subtitle="Slide left or right to browse more items"
          products={PRODUCTS}
          viewAllLink="/shop"
          viewAllLabel="Full Catalogue"
        />
      </section>
    </div>
  );
};
