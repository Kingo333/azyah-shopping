
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Share2, Sparkles, BarChart3, TrendingUp } from 'lucide-react';
import { Product } from '@/types';
import { toast } from '@/hooks/use-toast';
import { EnhancedProductGallery } from '@/components/EnhancedProductGallery';
import { AdvancedSizeColorSelector } from '@/components/AdvancedSizeColorSelector';
import { useProductAnalytics } from '@/hooks/useAnalytics';

interface BrandProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (product: Product) => void;
}

export const BrandProductDetailModal: React.FC<BrandProductDetailModalProps> = ({
  product,
  isOpen,
  onClose,
  onEdit
}) => {
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const { trackProductView } = useProductAnalytics();

  useEffect(() => {
    if (product && isOpen) {
      trackProductView(product.id, 'brand_product_detail_modal');
    }
  }, [product, isOpen, trackProductView]);

  if (!product) return null;

  const formatPrice = (cents: number, currency: string = 'USD') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);

  const handleEdit = () => {
    if (product && onEdit) {
      onEdit(product);
      onClose();
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
  const mediaUrls = product.media_urls as string[];

  // Static sizes and colors for preview
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

  // Mock analytics data (in real app, this would come from useAnalytics)
  const analyticsData = {
    views: Math.floor(Math.random() * 1000) + 100,
    likes: Math.floor(Math.random() * 200) + 20,
    shares: Math.floor(Math.random() * 50) + 5,
    conversions: Math.floor(Math.random() * 25) + 2
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">{product.title} - Brand View</DialogTitle>
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
            {/* Header with Brand Actions */}
            <div>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h1 className="text-2xl font-bold">{product.title}</h1>
                  {product.brand && <p className="text-muted-foreground">{product.brand.name}</p>}
                  <Badge variant="outline" className="mt-1 capitalize">
                    {product.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={handleShare}>
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleEdit}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </div>
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

            {/* Performance Analytics */}
            <div className="p-4 bg-accent/20 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Performance Overview</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Views:</span>
                  <span className="font-medium">{analyticsData.views}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Likes:</span>
                  <span className="font-medium">{analyticsData.likes}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Shares:</span>
                  <span className="font-medium">{analyticsData.shares}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Conversions:</span>
                  <span className="font-medium">{analyticsData.conversions}</span>
                </div>
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

            {/* Size & Color Preview */}
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

            {/* Stock and Inventory Info */}
            <div className="p-4 bg-muted/30 rounded-lg">
              <h3 className="font-medium mb-3">Inventory Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Stock Quantity:</span>
                  <span className={`font-medium ${product.stock_qty <= 5 ? 'text-red-500' : 'text-green-500'}`}>
                    {product.stock_qty} units
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">SKU:</span>
                  <span className="font-medium">{product.sku}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Category:</span>
                  <span className="font-medium capitalize">{product.category_slug}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Created:</span>
                  <span className="font-medium">{new Date(product.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Product Details */}
            <div className="space-y-3 pt-4 border-t">
              <h3 className="font-medium">Additional Details</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {attributes.color_primary && (
                  <>
                    <div className="text-muted-foreground">Primary Color:</div>
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
                {product.external_url && (
                  <>
                    <div className="text-muted-foreground">External URL:</div>
                    <div className="truncate">
                      <a href={product.external_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        View External Link
                      </a>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
