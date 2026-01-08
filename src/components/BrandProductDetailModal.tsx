
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Edit, Share2, Save, X, BarChart3, TrendingUp, ExternalLink } from 'lucide-react';
import { Product } from '@/types';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { EnhancedProductGallery } from '@/components/EnhancedProductGallery';
import { AdvancedSizeColorSelector } from '@/components/AdvancedSizeColorSelector';
import { SizeChartUpload } from '@/components/SizeChartUpload';
import { useProductAnalytics } from '@/hooks/useAnalytics';
import { getProductImageUrls } from '@/utils/imageHelpers';
import { openExternalUrl } from '@/lib/openExternalUrl';

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
  onProductUpdated
}) => {
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedProduct, setEditedProduct] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const { trackProductView } = useProductAnalytics();

  useEffect(() => {
    if (product && isOpen) {
      trackProductView(product.id, 'brand_product_detail_modal');
      setEditedProduct({
        title: product.title,
        description: product.description,
        price_cents: product.price_cents,
        compare_at_price_cents: product.compare_at_price_cents,
        stock_qty: product.stock_qty,
        external_url: product.external_url || '',
        size_chart: product.attributes?.size_chart || null
      });
    }
  }, [product, isOpen, trackProductView]);

  if (!product) return null;

  const formatPrice = (cents: number, currency: string = 'USD') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);

  const handleSave = async () => {
    if (!editedProduct) return;
    
    setSaving(true);
    try {
      const updateData = {
        title: editedProduct.title,
        description: editedProduct.description,
        price_cents: parseInt(editedProduct.price_cents.toString()),
        compare_at_price_cents: editedProduct.compare_at_price_cents ? parseInt(editedProduct.compare_at_price_cents.toString()) : null,
        stock_qty: parseInt(editedProduct.stock_qty.toString()),
        external_url: editedProduct.external_url,
        attributes: {
          ...product.attributes,
          size_chart: editedProduct.size_chart
        }
      };

      const { error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', product.id);

      if (error) throw error;

      toast({
        title: 'Product updated',
        description: 'Product details have been saved successfully'
      });

      setIsEditing(false);
      onProductUpdated?.();
    } catch (error) {
      console.error('Error updating product:', error);
      toast({
        title: 'Error',
        description: 'Failed to update product. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedProduct({
      title: product.title,
      description: product.description,
      price_cents: product.price_cents,
      compare_at_price_cents: product.compare_at_price_cents,
      stock_qty: product.stock_qty,
      external_url: product.external_url || '',
      size_chart: product.attributes?.size_chart || null
    });
    setIsEditing(false);
  };

  const handleShare = async () => {
    // NOTE: /products/:id route doesn't exist yet - show toast instead of dead link
    toast({ 
      title: 'Sharing coming soon', 
      description: 'Product sharing will be available soon!' 
    });
  };

  const attributes = product.attributes as any;
  const mediaUrls = getProductImageUrls(product);

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
    shopperViews: Math.floor(Math.random() * 2000) + 500,
    shopperLikes: Math.floor(Math.random() * 300) + 50,
    shopperShares: Math.floor(Math.random() * 100) + 10,
    shopperConversions: Math.floor(Math.random() * 50) + 5,
    shopperWishlistAdds: Math.floor(Math.random() * 150) + 25
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">{product.title} - Brand Management</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Enhanced Image Gallery */}
          <div className="lg:col-span-1">
            <EnhancedProductGallery
              images={mediaUrls}
              productTitle={product.title}
              hasARMesh={!!product.ar_mesh_url}
              onARTryOn={() => toast({ title: 'AR Try-On', description: 'AR feature coming soon!' })}
            />
          </div>

          {/* Product Info */}
          <div className="lg:col-span-2 space-y-4 lg:space-y-6">
            {/* Header with Actions */}
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <div className="space-y-3">
                    <Input
                      value={editedProduct?.title || ''}
                      onChange={(e) => setEditedProduct({...editedProduct, title: e.target.value})}
                      className="text-xl sm:text-2xl font-bold"
                      placeholder="Product title"
                    />
                    {product.brand && <p className="text-muted-foreground">{product.brand.name}</p>}
                  </div>
                ) : (
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold">{product.title}</h1>
                    {product.brand && <p className="text-muted-foreground">{product.brand.name}</p>}
                  </div>
                )}
                <Badge variant="outline" className="mt-1 capitalize text-xs">
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
                {isEditing ? (
                  <>
                    <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={saving}>
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? 'Saving...' : 'Save'}
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
              </div>
            </div>

            {/* Pricing */}
            <div className="flex items-center gap-4">
              {isEditing ? (
                <div className="flex flex-col sm:flex-row gap-2">
                  <div>
                    <label className="text-sm font-medium">Price</label>
                    <Input
                      type="number"
                      value={editedProduct?.price_cents ? editedProduct.price_cents / 100 : ''}
                      onChange={(e) => setEditedProduct({...editedProduct, price_cents: parseFloat(e.target.value) * 100})}
                      className="w-32"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Compare Price</label>
                    <Input
                      type="number"
                      value={editedProduct?.compare_at_price_cents ? editedProduct.compare_at_price_cents / 100 : ''}
                      onChange={(e) => setEditedProduct({...editedProduct, compare_at_price_cents: e.target.value ? parseFloat(e.target.value) * 100 : null})}
                      className="w-32"
                      step="0.01"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-2xl sm:text-3xl font-bold">{formatPrice(product.price_cents, product.currency)}</span>
                  {product.compare_at_price_cents && product.compare_at_price_cents > product.price_cents && (
                    <span className="text-lg text-muted-foreground line-through">
                      {formatPrice(product.compare_at_price_cents, product.currency)}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Shopper Analytics */}
            <div className="p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-sm text-blue-800">Shopper Engagement Insights</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Views:</span>
                  <span className="font-medium text-blue-700">{analyticsData.shopperViews}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Likes:</span>
                  <span className="font-medium text-blue-700">{analyticsData.shopperLikes}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Wishlist:</span>
                  <span className="font-medium text-blue-700">{analyticsData.shopperWishlistAdds}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Conversions:</span>
                  <span className="font-medium text-blue-700">{analyticsData.shopperConversions}</span>
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
              sizeChartImage={product.attributes?.size_chart}
            />

            {/* Description */}
            <div>
              <h3 className="font-medium mb-2">Description</h3>
              {isEditing ? (
                <Textarea
                  value={editedProduct?.description || ''}
                  onChange={(e) => setEditedProduct({...editedProduct, description: e.target.value})}
                  className="min-h-20"
                  placeholder="Product description"
                />
              ) : (
                <p className="text-muted-foreground text-sm leading-relaxed">{product.description}</p>
              )}
            </div>

            {/* Size Chart Upload */}
            {isEditing && (
              <SizeChartUpload
                currentSizeChart={editedProduct?.size_chart}
                onSizeChartUpdate={(sizeChart) => setEditedProduct({...editedProduct, size_chart: sizeChart})}
                productId={product.id}
              />
            )}

            {/* Inventory Management */}
            <div className="p-3 sm:p-4 bg-muted/30 rounded-lg">
              <h3 className="font-medium mb-3">Inventory Management</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Stock Quantity:</span>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={editedProduct?.stock_qty || 0}
                      onChange={(e) => setEditedProduct({...editedProduct, stock_qty: parseInt(e.target.value)})}
                      className="w-20 h-8"
                    />
                  ) : (
                    <span className={`font-medium ${product.stock_qty <= 5 ? 'text-red-500' : 'text-green-500'}`}>
                      {product.stock_qty} units
                    </span>
                  )}
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

            {/* External URL */}
            {isEditing ? (
              <div>
                <label className="text-sm font-medium mb-2 block">External Product URL</label>
                <Input
                  value={editedProduct?.external_url || ''}
                  onChange={(e) => setEditedProduct({...editedProduct, external_url: e.target.value})}
                  placeholder="https://your-store.com/product"
                />
              </div>
            ) : product.external_url && (
              <div className="p-3 sm:p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <ExternalLink className="h-4 w-4 text-purple-600" />
                  <span className="font-medium text-sm text-purple-800">External Product Link</span>
                </div>
                <p className="text-xs text-purple-600 mb-2">This product links to your external store</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => openExternalUrl(product.external_url)}
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
