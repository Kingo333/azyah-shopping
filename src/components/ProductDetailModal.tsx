
import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
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
        className="w-[100vw] h-[100dvh] md:max-w-4xl md:h-auto md:max-h-[90vh] p-0 overflow-hidden glass-premium border-white/20 rounded-none md:rounded-3xl"
        aria-describedby="product-description"
      >
        <VisuallyHidden>
          <DialogTitle>{product?.title || 'Product Details'}</DialogTitle>
          <DialogDescription id="product-description">
            View detailed information about this product including images, price, sizes, and colors
          </DialogDescription>
        </VisuallyHidden>
        {!product ? (
          <div className="flex h-[70vh] items-center justify-center text-sm text-muted-foreground">
            Loading product details…
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Image Gallery */}
            <div className="relative h-[45vh] sm:h-[50vh] md:h-full flex-shrink-0">
              <EnhancedProductGallery
                images={images}
                productTitle={product.title}
                productId={product.id}
                hasARMesh={false}
              />
              <Button
                variant="ghost"
                aria-label="Close product details"
                onClick={onClose}
                className="absolute top-3 right-3 md:top-4 md:right-4 z-20 bg-background/60 hover:bg-background/80 backdrop-blur-md rounded-full h-9 w-9 md:h-8 md:w-8"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Product Details */}
            <div className="flex flex-col h-full glass-subtle border-white/10">
              <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                  {/* Header */}
                  <div>
                    <h2 className="text-lg md:text-2xl font-bold font-playfair line-clamp-2 mb-1">{product.title}</h2>
                    <p className="text-muted-foreground text-sm">{product.brand?.name}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-lg md:text-2xl font-bold">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: priceCurrency })
                        .format(priceCents / 100)}
                    </span>
                      {compareAtCents && (
                        <span className="text-sm md:text-lg text-muted-foreground line-through">
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
                      <h4 className="font-semibold mb-2 text-sm">Description</h4>
                      <p className="text-muted-foreground text-xs leading-relaxed">
                        {product.description}
                      </p>
                    </div>
                  )}

                  {/* Product Details */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Product Details</h4>
                    <div className="grid grid-cols-1 gap-2 text-xs">
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
                <div className="sticky bottom-0 z-10 glass-premium backdrop-blur-md border-t border-white/20 p-3 space-y-2 pb-safe">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs h-8">
                      <Heart className="h-3 w-3" />
                      Wishlist
                    </Button>
                    <Button
                      onClick={() => setIsClosetModalOpen(true)}
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1 text-xs h-8"
                    >
                      <ShoppingBag className="h-3 w-3" />
                      Add to Closet
                    </Button>
                  </div>

                  {product.external_url ? (
                    <Button
                      onClick={handleShopNow}
                      size="lg"
                      className="w-full gap-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm h-9 shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Shop Now
                    </Button>
                  ) : (
                    <Button 
                      disabled 
                      size="lg"
                      className="w-full gap-1 opacity-50 cursor-not-allowed text-sm h-9"
                    >
                      <ShoppingBag className="h-4 w-4" />
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
