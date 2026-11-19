import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, MessageCircle, Search, ShoppingCart, X } from 'lucide-react';
import { STORE_CONFIG } from '../data/storeData';
import { buildWhatsAppGeneralUrl, formatNaira } from '../utils/catalogue';
import { useCart } from '../context/CartContext';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const { totalItems, subtotalNgn, openCartDrawer, lastAddedMessage } = useCart();
  const whatsappContactUrl = buildWhatsAppGeneralUrl();

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
    <header className="sticky top-0 z-40 bg-[#FFFFFF]/95 backdrop-blur-sm border-b border-[#E5EBE6]">
      <div className="max-w-[1200px] mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 sm:gap-8">
        {/* Zone 1: Single text element wordmark */}
        <Link
          to="/"
          className="text-base sm:text-lg font-bold tracking-tight text-[#123D2A] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#176B45]"
        >
          {STORE_CONFIG.brandName}
        </Link>

        {/* Zone 2: 5 clean single-line text navigation links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-[#69746D]"
        >
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                  isActive
                    ? 'text-[#123D2A] border-[#176B45] font-semibold'
                    : 'text-[#69746D] border-transparent hover:text-[#202923]'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Zone 3: Upper-Right Search, Cart Trigger & Mobile Menu */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setSearchOpen((prev) => !prev)}
            aria-label={searchOpen ? 'Close product search' : 'Open product search'}
            aria-expanded={searchOpen}
            className="inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 text-[#202923] hover:text-[#176B45] hover:bg-[#F8FAF8] rounded-md transition-colors"
          >
            {searchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
          </button>

          {/* Upper-Right Cart Action Button */}
          <button
            type="button"
            onClick={openCartDrawer}
            aria-label={`Open shopping cart (${totalItems} items)`}
            data-testid="navbar-cart-button"
            className="inline-flex items-center gap-2 px-3 sm:px-3.5 py-2 text-xs font-semibold text-[#FFFFFF] bg-[#123D2A] rounded-md hover:bg-[#176B45] transition-colors whitespace-nowrap shrink-0 min-h-[38px] sm:min-h-[40px]"
          >
            <ShoppingCart className="w-4 h-4 shrink-0" />
            <span>Cart</span>
            <span
              data-testid="navbar-cart-count"
              className="px-1.5 py-0.5 text-[11px] font-bold bg-[#B8DCC5] text-[#0E3021] rounded font-mono-num"
            >
              {totalItems}
            </span>
            {totalItems > 0 && (
              <span className="hidden lg:inline text-[11px] text-[#EAF3EC] font-mono-num border-l border-[#176B45] pl-2">
                {formatNaira(subtotalNgn)}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            className="md:hidden inline-flex items-center justify-center w-9 h-9 text-[#202923] hover:bg-[#F8FAF8] rounded-md transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Subtle Added-to-Cart Feedback Bar */}
      {lastAddedMessage && (
        <div className="bg-[#EAF3EC] border-t border-[#B8DCC5] text-[#0E3021] text-xs py-1.5 px-4">
          <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-3">
            <span className="font-medium truncate">{lastAddedMessage}</span>
            <button
              type="button"
              onClick={openCartDrawer}
              className="font-semibold underline text-[#123D2A] whitespace-nowrap shrink-0"
            >
              View Cart ({totalItems})
            </button>
          </div>
        </div>
      )}

      {/* Expandable Search Bar */}
      {searchOpen && (
        <div className="border-t border-[#E5EBE6] bg-[#F8FAF8]">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-3">
              <label htmlFor="navbar-search-input" className="sr-only">
                Search products by name or reference
              </label>
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#69746D] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="navbar-search-input"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by product name, category, or reference (e.g. Toyota Corolla Headlamp)..."
                  autoFocus
                  className="w-full pl-10 pr-4 py-2 text-sm bg-[#FFFFFF] border border-[#E5EBE6] rounded-md text-[#202923] placeholder:text-[#69746D] focus:outline-none focus:border-[#176B45]"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-[#FFFFFF] bg-[#123D2A] rounded-md hover:bg-[#176B45] transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
              >
                Search
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#E5EBE6] bg-[#FFFFFF]">
          <div className="px-4 pt-3 pb-5 space-y-3">
            <nav aria-label="Mobile Navigation" className="flex flex-col space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-[#EAF3EC] text-[#123D2A] font-semibold'
                        : 'text-[#202923] hover:bg-[#F8FAF8]'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              <NavLink
                to="/cart"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#EAF3EC] text-[#123D2A] font-semibold'
                      : 'text-[#202923] hover:bg-[#F8FAF8]'
                  }`
                }
              >
                Shopping Cart ({totalItems})
              </NavLink>
            </nav>

            <div className="pt-2 border-t border-[#E5EBE6]">
              <a
                href={whatsappContactUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-[#FFFFFF] bg-[#123D2A] rounded-md hover:bg-[#176B45] transition-colors min-h-[44px]"
              >
                <MessageCircle className="w-4 h-4 shrink-0" />
                <span>Contact on WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
