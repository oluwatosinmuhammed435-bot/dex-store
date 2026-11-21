import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Minus, Plus, ShoppingCart } from 'lucide-react';
import { PRODUCTS, STORE_CONFIG, type Product } from '../data/storeData';
import {
  buildWhatsAppOrderMessage,
  buildWhatsAppOrderUrl,
  formatNaira,
  getRelatedProducts,
} from '../utils/catalogue';
import { fetchProductBySlug, fetchStorefrontProducts } from '../utils/productService';
import { ProductImage } from '../components/ProductImage';
import { ProductCarouselRail } from '../components/ProductCarouselRail';
import { useCart } from '../context/CartContext';

export const ProductDetailsPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<Product | null>(() =>
    slug ? PRODUCTS.find((p) => p.slug === slug || p.id === slug) || null : null
  );
  const [allProducts, setAllProducts] = useState<Product[]>(PRODUCTS);
  const [isLoading, setIsLoading] = useState(!product);

  const { addToCart, getItemQuantity } = useCart();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    let isMounted = true;
    if (!slug) return;

    async function loadData() {
      setIsLoading(true);
      const [fetchedProduct, storeProducts] = await Promise.all([
        fetchProductBySlug(slug!),
        fetchStorefrontProducts(),
      ]);

      if (isMounted) {
        if (fetchedProduct) {
          setProduct(fetchedProduct);
        }
        if (storeProducts && storeProducts.length > 0) {
          setAllProducts(storeProducts);
        }
        setIsLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [slug]);

  if (isLoading && !product) {
    return (
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center space-y-4">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-8 w-48 bg-slate-200 rounded mb-2"></div>
          <div className="h-4 w-64 bg-slate-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center space-y-5">
        <h1 className="text-2xl font-bold text-[#202923]">Product Not Found</h1>
        <p className="text-sm text-[#69746D] max-w-md mx-auto">
          The requested product could not be located in the DEX STORES catalogue.
        </p>
        <div>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-[#FFFFFF] bg-[#123D2A] rounded-md hover:bg-[#176B45] transition-colors min-h-[40px]"
          >
            <ArrowLeft className="w-4 h-4" />
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

  const orderPayload = {
    productName: product.name,
    priceNgn: product.priceNgn,
    quantity,
    reference: product.reference,
    category: product.category,
  };

  const whatsappOrderUrl = buildWhatsAppOrderUrl(orderPayload);
  const whatsappMessagePreview = buildWhatsAppOrderMessage(orderPayload);
  const relatedProducts = getRelatedProducts(allProducts, product, 6);

  const handleDecrement = () => {
    setQuantity((prev) => Math.max(1, prev - 1));
  };

  const handleIncrement = () => {
    setQuantity((prev) => Math.min(99, prev + 1));
  };

  return (
    <div className="bg-[#FFFFFF]">
      {/* Breadcrumb Bar */}
      <div className="bg-[#F8FAF8] border-b border-[#E5EBE6]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs text-[#69746D]">
            <Link to="/" className="hover:text-[#123D2A] transition-colors">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <Link to="/shop" className="hover:text-[#123D2A] transition-colors">
              Shop
            </Link>
            <span aria-hidden="true">/</span>
            <Link
              to={`/shop?category=${product.categorySlug}`}
              className="hover:text-[#123D2A] transition-colors"
            >
              {product.category}
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-[#202923] font-medium">{product.name}</span>
          </nav>

          <Link
            to="/shop"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#123D2A] hover:text-[#176B45] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Catalogue</span>
          </Link>
        </div>
      </div>

      {/* Main Product Details Module */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Column: Product Image & Gallery (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="border border-[#E5EBE6] rounded-lg overflow-hidden bg-[#F8FAF8]">
              <ProductImage
                src={activeGalleryItem.url}
                alt={product.name}
                aspectClassName="aspect-[4/3]"
                priority
              />
            </div>

            <p className="text-xs text-[#69746D]">{activeGalleryItem.caption}</p>

            {gallery.length > 1 && (
              <div className="pt-2 space-y-2">
                <p className="text-xs font-medium text-[#202923]">Product Views</p>
                <div className="flex items-center gap-3">
                  {gallery.map((item, idx) => (
                    <button
                      key={item.url + idx}
                      type="button"
                      onClick={() => setSelectedImageIndex(idx)}
                      aria-label={`Select view ${idx + 1} for ${product.name}`}
                      className={`w-24 rounded-md overflow-hidden border-2 transition-all ${
                        selectedImageIndex === idx
                          ? 'border-[#176B45]'
                          : 'border-[#E5EBE6] opacity-75 hover:opacity-100'
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

          {/* Right Column: Contiguous Purchase & Specification Module (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="space-y-3 pb-5 border-b border-[#E5EBE6]">
              {/* Unboxed Metadata */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#69746D]">
                <Link
                  to={`/shop?category=${product.categorySlug}`}
                  className="font-semibold text-[#176B45] hover:underline"
                >
                  {product.category}
                </Link>
                <span aria-hidden="true">·</span>
                <span>{product.availability}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-num">Ref: {product.reference}</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold text-[#202923] tracking-tight">
                {product.name}
              </h1>

              <div className="pt-1 flex items-baseline gap-3">
                <span className="text-2xl font-bold text-[#0E3021] font-mono-num">
                  {formatNaira(product.priceNgn)}
                </span>
                <span className="text-xs text-[#69746D]">per unit (Sample Price)</span>
              </div>
            </div>

            {/* Product Description */}
            <div className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#69746D]">
                Description
              </h2>
              <p className="text-sm text-[#202923] leading-relaxed">
                {product.description}
              </p>
            </div>

            {/* Quantity Selector, Add to Cart & WhatsApp Order Module */}
            <div className="p-5 bg-[#F8FAF8] border border-[#E5EBE6] rounded-lg space-y-5">
              <div className="flex items-center justify-between gap-4">
                <label
                  htmlFor="product-quantity-input"
                  className="text-xs font-semibold text-[#202923]"
                >
                  Select Quantity
                </label>

                <div className="inline-flex items-center bg-[#FFFFFF] border border-[#E5EBE6] rounded-md">
                  <button
                    type="button"
                    onClick={handleDecrement}
                    disabled={quantity <= 1}
                    aria-label="Decrease quantity"
                    className="w-10 h-10 inline-flex items-center justify-center text-[#202923] hover:bg-[#EAF3EC] disabled:opacity-40 transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
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
                    className="w-12 text-center text-sm font-semibold text-[#202923] font-mono-num focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleIncrement}
                    aria-label="Increase quantity"
                    className="w-10 h-10 inline-flex items-center justify-center text-[#202923] hover:bg-[#EAF3EC] transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex items-baseline justify-between pt-3 border-t border-[#E5EBE6]">
                <span className="text-xs text-[#69746D]">
                  Estimated Total ({quantity} {quantity === 1 ? 'unit' : 'units'})
                </span>
                <span
                  data-testid="estimated-total-price"
                  className="text-lg font-bold text-[#0E3021] font-mono-num"
                >
                  {formatNaira(product.priceNgn * quantity)}
                </span>
              </div>

              {/* Dual Primary Actions: Add to Cart + Direct Order on WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => addToCart(product, quantity, true)}
                  data-testid="pdp-add-to-cart-button"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold text-[#FFFFFF] bg-[#123D2A] rounded-md hover:bg-[#176B45] transition-colors min-h-[44px]"
                >
                  <ShoppingCart className="w-4 h-4 shrink-0" />
                  <span>
                    Add to Cart {currentInCart > 0 ? `(${currentInCart} in cart)` : ''}
                  </span>
                </button>

                <a
                  href={whatsappOrderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="pdp-whatsapp-order-link"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold text-[#123D2A] bg-[#FFFFFF] border border-[#123D2A] rounded-md hover:bg-[#EAF3EC] transition-colors min-h-[44px]"
                >
                  <MessageCircle className="w-4 h-4 shrink-0" />
                  <span>Order on WhatsApp</span>
                </a>
              </div>

              {/* Pre-filled Message Preview for Customer Transparency */}
              <div className="pt-2 space-y-1.5">
                <p className="text-[11px] font-medium text-[#69746D]">
                  Prepared WhatsApp Order Message:
                </p>
                <pre
                  data-testid="whatsapp-message-preview"
                  className="p-3 bg-[#FFFFFF] border border-[#E5EBE6] rounded text-[11px] text-[#202923] font-mono-num whitespace-pre-wrap leading-relaxed"
                >
                  {whatsappMessagePreview}
                </pre>
              </div>
            </div>

            {/* Specifications Table */}
            <div className="space-y-3 pt-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#69746D]">
                Product Specifications
              </h2>
              <dl className="divide-y divide-[#E5EBE6] border-t border-b border-[#E5EBE6] text-xs">
                {product.specifications.map((spec) => (
                  <div key={spec.label} className="py-2.5 flex justify-between gap-4">
                    <dt className="text-[#69746D]">{spec.label}</dt>
                    <dd className="text-[#202923] font-medium text-right">{spec.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <p className="text-xs text-[#69746D]">
              {STORE_CONFIG.sampleInventoryNotice}
            </p>
          </div>
        </div>
      </section>

      {/* Slideable Related Products Rail */}
      <section className="py-10 lg:py-14 bg-[#F8FAF8] border-t border-[#E5EBE6]">
        <div className="max-w-[1200px] mx-auto px-3 sm:px-6 lg:px-8">
          <ProductCarouselRail
            title="Related Products — Slide to Browse"
            subtitle={`More items in ${product.category} and across DEX STORES`}
            products={relatedProducts}
            viewAllLink={`/shop?category=${product.categorySlug}`}
            viewAllLabel={`All ${product.category}`}
          />
        </div>
      </section>
    </div>
  );
};
