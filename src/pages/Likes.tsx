import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import ShopperNavigation from '@/components/ShopperNavigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, ShoppingBag, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

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
    brands: {
      name: string;
    };
  };
}

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
          brands!inner (name)
        `)
        .in('id', productIds);

      if (productsError) throw productsError;

      // Combine the data
      const result = likeData.map(like => ({
        ...like,
        products: products?.find(p => p.id === like.product_id)
      })).filter(item => item.products) as LikedProduct[];

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

  const formatPrice = (cents: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(cents / 100);
  };

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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-6xl p-4">
        <ShopperNavigation />
        
        <div className="flex items-center gap-3 mb-6">
          <Heart className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">My Likes</h1>
          <span className="text-sm text-muted-foreground">
            ({likes?.length || 0} items)
          </span>
        </div>

        {!likes?.length ? (
          <div className="text-center py-20">
            <Heart className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No likes yet</h3>
            <p className="text-muted-foreground mb-4">
              Start swiping right on items you love to see them here
            </p>
            <Button onClick={() => window.location.href = '/swipe'}>
              Start Swiping
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {likes.map((like) => (
              <Card key={like.id} className="group hover:shadow-lg transition-all duration-300">
                <CardContent className="p-0">
                  <div className="relative aspect-square overflow-hidden rounded-t-lg">
                    <img
                      src={like.products.media_urls?.[0] || '/placeholder.svg'}
                      alt={like.products.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-md px-2 py-1">
                      <span className="text-xs font-medium">
                        {like.products.brands?.name}
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <h3 className="font-semibold line-clamp-2 mb-2">
                      {like.products.title}
                    </h3>
                    <p className="text-lg font-bold text-primary mb-4">
                      {formatPrice(like.products.price_cents, like.products.currency)}
                    </p>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addToWishlistMutation.mutate(like.products.id)}
                        disabled={addToWishlistMutation.isPending}
                        className="flex-1"
                      >
                        <ShoppingBag className="h-4 w-4 mr-1" />
                        Wishlist
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLikeMutation.mutate(like.products.id)}
                        disabled={removeLikeMutation.isPending}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Likes;