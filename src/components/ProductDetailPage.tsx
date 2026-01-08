import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Heart, ShoppingBag, ExternalLink, ArrowLeft, Share } from 'lucide-react';
import { Product } from '@/types';
import { EnhancedProductGallery } from './EnhancedProductGallery';
import { AdvancedSizeColorSelector } from './AdvancedSizeColorSelector';
// AddToClosetModal removed - feature deprecated
import { useToast } from '@/hooks/use-toast';
import { useAnalytics } from '@/hooks/useAnalytics';
import { getProductImageUrls } from '@/utils/imageHelpers';
import { openExternalUrl } from '@/lib/openExternalUrl';
interface ProductDetailPageProps {
  product: Product;
  onBack: () => void;
}
const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  product,
  onBack
}) => {
  const {
    toast
  } = useToast();
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [isClosetModalOpen, setIsClosetModalOpen] = useState(false);
  const images = useMemo<string[]>(() => {
    return getProductImageUrls(product);
  }, [product]);
  const priceCurrency = product?.currency || 'USD';
  const priceCents = product?.price_cents ?? 0;
  const compareAtCents = product?.compare_at_price_cents ?? null;
  const handleShopNow = async () => {
    console.log('Product Detail Shop Now clicked - URL:', product?.external_url);
    if (product?.external_url && product?.id) {
      const opened = await openExternalUrl(product.external_url);
      if (opened) {
        toast({
          description: 'Opening product page...'
        });
      }
    } else {
      console.log('No external URL available for product:', product?.id);
      toast({
        description: 'Shop link not available for this product',
        variant: 'destructive'
      });
    }
  };
  const handleShare = async () => {
    // NOTE: /products/:id route doesn't exist yet - show toast instead of dead link
    toast({
      title: "Sharing coming soon",
      description: "Product sharing will be available soon!",
    });
  };
  const availableSizes = ['XS', 'S', 'M', 'L', 'XL'].map(size => ({
    value: size,
    label: size,
    inStock: true,
    stockCount: 10
  }));
  const availableColors = [{
    value: 'black',
    label: 'Black',
    hexCode: '#000000',
    inStock: true
  }, {
    value: 'white',
    label: 'White',
    hexCode: '#ffffff',
    inStock: true
  }, {
    value: 'navy',
    label: 'Navy',
    hexCode: '#1e3a8a',
    inStock: true
  }, {
    value: 'beige',
    label: 'Beige',
    hexCode: '#f5f5dc',
    inStock: true
  }];
  return <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      {/* Header - Mobile optimized */}
      <header className="sticky top-0 z-50 bg-background border-b border-border shadow-sm">
        <div className="px-4 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={onBack} className="bg-background hover:bg-accent border-border shadow-sm">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="hidden md:block">
                <h1 className="text-lg font-semibold truncate max-w-md">{product.title}</h1>
                <p className="text-sm text-muted-foreground">{product.brand?.name}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleShare} className="bg-background hover:bg-accent border-border shadow-sm">
              <Share className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content - Mobile optimized layout */}
      <main className="flex-1">
        <div className="max-w-md mx-auto md:max-w-7xl lg:mx-auto">
          <div className="flex flex-col lg:grid lg:grid-cols-2 lg:gap-12 lg:px-4">
            {/* Image Gallery - Mobile optimized */}
            <div className="order-1 px-4 py-4 pb-8 lg:px-0">
              <div className="aspect-[3/4] md:aspect-[3/4] lg:aspect-[4/5] w-full min-h-[400px] md:min-h-[500px] lg:min-h-[600px]">
                <EnhancedProductGallery images={images} productTitle={product.title} productId={product.id} hasARMesh={false} />
              </div>
            </div>

            {/* Product Information */}
            <div className="order-2 px-4 pb-4 lg:px-0 lg:pb-4 space-y-4 md:space-y-6">
              {/* Product Header - Mobile */}
              <div className="md:hidden space-y-2 pt-2">
                <h1 className="text-xl font-bold leading-tight">{product.title}</h1>
                <p className="text-sm text-muted-foreground">
                  {product.brand?.name || product.merchant_name || product.retailer?.name || ''}
                </p>
              </div>

              {/* Product Header - Desktop */}
              <div className="hidden md:block space-y-4 pt-4">
                <div className="space-y-2">
                  <h1 className="text-2xl lg:text-3xl font-bold leading-tight">{product.title}</h1>
                  <p className="text-lg text-muted-foreground">
                    {product.brand?.name || product.merchant_name || product.retailer?.name || ''}
                  </p>
                </div>
              </div>

              {/* Price */}
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-2xl lg:text-3xl font-bold text-primary">
                    {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: priceCurrency
                  }).format(priceCents / 100)}
                  </span>
                  {compareAtCents && <span className="text-lg text-muted-foreground line-through">
                      {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: priceCurrency
                  }).format(compareAtCents / 100)}
                    </span>}
                </div>
                {compareAtCents && <p className="text-sm text-green-600 font-medium">
                    Save {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: priceCurrency
                }).format((compareAtCents - priceCents) / 100)}
                  </p>}
              </div>

              {/* Size and Color Selection */}
              <div className="space-y-4">
                <AdvancedSizeColorSelector sizes={availableSizes} colors={availableColors} selectedSize={selectedSize} selectedColor={selectedColor} onSizeSelect={setSelectedSize} onColorSelect={setSelectedColor} sizeChart={{
                "XS": "Chest: 32-34, Waist: 24-26",
                "S": "Chest: 34-36, Waist: 26-28",
                "M": "Chest: 36-38, Waist: 28-30",
                "L": "Chest: 38-40, Waist: 30-32",
                "XL": "Chest: 40-42, Waist: 32-34"
              }} sizeChartImage="/placeholder.svg" />
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 gap-2" onClick={() => {/* Add wishlist functionality */}}>
                    <Heart className="h-4 w-4" />
                    Wishlist
                  </Button>
                  <Button variant="outline" className="flex-1 gap-2" onClick={() => setIsClosetModalOpen(true)}>
                    <ShoppingBag className="h-4 w-4" />
                    Add to Closet
                  </Button>
                </div>

                {product.external_url ? <Button onClick={handleShopNow} size="lg" className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg hover:shadow-xl transition-all duration-200">
                    <ExternalLink className="h-5 w-5" />
                    Shop Now
                  </Button> : <Button disabled size="lg" className="w-full gap-2 opacity-50 cursor-not-allowed">
                    <ShoppingBag className="h-5 w-5" />
                    Shop Link Not Available
                  </Button>}
              </div>

              {/* Product Details */}
              <div className="space-y-4">
                <Accordion type="single" collapsible defaultValue="description">
                  {product.description && <AccordionItem value="description">
                      <AccordionTrigger className="font-semibold">Description</AccordionTrigger>
                      <AccordionContent>
                        <p className="text-muted-foreground leading-relaxed">{product.description}</p>
                      </AccordionContent>
                    </AccordionItem>}
                  <AccordionItem value="details">
                    <AccordionTrigger className="font-semibold">Product Details</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                           {product.sku && <div className="flex justify-between">
                               <span className="text-muted-foreground">SKU:</span>
                               <span className="font-medium">{product.sku}</span>
                             </div>}
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Category:</span>
                            <span className="font-medium capitalize">{product.category_slug?.replace('_', ' ')}</span>
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="shipping">
                    <AccordionTrigger className="font-semibold">Shipping & Returns</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-sm text-muted-foreground">
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
        </div>
      </main>

      {/* Add to Closet Modal - Feature Deprecated */}
    </div>;
};
export default ProductDetailPage;