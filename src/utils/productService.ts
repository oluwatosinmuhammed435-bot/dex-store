import { supabase } from '../lib/supabase';
import {
  PRODUCTS,
  CATEGORIES,
  STORE_CONFIG,
  type Product,
  type CategoryItem,
  type StoreConfig,
  type AvailabilityStatus,
  type CategoryName,
  type CategorySlug,
} from '../data/storeData';

export interface DatabaseProductRow {
  id: string;
  name: string;
  slug: string;
  reference?: string | null;
  category_id?: string | null;
  price_ngn: number | string;
  stock_quantity?: number | null;
  availability?: string | null;
  featured?: boolean | null;
  description?: string | null;
  image_url?: string | null;
  gallery?: string[] | { url: string; caption?: string }[] | null;
  specifications?: Record<string, any> | { label: string; value: string }[] | null;
  is_active?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  categories?: {
    id?: string;
    name?: string;
    slug?: string;
  } | null;
}

export interface DatabaseCategoryRow {
  id: string;
  name: string;
  slug: string;
  image_url?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
}

/**
 * Extracts Supabase Storage object path inside `product-images` from a full public URL.
 */
export function extractStorageObjectPath(publicUrl: string): string | null {
  if (!publicUrl || !publicUrl.includes('/product-images/')) return null;
  const parts = publicUrl.split('/product-images/');
  if (parts.length < 2) return null;
  return decodeURIComponent(parts[1].split('?')[0]);
}

/**
 * Maps a raw database category row to the storefront CategoryItem shape.
 */
export function mapDatabaseCategoryToItem(row: DatabaseCategoryRow): CategoryItem {
  const seedMatch = CATEGORIES.find((c) => c.slug === row.slug);
  return {
    id: row.id,
    slug: row.slug as CategorySlug,
    name: row.name as CategoryName,
    shortDescription:
      seedMatch?.shortDescription ||
      `Explore quality ${row.name} products curated for direct ordering from DEX STORES.`,
    editorialSummary:
      seedMatch?.editorialSummary ||
      `Browse available ${row.name} hardware, accessories, and ready-to-order listings.`,
    image: row.image_url || seedMatch?.image || '',
    highlights: seedMatch?.highlights || [`Verified ${row.name}`, 'Direct WhatsApp Order Support'],
    isActive: row.is_active !== false,
    isSample: false,
  };
}

/**
 * Maps a raw database product row from Supabase to the application's Product interface.
 */
export function mapDatabaseProductToProduct(
  row: DatabaseProductRow,
  categoriesList?: { id: string; name: string; slug: string }[]
): Product {
  let catName: CategoryName = 'Other Products';
  let catSlug: CategorySlug = 'other-products';

  if (row.categories?.name) {
    catName = row.categories.name;
    catSlug = row.categories.slug || 'other-products';
  } else if (row.category_id && categoriesList) {
    const found = categoriesList.find((c) => c.id === row.category_id);
    if (found) {
      catName = found.name;
      catSlug = found.slug;
    }
  }

  const primaryImage =
    row.image_url ||
    (Array.isArray(row.gallery) && row.gallery.length > 0
      ? typeof row.gallery[0] === 'string'
        ? row.gallery[0]
        : (row.gallery[0] as any)?.url
      : '') ||
    '';

  const rawGallery = Array.isArray(row.gallery) ? row.gallery : [];
  const gallery: { url: string; caption: string }[] =
    rawGallery.length > 0
      ? rawGallery
          .map((item, idx) => {
            if (typeof item === 'string') {
              return { url: item, caption: `${row.name} view ${idx + 1}` };
            }
            if (item && typeof item === 'object' && 'url' in item) {
              return {
                url: String((item as any).url || ''),
                caption: String((item as any).caption || `${row.name} view ${idx + 1}`),
              };
            }
            return null;
          })
          .filter((item): item is { url: string; caption: string } => Boolean(item && item.url))
      : primaryImage
      ? [{ url: primaryImage, caption: row.name }]
      : [];

  let specs: { label: string; value: string }[] = [];
  if (Array.isArray(row.specifications)) {
    specs = row.specifications.filter((s) => s && s.label && s.value);
  } else if (row.specifications && typeof row.specifications === 'object') {
    specs = Object.entries(row.specifications).map(([label, value]) => ({
      label,
      value: String(value ?? ''),
    }));
  }

  const stock = typeof row.stock_quantity === 'number' ? row.stock_quantity : 0;
  const rawAvailability = row.availability || (stock > 0 ? 'In Stock' : 'Out of Stock');
  const validAvailability: AvailabilityStatus =
    rawAvailability === 'In Stock' ||
    rawAvailability === 'Available on Order' ||
    rawAvailability === 'Out of Stock'
      ? rawAvailability
      : stock > 0
      ? 'In Stock'
      : 'Out of Stock';

  return {
    id: row.id,
    slug: row.slug,
    reference: row.reference || `DEX-PRD-${row.id.slice(0, 4).toUpperCase()}`,
    name: row.name,
    category: catName,
    categorySlug: catSlug,
    categoryId: row.category_id ?? row.categories?.id ?? null,
    priceNgn: Number(row.price_ngn) || 0,
    stockQuantity: stock,
    availability: validAvailability,
    featured: Boolean(row.featured),
    recentlyAdded: true,
    isActive: row.is_active !== false,
    isSample: false,
    createdAtOrder: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    updatedAt: row.updated_at ?? null,
    shortDescription: row.description?.slice(0, 120) || '',
    description: row.description || '',
    image: primaryImage,
    gallery,
    specifications: specs,
  };
}

