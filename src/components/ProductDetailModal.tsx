import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, ShoppingBag, Share2, Sparkles, Camera } from 'lucide-react';
import { Product } from '@/types';
import { toast } from '@/hooks/use-toast';
import { EnhancedProductGallery } from '@/components/EnhancedProductGallery';
import { AdvancedSizeColorSelector } from '@/components/AdvancedSizeColorSelector';
import { useProductAnalytics } from '@/hooks/useAnalytics';

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToWishlist?: (productId: string) => void;
  onAddToBag?: (productId: string, selectedSize?: string) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isOpen,
  onClose,
  onAddToWishlist,
  onAddToBag
}) => {
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const { trackProductView, trackWishlistAdd, trackAddToCart } = useProductAnalytics();

  useEffect(() => {
    if (product && isOpen) {
      trackProductView(product.id, 'product_detail_modal');
    }
  }, [product, isOpen, trackProductView]);

  if (!product) return null;

  const formatPrice = (cents: number, currency: string = 'USD') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);

  const handleAddToWishlist = () => {
    trackWishlistAdd(product.id);
    onAddToWishlist?.(product.id);
    toast({ title: 'Added to wishlist', description: `${product.title} has been added to your wishlist.` });
  };

  const handleAddToBag = () => {
    if (!selectedSize) {
      toast({ title: 'Please select a size', description: 'Choose a size before adding to bag.', variant: 'destructive' });
      return;
    }
    trackAddToCart(product.id, selectedSize, selectedColor);
    onAddToBag?.(product.id, selectedSize);
    toast({ title: 'Added to bag', description: `${product.title} in size ${selectedSize} has been added to your bag.` });
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: product.title, text: product.description, url: window.location.href });
      } catch {
        /* user canceled share */
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast({ title: 'Link copied', description: 'Product link has been copied to clipboard.' });
    }
  };

  const attributes = product.attributes as any;
  const mediaUrls = product.media_urls as string[];

  // Static sizes and colors to avoid glitching UI
  const availableSizes = ['XS', 'S', 'M', 'L', 'XL'].map(size => ({
    value: size,
    label: size,
    inStock: true,
    stockCount: 10
  }));

  const availableColors = [
    { value: 'black', label: 'Black', hexCode: '#000000', inStock: true },
    { value: 'white', label: 'White', hexCode: '#ffffff', inStock: true },
    { value: 'navy', label: 'Navy', hexCode: '#1e3a8a', inStock: true },
    { value: 'beige', label: 'Beige', hexCode: '#f5f5dc', inStock: true }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">{product.title}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Enhanced Image Gallery */}
          <EnhancedProductGallery
            images={mediaUrls}
            productTitle={product.title}
            hasARMesh={!!product.ar_mesh_url}
            onARTryOn={() => toast({ title: 'AR Try-On', description: 'AR feature coming soon!' })}
          />

          {/* Product Info */}
          <div className="space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h1 className="text-2xl font-bold">{product.title}</h1>
                  {product.brand && <p className="text-muted-foreground">{product.brand.name}</p>}
                </div>
                <Button variant="ghost" size="sm" onClick={handleShare}>
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <span className="text-3xl font-bold">{formatPrice(product.price_cents, product.currency)}</span>
                {product.compare_at_price_cents && product.compare_at_price_cents > product.price_cents && (
                  <span className="text-lg text-muted-foreground line-through">
                    {formatPrice(product.compare_at_price_cents, product.currency)}
                  </span>
                )}
              </div>
            </div>

            {/* Attributes */}
            <div className="flex flex-wrap gap-2">
              {attributes.occasion && <Badge variant="secondary" className="capitalize">{attributes.occasion}</Badge>}
              {attributes.material && <Badge variant="outline" className="capitalize">{attributes.material}</Badge>}
              {attributes.style_tags && attributes.style_tags.slice(0, 3).map((tag: string) => (
                <Badge key={tag} variant="outline" className="capitalize">{tag}</Badge>
              ))}
            </div>

            {/* Advanced Size & Color Selection */}
            <AdvancedSizeColorSelector
              sizes={availableSizes}
              colors={availableColors}
              selectedSize={selectedSize}
              selectedColor={selectedColor}
              onSizeSelect={setSelectedSize}
              onColorSelect={setSelectedColor}
              sizeChart={{
                XS: '32-34 inches',
                S: '34-36 inches',
                M: '36-38 inches',
                L: '38-40 inches',
                XL: '40-42 inches'
              }}
            />

            {/* Description */}
            <div>
              <h3 className="font-medium mb-2">Description</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{product.description}</p>
            </div>

            {/* Stock Status */}
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${product.stock_qty > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-muted-foreground">
                {product.stock_qty > 0 ? `${product.stock_qty} in stock` : 'Out of stock'}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button variant="outline" size="lg" className="flex-1" onClick={handleAddToWishlist}>
                <Heart className="h-4 w-4 mr-2" /> Wishlist
              </Button>
              {product.external_url ? (
                <Button size="lg" className="flex-1" onClick={() => window.open(product.external_url, '_blank')} disabled={product.stock_qty === 0}>
                  <ShoppingBag className="h-4 w-4 mr-2" /> Buy Now
                </Button>
              ) : (
                <Button size="lg" className="flex-1" onClick={handleAddToBag} disabled={product.stock_qty === 0}>
                  <ShoppingBag className="h-4 w-4 mr-2" /> Add to Bag
                </Button>
              )}
            </div>

            {/* Product Details */}
            <div className="space-y-3 pt-4 border-t">
              <h3 className="font-medium">Product Details</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">SKU:</div>
                <div>{product.sku}</div>

                {attributes.color_primary && (
                  <>
                    <div className="text-muted-foreground">Color:</div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded border border-border" style={{ backgroundColor: attributes.color_primary }} />
                      <span className="capitalize">{attributes.color_primary}</span>
                    </div>
                  </>
                )}

                {attributes.season && (
                  <>
                    <div className="text-muted-foreground">Season:</div>
                    <div className="capitalize">{attributes.season}</div>
                  </>
                )}
              </div>
            </div>

            {/* Shipping Info */}
            <div className="p-4 bg-accent/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Free Shipping</span>
              </div>
              <p className="text-xs text-muted-foreground">Orders over $100 ship free. Estimated delivery 2-5 business days.</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
