import React, { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Menu, MessageCircle, Search, ShoppingCart, X } from 'lucide-react';
import { buildWhatsAppGeneralUrl, formatNaira } from '../utils/catalogue';
import { useCart } from '../context/CartContext';
import { useStoreData } from '../context/StoreDataContext';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const { totalItems, subtotalNgn, openCartDrawer } = useCart();
  const { storeConfig } = useStoreData();
  const whatsappContactUrl = buildWhatsAppGeneralUrl(
    `Hello ${storeConfig.brandName}, I have an enquiry regarding your product catalogue.`,
    storeConfig.whatsappNumber
  );

  useEffect(() => {
    if (!searchOpen && !mobileMenuOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [searchOpen, mobileMenuOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    setSearchOpen(false);
    setMobileMenuOpen(false);
    if (trimmed) {
      navigate(`/shop?q=${encodeURIComponent(trimmed)}`);
    } else {
      navigate('/shop');
    }
  };

  const navItems = [
    { label: 'Home', to: '/' },
    { label: 'Shop', to: '/shop' },
    { label: 'Categories', to: '/categories' },
    { label: 'About', to: '/about' },
    { label: 'Contact', to: '/contact' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#FFFFFF]/95 backdrop-blur-md border-b border-[#E2EAE5]">
      <div className="max-w-[1200px] mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3 sm:gap-8">
        {/* Zone 1: Brand Wordmark */}
        <Link
          to="/"
          onClick={() => {
            setMobileMenuOpen(false);
            setSearchOpen(false);
          }}
          className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 dex-press rounded-lg py-1"
        >
          <span className="w-8 h-8 rounded-lg bg-[#176B45] text-[#FFFFFF] font-display font-bold text-sm inline-flex items-center justify-center shadow-2xs">
            D
          </span>
          <span className="text-base sm:text-lg font-extrabold tracking-tight text-[#123D2A]">
            {storeConfig.brandName}
          </span>
        </Link>

        {/* Zone 2: Desktop Navigation with Shared Indicator */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium"
        >
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `relative py-2 transition-colors whitespace-nowrap shrink-0 ${isActive
                  ? 'text-[#123D2A] font-semibold'
                  : 'text-[#5C6B62] hover:text-[#17231C]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span>{item.label}</span>
                  {isActive && (
                    <motion.span
                      layoutId="desktop-nav-underline"
                      transition={{ type: 'spring', stiffness: 460, damping: 36 }}
                      className="absolute inset-x-0 bottom-0 h-0.5 bg-[#176B45] rounded-full"
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Zone 3: Upper-Right Search, Cart Trigger & Mobile Menu */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              setSearchOpen((prev) => !prev);
            }}
            aria-label={searchOpen ? 'Close product search' : 'Open product search'}
            aria-expanded={searchOpen}
            className={`inline-flex items-center justify-center w-10 h-10 rounded-xl transition-colors dex-press ${searchOpen
                ? 'bg-[#EAF5EE] text-[#176B45]'
                : 'text-[#17231C] hover:text-[#176B45] hover:bg-[#F7FAF8]'
              }`}
          >
            {searchOpen ? <X className="w-4 h-4" aria-hidden="true" /> : <Search className="w-4 h-4" aria-hidden="true" />}
          </button>

          {/* Upper-Right Cart Action Button */}
          <button
            type="button"
            onClick={openCartDrawer}
            aria-label={`Open shopping cart (${totalItems} items)`}
            data-testid="navbar-cart-button"
            className="inline-flex items-center gap-2 px-3 sm:px-3.5 py-2 text-xs font-semibold text-[#FFFFFF] bg-[#176B45] rounded-xl hover:bg-[#123D2A] shadow-xs whitespace-nowrap shrink-0 min-h-[40px] dex-press"
          >
            <ShoppingCart className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="hidden xs:inline sm:inline">Cart</span>
            <motion.span
              key={totalItems}
              initial={{ scale: 0.75 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 24 }}
              data-testid="navbar-cart-count"
              className="px-1.5 py-0.5 text-[11px] font-bold bg-[#D9F0E2] text-[#0E3021] rounded-md font-mono-num"
            >
              {totalItems}
            </motion.span>
            {totalItems > 0 && (
              <span className="hidden lg:inline text-[11px] text-[#EAF5EE] font-mono-num border-l border-[#279B62]/60 pl-2">
                {formatNaira(subtotalNgn)}
              </span>
            )}
          </button>

          {/* Mobile Secondary Drawer Toggle (for About / Contact / Order Desk) */}
          <button
            type="button"
            onClick={() => {
              setSearchOpen(false);
              setMobileMenuOpen((prev) => !prev);
            }}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            className={`md:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl transition-colors dex-press ${mobileMenuOpen
                ? 'bg-[#EAF5EE] text-[#176B45]'
                : 'text-[#17231C] hover:bg-[#F7FAF8]'
              }`}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Expandable Search Bar */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="overflow-hidden border-t border-[#E2EAE5] bg-[#F7FAF8]"
          >
            <div className="max-w-[1200px] mx-auto px-3 sm:px-6 lg:px-8 py-3">
              <form onSubmit={handleSearchSubmit} className="flex items-center gap-2.5">
                <label htmlFor="navbar-search-input" className="sr-only">
                  Search products by name or reference
                </label>
                <div className="relative flex-1">
                  <Search
                    className="w-4 h-4 text-[#5C6B62] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="navbar-search-input"
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search parts, scale cars, equipment or SKU…"
                    autoFocus
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#FFFFFF] border border-[#E2EAE5] rounded-xl text-[#17231C] placeholder:text-[#7B8A80] focus:outline-none focus:border-[#176B45] min-h-[44px]"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2.5 text-xs font-semibold text-[#FFFFFF] bg-[#176B45] rounded-xl hover:bg-[#123D2A] whitespace-nowrap shrink-0 min-h-[44px] dex-press"
                >
                  Search
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Secondary Menu Panel */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="md:hidden overflow-hidden border-t border-[#E2EAE5] bg-[#FFFFFF]"
          >
            <div className="px-4 pt-3 pb-5 space-y-3">
              <nav aria-label="Mobile Navigation" className="flex flex-col space-y-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors min-h-[44px] flex items-center ${isActive
                        ? 'bg-[#EAF5EE] text-[#123D2A] font-semibold'
                        : 'text-[#17231C] hover:bg-[#F7FAF8]'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>

              <a
                href={whatsappContactUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#EAF5EE] border border-[#C6E5D2] text-[#123D2A] text-xs font-semibold min-h-[44px] dex-press"
              >
                <MessageCircle className="w-4 h-4" aria-hidden="true" />
                <span>Chat with Order Desk</span>
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