/**
 * Fetches active storefront categories from Supabase, falling back to sample categories if DB is empty.
 */
export async function fetchStorefrontCategories(): Promise<{
  categories: CategoryItem[];
  hasLiveCategories: boolean;
}> {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (!error && data && data.length > 0) {
      return {
        categories: data.map(mapDatabaseCategoryToItem),
        hasLiveCategories: true,
      };
    }
  } catch (err) {
    console.warn('Could not load categories from Supabase, using defaults:', err);
  }

  return {
    categories: CATEGORIES.map((c) => ({ ...c, isActive: true, isSample: true })),
    hasLiveCategories: false,
  };
}

/**
 * Fetches active storefront products from Supabase.
 * When live products exist in DB, serves strictly live DB inventory (avoiding mixing fake demo products).
 * Falls back to static sample catalogue only while database has 0 published products.
 */
export async function fetchStorefrontProducts(): Promise<Product[]> {
  try {
    const { data: dbRows, error } = await supabase
      .from('products')
      .select('*, categories(id, name, slug)')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (!error && dbRows && dbRows.length > 0) {
      return dbRows.map((row) => mapDatabaseProductToProduct(row));
    }
  } catch (err) {
    console.warn('Could not retrieve products from Supabase, using local defaults:', err);
  }

  return PRODUCTS.map((p) => ({ ...p, isActive: true, isSample: true }));
}

/**
 * Fetches a single product by slug or UUID for detail view or admin edit view.
 */
export async function fetchProductBySlug(slugOrId: string): Promise<Product | null> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);

  try {
    const query = supabase.from('products').select('*, categories(id, name, slug)');

    const { data, error } = isUuid
      ? await query.eq('id', slugOrId).maybeSingle()
      : await query.eq('slug', slugOrId).maybeSingle();

    if (!error && data) {
      return mapDatabaseProductToProduct(data);
    }
  } catch (err) {
    console.warn(`Error fetching product "${slugOrId}" from Supabase:`, err);
  }

  const fallback = PRODUCTS.find((p) => p.slug === slugOrId || p.id === slugOrId);
  return fallback ? { ...fallback, isActive: true, isSample: true } : null;
}

/**
 * Fetches real products from Supabase for the Admin panel (including unpublished drafts).
 * Returns live database rows directly without masking an empty DB behind fake mock items.
 */
export async function fetchAdminProductsList(): Promise<{
  liveProducts: Product[];
  allProducts: Product[];
  error?: string;
}> {
  try {
    const { data: dbRows, error } = await supabase
      .from('products')
      .select('*, categories(id, name, slug)')
      .order('created_at', { ascending: false });

    if (error) {
      return {
        liveProducts: [],
        allProducts: [],
        error: error.message,
      };
    }

    const live = (dbRows || []).map((row) => mapDatabaseProductToProduct(row));
    return {
      liveProducts: live,
      allProducts: live,
    };
  } catch (err) {
    return {
      liveProducts: [],
      allProducts: [],
      error: err instanceof Error ? err.message : 'Network error fetching products',
    };
  }
}

/**
 * Updates product fields with optional optimistic concurrency guard on `updated_at`.
 * Rejects stale overwrites cleanly if another session modified or deleted the row.
 */
