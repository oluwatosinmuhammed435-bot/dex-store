import React, { useState } from 'react';
import { Save, CheckCircle2 } from 'lucide-react';
import { STORE_CONFIG } from '../../data/storeData';

export const AdminSettings: React.FC = () => {
  const [storeName, setStoreName] = useState(STORE_CONFIG.brandName);
  const [tagline, setTagline] = useState(STORE_CONFIG.tagline);
  const [whatsappNumber, setWhatsappNumber] = useState(STORE_CONFIG.whatsappNumber);
  const [email, setEmail] = useState(STORE_CONFIG.emailPlaceholder);
  const [address, setAddress] = useState(STORE_CONFIG.addressPlaceholder);
  const [businessHours, setBusinessHours] = useState(STORE_CONFIG.businessHoursPlaceholder);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Store settings updated:', { storeName, tagline, whatsappNumber, email, address, businessHours });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Store Settings</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Configure business profile details and customer contact channels.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs sm:text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Settings saved successfully.</span>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white p-4 sm:p-6 rounded-xl shadow-xs border border-slate-200/80 space-y-4 sm:space-y-5"
      >
        {/* Store Name */}
        <div>
          <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1">
            Store Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 min-h-[44px]"
          />
        </div>

        {/* Tagline / Description */}
        <div>
          <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1">
            Store Description / Tagline
          </label>
          <textarea
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            rows={3}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
          />
        </div>

        {/* WhatsApp Number */}
        <div>
          <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1">
            Business WhatsApp Number (Orders) <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            required
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
            placeholder="e.g. 2348012345678"
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 min-h-[44px]"
          />
          <p className="text-[11px] text-slate-500 mt-1">
            International format without spaces or symbols (e.g. 2348012345678). Used for instant WhatsApp checkout.
          </p>
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1">
            Customer Support Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 min-h-[44px]"
          />
        </div>

        {/* Address */}
        <div>
          <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1">
            Store Physical Address
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 min-h-[44px]"
          />
        </div>

        {/* Business Hours */}
        <div>
          <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1">
            Operating Hours
          </label>
          <input
            type="text"
            value={businessHours}
            onChange={(e) => setBusinessHours(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 min-h-[44px]"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-sm font-semibold px-5 py-3 rounded-lg transition min-h-[44px] w-full sm:w-auto shadow-xs"
        >
          <Save className="h-4 w-4" />
          <span>Save Settings</span>
        </button>
      </form>
    </div>
  );
};
