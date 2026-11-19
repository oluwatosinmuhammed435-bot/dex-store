import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Box, PlusSquare, List, Settings, ExternalLink, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NavItem: React.FC<{ to: string; icon: React.ReactNode; label: string; end?: boolean }> = ({
  to,
  icon,
  label,
  end = false,
}) => (
  <NavLink
    to={to}
    end={end}
    className={({ isActive }) =>
      `flex items-center gap-3 py-2.5 px-4 rounded-md transition-colors text-sm font-medium ${
        isActive
          ? 'bg-white/15 text-white'
          : 'text-white/70 hover:bg-white/10 hover:text-white'
      }`
    }
  >
    {icon}
    <span>{label}</span>
  </NavLink>
);

export default function AdminSidebar() {
  const { signOut, user } = useAuth();

  return (
    <aside className="w-64 bg-[#123D2A] text-white flex flex-col min-h-screen">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-white/10">
        <div className="h-9 w-9 bg-white/20 rounded-lg flex items-center justify-center">
          <span className="text-lg font-bold">D</span>
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-wide">DEX STORES</h1>
          <p className="text-xs text-white/50">Admin Panel</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-1 p-3 mt-2">
        <NavItem to="/admin" end icon={<LayoutDashboard className="h-5 w-5" />} label="Overview" />
        <NavItem to="/admin/products" icon={<Box className="h-5 w-5" />} label="Products" />
        <NavItem to="/admin/products/new" icon={<PlusSquare className="h-5 w-5" />} label="Add Product" />
        <NavItem to="/admin/categories" icon={<List className="h-5 w-5" />} label="Categories" />
        <NavItem to="/admin/settings" icon={<Settings className="h-5 w-5" />} label="Settings" />
      </nav>

      {/* Current User & Logout */}
      <div className="p-3 border-t border-white/10 space-y-1">
        {user?.email && (
          <div className="px-4 py-1.5 text-xs text-white/60 truncate" title={user.email}>
            Signed in as: <span className="text-white/90 font-medium block truncate">{user.email}</span>
          </div>
        )}
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 py-2.5 px-4 rounded-md transition-colors text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white"
        >
          <ExternalLink className="h-5 w-5" />
          <span>View Storefront</span>
        </a>
        <button
          type="button"
          onClick={() => signOut()}
          className="w-full flex items-center gap-3 py-2.5 px-4 rounded-md transition-colors text-sm font-medium text-white/70 hover:bg-red-500/20 hover:text-red-200 text-left"
        >
          <LogOut className="h-5 w-5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
