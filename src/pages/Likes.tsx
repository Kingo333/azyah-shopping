
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { LazyImage } from '@/components/LazyImage';
import ShopperNavigation from '@/components/ShopperNavigation';
import { Heart, ShoppingCart, ExternalLink } from 'lucide-react';

interface LikedProduct {
  id: string;
  title: string;
  price_cents: number;
  currency: string;
  media_urls: any;
  brand_id: string;
  status: string;
  external_url?: string;
  brand?: {
    name: string;
  };
}

interface Like {
  id: string;
  product_id: string;
  created_at: string;
  product: LikedProduct;
}

const Likes: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [likes, setLikes] = useState<Like[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchLikes();
    }
  }, [user]);

  const fetchLikes = async () => {
    try {
      const { data, error } = await supabase
        .from('likes')
        .select(`
          id,
          product_id,
          created_at,
          product:products(
            id,
            title,
            price_cents,
            currency,
            media_urls,
            brand_id,
            status,
            external_url,
            brand:brands(
              name
            )
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLikes((data as Like[]) || []);
    } catch (error) {
      console.error('Error fetching likes:', error);
      toast({
        title: "Error",
        description: "Failed to fetch liked products",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const unlikeProduct = async (likeId: string) => {
    try {
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('id', likeId);

      if (error) throw error;

      setLikes(prev => prev.filter(like => like.id !== likeId));
      toast({
        title: "Success",
        description: "Product removed from likes"
      });
    } catch (error) {
      console.error('Error unliking product:', error);
      toast({
        title: "Error",
        description: "Failed to unlike product",
        variant: "destructive"
      });
    }
  };

  const formatPrice = (cents: number, currency: string = 'USD'): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(cents / 100);
  };

  const handleShopNow = (product: LikedProduct) => {
    if (product.external_url) {
      window.open(product.external_url, '_blank');
    } else {
      toast({
        title: "Shop Now",
        description: "Product URL not available"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto max-w-6xl p-4">
          <ShopperNavigation />
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p>Loading your liked products...</p>
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
          <Heart className="h-6 w-6 text-red-500" />
          <h1 className="text-2xl font-bold">My Likes</h1>
          <Badge variant="secondary">{likes.length}</Badge>
        </div>

        {likes.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No liked products yet</h2>
            <p className="text-muted-foreground mb-4">
              Start exploring and like products to see them here
            </p>
            <Button onClick={() => window.location.href = '/explore'}>
              Explore Products
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {likes.map((like) => (
              <Card key={like.id} className="group hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="relative aspect-square mb-3 rounded-lg overflow-hidden">
                    <LazyImage
                      src={like.product.media_urls?.[0] || '/placeholder.svg'}
                      alt={like.product.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <Button
                      size="sm"
                      variant="destructive"
                      className="absolute top-2 right-2 h-8 w-8 p-0"
                      onClick={() => unlikeProduct(like.id)}
                    >
                      <Heart className="h-4 w-4 fill-current" />
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm line-clamp-2">
                      {like.product.title}
                    </h3>
                    
                    {like.product.brand && (
                      <p className="text-xs text-muted-foreground">
                        {like.product.brand.name}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-primary">
                        {formatPrice(like.product.price_cents, like.product.currency)}
                      </span>
                      <Badge variant={like.product.status === 'active' ? 'default' : 'secondary'}>
                        {like.product.status}
                      </Badge>
                    </div>

                    {/* Shop Now Button */}
                    <Button
                      onClick={() => handleShopNow(like.product)}
                      className="w-full mt-3"
                      disabled={!like.product.external_url}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Shop Now
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
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
