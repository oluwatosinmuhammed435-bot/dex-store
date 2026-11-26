import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractStorageObjectPath,
  mapDatabaseCategoryToItem,
  mapDatabaseProductToProduct,
} from './productService';

test('extractStorageObjectPath extracts bucket-relative object key cleanly', () => {
  const url =
    'https://amxzpbilefkejbpkivgx.supabase.co/storage/v1/object/public/product-images/products/corolla-123/card.webp?t=99';
  assert.equal(extractStorageObjectPath(url), 'products/corolla-123/card.webp');
  assert.equal(extractStorageObjectPath('/src/assets/images/sample.jpg'), null);
  assert.equal(extractStorageObjectPath(''), null);
});

test('mapDatabaseProductToProduct maps live schema columns to Product interface', () => {
  const mapped = mapDatabaseProductToProduct({
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Ceramic Brake Pad Kit',
    slug: 'ceramic-brake-pad-kit-123',
    reference: 'DEX-CER-4421',
    category_id: '22222222-2222-2222-2222-222222222222',
    price_ngn: '95000',
    stock_quantity: 12,
    availability: 'In Stock',
    featured: true,
    description: 'Low-dust ceramic brake pads engineered for quiet operation.',
    image_url: 'https://cdn.example/product-images/products/pad/card.webp',
    gallery: [
      'https://cdn.example/product-images/products/pad/full.webp',
      'https://cdn.example/product-images/products/pad/card.webp',
    ],
    specifications: { Axle: 'Front', Compound: 'Ceramic' },
    is_active: true,
    created_at: '2026-11-20T10:00:00Z',
    updated_at: '2026-11-21T12:00:00Z',
    categories: {
      id: '22222222-2222-2222-2222-222222222222',
      name: 'Car Parts',
      slug: 'car-parts',
    },
  });

  assert.equal(mapped.name, 'Ceramic Brake Pad Kit');
  assert.equal(mapped.priceNgn, 95000);
  assert.equal(mapped.stockQuantity, 12);
  assert.equal(mapped.category, 'Car Parts');
  assert.equal(mapped.categorySlug, 'car-parts');
  assert.equal(mapped.image, 'https://cdn.example/product-images/products/pad/card.webp');
  assert.equal(mapped.gallery.length, 2);
  assert.equal(mapped.gallery[0].url, 'https://cdn.example/product-images/products/pad/full.webp');
  assert.deepEqual(mapped.specifications, [
    { label: 'Axle', value: 'Front' },
    { label: 'Compound', value: 'Ceramic' },
  ]);
  assert.equal(mapped.isSample, false);
  assert.equal(mapped.isActive, true);
  assert.equal(mapped.updatedAt, '2026-11-21T12:00:00Z');
});

test('mapDatabaseCategoryToItem normalizes DB category row cleanly', () => {
  const cat = mapDatabaseCategoryToItem({
    id: 'cat-1',
    name: 'Performance Tuning',
    slug: 'performance-tuning',
    image_url: 'https://cdn.example/product-images/categories/tuning.webp',
    is_active: true,
  });

  assert.equal(cat.name, 'Performance Tuning');
  assert.equal(cat.slug, 'performance-tuning');
  assert.equal(cat.image, 'https://cdn.example/product-images/categories/tuning.webp');
  assert.equal(cat.isActive, true);
  assert.equal(cat.isSample, false);
});
