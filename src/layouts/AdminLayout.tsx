import React from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
import AdminTopNav from '../components/AdminTopNav';

/**
 * Shell layout for protected administrator views.
 * Contains the fixed navigation sidebar and top bar.
 */
export const AdminLayout: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-[#F5FAF5] text-[#202923]">
      {/* Persistent Admin Sidebar */}
      <AdminSidebar />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0">
        <AdminTopNav />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
