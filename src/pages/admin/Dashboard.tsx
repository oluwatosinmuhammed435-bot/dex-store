import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, TrendingUp, AlertTriangle, LayoutGrid, ArrowRight, Plus, ExternalLink } from 'lucide-react';
import { PRODUCTS, CATEGORIES, type Product } from '../../data/storeData';
import { formatNaira } from '../../utils/catalogue';
import { fetchAdminProductsList } from '../../utils/productService';
import { supabase } from '../../lib/supabase';
import { ProductImage } from '../../components/ProductImage';

const StatCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  value: string;
  badge?: string;
  accentBg?: string;
  accentText?: string;
}> = ({
  icon,
  title,
  value,
  badge,
  accentBg = 'bg-blue-50',
  accentText = 'text-blue-700',
}) => (
  <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex items-center justify-between transition hover:border-slate-300">
    <div className="space-y-1">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</p>
      <p className="text-2xl sm:text-3xl font-bold text-slate-900">{value}</p>
      {badge && (
        <span className="inline-block text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
          {badge}
        </span>
      )}
    </div>
    <div className={`p-3 rounded-xl ${accentBg} ${accentText} shrink-0`}>
      {icon}
    </div>
  </div>
);

export const AdminDashboard: React.FC = () => {
  const [products, setProducts] = useState<Product[]>(PRODUCTS);
  const [categoriesCount, setCategoriesCount] = useState<number>(CATEGORIES.length);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadDashboardData() {
      try {
        const { allProducts } = await fetchAdminProductsList();
        if (isMounted && allProducts.length > 0) {
          setProducts(allProducts);
        }

        // Fetch categories count from Supabase
        const { count, error } = await supabase
          .from('categories')
          .select('id', { count: 'exact', head: true });

        if (!error && typeof count === 'number' && count > 0 && isMounted) {
          setCategoriesCount(count);
        }
      } catch (err) {
        console.warn('Dashboard fetch warning:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadDashboardData();
    return () => {
      isMounted = false;
    };
  }, []);

  const totalProducts = products.length;
  const inStockProducts = products.filter((p) => p.availability === 'In Stock').length;
  const availableOnOrder = products.filter((p) => p.availability === 'Available on Order').length;
  const recentProducts = [...products].sort((a, b) => b.createdAtOrder - a.createdAtOrder).slice(0, 4);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Top Banner & Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Dashboard Overview</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time inventory and catalog metrics for DEX STORES.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/admin/products/new"
            className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs sm:text-sm px-3.5 py-2.5 rounded-lg shadow-xs transition min-h-[44px] w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Create Product</span>
          </Link>
        </div>
      </div>

      {/* Summary Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={<Package className="h-5 w-5 sm:h-6 sm:w-6" />}
          title="Total Products"
          value={String(totalProducts)}
          badge="Catalog size"
          accentBg="bg-blue-50"
          accentText="text-blue-700"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" />}
          title="In Stock"
          value={String(inStockProducts)}
          badge="Ready to dispatch"
          accentBg="bg-emerald-50"
          accentText="text-emerald-700"
        />
        <StatCard
          icon={<AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6" />}
          title="Available On Order"
          value={String(availableOnOrder)}
          badge="On demand"
          accentBg="bg-amber-50"
          accentText="text-amber-700"
        />
        <StatCard
          icon={<LayoutGrid className="h-5 w-5 sm:h-6 sm:w-6" />}
          title="Categories"
          value={String(categoriesCount)}
          badge="Store departments"
          accentBg="bg-slate-100"
          accentText="text-slate-700"
        />
      </div>

      {/* Quick Action Navigation Buttons */}
      <section className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-3">
        <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
          <Link
            to="/admin/products"
            className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition min-h-[44px] text-sm font-medium text-slate-700"
          >
            <span>Manage Products</span>
            <ArrowRight className="h-4 w-4 text-slate-400" />
          </Link>
          <Link
            to="/admin/categories"
            className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition min-h-[44px] text-sm font-medium text-slate-700"
          >
            <span>Manage Categories</span>
            <ArrowRight className="h-4 w-4 text-slate-400" />
          </Link>
          <Link
            to="/admin/settings"
            className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition min-h-[44px] text-sm font-medium text-slate-700"
          >
            <span>Store Settings</span>
            <ArrowRight className="h-4 w-4 text-slate-400" />
          </Link>
        </div>
      </section>

      {/* Recent Products Showcase */}
      <section className="space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">Recent Products</h2>
            <p className="text-xs text-slate-500">Latest additions to your store catalogue</p>
          </div>
          <Link
            to="/admin/products"
            className="text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Responsive Mobile Cards & Desktop Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {recentProducts.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-row sm:flex-col hover:border-slate-300 transition"
            >
              {/* Product Thumbnail */}
              <div className="w-24 sm:w-full h-24 sm:h-36 bg-slate-100 shrink-0 relative overflow-hidden">
                <ProductImage
                  src={p.image}
                  alt={p.name}
                  aspectClassName="aspect-square sm:aspect-[16/10]"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Product Metadata */}
              <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between min-w-0">
                <div>
                  <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider block truncate">
                    {p.category}
                  </span>
                  <h3 className="font-semibold text-slate-900 text-xs sm:text-sm truncate mt-0.5" title={p.name}>
                    {p.name}
                  </h3>
                  <p className="text-xs font-bold text-slate-900 mt-1">
                    {formatNaira(p.priceNgn)}
                  </p>
                </div>

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      p.availability === 'In Stock'
                        ? 'bg-emerald-50 text-emerald-700'
                        : p.availability === 'Available on Order'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {p.availability}
                  </span>
                  <Link
                    to={`/product/${p.slug}`}
                    target="_blank"
                    className="text-[11px] text-slate-400 hover:text-blue-600 inline-flex items-center gap-1"
                    title="View on storefront"
                  >
                    <span>Store</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
