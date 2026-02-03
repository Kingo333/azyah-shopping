import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Heart, ShoppingBag, ExternalLink, ArrowLeft, Share } from 'lucide-react';
import { Product } from '@/types';
import { EnhancedProductGallery } from './EnhancedProductGallery';
import { useToast } from '@/hooks/use-toast';
import { getProductImageUrls } from '@/utils/imageHelpers';
import { openExternalUrl } from '@/lib/openExternalUrl';
import { Money } from '@/components/ui/Money';
import { useWishlist } from '@/hooks/useWishlist';
interface ProductDetailPageProps {
  product: Product;
  onBack: () => void;
}
const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  product,
  onBack
}) => {
  const { toast } = useToast();
  const { addToWishlist, isLoading: wishlistLoading } = useWishlist(product?.id);
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
  const handleWishlist = async () => {
    if (product?.id) {
      try {
        await addToWishlist(product.id);
        toast({ description: `${product.title} added to your wishlist!` });
      } catch {
        toast({ description: 'Failed to add to wishlist', variant: 'destructive' });
      }
    }
  };

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
          <Button variant="outline" size="sm" onClick={() => toast({ title: "Sharing coming soon", description: "Product sharing will be available soon!" })} className="bg-background hover:bg-accent border-border shadow-sm">
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
                  <Money 
                    cents={priceCents} 
                    currency={priceCurrency} 
                    showOriginal={true}
                    className="text-2xl lg:text-3xl font-bold text-primary" 
                  />
                  {compareAtCents && (
                    <span className="text-lg text-muted-foreground line-through">
                      <Money cents={compareAtCents} currency={priceCurrency} />
                    </span>
                  )}
                </div>
                {compareAtCents && (
                  <p className="text-sm text-primary font-medium">
                    Save <Money cents={compareAtCents - priceCents} currency={priceCurrency} />
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 gap-2" onClick={handleWishlist} disabled={wishlistLoading}>
                    <Heart className="h-4 w-4" />
                    Wishlist
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
    </div>;
};
export default ProductDetailPage;