
import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, ShoppingBag, ExternalLink, X, Star, Shield, Truck } from 'lucide-react';
import { Product } from '@/types';
import { EnhancedProductGallery } from './EnhancedProductGallery';
import { AdvancedSizeColorSelector } from './AdvancedSizeColorSelector';
import { AddToClosetModal } from './AddToClosetModal';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const isMobile = useIsMobile();

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

  const discountPercentage = compareAtCents 
    ? Math.round(((compareAtCents - priceCents) / compareAtCents) * 100)
    : null;

  if (isMobile) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent
          className="w-full h-full p-0 m-0 border-0 rounded-none max-w-none max-h-none bg-background/95 backdrop-blur-md"
          aria-describedby={undefined}
        >
          {!product ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center space-y-2">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm text-muted-foreground">Loading product details…</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Mobile Header with Close Button */}
              <div className="relative bg-background/80 backdrop-blur-md border-b border-border/50 px-4 py-3 flex items-center justify-between z-50">
                <div className="flex items-center space-x-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="h-8 w-8 p-0 rounded-full"
                    aria-label="Close product details"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs font-medium">4.8</span>
                    </div>
                    {discountPercentage && (
                      <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                        -{discountPercentage}%
                      </Badge>
                    )}
                  </div>
                </div>
                <Heart className="h-5 w-5 text-muted-foreground" />
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto">
                {/* Image Gallery */}
                <div className="relative aspect-square bg-muted">
                  <EnhancedProductGallery
                    images={images}
                    productTitle={product.title}
                    productId={product.id}
                    hasARMesh={false}
                  />
                </div>

                {/* Product Information */}
                <div className="p-4 space-y-6">
                  {/* Brand & Title */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-primary">{product.brand?.name}</p>
                    <h1 className="text-xl font-bold leading-tight">{product.title}</h1>
                    
                    {/* Price Section */}
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl font-bold text-primary">
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

                  {/* Trust Indicators */}
                  <div className="flex items-center space-x-4 py-3 border-y border-border/50">
                    <div className="flex items-center space-x-1.5">
                      <Truck className="h-4 w-4 text-green-600" />
                      <span className="text-xs font-medium text-green-600">Free Shipping</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <Shield className="h-4 w-4 text-blue-600" />
                      <span className="text-xs font-medium text-blue-600">Secure Payment</span>
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
                    <div className="space-y-3">
                      <h3 className="font-semibold">About this item</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {product.description}
                      </p>
                    </div>
                  )}

                  {/* Product Details */}
                  <div className="space-y-3">
                    <h3 className="font-semibold">Product Details</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between py-1">
                        <span className="text-sm text-muted-foreground">SKU</span>
                        <span className="text-sm font-medium">{product.sku}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-sm text-muted-foreground">Category</span>
                        <span className="text-sm font-medium capitalize">
                          {product.category_slug?.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Spacing for Fixed Actions */}
                  <div className="h-24" />
                </div>
              </div>

              {/* Fixed Bottom Actions */}
              <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border/50 p-4 space-y-3 safe-area-inset-bottom">
                <div className="flex gap-3">
                  <Button
                    onClick={() => setIsClosetModalOpen(true)}
                    variant="outline"
                    className="flex-1 h-12"
                  >
                    <ShoppingBag className="h-4 w-4 mr-2" />
                    Add to Closet
                  </Button>
                </div>
                
                {product.external_url ? (
                  <Button
                    onClick={handleShopNow}
                    className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Shop Now
                  </Button>
                ) : (
                  <Button disabled className="w-full h-12 opacity-50 cursor-not-allowed">
                    <ShoppingBag className="h-4 w-4 mr-2" />
                    Shop Link Not Available
                  </Button>
                )}
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
  }

  // Desktop Layout
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="w-[100vw] h-[100dvh] md:max-w-4xl md:h-auto md:max-h-[90vh] p-0 overflow-hidden glass-premium border-white/20 rounded-none md:rounded-3xl"
        aria-describedby={undefined}
      >
        {!product ? (
          <div className="flex h-[70vh] items-center justify-center text-sm text-muted-foreground">
            Loading product details…
          </div>
        ) : (
          <div className="flex flex-col md:grid md:grid-cols-2 h-full">
            {/* Image Gallery */}
            <div className="relative h-[48vh] sm:h-[50vh] md:h-full">
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
              <div className="p-4 md:p-6 space-y-4 md:space-y-6 flex-1 overflow-y-auto">
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
              <div className="sticky bottom-0 z-10 glass-premium backdrop-blur-md border-t border-white/20 p-4 md:p-6 space-y-3 pb-safe md:static">
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
