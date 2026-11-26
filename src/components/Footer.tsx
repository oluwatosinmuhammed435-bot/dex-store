import React from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { buildWhatsAppGeneralUrl } from '../utils/catalogue';
import { useStoreData } from '../context/StoreDataContext';

export const Footer: React.FC = () => {
  const { categories, storeConfig } = useStoreData();
  const whatsappUrl = buildWhatsAppGeneralUrl(
    `Hello ${storeConfig.brandName}, I have an enquiry regarding your product catalogue.`,
    storeConfig.whatsappNumber
  );
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#0E3021] text-[#EAF5EE] border-t border-[#123D2A]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 sm:gap-10 pb-10 border-b border-[#176B45]/40">
          {/* Column 1: Brand & Description (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <Link
              to="/"
              className="inline-flex items-center gap-2.5 text-xl font-extrabold tracking-tight text-[#FFFFFF]"
            >
              <span className="w-7 h-7 rounded-lg bg-[#279B62] text-[#FFFFFF] text-xs font-bold inline-flex items-center justify-center">
                D
              </span>
              <span>{storeConfig.brandName}</span>
            </Link>
            <p className="text-sm text-[#B8DCC5] leading-relaxed max-w-sm">
              {storeConfig.tagline}. Supplying automotive replacement parts, collector scale models, and road-ready equipment with direct WhatsApp order coordination.
            </p>
            <div className="pt-1">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-[#0E3021] bg-[#D9F0E2] rounded-xl hover:bg-[#EAF5EE] whitespace-nowrap shrink-0 min-h-[42px] dex-press"
              >
                <MessageCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
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
                <Link to="/" className="text-[#EAF5EE]/85 hover:text-[#FFFFFF] transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/shop" className="text-[#EAF5EE]/85 hover:text-[#FFFFFF] transition-colors">
                  Shop Catalogue
                </Link>
              </li>
              <li>
                <Link to="/categories" className="text-[#EAF5EE]/85 hover:text-[#FFFFFF] transition-colors">
                  Categories
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-[#EAF5EE]/85 hover:text-[#FFFFFF] transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-[#EAF5EE]/85 hover:text-[#FFFFFF] transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Dynamic Product Categories (3 cols) */}
          <div className="lg:col-span-3 space-y-3">
            <h3 className="text-xs font-semibold tracking-wider uppercase text-[#B8DCC5]">
              Categories
            </h3>
            <ul className="space-y-2.5 text-sm">
              {categories.map((category) => (
                <li key={category.id}>
                  <Link
                    to={`/shop?category=${category.slug}`}
                    className="text-[#EAF5EE]/85 hover:text-[#FFFFFF] transition-colors"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  to="/shop?sort=newest"
                  className="text-[#EAF5EE]/85 hover:text-[#FFFFFF] transition-colors"
                >
                  Recently Added Items
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact & Business Details (3 cols) */}
          <div className="lg:col-span-3 space-y-3">
            <h3 className="text-xs font-semibold tracking-wider uppercase text-[#B8DCC5]">
              Contact &amp; Desk
            </h3>
            <dl className="space-y-2 text-xs text-[#EAF5EE]/85 leading-relaxed">
              <div>
                <dt className="text-[#B8DCC5] font-medium">WhatsApp Order Line</dt>
                <dd className="font-mono-num">{storeConfig.whatsappDisplayPlaceholder}</dd>
              </div>
              <div>
                <dt className="text-[#B8DCC5] font-medium">Email</dt>
                <dd>{storeConfig.emailPlaceholder}</dd>
              </div>
              <div>
                <dt className="text-[#B8DCC5] font-medium">Location</dt>
                <dd>{storeConfig.addressPlaceholder}</dd>
              </div>
              <div>
                <dt className="text-[#B8DCC5] font-medium">Hours</dt>
                <dd>{storeConfig.businessHoursPlaceholder}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#B8DCC5]/80">
          <p>
            © {currentYear} {storeConfig.brandName}. All rights reserved.
          </p>
          <p className="max-w-xl sm:text-right">
            Prices displayed in Nigerian Naira (₦). Orders confirmed directly via WhatsApp.
          </p>
        </div>
      </div>
    </footer>
  );
};
