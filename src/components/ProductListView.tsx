
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, X, ShoppingBag, Sparkles, Info, ExternalLink, Image, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useWishlist } from '@/hooks/useWishlist';
import { Product } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import ProductDetailPage from '@/components/ProductDetailPage';
import PhotoCloseup from '@/components/PhotoCloseup';
import ProductTryOnModal from '@/components/ProductTryOnModal';
import { getResponsiveImageProps } from '@/utils/asosImageUtils';
import { getPrimaryImageUrl, hasMultipleImages, getImageCount } from '@/utils/imageHelpers';
import { useProductHasOutfit } from '@/hooks/useProductOutfits';
import CategoryCarousel from '@/components/CategoryCarousel';

interface ProductListViewProps {
  products: Product[];
  isLoading: boolean;
  selectedCategories?: string[];
  onCategoryToggle?: (category: string) => void;
  showCategoryCarousel?: boolean;
}

/* ProductCard component */
const ProductCard: React.FC<{
  product: Product;
  handleLike: (product: Product) => void;
  handleProductClick: (product: Product) => void;
  formatPrice: (cents: number, currency?: string) => string;
  user: any;
  toast: any;
}> = ({ product, handleLike, handleProductClick, formatPrice, user, toast }) => {
  const { addToWishlist, isLoading: wishlistLoading } = useWishlist(product.id);
  const { data: hasOutfit, isLoading: outfitLoading, error: outfitError } = useProductHasOutfit(product.id);
  const [tryOnModalOpen, setTryOnModalOpen] = useState(false);

  // Show head icon when outfit exists
  const shouldShowHeadIcon = hasOutfit === true;

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
      await addToWishlist(product.id);
      toast({
        description: `${product.title} added to your wishlist!`
      });
    } catch (error: any) {
      console.error('Failed to add to wishlist:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to add to wishlist. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="overflow-hidden group hover:shadow-md transition-shadow">
      <div 
        className="aspect-square relative overflow-hidden bg-muted cursor-pointer"
        onClick={() => handleProductClick(product)}
      >
        <img
          src={getPrimaryImageUrl(product)}
          alt={product.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/placeholder.svg';
          }}
        />
        
        {/* Multiple images indicator for ASOS products */}
        {hasMultipleImages(product) && (
          <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
            <Image className="h-3 w-3" />
            {getImageCount(product)}
          </div>
        )}
        
        {/* Top-right action buttons */}
        <div className="absolute top-2 right-2 flex flex-col space-y-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 rounded-full bg-white/90 hover:bg-white backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              handleLike(product);
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
          {/* Try-on button - only show if product has outfit */}
          {shouldShowHeadIcon && (
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
        
        {/* Bottom overlay with Shop Now button */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="flex justify-between items-center">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 rounded-full bg-white/90 hover:bg-white"
              onClick={(e) => {
                e.stopPropagation();
                handleProductClick(product);
              }}
            >
              <Info className="h-4 w-4" />
            </Button>
            
            {/* Shop Now button */}
            {product.external_url && (
              <Button
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(product.external_url, '_blank', 'noopener,noreferrer');
                }}
                className="text-xs h-8"
              >
                Shop Now
              </Button>
            )}
          </div>
        </div>
      </div>
      
      <div className="p-3">
        <h3 className="font-medium text-sm line-clamp-2 mb-1">
          {product.title}
        </h3>
        {(product.brand?.name || product.retailer?.name) && (
          <p className="text-xs text-muted-foreground mb-2">
            {product.brand?.name || product.retailer?.name || 'ASOS'}
          </p>
        )}
        <p className="font-semibold text-sm">
          {formatPrice(product.price_cents, product.currency)}
        </p>
      </div>
      
      {/* Try-On Modal */}
      <ProductTryOnModal
        isOpen={tryOnModalOpen}
        onClose={() => setTryOnModalOpen(false)}
        product={product}
      />
    </Card>
  );
};

const ProductListView: React.FC<ProductListViewProps> = ({ 
  products, 
  isLoading, 
  selectedCategories = [], 
  onCategoryToggle = () => {}, 
  showCategoryCarousel = false 
}) => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showCloseup, setShowCloseup] = useState(false);
  const navigate = useNavigate();
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
    navigate(`/p/${product.id}?from=list`);
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
          <div key={i} className="animate-pulse bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl shadow-lg aspect-[3/4]">
            <div className="w-full h-full bg-accent rounded-2xl"></div>
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
      {showCategoryCarousel && (
        <CategoryCarousel 
          selectedCategories={selectedCategories as any}
          onCategoryToggle={onCategoryToggle}
        />
      )}
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
        {products.map(product => (
          <ProductCard 
            key={product.id} 
            product={product} 
            handleLike={handleLike}
            handleProductClick={handleProductClick}
            formatPrice={formatPrice}
            user={user}
            toast={toast}
          />
        ))}
      </div>

    </>
  );
};

export default ProductListView;
