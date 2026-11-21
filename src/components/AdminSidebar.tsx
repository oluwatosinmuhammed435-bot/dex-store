import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Box, PlusSquare, List, Settings, ExternalLink, LogOut, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const NavItem: React.FC<{
  to: string;
  icon: React.ReactNode;
  label: string;
  end?: boolean;
  onClick?: () => void;
}> = ({ to, icon, label, end = false, onClick }) => (
  <NavLink
    to={to}
    end={end}
    onClick={onClick}
    className={({ isActive }) =>
      `flex items-center gap-3 py-2.5 px-3.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
        isActive
          ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
          : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
      }`
    }
  >
    <span className="shrink-0">{icon}</span>
    <span className="truncate">{label}</span>
  </NavLink>
);

export default function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const { signOut, user } = useAuth();

  // Close drawer on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scrolling when mobile drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const navigationContent = (
    <div className="flex flex-col h-full bg-white select-none">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/80">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-base shadow-xs">
            D
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight leading-none">DEX STORES</h1>
            <p className="text-[11px] text-blue-600 font-medium mt-0.5">Admin Management</p>
          </div>
        </div>

        {/* Mobile Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center transition"
          aria-label="Close navigation drawer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 flex flex-col gap-1 p-3 overflow-y-auto">
        <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Store Operations
        </div>
        <NavItem
          to="/admin"
          end
          icon={<LayoutDashboard className="h-4 w-4" />}
          label="Overview"
          onClick={onClose}
        />
        <NavItem
          to="/admin/products"
          icon={<Box className="h-4 w-4" />}
          label="Products"
          onClick={onClose}
        />
        <NavItem
          to="/admin/products/new"
          icon={<PlusSquare className="h-4 w-4" />}
          label="Add Product"
          onClick={onClose}
        />
        <NavItem
          to="/admin/categories"
          icon={<List className="h-4 w-4" />}
          label="Categories"
          onClick={onClose}
        />
        <NavItem
          to="/admin/settings"
          icon={<Settings className="h-4 w-4" />}
          label="Settings"
          onClick={onClose}
        />
      </nav>

      {/* User info and secondary actions */}
      <div className="p-3 border-t border-slate-200/80 space-y-1 bg-slate-50/50">
        {user?.email && (
          <div className="px-3.5 py-2 text-xs text-slate-500 rounded-md bg-white border border-slate-200/70 mb-2">
            <span className="block text-[10px] text-slate-400 uppercase font-medium">Logged in as</span>
            <span className="text-slate-800 font-medium truncate block mt-0.5">{user.email}</span>
            <span className="inline-block mt-1 text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-semibold border border-blue-100">
              Verified Administrator
            </span>
          </div>
        )}

        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 py-2.5 px-3.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-white hover:text-slate-900 border border-transparent hover:border-slate-200 transition min-h-[44px]"
        >
          <ExternalLink className="h-4 w-4 text-slate-400" />
          <span>View Public Storefront</span>
        </a>

        <button
          type="button"
          onClick={() => {
            onClose();
            signOut();
          }}
          className="w-full flex items-center gap-2.5 py-2.5 px-3.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition text-left min-h-[44px]"
        >
          <LogOut className="h-4 w-4 text-red-500" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 bg-white border-r border-slate-200/80 sticky top-0 h-screen overflow-hidden">
        {navigationContent}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-200"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer Panel */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-out lg:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Admin navigation drawer"
      >
        {navigationContent}
      </div>
    </>
  );
}
