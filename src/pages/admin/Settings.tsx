import React, { useEffect, useState } from 'react';
import { Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { STORE_CONFIG } from '../../data/storeData';
import {
  ensureStoreSettingsInitialized,
  fetchStoreSettings,
  saveStoreSettingsRecord,
} from '../../utils/productService';
import { useStoreData } from '../../context/StoreDataContext';
import { useToast } from '../../context/ToastContext';
import { Badge, Button, Input, Skeleton, Textarea } from '../../components/ui';

export const AdminSettings: React.FC = () => {
  const { refreshStoreData } = useStoreData();
  const { showToast } = useToast();

  const [storeName, setStoreName] = useState(STORE_CONFIG.brandName);
  const [tagline, setTagline] = useState(STORE_CONFIG.tagline);
  const [whatsappNumber, setWhatsappNumber] = useState(STORE_CONFIG.whatsappNumber);
  const [email, setEmail] = useState(STORE_CONFIG.emailPlaceholder);
  const [address, setAddress] = useState(STORE_CONFIG.addressPlaceholder);
  const [businessHours, setBusinessHours] = useState(STORE_CONFIG.businessHoursPlaceholder);
  const [rowId, setRowId] = useState<boolean | string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [isLiveRecord, setIsLiveRecord] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadSettings() {
      let res = await fetchStoreSettings();
      if (!isMounted) return;

      if (!res.isLive) {
        const init = await ensureStoreSettingsInitialized();
        if (init.created) {
          res = await fetchStoreSettings();
          await refreshStoreData();
        }
      }

      if (!isMounted) return;
      setStoreName(res.config.brandName);
      setTagline(res.config.tagline);
      setWhatsappNumber(res.config.whatsappNumber);
      setEmail(res.config.emailPlaceholder);
      setAddress(res.config.addressPlaceholder);
      setBusinessHours(res.config.businessHoursPlaceholder);
      setRowId(res.rowId);
      setUpdatedAt(res.updatedAt);
      setIsLiveRecord(res.isLive);
      setIsLoading(false);
    }

    loadSettings();
    return () => {
      isMounted = false;
    };
  }, [refreshStoreData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSavedSuccess(false);

    const cleanPhone = whatsappNumber.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 7) {
      setSaveError('Please enter a valid international WhatsApp phone number (digits only).');
      return;
    }

    setIsSaving(true);
    const res = await saveStoreSettingsRecord(
      {
        brand_name: storeName.trim(),
        tagline: tagline.trim(),
        whatsapp_number: cleanPhone,
        email: email.trim(),
        address: address.trim(),
        business_hours: businessHours.trim(),
      },
      rowId,
      updatedAt
    );
    setIsSaving(false);

    if (!res.success) {
      setSaveError(res.error || 'Could not update store settings.');
      showToast({ variant: 'error', title: 'Settings save failed', description: res.error });
      return;
    }

    if (res.rowId !== undefined) {
      setRowId(res.rowId);
    }
    if (res.updatedAt !== undefined) {
      setUpdatedAt(res.updatedAt);
    }
    setIsLiveRecord(true);
    setSavedSuccess(true);
    showToast({ variant: 'success', title: 'Store settings updated' });
    await refreshStoreData();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5 sm:space-y-6">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#17231C] tracking-tight">
            Store Settings
          </h1>
          <Badge variant={isLiveRecord ? 'success' : 'neutral'} dot>
            {isLiveRecord ? 'Synced to Supabase' : 'Default Config'}
          </Badge>
        </div>
        <p className="text-xs sm:text-sm text-[#5C6B62] mt-0.5">
          Configure business identity and the WhatsApp order desk number used across checkout.
        </p>
      </div>

      {saveError && (
        <div
          role="alert"
          className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs sm:text-sm flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{saveError}</span>
        </div>
      )}

      {savedSuccess && (
        <div className="p-3.5 bg-[#EAF5EE] border border-[#B8DCC5] rounded-xl text-[#123D2A] text-xs sm:text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#176B45] shrink-0" aria-hidden="true" />
          <span className="font-medium">Settings saved and synchronized to the storefront.</span>
        </div>
      )}

      {isLoading ? (
        <div className="bg-[#FFFFFF] p-6 rounded-2xl border border-[#E2EAE5] space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-xl" />
          ))}
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="bg-[#FFFFFF] p-4 sm:p-6 rounded-2xl shadow-xs border border-[#E2EAE5] space-y-4 sm:space-y-5"
        >
          <Input
            label="Store Name"
            required
            requiredMark
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
          />

          <Textarea
            label="Store Description / Tagline"
            rows={3}
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
          />

          <Input
            label="Business WhatsApp Number (Order Desk)"
            type="tel"
            required
            requiredMark
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
            placeholder="e.g. 2348012345678"
            className="font-mono-num"
            helperText="International digits only (e.g. 2348012345678). Powers every product and cart checkout link."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Customer Support Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Input
              label="Operating Hours"
              value={businessHours}
              onChange={(e) => setBusinessHours(e.target.value)}
            />
          </div>

          <Input
            label="Store Physical Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />

          <div className="pt-1">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSaving}
              fullWidth
              className="sm:w-auto"
              leftIcon={<Save className="h-4 w-4" aria-hidden="true" />}
            >
              {isSaving ? 'Saving Settings…' : 'Save Store Settings'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};
