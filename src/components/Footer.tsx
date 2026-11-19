import React from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { CATEGORIES, STORE_CONFIG } from '../data/storeData';
import { buildWhatsAppGeneralUrl } from '../utils/catalogue';

export const Footer: React.FC = () => {
  const whatsappUrl = buildWhatsAppGeneralUrl();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#0E3021] text-[#EAF3EC] border-t border-[#123D2A]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 pb-12 border-b border-[#176B45]/40">
          {/* Column 1: Brand & Description (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <Link
              to="/"
              className="inline-block text-xl font-bold tracking-tight text-[#FFFFFF]"
            >
              {STORE_CONFIG.brandName}
            </Link>
            <p className="text-sm text-[#B8DCC5] leading-relaxed max-w-sm">
              Commercial storefront supplying replacement automotive parts, collector scale model vehicles, and road-ready equipment with direct WhatsApp order coordination.
            </p>
            <div className="pt-1">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-[#0E3021] bg-[#B8DCC5] rounded-md hover:bg-[#EAF3EC] transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
              >
                <MessageCircle className="w-4 h-4 shrink-0" />
                <span>Order Desk on WhatsApp</span>
              </a>
            </div>
          </div>

          {/* Column 2: Navigation Links (2 cols) */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="text-xs font-semibold tracking-wider uppercase text-[#B8DCC5]">
              Navigation
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/" className="text-[#EAF3EC]/80 hover:text-[#FFFFFF] transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/shop" className="text-[#EAF3EC]/80 hover:text-[#FFFFFF] transition-colors">
                  Shop Catalogue
                </Link>
              </li>
              <li>
                <Link to="/categories" className="text-[#EAF3EC]/80 hover:text-[#FFFFFF] transition-colors">
                  Categories
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-[#EAF3EC]/80 hover:text-[#FFFFFF] transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-[#EAF3EC]/80 hover:text-[#FFFFFF] transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Product Categories (3 cols) */}
          <div className="lg:col-span-3 space-y-3">
            <h3 className="text-xs font-semibold tracking-wider uppercase text-[#B8DCC5]">
              Categories
            </h3>
            <ul className="space-y-2.5 text-sm">
              {CATEGORIES.map((category) => (
                <li key={category.id}>
                  <Link
                    to={`/shop?category=${category.slug}`}
                    className="text-[#EAF3EC]/80 hover:text-[#FFFFFF] transition-colors"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  to="/shop?sort=newest"
                  className="text-[#EAF3EC]/80 hover:text-[#FFFFFF] transition-colors"
                >
                  Recently Added Items
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact Placeholders & Social Placeholders (3 cols) */}
          <div className="lg:col-span-3 space-y-3">
            <h3 className="text-xs font-semibold tracking-wider uppercase text-[#B8DCC5]">
              Contact & Channels
            </h3>
            <dl className="space-y-2 text-xs text-[#EAF3EC]/80 leading-relaxed">
              <div>
                <dt className="text-[#B8DCC5] font-medium">WhatsApp Line</dt>
                <dd className="font-mono-num">{STORE_CONFIG.whatsappDisplayPlaceholder}</dd>
              </div>
              <div>
                <dt className="text-[#B8DCC5] font-medium">Email</dt>
                <dd>{STORE_CONFIG.emailPlaceholder}</dd>
              </div>
              <div>
                <dt className="text-[#B8DCC5] font-medium">Location</dt>
                <dd>{STORE_CONFIG.addressPlaceholder}</dd>
              </div>
              <div>
                <dt className="text-[#B8DCC5] font-medium">Social Channels (Placeholders)</dt>
                <dd className="flex items-center gap-3 pt-1">
                  <Link to="/contact" className="underline hover:text-[#FFFFFF]">
                    Instagram
                  </Link>
                  <span aria-hidden="true">·</span>
                  <Link to="/contact" className="underline hover:text-[#FFFFFF]">
                    Facebook
                  </Link>
                  <span aria-hidden="true">·</span>
                  <Link to="/contact" className="underline hover:text-[#FFFFFF]">
                    X (Twitter)
                  </Link>
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Bottom Copyright & Demonstration Notice */}
        <div className="pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#B8DCC5]/80">
          <p>© {currentYear} {STORE_CONFIG.brandName}. All rights reserved.</p>
          <p className="max-w-xl sm:text-right">
            Storefront stage with sample demonstration catalogue. Prices in Nigerian Naira (₦).
          </p>
        </div>
      </div>
    </footer>
  );
};
