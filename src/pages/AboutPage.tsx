import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MessageCircle } from 'lucide-react';
import { STORE_CONFIG } from '../data/storeData';
import { buildWhatsAppGeneralUrl } from '../utils/catalogue';

export const AboutPage: React.FC = () => {
  return (
    <div className="bg-[#FFFFFF]">
      <section className="bg-[#F8FAF8] border-b border-[#E5EBE6]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-3">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#69746D]">
            <Link to="/" className="hover:text-[#123D2A]">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-[#202923] font-medium">About DEX STORES</span>
          </nav>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#202923] tracking-tight">
            About {STORE_CONFIG.brandName}
          </h1>
          <p className="text-sm text-[#69746D] max-w-2xl">
            A modern commercial storefront built around clarity, dependable product specifications, and direct customer ordering via WhatsApp.
          </p>
        </div>
      </section>

      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7 space-y-5">
            <h2 className="text-xl font-bold text-[#202923]">
              Focused Commercial Retail Experience
            </h2>
            <p className="text-sm sm:text-base text-[#69746D] leading-relaxed">
              DEX STORES is structured to serve customers looking for replacement automotive parts, detailed scale model and remote control cars, and practical vehicle equipment without unnecessary checkout complexity.
            </p>
            <p className="text-sm sm:text-base text-[#69746D] leading-relaxed">
              Every item in our catalogue is presented with clear Nigerian Naira (₦) pricing, availability status, and reference codes. Customers can browse by department, compare specifications, select quantities, and initiate a direct WhatsApp conversation with a pre-filled order message.
            </p>
          </div>

          <div className="lg:col-span-5 bg-[#F8FAF8] border border-[#E5EBE6] rounded-lg p-6 sm:p-8 space-y-5">
            <h3 className="text-base font-semibold text-[#123D2A]">
              Core Storefront Principles
            </h3>
            <ul className="space-y-3 text-sm text-[#69746D]">
              <li className="pb-3 border-b border-[#E5EBE6]">
                <strong className="text-[#202923] block">Structured Departments</strong>
                Dedicated sections for Car Parts, Toy Cars, and Other Products.
              </li>
              <li className="pb-3 border-b border-[#E5EBE6]">
                <strong className="text-[#202923] block">Transparent Naira Pricing</strong>
                Clear unit prices and automatic quantity totals in ₦.
              </li>
              <li>
                <strong className="text-[#202923] block">Direct WhatsApp Coordination</strong>
                Instant click-to-chat order sheets with product name, price, reference, and quantity.
              </li>
            </ul>

            <div className="pt-2 flex flex-wrap gap-3">
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-[#FFFFFF] bg-[#123D2A] rounded-md hover:bg-[#176B45] transition-colors min-h-[40px]"
              >
                <span>Browse Catalogue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <a
                href={buildWhatsAppGeneralUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-[#123D2A] bg-[#FFFFFF] border border-[#E5EBE6] rounded-md hover:bg-[#EAF3EC] transition-colors min-h-[40px]"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp Enquiry</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
