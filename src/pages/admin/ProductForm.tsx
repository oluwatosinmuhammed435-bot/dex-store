import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { CATEGORIES } from '../../data/storeData';
import {
  generateResponsiveImageVariants,
  ResponsiveImagePackage,
} from '../../utils/imageOptimizer';
import { Save, ArrowLeft, Loader2, CheckCircle2, AlertCircle, Image as ImageIcon, X } from 'lucide-react';

export const AdminProductForm: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [stock, setStock] = useState('');
  const [featured, setFeatured] = useState(false);

  // Categories fetched from Supabase with fallback to static CATEGORIES
  const [categoriesList, setCategoriesList] = useState<Array<{ id?: string; name: string; slug: string }>>(CATEGORIES);

  // Image optimization state
  const [rawImageFile, setRawImageFile] = useState<File | null>(null);
  const [optimizedPackage, setOptimizedPackage] = useState<ResponsiveImagePackage | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationError, setOptimizationError] = useState<string | null>(null);

  // Form submission state
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Fetch live categories from Supabase on mount
  useEffect(() => {
    let isMounted = true;
    async function fetchCategories() {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('id, name, slug')
          .eq('is_active', true)
          .order('name');
        if (!error && data && data.length > 0 && isMounted) {
          setCategoriesList(data);
        }
      } catch (err) {
        console.warn('Could not load categories from Supabase, using defaults:', err);
      }
    }
    fetchCategories();
    return () => {
      isMounted = false;
    };
  }, []);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset previous states
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setRawImageFile(file);
    setOptimizedPackage(null);
    setOptimizationError(null);
    setSaveError(null);
    setIsOptimizing(true);

    try {
      // Run Phase 1 image optimization pipeline (WebP conversion + 4 variants)
      const imagePackage = await generateResponsiveImageVariants(file);
      setOptimizedPackage(imagePackage);

      // Create preview from the card variant
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

  const handleRemoveImage = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setRawImageFile(null);
    setOptimizedPackage(null);
    setPreviewUrl(null);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);

    if (isOptimizing) {
      setSaveError('Please wait for image optimization to complete before saving.');
      return;
    }

    if (!optimizedPackage || !rawImageFile) {
      setSaveError('Please upload a product image.');
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      setSaveError('Product name is required.');
      return;
    }

    const parsedPrice = Number(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setSaveError('Please enter a valid price (greater than or equal to 0).');
      return;
    }

    const parsedStock = Number(stock);
    if (isNaN(parsedStock) || parsedStock < 0 || !Number.isInteger(parsedStock)) {
      setSaveError('Please enter a valid non-negative integer for stock quantity.');
      return;
    }

    if (!category) {
      setSaveError('Please select a product category.');
      return;
    }

    setIsSaving(true);
    const uploadedPaths: string[] = [];

    try {
      const productSlug = generateSlug(trimmedName);
      const productRef = generateReference(trimmedName);
      const storageBase = `products/${productSlug}-${Date.now()}`;

      // 1. Upload the 4 responsive WebP variants to product-images Storage bucket
      const variantsToUpload = [
        { key: 'thumbnail', variant: optimizedPackage.thumbnail, suffix: 'thumb' },
        { key: 'card', variant: optimizedPackage.card, suffix: 'card' },
        { key: 'detail', variant: optimizedPackage.detail, suffix: 'detail' },
        { key: 'full', variant: optimizedPackage.full, suffix: 'full' },
      ];

      const variantPublicUrls: Record<string, string> = {};

      for (const item of variantsToUpload) {
        const filePath = `${storageBase}/${item.suffix}.webp`;
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, item.variant.blob, {
            contentType: 'image/webp',
            cacheControl: '31536000',
            upsert: true,
          });

        if (uploadError) {
          throw new Error(`Failed to upload ${item.key} image variant: ${uploadError.message}`);
        }

        uploadedPaths.push(filePath);

        const { data: urlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);

        variantPublicUrls[item.key] = urlData.publicUrl;
      }

      // Build string array of image URLs conforming to live database text[] column
      const galleryUrls: string[] = [
        variantPublicUrls.full,
        variantPublicUrls.detail,
        variantPublicUrls.card,
        variantPublicUrls.thumbnail,
      ].filter(Boolean);

      // Resolve category UUID if one exists
      const selectedCategory = categoriesList.find(c => c.id === category || c.name === category || c.slug === category);
      const isValidUuid = selectedCategory?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(selectedCategory.id);
      const categoryId = isValidUuid ? selectedCategory!.id : null;

      // 2. Insert product record into Supabase public.products matching LIVE database columns
      const productRow = {
        name: trimmedName,
        slug: productSlug,
        reference: productRef,
        category_id: categoryId,
        price_ngn: parsedPrice,
        stock_quantity: parsedStock,
        availability: parsedStock > 0 ? 'In Stock' : 'Out of Stock',
        featured: featured,
        description: description.trim() || null,
        image_url: variantPublicUrls.card || variantPublicUrls.full || null,
        gallery: galleryUrls,
        specifications: {},
        is_active: true,
      };

      const { error: insertError } = await supabase
        .from('products')
        .insert(productRow);

      if (insertError) {
        // Safe cleanup: remove uploaded images to prevent orphaned storage objects
        if (uploadedPaths.length > 0) {
          try {
            await supabase.storage.from('product-images').remove(uploadedPaths);
          } catch (cleanupErr) {
            console.warn('Failed to clean up uploaded images after insert failure:', cleanupErr);
          }
        }
        throw new Error(`Database error saving product: ${insertError.message}`);
      }

      // 3. Successful creation — redirect to Admin Products list
      navigate('/admin/products');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred while saving the product.';
      setSaveError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
      <header className="flex items-center gap-3">
        <Link
          to="/admin/products"
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
          aria-label="Back to Products"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Add New Product</h1>
          <p className="text-xs sm:text-sm text-slate-500">Configure product details with automatic WebP image compression</p>
        </div>
      </header>

      {/* Global Save Error Banner */}
      {saveError && (
        <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs sm:text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Failed to Save Product</p>
            <p className="text-xs text-red-600 mt-0.5">{saveError}</p>
            {saveError.includes('Bucket not found') && (
              <p className="text-xs text-red-700 mt-2 p-2 bg-red-100/70 rounded border border-red-200 font-medium">
                Note: In your Supabase Dashboard &gt; Storage, please create a public bucket named <code className="font-mono font-bold bg-white px-1 py-0.5 rounded">product-images</code>.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setSaveError(null)}
            className="text-red-400 hover:text-red-700 p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-4 sm:p-6 rounded-xl shadow-xs border border-slate-200/80 space-y-4 sm:space-y-5">
        {/* Product Name */}
        <div>
          <label className="block text-sm font-medium text-[#202923] mb-1">Product Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Toyota Corolla Projector Headlamp"
            className="w-full border rounded-md p-2.5 focus:outline-none focus:ring-2 focus:ring-[#123D2A] text-sm"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-[#202923] mb-1">Description</label>
          <textarea
            required
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={4}
            placeholder="Detailed specifications, compatibility and features…"
            className="w-full border rounded-md p-2.5 focus:outline-none focus:ring-2 focus:ring-[#123D2A] text-sm"
          />
        </div>

        {/* Price and Stock */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#202923] mb-1">Price (₦)</label>
            <input
              type="number"
              required
              min="0"
              step="any"
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="e.g. 185000"
              className="w-full border rounded-md p-2.5 focus:outline-none focus:ring-2 focus:ring-[#123D2A] text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#202923] mb-1">Stock Quantity</label>
            <input
              type="number"
              required
              min="0"
              step="1"
              value={stock}
              onChange={e => setStock(e.target.value)}
              placeholder="e.g. 25"
              className="w-full border rounded-md p-2.5 focus:outline-none focus:ring-2 focus:ring-[#123D2A] text-sm"
            />
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-[#202923] mb-1">Category</label>
          <select
            required
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full border rounded-md p-2.5 focus:outline-none focus:ring-2 focus:ring-[#123D2A] text-sm"
          >
            <option value="">Select category…</option>
            {categoriesList.map(cat => (
              <option key={cat.id || cat.slug} value={cat.id || cat.name}>{cat.name}</option>
            ))}
          </select>
        </div>

        {/* Phase 2: Enhanced Product Image Upload & Compression Section */}
        <div className="pt-2 pb-2 border-t border-b border-[#E0E0E0] space-y-3">
          <label className="block text-sm font-medium text-[#202923]">
            Product Image &amp; Automatic WebP Optimization
          </label>

          {!previewUrl && !isOptimizing && (
            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-[#B8DCC5] rounded-lg bg-[#F8FAF8] hover:bg-[#EAF3EC] transition-colors cursor-pointer relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                aria-label="Upload product image"
              />
              <ImageIcon className="w-10 h-10 text-[#176B45] mb-2" />
              <p className="text-sm font-semibold text-[#123D2A]">Click or drag image to upload</p>
              <p className="text-xs text-[#69746D] mt-1">
                Supports JPG, PNG, WebP. Automatically converts to WebP and creates 4 responsive sizes.
              </p>
            </div>
          )}

          {/* Loading / Optimizing State */}
          {isOptimizing && (
            <div className="flex items-center justify-center gap-3 p-6 bg-[#F8FAF8] border border-[#B8DCC5] rounded-lg text-[#123D2A]">
              <Loader2 className="w-5 h-5 animate-spin text-[#176B45]" />
              <div className="text-sm">
                <span className="font-semibold">Optimizing Image…</span>
                <span className="block text-xs text-[#69746D]">
                  Resizing and generating WebP variants (Thumbnail, Card, Detail, Master)…
                </span>
              </div>
            </div>
          )}

          {/* Image Optimization Error Message */}
          {optimizationError && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">Image Optimization Failed</p>
                <p className="text-xs">{optimizationError}</p>
              </div>
              <button
                type="button"
                onClick={() => setOptimizationError(null)}
                className="text-red-500 hover:text-red-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Preview & Variant Breakdown */}
          {previewUrl && optimizedPackage && !isOptimizing && (
            <div className="space-y-4 bg-[#F8FAF8] p-4 rounded-lg border border-[#E0E0E0]">
              <div className="flex items-start gap-4">
                <div className="relative group shrink-0">
                  <img
                    src={previewUrl}
                    alt="Optimized preview"
                    className="w-28 h-28 object-cover rounded-lg border border-[#B8DCC5] shadow-sm bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    title="Remove image"
                    className="absolute -top-2 -right-2 bg-red-600 text-white p-1 rounded-full shadow hover:bg-red-700 transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-green-700 font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Optimized &amp; Ready for Storage</span>
                  </div>
                  <p className="text-xs text-[#202923] font-medium truncate">
                    {optimizedPackage.originalFileName}
                  </p>
                  <p className="text-xs text-[#69746D]">
                    Original: {formatBytes(optimizedPackage.originalSizeBytes)} ({optimizedPackage.originalDimensions.width}×{optimizedPackage.originalDimensions.height}px)
                  </p>
                  <p className="text-xs font-semibold text-[#123D2A]">
                    Card Variant: {formatBytes(optimizedPackage.card.sizeBytes)} ({optimizedPackage.card.width}×{optimizedPackage.card.height}px) —{' '}
                    <span className="text-green-700">
                      {Math.max(
                        0,
                        Math.round(
                          (1 - optimizedPackage.card.sizeBytes / optimizedPackage.originalSizeBytes) * 100
                        )
                      )}
                      % bandwidth reduction
                    </span>
                  </p>
                </div>
              </div>

              {/* 4 Responsive Variants Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#E0E0E0] text-[11px]">
                <div className="p-2 bg-white rounded border border-[#E5EBE6]">
                  <span className="font-semibold text-[#123D2A] block">1. Thumbnail (200px)</span>
                  <span className="text-[#69746D]">{optimizedPackage.thumbnail.width}×{optimizedPackage.thumbnail.height}px</span>
                  <span className="block font-mono text-[#0E3021]">{formatBytes(optimizedPackage.thumbnail.sizeBytes)}</span>
                </div>
                <div className="p-2 bg-white rounded border border-[#176B45]">
                  <span className="font-semibold text-[#176B45] block">2. Card (400px)</span>
                  <span className="text-[#69746D]">{optimizedPackage.card.width}×{optimizedPackage.card.height}px</span>
                  <span className="block font-mono text-[#0E3021]">{formatBytes(optimizedPackage.card.sizeBytes)}</span>
                </div>
                <div className="p-2 bg-white rounded border border-[#E5EBE6]">
                  <span className="font-semibold text-[#123D2A] block">3. Detail (800px)</span>
                  <span className="text-[#69746D]">{optimizedPackage.detail.width}×{optimizedPackage.detail.height}px</span>
                  <span className="block font-mono text-[#0E3021]">{formatBytes(optimizedPackage.detail.sizeBytes)}</span>
                </div>
                <div className="p-2 bg-white rounded border border-[#E5EBE6]">
                  <span className="font-semibold text-[#123D2A] block">4. Full (1200px)</span>
                  <span className="text-[#69746D]">{optimizedPackage.full.width}×{optimizedPackage.full.height}px</span>
                  <span className="block font-mono text-[#0E3021]">{formatBytes(optimizedPackage.full.sizeBytes)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Featured toggle */}
        <div className="flex items-center gap-2.5 py-1">
          <input
            id="featured"
            type="checkbox"
            checked={featured}
            onChange={e => setFeatured(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="featured" className="text-xs sm:text-sm font-medium text-slate-700 cursor-pointer">
            Mark as Featured Product (promoted on storefront rails)
          </label>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isOptimizing || isSaving}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-5 py-3 rounded-lg transition text-xs sm:text-sm font-semibold shadow-xs disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] w-full sm:w-auto"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving Product…
            </>
          ) : (
            <>
              <Save className="h-4 w-4" /> Save Product
            </>
          )}
        </button>
      </form>
    </div>
  );
};
