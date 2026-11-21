import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Menu, Plus, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const PAGE_TITLES: Record<string, string> = {
  '/admin': 'Dashboard Overview',
  '/admin/products': 'Product Management',
  '/admin/products/new': 'Add New Product',
  '/admin/categories': 'Category Management',
  '/admin/settings': 'Store Settings',
  '/admin/login': 'Admin Login',
};

interface AdminTopNavProps {
  onOpenMenu: () => void;
}

export default function AdminTopNav({ onOpenMenu }: AdminTopNavProps) {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const title = PAGE_TITLES[pathname] ?? 'Admin Dashboard';

  const userDisplayName = user?.email?.split('@')[0] || 'Admin';

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-between">
      {/* Left: Mobile Menu Trigger + Brand & Page Title */}
      <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
        <button
          type="button"
          onClick={onOpenMenu}
          className="lg:hidden p-2 -ml-1 rounded-lg text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
          aria-label="Open mobile navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="lg:hidden text-[10px] font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 border border-blue-100">
              DEX STORES
            </span>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">
              {title}
            </h2>
          </div>
        </div>
      </div>

      {/* Right: Quick Action & Admin User Indicator */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {pathname !== '/admin/products/new' && (
          <Link
            to="/admin/products/new"
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold px-2.5 sm:px-3 py-2 rounded-lg transition shadow-xs min-h-[38px]"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Product</span>
            <span className="sm:hidden">Add</span>
          </Link>
        )}

        <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-slate-200/80">
          <div className="h-8 w-8 bg-blue-50 border border-blue-200 text-blue-700 rounded-full flex items-center justify-center font-bold text-xs uppercase shrink-0">
            {userDisplayName.slice(0, 2)}
          </div>
          <div className="text-left hidden md:block">
            <span className="text-xs font-semibold text-slate-800 block leading-tight truncate max-w-[120px]">
              {userDisplayName}
            </span>
            <span className="text-[10px] text-emerald-600 font-medium block">Active</span>
          </div>
        </div>
      </div>
    </header>
  );
}
