import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import ShopperNavigation from '@/components/ShopperNavigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, ShoppingBag, Trash2, ExternalLink, User } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useProductHasOutfit } from '@/hooks/useProductOutfits';
import ProductTryOnModal from '@/components/ProductTryOnModal';
import { BackButton } from '@/components/ui/back-button';

interface LikedProduct {
  id: string;
  product_id: string;
  created_at: string;
  products: {
    id: string;
    title: string;
    price_cents: number;
    currency: string;
    media_urls: any;
    external_url?: string;
    brands: {
      name: string;
    } | null;
  } | null;
}

const LikeCard: React.FC<{ like: LikedProduct; onRemove: (productId: string) => void; onAddToWishlist: (productId: string) => void; addToWishlistLoading: boolean; removeLoading: boolean }> = ({ like, onRemove, onAddToWishlist, addToWishlistLoading, removeLoading }) => {
  const { data: hasOutfit } = useProductHasOutfit(like.products!.id);
  const [tryOnModalOpen, setTryOnModalOpen] = useState(false);

  const shouldShowTryOnButton = hasOutfit === true;

  const handleShopNow = (product: LikedProduct['products']) => {
    if (product?.external_url) {
      window.open(product.external_url, '_blank', 'noopener,noreferrer');
    } else {
      toast({
        title: "Shop link not available",
        description: "This product doesn't have a shop link available.",
        variant: "destructive"
      });
    }
  };

  const formatPrice = (cents: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(cents / 100);
  };

  if (!like.products) return null;

  return (
    <>
      <div className="group relative bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
        <div 
          className="w-full aspect-[3/4] bg-muted rounded-2xl overflow-hidden relative"
        >
          <img
            src={
              Array.isArray(like.products!.media_urls) 
                ? like.products!.media_urls[0] 
                : typeof like.products!.media_urls === 'string' 
                  ? JSON.parse(like.products!.media_urls)[0] 
                  : '/placeholder.svg'
            }
            alt={like.products!.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/placeholder.svg';
            }}
          />
          
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
                onAddToWishlist(like.products!.id);
              }}
              disabled={addToWishlistLoading}
            >
              <ShoppingBag className="h-4 w-4" />
            </Button>
            {/* Try-on button - only show if product has outfit */}
            {shouldShowTryOnButton && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 rounded-full bg-white/90 hover:bg-white backdrop-blur-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setTryOnModalOpen(true);
                }}
                title="Try it on"
              >
                <User className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          {/* Product Info Overlay (appears on hover) */}
          <div className="absolute bottom-4 left-4 right-4 bg-white/60 backdrop-blur-sm rounded-xl p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="text-xs font-medium line-clamp-1 mb-1">
              {like.products!.title}
            </div>
            <div className="text-xs text-muted-foreground mb-1">
              {like.products!.brands?.name || 'Unbranded'}
            </div>
            <div className="text-xs font-semibold text-primary mb-3">
              {formatPrice(like.products!.price_cents, like.products!.currency)}
            </div>
            
            {/* Action buttons */}
            <div className="flex space-x-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(like.products!.id);
                }}
                disabled={removeLoading}
                className="flex-1 text-xs h-8"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Remove
              </Button>
              
              {/* Shop Now button */}
              {like.products!.external_url && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleShopNow(like.products!);
                  }}
                  className="flex-1 text-xs h-8"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Shop
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Try-On Modal */}
      <ProductTryOnModal
        isOpen={tryOnModalOpen}
        onClose={() => setTryOnModalOpen(false)}
        product={{
          id: like.products!.id,
          title: like.products!.title,
          price_cents: like.products!.price_cents,
          currency: like.products!.currency,
          media_urls: like.products!.media_urls,
          external_url: like.products!.external_url,
          brands: like.products!.brands
        } as any}
      />
    </>
  );
};

const Likes: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: likes, isLoading } = useQuery({
    queryKey: ['likes', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // First get the liked product IDs
      const { data: likeData, error: likesError } = await supabase
        .from('likes')
        .select('id, product_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (likesError) throw likesError;
      if (!likeData?.length) return [];

      // Then get the products with their details
      const productIds = likeData.map(like => like.product_id);
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select(`
          id,
          title,
          price_cents,
          currency,
          media_urls,
          external_url,
          brands (name)
        `)
        .in('id', productIds);

      if (productsError) throw productsError;

      // Combine the data
      const result = likeData.map(like => ({
        ...like,
        products: products?.find(p => p.id === like.product_id) || null
      })).filter(item => item.products !== null) as LikedProduct[];

      return result;
    },
    enabled: !!user?.id
  });

  const removeLikeMutation = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('user_id', user?.id)
        .eq('product_id', productId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['likes'] });
      toast({
        title: "Removed from likes",
        description: "Item has been removed from your likes."
      });
    }
  });

  const addToWishlistMutation = useMutation({
    mutationFn: async (productId: string) => {
      // First get or create default wishlist
      let { data: wishlists } = await supabase
        .from('wishlists')
        .select('id')
        .eq('user_id', user?.id)
        .limit(1);

      let wishlistId = wishlists?.[0]?.id;

      if (!wishlistId) {
        const { data: newWishlist, error: wishlistError } = await supabase
          .from('wishlists')
          .insert({
            user_id: user?.id,
            title: 'My Wishlist'
          })
          .select('id')
          .single();

        if (wishlistError) throw wishlistError;
        wishlistId = newWishlist.id;
      }

      // Add to wishlist
      const { error } = await supabase
        .from('wishlist_items')
        .insert({
          wishlist_id: wishlistId,
          product_id: productId
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Added to wishlist",
        description: "Item has been added to your wishlist."
      });
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto max-w-6xl p-4">
          <ShopperNavigation />
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-gradient-accent animate-pulse mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading your likes...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen dashboard-bg">
      <div className="container mx-auto max-w-6xl p-4">
        <ShopperNavigation />
        
        <div className="flex items-center gap-3 mb-6">
          <BackButton />
          <Heart className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold font-playfair">My Likes</h1>
          <span className="text-sm text-muted-foreground">
            ({likes?.length || 0} items)
          </span>
        </div>

        {!likes?.length ? (
          <div className="text-center py-20">
            <Heart className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-xl font-semibold font-playfair mb-2">No likes yet</h3>
            <p className="text-muted-foreground mb-4">
              Start swiping right on items you love to see them here
            </p>
            <Button onClick={() => window.location.href = '/swipe'}>
              Start Swiping
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
            {likes.map((like) => (
              <LikeCard
                key={like.id}
                like={like}
                onRemove={(productId) => removeLikeMutation.mutate(productId)}
                onAddToWishlist={(productId) => addToWishlistMutation.mutate(productId)}
                addToWishlistLoading={addToWishlistMutation.isPending}
                removeLoading={removeLikeMutation.isPending}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Likes;