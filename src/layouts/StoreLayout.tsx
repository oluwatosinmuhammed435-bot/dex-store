import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { CartDrawer } from '../components/CartDrawer';
import { MobileBottomNav } from '../components/MobileBottomNav';

export const StoreLayout: React.FC = () => {
  const { pathname } = useLocation();

  // Scroll to top only on route (pathname) change, not on search/filter param updates
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);

  return (
    <div className="min-h-dvh flex flex-col bg-[#FFFFFF] text-[#17231C]">
      <Navbar />
      <CartDrawer />
      <main className="flex-1">
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          <Outlet />
        </motion.div>
      </main>
      {/* Safe bottom clearance above fixed MobileBottomNav on mobile */}
      <div className="pb-[72px] md:pb-0 bg-[#0E3021]">
        <Footer />
      </div>
      <MobileBottomNav />
    </div>
  );
};
