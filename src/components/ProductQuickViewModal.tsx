import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, MessageCircle, Minus, Plus, ShoppingCart } from 'lucide-react';
import { Product } from '../data/storeData';
import { buildWhatsAppOrderUrl, formatNaira } from '../utils/catalogue';
import { useCart } from '../context/CartContext';
import { useStoreData } from '../context/StoreDataContext';
import { useToast } from '../context/ToastContext';
import { ProductImage } from './ProductImage';
import { Badge, BottomSheetModal, Button, getAvailabilityBadgeVariant } from './ui';

interface ProductQuickViewModalProps {
  product: Product | null;
  onClose: () => void;
}

export const ProductQuickViewModal: React.FC<ProductQuickViewModalProps> = ({
  product,
  onClose,
}) => {
  const { addToCart, openCartDrawer, getItemQuantity } = useCart();
  const { storeConfig } = useStoreData();
  const { showToast } = useToast();

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  useEffect(() => {
    setSelectedIndex(0);
    setQuantity(1);
    setJustAdded(false);
  }, [product?.id]);

  if (!product) {
    return (
      <BottomSheetModal isOpen={false} onClose={onClose}>
        <div />
      </BottomSheetModal>
    );
  }

  const gallery =
    product.gallery && product.gallery.length > 0
      ? product.gallery
      : [{ url: product.image, caption: product.name }];

  const activeImage = gallery[selectedIndex]?.url || product.image;
  const currentInCart = getItemQuantity(product.id);
  const whatsappUrl = buildWhatsAppOrderUrl(
    {
      productName: product.name,
      priceNgn: product.priceNgn,
      quantity,
      reference: product.reference,
      category: product.category,
    },
    storeConfig.whatsappNumber,
    storeConfig.brandName
  );

  const handleAdd = () => {
    addToCart(product, quantity, false);
    setJustAdded(true);
    showToast({
      variant: 'cart',
      title: `Added ${quantity}× ${product.name}`,
      description: `Cart updated · ${formatNaira(product.priceNgn * quantity)}`,
      actionLabel: 'Open Cart',
      onAction: () => {
        onClose();
        openCartDrawer();
      },
    });
    window.setTimeout(() => setJustAdded(false), 1400);
  };

  return (
    <BottomSheetModal
      isOpen={Boolean(product)}
      onClose={onClose}
      title={product.name}
      subtitle={`${product.category} · Ref ${product.reference}`}
      maxWidthClass="sm:max-w-2xl"
    >
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-start">
        {/* Image & Thumbnails */}
        <div className="sm:col-span-6 space-y-3">
          <div className="rounded-xl overflow-hidden border border-[#E2EAE5] bg-[#F7FAF8]">
            <ProductImage
              src={activeImage}
              alt={product.name}
              aspectClassName="aspect-square"
              priority
            />
          </div>

          {gallery.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {gallery.slice(0, 4).map((item, idx) => (
                <button
                  key={`${item.url}-${idx}`}
                  type="button"
                  onClick={() => setSelectedIndex(idx)}
                  aria-label={`View image ${idx + 1}`}
                  className={`w-14 h-14 rounded-lg overflow-hidden border-2 shrink-0 transition-all dex-press ${
                    selectedIndex === idx
                      ? 'border-[#176B45]'
                      : 'border-[#E2EAE5] opacity-70 hover:opacity-100'
                  }`}
                >
                  <ProductImage
                    src={item.url}
                    alt={`${product.name} thumbnail ${idx + 1}`}
                    aspectClassName="aspect-square"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Purchase Details */}
        <div className="sm:col-span-6 space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <Badge variant={getAvailabilityBadgeVariant(product.availability)} dot>
              {product.availability}
            </Badge>
            {typeof product.stockQuantity === 'number' && !product.isSample && (
              <span className="text-xs font-medium text-[#5C6B62] font-mono-num">
                {product.stockQuantity} in stock
              </span>
            )}
          </div>

          <div>
            <p className="text-2xl font-bold text-[#0E3021] font-mono-num">
              {formatNaira(product.priceNgn)}
            </p>
            <p className="text-xs text-[#5C6B62] mt-1.5 leading-relaxed line-clamp-4">
              {product.description || product.shortDescription}
            </p>
          </div>

          {product.specifications.length > 0 && (
            <dl className="bg-[#F7FAF8] border border-[#E2EAE5] rounded-xl p-3 space-y-1.5 text-xs">
              {product.specifications.slice(0, 3).map((spec) => (
                <div key={spec.label} className="flex justify-between gap-2">
                  <dt className="text-[#5C6B62]">{spec.label}</dt>
                  <dd className="text-[#17231C] font-semibold text-right truncate max-w-[18ch]">
                    {spec.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {/* Quantity Selector */}
          <div className="flex items-center justify-between bg-[#F7FAF8] border border-[#E2EAE5] rounded-xl px-3.5 py-2">
            <span className="text-xs font-semibold text-[#17231C]">Quantity</span>
            <div className="inline-flex items-center gap-1">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="Decrease quantity"
                className="w-9 h-9 rounded-lg bg-[#FFFFFF] border border-[#E2EAE5] inline-flex items-center justify-center text-[#17231C] hover:bg-[#EAF5EE] dex-press"
              >
                <Minus className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
              <span className="w-9 text-center text-sm font-bold text-[#0E3021] font-mono-num">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                aria-label="Increase quantity"
                className="w-9 h-9 rounded-lg bg-[#FFFFFF] border border-[#E2EAE5] inline-flex items-center justify-center text-[#17231C] hover:bg-[#EAF5EE] dex-press"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Primary Actions */}
          <div className="space-y-2.5 pt-1">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleAdd}
              leftIcon={
                justAdded ? (
                  <Check className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <ShoppingCart className="w-4 h-4" aria-hidden="true" />
                )
              }
            >
              {justAdded
                ? 'Added to Cart'
                : currentInCart > 0
                ? `Add More (${currentInCart} in Cart)`
                : `Add to Cart · ${formatNaira(product.priceNgn * quantity)}`}
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3 py-2 rounded-xl border border-[#176B45] bg-[#EAF5EE] text-[#123D2A] hover:bg-[#D9F0E2] text-xs font-semibold dex-press"
              >
                <MessageCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>WhatsApp</span>
              </a>

              <Link
                to={`/product/${product.slug}`}
                onClick={onClose}
                className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3 py-2 rounded-xl border border-[#E2EAE5] bg-[#FFFFFF] text-[#17231C] hover:bg-[#F7FAF8] text-xs font-semibold dex-press"
              >
                <span>Full Specs</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </BottomSheetModal>
  );
};
