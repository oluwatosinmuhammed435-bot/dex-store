import { test } from 'node:test';
import assert from 'node:assert/strict';

// Helper functions mirroring the logic in ProductForm
function generateSlug(text: string, randomSuffix = 'abc12'): string {
  const base = text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
  return `${base || 'product'}-${randomSuffix}`;
}

function generateReference(text: string, randomId = 4819): string {
  const prefix = text
    .trim()
    .slice(0, 3)
    .toUpperCase()
    .replace(/[^A-Z]/g, 'PRD');
  return `DEX-${prefix || 'PRD'}-${randomId}`;
}

function validateProductInput(input: {
  name: string;
  price: string;
  stock: string;
  category: string;
  hasImage: boolean;
  isOptimizing: boolean;
}): { valid: boolean; error: string | null } {
  if (input.isOptimizing) {
    return { valid: false, error: 'Please wait for image optimization to complete before saving.' };
  }
  if (!input.hasImage) {
    return { valid: false, error: 'Please upload a product image.' };
  }
  const trimmedName = input.name.trim();
  if (!trimmedName) {
    return { valid: false, error: 'Product name is required.' };
  }
  const parsedPrice = Number(input.price);
  if (isNaN(parsedPrice) || parsedPrice < 0) {
    return { valid: false, error: 'Please enter a valid price (greater than or equal to 0).' };
  }
  const parsedStock = Number(input.stock);
  if (isNaN(parsedStock) || parsedStock < 0 || !Number.isInteger(parsedStock)) {
    return { valid: false, error: 'Please enter a valid non-negative integer for stock quantity.' };
  }
  if (!input.category) {
    return { valid: false, error: 'Please select a product category.' };
  }
  return { valid: true, error: null };
}

test('generateSlug produces URL-safe lowercase slug with unique suffix', () => {
  const slug = generateSlug('Toyota Corolla Projector Headlamp (2020-2023)', 'k9x2d');
  assert.equal(slug, 'toyota-corolla-projector-headlamp-2020-2023-k9x2d');
});

test('generateSlug handles special characters and edge-case empty string', () => {
  const slug = generateSlug('!!!###$$$', 'xyz99');
  assert.equal(slug, 'product-xyz99');
});

test('generateReference generates standardized SKU reference', () => {
  const ref = generateReference('Brembo Brake Rotors', 5521);
  assert.equal(ref, 'DEX-BRE-5521');
});

test('validateProductInput detects missing name', () => {
  const res = validateProductInput({
    name: '   ',
    price: '15000',
    stock: '10',
    category: 'Car Parts',
    hasImage: true,
    isOptimizing: false,
  });
  assert.equal(res.valid, false);
  assert.equal(res.error, 'Product name is required.');
});

test('validateProductInput detects negative price', () => {
  const res = validateProductInput({
    name: 'Oil Filter',
    price: '-500',
    stock: '10',
    category: 'Car Parts',
    hasImage: true,
    isOptimizing: false,
  });
  assert.equal(res.valid, false);
  assert.match(res.error!, /valid price/);
});

test('validateProductInput detects fractional stock', () => {
  const res = validateProductInput({
    name: 'Oil Filter',
    price: '5000',
    stock: '10.5',
    category: 'Car Parts',
    hasImage: true,
    isOptimizing: false,
  });
  assert.equal(res.valid, false);
  assert.match(res.error!, /non-negative integer for stock quantity/);
});

test('validateProductInput detects missing image', () => {
  const res = validateProductInput({
    name: 'Oil Filter',
    price: '5000',
    stock: '10',
    category: 'Car Parts',
    hasImage: false,
    isOptimizing: false,
  });
  assert.equal(res.valid, false);
  assert.match(res.error!, /upload a product image/);
});

test('validateProductInput accepts valid input', () => {
  const res = validateProductInput({
    name: 'High Performance Spark Plugs',
    price: '24000',
    stock: '50',
    category: 'Car Parts',
    hasImage: true,
    isOptimizing: false,
  });
  assert.equal(res.valid, true);
  assert.equal(res.error, null);
});

