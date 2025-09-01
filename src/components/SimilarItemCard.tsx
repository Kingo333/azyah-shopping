import React from 'react';
import { Button } from '@/components/ui/button';
import { Heart, ShoppingBag, Info, Image } from 'lucide-react';
import { Product } from '@/types';
import { getPrimaryImageUrl, hasMultipleImages, getImageCount } from '@/utils/imageHelpers';
import { getResponsiveImageProps } from '@/utils/asosImageUtils';
import { useAuth } from '@/contexts/AuthContext';
import { useWishlist } from '@/hooks/useWishlist';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SimilarItemCardProps {
  item: Product;
  onItemClick: (product: Product) => void;
  formatPrice: (cents: number, currency?: string) => string;
}

const SimilarItemCard: React.FC<SimilarItemCardProps> = ({ item, onItemClick, formatPrice }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { addToWishlist, isLoading: wishlistLoading } = useWishlist(item.id);

  const handleLike = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "You must be signed in to like items.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase.from('likes').insert([{
        user_id: user.id,
        product_id: item.id
      }]);

      if (error && error.code !== '23505') {
        throw error;
      }

      toast({
        description: `${item.title} added to your likes!`
      });
    } catch (error: any) {
      console.error('Failed to like item:', error);
      toast({
        title: "Error",
        description: "Failed to like item. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleAddToWishlist = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "You must be signed in to add to wishlist.",
        variant: "destructive"
      });
      return;
    }

    try {
      await addToWishlist(item.id);
      toast({
        description: `${item.title} added to your wishlist!`
      });
    } catch (error: any) {
      console.error('Failed to add to wishlist:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add to wishlist. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="group relative bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
      <div 
        className="w-full aspect-[3/4] bg-muted rounded-2xl overflow-hidden relative cursor-pointer"
        onClick={() => onItemClick(item)}
      >
        <img
          {...getResponsiveImageProps(
            getPrimaryImageUrl(item),
            "(max-width: 768px) 50vw, 25vw"
          )}
          alt={item.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/placeholder.svg';
          }}
        />
        
        {/* Multiple images indicator */}
        {hasMultipleImages(item) && (
          <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full flex items-center gap-1 opacity-90">
            <Image className="h-3 w-3" />
            {getImageCount(item)}
          </div>
        )}
        
        {/* Hover gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-primary/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Top-right action buttons */}
        <div className="absolute top-2 right-2 flex flex-col space-y-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 rounded-full bg-white/90 hover:bg-white backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              handleLike();
            }}
          >
            <Heart className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 rounded-full bg-white/90 hover:bg-white backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              handleAddToWishlist();
            }}
            disabled={wishlistLoading}
          >
            <ShoppingBag className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Product Info Overlay (appears on hover) */}
        <div className="absolute bottom-4 left-4 right-4 bg-white/60 backdrop-blur-sm rounded-xl p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="text-xs font-medium line-clamp-1 mb-1">
            {item.title}
          </div>
          <div className="text-xs text-muted-foreground mb-1">
            {(item.brand as any)?.name || 'Unknown Brand'}
          </div>
          <div className="text-xs font-semibold text-primary mb-3">
            {formatPrice(item.price_cents, item.currency)}
          </div>
          
          {/* Action buttons */}
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 rounded-full bg-primary/10"
              onClick={(e) => {
                e.stopPropagation();
                onItemClick(item);
              }}
              title="View product details"
            >
              <Info className="h-3 w-3" />
            </Button>
            
            {/* Shop Now button */}
            {item.external_url && (
              <Button
                variant="destructive"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(item.external_url, '_blank', 'noopener,noreferrer');
                }}
                className="flex-1 text-xs h-8"
              >
                Shop Now
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimilarItemCard;