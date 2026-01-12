
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, X, ShoppingBag, Sparkles, Info, ExternalLink, Image, User, Check } from 'lucide-react';
import { HangerIcon } from '@/components/icons/HangerIcon';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useWishlist } from '@/hooks/useWishlist';
import { Product } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import ProductDetailPage from '@/components/ProductDetailPage';
import PhotoCloseup from '@/components/PhotoCloseup';
import ProductTryOnModal from '@/components/ProductTryOnModal';
import { SmartImage } from '@/components/SmartImage';
import { getPrimaryImageUrl, hasMultipleImages, getImageCount } from '@/utils/imageHelpers';
import { useProductHasOutfit } from '@/hooks/useProductOutfits';
import CategoryGrid from '@/components/CategoryGrid';
import { getBrandDisplayName } from '@/utils/brandHelpers';
import type { SubCategory } from '@/lib/categories';
import { useGuestGate } from '@/hooks/useGuestGate';
import { GuestActionPrompt } from '@/components/GuestActionPrompt';
import { useAddProductToWardrobe, checkClosetDuplicate } from '@/hooks/useAddProductToWardrobe';
import { toast as sonnerToast } from 'sonner';
import { cn } from '@/lib/utils';
import { openExternalUrl } from '@/lib/openExternalUrl';

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
  formatPrice: (cents: number, currency?: string) => string;
  user: any;
  toast: any;
  requireAuth: (action: string, callback: () => void) => void;
}> = ({ product, handleLike, handleProductClick, formatPrice, user, toast, requireAuth }) => {
  const { addToWishlist, isLoading: wishlistLoading } = useWishlist(product.id);
  const { data: hasOutfit, isLoading: outfitLoading, error: outfitError } = useProductHasOutfit(product.id);
  const { mutate: addToWardrobe, isPending: wardrobeLoading } = useAddProductToWardrobe();
  const [tryOnModalOpen, setTryOnModalOpen] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  // Show head icon when outfit exists
  const shouldShowHeadIcon = hasOutfit === true;

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

  const handleAddToWardrobe = async () => {
    requireAuth('save to Closet', async () => {
      if (!user) return;
      
      // Check for duplicates first
      const isDuplicate = await checkClosetDuplicate(user.id, product.id);
      if (isDuplicate) {
        sonnerToast.info('Already in Closet', {
          description: 'This item is already saved',
          duration: 2000,
        });
        return;
      }
      
      addToWardrobe({ product: product as any, skipDuplicateCheck: true }, {
        onSuccess: () => {
          setIsAdded(true);
          setTimeout(() => setIsAdded(false), 1500);
        }
      });
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

        {/* Try On label when AI Try On is available - positioned below multiple images indicator */}
        {shouldShowHeadIcon && (
          <div 
            className="absolute top-10 left-2 bg-accent text-white text-[10px] px-2 py-1 rounded-full flex items-center gap-1 opacity-90 z-10 cursor-pointer hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              setTryOnModalOpen(true);
            }}
          >
            Try On
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
          {/* Try-on button - only show if product has outfit */}
          {shouldShowHeadIcon && (
            <Button
              size="sm"
              variant="ghost"
              className="h-10 w-10 rounded-full bg-accent/90 hover:bg-accent backdrop-blur-sm"
              onClick={(e) => {
                e.stopPropagation();
                setTryOnModalOpen(true);
              }}
              title="Try it on"
            >
              <User className="h-6 w-6 text-white" />
            </Button>
          )}
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
            {formatPrice(product.price_cents, product.currency)}
          </div>
          
          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            <div className="flex space-x-2">
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
            
            {/* + Closet button */}
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleAddToWardrobe();
              }}
              disabled={wardrobeLoading || isAdded}
              className={cn(
                "w-full text-xs h-8 opacity-80 hover:opacity-100 backdrop-blur-sm transition-all",
                isAdded && "bg-green-500/80 text-white border-green-500"
              )}
            >
              {isAdded ? (
                <>
                  <Check className="h-3.5 w-3.5 mr-1" />
                  Added
                </>
              ) : (
              <>
                  <HangerIcon className="h-3.5 w-3.5 mr-1" size={14} />
                  <span className="text-[10px]">+ Closet</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Try-On Modal */}
      <ProductTryOnModal
        isOpen={tryOnModalOpen}
        onClose={() => setTryOnModalOpen(false)}
        product={product}
      />
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
            formatPrice={formatPrice}
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
