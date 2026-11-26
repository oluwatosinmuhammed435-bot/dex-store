import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import AdminSidebar from '../components/AdminSidebar';
import AdminTopNav from '../components/AdminTopNav';

/**
 * Shell layout for protected DEX STORES administrator views.
 * Uses the unified light-green & white design system across desktop and mobile.
 */
export const AdminLayout: React.FC = () => {
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <div className="min-h-dvh bg-[#F7FAF8] text-[#17231C] flex flex-col lg:flex-row antialiased">
      {/* Unified Admin Sidebar (Desktop fixed rail + Mobile slide drawer) */}
      <AdminSidebar
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0 min-h-dvh">
        <AdminTopNav onOpenMenu={() => setIsMobileDrawerOpen(true)} />
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-safe-bottom">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
};
