import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, MessageCircle, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useStoreData } from '../context/StoreDataContext';
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

  const { storeConfig } = useStoreData();
  const whatsappCheckoutUrl = buildWhatsAppCartOrderUrl(items, storeConfig.whatsappNumber, storeConfig.brandName);

  useEffect(() => {
    if (!isCartDrawerOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCartDrawer();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isCartDrawerOpen, closeCartDrawer]);

  return (
    <AnimatePresence>
      {isCartDrawerOpen && (
        <div
          className="fixed inset-0 z-50 overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Shopping Cart Drawer"
        >
          {/* Dimmed Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeCartDrawer}
            className="fixed inset-0 bg-[#0E3021]/45 backdrop-blur-[2px] overscroll-contain"
            aria-hidden="true"
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-8 sm:pl-10">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
              className="w-screen max-w-md bg-[#FFFFFF] border-l border-[#E2EAE5] shadow-2xl flex flex-col justify-between overscroll-contain"
            >
              {/* Drawer Header */}
              <div className="px-5 py-4 bg-[#F7FAF8] border-b border-[#E2EAE5] flex items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#EAF5EE] text-[#176B45] flex items-center justify-center shrink-0">
                    <ShoppingBag className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm sm:text-base font-bold text-[#17231C] truncate">
                      Your Cart
                    </h2>
                    <span className="text-[11px] text-[#5C6B62] font-mono-num">
                      {totalItems} {totalItems === 1 ? 'item' : 'items'} selected
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeCartDrawer}
                  aria-label="Close shopping cart"
                  className="w-10 h-10 -mr-1.5 inline-flex items-center justify-center rounded-xl text-[#5C6B62] hover:text-[#17231C] hover:bg-[#EAF5EE] transition-colors dex-press"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
                {items.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-12 space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#EAF5EE] border border-[#C6E5D2] text-[#176B45] flex items-center justify-center">
                      <ShoppingBag className="w-6 h-6" aria-hidden="true" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-[#17231C]">
                        Your cart is currently empty
                      </p>
                      <p className="text-xs text-[#5C6B62] max-w-xs">
                        Browse car parts, scale model cars, and equipment to add items to your cart.
                      </p>
                    </div>
                    <Link
                      to="/shop"
                      onClick={closeCartDrawer}
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-[#FFFFFF] bg-[#176B45] rounded-xl hover:bg-[#123D2A] transition-colors min-h-[44px] dex-press"
                    >
                      <span>Start Shopping</span>
                      <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs text-[#5C6B62] pb-2 border-b border-[#E2EAE5]">
                      <span className="font-medium">Selected Products</span>
                      <button
                        type="button"
                        onClick={clearCart}
                        className="text-xs font-semibold text-[#5C6B62] hover:text-red-700 transition-colors py-1 px-2 rounded-lg hover:bg-red-50"
                      >
                        Clear All
                      </button>
                    </div>

                    <ul className="divide-y divide-[#E2EAE5]">
                      <AnimatePresence initial={false}>
                        {items.map(({ product, quantity }) => (
                          <motion.li
                            key={product.id}
                            layout
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, x: 24, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="py-3.5 flex gap-3.5 items-start"
                          >
                            <Link
                              to={`/product/${product.slug}`}
                              onClick={closeCartDrawer}
                              className="w-16 h-16 rounded-xl overflow-hidden border border-[#E2EAE5] shrink-0 bg-[#F7FAF8]"
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
                                  className="text-xs sm:text-sm font-semibold text-[#17231C] hover:text-[#176B45] truncate block"
                                >
                                  {product.name}
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => removeFromCart(product.id)}
                                  aria-label={`Remove ${product.name} from cart`}
                                  className="text-[#7B8A80] hover:text-red-600 p-1.5 -mr-1.5 -mt-1 rounded-lg hover:bg-red-50 transition-colors min-h-[34px] min-w-[34px] inline-flex items-center justify-center"
                                >
                                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                                </button>
                              </div>

                              <p className="text-xs font-bold text-[#0E3021] font-mono-num">
                                {formatNaira(product.priceNgn)}
                              </p>

                              <div className="flex items-center justify-between pt-1">
                                <div className="inline-flex items-center border border-[#E2EAE5] rounded-xl bg-[#F7FAF8] p-0.5">
                                  <button
                                    type="button"
                                    onClick={() => updateQuantity(product.id, quantity - 1)}
                                    aria-label={`Decrease quantity of ${product.name}`}
                                    className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-[#17231C] hover:bg-[#EAF5EE] dex-press"
                                  >
                                    <Minus className="w-3 h-3" aria-hidden="true" />
                                  </button>
                                  <span className="w-8 text-center text-xs font-bold font-mono-num text-[#0E3021]">
                                    {quantity}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => updateQuantity(product.id, quantity + 1)}
                                    aria-label={`Increase quantity of ${product.name}`}
                                    className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-[#17231C] hover:bg-[#EAF5EE] dex-press"
                                  >
                                    <Plus className="w-3 h-3" aria-hidden="true" />
                                  </button>
                                </div>

                                <span className="text-xs font-bold text-[#123D2A] font-mono-num">
                                  {formatNaira(product.priceNgn * quantity)}
                                </span>
                              </div>
                            </div>
                          </motion.li>
                        ))}
                      </AnimatePresence>
                    </ul>
                  </div>
                )}
              </div>

              {/* Drawer Footer */}
              {items.length > 0 && (
                <div className="p-4 sm:p-5 bg-[#F7FAF8] border-t border-[#E2EAE5] space-y-3 pb-safe-bottom shrink-0">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-semibold text-[#5C6B62]">
                      Subtotal ({totalItems} {totalItems === 1 ? 'unit' : 'units'})
                    </span>
                    <span
                      data-testid="cart-drawer-subtotal"
                      className="text-lg font-extrabold text-[#0E3021] font-mono-num"
                    >
                      {formatNaira(subtotalNgn)}
                    </span>
                  </div>

                  <a
                    href={whatsappCheckoutUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="cart-drawer-whatsapp-checkout"
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-xs sm:text-sm font-semibold text-[#FFFFFF] bg-[#176B45] rounded-xl hover:bg-[#123D2A] shadow-xs min-h-[46px] dex-press"
                  >
                    <MessageCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>Order Cart on WhatsApp</span>
                  </a>

                  <Link
                    to="/cart"
                    onClick={closeCartDrawer}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-[#123D2A] bg-[#FFFFFF] border border-[#E2EAE5] rounded-xl hover:bg-[#EAF5EE] hover:border-[#B8DCC5] min-h-[42px] dex-press"
                  >
                    <span>View Full Cart Page</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </Link>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
