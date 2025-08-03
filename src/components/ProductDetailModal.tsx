import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Heart, ShoppingBag, Camera, Share2, Sparkles } from 'lucide-react';
import { Product } from '@/types';
import { toast } from '@/hooks/use-toast';

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
  const [selectedImage, setSelectedImage] = useState(0);

  if (!product) return null;

  const formatPrice = (cents: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(cents / 100);
  };

  const handleAddToWishlist = () => {
    onAddToWishlist?.(product.id);
    toast({
      title: "Added to wishlist",
      description: `${product.title} has been added to your wishlist.`,
    });
  };

  const handleAddToBag = () => {
    if (!selectedSize) {
      toast({
        title: "Please select a size",
        description: "Choose a size before adding to bag.",
        variant: "destructive"
      });
      return;
    }
    
    onAddToBag?.(product.id, selectedSize);
    toast({
      title: "Added to bag",
      description: `${product.title} in size ${selectedSize} has been added to your bag.`,
    });
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.title,
          text: product.description,
          url: window.location.href
        });
      } catch (error) {
        // User cancelled share
      }
    } else {
      // Fallback to copying URL
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied",
        description: "Product link has been copied to clipboard.",
      });
    }
  };

  const attributes = product.attributes as any;
  const mediaUrls = product.media_urls as string[];
  const availableSizes = ['XS', 'S', 'M', 'L', 'XL']; // Could be derived from product data

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">{product.title}</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="relative aspect-square overflow-hidden rounded-lg bg-accent">
              <img
                src={mediaUrls[selectedImage] || '/placeholder.svg'}
                alt={product.title}
                className="w-full h-full object-cover"
              />
              {product.ar_mesh_url && (
                <Button
                  size="sm"
                  className="absolute top-4 right-4 bg-background/80 backdrop-blur-sm"
                  onClick={() => {
                    toast({
                      title: "AR Try-On",
                      description: "AR feature coming soon!",
                    });
                  }}
                >
                  <Camera className="h-4 w-4 mr-1" />
                  Try AR
                </Button>
              )}
            </div>
            
            {mediaUrls.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {mediaUrls.map((url, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`flex-shrink-0 w-16 h-16 rounded border-2 overflow-hidden ${
                      selectedImage === index ? 'border-primary' : 'border-border'
                    }`}
                  >
                    <img
                      src={url}
                      alt={`${product.title} view ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h1 className="text-2xl font-bold">{product.title}</h1>
                  {product.brand && (
                    <p className="text-muted-foreground">{product.brand.name}</p>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={handleShare}>
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex items-center gap-2 mb-4">
                <span className="text-3xl font-bold">
                  {formatPrice(product.price_cents, product.currency)}
                </span>
                {product.compare_at_price_cents && product.compare_at_price_cents > product.price_cents && (
                  <span className="text-lg text-muted-foreground line-through">
                    {formatPrice(product.compare_at_price_cents, product.currency)}
                  </span>
                )}
              </div>
            </div>

            {/* Attributes */}
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {attributes.occasion && (
                  <Badge variant="secondary" className="capitalize">
                    {attributes.occasion}
                  </Badge>
                )}
                {attributes.material && (
                  <Badge variant="outline" className="capitalize">
                    {attributes.material}
                  </Badge>
                )}
                {attributes.style_tags && attributes.style_tags.slice(0, 3).map((tag: string) => (
                  <Badge key={tag} variant="outline" className="capitalize">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Size Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Size</label>
              <Select value={selectedSize} onValueChange={setSelectedSize}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a size" />
                </SelectTrigger>
                <SelectContent>
                  {availableSizes.map(size => (
                    <SelectItem key={size} value={size}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div>
              <h3 className="font-medium mb-2">Description</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {product.description}
              </p>
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
              <Button 
                variant="outline" 
                size="lg" 
                className="flex-1"
                onClick={handleAddToWishlist}
              >
                <Heart className="h-4 w-4 mr-2" />
                Wishlist
              </Button>
              <Button 
                size="lg" 
                className="flex-1"
                onClick={handleAddToBag}
                disabled={product.stock_qty === 0}
              >
                <ShoppingBag className="h-4 w-4 mr-2" />
                Add to Bag
              </Button>
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
                      <div 
                        className="w-4 h-4 rounded border border-border"
                        style={{ backgroundColor: attributes.color_primary }}
                      />
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
              <p className="text-xs text-muted-foreground">
                Orders over $100 ship free. Estimated delivery 2-5 business days.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};