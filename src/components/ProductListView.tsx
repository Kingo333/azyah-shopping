import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Heart, ShoppingBag, Info, Image } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useWishlist } from '@/hooks/useWishlist';
import { Product } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { SmartImage } from '@/components/SmartImage';
import { getPrimaryImageUrl, hasMultipleImages, getImageCount } from '@/utils/imageHelpers';
import CategoryGrid from '@/components/CategoryGrid';
import { getBrandDisplayName } from '@/utils/brandHelpers';
import type { SubCategory } from '@/lib/categories';
import { useGuestGate } from '@/hooks/useGuestGate';
import { GuestActionPrompt } from '@/components/GuestActionPrompt';
import { openExternalUrl } from '@/lib/openExternalUrl';
import { Money } from '@/components/ui/Money';

interface ProductListViewProps {
  products: Product[];
  isLoading: boolean;
  selectedCategories?: string[];
  onCategoryToggle?: (category: string) => void;
  selectedSubcategories?: SubCategory[];
  onSubcategoryToggle?: (subcategory: SubCategory) => void;
  showCategoryCarousel?: boolean;
}

/* ProductCard component */
const ProductCard: React.FC<{
  product: Product;
  handleLike: (product: Product) => void;
  handleProductClick: (product: Product) => void;
  user: any;
  toast: any;
  requireAuth: (action: string, callback: () => void) => void;
}> = ({ product, handleLike, handleProductClick, user, toast, requireAuth }) => {
  const { addToWishlist, isLoading: wishlistLoading } = useWishlist(product.id);

  const handleAddToWishlist = async () => {
    requireAuth('add to wishlist', async () => {
      if (!user) return;

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
    });
  };

  return (
    <div className="group relative bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
      <div 
        className="w-full aspect-[3/4] bg-muted rounded-2xl overflow-hidden relative cursor-pointer"
        onClick={() => handleProductClick(product)}
      >
        <SmartImage
          src={getPrimaryImageUrl(product)}
          alt={product.title}
          className="w-full h-full object-cover"
          sizes="(max-width: 768px) 50vw, 25vw"
        />
        
        {/* Multiple images indicator */}
        {hasMultipleImages(product) && (
          <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full flex items-center gap-1 opacity-90">
            <Image className="h-3 w-3" />
            {getImageCount(product)}
          </div>
        )}
        
        {/* Hover gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-primary/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Top-right action buttons */}
        <div className="absolute top-1 right-1 flex flex-col space-y-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <Button
            size="sm"
            variant="ghost"
            className="h-10 w-10 rounded-full bg-white/90 hover:bg-white backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              handleLike(product);
            }}
          >
            <Heart className="h-6 w-6" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-10 w-10 rounded-full bg-white/90 hover:bg-white backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              handleAddToWishlist();
            }}
            disabled={wishlistLoading}
          >
            <ShoppingBag className="h-6 w-6" />
          </Button>
        </div>
        
        {/* Product Info Overlay (appears on hover) */}
        <div className="absolute bottom-4 left-4 right-4 bg-white/60 backdrop-blur-sm rounded-xl p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="text-xs font-medium line-clamp-1 mb-1">
            {product.title}
          </div>
          <div className="text-xs text-muted-foreground mb-1">
            {getBrandDisplayName(product)}
          </div>
          <div className="text-xs font-semibold text-primary mb-3">
            <Money cents={product.price_cents} currency={product.currency || 'USD'} size="sm" />
          </div>
          
          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 rounded-full bg-primary/10"
              onClick={() => handleProductClick(product)}
            >
              <Info className="h-3 w-3" />
            </Button>
            
            {/* Shop Now button */}
            {product.external_url && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => openExternalUrl(product.external_url)}
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

const ProductListView: React.FC<ProductListViewProps> = ({ 
  products, 
  isLoading, 
  selectedCategories = [], 
  onCategoryToggle = () => {}, 
  selectedSubcategories = [],
  onSubcategoryToggle = () => {},
  showCategoryCarousel = false 
}) => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showCloseup, setShowCloseup] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { requireAuth, showPrompt, setShowPrompt, promptAction } = useGuestGate();

  const handleLike = useCallback(async (product: Product) => {
    requireAuth('save likes', async () => {
      if (!user) return;

      try {
        const { error } = await supabase.from('likes').insert([{
          user_id: user.id,
          product_id: product.id
        }]);

        if (error) {
          if (error.code === '23505') {
            // Already liked - update timestamp to bring to top
            await supabase
              .from('likes')
              .update({ created_at: new Date().toISOString() })
              .eq('user_id', user.id)
              .eq('product_id', product.id);
            
            toast({
              description: `${product.title} moved to top of likes!`
            });
          } else {
            throw error;
          }
        } else {
          toast({
            description: `${product.title} added to your likes!`
          });
        }

        // Invalidate likes cache
        queryClient.invalidateQueries({ queryKey: ['likes'] });
        queryClient.invalidateQueries({ queryKey: ['liked-products'] });
      } catch (error: any) {
        console.error("Error liking product:", error.message);
        toast({
          title: "Error",
          description: "Failed to like product. Please try again.",
          variant: "destructive"
        });
      }
    });
  }, [user, toast, queryClient, requireAuth]);

  const handleProductClick = (product: Product) => {
    navigate(`/p/${product.id}?from=list`);
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
        <CategoryGrid 
          selectedCategories={selectedCategories as any}
          onCategoryToggle={onCategoryToggle}
          selectedSubcategories={selectedSubcategories}
          onSubcategoryToggle={onSubcategoryToggle}
        />
      )}
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
        {products.map(product => (
          <ProductCard 
            key={product.id} 
            product={product} 
            handleLike={handleLike}
            handleProductClick={handleProductClick}
            user={user}
            toast={toast}
            requireAuth={requireAuth}
          />
        ))}
      </div>
      
      {/* Guest Action Prompt */}
      <GuestActionPrompt 
        open={showPrompt} 
        onOpenChange={setShowPrompt} 
        action={promptAction} 
      />
    </>
  );
};

export default ProductListView;
