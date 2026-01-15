import React, { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Camera, X, Plus, Loader2, Search, ExternalLink, Check } from 'lucide-react';
import { useCreateStyleLinkPost, TaggedProduct } from '@/hooks/useCreateStyleLinkPost';
import { useExtractLinkMetadata, ExtractedMetadata } from '@/hooks/useExtractLinkMetadata';
import { useUnifiedProducts } from '@/hooks/useUnifiedProducts';
import { useToast } from '@/hooks/use-toast';
import { SmartImage } from '@/components/SmartImage';
import { MoneyStatic } from '@/components/ui/Money';
import { Progress } from '@/components/ui/progress';

interface CreateStyleLinkPostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateStyleLinkPostModal: React.FC<CreateStyleLinkPostModalProps> = ({
  open,
  onOpenChange,
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [showInExplore, setShowInExplore] = useState(true);
  const [taggedProducts, setTaggedProducts] = useState<TaggedProduct[]>([]);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  
  // Hooks
  const { createPostAsync, isLoading, uploadProgress } = useCreateStyleLinkPost();
  const { extract, isLoading: isExtracting, data: extractedData, reset: resetExtraction } = useExtractLinkMetadata();
  
  // Product search
  const { products: searchResults, isLoading: isSearching } = useUnifiedProducts({
    searchQuery: productSearchQuery,
    limit: 10,
    priceRange: { min: 0, max: 100000 },
  });

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast({ description: 'Please select an image file', variant: 'destructive' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ description: 'Image must be less than 10MB', variant: 'destructive' });
      return;
    }

    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
  }, [toast]);

  const handleRemoveImage = () => {
    setSelectedImage(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
  };

  const handleAddInternalProduct = (product: any) => {
    // Check if already added
    if (taggedProducts.some(p => p.product_id === product.id)) {
      toast({ description: 'Product already added' });
      return;
    }

    setTaggedProducts(prev => [...prev, {
      product_id: product.id,
    }]);
    setProductSearchQuery('');
    toast({ description: 'Product added!' });
  };

  const handleExtractUrl = async () => {
    if (!externalUrl.trim()) return;

    const metadata = await extract(externalUrl.trim());
    if (metadata) {
      // Add to tagged products
      setTaggedProducts(prev => [...prev, {
        external_url: metadata.url,
        external_title: metadata.title || undefined,
        external_image_url: metadata.image_url || undefined,
        external_price_cents: metadata.price_cents || undefined,
        external_currency: metadata.currency || 'USD',
        external_brand_name: metadata.brand_name || undefined,
        external_brand_logo_url: metadata.brand_logo_url || undefined,
      }]);
      setExternalUrl('');
      resetExtraction();
      toast({ description: 'Product link added!' });
    }
  };

  const handleRemoveTaggedProduct = (index: number) => {
    setTaggedProducts(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedImage) {
      toast({ description: 'Please select an image', variant: 'destructive' });
      return;
    }

    try {
      await createPostAsync({
        image: selectedImage,
        caption: caption.trim() || undefined,
        visibility: showInExplore ? 'public_explore' : 'stylelink_only',
        taggedProducts,
      });

      toast({ description: 'Post created successfully! 🎉' });
      
      // Reset form
      handleRemoveImage();
      setCaption('');
      setShowInExplore(true);
      setTaggedProducts([]);
      onOpenChange(false);
    } catch (error) {
      toast({ description: 'Failed to create post', variant: 'destructive' });
    }
  };

  const getProductDisplay = (product: TaggedProduct) => {
    if (product.product_id) {
      const found = searchResults.find(p => p.id === product.product_id);
      if (found) {
        return {
          title: found.title,
          image: found.image_url,
          brand: found.brand?.name,
          price: found.price_cents,
          currency: found.currency,
        };
      }
    }
    return {
      title: product.external_title || 'External Product',
      image: product.external_image_url,
      brand: product.external_brand_name,
      price: product.external_price_cents,
      currency: product.external_currency,
    };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Create Post</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 pr-1">
          {/* Image Upload */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Photo</Label>
            {imagePreview ? (
              <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  className="w-full h-full object-cover"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={handleRemoveImage}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-square rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
              >
                <Camera className="h-8 w-8" />
                <span className="text-sm">Tap to add photo</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
          </div>

          {/* Caption */}
          <div>
            <Label htmlFor="caption" className="text-sm font-medium mb-2 block">Caption</Label>
            <Textarea
              id="caption"
              placeholder="Write a caption..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
            />
          </div>

          {/* Tag Products */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Tag Products</Label>
            
            <Tabs defaultValue="search" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-3">
                <TabsTrigger value="search">Search Azyah</TabsTrigger>
                <TabsTrigger value="url">Paste Link</TabsTrigger>
              </TabsList>

              <TabsContent value="search" className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products..."
                    value={productSearchQuery}
                    onChange={(e) => setProductSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                {productSearchQuery && (
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {isSearching ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin" />
                      </div>
                    ) : searchResults.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4 text-sm">
                        No products found
                      </p>
                    ) : (
                      searchResults.slice(0, 5).map((product) => (
                        <div
                          key={product.id}
                          className="flex items-center gap-3 p-2 rounded-lg border hover:bg-accent cursor-pointer"
                          onClick={() => handleAddInternalProduct(product)}
                        >
                          <div className="w-10 h-10 rounded bg-muted overflow-hidden flex-shrink-0">
                            {product.image_url && (
                              <SmartImage src={product.image_url} alt="" className="w-full h-full object-cover" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{product.title}</p>
                            {product.brand?.name && (
                              <p className="text-xs text-muted-foreground">{product.brand.name}</p>
                            )}
                          </div>
                          <Plus className="h-4 w-4 text-muted-foreground" />
                        </div>
                      ))
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="url" className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Paste product URL..."
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                  />
                  <Button 
                    onClick={handleExtractUrl}
                    disabled={!externalUrl.trim() || isExtracting}
                  >
                    {isExtracting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ExternalLink className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Paste a link from any store to extract product details
                </p>
              </TabsContent>
            </Tabs>

            {/* Tagged Products List */}
            {taggedProducts.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {taggedProducts.length} product{taggedProducts.length !== 1 ? 's' : ''} tagged
                </p>
                {taggedProducts.map((product, index) => {
                  const display = getProductDisplay(product);
                  return (
                    <div key={index} className="flex items-center gap-3 p-2 rounded-lg border bg-muted/30">
                      <div className="w-10 h-10 rounded bg-muted overflow-hidden flex-shrink-0">
                        {display.image && (
                          <SmartImage src={display.image} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{display.title}</p>
                        {display.brand && (
                          <p className="text-xs text-muted-foreground">{display.brand}</p>
                        )}
                      </div>
                      {display.price && (
                        <MoneyStatic cents={display.price} currency={display.currency || 'USD'} size="sm" />
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 flex-shrink-0"
                        onClick={() => handleRemoveTaggedProduct(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Visibility Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <div>
              <p className="text-sm font-medium">Show in Explore</p>
              <p className="text-xs text-muted-foreground">
                Others can discover this post
              </p>
            </div>
            <Switch
              checked={showInExplore}
              onCheckedChange={setShowInExplore}
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4 border-t space-y-3">
          {isLoading && (
            <Progress value={uploadProgress} className="h-2" />
          )}
          <Button 
            onClick={handleSubmit}
            disabled={!selectedImage || isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Create Post
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateStyleLinkPostModal;
