import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MessageCircle, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { buildWhatsAppCartOrderUrl, formatNaira } from '../utils/catalogue';
import { ProductImage } from './ProductImage';

export const CartDrawer: React.FC = () => {
  const {
    items,
    totalItems,
    subtotalNgn,
    isCartDrawerOpen,
    closeCartDrawer,
    updateQuantity,
    removeFromCart,
    clearCart,
  } = useCart();

  if (!isCartDrawerOpen) {
    return null;
  }

  const whatsappCheckoutUrl = buildWhatsAppCartOrderUrl(items);

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Shopping Cart Drawer"
    >
      {/* Backdrop */}
      <div
        onClick={closeCartDrawer}
        className="fixed inset-0 bg-[#0E3021]/45 transition-opacity"
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#FFFFFF] border-l border-[#E5EBE6] shadow-2xl flex flex-col justify-between">
          {/* Drawer Header */}
          <div className="px-5 py-4 bg-[#F8FAF8] border-b border-[#E5EBE6] flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="w-4 h-4 text-[#123D2A]" />
              <h2 className="text-base font-bold text-[#202923]">
                Your Shopping Cart
              </h2>
              <span className="text-xs text-[#69746D] font-mono-num">
                ({totalItems} {totalItems === 1 ? 'item' : 'items'})
              </span>
            </div>

            <button
              type="button"
              onClick={closeCartDrawer}
              aria-label="Close shopping cart"
              className="w-9 h-9 inline-flex items-center justify-center rounded-md text-[#69746D] hover:text-[#202923] hover:bg-[#EAF3EC] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-5">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12 space-y-4">
                <div className="w-12 h-12 rounded-full bg-[#EAF3EC] text-[#123D2A] flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-[#202923]">
                    Your cart is currently empty
                  </p>
                  <p className="text-xs text-[#69746D] max-w-xs">
                    Browse car parts, scale model cars, and equipment to add preferred products to your cart.
                  </p>
                </div>
                <Link
                  to="/shop"
                  onClick={closeCartDrawer}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-[#FFFFFF] bg-[#123D2A] rounded-md hover:bg-[#176B45] transition-colors min-h-[40px]"
                >
                  <span>Start Shopping</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-[#69746D] pb-2 border-b border-[#E5EBE6]">
                  <span>Selected Products</span>
                  <button
                    type="button"
                    onClick={clearCart}
                    className="text-xs font-medium text-[#69746D] hover:text-red-700 transition-colors"
                  >
                    Clear All
                  </button>
                </div>

                <ul className="divide-y divide-[#E5EBE6]">
                  {items.map(({ product, quantity }) => (
                    <li key={product.id} className="py-3.5 flex gap-3.5 items-start">
                      <Link
                        to={`/product/${product.slug}`}
                        onClick={closeCartDrawer}
                        className="w-16 h-16 rounded-md overflow-hidden border border-[#E5EBE6] shrink-0"
                      >
                        <ProductImage
                          src={product.image}
                          alt={product.name}
                          aspectClassName="aspect-square"
                        />
                      </Link>

                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            to={`/product/${product.slug}`}
                            onClick={closeCartDrawer}
                            className="text-xs sm:text-sm font-semibold text-[#202923] hover:text-[#176B45] truncate block"
                          >
                            {product.name}
                          </Link>
                          <button
                            type="button"
                            onClick={() => removeFromCart(product.id)}
                            aria-label={`Remove ${product.name} from cart`}
                            className="text-[#69746D] hover:text-red-700 p-1 -mr-1 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <p className="text-xs font-bold text-[#0E3021] font-mono-num">
                          {formatNaira(product.priceNgn)}
                        </p>

                        <div className="flex items-center justify-between pt-1">
                          <div className="inline-flex items-center border border-[#E5EBE6] rounded bg-[#F8FAF8]">
                            <button
                              type="button"
                              onClick={() => updateQuantity(product.id, quantity - 1)}
                              aria-label={`Decrease quantity of ${product.name}`}
                              className="w-7 h-7 inline-flex items-center justify-center text-[#202923] hover:bg-[#EAF3EC]"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-7 text-center text-xs font-semibold font-mono-num">
                              {quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(product.id, quantity + 1)}
                              aria-label={`Increase quantity of ${product.name}`}
                              className="w-7 h-7 inline-flex items-center justify-center text-[#202923] hover:bg-[#EAF3EC]"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <span className="text-xs font-semibold text-[#123D2A] font-mono-num">
                            {formatNaira(product.priceNgn * quantity)}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Drawer Footer */}
          {items.length > 0 && (
            <div className="p-5 bg-[#F8FAF8] border-t border-[#E5EBE6] space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-medium text-[#69746D]">
                  Cart Subtotal ({totalItems} {totalItems === 1 ? 'unit' : 'units'})
                </span>
                <span
                  data-testid="cart-drawer-subtotal"
                  className="text-lg font-bold text-[#0E3021] font-mono-num"
                >
                  {formatNaira(subtotalNgn)}
                </span>
              </div>

              <a
                href={whatsappCheckoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="cart-drawer-whatsapp-checkout"
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-xs sm:text-sm font-semibold text-[#FFFFFF] bg-[#123D2A] rounded-md hover:bg-[#176B45] transition-colors min-h-[44px]"
              >
                <MessageCircle className="w-4 h-4 shrink-0" />
                <span>Order Cart on WhatsApp</span>
              </a>

              <Link
                to="/cart"
                onClick={closeCartDrawer}
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-[#123D2A] bg-[#FFFFFF] border border-[#E5EBE6] rounded-md hover:bg-[#EAF3EC] transition-colors min-h-[40px]"
              >
                <span>View Full Cart &amp; Order Summary</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
