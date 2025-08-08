
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, Share2, ShoppingCart, ArrowLeft, Eye, Ruler } from 'lucide-react';
import { Product } from '@/types';
import { toast } from '@/hooks/use-toast';
import { EnhancedProductGallery } from '@/components/EnhancedProductGallery';
import { AdvancedSizeColorSelector } from '@/components/AdvancedSizeColorSelector';
import { useProductAnalytics } from '@/hooks/useAnalytics';
import { formatPrice } from '@/utils/productHelpers';

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart?: (productId: string, size?: string, color?: string) => void;
  onAddToWishlist?: (productId: string) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isOpen,
  onClose,
  onAddToCart,
  onAddToWishlist
}) => {
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const { trackProductView } = useProductAnalytics();

  useEffect(() => {
    if (product && isOpen) {
      trackProductView(product.id, 'product_detail_modal');
    }
  }, [product, isOpen, trackProductView]);

  if (!product) return null;

  const handleAddToCart = () => {
    if (onAddToCart) {
      onAddToCart(product.id, selectedSize, selectedColor);
      toast({
        title: "Added to cart",
        description: `${product.title} has been added to your cart`
      });
    }
  };

  const handleAddToWishlist = () => {
    if (onAddToWishlist) {
      onAddToWishlist(product.id);
      toast({
        title: "Added to wishlist",
        description: `${product.title} has been added to your wishlist`
      });
    }
  };

  const handleShare = async () => {
    const productUrl = `${window.location.origin}/products/${product.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ 
          title: product.title, 
          text: product.description, 
          url: productUrl 
        });
      } catch {
        /* user canceled share */
      }
    } else {
      await navigator.clipboard.writeText(productUrl);
      toast({ title: 'Link copied', description: 'Product link has been copied to clipboard.' });
    }
  };

  const attributes = product.attributes as any;
  const mediaUrls = Array.isArray(product.media_urls) ? product.media_urls : 
                   typeof product.media_urls === 'string' ? [product.media_urls] : [];

  // Static sizes and colors for preview
  const availableSizes = ['XS', 'S', 'M', 'L', 'XL'].map(size => ({
    value: size,
    label: size,
    inStock: true,
    stockCount: Math.floor(Math.random() * 20) + 1
  }));

  const availableColors = [
    { value: 'black', label: 'Black', hexCode: '#000000', inStock: true },
    { value: 'white', label: 'White', hexCode: '#ffffff', inStock: true },
    { value: 'navy', label: 'Navy', hexCode: '#1e3a8a', inStock: true },
    { value: 'beige', label: 'Beige', hexCode: '#f5f5dc', inStock: true }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[95vh] overflow-hidden p-0">
        <div className="flex flex-col h-full">
          {/* Mobile Header */}
          <div className="lg:hidden flex items-center justify-between p-4 border-b">
            <Button variant="ghost" size="sm" onClick={onClose}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleShare}>
                <Share2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleAddToWishlist}>
                <Heart className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:gap-8 h-full">
              {/* Enhanced Image Gallery */}
              <div className="lg:p-6">
                <EnhancedProductGallery
                  images={mediaUrls}
                  productTitle={product.title}
                  hasARMesh={!!product.ar_mesh_url}
                  onARTryOn={() => toast({ title: 'AR Try-On', description: 'AR feature coming soon!' })}
                />
              </div>

              {/* Product Info */}
              <div className="p-4 lg:p-6 space-y-6">
                {/* Header */}
                <div>
                  <div className="hidden lg:flex items-center justify-between mb-4">
                    <DialogTitle className="sr-only">{product.title}</DialogTitle>
                    <div />
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={handleShare}>
                        <Share2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={handleAddToWishlist}>
                        <Heart className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <h1 className="text-xl lg:text-3xl font-bold mb-2">{product.title}</h1>
                  {product.brand && (
                    <p className="text-muted-foreground text-sm lg:text-base">{product.brand.name}</p>
                  )}
                  
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="capitalize text-xs">
                      {product.status.replace('_', ' ')}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {Math.floor(Math.random() * 1000) + 100} views
                    </span>
                  </div>
                </div>

                {/* Pricing */}
                <div className="flex items-center gap-4">
                  <span className="text-2xl lg:text-3xl font-bold">
                    {formatPrice(product.price_cents, product.currency)}
                  </span>
                  {product.compare_at_price_cents && product.compare_at_price_cents > product.price_cents && (
                    <span className="text-lg text-muted-foreground line-through">
                      {formatPrice(product.compare_at_price_cents, product.currency)}
                    </span>
                  )}
                </div>

                {/* Attributes */}
                {attributes && (
                  <div className="flex flex-wrap gap-2">
                    {attributes.occasion && (
                      <Badge variant="secondary" className="capitalize text-xs">
                        {attributes.occasion}
                      </Badge>
                    )}
                    {attributes.material && (
                      <Badge variant="outline" className="capitalize text-xs">
                        {attributes.material}
                      </Badge>
                    )}
                    {attributes.style_tags && attributes.style_tags.slice(0, 3).map((tag: string) => (
                      <Badge key={tag} variant="outline" className="capitalize text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Size & Color Selection */}
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
                  sizeChartImage={attributes?.size_chart}
                />

                {/* Description */}
                <div>
                  <h3 className="font-medium mb-2">Description</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {product.description || 'No description available.'}
                  </p>
                </div>

                {/* Stock Info */}
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Stock:</span>
                      <span className={`ml-2 font-medium ${
                        (product.stock_qty || 0) <= 5 ? 'text-red-500' : 'text-green-500'
                      }`}>
                        {product.stock_qty || 0} units
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">SKU:</span>
                      <span className="ml-2 font-medium">{product.sku}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3 pt-4 border-t">
                  <Button 
                    onClick={handleAddToCart} 
                    className="w-full"
                    size="lg"
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Add to Cart
                  </Button>
                  
                  {product.external_url && (
                    <Button 
                      variant="outline" 
                      onClick={() => window.open(product.external_url, '_blank')}
                      className="w-full"
                      size="lg"
                    >
                      Shop Now
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
