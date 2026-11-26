import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Home, LayoutGrid, ShoppingBag, ShoppingCart } from 'lucide-react';
import { useCart } from '../context/CartContext';

/**
 * App-like Mobile Bottom Navigation Bar (< md screens).
 * Uses safe-area insets and never collides with system gesture bars.
 */
export const MobileBottomNav: React.FC = () => {
  const { totalItems, openCartDrawer, isCartDrawerOpen } = useCart();
  const { pathname } = useLocation();

  const tabs = [
    { to: '/', label: 'Home', icon: Home, end: true },
    { to: '/shop', label: 'Shop', icon: ShoppingBag, end: false },
    { to: '/categories', label: 'Categories', icon: LayoutGrid, end: false },
  ];

  return (
    <nav
      aria-label="Mobile app navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#FFFFFF]/95 backdrop-blur-md border-t border-[#E2EAE5] shadow-[0_-6px_24px_rgba(14,48,33,0.07)] pb-safe-bottom"
    >
      <div className="grid grid-cols-4 items-center px-2 pt-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = tab.end ? pathname === tab.to : pathname.startsWith(tab.to);

          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className="relative flex flex-col items-center justify-center min-h-[52px] py-1 rounded-xl text-[11px] font-medium dex-press"
            >
              {active && !isCartDrawerOpen && (
                <motion.span
                  layoutId="mobile-bottom-tab-pill"
                  transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                  className="absolute inset-x-2 top-1 bottom-1 rounded-xl bg-[#EAF5EE] border border-[#D9F0E2]"
                  aria-hidden="true"
                />
              )}
              <Icon
                className={`relative w-5 h-5 mb-0.5 transition-colors ${
                  active && !isCartDrawerOpen ? 'text-[#176B45]' : 'text-[#5C6B62]'
                }`}
                aria-hidden="true"
              />
              <span
                className={`relative leading-none transition-colors ${
                  active && !isCartDrawerOpen ? 'text-[#123D2A] font-semibold' : 'text-[#5C6B62]'
                }`}
              >
                {tab.label}
              </span>
            </NavLink>
          );
        })}

        {/* Cart Drawer Tab */}
        <button
          type="button"
          onClick={openCartDrawer}
          aria-label={`Open shopping cart (${totalItems} items)`}
          className="relative flex flex-col items-center justify-center min-h-[52px] py-1 rounded-xl text-[11px] font-medium dex-press"
        >
          {(isCartDrawerOpen || pathname === '/cart') && (
            <motion.span
              layoutId="mobile-bottom-tab-pill"
              transition={{ type: 'spring', stiffness: 460, damping: 34 }}
              className="absolute inset-x-2 top-1 bottom-1 rounded-xl bg-[#EAF5EE] border border-[#D9F0E2]"
              aria-hidden="true"
            />
          )}
          <div className="relative mb-0.5">
            <ShoppingCart
              className={`w-5 h-5 transition-colors ${
                isCartDrawerOpen || pathname === '/cart' ? 'text-[#176B45]' : 'text-[#5C6B62]'
              }`}
              aria-hidden="true"
            />
            {totalItems > 0 && (
              <motion.span
                key={totalItems}
                initial={{ scale: 0.7 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 520, damping: 24 }}
                className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#176B45] text-[#FFFFFF] text-[10px] font-bold flex items-center justify-center font-mono-num ring-2 ring-[#FFFFFF]"
              >
                {totalItems > 99 ? '99+' : totalItems}
              </motion.span>
            )}
          </div>
          <span
            className={`relative leading-none transition-colors ${
              isCartDrawerOpen || pathname === '/cart'
                ? 'text-[#123D2A] font-semibold'
                : 'text-[#5C6B62]'
            }`}
          >
            Cart
          </span>
        </button>
      </div>
    </nav>
  );
};
