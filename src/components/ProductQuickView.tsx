import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Heart, Plus, Info } from 'lucide-react';
import { EnhancedClosetItem } from '@/hooks/useEnhancedClosets';

interface ProductQuickViewProps {
  product: EnhancedClosetItem | null;
  onClose: () => void;
}

export const ProductQuickView: React.FC<ProductQuickViewProps> = ({
  product,
  onClose
}) => {
  if (!product) return null;

  const formatPrice = (cents?: number, currency = 'USD') => {
    if (!cents) return 'Price not available';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(cents / 100);
  };

  return (
    <Dialog open={!!product} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Product Details
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Product Image */}
          <div className="space-y-4">
            <div className="aspect-square bg-gray-50 rounded-lg overflow-hidden">
              <img
                src={product.image_bg_removed_url || product.image_url || '/placeholder.svg'}
                alt={product.title || 'Product'}
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Additional images if available */}
            {product.products?.media_urls && product.products.media_urls.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {product.products.media_urls.slice(1, 5).map((url: string, index: number) => (
                  <div key={index} className="flex-shrink-0 w-16 h-16 bg-gray-50 rounded overflow-hidden">
                    <img
                      src={url}
                      alt={`${product.title} ${index + 2}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                {product.title || 'Untitled Product'}
              </h2>
              
              {product.brand && (
                <p className="text-muted-foreground mt-1">
                  by {product.brand}
                </p>
              )}
            </div>

            {/* Price */}
            <div className="text-2xl font-bold text-primary">
              {formatPrice(product.price_cents, product.currency)}
            </div>

            {/* Product details */}
            <div className="space-y-3">
              {product.category && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Category:</span>
                  <Badge variant="secondary">{product.category}</Badge>
                </div>
              )}
              
              {product.color && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Color:</span>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full border border-gray-300"
                      style={{ backgroundColor: product.color.toLowerCase() }}
                    />
                    <span className="text-sm capitalize">{product.color}</span>
                  </div>
                </div>
              )}

              {/* Attributes */}
              {product.attrs && Object.keys(product.attrs).length > 0 && (
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">Details:</span>
                  <div className="space-y-1">
                    {Object.entries(product.attrs).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-muted-foreground capitalize">
                          {key.replace('_', ' ')}:
                        </span>
                        <span>{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              {product.products && (
                <Button className="flex-1">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View on Brand Site
                </Button>
              )}
              
              <Button variant="outline" size="icon">
                <Heart className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};