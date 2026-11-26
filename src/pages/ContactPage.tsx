import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { useStoreData } from '../context/StoreDataContext';
import { buildWhatsAppGeneralUrl } from '../utils/catalogue';
import { Button, Input, Select, Textarea } from '../components/ui';

export const ContactPage: React.FC = () => {
  const { categories, storeConfig } = useStoreData();
  const [customerName, setCustomerName] = useState('');
  const [department, setDepartment] = useState(categories[0]?.name || 'Car Parts');
  const [enquiryNotes, setEnquiryNotes] = useState('');
  const [validationError, setValidationError] = useState('');

  const composedMessage = [
    `Hello ${storeConfig.brandName},`,
    customerName.trim() ? `Name: ${customerName.trim()}` : null,
    `Department: ${department}`,
    enquiryNotes.trim()
      ? `Enquiry: ${enquiryNotes.trim()}`
      : 'I would like assistance with product availability and ordering.',
  ]
    .filter(Boolean)
    .join('\n');

  const whatsappUrl = buildWhatsAppGeneralUrl(composedMessage, storeConfig.whatsappNumber);

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
      <section className="bg-[#F7FAF8] border-b border-[#E2EAE5]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 space-y-2.5">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#5C6B62]">
            <Link to="/" className="hover:text-[#176B45]">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-[#17231C] font-semibold">Contact</span>
          </nav>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#17231C] tracking-tight">
            Contact &amp; WhatsApp Order Desk
          </h1>
          <p className="text-sm text-[#5C6B62] max-w-2xl">
            Reach out to {storeConfig.brandName} via WhatsApp for part compatibility questions, bulk quantities, or general product enquiries.
          </p>
        </div>
      </section>

      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10">
          {/* Left Column: Contact Channels */}
          <div className="lg:col-span-5 space-y-5">
            <div className="space-y-1.5">
              <h2 className="text-lg font-bold text-[#17231C]">
                Storefront Contact Channels
              </h2>
              <p className="text-sm text-[#5C6B62] leading-relaxed">
                Direct channels configured for {storeConfig.brandName}.
              </p>
            </div>

            <dl className="divide-y divide-[#E2EAE5] border border-[#E2EAE5] rounded-2xl bg-[#FFFFFF] px-5 text-sm shadow-xs">
              <div className="py-4 space-y-1">
                <dt className="text-xs font-semibold text-[#176B45]">WhatsApp Order Line</dt>
                <dd className="text-[#17231C] font-mono-num">
                  {storeConfig.whatsappDisplayPlaceholder}
                </dd>
              </div>
              <div className="py-4 space-y-1">
                <dt className="text-xs font-semibold text-[#176B45]">Email Address</dt>
                <dd className="text-[#17231C]">{storeConfig.emailPlaceholder}</dd>
              </div>
              <div className="py-4 space-y-1">
                <dt className="text-xs font-semibold text-[#176B45]">Business Address</dt>
                <dd className="text-[#17231C]">{storeConfig.addressPlaceholder}</dd>
              </div>
              <div className="py-4 space-y-1">
                <dt className="text-xs font-semibold text-[#176B45]">Operating Hours</dt>
                <dd className="text-[#17231C]">{storeConfig.businessHoursPlaceholder}</dd>
              </div>
            </dl>
          </div>

          {/* Right Column: Interactive WhatsApp Enquiry Composer */}
          <div className="lg:col-span-7">
            <div className="bg-[#F7FAF8] border border-[#E2EAE5] rounded-2xl p-5 sm:p-8 space-y-5 shadow-xs">
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-[#17231C]">
                  Prepare a WhatsApp Enquiry
                </h2>
                <p className="text-xs text-[#5C6B62]">
                  Fill in your enquiry details below to compose a pre-filled WhatsApp message.
                </p>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-4" noValidate>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    id="contact-name"
                    label="Your Name (Optional)"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Tunde Adebayo"
                  />

                  <Select
                    id="contact-department"
                    label="Product Category"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                    <option value="General Enquiry">General Enquiry</option>
                  </Select>
                </div>

                <Textarea
                  id="contact-notes"
                  label="Enquiry Details"
                  rows={4}
                  value={enquiryNotes}
                  error={validationError}
                  onChange={(e) => {
                    setEnquiryNotes(e.target.value);
                    if (validationError) setValidationError('');
                  }}
                  placeholder="Specify the part name, vehicle model year, or product reference you are looking for…"
                />

                <div className="pt-1">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    leftIcon={<MessageCircle className="w-4 h-4" aria-hidden="true" />}
                  >
                    Open Enquiry in WhatsApp
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
