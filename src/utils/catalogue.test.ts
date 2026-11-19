import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatNaira,
  filterAndSortProducts,
  buildWhatsAppOrderMessage,
  buildWhatsAppOrderUrl,
  getRelatedProducts,
  addItemToCart,
  updateCartItemQuantity,
  removeCartItem,
  calculateCartTotals,
  buildWhatsAppCartOrderMessage,
} from './catalogue';
import { PRODUCTS } from '../data/storeData';

test('formatNaira formats Nigerian Naira with symbol and thousands separators', () => {
  assert.equal(formatNaira(185000), '₦185,000');
  assert.equal(formatNaira(42000), '₦42,000');
  assert.equal(formatNaira(0), '₦0');
});

test('filterAndSortProducts filters by categorySlug accurately', () => {
  const carParts = filterAndSortProducts(PRODUCTS, { categorySlug: 'car-parts' });
  assert.ok(carParts.length > 0);
  assert.ok(carParts.every((item) => item.categorySlug === 'car-parts'));

  const toyCars = filterAndSortProducts(PRODUCTS, { categorySlug: 'toy-cars' });
  assert.ok(toyCars.length > 0);
  assert.ok(toyCars.every((item) => item.categorySlug === 'toy-cars'));
});

test('filterAndSortProducts filters by search query across name and reference', () => {
  const corollaMatches = filterAndSortProducts(PRODUCTS, { searchQuery: 'Corolla' });
  assert.equal(corollaMatches.length, 1);
  assert.equal(corollaMatches[0].name, 'Toyota Corolla Headlamp');

  const refMatches = filterAndSortProducts(PRODUCTS, { searchQuery: 'DEX-TC-205' });
  assert.equal(refMatches.length, 1);
  assert.equal(refMatches[0].name, 'Remote Control Toy Car');

  const emptyMatches = filterAndSortProducts(PRODUCTS, { searchQuery: 'nonexistent-xyz-999' });
  assert.equal(emptyMatches.length, 0);
});

test('filterAndSortProducts sorts by price ascending and descending', () => {
  const lowToHigh = filterAndSortProducts(PRODUCTS, { sortBy: 'price-asc' });
  for (let i = 1; i < lowToHigh.length; i++) {
    assert.ok(lowToHigh[i].priceNgn >= lowToHigh[i - 1].priceNgn);
  }

  const highToLow = filterAndSortProducts(PRODUCTS, { sortBy: 'price-desc' });
  for (let i = 1; i < highToLow.length; i++) {
    assert.ok(highToLow[i].priceNgn <= highToLow[i - 1].priceNgn);
  }
});

test('buildWhatsAppOrderMessage and buildWhatsAppOrderUrl include product details and quantity', () => {
  const payload = {
    productName: 'Toyota Corolla Headlamp',
    priceNgn: 185000,
    quantity: 2,
    reference: 'DEX-CP-101',
    category: 'Car Parts',
  };

  const message = buildWhatsAppOrderMessage(payload);
  assert.ok(message.includes('Toyota Corolla Headlamp'));
  assert.ok(message.includes('DEX-CP-101'));
  assert.ok(message.includes('₦185,000'));
  assert.ok(message.includes('Quantity: 2'));
  assert.ok(message.includes('₦370,000'));

  const url = buildWhatsAppOrderUrl(payload, '2340000000000');
  assert.ok(url.startsWith('https://wa.me/2340000000000?text='));
  assert.ok(decodeURIComponent(url).includes('Toyota Corolla Headlamp'));
});

test('getRelatedProducts excludes the current product and prioritizes same category', () => {
  const current = PRODUCTS[0];
  const related = getRelatedProducts(PRODUCTS, current, 3);
  assert.equal(related.length, 3);
  assert.ok(related.every((p) => p.id !== current.id));
  assert.equal(related[0].categorySlug, current.categorySlug);
});

test('cart state helpers add, update, remove, and compute multi-item WhatsApp summary', () => {
  let cart = addItemToCart([], PRODUCTS[0], 1); // 185,000
  cart = addItemToCart(cart, PRODUCTS[0], 2); // now qty 3 => 555,000
  cart = addItemToCart(cart, PRODUCTS[2], 1); // + 42,000 => 597,000

  const totals = calculateCartTotals(cart);
  assert.equal(totals.totalItems, 4);
  assert.equal(totals.subtotalNgn, 597000);

  const msg = buildWhatsAppCartOrderMessage(cart);
  assert.ok(msg.includes('1. Toyota Corolla Headlamp (Ref: DEX-CP-101) — Qty: 3'));
  assert.ok(msg.includes('2. Miniature Sports Car (Ref: DEX-TC-201) — Qty: 1'));
  assert.ok(msg.includes('Cart Subtotal: ₦597,000'));

  cart = updateCartItemQuantity(cart, PRODUCTS[0].id, 1);
  assert.equal(calculateCartTotals(cart).totalItems, 2);

  cart = removeCartItem(cart, PRODUCTS[2].id);
  assert.equal(cart.length, 1);
});
