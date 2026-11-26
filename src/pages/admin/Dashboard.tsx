import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  TrendingUp,
  AlertTriangle,
  LayoutGrid,
  ArrowRight,
  Plus,
  ExternalLink,
  Pencil,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import { type Product } from '../../data/storeData';
import { formatNaira } from '../../utils/catalogue';
import {
  ensureStoreSettingsInitialized,
  fetchAdminProductsList,
} from '../../utils/productService';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useStoreData } from '../../context/StoreDataContext';
import { ProductImage } from '../../components/ProductImage';
import { Badge, Card, Skeleton, getAvailabilityBadgeVariant } from '../../components/ui';

const StatCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  value: string;
  badge?: string;
}> = ({ icon, title, value, badge }) => (
  <Card padding="md" interactive className="flex items-center justify-between gap-3">
    <div className="space-y-1 min-w-0">
      <p className="text-[11px] font-semibold text-[#5C6B62] uppercase tracking-wider truncate">
        {title}
      </p>
      <p className="text-2xl sm:text-3xl font-extrabold text-[#17231C] font-mono-num">
        {value}
      </p>
      {badge && (
        <span className="inline-block text-[10px] font-semibold text-[#123D2A] bg-[#EAF5EE] border border-[#D9F0E2] px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </div>
    <div className="p-3 rounded-xl bg-[#EAF5EE] text-[#176B45] border border-[#D9F0E2] shrink-0">
      {icon}
    </div>
  </Card>
);

export const AdminDashboard: React.FC = () => {
  const { isAdmin } = useAuth();
  const { refreshStoreData } = useStoreData();
  const [products, setProducts] = useState<Product[]>([]);
  const [hasLiveProducts, setHasLiveProducts] = useState(false);
  const [categoriesCount, setCategoriesCount] = useState<number>(0);
  const [settingsReady, setSettingsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadDashboardData() {
      try {
        if (isAdmin) {
          const initRes = await ensureStoreSettingsInitialized();
          if (initRes.created) {
            await refreshStoreData();
          }
          if (isMounted && (initRes.created || initRes.alreadyExists)) {
            setSettingsReady(true);
          }
        }

        const [{ liveProducts }, { count, error }] = await Promise.all([
          fetchAdminProductsList(),
          supabase.from('categories').select('id', { count: 'exact', head: true }),
        ]);

        if (isMounted) {
          setHasLiveProducts(liveProducts.length > 0);
          setProducts(liveProducts);
          if (!error && typeof count === 'number') {
            setCategoriesCount(count);
          }
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
  }, [isAdmin, refreshStoreData]);

  const totalProducts = products.length;
  const publishedProducts = products.filter((p) => p.isActive !== false).length;
  const inStockProducts = products.filter((p) => p.availability === 'In Stock').length;
  const availableOnOrderOrOut = products.filter((p) => p.availability !== 'In Stock').length;
  const recentProducts = [...products]
    .sort((a, b) => b.createdAtOrder - a.createdAtOrder)
    .slice(0, 4);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Top Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#17231C] tracking-tight">
              Dashboard Overview
            </h1>
            <Badge variant={hasLiveProducts ? 'success' : 'neutral'} dot>
              {hasLiveProducts ? 'Live Supabase Inventory' : 'Awaiting First Product'}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-[#5C6B62] mt-1">
            Monitor store inventory, stock status, and department metrics across DEX STORES.
          </p>
        </div>

        <Link
          to="/admin/products/new"
          className="inline-flex items-center justify-center gap-2 bg-[#176B45] hover:bg-[#123D2A] text-[#FFFFFF] font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-xs min-h-[44px] w-full sm:w-auto dex-press"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>Add Product</span>
        </Link>
      </div>

      {/* Summary Stat Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton key={idx} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            icon={<Package className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />}
            title="Total Products"
            value={String(totalProducts)}
            badge={`${publishedProducts} published`}
          />
          <StatCard
            icon={<TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />}
            title="In Stock"
            value={String(inStockProducts)}
            badge="Ready to dispatch"
          />
          <StatCard
            icon={<AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />}
            title="On Order / Out"
            value={String(availableOnOrderOrOut)}
            badge="Restock watch"
          />
          <StatCard
            icon={<LayoutGrid className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />}
            title="Categories"
            value={String(categoriesCount)}
            badge="Departments"
          />
        </div>
      )}

      {/* Quick Navigation Strip */}
      <Card padding="md" className="space-y-3">
        <h2 className="text-xs font-bold text-[#5C6B62] uppercase tracking-wider">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
          <Link
            to="/admin/products"
            className="flex items-center justify-between p-3.5 rounded-xl border border-[#E2EAE5] bg-[#F7FAF8] hover:bg-[#EAF5EE] hover:border-[#B8DCC5] transition-colors min-h-[44px] text-xs sm:text-sm font-semibold text-[#123D2A] dex-press"
          >
            <span>Manage All Products</span>
            <ArrowRight className="h-4 w-4 text-[#176B45]" aria-hidden="true" />
          </Link>
          <Link
            to="/admin/categories"
            className="flex items-center justify-between p-3.5 rounded-xl border border-[#E2EAE5] bg-[#F7FAF8] hover:bg-[#EAF5EE] hover:border-[#B8DCC5] transition-colors min-h-[44px] text-xs sm:text-sm font-semibold text-[#123D2A] dex-press"
          >
            <span>Manage Categories</span>
            <ArrowRight className="h-4 w-4 text-[#176B45]" aria-hidden="true" />
          </Link>
          <Link
            to="/admin/settings"
            className="flex items-center justify-between p-3.5 rounded-xl border border-[#E2EAE5] bg-[#F7FAF8] hover:bg-[#EAF5EE] hover:border-[#B8DCC5] transition-colors min-h-[44px] text-xs sm:text-sm font-semibold text-[#123D2A] dex-press"
          >
            <span>Store Settings</span>
            <ArrowRight className="h-4 w-4 text-[#176B45]" aria-hidden="true" />
          </Link>
        </div>
      </Card>

      {/* First-Time Launch Checklist when live store is still empty */}
      {!isLoading && (categoriesCount === 0 || totalProducts === 0) && (
        <Card padding="md" className="border-[#C6E5D2] bg-[#EAF5EE]/60 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-[#123D2A]">Store Launch Checklist</h2>
              <p className="text-xs text-[#5C6B62]">
                Complete these steps to replace storefront demonstration items with your live inventory.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <Link
              to="/admin/settings"
              className="flex items-start gap-2.5 p-3 rounded-xl bg-[#FFFFFF] border border-[#C6E5D2] hover:border-[#176B45] transition-colors dex-press"
            >
              {settingsReady ? (
                <CheckCircle2 className="w-4 h-4 text-[#176B45] shrink-0 mt-0.5" aria-hidden="true" />
              ) : (
                <Circle className="w-4 h-4 text-[#7B8A80] shrink-0 mt-0.5" aria-hidden="true" />
              )}
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#17231C]">1. Configure Store Desk</p>
                <p className="text-[11px] text-[#5C6B62] mt-0.5">
                  Set real WhatsApp order number &amp; store details
                </p>
              </div>
            </Link>

            <Link
              to="/admin/categories"
              className="flex items-start gap-2.5 p-3 rounded-xl bg-[#FFFFFF] border border-[#C6E5D2] hover:border-[#176B45] transition-colors dex-press"
            >
              {categoriesCount > 0 ? (
                <CheckCircle2 className="w-4 h-4 text-[#176B45] shrink-0 mt-0.5" aria-hidden="true" />
              ) : (
                <Circle className="w-4 h-4 text-[#7B8A80] shrink-0 mt-0.5" aria-hidden="true" />
              )}
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#17231C]">2. Create First Category</p>
                <p className="text-[11px] text-[#5C6B62] mt-0.5">
                  {categoriesCount > 0 ? `${categoriesCount} department(s) active` : 'Upload cover photo & department slug'}
                </p>
              </div>
            </Link>

            <Link
              to="/admin/products/new"
              className="flex items-start gap-2.5 p-3 rounded-xl bg-[#FFFFFF] border border-[#C6E5D2] hover:border-[#176B45] transition-colors dex-press"
            >
              {totalProducts > 0 ? (
                <CheckCircle2 className="w-4 h-4 text-[#176B45] shrink-0 mt-0.5" aria-hidden="true" />
              ) : (
                <Circle className="w-4 h-4 text-[#7B8A80] shrink-0 mt-0.5" aria-hidden="true" />
              )}
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#17231C]">3. Publish First Product</p>
                <p className="text-[11px] text-[#5C6B62] mt-0.5">
                  Select photo from phone/PC, price &amp; publish live
                </p>
              </div>
            </Link>
          </div>
        </Card>
      )}

      {/* Recent Products Showcase */}
      <section className="space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#17231C]">Recent Products</h2>
            <p className="text-xs text-[#5C6B62]">Latest listings in your catalogue</p>
          </div>
          <Link
            to="/admin/products"
            className="text-xs sm:text-sm font-semibold text-[#176B45] hover:text-[#123D2A] inline-flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        {recentProducts.length === 0 ? (
          <Card className="p-6 text-center space-y-2 border-dashed border-[#C6E5D2] bg-[#F7FAF8]">
            <p className="text-sm font-semibold text-[#17231C]">No live products published yet</p>
            <p className="text-xs text-[#5C6B62]">
              Create your first product to replace the storefront sample catalogue with live Supabase inventory.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {recentProducts.map((p) => (
              <div
                key={p.id}
                className="bg-[#FFFFFF] rounded-2xl border border-[#E2EAE5] shadow-xs overflow-hidden flex flex-row sm:flex-col dex-card-interactive"
              >
                <div className="w-24 sm:w-full h-24 sm:h-36 bg-[#F7FAF8] shrink-0 overflow-hidden">
                  <ProductImage
                    src={p.image}
                    alt={p.name}
                    aspectClassName="aspect-square sm:aspect-[16/10]"
                  />
                </div>

                <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <span className="text-[10px] font-bold text-[#176B45] uppercase tracking-wider block truncate">
                      {p.category}
                    </span>
                    <h3 className="font-semibold text-[#17231C] text-xs sm:text-sm truncate mt-0.5" title={p.name}>
                      {p.name}
                    </h3>
                    <p className="text-xs sm:text-sm font-extrabold text-[#0E3021] font-mono-num mt-1">
                      {formatNaira(p.priceNgn)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-2.5 pt-2.5 border-t border-[#E2EAE5]">
                    <Badge variant={getAvailabilityBadgeVariant(p.availability)} dot>
                      {p.availability}
                    </Badge>

                    <div className="flex items-center gap-1.5">
                      {!p.isSample && (
                        <Link
                          to={`/admin/products/${p.id}/edit`}
                          className="p-1.5 text-[#5C6B62] hover:text-[#176B45] hover:bg-[#EAF5EE] rounded-lg transition-colors"
                          title="Edit product"
                          aria-label={`Edit ${p.name}`}
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        </Link>
                      )}
                      <Link
                        to={`/product/${p.slug}`}
                        target="_blank"
                        className="p-1.5 text-[#5C6B62] hover:text-[#176B45] hover:bg-[#EAF5EE] rounded-lg transition-colors"
                        title="View on storefront"
                        aria-label={`View ${p.name} on storefront`}
                      >
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    </div>

                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
