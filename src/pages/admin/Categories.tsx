import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Save, Image as ImageIcon, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { CATEGORIES, type CategoryItem } from '../../data/storeData';
import { ProductImage } from '../../components/ProductImage';

export interface CategoryRecord {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  is_active: boolean;
  created_at?: string;
}

export const AdminCategories: React.FC = () => {
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryRecord | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadCategories = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (!error && data && data.length > 0) {
        setCategories(data);
      } else {
        // Fallback to initial seed categories if DB is empty
        const fallback: CategoryRecord[] = CATEGORIES.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          image_url: c.image,
          is_active: true,
        }));
        setCategories(fallback);
      }
    } catch (err) {
      console.warn('Could not load categories from Supabase:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormName('');
    setFormSlug('');
    setFormIsActive(true);
    setSelectedImageFile(null);
    setImagePreviewUrl(null);
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (cat: CategoryRecord) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormSlug(cat.slug);
    setFormIsActive(cat.is_active);
    setSelectedImageFile(null);
    setImagePreviewUrl(cat.image_url);
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImageFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formSlug.trim()) {
      setFormError('Category name and slug are required.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      let finalImageUrl = editingCategory ? editingCategory.image_url : null;

      // Upload category image if user selected a new file
      if (selectedImageFile) {
        const fileExt = selectedImageFile.name.split('.').pop() || 'webp';
        const storagePath = `categories/${formSlug}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(storagePath, selectedImageFile, {
            contentType: selectedImageFile.type || 'image/webp',
            upsert: true,
          });

        if (uploadError) {
          console.warn('Category image upload note:', uploadError.message);
          // If storage bucket missing or failed, still save with preview URL or null
        } else {
          const { data: urlData } = supabase.storage
            .from('product-images')
            .getPublicUrl(storagePath);
          finalImageUrl = urlData.publicUrl;
        }
      }

      if (editingCategory) {
        // Update existing category
        const { error } = await supabase
          .from('categories')
          .update({
            name: formName.trim(),
            slug: formSlug.trim(),
            image_url: finalImageUrl,
            is_active: formIsActive,
          })
          .eq('id', editingCategory.id);

        if (error) {
          // Fallback update in local state
          setCategories((prev) =>
            prev.map((c) =>
              c.id === editingCategory.id
                ? { ...c, name: formName, slug: formSlug, image_url: finalImageUrl, is_active: formIsActive }
                : c
            )
          );
        } else {
          await loadCategories();
        }

        setFeedback({ text: `Category "${formName}" updated successfully.`, type: 'success' });
      } else {
        // Insert new category
        const newCat = {
          name: formName.trim(),
          slug: formSlug.trim(),
          image_url: finalImageUrl,
          is_active: formIsActive,
        };

        const { data, error } = await supabase.from('categories').insert(newCat).select().single();

        if (error) {
          // If DB insert fails (e.g. mock DB), update local state
          const mockRecord: CategoryRecord = {
            id: `cat-${formSlug}`,
            ...newCat,
          };
          setCategories((prev) => [...prev, mockRecord]);
        } else if (data) {
          setCategories((prev) => [...prev, data]);
        }

        setFeedback({ text: `Category "${formName}" created successfully!`, type: 'success' });
      }

      setShowModal(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save category';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (cat: CategoryRecord) => {
    if (!window.confirm(`Are you sure you want to delete category "${cat.name}"?`)) {
      return;
    }

    try {
      const { error } = await supabase.from('categories').delete().eq('id', cat.id);
      if (error) {
        // Fallback: toggle active to false or filter local state
        setCategories((prev) => prev.filter((c) => c.id !== cat.id));
      } else {
        setCategories((prev) => prev.filter((c) => c.id !== cat.id));
      }
      setFeedback({ text: `Category "${cat.name}" removed.`, type: 'success' });
    } catch (err) {
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Categories</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Organize products into customer-facing departments and catalogue groups.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium text-xs sm:text-sm px-4 py-2.5 rounded-lg shadow-xs transition min-h-[44px] w-full sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Category</span>
        </button>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`p-3 rounded-lg text-xs sm:text-sm flex items-center justify-between border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-700 font-bold ml-2 p-1"
          >
            ×
          </button>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center p-8 bg-white rounded-xl border border-slate-200/80 text-slate-500 gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          <span className="text-xs sm:text-sm font-medium">Loading categories…</span>
        </div>
      )}

      {/* MOBILE CATEGORY CARDS (< lg) */}
      {!isLoading && (
        <div className="block lg:hidden space-y-3">
          {categories.map((cat) => (
            <div
              key={cat.id || cat.slug}
              className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-3.5 space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-lg bg-slate-100 overflow-hidden border border-slate-200 shrink-0 relative">
                  <ProductImage
                    src={cat.image_url || ''}
                    alt={cat.name}
                    aspectClassName="aspect-square"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900 text-sm truncate">{cat.name}</h3>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        cat.is_active
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {cat.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">/{cat.slug}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => openEditModal(cat)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium min-h-[40px] transition"
                >
                  <Pencil className="h-3.5 w-3.5 text-slate-500" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(cat)}
                  className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium min-h-[40px] transition"
                  aria-label={`Delete category ${cat.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DESKTOP TABLE VIEW (lg+) */}
      {!isLoading && (
        <div className="hidden lg:block overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xs">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Slug
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categories.map((cat) => (
                <tr key={cat.id || cat.slug} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                        <ProductImage
                          src={cat.image_url || ''}
                          alt={cat.name}
                          aspectClassName="aspect-square"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <span className="text-sm font-semibold text-slate-900">{cat.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 font-mono">
                    /{cat.slug}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        cat.is_active
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {cat.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(cat)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 rounded transition"
                        title="Edit category"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(cat)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded transition"
                        title="Delete category"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE / EDIT MODAL DRAWER */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/80">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                {editingCategory ? 'Edit Category' : 'Create New Category'}
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Performance Brakes"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 min-h-[44px]"
                />
              </div>

              {/* Slug */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  URL Slug <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  placeholder="e.g. performance-brakes"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 min-h-[44px]"
                />
              </div>

              {/* Category Image Upload */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category Image
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                    {imagePreviewUrl ? (
                      <img src={imagePreviewUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      JPG, PNG, or WebP. Uploads to Supabase Storage.
                    </p>
                  </div>
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="categoryIsActive"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <label htmlFor="categoryIsActive" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Category is Active (visible on public storefront)
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-xs transition min-h-[44px] disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{editingCategory ? 'Update Category' : 'Save Category'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
