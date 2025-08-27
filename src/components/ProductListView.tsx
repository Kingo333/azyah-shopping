import React, { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, X, ShoppingBag, Sparkles, Info, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useWishlist } from '@/hooks/useWishlist';
import { Product } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import ProductDetailPage from '@/components/ProductDetailPage';
import { getResponsiveImageProps } from '@/utils/asosImageUtils';

interface ProductListViewProps {
  products: Product[];
  isLoading: boolean;
}

const ProductListView: React.FC<ProductListViewProps> = ({ products, isLoading }) => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductDetail, setShowProductDetail] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleLike = useCallback(async (product: Product) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "You must be signed in to like products.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase.from('likes').insert([{
        user_id: user.id,
        product_id: product.id
      }]);

      if (error) {
        if (error.code === '23505') {
          toast({
            description: `${product.title} is already in your likes!`
          });
        } else {
          throw error;
        }
      } else {
        toast({
          description: `${product.title} added to your likes!`
        });
      }
    } catch (error: any) {
      console.error("Error liking product:", error.message);
      toast({
        title: "Error",
        description: "Failed to like product. Please try again.",
        variant: "destructive"
      });
    }
  }, [user, toast]);

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setShowProductDetail(true);
  };

  const formatPrice = (cents: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(cents / 100);
  };

  const getImageUrl = (product: Product) => {
    // Handle image_url first
    if (product.image_url) return product.image_url;
    
    // Handle media_urls as array
    if (product.media_urls && Array.isArray(product.media_urls) && product.media_urls.length > 0) {
      return product.media_urls[0];
    }
    
    // Handle media_urls as JSON string (ASOS products)
    if (product.media_urls && typeof product.media_urls === 'string') {
      try {
        const parsed = JSON.parse(product.media_urls);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed[0];
        }
      } catch (e) {
        console.warn('Failed to parse media_urls:', product.media_urls);
      }
    }
    
    return '/placeholder.svg';
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <div key={i} className="animate-pulse">
            <div className="aspect-square bg-accent rounded-lg mb-3"></div>
            <div className="h-4 bg-accent rounded mb-2"></div>
            <div className="h-3 bg-accent rounded w-2/3 mb-2"></div>
            <div className="h-8 bg-accent rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-medium mb-2">No products found</h3>
          <p className="text-muted-foreground">
            Try adjusting your filters or search query.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
        {products.map(product => {
          const WishlistButton = ({ productId }: { productId: string }) => {
            const { addToWishlist, isLoading: wishlistLoading } = useWishlist(productId);
            
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
                await addToWishlist();
                toast({
                  description: `${product.title} added to your wishlist!`
                });
              } catch (error: any) {
                if (error.message.includes('duplicate key value violates unique constraint')) {
                  toast({
                    description: `${product.title} is already in your wishlist!`
                  });
                } else {
                  toast({
                    title: "Error",
                    description: "Failed to add to wishlist. Please try again.",
                    variant: "destructive"
                  });
                }
              }
            };

            return (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddToWishlist}
                disabled={wishlistLoading}
                className="flex-1 h-7 text-[10px] md:text-xs px-2"
              >
                <ShoppingBag className="h-2.5 w-2.5 mr-1" />
                Wishlist
              </Button>
            );
          };

          return (
            <Card key={product.id} className="group hover:shadow-lg transition-shadow">
              <CardContent className="p-0">
                <div className="space-y-2 md:space-y-3">
                  <div className="aspect-square relative overflow-hidden rounded-t-lg">
                     <img
                      {...getResponsiveImageProps(
                        getImageUrl(product),
                        "(max-width: 768px) 50vw, 25vw"
                      )}
                      alt={product.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder.svg';
                      }}
                    />
                    {product.ar_mesh_url && (
                      <Badge variant="outline" className="absolute top-2 right-2 gap-1 text-xs bg-background/80 backdrop-blur-sm">
                        <Sparkles className="h-3 w-3" />
                        AR
                      </Badge>
                    )}
                  </div>
                  
                   <div className="p-1.5 md:p-3 space-y-1.5">
                     <div className="flex items-start justify-between">
                       <div className="flex-1 min-w-0">
                         <h3 className="font-medium line-clamp-2 text-xs md:text-sm leading-tight">{product.title}</h3>
                         {product.brand && (
                           <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">{product.brand.name}</p>
                         )}
                       </div>
                       <Button
                         variant="ghost"
                         size="sm"
                         onClick={() => handleProductClick(product)}
                         className="flex-shrink-0 h-6 w-6 p-0 hover:bg-accent"
                       >
                         <Info className="h-3 w-3" />
                       </Button>
                     </div>
                     
                     <div className="flex items-center justify-between">
                       <span className="font-bold text-xs md:text-sm">
                         {formatPrice(product.price_cents, product.currency)}
                       </span>
                     </div>

                     <div className="flex gap-1.5">
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={() => handleLike(product)}
                         className="flex-1 h-7 text-[10px] md:text-xs px-2"
                       >
                         <Heart className="h-2.5 w-2.5 mr-1" />
                         Like
                       </Button>
                       <WishlistButton productId={product.id} />
                     </div>

                     {product.external_url && (
                       <Button
                         variant="default"
                         size="sm"
                         onClick={() => window.open(product.external_url, '_blank', 'noopener,noreferrer')}
                         className="w-full h-7 text-[10px] md:text-xs"
                       >
                         <ExternalLink className="h-2.5 w-2.5 mr-1" />
                         Shop Now
                       </Button>
                     )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedProduct && showProductDetail && (
        <div className="fixed inset-0 z-50 bg-background">
          <ProductDetailPage
            product={selectedProduct}
            onBack={() => {
              setShowProductDetail(false);
              setSelectedProduct(null);
            }}
          />
        </div>
      )}
    </>
  );
};

export default ProductListView;