import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Product, PRODUCTS } from '../data/storeData';
import {
  addItemToCart,
  calculateCartTotals,
  CartItem,
  removeCartItem,
  updateCartItemQuantity,
} from '../utils/catalogue';

const STORAGE_KEY = 'dex_stores_cart_v1';

interface CartContextValue {
  items: CartItem[];
  totalItems: number;
  subtotalNgn: number;
  isCartDrawerOpen: boolean;
  lastAddedMessage: string | null;
  addToCart: (product: Product, quantity?: number, openDrawer?: boolean) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  openCartDrawer: () => void;
  closeCartDrawer: () => void;
  getItemQuantity: (productId: string) => number;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (!saved) return [];
      const parsed: { productId: string; quantity: number }[] = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      const hydrated: CartItem[] = [];
      for (const entry of parsed) {
        const found = PRODUCTS.find((p) => p.id === entry.productId);
        if (found && entry.quantity > 0) {
          hydrated.push({ product: found, quantity: Math.min(99, entry.quantity) });
        }
      }
      return hydrated;
    } catch {
      return [];
    }
  });

  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [lastAddedMessage, setLastAddedMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      const serializable = items.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
      }));
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
    } catch {
      // Ignore storage quota errors
    }
  }, [items]);

  useEffect(() => {
    if (!lastAddedMessage) return;
    const timer = window.setTimeout(() => setLastAddedMessage(null), 2800);
    return () => window.clearTimeout(timer);
  }, [lastAddedMessage]);

  const addToCart = (product: Product, quantity = 1, openDrawer = false) => {
    setItems((prev) => addItemToCart(prev, product, quantity));
    setLastAddedMessage(`Added "${product.name}" to cart`);
    if (openDrawer) {
      setIsCartDrawerOpen(true);
    }
  };

  const updateQuantity = (productId: string, quantity: number) => {
    setItems((prev) => updateCartItemQuantity(prev, productId, quantity));
  };

  const removeFromCart = (productId: string) => {
    setItems((prev) => removeCartItem(prev, productId));
  };

  const clearCart = () => {
    setItems([]);
  };

  const openCartDrawer = () => setIsCartDrawerOpen(true);
  const closeCartDrawer = () => setIsCartDrawerOpen(false);

  const getItemQuantity = (productId: string): number => {
    return items.find((i) => i.product.id === productId)?.quantity ?? 0;
  };

  const { totalItems, subtotalNgn } = useMemo(() => calculateCartTotals(items), [items]);

  const value: CartContextValue = {
    items,
    totalItems,
    subtotalNgn,
    isCartDrawerOpen,
    lastAddedMessage,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    openCartDrawer,
    closeCartDrawer,
    getItemQuantity,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return ctx;
}
