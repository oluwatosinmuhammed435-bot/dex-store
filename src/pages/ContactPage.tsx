import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { CATEGORIES, STORE_CONFIG } from '../data/storeData';
import { buildWhatsAppGeneralUrl } from '../utils/catalogue';

export const ContactPage: React.FC = () => {
  const [customerName, setCustomerName] = useState('');
  const [department, setDepartment] = useState('Car Parts');
  const [enquiryNotes, setEnquiryNotes] = useState('');
  const [validationError, setValidationError] = useState('');

  const composedMessage = [
    `Hello ${STORE_CONFIG.brandName},`,
    customerName.trim() ? `Name: ${customerName.trim()}` : null,
    `Department: ${department}`,
    enquiryNotes.trim()
      ? `Enquiry: ${enquiryNotes.trim()}`
      : 'I would like assistance with product availability and ordering.',
  ]
    .filter(Boolean)
    .join('\n');

  const whatsappUrl = buildWhatsAppGeneralUrl(composedMessage);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!enquiryNotes.trim()) {
      setValidationError('Please enter a brief enquiry message before opening WhatsApp.');
      return;
    }
    setValidationError('');
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="bg-[#FFFFFF]">
      <section className="bg-[#F8FAF8] border-b border-[#E5EBE6]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-3">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#69746D]">
            <Link to="/" className="hover:text-[#123D2A]">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-[#202923] font-medium">Contact</span>
          </nav>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#202923] tracking-tight">
            Contact &amp; WhatsApp Order Desk
          </h1>
          <p className="text-sm text-[#69746D] max-w-2xl">
            Reach out to DEX STORES via WhatsApp for part compatibility questions, bulk quantities, or general product enquiries.
          </p>
        </div>
      </section>

      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Column: Contact Information Placeholders (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-[#202923]">
                Storefront Contact Channels
              </h2>
              <p className="text-sm text-[#69746D] leading-relaxed">
                Below are the configurable business contact placeholders prepared for DEX STORES.
              </p>
            </div>

            <dl className="divide-y divide-[#E5EBE6] border-t border-b border-[#E5EBE6] text-sm">
              <div className="py-4 space-y-1">
                <dt className="text-xs font-semibold text-[#176B45]">WhatsApp Order Line</dt>
                <dd className="text-[#202923] font-mono-num">
                  {STORE_CONFIG.whatsappDisplayPlaceholder}
                </dd>
              </div>
              <div className="py-4 space-y-1">
                <dt className="text-xs font-semibold text-[#176B45]">Email Address</dt>
                <dd className="text-[#202923]">{STORE_CONFIG.emailPlaceholder}</dd>
              </div>
              <div className="py-4 space-y-1">
                <dt className="text-xs font-semibold text-[#176B45]">Business Address</dt>
                <dd className="text-[#202923]">{STORE_CONFIG.addressPlaceholder}</dd>
              </div>
              <div className="py-4 space-y-1">
                <dt className="text-xs font-semibold text-[#176B45]">Operating Hours</dt>
                <dd className="text-[#202923]">{STORE_CONFIG.businessHoursPlaceholder}</dd>
              </div>
            </dl>
          </div>

          {/* Right Column: Interactive WhatsApp Enquiry Composer (7 cols) */}
          <div className="lg:col-span-7">
            <div className="bg-[#F8FAF8] border border-[#E5EBE6] rounded-lg p-6 sm:p-8 space-y-6">
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-[#202923]">
                  Prepare a WhatsApp Enquiry
                </h2>
                <p className="text-xs text-[#69746D]">
                  Fill in your enquiry details below to generate a pre-filled WhatsApp message.
                </p>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-4" noValidate>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="contact-name"
                      className="block text-xs font-semibold text-[#202923]"
                    >
                      Your Name (Optional)
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Tunde Adebayo"
                      className="w-full px-3.5 py-2.5 text-sm bg-[#FFFFFF] border border-[#E5EBE6] rounded-md text-[#202923] focus:outline-none focus:border-[#176B45]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="contact-department"
                      className="block text-xs font-semibold text-[#202923]"
                    >
                      Product Category
                    </label>
                    <select
                      id="contact-department"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-[#FFFFFF] border border-[#E5EBE6] rounded-md text-[#202923] focus:outline-none focus:border-[#176B45]"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat.id} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                      <option value="General Enquiry">General Enquiry</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="contact-notes"
                    className="block text-xs font-semibold text-[#202923]"
                  >
                    Enquiry Details
                  </label>
                  <textarea
                    id="contact-notes"
                    rows={4}
                    value={enquiryNotes}
                    onChange={(e) => {
                      setEnquiryNotes(e.target.value);
                      if (validationError) setValidationError('');
                    }}
                    placeholder="Specify the part name, vehicle model year, or product reference you are looking for..."
                    className="w-full px-3.5 py-2.5 text-sm bg-[#FFFFFF] border border-[#E5EBE6] rounded-md text-[#202923] focus:outline-none focus:border-[#176B45]"
                  />
                  {validationError && (
                    <p role="alert" className="text-xs font-medium text-red-700">
                      {validationError}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 text-xs sm:text-sm font-semibold text-[#FFFFFF] bg-[#123D2A] rounded-md hover:bg-[#176B45] transition-colors min-h-[44px]"
                  >
                    <MessageCircle className="w-4 h-4 shrink-0" />
                    <span>Open Enquiry in WhatsApp</span>
                  </a>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
