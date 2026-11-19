import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Trash2, Search } from 'lucide-react';
import { PRODUCTS, CATEGORIES } from '../../data/storeData';
import { formatNaira } from '../../utils/catalogue';

export const AdminProducts: React.FC = () => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const filtered = PRODUCTS.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter ? p.category === categoryFilter : true;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#202923]">Products</h1>
        <Link
          to="/admin/products/new"
          className="bg-[#123D2A] text-white px-4 py-2 rounded-md hover:bg-[#0f2e1e] transition text-sm"
        >
          + Add Product
        </Link>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#999]" />
          <input
            type="text"
            placeholder="Search products…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#123D2A] text-sm"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#123D2A] text-sm"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map(cat => (
            <option key={cat.slug} value={cat.name}>{cat.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg shadow-sm border border-[#E0E0E0] bg-white">
        <table className="min-w-full">
          <thead className="bg-[#E6F4E9]">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#202923]">Image</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#202923]">Name</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#202923]">Category</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#202923]">Price</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#202923]">Status</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#202923]">Featured</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#202923]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(product => (
              <tr key={product.id} className="border-t border-[#E0E0E0] hover:bg-[#FAFFF8] transition-colors">
                <td className="px-4 py-3">
                  <img
                    src={product.gallery[0]?.url ?? product.image}
                    alt={product.name}
                    className="h-12 w-12 object-cover rounded"
                  />
                </td>
                <td className="px-4 py-3 text-sm text-[#202923] font-medium">{product.name}</td>
                <td className="px-4 py-3 text-sm text-[#555]">{product.category}</td>
                <td className="px-4 py-3 text-sm font-semibold text-[#123D2A]">{formatNaira(product.priceNgn)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      product.availability === 'In Stock'
                        ? 'bg-green-100 text-green-700'
                        : product.availability === 'Available on Order'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {product.availability}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-[#555]">{product.featured ? '⭐ Yes' : 'No'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button className="p-1.5 text-[#123D2A] hover:bg-[#E6F4E9] rounded transition" title="Edit">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button className="p-1.5 text-red-600 hover:bg-red-50 rounded transition" title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-[#999]">
                  No products found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
