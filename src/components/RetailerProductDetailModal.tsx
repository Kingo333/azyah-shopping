
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Share2, Sparkles, BarChart3, TrendingUp, ExternalLink } from 'lucide-react';
import { Product } from '@/types';
import { toast } from '@/hooks/use-toast';
import { EnhancedProductGallery } from '@/components/EnhancedProductGallery';
import { AdvancedSizeColorSelector } from '@/components/AdvancedSizeColorSelector';
import { useProductAnalytics } from '@/hooks/useAnalytics';

interface RetailerProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (product: Product) => void;
}

export const RetailerProductDetailModal: React.FC<RetailerProductDetailModalProps> = ({
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
      trackProductView(product.id, 'retailer_product_detail_modal');
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

  // Mock analytics data
  const analyticsData = {
    views: Math.floor(Math.random() * 1000) + 100,
    clicks: Math.floor(Math.random() * 150) + 25,
    sales: Math.floor(Math.random() * 20) + 2,
    revenue: Math.floor(Math.random() * 5000) + 500
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">{product.title} - Retailer View</DialogTitle>
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
            {/* Header with Retailer Actions */}
            <div>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h1 className="text-2xl font-bold">{product.title}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    {product.brand && <p className="text-muted-foreground">{product.brand.name}</p>}
                    {product.retailer && (
                      <Badge variant="secondary" className="text-xs">
                        Sold by {product.retailer.name}
                      </Badge>
                    )}
                  </div>
                  <Badge variant="outline" className="mt-1 capitalize">
                    {product.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={handleShare}>
                    <Share2 className="h-4 w-4" />
                  </Button>
                  {product.external_url && (
                    <Button variant="ghost" size="sm" onClick={() => window.open(product.external_url, '_blank')}>
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
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

            {/* Sales Analytics */}
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="font-medium text-sm text-green-800">Sales Performance</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Product Views:</span>
                  <span className="font-medium text-green-700">{analyticsData.views}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Click-throughs:</span>
                  <span className="font-medium text-green-700">{analyticsData.clicks}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Units Sold:</span>
                  <span className="font-medium text-green-700">{analyticsData.sales}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Revenue:</span>
                  <span className="font-medium text-green-700">${analyticsData.revenue}</span>
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

            {/* Inventory Management */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-medium mb-3 text-blue-800">Inventory Management</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Current Stock:</span>
                  <span className={`font-medium ${product.stock_qty <= 5 ? 'text-red-600' : 'text-blue-600'}`}>
                    {product.stock_qty} units
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">SKU:</span>
                  <span className="font-medium text-blue-600">{product.sku}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Category:</span>
                  <span className="font-medium text-blue-600 capitalize">{product.category_slug}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Listed:</span>
                  <span className="font-medium text-blue-600">{new Date(product.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* External Integration */}
            {product.external_url && (
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <ExternalLink className="h-4 w-4 text-purple-600" />
                  <span className="font-medium text-sm text-purple-800">External Product Link</span>
                </div>
                <p className="text-xs text-purple-600 mb-2">This product links to your external store</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.open(product.external_url, '_blank')}
                  className="border-purple-300 text-purple-600 hover:bg-purple-100"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View on Your Store
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
