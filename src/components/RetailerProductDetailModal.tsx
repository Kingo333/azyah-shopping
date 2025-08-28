import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Product } from '@/types';
import { Edit, ExternalLink, Package, Heart, Share } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RetailerProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (product: Product) => void;
  onProductUpdated?: () => void;
}

export const RetailerProductDetailModal: React.FC<RetailerProductDetailModalProps> = ({
  product,
  isOpen,
  onClose,
  onEdit,
  onProductUpdated
}) => {
  const { toast } = useToast();

  if (!product) return null;

  const handleEdit = () => {
    onEdit?.(product);
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: product.title,
          text: `Check out this ${product.title}`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          description: "Product link copied to clipboard!",
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleExternalLink = () => {
    if (product.external_url) {
      window.open(product.external_url, '_blank', 'noopener,noreferrer');
    }
  };

  const images = Array.isArray(product.media_urls) ? product.media_urls : [];
  const primaryImage = product.image_url || (images.length > 0 ? images[0] : null);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Product Details</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Image Section */}
          <div className="space-y-4">
            <div className="aspect-square bg-muted rounded-lg overflow-hidden">
              {primaryImage ? (
                <img 
                  src={primaryImage} 
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
            </div>
            
            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {images.slice(1, 5).map((image, index) => (
                  <div key={index} className="aspect-square bg-muted rounded overflow-hidden">
                    <img 
                      src={image} 
                      alt={`${product.title} ${index + 2}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Product Information */}
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold">{product.title}</h2>
              {product.brand?.name && (
                <p className="text-lg text-muted-foreground">{product.brand.name}</p>
              )}
            </div>

            <div className="flex items-center gap-4">
              <span className="text-3xl font-bold text-primary">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: product.currency || 'USD'
                }).format((product.price_cents || 0) / 100)}
              </span>
              
              {product.compare_at_price_cents && (
                <span className="text-lg text-muted-foreground line-through">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: product.currency || 'USD'
                  }).format(product.compare_at_price_cents / 100)}
                </span>
              )}
            </div>

            <div className="flex gap-2 flex-wrap">
              <Badge variant="secondary">{product.category_slug}</Badge>
              {product.subcategory_slug && (
                <Badge variant="outline">{product.subcategory_slug}</Badge>
              )}
              <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                {product.status}
              </Badge>
            </div>

            {product.description && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-muted-foreground">{product.description}</p>
                </div>
              </>
            )}

            <Separator />
            
            <div className="space-y-2">
              <h3 className="font-semibold">Product Details</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">SKU:</span>
                  <span className="ml-2">{product.sku}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Stock:</span>
                  <span className="ml-2">{product.stock_qty}</span>
                </div>
                {product.attributes?.size && (
                  <div>
                    <span className="text-muted-foreground">Size:</span>
                    <span className="ml-2">{product.attributes.size}</span>
                  </div>
                )}
                {product.attributes?.color_primary && (
                  <div>
                    <span className="text-muted-foreground">Color:</span>
                    <span className="ml-2">{product.attributes.color_primary}</span>
                  </div>
                )}
              </div>
            </div>

            {product.external_url && (
              <>
                <Separator />
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handleExternalLink}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Original Product
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};