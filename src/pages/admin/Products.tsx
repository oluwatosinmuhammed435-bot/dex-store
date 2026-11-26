import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Pencil,
  Trash2,
  Search,
  Plus,
  ExternalLink,
  SlidersHorizontal,
  Eye,
  EyeOff,
} from 'lucide-react';
import { type AvailabilityStatus, type Product } from '../../data/storeData';
import { formatNaira } from '../../utils/catalogue';
import {
  fetchAdminProductsList,
  deleteProductRecord,
  updateProductRecord,
  fetchStorefrontCategories,
} from '../../utils/productService';
import { ProductImage } from '../../components/ProductImage';
import { useStoreData } from '../../context/StoreDataContext';
import { useToast } from '../../context/ToastContext';
import {
  Badge,
  BottomSheetModal,
  Button,
  Input,
  Select,
  Skeleton,
  getAvailabilityBadgeVariant,
} from '../../components/ui';

type StatusTab = 'all' | 'published' | 'drafts';

export const AdminProducts: React.FC = () => {
  const { refreshStoreData } = useStoreData();
  const { showToast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [hasLiveProducts, setHasLiveProducts] = useState(false);
  const [categoriesList, setCategoriesList] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusTab, setStatusTab] = useState<StatusTab>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Quick-Edit Bottom Sheet state
  const [quickEditProduct, setQuickEditProduct] = useState<Product | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editStock, setEditStock] = useState('');
  const [editAvailability, setEditAvailability] = useState<AvailabilityStatus>('In Stock');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editFeatured, setEditFeatured] = useState(false);
  const [isSavingQuickEdit, setIsSavingQuickEdit] = useState(false);

  // Delete confirmation Bottom Sheet state
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const [{ liveProducts, allProducts }, catRes] = await Promise.all([
        fetchAdminProductsList(),
        fetchStorefrontCategories(),
      ]);
      setHasLiveProducts(liveProducts.length > 0);
      setProducts(allProducts);
      setCategoriesList(catRes.hasLiveCategories ? catRes.categories : []);
    } catch (err) {
      console.warn('Error loading admin products:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const openQuickEdit = (product: Product) => {
    setQuickEditProduct(product);
    setEditPrice(String(product.priceNgn));
    setEditStock(String(product.stockQuantity ?? 0));
    setEditAvailability(product.availability);
    setEditIsActive(product.isActive !== false);
    setEditFeatured(product.featured);
  };

  const handleSaveQuickEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickEditProduct) return;

    const parsedPrice = Number(editPrice);
    const parsedStock = Number(editStock);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      showToast({ variant: 'error', title: 'Invalid price', description: 'Enter a non-negative Naira amount.' });
      return;
    }
    if (isNaN(parsedStock) || parsedStock < 0 || !Number.isInteger(parsedStock)) {
      showToast({ variant: 'error', title: 'Invalid stock count', description: 'Enter a whole number ≥ 0.' });
      return;
    }

    if (quickEditProduct.isSample) {
      showToast({
        variant: 'info',
        title: 'Sample preview item',
        description: 'Create a real product to persist changes to Supabase.',
      });
      setQuickEditProduct(null);
      return;
    }

    setIsSavingQuickEdit(true);
    const res = await updateProductRecord(
      quickEditProduct.id,
      {
        price_ngn: parsedPrice,
        stock_quantity: parsedStock,
        availability: editAvailability,
        is_active: editIsActive,
        featured: editFeatured,
      },
      quickEditProduct.updatedAt
    );
    setIsSavingQuickEdit(false);

    if (!res.success) {
      showToast({ variant: 'error', title: 'Failed to update product', description: res.error });
      if (res.conflict) {
        await loadProducts();
        setQuickEditProduct(null);
      }
      return;
    }

    setProducts((prev) =>
      prev.map((p) =>
        p.id === quickEditProduct.id
          ? {
            ...p,
            priceNgn: parsedPrice,
            stockQuantity: parsedStock,
            availability: editAvailability,
            isActive: editIsActive,
            featured: editFeatured,
            updatedAt: res.updatedAt ?? p.updatedAt,
          }
          : p
      )
    );
    showToast({
      variant: 'success',
      title: `Updated "${quickEditProduct.name}"`,
      description: `${formatNaira(parsedPrice)} · ${editIsActive ? 'Published' : 'Unpublished'}`,
    });
    setQuickEditProduct(null);
    refreshStoreData();
  };

  const handleTogglePublished = async (product: Product) => {
    if (product.isSample) {
      showToast({
        variant: 'info',
        title: 'Sample catalogue item',
        description: 'Publish toggle applies to live database products.',
      });
      return;
    }

    const nextActive = product.isActive === false;
    const res = await updateProductRecord(
      product.id,
      { is_active: nextActive },
      product.updatedAt
    );
    if (!res.success) {
      showToast({ variant: 'error', title: 'Could not update visibility', description: res.error });
      if (res.conflict) {
        await loadProducts();
      }
      return;
    }

    setProducts((prev) =>
      prev.map((p) =>
        p.id === product.id
          ? { ...p, isActive: nextActive, updatedAt: res.updatedAt ?? p.updatedAt }
          : p
      )
    );
    showToast({
      variant: 'success',
      title: nextActive ? `Published "${product.name}"` : `Unpublished "${product.name}"`,
      description: nextActive ? 'Visible on the public storefront.' : 'Hidden from public storefront.',
    });
    refreshStoreData();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.isSample) {
      setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      showToast({ variant: 'info', title: `Removed sample item from view` });
      setDeleteTarget(null);
      return;
    }

    setIsDeleting(true);
    const urls = [deleteTarget.image, ...deleteTarget.gallery.map((g) => g.url)].filter(Boolean);
    const res = await deleteProductRecord(deleteTarget.id, urls);
    setIsDeleting(false);

    if (!res.success) {
      showToast({ variant: 'error', title: 'Failed to delete product', description: res.error });
      return;
    }

    setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
    showToast({ variant: 'success', title: `Deleted "${deleteTarget.name}"` });
    setDeleteTarget(null);
    refreshStoreData();
  };

  const filtered = products.filter((p) => {
    const query = search.toLowerCase().trim();
    const matchesSearch =
      !query ||
      p.name.toLowerCase().includes(query) ||
      p.reference?.toLowerCase().includes(query) ||
      p.category?.toLowerCase().includes(query);

    const matchesCategory = categoryFilter ? p.category === categoryFilter : true;

    const isPublished = p.isActive !== false;
    const matchesStatus =
      statusTab === 'all' ||
      (statusTab === 'published' && isPublished) ||
      (statusTab === 'drafts' && !isPublished);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#17231C] tracking-tight">
              Products
            </h1>
            <Badge variant={hasLiveProducts ? 'success' : 'neutral'} dot>
              {hasLiveProducts ? `${products.length} Live` : '0 Live Products'}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-[#5C6B62] mt-0.5">
            Create, edit prices, manage stock, publish/unpublish, or remove products.
          </p>
        </div>

        <Link
          to="/admin/products/new"
          className="inline-flex items-center justify-center gap-2 bg-[#176B45] hover:bg-[#123D2A] text-[#FFFFFF] font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-xs min-h-[44px] w-full sm:w-auto dex-press"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>Add New Product</span>
        </Link>
      </div>

      {/* Filters & Status Tabs */}
      <div className="bg-[#FFFFFF] p-3.5 sm:p-4 rounded-2xl border border-[#E2EAE5] shadow-xs space-y-3">
        {/* Status Pill Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5" role="group" aria-label="Filter by publish status">
          {([
            { id: 'all', label: `All (${products.length})` },
            { id: 'published', label: `Published (${products.filter((p) => p.isActive !== false).length})` },
            { id: 'drafts', label: `Unpublished (${products.filter((p) => p.isActive === false).length})` },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap min-h-[36px] dex-press ${statusTab === tab.id
                ? 'bg-[#176B45] text-[#FFFFFF]'
                : 'bg-[#F7FAF8] text-[#5C6B62] border border-[#E2EAE5] hover:border-[#B8DCC5] hover:text-[#123D2A]'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7B8A80] pointer-events-none" aria-hidden="true" />
            <input
              type="search"
              placeholder="Search by product name, SKU or category…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2.5 bg-[#F7FAF8] border border-[#E2EAE5] rounded-xl focus:outline-none focus:border-[#176B45] text-xs sm:text-sm min-h-[44px]"
            />
          </div>

          <div className="w-full sm:w-56 shrink-0">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#F7FAF8] border border-[#E2EAE5] rounded-xl focus:outline-none focus:border-[#176B45] text-xs sm:text-sm min-h-[44px]"
              aria-label="Filter products by category"
            >
              <option value="">All Categories</option>
              {categoriesList.map((cat) => (
                <option key={cat.id || cat.slug} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <Skeleton key={idx} className="h-28 rounded-2xl" />
          ))}
        </div>
      )}

      {/* MOBILE PRODUCT CARDS (< lg) */}
      {!isLoading && (
        <div className="block lg:hidden space-y-3">
          {filtered.map((product) => {
            const isPublished = product.isActive !== false;
            return (
              <div
                key={product.id}
                className="bg-[#FFFFFF] rounded-2xl border border-[#E2EAE5] shadow-xs p-3.5 space-y-3"
              >
                <div className="flex gap-3 items-start">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-[#F7FAF8] border border-[#E2EAE5] shrink-0">
                    <ProductImage
                      src={product.image}
                      alt={product.name}
                      aspectClassName="aspect-square"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold text-[#176B45] uppercase tracking-wider truncate max-w-[120px]">
                        {product.category}
                      </span>
                      <Badge variant={isPublished ? 'success' : 'neutral'} dot>
                        {isPublished ? 'Published' : 'Draft'}
                      </Badge>
                    </div>

                    <h3 className="font-semibold text-[#17231C] text-sm mt-1 line-clamp-2 leading-snug">
                      {product.name}
                    </h3>

                    <div className="flex items-center justify-between gap-2 mt-1.5 flex-wrap">
                      <span className="text-sm font-extrabold text-[#0E3021] font-mono-num">
                        {formatNaira(product.priceNgn)}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {typeof product.stockQuantity === 'number' && !product.isSample && (
                          <span className="text-[10px] font-mono-num font-semibold text-[#5C6B62] bg-[#F7FAF8] px-2 py-0.5 rounded-full border border-[#E2EAE5]">
                            Qty: {product.stockQuantity}
                          </span>
                        )}
                        <Badge variant={getAvailabilityBadgeVariant(product.availability)}>
                          {product.availability}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Accessible Touch Controls */}
                <div className="grid grid-cols-4 gap-1.5 pt-2.5 border-t border-[#E2EAE5]">
                  <button
                    type="button"
                    onClick={() => openQuickEdit(product)}
                    className="inline-flex items-center justify-center gap-1 py-2 px-2 rounded-xl bg-[#EAF5EE] text-[#123D2A] border border-[#C6E5D2] text-[11px] font-semibold min-h-[40px] dex-press"
                    title="Quick edit price, stock & status"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>Quick</span>
                  </button>

                  {!product.isSample ? (
                    <Link
                      to={`/admin/products/${product.id}/edit`}
                      className="inline-flex items-center justify-center gap-1 py-2 px-2 rounded-xl border border-[#E2EAE5] text-[#17231C] hover:bg-[#F7FAF8] text-[11px] font-semibold min-h-[40px] dex-press"
                    >
                      <Pencil className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span>Edit</span>
                    </Link>
                  ) : (
                    <Link
                      to={`/product/${product.slug}`}
                      target="_blank"
                      className="inline-flex items-center justify-center gap-1 py-2 px-2 rounded-xl border border-[#E2EAE5] text-[#5C6B62] hover:bg-[#F7FAF8] text-[11px] font-semibold min-h-[40px] dex-press"
                    >
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span>View</span>
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={() => handleTogglePublished(product)}
                    className="inline-flex items-center justify-center gap-1 py-2 px-2 rounded-xl border border-[#E2EAE5] text-[#5C6B62] hover:bg-[#F7FAF8] text-[11px] font-semibold min-h-[40px] dex-press"
                    aria-label={isPublished ? `Unpublish ${product.name}` : `Publish ${product.name}`}
                  >
                    {isPublished ? (
                      <EyeOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    ) : (
                      <Eye className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    )}
                    <span>{isPublished ? 'Hide' : 'Show'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteTarget(product)}
                    className="inline-flex items-center justify-center gap-1 py-2 px-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[11px] font-semibold min-h-[40px] dex-press"
                    aria-label={`Delete ${product.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>Del</span>
                  </button>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2EAE5] p-8 text-center space-y-3">
              <p className="text-sm font-bold text-[#17231C]">
                {products.length === 0 ? 'No live products added yet' : 'No products found'}
              </p>
              <p className="text-xs text-[#5C6B62]">
                {products.length === 0
                  ? 'Publish your first real product with WebP optimization and inventory tracking.'
                  : 'Adjust your search or category filter, or add a new product.'}
              </p>
              {products.length === 0 && (
                <div className="pt-1">
                  <Link
                    to="/admin/products/new"
                    className="inline-flex items-center justify-center gap-2 bg-[#176B45] hover:bg-[#123D2A] text-[#FFFFFF] font-semibold text-xs px-4 py-2.5 rounded-xl min-h-[40px] dex-press"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    <span>Add First Product</span>
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* DESKTOP TABLE VIEW (lg+) */}
      {!isLoading && (
        <div className="hidden lg:block overflow-hidden rounded-2xl border border-[#E2EAE5] bg-[#FFFFFF] shadow-xs">
          <table className="min-w-full divide-y divide-[#E2EAE5]">
            <thead className="bg-[#F7FAF8]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-[#5C6B62] uppercase tracking-wider">
                  Product
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-[#5C6B62] uppercase tracking-wider">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-[#5C6B62] uppercase tracking-wider">
                  Price
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-[#5C6B62] uppercase tracking-wider">
                  Stock / Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-[#5C6B62] uppercase tracking-wider">
                  Visibility
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold text-[#5C6B62] uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2EAE5]">
              {filtered.map((product) => {
                const isPublished = product.isActive !== false;
                return (
                  <tr key={product.id} className="hover:bg-[#F7FAF8]/70 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-xl overflow-hidden bg-[#F7FAF8] border border-[#E2EAE5] shrink-0">
                          <ProductImage
                            src={product.image}
                            alt={product.name}
                            aspectClassName="aspect-square"
                          />
                        </div>
                        <div className="min-w-0">
                          <span className="text-sm font-semibold text-[#17231C] truncate max-w-xs block">
                            {product.name}
                          </span>
                          <span className="text-[11px] text-[#7B8A80] font-mono-num block">
                            {product.reference}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#5C6B62] font-semibold">
                      {product.category}
                    </td>
                    <td className="px-4 py-3 text-sm font-extrabold text-[#0E3021] font-mono-num">
                      {formatNaira(product.priceNgn)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Badge variant={getAvailabilityBadgeVariant(product.availability)} dot>
                          {product.availability}
                        </Badge>
                        {typeof product.stockQuantity === 'number' && !product.isSample && (
                          <span className="text-xs font-mono-num text-[#5C6B62]">
                            ({product.stockQuantity})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleTogglePublished(product)}
                        className="inline-flex items-center gap-1.5 dex-press"
                        title={isPublished ? 'Click to unpublish' : 'Click to publish'}
                      >
                        <Badge variant={isPublished ? 'success' : 'neutral'} dot>
                          {isPublished ? 'Published' : 'Unpublished'}
                        </Badge>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openQuickEdit(product)}
                          className="p-2 text-[#5C6B62] hover:text-[#176B45] hover:bg-[#EAF5EE] rounded-lg transition-colors"
                          title="Quick edit price & stock"
                        >
                          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                        </button>
                        {!product.isSample && (
                          <Link
                            to={`/admin/products/${product.id}/edit`}
                            className="p-2 text-[#5C6B62] hover:text-[#176B45] hover:bg-[#EAF5EE] rounded-lg transition-colors"
                            title="Full edit"
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </Link>
                        )}
                        <Link
                          to={`/product/${product.slug}`}
                          target="_blank"
                          className="p-2 text-[#5C6B62] hover:text-[#176B45] hover:bg-[#EAF5EE] rounded-lg transition-colors"
                          title="Preview on storefront"
                        >
                          <ExternalLink className="h-4 w-4" aria-hidden="true" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(product)}
                          className="p-2 text-[#7B8A80] hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete product"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-[#5C6B62] space-y-3">
                    <p>
                      {products.length === 0
                        ? 'No live products published in Supabase yet.'
                        : 'No products found matching your filters.'}
                    </p>
                    {products.length === 0 && (
                      <div>
                        <Link
                          to="/admin/products/new"
                          className="inline-flex items-center justify-center gap-2 bg-[#176B45] hover:bg-[#123D2A] text-[#FFFFFF] font-semibold text-xs px-4 py-2 rounded-xl min-h-[38px] dex-press"
                        >
                          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Add First Product</span>
                        </Link>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* QUICK EDIT BOTTOM SHEET / MODAL */}
      <BottomSheetModal
        isOpen={Boolean(quickEditProduct)}
        onClose={() => setQuickEditProduct(null)}
        title="Quick Update Product"
        subtitle={quickEditProduct?.name}
      >
        <form onSubmit={handleSaveQuickEdit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Input
              label="Price (₦)"
              type="number"
              min="0"
              step="any"
              requiredMark
              value={editPrice}
              onChange={(e) => setEditPrice(e.target.value)}
            />
            <Input
              label="Stock Quantity"
              type="number"
              min="0"
              step="1"
              requiredMark
              value={editStock}
              onChange={(e) => setEditStock(e.target.value)}
            />
          </div>

          <Select
            label="Availability Status"
            value={editAvailability}
            onChange={(e) => setEditAvailability(e.target.value as AvailabilityStatus)}
          >
            <option value="In Stock">In Stock</option>
            <option value="Available on Order">Available on Order</option>
            <option value="Out of Stock">Out of Stock</option>
          </Select>

          <div className="space-y-2.5 pt-1">
            <label className="flex items-center gap-2.5 text-xs sm:text-sm font-medium text-[#17231C] cursor-pointer min-h-[36px]">
              <input
                type="checkbox"
                checked={editIsActive}
                onChange={(e) => setEditIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-[#C7D8CD] accent-[#176B45]"
              />
              <span>Published on public storefront</span>
            </label>

            <label className="flex items-center gap-2.5 text-xs sm:text-sm font-medium text-[#17231C] cursor-pointer min-h-[36px]">
              <input
                type="checkbox"
                checked={editFeatured}
                onChange={(e) => setEditFeatured(e.target.checked)}
                className="h-4 w-4 rounded border-[#C7D8CD] accent-[#176B45]"
              />
              <span>Feature on Storefront Spotlight rails</span>
            </label>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2.5 pt-4 border-t border-[#E2EAE5]">
            {quickEditProduct && !quickEditProduct.isSample && (
              <Link
                to={`/admin/products/${quickEditProduct.id}/edit`}
                onClick={() => setQuickEditProduct(null)}
                className="text-xs font-semibold text-[#176B45] hover:underline text-center sm:text-left py-2"
              >
                Open Full Editor (Images &amp; Description) →
              </Link>
            )}
            <div className="flex items-center gap-2 justify-end">
              <Button variant="outline" onClick={() => setQuickEditProduct(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isSavingQuickEdit}>
                Save Changes

              </Button>
            </div>
          </div>
        </form>
      </BottomSheetModal>

      {/* DELETE CONFIRMATION MODAL / SHEET */}
      <BottomSheetModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete Product?"
        subtitle={deleteTarget?.name}
      >
        <div className="space-y-4">
          <p className="text-xs sm:text-sm text-[#5C6B62] leading-relaxed">
            This will permanently remove <strong className="text-[#17231C]">{deleteTarget?.name}</strong> from your catalogue and delete its uploaded images from storage. This cannot be undone.
          </p>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" isLoading={isDeleting} onClick={confirmDelete}>
              Delete Permanently
            </Button>
          </div>
        </div>
      </BottomSheetModal>
    </div>
  );
};
