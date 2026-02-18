import React, { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Camera, X, Plus, Loader2, Search, Check, Link2 } from 'lucide-react';
import { useCreateStyleLinkPost, TaggedProduct } from '@/hooks/useCreateStyleLinkPost';
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
  const [isPublic, setIsPublic] = useState(true);
  const [taggedProducts, setTaggedProducts] = useState<TaggedProduct[]>([]);
  const [productSearchQuery, setProductSearchQuery] = useState('');

  // External URL pasting
  const [externalUrl, setExternalUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);

  // Hooks
  const { createPostAsync, isLoading, uploadProgress } = useCreateStyleLinkPost();

  // Product search - only Azyah products
  const { products: searchResults, isLoading: isSearching } = useUnifiedProducts({
    searchQuery: productSearchQuery,
    limit: 10,
    priceRange: { min: 0, max: 100000 },
  });

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

  const handleAddProduct = (product: any) => {
    if (taggedProducts.some(p => p.product_id === product.id)) {
      toast({ description: 'Product already added' });
      return;
    }

    setTaggedProducts(prev => [...prev, { product_id: product.id }]);
    setProductSearchQuery('');
    toast({ description: 'Product added!' });
  };

  const handleAddExternalUrl = () => {
    const url = externalUrl.trim();
    if (!url) return;

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      toast({ description: 'Please enter a valid URL', variant: 'destructive' });
      return;
    }

    // Extract domain as brand name hint
    const domain = new URL(url).hostname.replace('www.', '');
    const brandHint = domain.split('.')[0];

    setTaggedProducts(prev => [
      ...prev,
      {
        product_id: '', // No internal product
        external_url: url,
        external_title: brandHint.charAt(0).toUpperCase() + brandHint.slice(1),
        external_brand_name: brandHint,
      },
    ]);
    setExternalUrl('');
    setShowUrlInput(false);
    toast({ description: 'Link added!' });
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
        visibility: isPublic ? 'public_explore' : 'followers_only',
        taggedProducts,
      });

      toast({ description: 'Post created successfully! 🎉' });

      // Reset form
      handleRemoveImage();
      setCaption('');
      setIsPublic(true);
      setTaggedProducts([]);
      onOpenChange(false);
    } catch (error) {
      toast({ description: 'Failed to create post', variant: 'destructive' });
    }
  };

  const getProductDisplay = (product: TaggedProduct) => {
    // External product (URL pasted)
    if (product.external_url) {
      return {
        title: product.external_title || 'External item',
        image: product.external_image_url || undefined,
        brand: product.external_brand_name || undefined,
        price: undefined,
        currency: 'USD',
        isExternal: true,
        url: product.external_url,
      };
    }

    // Internal Azyah product
    if (product.product_id) {
      const found = searchResults.find(p => p.id === product.product_id);
      if (found) {
        return {
          title: found.title,
          image: found.image_url,
          brand: found.brand?.name,
          price: found.price_cents,
          currency: found.currency,
          isExternal: false,
        };
      }
    }
    return {
      title: 'Product',
      image: undefined,
      brand: undefined,
      price: undefined,
      currency: 'USD',
      isExternal: false,
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
            <p className="text-xs text-muted-foreground mb-3">
              Search Azyah catalog or paste an external link
            </p>

            {/* Search Azyah products */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search Azyah products..."
                value={productSearchQuery}
                onChange={(e) => setProductSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {productSearchQuery && (
              <div className="mt-3 max-h-48 overflow-y-auto space-y-2">
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
                      onClick={() => handleAddProduct(product)}
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

            {/* Paste URL section */}
            <div className="mt-3">
              {!showUrlInput ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs gap-1.5"
                  onClick={() => setShowUrlInput(true)}
                >
                  <Link2 className="h-3.5 w-3.5" />
                  Paste a product link
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="https://brand.com/product..."
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    className="text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddExternalUrl();
                      }
                    }}
                  />
                  <Button size="sm" onClick={handleAddExternalUrl} disabled={!externalUrl.trim()}>
                    Add
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowUrlInput(false);
                      setExternalUrl('');
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Tagged Products List */}
            {taggedProducts.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {taggedProducts.length} item{taggedProducts.length !== 1 ? 's' : ''} tagged
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
                        {display.isExternal && display.url && (
                          <p className="text-[10px] text-muted-foreground truncate">{display.url}</p>
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
            <div className="flex-1 mr-3">
              <p className="text-sm font-medium">{isPublic ? 'Public' : 'Followers Only'}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isPublic
                  ? 'Appears in Explore, Feed, and your profile for anyone to see.'
                  : 'Only visible to mutual followers and on your profile.'}
              </p>
            </div>
            <Switch
              checked={isPublic}
              onCheckedChange={setIsPublic}
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
