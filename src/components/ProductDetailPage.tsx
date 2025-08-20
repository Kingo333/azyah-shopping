import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Heart, ShoppingBag, ExternalLink, ArrowLeft, Share } from 'lucide-react';
import { Product } from '@/types';
import { EnhancedProductGallery } from './EnhancedProductGallery';
import { AdvancedSizeColorSelector } from './AdvancedSizeColorSelector';
import { AddToClosetModal } from './AddToClosetModal';
import { useToast } from '@/hooks/use-toast';
import { useProductAnalytics } from '@/hooks/useAnalytics';

interface ProductDetailPageProps {
  product: Product;
  onBack: () => void;
}

const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  product,
  onBack
}) => {
  const { toast } = useToast();
  const { trackProductView, trackProductClick } = useProductAnalytics();

  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [isClosetModalOpen, setIsClosetModalOpen] = useState(false);

  // Track product view when component mounts
  useEffect(() => {
    if (product) {
      trackProductView(product.id, 'product_detail_page');
    }
  }, [product, trackProductView]);

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

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.title,
          text: `Check out this ${product.title} from ${product.brand?.name}`,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback - copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast({ description: 'Link copied to clipboard!' });
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="container max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="hover:bg-accent/50"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div className="hidden md:block">
                <h1 className="text-lg font-semibold truncate max-w-md">{product.title}</h1>
                <p className="text-sm text-muted-foreground">{product.brand?.name}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="hover:bg-accent/50"
            >
              <Share className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-7xl mx-auto px-4 py-6 pb-20 md:pb-6">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Image Gallery */}
          <div className="space-y-6">
            <div className="aspect-[4/5] lg:aspect-square w-full">
              <EnhancedProductGallery
                images={images}
                productTitle={product.title}
                productId={product.id}
                hasARMesh={false}
              />
            </div>
          </div>

          {/* Product Information */}
          <div className="space-y-4 md:space-y-6">
            {/* Product Header - Mobile */}
            <div className="md:hidden space-y-2">
              <h1 className="text-xl font-bold leading-tight">{product.title}</h1>
              <p className="text-sm text-muted-foreground">{product.brand?.name}</p>
            </div>

            {/* Product Header - Desktop */}
            <div className="hidden md:block space-y-4">
              <div className="space-y-2">
                <h1 className="text-3xl lg:text-4xl font-bold font-playfair leading-tight">{product.title}</h1>
                <p className="text-lg text-muted-foreground">{product.brand?.name}</p>
              </div>
            </div>

            {/* Price */}
            <div className="space-y-1 md:space-y-2">
              <div className="flex items-center gap-2 md:gap-3">
                <span className="text-xl md:text-2xl lg:text-3xl font-bold text-primary">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: priceCurrency })
                    .format(priceCents / 100)}
                </span>
                {compareAtCents && (
                  <span className="text-base md:text-lg text-muted-foreground line-through">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: priceCurrency })
                      .format(compareAtCents / 100)}
                  </span>
                )}
              </div>
              {compareAtCents && (
                <p className="text-xs md:text-sm text-green-600 font-medium">
                  Save {new Intl.NumberFormat('en-US', { style: 'currency', currency: priceCurrency })
                    .format((compareAtCents - priceCents) / 100)}
                </p>
              )}
            </div>

            {/* Size and Color Selection */}
            <div className="space-y-3 md:space-y-4">
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

            {/* Action Buttons */}
            <div className="space-y-3">
              <div className="flex gap-2 md:gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1 gap-2 text-xs md:text-sm h-9 md:h-10"
                  onClick={() => {/* Add wishlist functionality */}}
                >
                  <Heart className="h-3 w-3 md:h-4 md:w-4" />
                  Wishlist
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-2 text-xs md:text-sm h-9 md:h-10"
                  onClick={() => setIsClosetModalOpen(true)}
                >
                  <ShoppingBag className="h-3 w-3 md:h-4 md:w-4" />
                  Add to Closet
                </Button>
              </div>

              {product.external_url ? (
                <Button
                  onClick={handleShopNow}
                  size="lg"
                  className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg hover:shadow-xl transition-all duration-200 h-11 md:h-12 text-sm md:text-base"
                >
                  <ExternalLink className="h-4 w-4 md:h-5 md:w-5" />
                  Shop Now
                </Button>
              ) : (
                <Button 
                  disabled 
                  size="lg"
                  className="w-full gap-2 opacity-50 cursor-not-allowed h-11 md:h-12 text-sm md:text-base"
                >
                  <ShoppingBag className="h-4 w-4 md:h-5 md:w-5" />
                  Shop Link Not Available
                </Button>
              )}
            </div>

            {/* Product Details */}
            <div className="space-y-3 md:space-y-4">
              <Accordion type="single" collapsible defaultValue="description">
                {product.description && (
                  <AccordionItem value="description">
                    <AccordionTrigger className="text-sm md:text-base font-semibold py-3">Description</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-muted-foreground leading-relaxed text-sm md:text-base">{product.description}</p>
                    </AccordionContent>
                  </AccordionItem>
                )}
                <AccordionItem value="details">
                  <AccordionTrigger className="text-sm md:text-base font-semibold py-3">Product Details</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 md:space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4 text-xs md:text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">SKU:</span>
                          <span className="font-medium">{product.sku}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Category:</span>
                          <span className="font-medium capitalize">{product.category_slug?.replace('_', ' ')}</span>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="shipping">
                  <AccordionTrigger className="text-sm md:text-base font-semibold py-3">Shipping & Returns</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 md:space-y-3 text-xs md:text-sm text-muted-foreground">
                      <p>• Free shipping on orders over $100</p>
                      <p>• 30-day return policy</p>
                      <p>• Express delivery available</p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </div>
      </main>

      {/* Add to Closet Modal */}
      <AddToClosetModal
        productId={product.id}
        isOpen={isClosetModalOpen}
        onClose={() => setIsClosetModalOpen(false)}
      />
    </div>
  );
};

export default ProductDetailPage;