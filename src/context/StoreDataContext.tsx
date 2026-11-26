import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  CATEGORIES,
  PRODUCTS,
  STORE_CONFIG,
  type CategoryItem,
  type Product,
  type StoreConfig,
} from '../data/storeData';
import {
  fetchStorefrontCategories,
  fetchStorefrontProducts,
  fetchStoreSettings,
} from '../utils/productService';

interface StoreDataContextValue {
  products: Product[];
  categories: CategoryItem[];
  storeConfig: StoreConfig;
  isLoading: boolean;
  hasLiveProducts: boolean;
  hasLiveCategories: boolean;
  refreshStoreData: () => Promise<void>;
}

const StoreDataContext = createContext<StoreDataContextValue | undefined>(undefined);

export const StoreDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(() =>
    PRODUCTS.map((p) => ({ ...p, isActive: true, isSample: true }))
  );
  const [categories, setCategories] = useState<CategoryItem[]>(() =>
    CATEGORIES.map((c) => ({ ...c, isActive: true, isSample: true }))
  );
  const [storeConfig, setStoreConfig] = useState<StoreConfig>(STORE_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLiveProducts, setHasLiveProducts] = useState(false);
  const [hasLiveCategories, setHasLiveCategories] = useState(false);

  const refreshStoreData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedProducts, catResult, settingsResult] = await Promise.all([
        fetchStorefrontProducts(),
        fetchStorefrontCategories(),
        fetchStoreSettings(),
      ]);

      setProducts(fetchedProducts);
      setHasLiveProducts(fetchedProducts.some((p) => p.isSample === false));

      setCategories(catResult.categories);
      setHasLiveCategories(catResult.hasLiveCategories);

      setStoreConfig(settingsResult.config);
    } catch (err) {
      console.warn('Error hydrating StoreDataContext:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshStoreData();
  }, [refreshStoreData]);

  return (
    <StoreDataContext.Provider
      value={{
        products,
        categories,
        storeConfig,
        isLoading,
        hasLiveProducts,
        hasLiveCategories,
        refreshStoreData,
      }}
    >
      {children}
    </StoreDataContext.Provider>
  );
};

export function useStoreData(): StoreDataContextValue {
  const ctx = useContext(StoreDataContext);
  if (!ctx) {
    throw new Error('useStoreData must be used within a StoreDataProvider');
  }
  return ctx;
}
