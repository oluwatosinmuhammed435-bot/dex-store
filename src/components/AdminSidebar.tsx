import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  LayoutDashboard,
  Box,
  PlusSquare,
  List,
  Settings,
  ExternalLink,
  LogOut,
  X,
} from 'lucide-react';
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
      `flex items-center gap-3 py-2.5 px-3.5 rounded-xl text-sm font-medium transition-colors min-h-[44px] dex-press ${isActive
        ? 'bg-[#EAF5EE] text-[#123D2A] font-semibold border border-[#C6E5D2] shadow-2xs'
        : 'text-[#5C6B62] hover:bg-[#F7FAF8] hover:text-[#17231C] border border-transparent'
      }`
    }
  >
    <span className="shrink-0">{icon}</span>
    <span className="truncate">{label}</span>
  </NavLink>
);

export default function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const { signOut, user } = useAuth();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const navigationContent = (isMobile: boolean) => (
    <div className="flex flex-col h-full bg-[#FFFFFF] select-none overscroll-contain">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2EAE5]">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 bg-[#176B45] text-[#FFFFFF] rounded-xl flex items-center justify-center font-display font-bold text-base shadow-2xs">
            D
          </div>
          <div>
            <h1 className="text-base font-extrabold text-[#123D2A] tracking-tight leading-none">
              DEX STORES
            </h1>
            <p className="text-[11px] text-[#176B45] font-semibold mt-0.5">
              Store Manager
            </p>
          </div>
        </div>

        {isMobile && (
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-2 rounded-xl text-[#5C6B62] hover:text-[#17231C] hover:bg-[#EAF5EE] min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors dex-press"
            aria-label="Close navigation drawer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav aria-label="Admin sidebar navigation" className="flex-1 flex flex-col gap-1 p-3 overflow-y-auto">
        <div className="px-3.5 py-1.5 text-[10px] font-bold text-[#7B8A80] uppercase tracking-wider">
          Operations
        </div>
        <NavItem
          to="/admin"
          end
          icon={<LayoutDashboard className="h-4 w-4 text-[#176B45]" aria-hidden="true" />}
          label="Overview"
          onClick={isMobile ? onClose : undefined}
        />
        <NavItem
          to="/admin/products"
          end
          icon={<Box className="h-4 w-4 text-[#176B45]" aria-hidden="true" />}
          label="Products"
          onClick={isMobile ? onClose : undefined}
        />
        <NavItem
          to="/admin/products/new"
          icon={<PlusSquare className="h-4 w-4 text-[#176B45]" aria-hidden="true" />}
          label="Add Product"
          onClick={isMobile ? onClose : undefined}
        />
        <NavItem
          to="/admin/categories"
          icon={<List className="h-4 w-4 text-[#176B45]" aria-hidden="true" />}
          label="Categories"
          onClick={isMobile ? onClose : undefined}
        />
        <NavItem
          to="/admin/settings"
          icon={<Settings className="h-4 w-4 text-[#176B45]" aria-hidden="true" />}
          label="Store Settings"
          onClick={isMobile ? onClose : undefined}
        />
      </nav>

      {/* Account Footer */}
      <div className="p-3 border-t border-[#E2EAE5] space-y-1.5 bg-[#F7FAF8] pb-safe-bottom">
        {user?.email && (
          <div className="px-3.5 py-2.5 text-xs rounded-xl bg-[#FFFFFF] border border-[#E2EAE5] mb-1">
            <span className="block text-[10px] text-[#7B8A80] uppercase font-semibold">
              Signed in
            </span>
            <span className="text-[#17231C] font-semibold truncate block mt-0.5">
              {user.email}
            </span>
            <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] bg-[#EAF5EE] text-[#123D2A] px-2 py-0.5 rounded-full font-semibold border border-[#C6E5D2]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#279B62]" aria-hidden="true" />
              Verified Admin
            </span>
          </div>
        )}

        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 py-2.5 px-3.5 rounded-xl text-sm font-medium text-[#123D2A] hover:bg-[#FFFFFF] border border-transparent hover:border-[#E2EAE5] transition-colors min-h-[44px] dex-press"
        >
          <ExternalLink className="h-4 w-4 text-[#176B45]" aria-hidden="true" />
          <span>View Storefront</span>
        </a>

        <button
          type="button"
          onClick={() => {
            if (isMobile) onClose();
            signOut();
          }}
          className="w-full flex items-center gap-2.5 py-2.5 px-3.5 rounded-xl text-sm font-medium text-red-700 hover:bg-red-50 transition-colors text-left min-h-[44px] dex-press"
        >
          <LogOut className="h-4 w-4 text-red-600" aria-hidden="true" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 bg-[#FFFFFF] border-r border-[#E2EAE5] sticky top-0 h-dvh overflow-hidden">
        {navigationContent(false)}
      </aside>

      {/* Mobile Navigation Drawer */}
      <AnimatePresence>
        {isOpen && (
          <div
            className="fixed inset-0 z-50 lg:hidden flex"
            role="dialog"
            aria-modal="true"
            aria-label="Admin navigation drawer"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={onClose}
              className="fixed inset-0 bg-[#0E3021]/45 backdrop-blur-[2px] overscroll-contain"
              aria-hidden="true"
            />

            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 36 }}
              className="relative w-[285px] max-w-[85vw] h-full bg-[#FFFFFF] shadow-2xl border-r border-[#E2EAE5] flex flex-col"
            >
              {navigationContent(true)}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
