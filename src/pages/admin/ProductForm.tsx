import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import { CATEGORIES, type AvailabilityStatus } from '../../data/storeData';
import {
  compressImage,
  generateResponsiveImageVariants,
  ResponsiveImagePackage,
} from '../../utils/imageOptimizer';
import {
  extractStorageObjectPath,
  fetchProductBySlug,
  updateProductRecord,
} from '../../utils/productService';
import { useStoreData } from '../../context/StoreDataContext';
import { useToast } from '../../context/ToastContext';
import {
  Save,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { Button, Input, Select, Textarea } from '../../components/ui';

interface ExtraGalleryItem {
  id: string;
  previewUrl: string;
  blob?: Blob;
  fileName?: string;
  existingUrl?: string;
}

const isPrimaryVariantUrl = (url: string): boolean =>
  /\/(thumb|card|detail|full)\.(webp|jpe?g|png)(\?|$)/i.test(url);

export const AdminProductForm: React.FC = () => {
  const { id: editProductId } = useParams<{ id: string }>();
  const isEditMode = Boolean(editProductId);

  const navigate = useNavigate();
  const { refreshStoreData } = useStoreData();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [stock, setStock] = useState('1');
  const [availability, setAvailability] = useState<AvailabilityStatus>('In Stock');
  const [featured, setFeatured] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [specs, setSpecs] = useState<Array<{ label: string; value: string }>>([]);

  // Categories fetched cleanly from live Supabase table (no static fallback when DB is connected)
  const [categoriesList, setCategoriesList] = useState<
    Array<{ id?: string; name: string; slug: string; is_active?: boolean }>
  >(() => (isSupabaseConfigured() ? [] : CATEGORIES));
  const [categoriesLoaded, setCategoriesLoaded] = useState(!isSupabaseConfigured());

  // Image optimization & existing storage URLs
  const [rawImageFile, setRawImageFile] = useState<File | null>(null);
  const [optimizedPackage, setOptimizedPackage] = useState<ResponsiveImagePackage | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [existingGalleryUrls, setExistingGalleryUrls] = useState<string[]>([]);
  const [extraGalleryItems, setExtraGalleryItems] = useState<ExtraGalleryItem[]>([]);
  const [existingUpdatedAt, setExistingUpdatedAt] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isOptimizingGallery, setIsOptimizingGallery] = useState(false);
  const [optimizationError, setOptimizationError] = useState<string | null>(null);

  // Load, progress & submission states
  const [isLoadingProduct, setIsLoadingProduct] = useState(isEditMode);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    completed: number;
    total: number;
    label: string;
  } | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Fetch live categories and (when editing) product details together to avoid selection race conditions
  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      if (editProductId) {
        setIsLoadingProduct(true);
      }

      try {
        const [catResult, existingProduct] = await Promise.all([
          supabase.from('categories').select('id, name, slug, is_active').order('name'),
          editProductId ? fetchProductBySlug(editProductId) : Promise.resolve(null),
        ]);

        if (!isMounted) return;

        if (!catResult.error && catResult.data) {
          setCategoriesList(catResult.data);
          setCategoriesLoaded(true);
        } else if (!isSupabaseConfigured()) {
          setCategoriesList(CATEGORIES);
          setCategoriesLoaded(true);
        } else {
          setCategoriesLoaded(true);
        }

        if (editProductId) {
          if (!existingProduct || existingProduct.isSample) {
            setSaveError('Product record not found in Supabase.');
            setIsLoadingProduct(false);
            return;
          }

          setName(existingProduct.name);
          setReference(existingProduct.reference || '');
          setDescription(existingProduct.description || '');
          setPrice(String(existingProduct.priceNgn));
          setStock(String(existingProduct.stockQuantity ?? 0));
          setAvailability(existingProduct.availability);
          setCategory(
            existingProduct.categoryId ||
              existingProduct.categorySlug ||
              existingProduct.category ||
              ''
          );
          setFeatured(existingProduct.featured);
          setIsActive(existingProduct.isActive !== false);
          setSpecs(existingProduct.specifications || []);
          setExistingImageUrl(existingProduct.image || null);
          const allUrls = existingProduct.gallery.map((g) => g.url).filter(Boolean);
          setExistingGalleryUrls(allUrls);
          const extraUrls = allUrls.filter(
            (u) => u !== existingProduct.image && !isPrimaryVariantUrl(u)
          );
          setExtraGalleryItems(
            extraUrls.map((url, idx) => ({
              id: `existing-${idx}-${Date.now()}`,
              previewUrl: url,
              existingUrl: url,
            }))
          );
          setExistingUpdatedAt(existingProduct.updatedAt ?? null);
          setPreviewUrl(existingProduct.image || null);
          setIsLoadingProduct(false);
        }
      } catch (err) {
        if (!isMounted) return;
        console.warn('Could not load initial form data from Supabase:', err);
        setCategoriesLoaded(true);
        if (editProductId) {
          setSaveError('Failed to load product details from Supabase.');
          setIsLoadingProduct(false);
        }
      }
    }

    loadInitialData();
    return () => {
      isMounted = false;
    };
  }, [editProductId]);

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setRawImageFile(file);
    setOptimizedPackage(null);
    setOptimizationError(null);
    setSaveError(null);
    setIsOptimizing(true);

    try {
      const imagePackage = await generateResponsiveImageVariants(file);
      setOptimizedPackage(imagePackage);
      const preview = URL.createObjectURL(imagePackage.card.blob);
      setPreviewUrl(preview);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to optimize image.';
      setOptimizationError(message);
      setRawImageFile(null);
      setOptimizedPackage(null);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleExtraGallerySelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;

    const remainingSlots = Math.max(0, 6 - extraGalleryItems.length);
    const chosen = files.slice(0, remainingSlots);
    if (chosen.length === 0) {
      setOptimizationError('Maximum of 6 additional gallery images reached.');
      return;
    }

    setOptimizationError(null);
    setIsOptimizingGallery(true);
    try {
      const compressedItems: ExtraGalleryItem[] = [];
      for (let idx = 0; idx < chosen.length; idx++) {
        const file = chosen[idx];
        const compressed = await compressImage(file, {
          maxDimension: 1200,
          customSuffix: `gallery-${idx + 1}`,
        });
        compressedItems.push({
          id: `new-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
          previewUrl: URL.createObjectURL(compressed.blob),
          blob: compressed.blob,
          fileName: compressed.file.name,
        });
      }
      setExtraGalleryItems((prev) => [...prev, ...compressedItems]);
    } catch (err) {
      setOptimizationError(
        err instanceof Error ? err.message : 'Could not optimize selected gallery photo.'
      );
    } finally {
      setIsOptimizingGallery(false);
    }
  };

  const handleRemoveExtraGalleryItem = (itemId: string) => {
    setExtraGalleryItems((prev) => {
      const target = prev.find((i) => i.id === itemId);
      if (target?.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((i) => i.id !== itemId);
    });
  };

  const handleRemoveImage = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setRawImageFile(null);
    setOptimizedPackage(null);
    setPreviewUrl(isEditMode ? existingImageUrl : null);
    setOptimizationError(null);
  };

  function generateSlug(text: string): string {
    const base = text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    const suffix = Math.random().toString(36).substring(2, 7);
    return `${base || 'product'}-${suffix}`;
  }

  function generateReference(text: string): string {
    const prefix = text
      .trim()
      .slice(0, 3)
      .toUpperCase()
      .replace(/[^A-Z]/g, 'PRD');
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `DEX-${prefix || 'PRD'}-${rand}`;
  }

  const uploadImageVariants = async (
    slugBase: string,
    pkg: ResponsiveImagePackage,
    totalSteps: number,
    onProgress?: (completed: number, label: string) => void
  ) => {
    const storageBase = `products/${slugBase}-${Date.now()}`;
    const variantsToUpload = [
      { key: 'thumbnail', variant: pkg.thumbnail, suffix: 'thumb', label: 'Thumbnail WebP (200px)' },
      { key: 'card', variant: pkg.card, suffix: 'card', label: 'Card WebP (400px)' },
      { key: 'detail', variant: pkg.detail, suffix: 'detail', label: 'Detail WebP (800px)' },
      { key: 'full', variant: pkg.full, suffix: 'full', label: 'Full WebP (1200px)' },
    ];

    const uploadedPaths: string[] = [];
    const variantPublicUrls: Record<string, string> = {};

    for (let i = 0; i < variantsToUpload.length; i++) {
      const item = variantsToUpload[i];
      onProgress?.(i, `Uploading ${item.label} (${i + 1}/${totalSteps})…`);
      const filePath = `${storageBase}/${item.suffix}.webp`;
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, item.variant.blob, {
          contentType: item.variant.blob.type || 'image/webp',
          cacheControl: '31536000',
          upsert: true,
        });

      if (uploadError) {
        if (uploadedPaths.length > 0) {
          await supabase.storage.from('product-images').remove(uploadedPaths);
        }
        throw new Error(`Failed to upload ${item.key} image variant: ${uploadError.message}`);
      }

      uploadedPaths.push(filePath);
      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);
      variantPublicUrls[item.key] = urlData.publicUrl;
      onProgress?.(i + 1, `Uploaded ${item.label}`);
    }

    const galleryUrls: string[] = [
      variantPublicUrls.full,
      variantPublicUrls.detail,
      variantPublicUrls.card,
      variantPublicUrls.thumbnail,
    ].filter(Boolean);

    return {
      uploadedPaths,
      primaryUrl: variantPublicUrls.card || variantPublicUrls.full || null,
      galleryUrls,
    };
  };

  const uploadExtraGalleryBlobs = async (
    slugBase: string,
    items: ExtraGalleryItem[],
    startStep: number,
    totalSteps: number,
    onProgress?: (completed: number, label: string) => void
  ) => {
    const uploadedPaths: string[] = [];
    const finalUrls: string[] = [];
    const stamp = Date.now();
    let newIndex = 0;

    for (const item of items) {
      if (item.existingUrl) {
        finalUrls.push(item.existingUrl);
        continue;
      }
      if (!item.blob) continue;
      newIndex += 1;
      const stepNum = startStep + newIndex;
      onProgress?.(stepNum - 1, `Uploading gallery photo ${newIndex} (${stepNum}/${totalSteps})…`);
      const filePath = `products/${slugBase}-extra-${stamp}-${newIndex}.webp`;
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, item.blob, {
          contentType: item.blob.type || 'image/webp',
          cacheControl: '31536000',
          upsert: true,
        });

      if (uploadError) {
        if (uploadedPaths.length > 0) {
          await supabase.storage.from('product-images').remove(uploadedPaths);
        }
        throw new Error(`Failed to upload extra gallery image: ${uploadError.message}`);
      }

      uploadedPaths.push(filePath);
      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);
      finalUrls.push(urlData.publicUrl);
      onProgress?.(stepNum, `Uploaded gallery photo ${newIndex}`);
    }

    return { uploadedPaths, finalUrls };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);

    if (isOptimizing || isOptimizingGallery) {
      setSaveError('Please wait for image optimization to complete before saving.');
      return;
    }

    if (!isEditMode && (!optimizedPackage || !rawImageFile)) {
      setSaveError('Please select a product image from your device.');
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      setSaveError('Product name is required.');
      return;
    }

    const parsedPrice = Number(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setSaveError('Please enter a valid price (≥ 0).');
      return;
    }

    const parsedStock = Number(stock);
    if (isNaN(parsedStock) || parsedStock < 0 || !Number.isInteger(parsedStock)) {
      setSaveError('Please enter a valid non-negative integer for stock quantity.');
      return;
    }

    if (isSupabaseConfigured() && categoriesList.length === 0) {
      setSaveError('Create at least one category in Admin → Categories before adding a product.');
      return;
    }

    if (!category) {
      setSaveError('Please select a product category.');
      return;
    }

    const newExtraCount = extraGalleryItems.filter((item) => Boolean(item.blob)).length;
    const primaryStepCount = optimizedPackage ? 4 : 0;
    const totalUploadSteps = primaryStepCount + newExtraCount + 1;

    setIsSaving(true);
    setUploadProgress({
      completed: 0,
      total: totalUploadSteps,
      label: totalUploadSteps > 1 ? 'Preparing image upload…' : 'Saving product to Supabase…',
    });
    let newlyUploadedPaths: string[] = [];

    try {
      const selectedCategory = categoriesList.find(
        (c) => c.id === category || c.name === category || c.slug === category
      );
      const isValidUuid =
        selectedCategory?.id &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          selectedCategory.id
        );
      if (isSupabaseConfigured() && !isValidUuid) {
        throw new Error('Selected category is missing a database ID. Please create/select a valid category first.');
      }
      const categoryId = isValidUuid ? selectedCategory!.id! : null;

      // Clean specifications map for jsonb storage
      const cleanSpecsList = specs
        .map((s) => ({ label: s.label.trim(), value: s.value.trim() }))
        .filter((s) => s.label && s.value);

      const specsJsonb: Record<string, string> = {};
      for (const s of cleanSpecsList) {
        specsJsonb[s.label] = s.value;
      }

      const updateProgress = (completed: number, label: string) => {
        setUploadProgress({ completed, total: totalUploadSteps, label });
      };

      if (isEditMode && editProductId) {
        const slugBase =
          trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 28) || 'product';
        let finalImageUrl = existingImageUrl;
        let baseGallery = existingGalleryUrls.filter((u) => isPrimaryVariantUrl(u) || u === existingImageUrl);

        if (optimizedPackage) {
          const uploadRes = await uploadImageVariants(
            slugBase,
            optimizedPackage,
            totalUploadSteps,
            updateProgress
          );
          newlyUploadedPaths.push(...uploadRes.uploadedPaths);
          finalImageUrl = uploadRes.primaryUrl;
          baseGallery = uploadRes.galleryUrls;
        }

        const extraRes = await uploadExtraGalleryBlobs(
          slugBase,
          extraGalleryItems,
          primaryStepCount,
          totalUploadSteps,
          updateProgress
        );
        newlyUploadedPaths.push(...extraRes.uploadedPaths);

        const finalGallery = Array.from(new Set([...baseGallery, ...extraRes.finalUrls].filter(Boolean)));
        updateProgress(totalUploadSteps - 1, 'Updating product record in database…');

        const res = await updateProductRecord(
          editProductId,
          {
            name: trimmedName,
            reference: reference.trim() || generateReference(trimmedName),
            category_id: categoryId,
            price_ngn: parsedPrice,
            stock_quantity: parsedStock,
            availability,
            featured,
            description: description.trim() || null,
            image_url: finalImageUrl,
            gallery: finalGallery,
            specifications: specsJsonb,
            is_active: isActive,
          },
          existingUpdatedAt
        );

        if (!res.success) {
          if (newlyUploadedPaths.length > 0) {
            await supabase.storage.from('product-images').remove(newlyUploadedPaths);
          }
          if (res.conflict) {
            showToast({
              variant: 'error',
              title: 'Save conflict detected',
              description: res.error,
            });
          }
          throw new Error(res.error || 'Failed to update product');
        }

        // Remove any previously stored image paths that are no longer referenced
        const previousUrls = Array.from(
          new Set([existingImageUrl, ...existingGalleryUrls].filter((u): u is string => Boolean(u)))
        );
        const retainedSet = new Set([finalImageUrl, ...finalGallery].filter(Boolean));
        const removedPaths = previousUrls
          .filter((u) => !retainedSet.has(u))
          .map(extractStorageObjectPath)
          .filter((p): p is string => Boolean(p));

        if (removedPaths.length > 0) {
          await supabase.storage.from('product-images').remove(removedPaths);
        }

        updateProgress(totalUploadSteps, 'Saved!');
        showToast({ variant: 'success', title: `Updated "${trimmedName}"` });
        await refreshStoreData();
        navigate('/admin/products');
      } else {
        const productSlug = generateSlug(trimmedName);
        const productRef = reference.trim() || generateReference(trimmedName);
        const uploadRes = await uploadImageVariants(
          productSlug,
          optimizedPackage!,
          totalUploadSteps,
          updateProgress
        );
        newlyUploadedPaths.push(...uploadRes.uploadedPaths);

        const extraRes = await uploadExtraGalleryBlobs(
          productSlug,
          extraGalleryItems,
          primaryStepCount,
          totalUploadSteps,
          updateProgress
        );
        newlyUploadedPaths.push(...extraRes.uploadedPaths);

        const finalGallery = Array.from(
          new Set([...uploadRes.galleryUrls, ...extraRes.finalUrls].filter(Boolean))
        );

        updateProgress(totalUploadSteps - 1, 'Publishing product to Supabase…');

        const productRow = {
          name: trimmedName,
          slug: productSlug,
          reference: productRef,
          category_id: categoryId,
          price_ngn: parsedPrice,
          stock_quantity: parsedStock,
          availability,
          featured,
          description: description.trim() || null,
          image_url: uploadRes.primaryUrl,
          gallery: finalGallery,
          specifications: specsJsonb,
          is_active: isActive,
        };

        const { error: insertError } = await supabase.from('products').insert(productRow);

        if (insertError) {
          if (newlyUploadedPaths.length > 0) {
            await supabase.storage.from('product-images').remove(newlyUploadedPaths);
          }
          if (insertError.code === '23505') {
            throw new Error(
              'A product with this slug or SKU reference already exists. Please adjust the name or SKU and try again.'
            );
          }
          throw new Error(`Database error saving product: ${insertError.message}`);
        }

        updateProgress(totalUploadSteps, 'Published!');
        showToast({ variant: 'success', title: `Created "${trimmedName}"` });
        await refreshStoreData();
        navigate('/admin/products');
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred while saving.';
      setSaveError(message);
    } finally {
      setIsSaving(false);
      setUploadProgress(null);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  if (isLoadingProduct) {
    return (
      <div className="max-w-3xl mx-auto p-12 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-[#176B45]" aria-hidden="true" />
        <p className="text-xs sm:text-sm text-[#5C6B62] font-medium">Loading product details…</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5 sm:space-y-6">
      <header className="flex items-center gap-3">
        <Link
          to="/admin/products"
          className="p-2 rounded-xl text-[#5C6B62] hover:text-[#123D2A] hover:bg-[#EAF5EE] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0 dex-press"
          aria-label="Back to Products"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#17231C] tracking-tight">
            {isEditMode ? 'Edit Product' : 'Add New Product'}
          </h1>
          <p className="text-xs sm:text-sm text-[#5C6B62]">
            {isEditMode
              ? 'Update pricing, stock, description, specs, or upload a replacement photo'
              : 'Configure product details with automatic WebP image compression'}
          </p>
        </div>
      </header>

      {saveError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs sm:text-sm"
        >
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1">
            <p className="font-bold">Could not save product</p>
            <p className="text-xs text-red-600 mt-0.5">{saveError}</p>
            {saveError.includes('Bucket not found') && (
              <p className="text-xs text-red-700 mt-2 p-2 bg-red-100/70 rounded-lg border border-red-200 font-medium">
                Ensure a public bucket named <code className="font-mono font-bold bg-white px-1 py-0.5 rounded">product-images</code> exists in Supabase Storage.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setSaveError(null)}
            className="text-red-500 hover:text-red-700 p-1 rounded-lg"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-[#FFFFFF] p-4 sm:p-6 rounded-2xl shadow-xs border border-[#E2EAE5] space-y-5"
      >
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
          <div className="sm:col-span-8">
            <Input
              label="Product Name"
              required
              requiredMark
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Toyota Corolla Projector Headlamp"
            />
          </div>
          <div className="sm:col-span-4">
            <Input
              label="SKU / Reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Auto-generated"
            />
          </div>
        </div>

        <Textarea
          label="Description"
          required
          requiredMark
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Detailed specifications, compatibility, and features…"
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Price (₦)"
            type="number"
            required
            requiredMark
            min="0"
            step="any"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="e.g. 185000"
          />
          <Input
            label="Stock Quantity"
            type="number"
            required
            requiredMark
            min="0"
            step="1"
            value={stock}
            onChange={(e) => {
              setStock(e.target.value);
              const val = Number(e.target.value);
              if (!isNaN(val)) {
                setAvailability(val > 0 ? 'In Stock' : 'Out of Stock');
              }
            }}
            placeholder="e.g. 25"
          />
          <Select
            label="Availability Status"
            value={availability}
            onChange={(e) => setAvailability(e.target.value as AvailabilityStatus)}
          >
            <option value="In Stock">In Stock</option>
            <option value="Available on Order">Available on Order</option>
            <option value="Out of Stock">Out of Stock</option>
          </Select>
        </div>

        <div className="space-y-2">
          {categoriesLoaded && categoriesList.length === 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
              <span>
                No categories exist in Supabase yet. Create your first category before publishing products.
              </span>
              <Link
                to="/admin/categories"
                className="font-bold text-[#176B45] hover:underline whitespace-nowrap shrink-0"
              >
                Create Category →
              </Link>
            </div>
          )}

          <Select
            label="Category"
            required
            requiredMark
            disabled={!categoriesLoaded || (categoriesList.length === 0 && isSupabaseConfigured())}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">
              {!categoriesLoaded
                ? 'Loading categories…'
                : categoriesList.length === 0
                ? 'No categories created yet'
                : 'Select category…'}
            </option>
            {categoriesList
              .filter(
                (cat) =>
                  cat.is_active !== false ||
                  (isEditMode &&
                    (cat.id === category || cat.slug === category || cat.name === category))
              )
              .map((cat) => (
                <option key={cat.id || cat.slug} value={cat.id || cat.slug || cat.name}>
                  {cat.name}
                  {cat.is_active === false ? ' (Inactive)' : ''}
                </option>
              ))}
          </Select>
        </div>

        {/* Product Image Upload & Optimization */}
        <div className="pt-3 pb-3 border-t border-b border-[#E2EAE5] space-y-3">
          <div className="flex items-center justify-between gap-2">
            <label className="block text-xs sm:text-sm font-semibold text-[#17231C]">
              Product Image &amp; Automatic WebP Optimization {!isEditMode && <span className="text-red-600">*</span>}
            </label>
          </div>

          {!previewUrl && !isOptimizing && (
            <div className="flex flex-col items-center justify-center p-6 sm:p-8 border-2 border-dashed border-[#B8DCC5] rounded-2xl bg-[#F7FAF8] hover:bg-[#EAF5EE] transition-colors cursor-pointer relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                aria-label="Choose product image from device storage or gallery"
              />
              <div className="w-12 h-12 rounded-2xl bg-[#FFFFFF] border border-[#C6E5D2] flex items-center justify-center mb-2.5 shadow-2xs">
                <ImageIcon className="w-6 h-6 text-[#176B45]" aria-hidden="true" />
              </div>
              <p className="text-xs sm:text-sm font-bold text-[#123D2A]">
                Tap to select from phone gallery or files
              </p>
              <p className="text-[11px] sm:text-xs text-[#5C6B62] mt-1 text-center max-w-sm">
                Supports JPG, PNG, WebP. Automatically generates 4 fast responsive WebP sizes.
              </p>
            </div>
          )}

          {isOptimizing && (
            <div className="flex items-center justify-center gap-3 p-6 bg-[#F7FAF8] border border-[#C6E5D2] rounded-2xl text-[#123D2A]">
              <Loader2 className="w-5 h-5 animate-spin text-[#176B45]" aria-hidden="true" />
              <div className="text-xs sm:text-sm font-semibold">
                Optimizing image &amp; generating 4 responsive WebP variants…
              </div>
            </div>
          )}

          {optimizationError && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs sm:text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{optimizationError}</span>
            </div>
          )}

          {/* Existing or Newly Optimized Preview */}
          {previewUrl && !isOptimizing && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-[#EAF5EE] rounded-xl border border-[#C6E5D2]">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={previewUrl}
                    alt="Product image preview"
                    className="w-16 h-16 object-cover rounded-xl border border-[#B8DCC5] bg-[#FFFFFF] shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#123D2A] bg-[#FFFFFF] px-2 py-0.5 rounded-full border border-[#C6E5D2]">
                      <CheckCircle2 className="w-3 h-3 text-[#176B45]" aria-hidden="true" />
                      {optimizedPackage ? 'Optimized WebP Ready' : 'Current Stored Image'}
                    </span>
                    {rawImageFile && (
                      <p className="text-xs text-[#5C6B62] mt-1 truncate">
                        {rawImageFile.name} ({formatBytes(rawImageFile.size)})
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <label className="relative cursor-pointer inline-flex items-center justify-center px-3 py-2 rounded-xl bg-[#FFFFFF] border border-[#C6E5D2] text-xs font-semibold text-[#123D2A] hover:bg-[#F7FAF8] min-h-[38px] flex-1 sm:flex-initial dex-press">
                    <span>Change Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="sr-only"
                    />
                  </label>
                  {optimizedPackage && (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="text-xs text-red-700 font-semibold px-3 py-2 border border-red-200 rounded-xl bg-[#FFFFFF] hover:bg-red-50 min-h-[38px] dex-press"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {optimizedPackage && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2.5 bg-[#F7FAF8] rounded-xl border border-[#E2EAE5]">
                    <span className="font-bold text-[#123D2A] block text-[11px]">1. Thumb (200px)</span>
                    <span className="text-[#5C6B62]">
                      {optimizedPackage.thumbnail.width}×{optimizedPackage.thumbnail.height}
                    </span>
                    <span className="block font-mono-num text-[#0E3021] font-semibold">
                      {formatBytes(optimizedPackage.thumbnail.sizeBytes)}
                    </span>
                  </div>
                  <div className="p-2.5 bg-[#EAF5EE]/70 rounded-xl border border-[#B8DCC5]">
                    <span className="font-bold text-[#176B45] block text-[11px]">2. Card (400px)</span>
                    <span className="text-[#5C6B62]">
                      {optimizedPackage.card.width}×{optimizedPackage.card.height}
                    </span>
                    <span className="block font-mono-num text-[#0E3021] font-semibold">
                      {formatBytes(optimizedPackage.card.sizeBytes)}
                    </span>
                  </div>
                  <div className="p-2.5 bg-[#F7FAF8] rounded-xl border border-[#E2EAE5]">
                    <span className="font-bold text-[#123D2A] block text-[11px]">3. Detail (800px)</span>
                    <span className="text-[#5C6B62]">
                      {optimizedPackage.detail.width}×{optimizedPackage.detail.height}
                    </span>
                    <span className="block font-mono-num text-[#0E3021] font-semibold">
                      {formatBytes(optimizedPackage.detail.sizeBytes)}
                    </span>
                  </div>
                  <div className="p-2.5 bg-[#F7FAF8] rounded-xl border border-[#E2EAE5]">
                    <span className="font-bold text-[#123D2A] block text-[11px]">4. Full (1200px)</span>
                    <span className="text-[#5C6B62]">
                      {optimizedPackage.full.width}×{optimizedPackage.full.height}
                    </span>
                    <span className="block font-mono-num text-[#0E3021] font-semibold">
                      {formatBytes(optimizedPackage.full.sizeBytes)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Optional Additional Gallery Photos from Phone/Files */}
          <div className="pt-3 border-t border-[#E2EAE5] space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <span className="block text-xs font-semibold text-[#17231C]">
                  Additional Gallery Photos (Optional · up to 6)
                </span>
                <span className="text-[11px] text-[#5C6B62]">
                  Add extra angles or close-up views from your smartphone gallery.
                </span>
              </div>
              {extraGalleryItems.length < 6 && (
                <label className="relative cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#EAF5EE] border border-[#C6E5D2] text-xs font-semibold text-[#123D2A] hover:bg-[#D9F0E2] min-h-[38px] dex-press">
                  <Plus className="w-3.5 h-3.5 text-[#176B45]" aria-hidden="true" />
                  <span>{isOptimizingGallery ? 'Optimizing…' : 'Add Gallery Photos'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={isOptimizingGallery}
                    onChange={handleExtraGallerySelect}
                    className="sr-only"
                    aria-label="Select additional gallery images from phone or files"
                  />
                </label>
              )}
            </div>

            {extraGalleryItems.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 pt-1">
                {extraGalleryItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="relative aspect-square rounded-xl overflow-hidden border border-[#E2EAE5] bg-[#F7FAF8]"
                  >
                    <img
                      src={item.previewUrl}
                      alt={`Gallery photo ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveExtraGalleryItem(item.id)}
                      aria-label={`Remove gallery photo ${idx + 1}`}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-[#17231C]/80 text-[#FFFFFF] inline-flex items-center justify-center hover:bg-red-600 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Specifications Builder */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs sm:text-sm font-semibold text-[#17231C]">
              Specifications (Optional)
            </label>
            <button
              type="button"
              onClick={() => setSpecs((prev) => [...prev, { label: '', value: '' }])}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#176B45] hover:text-[#123D2A] py-1 px-2 rounded-lg hover:bg-[#EAF5EE] dex-press"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Add Row</span>
            </button>
          </div>

          {specs.length > 0 && (
            <div className="space-y-2">
              {specs.map((spec, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Label (e.g. Material)"
                    value={spec.label}
                    onChange={(e) =>
                      setSpecs((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, label: e.target.value } : item))
                      )
                    }
                    className="flex-1 px-3 py-2 bg-[#F7FAF8] border border-[#E2EAE5] rounded-xl text-xs min-h-[40px] focus:outline-none focus:border-[#176B45]"
                  />
                  <input
                    type="text"
                    placeholder="Value (e.g. Cast Iron)"
                    value={spec.value}
                    onChange={(e) =>
                      setSpecs((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, value: e.target.value } : item))
                      )
                    }
                    className="flex-1 px-3 py-2 bg-[#F7FAF8] border border-[#E2EAE5] rounded-xl text-xs min-h-[40px] focus:outline-none focus:border-[#176B45]"
                  />
                  <button
                    type="button"
                    onClick={() => setSpecs((prev) => prev.filter((_, i) => i !== idx))}
                    aria-label="Remove specification row"
                    className="p-2 text-[#7B8A80] hover:text-red-600 rounded-lg min-h-[40px] min-w-[40px] inline-flex items-center justify-center"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Publish & Featured Switches */}
        <div className="space-y-2.5 pt-1">
          <label className="flex items-center gap-2.5 text-xs sm:text-sm font-medium text-[#17231C] cursor-pointer min-h-[36px]">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-[#C7D8CD] accent-[#176B45]"
            />
            <span>Publish immediately (visible on public storefront)</span>
          </label>

          <label className="flex items-center gap-2.5 text-xs sm:text-sm font-medium text-[#17231C] cursor-pointer min-h-[36px]">
            <input
              type="checkbox"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
              className="h-4 w-4 rounded border-[#C7D8CD] accent-[#176B45]"
            />
            <span>Mark as Featured Product (promoted on storefront homepage rails)</span>
          </label>
        </div>

        {isSaving && uploadProgress && (
          <div className="p-3.5 bg-[#EAF5EE] border border-[#C6E5D2] rounded-xl space-y-2">
            <div className="flex items-center justify-between gap-2 text-xs font-semibold text-[#123D2A]">
              <span>{uploadProgress.label}</span>
              <span className="font-mono-num">
                {Math.min(
                  100,
                  Math.round((uploadProgress.completed / Math.max(1, uploadProgress.total)) * 100)
                )}
                %
              </span>
            </div>
            <div
              className="w-full h-2 bg-[#FFFFFF] rounded-full overflow-hidden border border-[#C6E5D2]"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={uploadProgress.total}
              aria-valuenow={uploadProgress.completed}
            >
              <div
                className="h-full bg-[#176B45] transition-all duration-200 rounded-full"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round((uploadProgress.completed / Math.max(1, uploadProgress.total)) * 100)
                  )}%`,
                }}
              />
            </div>
          </div>
        )}

        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={isOptimizing || isOptimizingGallery}
            isLoading={isSaving}
            fullWidth
            className="sm:w-auto"
            leftIcon={<Save className="w-4 h-4" aria-hidden="true" />}
          >
            {isSaving
              ? isEditMode
                ? 'Updating Product…'
                : 'Publishing Product…'
              : isEditMode
                ? 'Save Product Changes'
                : 'Save & Publish Product'}
          </Button>
        </div>
      </form>
    </div>
  );
};
