import { CategorySlug, Product, STORE_CONFIG } from '../data/storeData';

export type SortOption = 'featured' | 'newest' | 'price-asc' | 'price-desc';

export interface FilterCriteria {
  searchQuery?: string;
  categorySlug?: CategorySlug | 'all';
  sortBy?: SortOption;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

/**
 * Formats a numeric price in Nigerian Naira (₦) using standard thousands separators.
 */
export function formatNaira(amount: number): string {
  const safeAmount = Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0;
  return `₦${safeAmount.toLocaleString('en-NG')}`;
}

/**
 * Adds a product to the cart array or increments its quantity if already present.
 */
export function addItemToCart(
  cart: CartItem[],
  product: Product,
  quantityToAdd = 1
): CartItem[] {
  const safeQty = Math.max(1, Math.floor(quantityToAdd || 1));
  const existingIndex = cart.findIndex((item) => item.product.id === product.id);

  if (existingIndex === -1) {
    return [...cart, { product, quantity: Math.min(99, safeQty) }];
  }

  return cart.map((item, idx) =>
    idx === existingIndex
      ? { ...item, quantity: Math.min(99, item.quantity + safeQty) }
      : item
  );
}

/**
 * Updates the quantity of a specific product in the cart, removing it if quantity <= 0.
 */
export function updateCartItemQuantity(
  cart: CartItem[],
  productId: string,
  newQuantity: number
): CartItem[] {
  const rounded = Math.floor(newQuantity);
  if (rounded <= 0) {
    return cart.filter((item) => item.product.id !== productId);
  }
  return cart.map((item) =>
    item.product.id === productId
      ? { ...item, quantity: Math.min(99, rounded) }
      : item
  );
}

/**
 * Removes a product from the cart by product ID.
 */
export function removeCartItem(cart: CartItem[], productId: string): CartItem[] {
  return cart.filter((item) => item.product.id !== productId);
}

/**
 * Computes total item count and total Naira subtotal for the cart.
 */
export function calculateCartTotals(cart: CartItem[]): {
  totalItems: number;
  subtotalNgn: number;
} {
  return cart.reduce(
    (acc, item) => ({
      totalItems: acc.totalItems + item.quantity,
      subtotalNgn: acc.subtotalNgn + item.product.priceNgn * item.quantity,
    }),
    { totalItems: 0, subtotalNgn: 0 }
  );
}

/**
 * Builds a structured multi-item WhatsApp order message for all products in the customer's cart.
 */
export function buildWhatsAppCartOrderMessage(cart: CartItem[]): string {
  if (cart.length === 0) {
    return `Hello ${STORE_CONFIG.brandName}, I would like to enquire about your products.`;
  }

  const { totalItems, subtotalNgn } = calculateCartTotals(cart);

  const itemLines = cart.map((item, index) => {
    const lineTotal = formatNaira(item.product.priceNgn * item.quantity);
    const unitPrice = formatNaira(item.product.priceNgn);
    return `${index + 1}. ${item.product.name} (Ref: ${item.product.reference}) — Qty: ${item.quantity} × ${unitPrice} = ${lineTotal}`;
  });

  return [
    `Hello ${STORE_CONFIG.brandName}, I would like to place an order from my cart:`,
    '',
    ...itemLines,
    '',
    `• Total Items: ${totalItems}`,
    `• Cart Subtotal: ${formatNaira(subtotalNgn)}`,
    '',
    'Please confirm current availability and delivery details.',
  ].join('\n');
}

/**
 * Builds the official WhatsApp click-to-chat URL for the entire shopping cart.
 */
export function buildWhatsAppCartOrderUrl(
  cart: CartItem[],
  phoneNumber: string = STORE_CONFIG.whatsappNumber
): string {
  const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
  const message = buildWhatsAppCartOrderMessage(cart);
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Filters and sorts products by search query, category slug, and sort option.
 */
export function filterAndSortProducts(
  products: Product[],
  criteria: FilterCriteria
): Product[] {
  const query = (criteria.searchQuery ?? '').trim().toLowerCase();
  const categorySlug = criteria.categorySlug ?? 'all';
  const sortBy = criteria.sortBy ?? 'featured';

  const filtered = products.filter((product) => {
    const matchesCategory =
      categorySlug === 'all' || product.categorySlug === categorySlug;

    if (!matchesCategory) {
      return false;
    }

    if (!query) {
      return true;
    }

    const searchableText = [
      product.name,
      product.category,
      product.reference,
      product.shortDescription,
    ]
      .join(' ')
      .toLowerCase();

    return searchableText.includes(query);
  });

  const sorted = [...filtered];

  switch (sortBy) {
    case 'price-asc':
      sorted.sort((a, b) => a.priceNgn - b.priceNgn);
      break;
    case 'price-desc':
      sorted.sort((a, b) => b.priceNgn - a.priceNgn);
      break;
    case 'newest':
      sorted.sort((a, b) => b.createdAtOrder - a.createdAtOrder);
      break;
    case 'featured':
    default:
      sorted.sort((a, b) => {
        if (a.featured !== b.featured) {
          return a.featured ? -1 : 1;
        }
        return b.createdAtOrder - a.createdAtOrder;
      });
      break;
  }

  return sorted;
}

/**
 * Returns related products from the same category (or fallback featured items), excluding the current product.
 */
export function getRelatedProducts(
  products: Product[],
  currentProduct: Product,
  limit = 4
): Product[] {
  const sameCategory = products.filter(
    (p) => p.id !== currentProduct.id && p.categorySlug === currentProduct.categorySlug
  );
  const others = products.filter(
    (p) => p.id !== currentProduct.id && p.categorySlug !== currentProduct.categorySlug
  );
  return [...sameCategory, ...others].slice(0, limit);
}

export interface WhatsAppOrderPayload {
  productName: string;
  priceNgn: number;
  quantity: number;
  reference?: string;
  category?: string;
}

/**
 * Builds the plain-text WhatsApp order message for a customer's selected product and quantity.
 */
export function buildWhatsAppOrderMessage(payload: WhatsAppOrderPayload): string {
  const qty = Math.max(1, Math.floor(payload.quantity || 1));
  const unitPrice = formatNaira(payload.priceNgn);
  const totalPrice = formatNaira(payload.priceNgn * qty);

  const lines = [
    `Hello ${STORE_CONFIG.brandName}, I would like to place an order:`,
    '',
    `• Product: ${payload.productName}`,
    payload.reference ? `• Reference: ${payload.reference}` : null,
    payload.category ? `• Category: ${payload.category}` : null,
    `• Unit Price: ${unitPrice}`,
    `• Quantity: ${qty}`,
    `• Estimated Total: ${totalPrice}`,
    '',
    'Please confirm current availability and delivery details.',
  ].filter((line): line is string => line !== null);

  return lines.join('\n');
}

/**
 * Generates the official WhatsApp click-to-chat URL (`https://wa.me/<number>?text=...`).
 */
export function buildWhatsAppOrderUrl(
  payload: WhatsAppOrderPayload,
  phoneNumber: string = STORE_CONFIG.whatsappNumber
): string {
  const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
  const message = buildWhatsAppOrderMessage(payload);
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Generates a general customer enquiry WhatsApp click-to-chat URL.
 */
export function buildWhatsAppGeneralUrl(
  customMessage = `Hello ${STORE_CONFIG.brandName}, I have an enquiry regarding your product catalogue.`,
  phoneNumber: string = STORE_CONFIG.whatsappNumber
): string {
  const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(customMessage)}`;
}
