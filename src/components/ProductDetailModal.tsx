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
    if (!product?.media_urls) {
      console.log('ProductDetailModal: No media_urls for product', product?.id);
      return [];
    }
    
    try {
      // Parse media_urls if it's a JSON string, otherwise use as-is
      const media = typeof product.media_urls === 'string' 
        ? JSON.parse(product.media_urls)
        : product.media_urls;
      
      const parsedImages = Array.isArray(media) ? media.filter(Boolean) : [];
      console.log('ProductDetailModal: Parsed images for product', product.id, {
        raw_media_urls: product.media_urls,
        parsed_media: media,
        final_images: parsedImages
      });
      
      return parsedImages;
    } catch (error) {
      console.warn('Failed to parse media_urls for product:', product.id, error);
      return [];
    }
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
        className="w-[100vw] h-[100dvh] md:max-w-4xl md:max-h-[90vh] p-0 glass-premium border-white/20 rounded-none md:rounded-3xl overflow-hidden md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2"
      >
        {!product ? (
          <div className="flex h-[70vh] items-center justify-center text-sm text-muted-foreground">
            Loading product details…
          </div>
        ) : (
          <>
            {/* Mobile Layout */}
            <div className="md:hidden h-full flex flex-col">
              {/* Close Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="absolute top-3 right-3 z-30 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full h-10 w-10 text-white"
              >
                <X className="h-5 w-5" />
              </Button>

              {/* Image Gallery with Shop Now */}
              <div className="aspect-[4/5] w-full relative flex-shrink-0">
                <EnhancedProductGallery
                  images={images}
                  productTitle={product.title}
                  productId={product.id}
                  hasARMesh={false}
                />
                {/* Shop Now Button Overlay */}
                {product.is_external && product.external_url && (
                  <div className="absolute bottom-4 left-4 right-4">
                    <Button
                      onClick={handleShopNow}
                      className="w-full gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-semibold shadow-lg backdrop-blur-sm"
                      size="sm"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Shop Now on {product.merchant_name || 'ASOS'}
                    </Button>
                  </div>
                )}
              </div>

              {/* Scrollable Product Content */}
              <div className="bg-background flex-1 overflow-y-auto">
                <div className="p-4 space-y-4">
                  {/* Product Header */}
                  <div className="space-y-1.5">
                    <h1 className="text-lg font-bold leading-tight">{product.title}</h1>
                    <p className="text-muted-foreground text-xs">{product.brand?.name}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-primary">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: priceCurrency })
                          .format(priceCents / 100)}
                      </span>
                      {compareAtCents && (
                        <span className="text-base text-muted-foreground line-through">
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: priceCurrency })
                            .format(compareAtCents / 100)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Size and Color Selection with Size Chart */}
                  <div className="space-y-3">
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
                        <AccordionTrigger className="text-sm font-semibold">Description</AccordionTrigger>
                        <AccordionContent>
                          <p className="text-muted-foreground text-xs leading-relaxed">{product.description}</p>
                        </AccordionContent>
                      </AccordionItem>
                    )}
                    <AccordionItem value="details">
                      <AccordionTrigger className="text-sm font-semibold">Product Details</AccordionTrigger>
                      <AccordionContent>
                        <div className="bg-muted/50 rounded-lg p-2 space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">SKU:</span>
                            <span className="font-medium">{product.sku}</span>
                          </div>
                          <div className="flex justify-between text-xs">
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
              <div className="bg-background/95 backdrop-blur-lg border-t border-border p-3 space-y-2 pb-safe-area-inset-bottom">
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 gap-1.5 h-9 text-xs"
                  >
                    <Heart className="h-3 w-3" />
                    Wishlist
                  </Button>
                  <Button
                    onClick={() => setIsClosetModalOpen(true)}
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5 h-9 text-xs"
                  >
                    <ShoppingBag className="h-3 w-3" />
                    Add to Closet
                  </Button>
                </div>
              </div>
            </div>

            {/* Desktop Layout */}
            <div className="hidden md:flex h-full flex-col">
              {/* Close Button */}
              <Button
                variant="ghost"
                aria-label="Close product details"
                onClick={onClose}
                className="absolute top-4 right-4 z-30 bg-background/60 hover:bg-background/80 backdrop-blur-md rounded-full h-8 w-8"
              >
                <X className="h-5 w-5" />
              </Button>

              {/* Content Container */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-6 space-y-6">
                  {/* Desktop Image Gallery with Shop Now */}
                  <div className="w-full max-w-sm mx-auto relative">
                    <EnhancedProductGallery
                      images={images}
                      productTitle={product.title}
                      productId={product.id}
                      hasARMesh={false}
                    />
                    {/* Shop Now Button Overlay */}
                    {product.is_external && product.external_url && (
                      <div className="absolute bottom-4 left-4 right-4">
                        <Button
                          onClick={handleShopNow}
                          className="w-full gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-semibold shadow-lg backdrop-blur-sm"
                          size="sm"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Shop Now on {product.merchant_name || 'ASOS'}
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {/* Scrollable Product Details Content */}
                  <div className="max-w-lg mx-auto space-y-4">
                    {/* Header */}
                    <div>
                      <h2 className="text-xl font-bold font-playfair line-clamp-2 mb-1.5">{product.title}</h2>
                      <p className="text-muted-foreground text-sm">{product.brand?.name}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-xl font-bold">
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: priceCurrency })
                            .format(priceCents / 100)}
                        </span>
                        {compareAtCents && (
                          <span className="text-base text-muted-foreground line-through">
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
                </div>
              </div>

              {/* Fixed Action Buttons - Desktop */}
              <div className="bg-background/95 backdrop-blur-md border-t border-border p-4 space-y-3">
                <div className="flex gap-2 max-w-lg mx-auto">
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

                <div className="max-w-lg mx-auto">
                  <Button 
                    variant="outline"
                    disabled 
                    size="lg"
                    className="w-full gap-2 opacity-50 cursor-not-allowed text-base h-12"
                  >
                    <ShoppingBag className="h-5 w-5" />
                    Shop from Image Gallery
                  </Button>
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