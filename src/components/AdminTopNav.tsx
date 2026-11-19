import React from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const PAGE_TITLES: Record<string, string> = {
  '/admin': 'Dashboard Overview',
  '/admin/products': 'Product Management',
  '/admin/products/new': 'Add New Product',
  '/admin/categories': 'Category Management',
  '/admin/settings': 'Store Settings',
  '/admin/login': 'Admin Login',
};

export default function AdminTopNav() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const title = PAGE_TITLES[pathname] ?? 'Admin Dashboard';

  const userDisplayName = user?.email?.split('@')[0] || 'Admin';

  return (
    <header className="flex items-center justify-between bg-white shadow-sm px-6 py-4 border-b border-[#E0E0E0]">
      <h2 className="text-lg font-semibold text-[#202923]">{title}</h2>
      <div className="flex items-center gap-4">
        <button className="relative p-2 rounded-full hover:bg-[#E6F4E9] text-[#555] transition" title="Notifications">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
        </button>
        <div className="flex items-center gap-2.5 pl-3 border-l border-[#E0E0E0]">
          <div className="h-8 w-8 bg-[#E6F4E9] text-[#123D2A] rounded-full flex items-center justify-center font-bold text-xs uppercase">
            {userDisplayName.slice(0, 2)}
          </div>
          <div className="text-left hidden sm:block">
            <span className="text-xs font-semibold text-[#202923] block leading-tight">{userDisplayName}</span>
            <span className="text-[10px] text-green-700 font-medium block">Verified Admin</span>
          </div>
        </div>
      </div>
    </header>
  );
}
