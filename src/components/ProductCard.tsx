import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Eye, MessageCircle, Minus, Plus, ShoppingCart } from 'lucide-react';
import { Product } from '../data/storeData';
import { buildWhatsAppOrderUrl, formatNaira } from '../utils/catalogue';
import { ProductImage } from './ProductImage';
import { useCart } from '../context/CartContext';
import { useStoreData } from '../context/StoreDataContext';
import { useToast } from '../context/ToastContext';
import { Badge, getAvailabilityBadgeVariant } from './ui';

interface ProductCardProps {
  product: Product;
  compact?: boolean;
  onQuickView?: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  compact = false,
  onQuickView,
}) => {
  const { addToCart, updateQuantity, getItemQuantity, openCartDrawer } = useCart();
  const { storeConfig } = useStoreData();
  const { showToast } = useToast();
  const [justAdded, setJustAdded] = useState(false);

  const quantityInCart = getItemQuantity(product.id);
  const isOutOfStock = product.availability === 'Out of Stock';

  const whatsappUrl = buildWhatsAppOrderUrl(
    {
      productName: product.name,
      priceNgn: product.priceNgn,
      quantity: Math.max(1, quantityInCart),
      reference: product.reference,
      category: product.category,
    },
    storeConfig.whatsappNumber,
    storeConfig.brandName
  );

  const handleAddToCart = () => {
    addToCart(product, 1, false);
    setJustAdded(true);
    showToast({
      variant: 'cart',
      title: `Added "${product.name}"`,
      description: `${formatNaira(product.priceNgn)} · Tap to review your order`,
      actionLabel: 'View Cart',
      onAction: openCartDrawer,
    });
    window.setTimeout(() => setJustAdded(false), 1100);
  };

  return (
    <article className="group w-full min-w-0 flex flex-col justify-between bg-[#FFFFFF] border border-[#E2EAE5] rounded-2xl overflow-hidden shadow-xs dex-card-interactive">
      {/* Media & Product Summary */}
      <div>
        <div className="relative bg-[#F7FAF8] overflow-hidden">
          <Link
            to={`/product/${product.slug}`}
            className="block focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#176B45]"
            aria-label={`View details for ${product.name}`}
          >
            <ProductImage
              src={product.image}
              alt={product.name}
              aspectClassName="aspect-square"
              className="group-hover:scale-[1.03]"
            />
          </Link>

          {/* Subtle Top-Left Featured Pill */}
          {product.featured && !compact && (
            <span className="absolute top-2.5 left-2.5 px-2 py-0.5 text-[10px] font-bold bg-[#FFFFFF]/95 backdrop-blur-xs text-[#123D2A] border border-[#C6E5D2] rounded-full shadow-2xs pointer-events-none">
              Featured
            </span>
          )}

          {/* Quick View Trigger (always reachable on touch & keyboard, subtle lift on hover) */}
          {onQuickView && (
            <button
              type="button"
              onClick={() => onQuickView(product)}
              aria-label={`Quick view ${product.name}`}
              title="Quick preview"
              className="absolute top-2 right-2 w-9 h-9 rounded-full bg-[#FFFFFF]/95 backdrop-blur-xs border border-[#E2EAE5] text-[#123D2A] hover:bg-[#EAF5EE] hover:border-[#B8DCC5] inline-flex items-center justify-center shadow-xs transition-opacity duration-150 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 dex-press"
            >
              <Eye className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="p-3 sm:p-3.5 space-y-1.5">
          {/* Category + Availability Dot */}
          <div className="flex items-center justify-between gap-1.5 text-[10px] sm:text-[11px]">
            <span className="font-semibold text-[#176B45] truncate">{product.category}</span>
            <Badge
              variant={getAvailabilityBadgeVariant(product.availability)}
              dot
              className="!px-1.5 !py-0 !text-[10px]"
            >
              {product.availability === 'Available on Order' ? 'On Order' : product.availability}
            </Badge>
          </div>

          {/* Product Name */}
          <h3 className="text-xs sm:text-sm font-semibold text-[#17231C] leading-snug line-clamp-2 min-h-[2.25rem] sm:min-h-[2.5rem]">
            <Link
              to={`/product/${product.slug}`}
              className="hover:text-[#176B45] transition-colors"
            >
              {product.name}
            </Link>
          </h3>

          {/* Price + Reference */}
          <div className="pt-0.5 flex items-baseline justify-between gap-1">
            <span className="text-sm sm:text-base font-bold text-[#0E3021] font-mono-num">
              {formatNaira(product.priceNgn)}
            </span>
            {!compact && (
              <span className="hidden sm:inline text-[10px] text-[#7B8A80] font-mono-num">
                {product.reference}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="px-2 pb-2.5 sm:px-3.5 sm:pb-3.5 pt-1 flex items-center gap-1 sm:gap-1.5 min-w-0">
        {quantityInCart === 0 ? (
          <button
            type="button"
            disabled={isOutOfStock}
            onClick={handleAddToCart}
            aria-label={`Add ${product.name} to cart`}
            className={`min-w-0 flex-1 inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-2 text-[11px] sm:text-xs font-semibold rounded-xl whitespace-nowrap min-h-[38px] sm:min-h-[40px] dex-press disabled:opacity-45 disabled:cursor-not-allowed ${justAdded
              ? 'bg-[#279B62] text-[#FFFFFF]'
              : 'bg-[#176B45] text-[#FFFFFF] hover:bg-[#123D2A]'
              }`}
          >
            {justAdded ? (
              <>
                <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Added</span>
              </>
            ) : (
              <>
                <ShoppingCart className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span className="min-[390px]:hidden">
                  {isOutOfStock ? 'N/A' : 'Add'}
                </span>
                <span className="hidden min-[390px]:inline">
                  {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                </span>
              </>
            )}
          </button>
        ) : (
          <div className="min-w-0 flex-1 flex items-center justify-between bg-[#EAF5EE] border border-[#B8DCC5] rounded-xl min-h-[38px] sm:min-h-[40px] px-0.5 sm:px-1">
            <button
              type="button"
              onClick={() => updateQuantity(product.id, quantityInCart - 1)}
              aria-label={`Decrease cart quantity for ${product.name}`}
              className="w-7 h-7 sm:w-8 sm:h-8 inline-flex items-center justify-center rounded-lg bg-[#FFFFFF] text-[#123D2A] hover:bg-[#D9F0E2] shrink-0 dex-press"
            >
              <Minus className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <span className="text-xs font-bold text-[#0E3021] font-mono-num px-1">
              {quantityInCart}
            </span>
            <button
              type="button"
              onClick={handleAddToCart}
              aria-label={`Increase cart quantity for ${product.name}`}
              className="w-7 h-7 sm:w-8 sm:h-8 inline-flex items-center justify-center rounded-lg bg-[#176B45] text-[#FFFFFF] hover:bg-[#123D2A] shrink-0 dex-press"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        )}

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Order ${product.name} on WhatsApp`}
          title="Order directly on WhatsApp"
          className="inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 text-[#123D2A] bg-[#F7FAF8] border border-[#E2EAE5] rounded-xl hover:bg-[#EAF5EE] hover:border-[#B8DCC5] shrink-0 dex-press"
        >
          <MessageCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
        </a>
      </div>
    </article>
  );
};
