
import React, { useState } from 'react';
import { useWishlistProducts } from '@/hooks/useWishlistProducts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { LazyImage } from '@/components/LazyImage';
import { Trash2, ShoppingCart, ExternalLink } from 'lucide-react';

export const WishlistManager: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { wishlistProducts, isLoading, hasWishlist } = useWishlistProducts();
  const [removing, setRemoving] = useState<string | null>(null);

  const removeFromWishlist = async (itemId: string) => {
    if (!user) return;
    
    setRemoving(itemId);
    try {
      const { error } = await supabase
        .from('wishlist_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Item removed from wishlist"
      });

      // Refetch the data
      window.location.reload();
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      toast({
        title: "Error",
        description: "Failed to remove item from wishlist",
        variant: "destructive"
      });
    } finally {
      setRemoving(null);
    }
  };

  const formatPrice = (cents: number, currency: string = 'USD'): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(cents / 100);
  };

  const handleShopNow = (product: any) => {
    if (product.external_url) {
      window.open(product.external_url, '_blank');
    } else {
      toast({
        title: "Shop Now",
        description: "Product URL not available"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p>Loading your wishlist...</p>
      </div>
    );
  }

  if (!hasWishlist) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">No wishlist found</h2>
        <p className="text-muted-foreground">
          Create your first wishlist to start saving products
        </p>
      </div>
    );
  }

  if (wishlistProducts.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Your wishlist is empty</h2>
        <p className="text-muted-foreground mb-4">
          Start adding products to your wishlist to see them here
        </p>
        <Button onClick={() => window.location.href = '/explore'}>
          Explore Products
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {wishlistProducts.map((item) => (
        <Card key={item.id} className="group hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <div className="relative aspect-square mb-3 rounded-lg overflow-hidden">
              <LazyImage
                src={item.product.media_urls?.[0] || '/placeholder.svg'}
                alt={item.product.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <Button
                size="sm"
                variant="destructive"
                className="absolute top-2 right-2 h-8 w-8 p-0"
                onClick={() => removeFromWishlist(item.id)}
                disabled={removing === item.id}
              >
                {removing === item.id ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold text-sm line-clamp-2">
                {item.product.title}
              </h3>
              
              <div className="flex items-center justify-between">
                <span className="font-bold text-primary">
                  {formatPrice(item.product.price_cents, item.product.currency)}
                </span>
                <Badge variant={item.product.status === 'active' ? 'default' : 'secondary'}>
                  {item.product.status}
                </Badge>
              </div>

              {/* Shop Now Button */}
              <Button
                onClick={() => handleShopNow(item.product)}
                className="w-full mt-3"
                disabled={!item.product.external_url}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Shop Now
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>

              <p className="text-xs text-muted-foreground">
                Added {new Date(item.added_at).toLocaleDateString()}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
