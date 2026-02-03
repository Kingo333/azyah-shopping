import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Product } from '@/types';
import { Edit, ExternalLink, Package, Share } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { openExternalUrl } from '@/lib/openExternalUrl';
import { Money } from '@/components/ui/Money';

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
}) => {
  const { toast } = useToast();

  if (!product) return null;

  const handleEdit = () => {
    onEdit?.(product);
  };

  const handleShare = async () => {
    toast({
      title: "Sharing coming soon",
      description: "Product sharing will be available soon!",
    });
  };

  const images = Array.isArray(product.media_urls) ? product.media_urls : [];
  const primaryImage = product.image_url || (images.length > 0 ? images[0] : null);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">{product.title} - Preview</DialogTitle>
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
            {/* Header with Actions */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl sm:text-2xl font-bold">{product.title}</h2>
                {product.brand?.name && (
                  <p className="text-muted-foreground">{product.brand.name}</p>
                )}
              </div>
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
            </div>

            {/* Price */}
            <div className="flex items-center gap-3">
              <Money 
                cents={product.price_cents || 0} 
                currency={product.currency || 'USD'} 
                size="lg"
                className="text-2xl font-bold text-primary"
              />
              {product.compare_at_price_cents && (
                <Money 
                  cents={product.compare_at_price_cents} 
                  currency={product.currency || 'USD'}
                  className="text-muted-foreground line-through"
                />
              )}
            </div>

            {/* Status Badges */}
            <div className="flex gap-2 flex-wrap">
              <Badge variant="secondary">{product.category_slug}</Badge>
              {product.subcategory_slug && (
                <Badge variant="outline">{product.subcategory_slug}</Badge>
              )}
              <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                {product.status}
              </Badge>
            </div>

            {/* Description */}
            {product.description && (
              <div>
                <h3 className="font-medium mb-2">Description</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{product.description}</p>
              </div>
            )}

            {/* Shop Now Button */}
            {product.external_url && (
              <Button 
                className="w-full mt-4"
                onClick={() => openExternalUrl(product.external_url)}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Shop Now
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
