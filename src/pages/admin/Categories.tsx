import React, { useState, useEffect } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Save,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { compressImage } from '../../utils/imageOptimizer';
import { extractStorageObjectPath } from '../../utils/productService';
import { ProductImage } from '../../components/ProductImage';
import { useStoreData } from '../../context/StoreDataContext';
import { useToast } from '../../context/ToastContext';
import { Badge, BottomSheetModal, Button, Input, Skeleton } from '../../components/ui';

export interface CategoryRecord {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  is_active: boolean;
  created_at?: string;
}

export const AdminCategories: React.FC = () => {
  const { refreshStoreData } = useStoreData();
  const { showToast } = useToast();

  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [productCountsByCat, setProductCountsByCat] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Create/Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryRecord | null>(null);
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [optimizedBlob, setOptimizedBlob] = useState<Blob | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isCompressingImage, setIsCompressingImage] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl && imagePreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  // Delete Confirmation Modal
  const [deleteTarget, setDeleteTarget] = useState<CategoryRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadCategories = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [{ data, error }, { data: prodRows }] = await Promise.all([
        supabase.from('categories').select('*').order('name'),
        supabase.from('products').select('category_id'),
      ]);

      if (error) {
        setLoadError(error.message);
      } else {
        setCategories(data || []);
      }

      if (prodRows) {
        const counts: Record<string, number> = {};
        for (const p of prodRows) {
          if (p.category_id) {
            counts[p.category_id] = (counts[p.category_id] || 0) + 1;
          }
        }
        setProductCountsByCat(counts);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not fetch categories');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const openCreateModal = () => {
    if (imagePreviewUrl && imagePreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setEditingCategory(null);
    setFormName('');
    setFormSlug('');
    setFormIsActive(true);
    setSelectedImageFile(null);
    setOptimizedBlob(null);
    setImagePreviewUrl(null);
    setSubmitStatus(null);
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (cat: CategoryRecord) => {
    if (imagePreviewUrl && imagePreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormSlug(cat.slug);
    setFormIsActive(cat.is_active);
    setSelectedImageFile(null);
    setOptimizedBlob(null);
    setImagePreviewUrl(cat.image_url);
    setSubmitStatus(null);
    setFormError(null);
    setShowModal(true);
  };

  const handleNameChange = (val: string) => {
    setFormName(val);
    if (!editingCategory) {
      const generated = val
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      setFormSlug(generated);
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setFormError(null);
    setIsCompressingImage(true);
    try {
      const optimized = await compressImage(file, {
        maxDimension: 800,
        customSuffix: formSlug.trim() || 'category',
      });
      if (imagePreviewUrl && imagePreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
      setSelectedImageFile(file);
      setOptimizedBlob(optimized.blob);
      setImagePreviewUrl(URL.createObjectURL(optimized.blob));
    } catch (err) {
      setSelectedImageFile(null);
      setOptimizedBlob(null);
      setFormError(err instanceof Error ? err.message : 'Selected image could not be processed.');
    } finally {
      setIsCompressingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCompressingImage) {
      setFormError('Please wait for image optimization to finish.');
      return;
    }
    if (!formName.trim() || !formSlug.trim()) {
      setFormError('Category name and URL slug are required.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    let newlyUploadedPath: string | null = null;

    try {
      let finalImageUrl = editingCategory ? editingCategory.image_url : null;

      if (optimizedBlob) {
        setSubmitStatus('Uploading WebP category photo…');
        const storagePath = `categories/${formSlug.trim()}-${Date.now()}.webp`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(storagePath, optimizedBlob, {
            contentType: optimizedBlob.type || 'image/webp',
            cacheControl: '31536000',
            upsert: true,
          });

        if (uploadError) {
          throw new Error(`Failed to upload category image: ${uploadError.message}`);
        }

        newlyUploadedPath = storagePath;
        const { data: urlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(storagePath);
        finalImageUrl = urlData.publicUrl;
      }

      setSubmitStatus(editingCategory ? 'Updating category in Supabase…' : 'Saving new category…');

      if (editingCategory) {
        const { data: updatedCat, error } = await supabase
          .from('categories')
          .update({
            name: formName.trim(),
            slug: formSlug.trim(),
            image_url: finalImageUrl,
            is_active: formIsActive,
          })
          .eq('id', editingCategory.id)
          .select('id')
          .maybeSingle();

        if (error) {
          if (error.code === '23505') {
            throw new Error('A category with this slug already exists. Choose a unique slug.');
          }
          throw new Error(error.message);
        }
        if (!updatedCat) {
          throw new Error('This category was deleted or modified in another session. Please refresh.');
        }

        if (newlyUploadedPath && editingCategory.image_url) {
          const oldPath = extractStorageObjectPath(editingCategory.image_url);
          if (oldPath && oldPath !== newlyUploadedPath) {
            await supabase.storage.from('product-images').remove([oldPath]);
          }
        }

        showToast({ variant: 'success', title: `Updated category "${formName.trim()}"` });
      } else {
        const { error } = await supabase.from('categories').insert({
          name: formName.trim(),
          slug: formSlug.trim(),
          image_url: finalImageUrl,
          is_active: formIsActive,
        });

        if (error) {
          if (error.code === '23505') {
            throw new Error('A category with this slug already exists. Choose a unique slug.');
          }
          throw new Error(error.message);
        }

        showToast({ variant: 'success', title: `Created category "${formName.trim()}"` });
      }

      setShowModal(false);
      await loadCategories();
      await refreshStoreData();
    } catch (err) {
      if (newlyUploadedPath) {
        await supabase.storage.from('product-images').remove([newlyUploadedPath]);
      }
      const msg = err instanceof Error ? err.message : 'Failed to save category';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
      setSubmitStatus(null);
    }
  };

  const handleToggleActive = async (cat: CategoryRecord) => {
    const nextState = !cat.is_active;
    const { data, error } = await supabase
      .from('categories')
      .update({ is_active: nextState })
      .eq('id', cat.id)
      .select('id')
      .maybeSingle();

    if (error || !data) {
      showToast({
        variant: 'error',
        title: 'Could not update status',
        description: error?.message || 'Category not found; list refreshed.',
      });
      if (!data && !error) await loadCategories();
      return;
    }

    setCategories((prev) =>
      prev.map((c) => (c.id === cat.id ? { ...c, is_active: nextState } : c))
    );
    showToast({
      variant: 'success',
      title: `${cat.name} is now ${nextState ? 'Active' : 'Inactive'}`,
    });
    refreshStoreData();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);

    const { data, error } = await supabase
      .from('categories')
      .delete()
      .eq('id', deleteTarget.id)
      .select('id');
    setIsDeleting(false);

    if (error) {
      showToast({
        variant: 'error',
        title: 'Cannot delete category',
        description:
          error.code === '23503'
            ? 'Products are currently assigned to this category. Deactivate it instead or reassign products first.'
            : error.message,
      });
      setDeleteTarget(null);
      return;
    }

    if (!data || data.length === 0) {
      showToast({
        variant: 'info',
        title: 'Category already removed',
        description: 'Refreshing category list.',
      });
      setDeleteTarget(null);
      await loadCategories();
      return;
    }

    const deletedPath = deleteTarget.image_url
      ? extractStorageObjectPath(deleteTarget.image_url)
      : null;
    if (deletedPath) {
      await supabase.storage.from('product-images').remove([deletedPath]);
    }

    setCategories((prev) => prev.filter((c) => c.id !== deleteTarget.id));
    showToast({ variant: 'success', title: `Deleted category "${deleteTarget.name}"` });
    setDeleteTarget(null);
    refreshStoreData();
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#17231C] tracking-tight">
            Categories
          </h1>
          <p className="text-xs sm:text-sm text-[#5C6B62] mt-0.5">
            Create and manage customer-facing store departments in Supabase.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={openCreateModal}
          className="w-full sm:w-auto"
          leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
        >
          Add New Category
        </Button>
      </div>

      {loadError && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{loadError}</span>
        </div>
      )}

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && categories.length === 0 && !loadError && (
        <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2EAE5] p-8 text-center space-y-3">
          <p className="text-sm font-bold text-[#17231C]">No categories created yet</p>
          <p className="text-xs text-[#5C6B62] max-w-md mx-auto">
            Create your first category (e.g., Car Parts, Toy Cars, Other Products) so you can assign new products to it.
          </p>
          <div className="pt-1">
            <Button variant="primary" onClick={openCreateModal} leftIcon={<Plus className="w-4 h-4" />}>
              Create First Category
            </Button>
          </div>
        </div>
      )}

      {/* MOBILE CATEGORY CARDS (< lg) */}
      {!isLoading && categories.length > 0 && (
        <div className="block lg:hidden space-y-3">
          {categories.map((cat) => (
            <div
              key={cat.id || cat.slug}
              className="bg-[#FFFFFF] rounded-2xl border border-[#E2EAE5] shadow-xs p-3.5 space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-[#F7FAF8] overflow-hidden border border-[#E2EAE5] shrink-0">
                  <ProductImage
                    src={cat.image_url || ''}
                    alt={cat.name}
                    aspectClassName="aspect-square"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-[#17231C] text-sm truncate">{cat.name}</h3>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(cat)}
                      className="dex-press"
                      title="Toggle active visibility"
                    >
                      <Badge variant={cat.is_active ? 'success' : 'neutral'} dot>
                        {cat.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-[#5C6B62]">
                    <span className="font-mono-num">/{cat.slug}</span>
                    <span aria-hidden="true">·</span>
                    <span>{productCountsByCat[cat.id] || 0} products</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2.5 border-t border-[#E2EAE5]">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 min-h-[40px]"
                  onClick={() => openEditModal(cat)}
                  leftIcon={<Pencil className="h-3.5 w-3.5" aria-hidden="true" />}
                >
                  Edit
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  className="min-h-[40px]"
                  onClick={() => setDeleteTarget(cat)}
                  leftIcon={<Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DESKTOP TABLE (lg+) */}
      {!isLoading && categories.length > 0 && (
        <div className="hidden lg:block overflow-hidden rounded-2xl border border-[#E2EAE5] bg-[#FFFFFF] shadow-xs">
          <table className="min-w-full divide-y divide-[#E2EAE5]">
            <thead className="bg-[#F7FAF8]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-[#5C6B62] uppercase tracking-wider">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-[#5C6B62] uppercase tracking-wider">
                  Slug
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-[#5C6B62] uppercase tracking-wider">
                  Products
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-[#5C6B62] uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold text-[#5C6B62] uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2EAE5]">
              {categories.map((cat) => (
                <tr key={cat.id || cat.slug} className="hover:bg-[#F7FAF8]/70 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl overflow-hidden bg-[#F7FAF8] border border-[#E2EAE5] shrink-0">
                        <ProductImage
                          src={cat.image_url || ''}
                          alt={cat.name}
                          aspectClassName="aspect-square"
                        />
                      </div>
                      <span className="text-sm font-semibold text-[#17231C]">{cat.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#5C6B62] font-mono-num">
                    /{cat.slug}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#5C6B62] font-mono-num font-semibold">
                    {productCountsByCat[cat.id] || 0}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(cat)}
                      className="dex-press"
                      title="Click to toggle status"
                    >
                      <Badge variant={cat.is_active ? 'success' : 'neutral'} dot>
                        {cat.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditModal(cat)}
                        className="p-2 text-[#5C6B62] hover:text-[#176B45] hover:bg-[#EAF5EE] rounded-lg transition-colors"
                        title="Edit category"
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(cat)}
                        className="p-2 text-[#7B8A80] hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete category"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE / EDIT MODAL SHEET */}
      <BottomSheetModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingCategory ? 'Edit Category' : 'Create Category'}
        subtitle={editingCategory ? `Editing /${editingCategory.slug}` : 'Department appears on storefront & product form'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div
              role="alert"
              className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{formError}</span>
            </div>
          )}

          <Input
            label="Category Name"
            required
            requiredMark
            value={formName}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. Car Parts"
          />

          <Input
            label="URL Slug"
            required
            requiredMark
            value={formSlug}
            onChange={(e) => setFormSlug(e.target.value)}
            placeholder="e.g. car-parts"
            className="font-mono-num"
          />

          {/* Image Upload */}
          <div className="space-y-1.5">
            <label className="block text-xs sm:text-sm font-semibold text-[#17231C]">
              Category Image
            </label>
            <div className="flex items-center gap-3 p-3 bg-[#F7FAF8] border border-[#E2EAE5] rounded-xl">
              <div className="w-16 h-16 rounded-xl bg-[#FFFFFF] border border-[#E2EAE5] overflow-hidden shrink-0 flex items-center justify-center">
                {imagePreviewUrl ? (
                  <img
                    src={imagePreviewUrl}
                    alt="Category preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon className="w-6 h-6 text-[#7B8A80]" aria-hidden="true" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="text-xs text-[#5C6B62] w-full file:mr-2.5 file:py-2 file:px-3 file:rounded-xl file:border file:border-[#C6E5D2] file:text-xs file:font-semibold file:bg-[#EAF5EE] file:text-[#123D2A] hover:file:bg-[#D9F0E2] cursor-pointer"
                />
                <p className="text-[11px] text-[#7B8A80] mt-1">
                  {isCompressingImage
                    ? 'Optimizing image to fast WebP…'
                    : selectedImageFile && optimizedBlob
                    ? `Ready: ${selectedImageFile.name} (${(optimizedBlob.size / 1024).toFixed(1)} KB WebP)`
                    : 'Automatically converted to fast WebP and stored securely.'}
                </p>
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2.5 text-xs sm:text-sm font-medium text-[#17231C] cursor-pointer min-h-[36px]">
            <input
              type="checkbox"
              checked={formIsActive}
              onChange={(e) => setFormIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-[#C7D8CD] accent-[#176B45]"
            />
            <span>Active (visible on public storefront &amp; product form)</span>
          </label>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-3 border-t border-[#E2EAE5]">
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isCompressingImage}
              isLoading={isSubmitting}
              leftIcon={<Save className="w-4 h-4" aria-hidden="true" />}
            >
              {isSubmitting && submitStatus
                ? submitStatus
                : editingCategory
                ? 'Update Category'
                : 'Save Category'}
            </Button>
          </div>
        </form>
      </BottomSheetModal>

      {/* DELETE CONFIRMATION MODAL */}
      <BottomSheetModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete Category?"
        subtitle={deleteTarget?.name}
      >
        <div className="space-y-4">
          <p className="text-xs sm:text-sm text-[#5C6B62] leading-relaxed">
            Are you sure you want to delete <strong className="text-[#17231C]">{deleteTarget?.name}</strong>?
            {(productCountsByCat[deleteTarget?.id || ''] || 0) > 0 &&
              ' Note: Products currently assigned to this category may prevent permanent deletion — consider deactivating it instead.'}
          </p>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" isLoading={isDeleting} onClick={confirmDelete}>
              Delete Category
            </Button>
          </div>
        </div>
      </BottomSheetModal>
    </div>
  );
};
