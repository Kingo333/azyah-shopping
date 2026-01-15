import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Search, Loader2, Plus, Check } from 'lucide-react';
import { useCreatorProducts } from '@/hooks/useCreatorProducts';
import { useExtractLinkMetadata } from '@/hooks/useExtractLinkMetadata';
import { useUnifiedProducts } from '@/hooks/useUnifiedProducts';
import { useToast } from '@/hooks/use-toast';
import { SmartImage } from '@/components/SmartImage';
import { MoneyStatic } from '@/components/ui/Money';
import { getPrimaryImageUrl } from '@/utils/imageHelpers';

interface AddCreatorProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

const AddCreatorProductModal: React.FC<AddCreatorProductModalProps> = ({
  open,
  onOpenChange,
  userId,
}) => {
  const { toast } = useToast();
  const { addProduct, isLoading: isAdding } = useCreatorProducts(userId);
  const { extract, isLoading: isExtracting, data: extractedData, reset: resetExtraction } = useExtractLinkMetadata();

  // Search state
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [activeTab, setActiveTab] = useState('search');

  // Product search
  const { products: searchResults, isLoading: isSearching } = useUnifiedProducts({
    searchQuery: productSearchQuery,
    limit: 10,
    priceRange: { min: 0, max: 100000 },
  });

  const handleAddInternalProduct = async (e: React.MouseEvent, product: any) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      await addProduct.mutateAsync({
        product_id: product.id,
        is_featured: isFeatured,
      });
      toast({ description: 'Product added to your shop!' });
      setProductSearchQuery('');
      onOpenChange(false);
    } catch (error) {
      toast({ description: 'Failed to add product', variant: 'destructive' });
    }
  };

  const handleExtractAndAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!externalUrl.trim()) return;

    const metadata = await extract(externalUrl.trim());
    if (metadata) {
      try {
        await addProduct.mutateAsync({
          external_url: metadata.url,
          external_title: metadata.title || undefined,
          external_image_url: metadata.image_url || undefined,
          external_price_cents: metadata.price_cents || undefined,
          external_currency: metadata.currency || 'USD',
          external_brand_name: metadata.brand_name || undefined,
          external_brand_logo_url: metadata.brand_logo_url || undefined,
          is_featured: isFeatured,
        });
        toast({ description: 'Product added to your shop!' });
        setExternalUrl('');
        resetExtraction();
        onOpenChange(false);
      } catch (error) {
        toast({ description: 'Failed to add product', variant: 'destructive' });
      }
    }
  };

  const isPending = isAdding || addProduct.isPending;

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base">Add Product</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Featured Toggle */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
            <div>
              <p className="text-xs font-medium">Feature this product</p>
              <p className="text-[10px] text-muted-foreground">
                Show at the top of your products
              </p>
            </div>
            <Switch
              checked={isFeatured}
              onCheckedChange={setIsFeatured}
            />
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-2 h-8">
              <TabsTrigger value="search" className="text-xs">Search Azyah</TabsTrigger>
              <TabsTrigger value="url" className="text-xs">Paste Link</TabsTrigger>
            </TabsList>

            <TabsContent value="search" className="space-y-2 mt-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={productSearchQuery}
                  onChange={(e) => setProductSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>
              
              <div className="max-h-56 overflow-y-auto space-y-1.5">
                {!productSearchQuery ? (
                  <p className="text-center text-muted-foreground py-6 text-xs">
                    Search for products to add to your shop
                  </p>
                ) : isSearching ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : searchResults.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6 text-xs">
                    No products found
                  </p>
                ) : (
                  searchResults.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center gap-2.5 p-2 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                      onClick={(e) => handleAddInternalProduct(e, product)}
                    >
                      <div className="w-10 h-10 rounded bg-muted overflow-hidden flex-shrink-0">
                        <SmartImage 
                          src={getPrimaryImageUrl(product)} 
                          alt="" 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium line-clamp-1">{product.title}</p>
                        {product.brand?.name && (
                          <p className="text-[10px] text-muted-foreground">{product.brand.name}</p>
                        )}
                        {product.price_cents && (
                          <MoneyStatic cents={product.price_cents} currency={product.currency || 'USD'} size="sm" />
                        )}
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        disabled={isPending}
                        className="h-7 w-7 p-0"
                        onClick={(e) => handleAddInternalProduct(e, product)}
                      >
                        {isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Plus className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="url" className="space-y-3 mt-0">
              <div>
                <Label htmlFor="url" className="text-xs font-medium mb-1.5 block">Product URL</Label>
                <Input
                  id="url"
                  placeholder="https://store.com/product..."
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  className="h-8 text-xs"
                />
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  Paste a link from any store to add it to your shop
                </p>
              </div>

              {/* Preview extracted data */}
              {extractedData && (
                <div className="p-2.5 rounded-lg border bg-muted/30">
                  <p className="text-[10px] text-muted-foreground mb-1.5">Preview:</p>
                  <div className="flex items-center gap-2.5">
                    {extractedData.image_url && (
                      <div className="w-10 h-10 rounded bg-muted overflow-hidden flex-shrink-0">
                        <img src={extractedData.image_url} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium line-clamp-1">
                        {extractedData.title || 'Unknown product'}
                      </p>
                      {extractedData.brand_name && (
                        <p className="text-[10px] text-muted-foreground">{extractedData.brand_name}</p>
                      )}
                      {extractedData.price_cents && (
                        <MoneyStatic 
                          cents={extractedData.price_cents} 
                          currency={extractedData.currency || 'USD'} 
                          size="sm" 
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}

              <Button 
                onClick={handleExtractAndAdd}
                disabled={!externalUrl.trim() || isExtracting || isPending}
                className="w-full h-8 text-xs"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Extracting...
                  </>
                ) : isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1.5" />
                    Add Product
                  </>
                )}
              </Button>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddCreatorProductModal;