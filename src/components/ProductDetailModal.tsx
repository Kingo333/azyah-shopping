
import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Heart, ShoppingBag, ExternalLink, X } from 'lucide-react';
import { Product } from '@/types';
import { EnhancedProductGallery } from './EnhancedProductGallery';
import { AdvancedSizeColorSelector } from './AdvancedSizeColorSelector';
import { AddToClosetModal } from './AddToClosetModal';
import { useToast } from '@/hooks/use-toast';

interface ProductDetailModalProps {
  product?: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isOpen,
  onClose
}) => {
  const { toast } = useToast();

  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [isClosetModalOpen, setIsClosetModalOpen] = useState(false);

  const images = useMemo<string[]>(() => {
    const media = (product?.media_urls ?? []) as unknown as string[];
    return Array.isArray(media) ? media.filter(Boolean) : [];
  }, [product]);

  const priceCurrency = product?.currency || 'USD';
  const priceCents = product?.price_cents ?? 0;
  const compareAtCents = product?.compare_at_price_cents ?? null;

  const handleShopNow = () => {
    if (product?.external_url) {
      window.open(product.external_url, '_blank', 'noopener,noreferrer');
    } else {
      toast({ description: 'Shop link not available for this product', variant: 'destructive' });
    }
  };

  const availableSizes = ['XS', 'S', 'M', 'L', 'XL'].map(size => ({
    value: size, label: size, inStock: true, stockCount: 10
  }));
  const availableColors = [
    { value: 'black', label: 'Black', hexCode: '#000000', inStock: true },
    { value: 'white', label: 'White', hexCode: '#ffffff', inStock: true },
    { value: 'navy', label: 'Navy', hexCode: '#1e3a8a', inStock: true },
    { value: 'beige', label: 'Beige', hexCode: '#f5f5dc', inStock: true }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-4xl max-h-[90vh] p-0 overflow-y-auto md:overflow-hidden glass-premium border-white/20"
      >
        {!product ? (
          <div className="flex h-[70vh] items-center justify-center text-sm text-muted-foreground">
            Loading product details…
          </div>
        ) : (
          <div className="flex flex-col md:grid md:grid-cols-2 h-auto md:h-full">
            {/* Image Gallery */}
            <div className="relative h-[40vh] md:h-full">
              <EnhancedProductGallery
                images={images}
                productTitle={product.title}
                productId={product.id}
                hasARMesh={false}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="absolute top-2 right-2 md:top-4 md:right-4 z-10 glass-subtle"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Product Details */}
            <div className="flex flex-col h-auto md:h-full glass-subtle border-white/10">
              <div className="p-4 md:p-6 space-y-4 md:space-y-6 md:flex-1 md:overflow-y-auto">
                {/* Header */}
                <div>
                  <h2 className="text-xl md:text-2xl font-bold font-playfair line-clamp-2 mb-2">{product.title}</h2>
                  <p className="text-muted-foreground">{product.brand?.name}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-xl md:text-2xl font-bold">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: priceCurrency })
                        .format(priceCents / 100)}
                    </span>
                    {compareAtCents && (
                      <span className="text-lg text-muted-foreground line-through">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: priceCurrency })
                          .format(compareAtCents / 100)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Size and Color Selection */}
                <AdvancedSizeColorSelector
                  sizes={availableSizes}
                  colors={availableColors}
                  selectedSize={selectedSize}
                  selectedColor={selectedColor}
                  onSizeSelect={setSelectedSize}
                  onColorSelect={setSelectedColor}
                />

                {/* Description */}
                {product.description && (
                  <div>
                    <h4 className="font-semibold mb-2">Description</h4>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {product.description}
                    </p>
                  </div>
                )}

                {/* Product Details */}
                <div className="space-y-3">
                  <h4 className="font-semibold">Product Details</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">SKU:</span>
                      <span>{product.sku}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Category:</span>
                      <span className="capitalize">
                        {product.category_slug?.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="border-t border-white/20 p-4 md:p-6 space-y-3 glass-premium sticky bottom-0 md:static">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 gap-1 md:gap-2 text-xs md:text-sm h-9 md:h-10">
                    <Heart className="h-3 w-3 md:h-4 md:w-4" />
                    Wishlist
                  </Button>
                  <Button
                    onClick={() => setIsClosetModalOpen(true)}
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1 md:gap-2 text-xs md:text-sm h-9 md:h-10"
                  >
                    <ShoppingBag className="h-3 w-3 md:h-4 md:w-4" />
                    Add to Closet
                  </Button>
                </div>

                {product.external_url ? (
                  <Button
                    onClick={handleShopNow}
                    size="lg"
                    className="w-full gap-1 md:gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm md:text-base h-10 md:h-12 shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <ExternalLink className="h-4 w-4 md:h-5 md:w-5" />
                    Shop Now
                  </Button>
                ) : (
                  <Button 
                    disabled 
                    size="lg"
                    className="w-full gap-1 md:gap-2 opacity-50 cursor-not-allowed text-sm md:text-base h-10 md:h-12"
                  >
                    <ShoppingBag className="h-4 w-4 md:h-5 md:w-5" />
                    Shop Link Not Available
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {product && (
          <AddToClosetModal
            productId={product.id}
            isOpen={isClosetModalOpen}
            onClose={() => setIsClosetModalOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProductDetailModal;
