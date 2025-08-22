import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Heart, ShoppingBag, Info, ExternalLink } from 'lucide-react';
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

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <div key={i} className="animate-pulse bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl">
            <div className="aspect-[3/4] bg-accent/50 rounded-2xl mb-3"></div>
            <div className="p-3 space-y-2">
              <div className="h-4 bg-accent rounded"></div>
              <div className="h-3 bg-accent rounded w-2/3"></div>
            </div>
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
                variant="ghost"
                size="icon"
                onClick={handleAddToWishlist}
                disabled={wishlistLoading}
                className="h-8 w-8 rounded-full bg-white/90 backdrop-blur-sm text-foreground hover:bg-white/95 shadow-sm"
              >
                <ShoppingBag className="h-4 w-4" />
              </Button>
            );
          };

          return (
            <div 
              key={product.id} 
              className="group relative bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden"
            >
              <div className="relative aspect-[3/4] overflow-hidden rounded-2xl">
                <img
                  {...getResponsiveImageProps(
                    product.media_urls?.[0] || '/placeholder.svg',
                    "(max-width: 768px) 50vw, 25vw"
                  )}
                  alt={product.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder.svg';
                  }}
                />
                
                {/* Gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-primary/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Like button - top right corner */}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleLike(product)}
                    className="h-8 w-8 rounded-full bg-white/90 backdrop-blur-sm text-foreground hover:bg-white/95 shadow-sm"
                  >
                    <Heart className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Product info overlay - bottom */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-sm rounded-xl m-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="space-y-2">
                    <div>
                      <h3 className="font-medium line-clamp-2 text-sm leading-tight">{product.title}</h3>
                      {product.brand && (
                        <p className="text-xs text-muted-foreground">{product.brand.name}</p>
                      )}
                      <p className="font-bold text-sm mt-1">
                        {formatPrice(product.price_cents, product.currency)}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col gap-1">
                        <WishlistButton productId={product.id} />
                      </div>
                      
                      {product.external_url && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => window.open(product.external_url, '_blank', 'noopener,noreferrer')}
                          className="flex-1 h-8 text-xs"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Shop Now
                        </Button>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleProductClick(product)}
                        className="h-8 w-8 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white/95 shadow-sm"
                      >
                        <Info className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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