import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Menu, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AdminTopNavProps {
  onOpenMenu: () => void;
}

function getPageTitle(pathname: string): string {
  if (pathname === '/admin') return 'Dashboard Overview';
  if (pathname === '/admin/products') return 'Products';
  if (pathname === '/admin/products/new') return 'Add New Product';
  if (pathname.startsWith('/admin/products/') && pathname.endsWith('/edit')) {
    return 'Edit Product';
  }
  if (pathname === '/admin/categories') return 'Categories';
  if (pathname === '/admin/settings') return 'Store Settings';
  return 'Admin Dashboard';
}

export default function AdminTopNav({ onOpenMenu }: AdminTopNavProps) {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const title = getPageTitle(pathname);
  const userDisplayName = user?.email?.split('@')[0] || 'Admin';

  return (
    <header className="sticky top-0 z-30 bg-[#FFFFFF]/95 backdrop-blur-md border-b border-[#E2EAE5] px-3.5 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-between gap-2">
      {/* Left: Mobile Drawer Menu Trigger + Brand & Title */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
        <button
          type="button"
          onClick={onOpenMenu}
          className="lg:hidden p-2 -ml-1 rounded-xl text-[#17231C] hover:bg-[#EAF5EE] active:bg-[#D9F0E2] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0 dex-press"
          aria-label="Open admin navigation drawer"
        >
          <Menu className="w-5 h-5" aria-hidden="true" />
        </button>

        <div className="min-w-0 flex items-center gap-2">
          <span className="lg:hidden text-[10px] font-extrabold bg-[#EAF5EE] text-[#176B45] px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 border border-[#C6E5D2]">
            DEX
          </span>
          <h2 className="text-sm sm:text-base font-bold text-[#17231C] truncate">
            {title}
          </h2>
        </div>
      </div>

      {/* Right: Quick Action & Admin User Pill */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {pathname !== '/admin/products/new' && (
          <Link
            to="/admin/products/new"
            className="inline-flex items-center gap-1.5 bg-[#176B45] hover:bg-[#123D2A] text-[#FFFFFF] text-xs font-semibold px-3 sm:px-3.5 py-2 rounded-xl shadow-2xs min-h-[40px] dex-press"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">Add Product</span>
            <span className="sm:hidden">New</span>
          </Link>
        )}

        <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-[#E2EAE5]">
          <div className="h-8 w-8 bg-[#EAF5EE] border border-[#C6E5D2] text-[#123D2A] rounded-full flex items-center justify-center font-bold text-xs uppercase shrink-0">
            {userDisplayName.slice(0, 2)}
          </div>
          <div className="text-left hidden md:block">
            <span className="text-xs font-semibold text-[#17231C] block leading-tight truncate max-w-[120px]">
              {userDisplayName}
            </span>
            <span className="text-[10px] text-[#176B45] font-semibold block">Verified Admin</span>
          </div>
        </div>
      </div>
    </header>
  );
}
