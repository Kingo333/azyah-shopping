import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, RefreshCw } from 'lucide-react';
import { CreatorProduct } from '@/hooks/useCreatorProducts';
import { useExtractLinkMetadata } from '@/hooks/useExtractLinkMetadata';
import { useToast } from '@/hooks/use-toast';
import { SmartImage } from '@/components/SmartImage';

interface EditCreatorProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: CreatorProduct | null;
  onSave: (productId: string, updates: Partial<CreatorProduct>) => Promise<void>;
}

const EditCreatorProductModal: React.FC<EditCreatorProductModalProps> = ({
  open,
  onOpenChange,
  product,
  onSave,
}) => {
  const { toast } = useToast();
  const { extract, isLoading: isExtracting } = useExtractLinkMetadata();
  
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    external_title: '',
    external_image_url: '',
    external_price_cents: 0,
    external_currency: 'USD',
    external_brand_name: '',
    external_url: '',
    is_featured: false,
  });

  // Populate form when product changes
  useEffect(() => {
    if (product) {
      setFormData({
        external_title: product.external_title || product.product?.title || '',
        external_image_url: product.external_image_url || '',
        external_price_cents: product.external_price_cents || product.product?.price_cents || 0,
        external_currency: product.external_currency || product.product?.currency || 'USD',
        external_brand_name: product.external_brand_name || product.product?.brand?.name || '',
        external_url: product.external_url || '',
        is_featured: product.is_featured || false,
      });
    }
  }, [product]);

  const handleRefetch = async () => {
    if (!formData.external_url) {
      toast({ description: 'No URL to refresh from', variant: 'destructive' });
      return;
    }

    const metadata = await extract(formData.external_url);
    if (metadata) {
      setFormData(prev => ({
        ...prev,
        external_title: metadata.title || prev.external_title,
        external_image_url: metadata.image_url || prev.external_image_url,
        external_price_cents: metadata.price_cents || prev.external_price_cents,
        external_currency: metadata.currency || prev.external_currency,
        external_brand_name: metadata.brand_name || prev.external_brand_name,
      }));
      toast({ description: 'Product info refreshed!' });
    }
  };

  const handleSave = async () => {
    if (!product) return;
    
    setIsSaving(true);
    try {
      await onSave(product.id, {
        external_title: formData.external_title || null,
        external_image_url: formData.external_image_url || null,
        external_price_cents: formData.external_price_cents || null,
        external_currency: formData.external_currency || 'USD',
        external_brand_name: formData.external_brand_name || null,
        is_featured: formData.is_featured,
      });
      toast({ description: 'Product updated!' });
      onOpenChange(false);
    } catch (error) {
      toast({ description: 'Failed to update product', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const isInternalProduct = product?.product_id != null;
  const priceInDollars = formData.external_price_cents / 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base">Edit Product</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Preview */}
          <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
            <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden flex-shrink-0">
              {formData.external_image_url ? (
                <SmartImage
                  src={formData.external_image_url}
                  alt={formData.external_title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                  No image
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium line-clamp-2">
                {formData.external_title || 'Untitled'}
              </p>
              {formData.external_brand_name && (
                <p className="text-xs text-muted-foreground">{formData.external_brand_name}</p>
              )}
              {formData.external_price_cents > 0 && (
                <p className="text-xs font-semibold mt-1">
                  {formData.external_currency} {priceInDollars.toFixed(2)}
                </p>
              )}
            </div>
          </div>

          {isInternalProduct && (
            <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
              This is an Azyah catalog product. Some fields are synced from the catalog.
            </p>
          )}

          {/* Featured Toggle */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
            <div>
              <p className="text-xs font-medium">Featured</p>
              <p className="text-[10px] text-muted-foreground">Show at top of products</p>
            </div>
            <Switch
              checked={formData.is_featured}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_featured: checked }))}
            />
          </div>

          {/* Title */}
          <div>
            <Label htmlFor="title" className="text-xs font-medium mb-1.5 block">Title</Label>
            <Input
              id="title"
              value={formData.external_title}
              onChange={(e) => setFormData(prev => ({ ...prev, external_title: e.target.value }))}
              placeholder="Product title"
              className="h-9 text-sm"
            />
          </div>

          {/* Image URL */}
          <div>
            <Label htmlFor="image" className="text-xs font-medium mb-1.5 block">Image URL</Label>
            <Input
              id="image"
              value={formData.external_image_url}
              onChange={(e) => setFormData(prev => ({ ...prev, external_image_url: e.target.value }))}
              placeholder="https://..."
              className="h-9 text-sm"
            />
          </div>

          {/* Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="price" className="text-xs font-medium mb-1.5 block">Price</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={priceInDollars}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  external_price_cents: Math.round(parseFloat(e.target.value || '0') * 100) 
                }))}
                className="h-9 text-sm"
              />
            </div>
            <div>
              <Label htmlFor="currency" className="text-xs font-medium mb-1.5 block">Currency</Label>
              <Input
                id="currency"
                value={formData.external_currency}
                onChange={(e) => setFormData(prev => ({ ...prev, external_currency: e.target.value.toUpperCase() }))}
                placeholder="USD"
                className="h-9 text-sm"
              />
            </div>
          </div>

          {/* Brand */}
          <div>
            <Label htmlFor="brand" className="text-xs font-medium mb-1.5 block">Brand</Label>
            <Input
              id="brand"
              value={formData.external_brand_name}
              onChange={(e) => setFormData(prev => ({ ...prev, external_brand_name: e.target.value }))}
              placeholder="Brand name"
              className="h-9 text-sm"
            />
          </div>

          {/* Refetch button for external products */}
          {formData.external_url && !isInternalProduct && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRefetch}
              disabled={isExtracting}
              className="w-full"
            >
              {isExtracting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Refresh from URL
                </>
              )}
            </Button>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-1.5" />
                Save
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditCreatorProductModal;
