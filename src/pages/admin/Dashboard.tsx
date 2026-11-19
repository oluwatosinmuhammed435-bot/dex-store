import React from 'react';
import { Link } from 'react-router-dom';
import { Package, TrendingUp, AlertTriangle, LayoutGrid, ArrowRight } from 'lucide-react';
import { PRODUCTS, CATEGORIES } from '../../data/storeData';
import { formatNaira } from '../../utils/catalogue';

const StatCard: React.FC<{ icon: React.ReactNode; title: string; value: string; accent?: string }> = ({
  icon,
  title,
  value,
  accent = 'bg-[#E6F4E9] text-[#123D2A]',
}) => (
  <div className="flex items-center gap-4 p-5 bg-white rounded-lg shadow-sm border border-[#E0E0E0] hover:shadow-md transition-shadow">
    <div className={`p-3 rounded-lg ${accent}`}>{icon}</div>
    <div>
      <p className="text-sm text-[#777]">{title}</p>
      <p className="text-2xl font-bold text-[#202923]">{value}</p>
    </div>
  </div>
);

export const AdminDashboard: React.FC = () => {
  const totalProducts = PRODUCTS.length;
  const activeProducts = PRODUCTS.filter(p => p.availability === 'In Stock').length;
  const availableOnOrder = PRODUCTS.filter(p => p.availability === 'Available on Order').length;
  const totalCategories = CATEGORIES.length;

  const recentProducts = [...PRODUCTS].sort((a, b) => b.createdAtOrder - a.createdAtOrder).slice(0, 4);

  return (
    <div className="space-y-8">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold text-[#202923]">Dashboard Overview</h1>
        <p className="text-sm text-[#777] mt-1">Sample data — will reflect live inventory once Supabase is connected.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Package className="h-6 w-6" />} title="Total Products" value={String(totalProducts)} />
        <StatCard icon={<TrendingUp className="h-6 w-6" />} title="In Stock" value={String(activeProducts)} />
        <StatCard
          icon={<AlertTriangle className="h-6 w-6" />}
          title="Available on Order"
          value={String(availableOnOrder)}
          accent="bg-amber-50 text-amber-600"
        />
        <StatCard icon={<LayoutGrid className="h-6 w-6" />} title="Categories" value={String(totalCategories)} />
      </div>

      {/* Quick actions */}
      <section>
        <h2 className="text-lg font-semibold text-[#202923] mb-3">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/admin/products/new"
            className="inline-flex items-center gap-2 bg-[#123D2A] text-white px-4 py-2 rounded-md hover:bg-[#0f2e1e] transition text-sm"
          >
            Add Product <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/admin/categories"
            className="inline-flex items-center gap-2 border border-[#123D2A] text-[#123D2A] px-4 py-2 rounded-md hover:bg-[#E6F4E9] transition text-sm"
          >
            Manage Categories
          </Link>
          <Link
            to="/admin/settings"
            className="inline-flex items-center gap-2 border border-[#123D2A] text-[#123D2A] px-4 py-2 rounded-md hover:bg-[#E6F4E9] transition text-sm"
          >
            Store Settings
          </Link>
          <Link
            to="/"
            target="_blank"
            className="inline-flex items-center gap-2 border border-[#999] text-[#555] px-4 py-2 rounded-md hover:bg-gray-50 transition text-sm"
          >
            View Storefront
          </Link>
        </div>
      </section>

      {/* Recent products */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#202923]">Recently Added Products</h2>
          <Link to="/admin/products" className="text-sm text-[#123D2A] hover:underline flex items-center gap-1">
            View All <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {recentProducts.map(p => (
            <div key={p.id} className="bg-white rounded-lg shadow-sm border border-[#E0E0E0] overflow-hidden hover:shadow-md transition-shadow">
              <img
                src={p.gallery[0]?.url ?? p.image}
                alt={p.name}
                className="w-full h-36 object-cover"
              />
              <div className="p-3">
                <p className="font-medium text-[#202923] text-sm truncate">{p.name}</p>
                <p className="text-xs text-[#777] mt-0.5">{p.category}</p>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-sm font-bold text-[#123D2A]">{formatNaira(p.priceNgn)}</p>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      p.availability === 'In Stock'
                        ? 'bg-green-100 text-green-700'
                        : p.availability === 'Available on Order'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {p.availability}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Inventory overview */}
      <section>
        <h2 className="text-lg font-semibold text-[#202923] mb-3">Inventory by Category</h2>
        <div className="bg-white rounded-lg shadow-sm border border-[#E0E0E0] overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-[#E6F4E9]">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-semibold text-[#202923]">Category</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-[#202923]">Products</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-[#202923]">In Stock</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-[#202923]">On Order</th>
              </tr>
            </thead>
            <tbody>
              {CATEGORIES.map(cat => {
                const catProducts = PRODUCTS.filter(p => p.categorySlug === cat.slug);
                const inStock = catProducts.filter(p => p.availability === 'In Stock').length;
                const onOrder = catProducts.filter(p => p.availability === 'Available on Order').length;
                return (
                  <tr key={cat.slug} className="border-t border-[#E0E0E0]">
                    <td className="px-4 py-3 text-sm text-[#202923] font-medium">{cat.name}</td>
                    <td className="px-4 py-3 text-sm text-[#555]">{catProducts.length}</td>
                    <td className="px-4 py-3 text-sm text-green-700">{inStock}</td>
                    <td className="px-4 py-3 text-sm text-amber-600">{onOrder}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