export async function updateProductRecord(
  productId: string,
  updates: Partial<{
    name: string;
    slug: string;
    reference: string;
    category_id: string | null;
    price_ngn: number;
    stock_quantity: number;
    availability: string;
    featured: boolean;
    description: string | null;
    image_url: string | null;
    gallery: string[];
    specifications: Record<string, any> | { label: string; value: string }[];
    is_active: boolean;
  }>,
  expectedUpdatedAt?: string | null
): Promise<{ success: boolean; conflict?: boolean; updatedAt?: string; error?: string }> {
  try {
    const nextUpdatedAt = new Date().toISOString();
    let query = supabase
      .from('products')
      .update({
        ...updates,
        updated_at: nextUpdatedAt,
      })
      .eq('id', productId);

    if (expectedUpdatedAt) {
      query = query.eq('updated_at', expectedUpdatedAt);
    }

    const { data, error } = await query.select('id, updated_at');

    if (error) {
      if (error.code === '23505') {
        return {
          success: false,
          error: 'A product with that reference or slug already exists. Use a unique reference code.',
        };
      }
      return { success: false, error: error.message };
    }

    if (!data || data.length === 0) {
      return {
        success: false,
        conflict: true,
        error:
          'This product was modified or deleted in another session. Please refresh to get the latest state.',
      };
    }

    return {
      success: true,
      updatedAt: data[0].updated_at ?? nextUpdatedAt,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update product',
    };
  }
}

/**
 * Deletes a product from Supabase and cleans up its uploaded storage variants.
 */
export async function deleteProductRecord(
  productId: string,
  imageUrlsToCleanup: string[] = []
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId)
      .select('id');

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data || data.length === 0) {
      return {
        success: false,
        error: 'Product not found or already deleted.',
      };
    }

    const storagePaths = Array.from(
      new Set(
        imageUrlsToCleanup
          .map(extractStorageObjectPath)
          .filter((p): p is string => Boolean(p))
      )
    );

    if (storagePaths.length > 0) {
      await supabase.storage.from('product-images').remove(storagePaths);
    }

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown deletion error';
    return { success: false, error: msg };
  }
}

/**
 * Fetches singleton store settings from Supabase with fallback to STORE_CONFIG.
 */
export async function fetchStoreSettings(): Promise<{
  config: StoreConfig;
  rowId: boolean | string | null;
  updatedAt: string | null;
  isLive: boolean;
}> {
  try {
    const { data, error } = await supabase
      .from('store_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      const cleanNumber = String(data.whatsapp_number || STORE_CONFIG.whatsappNumber).replace(
        /[^0-9]/g,
        ''
      );
      const hoursText =
        typeof data.business_hours === 'string'
          ? data.business_hours
          : typeof data.business_hours === 'object' && data.business_hours !== null
          ? data.business_hours.display || data.business_hours.text || JSON.stringify(data.business_hours)
          : STORE_CONFIG.businessHoursPlaceholder;

      return {
        config: {
          brandName: data.brand_name || STORE_CONFIG.brandName,
          tagline: data.tagline || STORE_CONFIG.tagline,
          whatsappNumber: cleanNumber || STORE_CONFIG.whatsappNumber,
          whatsappDisplayPlaceholder:
            data.whatsapp_display || `+${cleanNumber}` || STORE_CONFIG.whatsappDisplayPlaceholder,
          emailPlaceholder: data.email || STORE_CONFIG.emailPlaceholder,
          addressPlaceholder: data.address || STORE_CONFIG.addressPlaceholder,
          businessHoursPlaceholder: hoursText || STORE_CONFIG.businessHoursPlaceholder,
          sampleInventoryNotice:
            data.sample_inventory_notice ?? STORE_CONFIG.sampleInventoryNotice,
        },
        rowId: data.id ?? null,
        updatedAt: data.updated_at ?? null,
        isLive: true,
      };
    }
  } catch (err) {
    console.warn('Could not load store_settings from Supabase, using defaults:', err);
  }

  return {
    config: STORE_CONFIG,
    rowId: null,
    updatedAt: null,
    isLive: false,
  };
}

/**
 * Saves store settings into Supabase `store_settings` with optimistic concurrency check.
 */
