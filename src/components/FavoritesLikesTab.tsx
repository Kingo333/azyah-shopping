import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, Trash2, ExternalLink, ShoppingBag, User } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useProductHasOutfit } from '@/hooks/useProductOutfits';
import ProductTryOnModal from '@/components/ProductTryOnModal';
import { SmartImage } from '@/components/SmartImage';
import { getPrimaryImageUrl } from '@/utils/imageHelpers';
import { openExternalUrl } from '@/lib/openExternalUrl';

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

const LikeCard: React.FC<{
  like: LikedProduct;
  onRemove: (productId: string) => void;
  onAddToWishlist: (productId: string) => void;
  isRemoving: boolean;
  isAddingToWishlist: boolean;
}> = ({ like, onRemove, onAddToWishlist, isRemoving, isAddingToWishlist }) => {
  const { data: hasOutfit } = useProductHasOutfit(like.products!.id);
  const [tryOnModalOpen, setTryOnModalOpen] = useState(false);

  const formatPrice = (cents: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(cents / 100);
  };

  if (!like.products) return null;

  return (
    <>
      <Card className="group overflow-hidden hover:shadow-xl transition-all duration-300 border-border/50">
        <CardContent className="p-0">
          <div className="aspect-[3/4] relative overflow-hidden bg-muted">
            <SmartImage
              src={getPrimaryImageUrl(like.products)}
              alt={like.products.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
            
            {/* Hover Actions */}
            <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="icon"
                variant="secondary"
                className="h-8 w-8 rounded-full shadow-lg"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToWishlist(like.products!.id);
                }}
                disabled={isAddingToWishlist}
              >
                <ShoppingBag className="h-4 w-4" />
              </Button>
              {hasOutfit && (
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8 rounded-full shadow-lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    setTryOnModalOpen(true);
                  }}
                >
                  <User className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-3 space-y-2">
            {like.products.brands && (
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {like.products.brands.name}
              </p>
            )}
            <h3 className="text-sm font-medium line-clamp-2 min-h-[2.5rem]">
              {like.products.title}
            </h3>
            <p className="text-sm font-bold text-primary">
              {formatPrice(like.products.price_cents, like.products.currency)}
            </p>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="destructive"
                size="sm"
                className="flex-1 h-8"
                onClick={() => onRemove(like.products!.id)}
                disabled={isRemoving}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Remove
              </Button>
              {like.products.external_url && (
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1 h-8"
                  onClick={() => openExternalUrl(like.products!.external_url)}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Shop
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <ProductTryOnModal
        isOpen={tryOnModalOpen}
        onClose={() => setTryOnModalOpen(false)}
        product={like.products as any}
      />
    </>
  );
};

const FavoritesLikesTab: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: likes, isLoading } = useQuery({
    queryKey: ['likes', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: likeData, error } = await supabase
        .from('likes')
        .select('id, product_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!likeData?.length) return [];

      const productIds = likeData.map((like) => like.product_id);
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select(`id, title, price_cents, currency, media_urls, external_url, brands (name)`)
        .in('id', productIds);

      if (productsError) throw productsError;

      return likeData
        .map((like) => ({
          ...like,
          products: products?.find((p) => p.id === like.product_id) || null,
        }))
        .filter((item) => item.products !== null) as LikedProduct[];
    },
    enabled: !!user?.id,
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
      toast({ title: 'Removed from likes' });
    },
  });

  const addToWishlistMutation = useMutation({
    mutationFn: async (productId: string) => {
      let { data: wishlists } = await supabase
        .from('wishlists')
        .select('id')
        .eq('user_id', user?.id)
        .limit(1);

      let wishlistId = wishlists?.[0]?.id;

      if (!wishlistId) {
        const { data: newWishlist, error } = await supabase
          .from('wishlists')
          .insert({ user_id: user?.id, title: 'My Wishlist' })
          .select('id')
          .single();
        if (error) throw error;
        wishlistId = newWishlist.id;
      }

      const { error } = await supabase
        .from('wishlist_items')
        .insert({ wishlist_id: wishlistId, product_id: productId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Added to wishlist' });
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-[3/4] bg-muted rounded-lg mb-2"></div>
            <div className="h-4 bg-muted rounded mb-1"></div>
            <div className="h-3 bg-muted rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!likes?.length) {
    return (
      <div className="text-center py-16">
        <Heart className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">No likes yet</h3>
        <p className="text-muted-foreground mb-6">
          Start swiping right on items you love to see them here
        </p>
        <Button onClick={() => navigate('/swipe')}>Start Swiping</Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {likes.map((like) => (
        <LikeCard
          key={like.id}
          like={like}
          onRemove={(productId) => removeLikeMutation.mutate(productId)}
          onAddToWishlist={(productId) => addToWishlistMutation.mutate(productId)}
          isRemoving={removeLikeMutation.isPending}
          isAddingToWishlist={addToWishlistMutation.isPending}
        />
      ))}
    </div>
  );
};

export default FavoritesLikesTab;
