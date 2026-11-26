import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MessageCircle } from 'lucide-react';
import { useStoreData } from '../context/StoreDataContext';
import { buildWhatsAppGeneralUrl } from '../utils/catalogue';

export const AboutPage: React.FC = () => {
  const { storeConfig } = useStoreData();
  const whatsappUrl = buildWhatsAppGeneralUrl(
    `Hello ${storeConfig.brandName}, I have an enquiry regarding your product catalogue.`,
    storeConfig.whatsappNumber
  );

  return (
    <div className="bg-[#FFFFFF]">
      <section className="bg-[#F7FAF8] border-b border-[#E2EAE5]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 space-y-2.5">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#5C6B62]">
            <Link to="/" className="hover:text-[#176B45]">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-[#17231C] font-semibold">About {storeConfig.brandName}</span>
          </nav>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#17231C] tracking-tight">
            About {storeConfig.brandName}
          </h1>
          <p className="text-sm text-[#5C6B62] max-w-2xl">
            {storeConfig.tagline}. Built around clarity, dependable specifications, and direct customer ordering via WhatsApp.
          </p>
        </div>
      </section>

      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-14 space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10">
          <div className="lg:col-span-7 space-y-5">
            <h2 className="text-xl font-bold text-[#17231C]">
              Focused Commercial Retail Experience
            </h2>
            <p className="text-sm sm:text-base text-[#5C6B62] leading-relaxed">
              {storeConfig.brandName} is structured to serve customers looking for replacement automotive parts, detailed scale model and remote control cars, and practical vehicle equipment without unnecessary checkout complexity.
            </p>
            <p className="text-sm sm:text-base text-[#5C6B62] leading-relaxed">
              Every item in our catalogue is presented with clear Nigerian Naira (₦) pricing, availability status, and reference codes. Customers can browse by department, compare specifications, select quantities, and initiate a direct WhatsApp conversation with a pre-filled order message.
            </p>
          </div>

          <div className="lg:col-span-5 bg-[#F7FAF8] border border-[#E2EAE5] rounded-2xl p-6 sm:p-8 space-y-5 shadow-xs">
            <h3 className="text-base font-bold text-[#123D2A]">
              Core Storefront Principles
            </h3>
            <ul className="space-y-3 text-sm text-[#5C6B62]">
              <li className="pb-3 border-b border-[#E2EAE5]">
                <strong className="text-[#17231C] block">Structured Departments</strong>
                Organized collections across Car Parts, Scale Vehicles, and Utility Equipment.
              </li>
              <li className="pb-3 border-b border-[#E2EAE5]">
                <strong className="text-[#17231C] block">Transparent Naira Pricing</strong>
                Clear unit prices and automatic quantity totals in ₦.
              </li>
              <li>
                <strong className="text-[#17231C] block">Direct WhatsApp Coordination</strong>
                Instant click-to-chat order sheets with product name, price, reference, and quantity.
              </li>
            </ul>

            <div className="pt-2 flex flex-wrap gap-3">
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-[#FFFFFF] bg-[#176B45] rounded-xl hover:bg-[#123D2A] min-h-[44px] dex-press"
              >
                <span>Browse Catalogue</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-[#123D2A] bg-[#FFFFFF] border border-[#E2EAE5] rounded-xl hover:bg-[#EAF5EE] hover:border-[#B8DCC5] min-h-[44px] dex-press"
              >
                <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
                <span>WhatsApp Enquiry</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
