import React, { useState } from 'react';
import { Save } from 'lucide-react';
import { STORE_CONFIG } from '../../data/storeData';

export const AdminSettings: React.FC = () => {
  const [storeName, setStoreName] = useState(STORE_CONFIG.brandName);
  const [tagline, setTagline] = useState(STORE_CONFIG.tagline);
  const [whatsappNumber, setWhatsappNumber] = useState(STORE_CONFIG.whatsappNumber);
  const [email, setEmail] = useState(STORE_CONFIG.emailPlaceholder);
  const [address, setAddress] = useState(STORE_CONFIG.addressPlaceholder);
  const [businessHours, setBusinessHours] = useState(STORE_CONFIG.businessHoursPlaceholder);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Prototype: log values – will connect to Supabase later
    console.log({ storeName, tagline, whatsappNumber, email, address, businessHours });
    alert('Settings saved (prototype – local state only).');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold text-[#202923]">Store Settings</h1>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm border border-[#E0E0E0] space-y-5">
        {/* Store Name */}
        <div>
          <label className="block text-sm font-medium text-[#202923] mb-1">Store Name</label>
          <input
            type="text"
            required
            value={storeName}
            onChange={e => setStoreName(e.target.value)}
            className="w-full border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-[#123D2A]"
          />
        </div>

        {/* Tagline / Description */}
        <div>
          <label className="block text-sm font-medium text-[#202923] mb-1">Store Description / Tagline</label>
          <textarea
            value={tagline}
            onChange={e => setTagline(e.target.value)}
            rows={3}
            className="w-full border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-[#123D2A]"
          />
        </div>

        {/* WhatsApp Number */}
        <div>
          <label className="block text-sm font-medium text-[#202923] mb-1">Business WhatsApp Number</label>
          <input
            type="tel"
            required
            value={whatsappNumber}
            onChange={e => setWhatsappNumber(e.target.value)}
            placeholder="e.g. 2348012345678"
            className="w-full border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-[#123D2A]"
          />
          <p className="text-xs text-[#777] mt-1">International format, digits only (e.g. 2348012345678).</p>
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-[#202923] mb-1">Contact Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-[#123D2A]"
          />
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-medium text-[#202923] mb-1">Store Address</label>
          <input
            type="text"
            value={address}
            onChange={e => setAddress(e.target.value)}
            className="w-full border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-[#123D2A]"
          />
        </div>

        {/* Business Hours */}
        <div>
          <label className="block text-sm font-medium text-[#202923] mb-1">Business Hours</label>
          <input
            type="text"
            value={businessHours}
            onChange={e => setBusinessHours(e.target.value)}
            className="w-full border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-[#123D2A]"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="flex items-center gap-2 bg-[#123D2A] text-white px-5 py-2.5 rounded-md hover:bg-[#0f2e1e] transition"
        >
          <Save className="h-4 w-4" /> Save Settings
        </button>
      </form>
    </div>
  );
};
