import React from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SmartImage } from '@/components/SmartImage';
import { MoneyStatic } from '@/components/ui/Money';
import { ShoppingBag, Heart, Shirt, ExternalLink, Users } from 'lucide-react';
import { PostProduct } from '@/hooks/useStyleLinkPosts';
import { useToast } from '@/hooks/use-toast';

interface TaggedItemDrawerProps {
  product: PostProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTryOn?: () => void;
  onSave?: () => void;
}

export const TaggedItemDrawer: React.FC<TaggedItemDrawerProps> = ({
  product,
  open,
  onOpenChange,
  onTryOn,
  onSave,
}) => {
  const { toast } = useToast();
  
  if (!product) return null;
  
  const title = product.product?.title || product.external_title || 'Product';
  const image = product.product?.image_url || product.external_image_url;
  const brand = product.product?.brand?.name || product.external_brand_name;
  const price = product.product?.price_cents || product.external_price_cents;
  const currency = product.external_currency || 'USD';
  const isExternal = !product.product_id && !!product.external_url;
  const tags = (product.product as any)?.tags || [];
  
  const handleShop = () => {
    const url = (product.product as any)?.external_url || product.external_url;
    if (url) {
      toast({
        description: "You're leaving Azyah to shop on the brand's site",
        duration: 2000
      });
      setTimeout(() => {
        window.open(url, '_blank', 'noopener,noreferrer');
      }, 500);
    } else {
      toast({ description: 'Shop link not available' });
    }
  };
  
  const handleSave = () => {
    if (onSave) {
      onSave();
    } else {
      toast({ description: 'Saved to wishlist!' });
    }
  };
  
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[80vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-left">Tagged Item</DrawerTitle>
        </DrawerHeader>
        
        <div className="px-4 pb-6 space-y-4">
          {/* Product Card */}
          <div className="flex gap-4">
            <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
              {image ? (
                <SmartImage src={image} alt={title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ShoppingBag className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              {brand && (
                <p className="text-xs text-muted-foreground mb-0.5">{brand}</p>
              )}
              <h3 className="font-medium text-sm line-clamp-2">{title}</h3>
              {price && (
                <MoneyStatic cents={price} currency={currency} size="sm" className="font-bold mt-1" />
              )}
            </div>
          </div>
          
          {/* Product Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.slice(0, 3).map((tag: string, i: number) => (
                <Badge key={i} variant="secondary" className="text-[10px]">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          
          {/* Style Discovery Hint */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 rounded-lg bg-muted/50">
            <Users className="h-4 w-4" />
            <span>Find people with similar style</span>
          </div>
          
          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-2">
            {/* Virtual Try-On */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onTryOn}
              className="flex-1 gap-1"
              disabled={!product.product_id}
            >
              <Shirt className="h-4 w-4" />
              Try On
            </Button>
            
            {/* Shop */}
            <Button 
              size="sm" 
              onClick={handleShop}
              className="flex-1 gap-1"
            >
              <ShoppingBag className="h-4 w-4" />
              Shop
              {isExternal && <ExternalLink className="h-3 w-3" />}
            </Button>
            
            {/* Save */}
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={handleSave}
              className="flex-1 gap-1"
            >
              <Heart className="h-4 w-4" />
              Save
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default TaggedItemDrawer;
