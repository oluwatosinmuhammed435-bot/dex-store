import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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

  // Image optimization state
  const [rawImageFile, setRawImageFile] = useState<File | null>(null);
  const [optimizedPackage, setOptimizedPackage] = useState<ResponsiveImagePackage | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationError, setOptimizationError] = useState<string | null>(null);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isOptimizing) {
      alert('Please wait for image optimization to complete before saving.');
      return;
    }

    // Structured payload ready for Phase 3 Supabase Storage and database persistence
    const productPayload = {
      name,
      description,
      priceNgn: Number(price),
      category,
      stock: Number(stock),
      featured,
      rawImage: rawImageFile ? { name: rawImageFile.name, size: rawImageFile.size } : null,
      optimizedVariants: optimizedPackage
        ? {
          thumbnail: {
            fileName: optimizedPackage.thumbnail.file.name,
            sizeBytes: optimizedPackage.thumbnail.sizeBytes,
            dimensions: `${optimizedPackage.thumbnail.width}x${optimizedPackage.thumbnail.height}`,
          },
          card: {
            fileName: optimizedPackage.card.file.name,
            sizeBytes: optimizedPackage.card.sizeBytes,
            dimensions: `${optimizedPackage.card.width}x${optimizedPackage.card.height}`,
          },
          detail: {
            fileName: optimizedPackage.detail.file.name,
            sizeBytes: optimizedPackage.detail.sizeBytes,
            dimensions: `${optimizedPackage.detail.width}x${optimizedPackage.detail.height}`,
          },
          full: {
            fileName: optimizedPackage.full.file.name,
            sizeBytes: optimizedPackage.full.sizeBytes,
            dimensions: `${optimizedPackage.full.width}x${optimizedPackage.full.height}`,
          },
        }
        : null,
    };

    console.log('Product Form Submitted with Optimized Images:', productPayload);
    alert('Product and optimized responsive image variants prepared successfully! (Local state prototype).');
    navigate('/admin/products');
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header className="flex items-center gap-4">
        <Link to="/admin/products" className="p-2 rounded-full hover:bg-[#E6F4E9] transition">
          <ArrowLeft className="h-5 w-5 text-[#202923]" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#202923]">Add New Product</h1>
          <p className="text-sm text-[#69746D]">Configure product details with automatic WebP image compression</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm border border-[#E0E0E0] space-y-5">
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
            {CATEGORIES.map(cat => (
              <option key={cat.slug} value={cat.name}>{cat.name}</option>
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

          {/* Error Message */}
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
        <div className="flex items-center gap-2">
          <input
            id="featured"
            type="checkbox"
            checked={featured}
            onChange={e => setFeatured(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-[#123D2A] focus:ring-[#123D2A]"
          />
          <label htmlFor="featured" className="text-sm text-[#202923]">Mark as Featured Product</label>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isOptimizing}
          className="flex items-center gap-2 bg-[#123D2A] text-white px-5 py-2.5 rounded-md hover:bg-[#0f2e1e] transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="h-4 w-4" /> Save Product
        </button>
      </form>
    </div>
  );
};
