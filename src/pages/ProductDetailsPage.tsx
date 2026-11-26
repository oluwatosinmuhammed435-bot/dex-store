import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, MessageCircle, Minus, Plus, ShoppingCart } from 'lucide-react';
import { type Product } from '../data/storeData';
import {
  buildWhatsAppOrderMessage,
  buildWhatsAppOrderUrl,
  formatNaira,
  getRelatedProducts,
} from '../utils/catalogue';
import { fetchProductBySlug } from '../utils/productService';
import { ProductImage } from '../components/ProductImage';
import { ProductCarouselRail } from '../components/ProductCarouselRail';
import { Badge, getAvailabilityBadgeVariant, Skeleton } from '../components/ui';
import { useCart } from '../context/CartContext';
import { useStoreData } from '../context/StoreDataContext';
import { useToast } from '../context/ToastContext';

export const ProductDetailsPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { products, storeConfig } = useStoreData();
  const { addToCart, getItemQuantity, openCartDrawer } = useCart();
  const { showToast } = useToast();

  const contextMatch = slug
    ? products.find((p) => p.slug === slug || p.id === slug) || null
    : null;

  const [fetchedProduct, setFetchedProduct] = useState<Product | null>(contextMatch);
  const [isLoading, setIsLoading] = useState(!contextMatch);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  const product = contextMatch ?? fetchedProduct;

  useEffect(() => {
    setSelectedImageIndex(0);
    setQuantity(1);
    setJustAdded(false);

    if (!slug) return;
    if (contextMatch && !contextMatch.isSample) {
      setFetchedProduct(contextMatch);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(!contextMatch);
    fetchProductBySlug(slug).then((result) => {
      if (isMounted) {
        if (result) {
          setFetchedProduct(result);
        }
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [slug, contextMatch]);

  if (isLoading && !product) {
    return (
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          <div className="lg:col-span-7 space-y-4">
            <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
          </div>
          <div className="lg:col-span-5 space-y-4">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-9 w-3/4" />
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center space-y-5">
        <h1 className="text-2xl font-bold text-[#17231C]">Product Not Found</h1>
        <p className="text-sm text-[#5C6B62] max-w-md mx-auto">
          The requested product could not be located in the DEX STORES catalogue.
        </p>
        <div>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-[#FFFFFF] bg-[#176B45] rounded-xl hover:bg-[#123D2A] min-h-[44px] dex-press"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Return to Catalogue</span>
          </Link>
        </div>
      </div>
    );
  }

  const rawGallery =
    product.gallery && product.gallery.length > 0
      ? product.gallery
      : [{ url: product.image, caption: product.name }];

  const gallery = rawGallery.map((item: any, idx: number) => {
    if (typeof item === 'string') {
      return { url: item, caption: `${product.name} view ${idx + 1}` };
    }
    return {
      url: item?.url || product.image,
      caption: item?.caption || `${product.name} view ${idx + 1}`,
    };
  });

  const activeGalleryItem = gallery[selectedImageIndex] ?? gallery[0];
  const currentInCart = getItemQuantity(product.id);
  const isOutOfStock = product.availability === 'Out of Stock';

  const orderPayload = {
    productName: product.name,
    priceNgn: product.priceNgn,
    quantity,
    reference: product.reference,
    category: product.category,
  };

  const whatsappOrderUrl = buildWhatsAppOrderUrl(orderPayload, storeConfig.whatsappNumber, storeConfig.brandName);
  const whatsappMessagePreview = buildWhatsAppOrderMessage(orderPayload, storeConfig.brandName);
  const relatedProducts = getRelatedProducts(products, product, 6);

  const handleAddToCart = () => {
    addToCart(product, quantity, false);
    setJustAdded(true);
    showToast({
      variant: 'cart',
      title: `Added ${quantity}× ${product.name}`,
      description: `Cart subtotal updated · ${formatNaira(product.priceNgn * quantity)}`,
      actionLabel: 'Open Cart',
      onAction: openCartDrawer,
    });
    window.setTimeout(() => setJustAdded(false), 1400);
  };

  return (
    <div className="bg-[#FFFFFF]">
      {/* Breadcrumb Bar */}
      <div className="bg-[#F7FAF8] border-b border-[#E2EAE5]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center flex-wrap gap-1.5 text-xs text-[#5C6B62]"
          >
            <Link to="/" className="hover:text-[#176B45]">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <Link to="/shop" className="hover:text-[#176B45]">
              Shop
            </Link>
            <span aria-hidden="true">/</span>
            <Link
              to={`/shop?category=${product.categorySlug}`}
              className="hover:text-[#176B45]"
            >
              {product.category}
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-[#17231C] font-semibold truncate max-w-[200px] sm:max-w-xs">
              {product.name}
            </span>
          </nav>

          <Link
            to="/shop"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#176B45] hover:text-[#123D2A]"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Back to Catalogue</span>
          </Link>
        </div>
      </div>

      {/* Main Product Details Module */}
      <section className="max-w-[1200px] mx-auto px-3.5 sm:px-6 lg:px-8 py-6 sm:py-10 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 lg:gap-12 items-start">
          {/* Left Column: Product Image & Gallery (7 cols) */}
          <div className="lg:col-span-7 space-y-3.5">
            <div className="border border-[#E2EAE5] rounded-2xl overflow-hidden bg-[#F7FAF8] shadow-xs">
              <ProductImage
                src={activeGalleryItem.url}
                alt={product.name}
                aspectClassName="aspect-[4/3]"
                priority
              />
            </div>

            {activeGalleryItem.caption && (
              <p className="text-xs text-[#5C6B62] px-1">{activeGalleryItem.caption}</p>
            )}

            {gallery.length > 1 && (
              <div className="pt-1 space-y-2">
                <p className="text-xs font-semibold text-[#17231C]">Product Views</p>
                <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                  {gallery.map((item, idx) => (
                    <button
                      key={item.url + idx}
                      type="button"
                      onClick={() => setSelectedImageIndex(idx)}
                      aria-label={`Select view ${idx + 1} for ${product.name}`}
                      className={`w-20 sm:w-24 rounded-xl overflow-hidden border-2 shrink-0 transition-all dex-press ${selectedImageIndex === idx
                          ? 'border-[#176B45]'
                          : 'border-[#E2EAE5] opacity-75 hover:opacity-100'
                        }`}
                    >
                      <ProductImage
                        src={item.url}
                        alt={`${product.name} view ${idx + 1}`}
                        aspectClassName="aspect-[4/3]"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Purchase & Specification Module (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="space-y-3 pb-4 border-b border-[#E2EAE5]">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Link
                  to={`/shop?category=${product.categorySlug}`}
                  className="font-semibold text-[#176B45] hover:underline"
                >
                  {product.category}
                </Link>
                <Badge variant={getAvailabilityBadgeVariant(product.availability)} dot>
                  {product.availability}
                </Badge>
                <span className="text-[#5C6B62] font-mono-num">Ref: {product.reference}</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#17231C] tracking-tight">
                {product.name}
              </h1>

              <div className="pt-1 flex items-baseline gap-3">
                <span className="text-2xl sm:text-3xl font-extrabold text-[#0E3021] font-mono-num">
                  {formatNaira(product.priceNgn)}
                </span>
                <span className="text-xs text-[#5C6B62]">per unit</span>
              </div>
            </div>

            {/* Product Description */}
            <div className="space-y-1.5">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#5C6B62]">
                Overview &amp; Fitment
              </h2>
              <p className="text-sm text-[#17231C] leading-relaxed">
                {product.description || product.shortDescription}
              </p>
            </div>

            {/* Quantity Selector, Add to Cart & WhatsApp Order Module */}
            <div className="p-4 sm:p-5 bg-[#F7FAF8] border border-[#E2EAE5] rounded-2xl space-y-4">
              <div className="flex items-center justify-between gap-4">
                <label
                  htmlFor="product-quantity-input"
                  className="text-xs sm:text-sm font-semibold text-[#17231C]"
                >
                  Select Quantity
                </label>

                <div className="inline-flex items-center bg-[#FFFFFF] border border-[#E2EAE5] rounded-xl p-0.5">
                  <button
                    type="button"
                    onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                    disabled={quantity <= 1}
                    aria-label="Decrease quantity"
                    className="w-10 h-10 inline-flex items-center justify-center rounded-lg text-[#17231C] hover:bg-[#EAF5EE] disabled:opacity-40 dex-press"
                  >
                    <Minus className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                  <input
                    id="product-quantity-input"
                    type="number"
                    min={1}
                    max={99}
                    value={quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!Number.isNaN(val)) {
                        setQuantity(Math.min(99, Math.max(1, val)));
                      }
                    }}
                    className="w-12 text-center text-sm font-bold text-[#17231C] font-mono-num focus:outline-none bg-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setQuantity((prev) => Math.min(99, prev + 1))}
                    aria-label="Increase quantity"
                    className="w-10 h-10 inline-flex items-center justify-center rounded-lg text-[#17231C] hover:bg-[#EAF5EE] dex-press"
                  >
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="flex items-baseline justify-between pt-3 border-t border-[#E2EAE5]">
                <span className="text-xs font-medium text-[#5C6B62]">
                  Estimated Total ({quantity} {quantity === 1 ? 'unit' : 'units'})
                </span>
                <span
                  data-testid="estimated-total-price"
                  className="text-lg font-extrabold text-[#0E3021] font-mono-num"
                >
                  {formatNaira(product.priceNgn * quantity)}
                </span>
              </div>

              {/* Dual Primary Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={isOutOfStock}
                  onClick={handleAddToCart}
                  data-testid="pdp-add-to-cart-button"
                  className={`w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold text-[#FFFFFF] rounded-xl min-h-[46px] dex-press disabled:opacity-45 ${justAdded
                      ? 'bg-[#279B62]'
                      : 'bg-[#176B45] hover:bg-[#123D2A]'
                    }`}
                >
                  {justAdded ? (
                    <>
                      <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>Added to Cart</span>
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>
                        {isOutOfStock
                          ? 'Out of Stock'
                          : currentInCart > 0
                            ? `Add (${currentInCart} in cart)`
                            : 'Add to Cart'}
                      </span>
                    </>
                  )}
                </button>

                <a
                  href={whatsappOrderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="pdp-whatsapp-order-link"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold text-[#123D2A] bg-[#FFFFFF] border border-[#176B45] rounded-xl hover:bg-[#EAF5EE] min-h-[46px] dex-press"
                >
                  <MessageCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Order on WhatsApp</span>
                </a>
              </div>

              {/* Pre-filled Message Preview */}
              <div className="pt-1 space-y-1.5">
                <p className="text-[11px] font-semibold text-[#5C6B62]">
                  Prepared WhatsApp Order Sheet:
                </p>
                <pre
                  data-testid="whatsapp-message-preview"
                  className="p-3 bg-[#FFFFFF] border border-[#E2EAE5] rounded-xl text-[11px] text-[#17231C] font-mono-num whitespace-pre-wrap leading-relaxed"
                >
                  {whatsappMessagePreview}
                </pre>
              </div>
            </div>

            {/* Specifications Table */}
            {product.specifications.length > 0 && (
              <div className="space-y-2.5 pt-1">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[#5C6B62]">
                  Product Specifications
                </h2>
                <dl className="divide-y divide-[#E2EAE5] border border-[#E2EAE5] rounded-xl bg-[#FFFFFF] px-4 text-xs">
                  {product.specifications.map((spec) => (
                    <div key={spec.label} className="py-2.5 flex justify-between gap-4">
                      <dt className="text-[#5C6B62]">{spec.label}</dt>
                      <dd className="text-[#17231C] font-semibold text-right">{spec.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Slideable Related Products Rail */}
      <section className="py-10 sm:py-12 bg-[#F7FAF8] border-t border-[#E2EAE5]">
        <div className="max-w-[1200px] mx-auto px-3 sm:px-6 lg:px-8">
          <ProductCarouselRail
            title="Related Products"
            subtitle="Explore matching hardware or similar products"
            products={relatedProducts}
            viewAllLink="/shop"
            viewAllLabel="Browse All"
            accentTone="mint"
          />
        </div>
      </section>
    </div>
  );
};
