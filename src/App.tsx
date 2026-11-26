import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { StoreDataProvider } from './context/StoreDataContext';
import { ToastProvider } from './context/ToastContext';
import { AdminGuard } from './components/AdminGuard';
import { AdminLayout } from './layouts/AdminLayout';
import { StoreLayout } from './layouts/StoreLayout';

// Storefront pages
import { HomePage } from './pages/HomePage';
import { CataloguePage } from './pages/CataloguePage';
import { ProductDetailsPage } from './pages/ProductDetailsPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { CartPage } from './pages/CartPage';
import { AboutPage } from './pages/AboutPage';
import { ContactPage } from './pages/ContactPage';

// Admin pages
import { AdminLogin } from './pages/admin/Login';
import { AdminDashboard } from './pages/admin/Dashboard';
import { AdminProducts } from './pages/admin/Products';
import { AdminProductForm } from './pages/admin/ProductForm';
import { AdminCategories } from './pages/admin/Categories';
import { AdminSettings } from './pages/admin/Settings';

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <ToastProvider>
        <AuthProvider>
          <StoreDataProvider>
            <CartProvider>
              <BrowserRouter>
                <Routes>
                  {/* Public Admin Login Route */}
                  <Route path="/admin/login" element={<AdminLogin />} />

                  {/* Protected Admin Routes — Guarded by Auth & app_metadata role */}
                  <Route element={<AdminGuard />}>
                    <Route element={<AdminLayout />}>
                      <Route path="/admin" element={<AdminDashboard />} />
                      <Route path="/admin/products" element={<AdminProducts />} />
                      <Route path="/admin/products/new" element={<AdminProductForm />} />
                      <Route path="/admin/products/:id/edit" element={<AdminProductForm />} />
                      <Route path="/admin/categories" element={<AdminCategories />} />
                      <Route path="/admin/settings" element={<AdminSettings />} />
                    </Route>
                  </Route>

                  {/* Customer Storefront Routes */}
                  <Route element={<StoreLayout />}>
                    <Route index element={<HomePage />} />
                    <Route path="/shop" element={<CataloguePage />} />
                    <Route path="/categories" element={<CategoriesPage />} />
                    <Route path="/product/:slug" element={<ProductDetailsPage />} />
                    <Route path="/cart" element={<CartPage />} />
                    <Route path="/about" element={<AboutPage />} />
                    <Route path="/contact" element={<ContactPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Route>
                </Routes>
              </BrowserRouter>
            </CartProvider>
          </StoreDataProvider>
        </AuthProvider>
      </ToastProvider>
    </MotionConfig>
  );
}
