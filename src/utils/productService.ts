import { supabase } from '../lib/supabase';
import { PRODUCTS, CATEGORIES, type Product, type AvailabilityStatus, type CategoryName, type CategorySlug } from '../data/storeData';

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

/**
 * Maps a raw database product row from Supabase to the application's Product interface.
 * Normalizes image_url -> image, price_ngn -> priceNgn, gallery text[] -> object array,
 * and category relations.
 */
export function mapDatabaseProductToProduct(
  row: DatabaseProductRow,
  categoriesList?: { id: string; name: string; slug: string }[]
): Product {
  // Resolve category name and slug
  let catName: CategoryName | string = 'Other Products';
  let catSlug: CategorySlug | string = 'other-products';

  if (row.categories?.name) {
    catName = row.categories.name as CategoryName;
    catSlug = (row.categories.slug || 'other-products') as CategorySlug;
  } else if (row.category_id && categoriesList) {
    const found = categoriesList.find((c) => c.id === row.category_id);
    if (found) {
      catName = found.name as CategoryName;
      catSlug = found.slug as CategorySlug;
    }
  }

  // Resolve primary image URL
  const primaryImage =
    row.image_url ||
    (Array.isArray(row.gallery) && row.gallery.length > 0
      ? typeof row.gallery[0] === 'string'
        ? row.gallery[0]
        : (row.gallery[0] as any)?.url
      : '') ||
    '';

  // Normalize gallery: handle text[] from Supabase or object[]
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

  // Normalize specifications
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
    rawAvailability === 'In Stock' || rawAvailability === 'Available on Order' || rawAvailability === 'Out of Stock'
      ? rawAvailability
      : stock > 0
      ? 'In Stock'
      : 'Out of Stock';

  return {
    id: row.id,
    slug: row.slug,
    reference: row.reference || `DEX-PRD-${row.id.slice(0, 4).toUpperCase()}`,
    name: row.name,
    category: catName as CategoryName,
    categorySlug: catSlug as CategorySlug,
    priceNgn: Number(row.price_ngn) || 0,
    availability: validAvailability,
    featured: Boolean(row.featured),
    recentlyAdded: true,
    createdAtOrder: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    shortDescription: row.description?.slice(0, 120) || '',
    description: row.description || '',
    image: primaryImage,
    gallery,
    specifications: specs,
  };
}

/**
 * Fetches all active storefront products from Supabase.
 * If live products exist, returns them merged with static sample products
 * (so sample items remain visible while building the catalogue).
 */
export async function fetchStorefrontProducts(): Promise<Product[]> {
  try {
    const { data: dbRows, error } = await supabase
      .from('products')
      .select('*, categories(id, name, slug)')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error || !dbRows || dbRows.length === 0) {
      return PRODUCTS;
    }

    const liveProducts = dbRows.map((row) => mapDatabaseProductToProduct(row));

    // Combine live products with sample products (ensuring live products take precedence)
    const liveSlugs = new Set(liveProducts.map((p) => p.slug));
    const supplementalSamples = PRODUCTS.filter((p) => !liveSlugs.has(p.slug));

    return [...liveProducts, ...supplementalSamples];
  } catch (err) {
    console.warn('Could not retrieve products from Supabase, using local defaults:', err);
    return PRODUCTS;
  }
}

/**
 * Fetches a single product by slug, checking Supabase first, then falling back to sample products.
 */
export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*, categories(id, name, slug)')
      .eq('slug', slug)
      .maybeSingle();

    if (!error && data) {
      return mapDatabaseProductToProduct(data);
    }
  } catch (err) {
    console.warn(`Error fetching product with slug "${slug}" from Supabase:`, err);
  }

  // Fallback to sample static products
  return PRODUCTS.find((p) => p.slug === slug || p.id === slug) ?? null;
}

/**
 * Fetches all products for the admin panel (including inactive/drafts).
 */
export async function fetchAdminProductsList(): Promise<{
  liveProducts: Product[];
  allProducts: Product[];
}> {
  try {
    const { data: dbRows, error } = await supabase
      .from('products')
      .select('*, categories(id, name, slug)')
      .order('created_at', { ascending: false });

    if (!error && dbRows && dbRows.length > 0) {
      const live = dbRows.map((row) => mapDatabaseProductToProduct(row));
      return {
        liveProducts: live,
        allProducts: live,
      };
    }
  } catch (err) {
    console.warn('Admin: Could not fetch products from Supabase:', err);
  }

  return {
    liveProducts: [],
    allProducts: PRODUCTS,
  };
}

/**
 * Deletes a product from Supabase.
 */
export async function deleteProductRecord(productId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('products').delete().eq('id', productId);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown deletion error';
    return { success: false, error: msg };
  }
}
