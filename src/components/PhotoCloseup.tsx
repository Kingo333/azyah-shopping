import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { X, Share2, Heart, ShoppingBag, ExternalLink, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useWishlist } from '@/hooks/useWishlist';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types';
import SimilarItemsGrid from './SimilarItemsGrid';
import { getPrimaryImageUrl } from '@/utils/imageHelpers';
import { getResponsiveImageProps } from '@/utils/asosImageUtils';

interface PhotoCloseupProps {
  onClose?: () => void;
  initialProduct?: Product;
}

const PhotoCloseup: React.FC<PhotoCloseupProps> = ({ onClose, initialProduct }) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [browsingStack, setBrowsingStack] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const isOverlay = searchParams.get('from') === 'list';
  const productId = id || initialProduct?.id;

  // Fetch product data
  const { data: product, isLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      if (initialProduct && initialProduct.id === productId) {
        return initialProduct;
      }
      
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          brand:brands(*),
          retailer:retailers(*)
        `)
        .eq('id', productId)
        .single();

      if (error) throw error;
      return data as Product;
    },
    enabled: !!productId,
  });

  const { addToWishlist, isLoading: wishlistLoading } = useWishlist(productId);

  // Initialize browsing stack
  useEffect(() => {
    if (productId && !browsingStack.includes(productId)) {
      setBrowsingStack(prev => [...prev, productId]);
      setCurrentIndex(prev => prev + 1);
    }
  }, [productId]);

  // Handle navigation
  const handleClose = () => {
    if (onClose) {
      onClose();
    } else if (isOverlay) {
      navigate(-1);
    } else {
      navigate('/swipe');
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      const prevId = browsingStack[currentIndex - 1];
      setCurrentIndex(prev => prev - 1);
      navigate(`/p/${prevId}${isOverlay ? '?from=list' : ''}`, { replace: true });
    } else {
      handleClose();
    }
  };

  const handleSimilarItemClick = (similarProduct: Product) => {
    // Track analytics
    if (product) {
      supabase.from('events').insert({
        user_id: user?.id,
        event_type: 'similar_click',
        event_data: {
          from_item_id: product.id,
          to_item_id: similarProduct.id
        },
        product_id: similarProduct.id
      });
    }

    // Update browsing stack and navigate
    setBrowsingStack(prev => [...prev.slice(0, currentIndex + 1), similarProduct.id]);
    setCurrentIndex(prev => prev + 1);
    navigate(`/p/${similarProduct.id}${isOverlay ? '?from=list' : ''}`, { replace: true });
  };

  const handleAddToWishlist = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "You must be signed in to add to wishlist.",
        variant: "destructive"
      });
      return;
    }

    if (!product) return;

    try {
      await addToWishlist(product.id);
      toast({
        description: `${product.title} added to your wishlist!`
      });

      // Track analytics
      supabase.from('events').insert({
        user_id: user.id,
        event_type: 'wishlist_clicked',
        event_data: { source: 'closeup' },
        product_id: product.id
      });
    } catch (error: any) {
      console.error('Failed to add to wishlist:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add to wishlist. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleLike = async () => {
    if (!user || !product) return;

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

        // Track analytics
        supabase.from('events').insert({
          user_id: user.id,
          event_type: 'like_clicked',
          event_data: { source: 'closeup' },
          product_id: product.id
        });
      }
    } catch (error: any) {
      console.error("Error liking product:", error);
      toast({
        title: "Error",
        description: "Failed to like product. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleShare = async () => {
    if (!product) return;

    const shareData = {
      title: product.title,
      text: `Check out this ${product.title} from ${product.brand?.name || 'Azyah'}`,
      url: `${window.location.origin}/p/${product.id}`
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        toast({
          description: "Link copied to clipboard!"
        });
      }

      // Track analytics
      supabase.from('events').insert({
        user_id: user?.id,
        event_type: 'share_clicked',
        event_data: { source: 'closeup' },
        product_id: product.id
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleVisitBrand = () => {
    if (!product?.external_url) return;

    // Track analytics
    supabase.from('events').insert({
      user_id: user?.id,
      event_type: 'closeup_visit_brand',
      event_data: { 
        brand_name: product.brand?.name,
        external_url: product.external_url
      },
      product_id: product.id,
      brand_id: product.brand_id
    });

    window.open(product.external_url, '_blank', 'noopener,noreferrer');
  };

  // Track closeup open
  useEffect(() => {
    if (product && user) {
      supabase.from('events').insert({
        user_id: user.id,
        event_type: 'closeup_open',
        event_data: { 
          implicit_like: true,
          depth: currentIndex 
        },
        product_id: product.id
      });

      return () => {
        supabase.from('events').insert({
          user_id: user.id,
          event_type: 'closeup_close',
          product_id: product.id
        });
      };
    }
  }, [product, user, currentIndex]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
        <div className="text-white text-center">
          <p>Product not found</p>
          <Button onClick={handleClose} variant="outline" className="mt-4">
            Close
          </Button>
        </div>
      </div>
    );
  }

  const formatPrice = (cents: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(cents / 100);
  };

  return (
    <div 
      role="dialog" 
      aria-modal 
      className="fixed inset-0 bg-black/60 z-50"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      {/* Mobile Layout */}
      <div className="md:hidden absolute inset-x-0 bottom-0 top-[env(safe-area-inset-top)] rounded-t-2xl bg-background overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/50 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {currentIndex > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleBack}
                className="p-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <h2 className="font-semibold truncate">
              {product.brand?.name || 'Product Details'}
            </h2>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleShare}
              className="p-2"
            >
              <Share2 className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleClose}
              className="p-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto h-full pb-20">
          {/* Hero Image */}
          <div className="relative aspect-[3/4] bg-muted">
            <img
              {...getResponsiveImageProps(
                getPrimaryImageUrl(product),
                "(max-width: 768px) 100vw, 50vw"
              )}
              alt={product.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder.svg';
              }}
            />
          </div>

          {/* Product Info */}
          <div className="p-4 space-y-4">
            <div>
              <h1 className="text-xl font-semibold mb-1">{product.title}</h1>
              <p className="text-muted-foreground text-sm mb-2">
                {product.brand?.name || 'Unknown Brand'}
              </p>
              <div className="text-lg font-bold text-primary">
                {formatPrice(product.price_cents, product.currency)}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                className="flex-1"
              >
                <Heart className="h-4 w-4 mr-2" />
                Like
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAddToWishlist}
                disabled={wishlistLoading}
                className="flex-1"
              >
                <ShoppingBag className="h-4 w-4 mr-2" />
                Save
              </Button>
            </div>

            {/* Similar Items */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Similar Items</h3>
              <SimilarItemsGrid 
                productId={product.id} 
                onItemClick={handleSimilarItemClick}
              />
            </div>
          </div>
        </div>

        {/* Sticky Bottom CTA for Mobile */}
        {product.external_url && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-border/50">
            <Button 
              onClick={handleVisitBrand}
              className="w-full"
              size="lg"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Visit Brand Site
            </Button>
          </div>
        )}
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block absolute inset-8 max-w-7xl mx-auto rounded-2xl bg-background overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/50 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {currentIndex > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleBack}
                className="p-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <h2 className="text-lg font-semibold truncate">
              {product.brand?.name || 'Product Details'}
            </h2>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleShare}
              className="p-2"
            >
              <Share2 className="h-5 w-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleClose}
              className="p-2"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-2 gap-6 h-[calc(100vh-12rem)] p-6">
          {/* Left: Product Image */}
          <div className="bg-muted rounded-xl overflow-hidden flex items-center justify-center h-full">
            <img
              {...getResponsiveImageProps(
                getPrimaryImageUrl(product),
                "50vw"
              )}
              alt={product.title}
              className="max-w-full max-h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder.svg';
              }}
            />
          </div>

          {/* Right: Product Details */}
          <div className="flex flex-col h-full">
            {/* Product Info */}
            <div className="space-y-4 flex-1 overflow-y-auto">
              <div>
                <h1 className="text-2xl font-semibold mb-2">{product.title}</h1>
                <p className="text-muted-foreground mb-3">
                  {product.brand?.name || 'Unknown Brand'}
                </p>
                <div className="text-2xl font-bold text-primary">
                  {formatPrice(product.price_cents, product.currency)}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  onClick={handleLike}
                  className="flex-1"
                >
                  <Heart className="h-4 w-4 mr-2" />
                  Like
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleAddToWishlist}
                  disabled={wishlistLoading}
                  className="flex-1"
                >
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </div>

              {/* Similar Items */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">Similar Items</h3>
                <SimilarItemsGrid 
                  productId={product.id} 
                  onItemClick={handleSimilarItemClick}
                />
              </div>
            </div>

            {/* Bottom CTA - Always Visible */}
            {product.external_url && (
              <div className="mt-4 pt-4 border-t border-border/50 flex-shrink-0">
                <Button 
                  onClick={handleVisitBrand}
                  className="w-full"
                  size="lg"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Visit Brand Site
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhotoCloseup;