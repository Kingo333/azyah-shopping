
import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Heart, ShoppingBag, ExternalLink, X } from 'lucide-react';
import { Product } from '@/types';
import { EnhancedProductGallery } from './EnhancedProductGallery';
import { AdvancedSizeColorSelector } from './AdvancedSizeColorSelector';
import { AddToClosetModal } from './AddToClosetModal';
import { useToast } from '@/hooks/use-toast';
import { useProductAnalytics } from '@/hooks/useAnalytics';

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
  const { trackProductView, trackProductClick } = useProductAnalytics();

  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [isClosetModalOpen, setIsClosetModalOpen] = useState(false);

  // Track product view when modal opens
  useEffect(() => {
    if (product && isOpen) {
      trackProductView(product.id, 'product_detail_modal');
    }
  }, [product, isOpen, trackProductView]);

  const images = useMemo<string[]>(() => {
    const media = (product?.media_urls ?? []) as unknown as string[];
    return Array.isArray(media) ? media.filter(Boolean) : [];
  }, [product]);

  const priceCurrency = product?.currency || 'USD';
  const priceCents = product?.price_cents ?? 0;
  const compareAtCents = product?.compare_at_price_cents ?? null;

  const handleShopNow = () => {
    if (product?.external_url && product?.id) {
      trackProductClick(product.id, 'shop_now_button');
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
        className="w-[100vw] h-[100dvh] md:max-w-4xl md:max-h-[90vh] p-0 glass-premium border-white/20 rounded-none md:rounded-3xl top-0 left-0 translate-x-0 translate-y-0 overflow-y-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2"
      >
        {!product ? (
          <div className="flex h-[70vh] items-center justify-center text-sm text-muted-foreground">
            Loading product details…
          </div>
        ) : (
          <>
            {/* Mobile Layout */}
            <div className="md:hidden flex flex-col h-full min-h-0">
              {/* Fixed Header with Close Button */}
              <div className="relative flex-shrink-0">
                <div className="absolute top-3 right-3 z-30">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full h-10 w-10 text-white"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                
                {/* Image Gallery */}
                <div>
                  <EnhancedProductGallery
                    images={images}
                    productTitle={product.title}
                    productId={product.id}
                    hasARMesh={false}
                  />
                </div>
                <div className="border-t border-border" />
              </div>

              {/* Scrollable Content Area */}
              <div className="flex-1 min-h-0 overflow-y-auto bg-background">
                <div className="p-4 space-y-4 pb-40">
                  {/* Product Header */}
                  <div className="space-y-2">
                    <h1 className="text-xl font-bold leading-tight">{product.title}</h1>
                    <p className="text-muted-foreground text-sm">{product.brand?.name}</p>
                    <div className="flex items-center gap-3">
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

                  {/* Size and Color Selection with Size Chart */}
                  <div className="space-y-4">
                    <AdvancedSizeColorSelector
                      sizes={availableSizes}
                      colors={availableColors}
                      selectedSize={selectedSize}
                      selectedColor={selectedColor}
                      onSizeSelect={setSelectedSize}
                      onColorSelect={setSelectedColor}
                      sizeChart={{
                        "XS": "Chest: 32-34, Waist: 24-26",
                        "S": "Chest: 34-36, Waist: 26-28", 
                        "M": "Chest: 36-38, Waist: 28-30",
                        "L": "Chest: 38-40, Waist: 30-32",
                        "XL": "Chest: 40-42, Waist: 32-34"
                      }}
                      sizeChartImage="/placeholder.svg"
                    />
                  </div>

                  <Accordion type="single" collapsible defaultValue="details">
                    {product.description && (
                      <AccordionItem value="description">
                        <AccordionTrigger className="text-base font-semibold">Description</AccordionTrigger>
                        <AccordionContent>
                          <p className="text-muted-foreground text-sm leading-relaxed">{product.description}</p>
                        </AccordionContent>
                      </AccordionItem>
                    )}
                    <AccordionItem value="details">
                      <AccordionTrigger className="text-base font-semibold">Product Details</AccordionTrigger>
                      <AccordionContent>
                        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">SKU:</span>
                            <span className="font-medium">{product.sku}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Category:</span>
                            <span className="font-medium capitalize">{product.category_slug?.replace('_', ' ')}</span>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </div>

              {/* Fixed Bottom Actions */}
              <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-t border-border p-4 space-y-3 pb-mobile-safe">
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 gap-2 h-11"
                  >
                    <Heart className="h-4 w-4" />
                    Wishlist
                  </Button>
                  <Button
                    onClick={() => setIsClosetModalOpen(true)}
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2 h-11"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    Add to Closet
                  </Button>
                </div>

                {product.external_url ? (
                  <Button
                    onClick={handleShopNow}
                    size="lg"
                    className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-12 shadow-lg"
                  >
                    <ExternalLink className="h-5 w-5" />
                    Shop Now
                  </Button>
                ) : (
                  <Button 
                    disabled 
                    size="lg"
                    className="w-full gap-2 opacity-50 cursor-not-allowed h-12"
                  >
                    <ShoppingBag className="h-5 w-5" />
                    Shop Link Not Available
                  </Button>
                )}
              </div>
            </div>

            {/* Desktop Layout */}
            <div className="hidden md:grid md:grid-cols-2 h-full">
              {/* Image Gallery */}
              <div className="relative h-full">
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
                  className="absolute top-4 right-4 z-20 bg-background/60 hover:bg-background/80 backdrop-blur-md rounded-full h-8 w-8 md:block"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Product Details */}
              <div className="flex flex-col h-full glass-subtle border-white/10">
                <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                  {/* Header */}
                  <div>
                    <h2 className="text-2xl font-bold font-playfair line-clamp-2 mb-2">{product.title}</h2>
                    <p className="text-muted-foreground">{product.brand?.name}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-2xl font-bold">
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
                    sizeChart={{
                      "XS": "Chest: 32-34, Waist: 24-26",
                      "S": "Chest: 34-36, Waist: 26-28", 
                      "M": "Chest: 36-38, Waist: 28-30",
                      "L": "Chest: 38-40, Waist: 30-32",
                      "XL": "Chest: 40-42, Waist: 32-34"
                    }}
                    sizeChartImage="/placeholder.svg"
                  />

                  <Accordion type="single" collapsible defaultValue="details">
                    {product.description && (
                      <AccordionItem value="description">
                        <AccordionTrigger className="text-base font-semibold">Description</AccordionTrigger>
                        <AccordionContent>
                          <p className="text-muted-foreground text-sm leading-relaxed">{product.description}</p>
                        </AccordionContent>
                      </AccordionItem>
                    )}
                    <AccordionItem value="details">
                      <AccordionTrigger className="text-base font-semibold">Product Details</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">SKU:</span>
                            <span>{product.sku}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Category:</span>
                            <span className="capitalize">{product.category_slug?.replace('_', ' ')}</span>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>

                {/* Sticky Footer */}
                <div className="sticky bottom-0 z-10 glass-premium backdrop-blur-md border-t border-white/20 p-6 space-y-3">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 gap-2 text-sm h-10">
                      <Heart className="h-4 w-4" />
                      Wishlist
                    </Button>
                    <Button
                      onClick={() => setIsClosetModalOpen(true)}
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-2 text-sm h-10"
                    >
                      <ShoppingBag className="h-4 w-4" />
                      Add to Closet
                    </Button>
                  </div>

                  {product.external_url ? (
                    <Button
                      onClick={handleShopNow}
                      size="lg"
                      className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base h-12 shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      <ExternalLink className="h-5 w-5" />
                      Shop Now
                    </Button>
                  ) : (
                    <Button 
                      disabled 
                      size="lg"
                      className="w-full gap-2 opacity-50 cursor-not-allowed text-base h-12"
                    >
                      <ShoppingBag className="h-5 w-5" />
                      Shop Link Not Available
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </>
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
