import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Trash2, Search, Plus, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { PRODUCTS, CATEGORIES, type Product } from '../../data/storeData';
import { formatNaira } from '../../utils/catalogue';
import { fetchAdminProductsList, deleteProductRecord } from '../../utils/productService';
import { ProductImage } from '../../components/ProductImage';

export const AdminProducts: React.FC = () => {
  const [products, setProducts] = useState<Product[]>(PRODUCTS);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const { allProducts } = await fetchAdminProductsList();
      if (allProducts && allProducts.length > 0) {
        setProducts(allProducts);
      }
    } catch (err) {
      console.warn('Error loading admin products:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleDelete = async (productId: string, productName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${productName}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(productId);
    setFeedbackMessage(null);

    const result = await deleteProductRecord(productId);
    if (result.success) {
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      setFeedbackMessage({ text: `Product "${productName}" deleted successfully.`, type: 'success' });
    } else {
      // If it's a sample mock product, allow removing from current view
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      setFeedbackMessage({
        text: `Removed "${productName}" from view. (${result.error || 'Local catalogue item'})`,
        type: 'success',
      });
    }
    setDeletingId(null);
  };

  const filtered = products.filter((p) => {
    const query = search.toLowerCase().trim();
    const matchesSearch =
      !query ||
      p.name.toLowerCase().includes(query) ||
      p.reference?.toLowerCase().includes(query) ||
      p.category?.toLowerCase().includes(query);

    const matchesCategory = categoryFilter ? p.category === categoryFilter : true;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Products</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage your inventory, pricing, and product visibility.
          </p>
        </div>
        <Link
          to="/admin/products/new"
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium text-xs sm:text-sm px-4 py-2.5 rounded-lg shadow-xs transition min-h-[44px] w-full sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Product</span>
        </Link>
      </div>

      {/* Feedback banner */}
      {feedbackMessage && (
        <div
          className={`p-3 rounded-lg text-xs sm:text-sm flex items-center justify-between border ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          <span>{feedbackMessage.text}</span>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-slate-400 hover:text-slate-700 font-bold ml-2 p-1"
          >
            ×
          </button>
        </div>
      )}

      {/* Search & Filters Controls */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by product name, SKU or reference…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-xs sm:text-sm min-h-[44px]"
          />
        </div>

        {/* Category Filter */}
        <div className="w-full sm:w-56 shrink-0">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-xs sm:text-sm min-h-[44px]"
            aria-label="Filter products by category"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat.slug} value={cat.name}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading state indicator */}
      {isLoading && (
        <div className="flex items-center justify-center p-8 bg-white rounded-xl border border-slate-200/80 text-slate-500 gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          <span className="text-xs sm:text-sm font-medium">Loading products…</span>
        </div>
      )}

      {/* MOBILE PRODUCT CARDS VIEW (< lg) */}
      {!isLoading && (
        <div className="block lg:hidden space-y-3">
          {filtered.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-3.5 space-y-3"
            >
              {/* Product Header: Thumbnail + Title + Meta */}
              <div className="flex gap-3 items-start">
                <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0 relative">
                  <ProductImage
                    src={product.image}
                    alt={product.name}
                    aspectClassName="aspect-square"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 truncate max-w-[120px]">
                      {product.category}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {product.reference}
                    </span>
                  </div>

                  <h3 className="font-semibold text-slate-900 text-sm mt-1 line-clamp-2 leading-snug">
                    {product.name}
                  </h3>

                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-sm font-bold text-slate-900">
                      {formatNaira(product.priceNgn)}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        product.availability === 'In Stock'
                          ? 'bg-emerald-50 text-emerald-700'
                          : product.availability === 'Available on Order'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {product.availability}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons Bar */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <Link
                  to={`/product/${product.slug}`}
                  target="_blank"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium min-h-[40px] transition"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Preview</span>
                </Link>

                <button
                  type="button"
                  onClick={() => handleDelete(product.id, product.name)}
                  disabled={deletingId === product.id}
                  className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium min-h-[40px] min-w-[70px] transition disabled:opacity-50"
                  aria-label={`Delete ${product.name}`}
                >
                  {deletingId === product.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-200/80 p-8 text-center space-y-2">
              <p className="text-sm font-medium text-slate-700">No products found</p>
              <p className="text-xs text-slate-500">
                Try clearing your search query or choosing a different category.
              </p>
            </div>
          )}
        </div>
      )}

      {/* DESKTOP TABLE VIEW (lg+) */}
      {!isLoading && (
        <div className="hidden lg:block overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xs">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Reference
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Featured
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                        <ProductImage
                          src={product.image}
                          alt={product.name}
                          aspectClassName="aspect-square"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <span className="text-sm font-semibold text-slate-900 truncate max-w-xs block">
                        {product.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600 font-medium">
                    {product.category}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 font-mono">
                    {product.reference}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-slate-900">
                    {formatNaira(product.priceNgn)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        product.availability === 'In Stock'
                          ? 'bg-emerald-50 text-emerald-700'
                          : product.availability === 'Available on Order'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {product.availability}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {product.featured ? (
                      <span className="text-blue-600 font-semibold">Featured</span>
                    ) : (
                      'Standard'
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/product/${product.slug}`}
                        target="_blank"
                        className="p-1.5 text-slate-400 hover:text-blue-600 rounded transition"
                        title="View on storefront"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(product.id, product.name)}
                        disabled={deletingId === product.id}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded transition disabled:opacity-50"
                        title="Delete product"
                      >
                        {deletingId === product.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-red-600" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">
                    No products found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
