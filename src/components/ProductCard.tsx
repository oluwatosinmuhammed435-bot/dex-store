import React from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Minus, Plus, ShoppingCart } from 'lucide-react';
import { Product } from '../data/storeData';
import { buildWhatsAppOrderUrl, formatNaira } from '../utils/catalogue';
import { ProductImage } from './ProductImage';
import { useCart } from '../context/CartContext';

interface ProductCardProps {
  product: Product;
  compact?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, compact = false }) => {
  const { addToCart, updateQuantity, getItemQuantity } = useCart();
  const quantityInCart = getItemQuantity(product.id);

  const whatsappUrl = buildWhatsAppOrderUrl({
    productName: product.name,
    priceNgn: product.priceNgn,
    quantity: Math.max(1, quantityInCart),
    reference: product.reference,
    category: product.category,
  });

  return (
    <article className="group w-full flex flex-col justify-between bg-[#FFFFFF] border border-[#E5EBE6] rounded-md overflow-hidden transition-transform duration-150 ease-out hover:-translate-y-0.5 hover:border-[#B8DCC5]">
      {/* Top: Product Image + Attached Title & Price (Jumia / Temu Compact Box Style) */}
      <div>
        <Link
          to={`/product/${product.slug}`}
          className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B45]"
          aria-label={`View details for ${product.name}`}
        >
          <ProductImage
            src={product.image}
            alt={product.name}
            aspectClassName="aspect-square"
            className="group-hover:scale-[1.03]"
          />
        </Link>

        <div className="p-2.5 sm:p-3.5 space-y-1">
          {/* Quiet unboxed category & availability line */}
          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-[#69746D] truncate">
            <span className="font-medium text-[#176B45] truncate">{product.category}</span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{product.availability}</span>
          </div>

          {/* Product Name */}
          <h3 className="text-xs sm:text-sm font-medium text-[#202923] leading-snug line-clamp-2 min-h-[2.25rem] sm:min-h-[2.5rem]">
            <Link
              to={`/product/${product.slug}`}
              className="hover:text-[#176B45] transition-colors focus-visible:outline-2 focus-visible:outline-[#176B45]"
            >
              {product.name}
            </Link>
          </h3>

          {/* Directly Attached Naira Price */}
          <div className="pt-0.5 flex items-baseline justify-between gap-1">
            <span className="text-sm sm:text-base font-bold text-[#0E3021] font-mono-num">
              {formatNaira(product.priceNgn)}
            </span>
            {!compact && (
              <span className="hidden sm:inline text-[10px] text-[#69746D] font-mono-num">
                {product.reference}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bottom: Add to Cart Action (or In-Cart Stepper) + Quick WhatsApp Order */}
      <div className="px-2.5 pb-2.5 sm:px-3.5 sm:pb-3.5 pt-1 flex items-center gap-1.5">
        {quantityInCart === 0 ? (
          <button
            type="button"
            onClick={() => addToCart(product, 1, false)}
            aria-label={`Add ${product.name} to cart`}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-[11px] sm:text-xs font-semibold text-[#FFFFFF] bg-[#123D2A] rounded hover:bg-[#176B45] transition-colors whitespace-nowrap shrink-0 min-h-[36px] sm:min-h-[38px]"
          >
            <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
            <span>Add to Cart</span>
          </button>
        ) : (
          <div className="flex-1 flex items-center justify-between bg-[#EAF3EC] border border-[#176B45] rounded min-h-[36px] sm:min-h-[38px] px-1">
            <button
              type="button"
              onClick={() => updateQuantity(product.id, quantityInCart - 1)}
              aria-label={`Decrease cart quantity for ${product.name}`}
              className="w-7 h-7 inline-flex items-center justify-center rounded bg-[#FFFFFF] text-[#123D2A] hover:bg-[#B8DCC5] transition-colors"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="text-xs font-bold text-[#0E3021] font-mono-num px-1">
              {quantityInCart} in cart
            </span>
            <button
              type="button"
              onClick={() => addToCart(product, 1, false)}
              aria-label={`Increase cart quantity for ${product.name}`}
              className="w-7 h-7 inline-flex items-center justify-center rounded bg-[#123D2A] text-[#FFFFFF] hover:bg-[#176B45] transition-colors"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        )}

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Order ${product.name} on WhatsApp`}
          title="Order directly on WhatsApp"
          className="inline-flex items-center justify-center w-9 h-9 sm:h-[38px] text-[#123D2A] bg-[#F8FAF8] border border-[#E5EBE6] rounded hover:bg-[#EAF3EC] hover:border-[#B8DCC5] transition-colors shrink-0"
        >
          <MessageCircle className="w-4 h-4 shrink-0" />
        </a>
      </div>
    </article>
  );
};
