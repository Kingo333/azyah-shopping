import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Share2, ExternalLink } from 'lucide-react';
import { Product } from '@/types';
import { toast } from '@/hooks/use-toast';
import { EnhancedProductGallery } from '@/components/EnhancedProductGallery';
import { getProductImageUrls } from '@/utils/imageHelpers';
import { openExternalUrl } from '@/lib/openExternalUrl';
import { Money } from '@/components/ui/Money';

interface BrandProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (product: Product) => void;
  onProductUpdated?: () => void;
}

export const BrandProductDetailModal: React.FC<BrandProductDetailModalProps> = ({
  product,
  isOpen,
  onClose,
  onEdit,
}) => {
  if (!product) return null;

  const handleShare = async () => {
    toast({ 
      title: 'Sharing coming soon', 
      description: 'Product sharing will be available soon!' 
    });
  };

  const handleEdit = () => {
    onEdit?.(product);
  };

  const mediaUrls = getProductImageUrls(product);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">{product.title} - Preview</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Image Gallery */}
          <div>
            <EnhancedProductGallery
              images={mediaUrls}
              productTitle={product.title}
              hasARMesh={!!product.ar_mesh_url}
              onARTryOn={() => toast({ title: 'AR Try-On', description: 'AR feature coming soon!' })}
            />
          </div>

          {/* Product Info */}
          <div className="space-y-4">
            {/* Header with Actions */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold">{product.title}</h1>
                {product.brand && <p className="text-muted-foreground">{product.brand.name}</p>}
                <Badge variant="outline" className="mt-2 capitalize text-xs">
                  {product.status.replace('_', ' ')}
                </Badge>
              </div>
              
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleShare}>
                  <Share2 className="h-4 w-4" />
                </Button>
                {product.external_url && (
                  <Button variant="ghost" size="sm" onClick={() => openExternalUrl(product.external_url)}>
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={handleEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
            </div>

            {/* Price */}
            <div className="flex items-center gap-3">
              <Money 
                cents={product.price_cents} 
                currency={product.currency} 
                size="lg"
                className="text-2xl font-bold"
              />
              {product.compare_at_price_cents && product.compare_at_price_cents > product.price_cents && (
                <Money 
                  cents={product.compare_at_price_cents} 
                  currency={product.currency}
                  className="text-muted-foreground line-through"
                />
              )}
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