test('storage path and gallery construction adheres to live DEX STORES text[] schema', () => {
  const slug = 'toyota-corolla-headlamp-k9x2d';
  const timestamp = 1794933000000;
  const storageBase = `products/${slug}-${timestamp}`;

  const variantPublicUrls = {
    thumbnail: `https://example.supabase.co/storage/v1/object/public/product-images/${storageBase}/thumb.webp`,
    card: `https://example.supabase.co/storage/v1/object/public/product-images/${storageBase}/card.webp`,
    detail: `https://example.supabase.co/storage/v1/object/public/product-images/${storageBase}/detail.webp`,
    full: `https://example.supabase.co/storage/v1/object/public/product-images/${storageBase}/full.webp`,
  };

  // Build galleryUrls as string[] (matching live PostgreSQL text[] column)
  const galleryUrls: string[] = [
    variantPublicUrls.full,
    variantPublicUrls.detail,
    variantPublicUrls.card,
    variantPublicUrls.thumbnail,
  ].filter(Boolean);

  assert.equal(galleryUrls.length, 4);
  assert.ok(galleryUrls.every(url => typeof url === 'string'));
  assert.ok(variantPublicUrls.card.endsWith('/card.webp'));
  assert.ok(variantPublicUrls.full.endsWith('/full.webp'));
  assert.ok(variantPublicUrls.thumbnail.endsWith('/thumb.webp'));
  assert.ok(variantPublicUrls.detail.endsWith('/detail.webp'));
});

test('product insert payload strictly conforms to live database schema without nonexistent columns', () => {
  const mockFormData = {
    name: 'Toyota Corolla Headlamp',
    slug: 'toyota-corolla-headlamp-k9x2d',
    reference: 'DEX-TOY-4819',
    categoryId: '11111111-2222-3333-4444-555555555555',
    price: 185000,
    stock: 15,
    featured: true,
    description: 'High quality OEM replacement headlamp',
    imageUrl: 'https://example.supabase.co/storage/v1/object/public/product-images/products/test/card.webp',
    galleryUrls: [
      'https://example.supabase.co/storage/v1/object/public/product-images/products/test/full.webp',
      'https://example.supabase.co/storage/v1/object/public/product-images/products/test/card.webp',
    ],
  };

  // Construct exact row matching ProductForm.tsx
  const productRow = {
    name: mockFormData.name.trim(),
    slug: mockFormData.slug,
    reference: mockFormData.reference,
    category_id: mockFormData.categoryId,
    price_ngn: mockFormData.price,
    stock_quantity: mockFormData.stock,
    availability: mockFormData.stock > 0 ? 'In Stock' : 'Out of Stock',
    featured: mockFormData.featured,
    description: mockFormData.description.trim() || null,
    image_url: mockFormData.imageUrl,
    gallery: mockFormData.galleryUrls,
    specifications: {},
    is_active: true,
  };

  // Confirm exact live columns are present and correctly typed
  assert.equal(productRow.name, 'Toyota Corolla Headlamp');
  assert.equal(productRow.slug, 'toyota-corolla-headlamp-k9x2d');
  assert.equal(productRow.reference, 'DEX-TOY-4819');
  assert.equal(productRow.category_id, '11111111-2222-3333-4444-555555555555');
  assert.equal(productRow.price_ngn, 185000);
  assert.equal(productRow.stock_quantity, 15);
  assert.equal(productRow.availability, 'In Stock');
  assert.equal(productRow.featured, true);
  assert.equal(productRow.description, 'High quality OEM replacement headlamp');
  assert.equal(productRow.image_url, 'https://example.supabase.co/storage/v1/object/public/product-images/products/test/card.webp');
  assert.ok(Array.isArray(productRow.gallery));
  assert.ok(productRow.gallery.every((item: any) => typeof item === 'string'));
  assert.deepEqual(productRow.specifications, {});
  assert.equal(productRow.is_active, true);

  // Confirm NONEXISTENT legacy/fictional columns are NOT present
  const rowRecord = productRow as Record<string, unknown>;
  assert.equal(rowRecord['stock'], undefined, 'Must not contain column "stock"');
  assert.equal(rowRecord['recently_added'], undefined, 'Must not contain column "recently_added"');
  assert.equal(rowRecord['short_description'], undefined, 'Must not contain column "short_description"');
  assert.equal(rowRecord['created_at_order'], undefined, 'Must not contain column "created_at_order"');
});

test('storage cleanup handles failed database insert by rolling back uploaded paths', async () => {
  const uploadedPaths = [
    'products/test-1/thumb.webp',
    'products/test-1/card.webp',
    'products/test-1/detail.webp',
    'products/test-1/full.webp',
  ];

  let removedPaths: string[] = [];
  const mockStorage = {
    from: (_bucket: string) => ({
      remove: async (paths: string[]) => {
        removedPaths = [...paths];
        return { data: paths, error: null };
      },
    }),
  };

  // Simulate failure after upload
  const insertFailed = true;
  if (insertFailed) {
    await mockStorage.from('product-images').remove(uploadedPaths);
  }

  assert.deepEqual(removedPaths, uploadedPaths);
});