export async function saveStoreSettingsRecord(
  payload: {
    brand_name: string;
    tagline: string;
    whatsapp_number: string;
    email: string;
    address: string;
    business_hours: string;
  },
  existingRowId: boolean | string | null,
  expectedUpdatedAt?: string | null
): Promise<{
  success: boolean;
  conflict?: boolean;
  rowId?: boolean | string;
  updatedAt?: string;
  error?: string;
}> {
  try {
    const normalizedHours = { display: payload.business_hours };
    const cleanPhone = payload.whatsapp_number.replace(/[^0-9]/g, '');
    const nextUpdatedAt = new Date().toISOString();

    if (existingRowId !== null) {
      let query = supabase
        .from('store_settings')
        .update({
          brand_name: payload.brand_name,
          tagline: payload.tagline,
          whatsapp_number: cleanPhone,
          email: payload.email,
          address: payload.address,
          business_hours: normalizedHours,
          updated_at: nextUpdatedAt,
        })
        .eq('id', existingRowId);

      if (expectedUpdatedAt) {
        query = query.eq('updated_at', expectedUpdatedAt);
      }

      const { data, error } = await query.select('id, updated_at');

      if (!error) {
        if (!data || data.length === 0) {
          return {
            success: false,
            conflict: true,
            error: 'Store settings were updated in another session. Please refresh before saving.',
          };
        }
        return {
          success: true,
          rowId: existingRowId,
          updatedAt: data[0].updated_at ?? nextUpdatedAt,
        };
      }

      // Retry with string business_hours if DB column uses text
      let retryQuery = supabase
        .from('store_settings')
        .update({
          brand_name: payload.brand_name,
          tagline: payload.tagline,
          whatsapp_number: cleanPhone,
          email: payload.email,
          address: payload.address,
          business_hours: payload.business_hours as any,
          updated_at: nextUpdatedAt,
        })
        .eq('id', existingRowId);

      if (expectedUpdatedAt) {
        retryQuery = retryQuery.eq('updated_at', expectedUpdatedAt);
      }

      const retry = await retryQuery.select('id, updated_at');
      if (!retry.error) {
        if (!retry.data || retry.data.length === 0) {
          return {
            success: false,
            conflict: true,
            error: 'Store settings were updated in another session. Please refresh before saving.',
          };
        }
        return {
          success: true,
          rowId: existingRowId,
          updatedAt: retry.data[0].updated_at ?? nextUpdatedAt,
        };
      }
      return { success: false, error: retry.error.message };
    }

    const initialAttempts: Array<{ row: Record<string, unknown>; useUpsert?: boolean }> = [
      {
        useUpsert: true,
        row: {
          id: true,
          brand_name: payload.brand_name,
          tagline: payload.tagline,
          whatsapp_number: cleanPhone,
          email: payload.email,
          address: payload.address,
          business_hours: normalizedHours,
          updated_at: nextUpdatedAt,
        },
      },
      {
        useUpsert: true,
        row: {
          id: true,
          brand_name: payload.brand_name,
          tagline: payload.tagline,
          whatsapp_number: cleanPhone,
          email: payload.email,
          address: payload.address,
          business_hours: payload.business_hours,
          updated_at: nextUpdatedAt,
        },
      },
      {
        useUpsert: true,
        row: {
          id: 'singleton',
          brand_name: payload.brand_name,
          tagline: payload.tagline,
          whatsapp_number: cleanPhone,
          email: payload.email,
          address: payload.address,
          business_hours: normalizedHours,
          updated_at: nextUpdatedAt,
        },
      },
      {
        useUpsert: true,
        row: {
          id: 'singleton',
          brand_name: payload.brand_name,
          tagline: payload.tagline,
          whatsapp_number: cleanPhone,
          email: payload.email,
          address: payload.address,
          business_hours: payload.business_hours,
          updated_at: nextUpdatedAt,
        },
      },
      {
        useUpsert: false,
        row: {
          brand_name: payload.brand_name,
          tagline: payload.tagline,
          whatsapp_number: cleanPhone,
          email: payload.email,
          address: payload.address,
          business_hours: normalizedHours,
          updated_at: nextUpdatedAt,
        },
      },
    ];

    let lastError = 'Could not save store settings.';
    for (const attempt of initialAttempts) {
      const op = attempt.useUpsert
        ? supabase.from('store_settings').upsert(attempt.row)
        : supabase.from('store_settings').insert(attempt.row);

      const { data, error } = await op.select('id, updated_at').maybeSingle();
      if (!error) {
        return {
          success: true,
          rowId: data?.id ?? (attempt.row.id as boolean | string | undefined) ?? true,
          updatedAt: data?.updated_at ?? nextUpdatedAt,
        };
      }
      lastError = error.message;
    }

    return { success: false, error: lastError };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to save store settings',
    };
  }
}

/**
 * Safely and idempotently initializes `public.store_settings` with default store
 * metadata when the authenticated administrator logs into an empty database.
 * Never overwrites an existing settings row.
 */
export async function ensureStoreSettingsInitialized(): Promise<{
  created: boolean;
  alreadyExists?: boolean;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.from('store_settings').select('id').limit(1);
    if (error) {
      return { created: false, error: error.message };
    }
    if (data && data.length > 0) {
      return { created: false, alreadyExists: true };
    }

    const res = await saveStoreSettingsRecord(
      {
        brand_name: STORE_CONFIG.brandName,
        tagline: STORE_CONFIG.tagline,
        whatsapp_number: STORE_CONFIG.whatsappNumber,
        email: STORE_CONFIG.emailPlaceholder,
        address: STORE_CONFIG.addressPlaceholder,
        business_hours: STORE_CONFIG.businessHoursPlaceholder,
      },
      null
    );

    if (!res.success) {
      return { created: false, error: res.error };
    }
    return { created: true };
  } catch (err) {
    return {
      created: false,
      error: err instanceof Error ? err.message : 'Could not initialize store settings',
    };
  }
}
