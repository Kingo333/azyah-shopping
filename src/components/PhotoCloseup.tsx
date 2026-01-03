import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { X, Share2, Heart, ShoppingBag, ExternalLink, ArrowLeft, Ruler, Shirt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useWishlist } from '@/hooks/useWishlist';
import { useAddProductToWardrobe } from '@/hooks/useAddProductToWardrobe';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types';
import SimilarItemsGrid from './SimilarItemsGrid';
import ProductDetailPage from './ProductDetailPage';
import { getProductImageUrls } from '@/utils/imageHelpers';
import { SmartImage } from '@/components/SmartImage';
import { imageUrlFrom, extractSupabasePath } from '@/lib/imageUrl';
import { isSupabaseAbsoluteUrl } from '@/lib/urlGuards';

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
  const [selectedDetailProduct, setSelectedDetailProduct] = useState<Product | null>(null);
  const [showProductDetail, setShowProductDetail] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showSizeChart, setShowSizeChart] = useState(false);
  
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
  const { mutate: addToWardrobe, isPending: wardrobeLoading } = useAddProductToWardrobe();

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

  const handleSimilarItemDetail = (similarProduct: Product) => {
    setSelectedDetailProduct(similarProduct);
    setShowProductDetail(true);
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

  // Get size chart URL from product attributes
  const getSizeChartUrl = () => {
    const attributes = product?.attributes as any;
    const sizeChartUrl = attributes?.size_chart;
    if (!sizeChartUrl) return null;
    
    if (isSupabaseAbsoluteUrl(sizeChartUrl)) {
      const pathData = extractSupabasePath(sizeChartUrl);
      return pathData ? imageUrlFrom(pathData.bucket, pathData.path) : sizeChartUrl;
    }
    
    return sizeChartUrl.includes('/') ? imageUrlFrom(sizeChartUrl.split('/')[0], sizeChartUrl.split('/').slice(1).join('/')) : sizeChartUrl;
  };

  const sizeChartUrl = getSizeChartUrl();

  // Use unified image processing system
  const productImages = getProductImageUrls(product);

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
            <SmartImage
              src={productImages[currentImageIndex] || productImages[0]}
              alt={product.title}
              className="w-full h-full object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            
            {/* Mobile Thumbnails - Bottom Right - TASK 2: Fixed touch handling */}
            {productImages.length > 1 && (
              <div className="absolute bottom-4 right-4 flex gap-2 max-w-[calc(100%-2rem)] overflow-x-auto">
                {productImages.slice(0, 4).map((imageUrl, index) => (
                  <button
                    key={index}
                    type="button"
                    style={{ touchAction: 'manipulation' }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setCurrentImageIndex(index);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex(index);
                    }}
                    className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all hover:scale-105 flex-shrink-0 ${
                      currentImageIndex === index 
                        ? 'border-white shadow-lg' 
                        : 'border-white/50 hover:border-white/80'
                    }`}
                  >
                    <SmartImage
                      src={imageUrl}
                      alt={`${product.title} view ${index + 1}`}
                      className="w-full h-full object-cover pointer-events-none"
                      sizes="48px"
                    />
                  </button>
                ))}
                {productImages.length > 4 && (
                  <div className="w-12 h-12 rounded-lg bg-black/50 border-2 border-white/50 flex items-center justify-center text-xs text-white flex-shrink-0">
                    +{productImages.length - 4}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="p-4 space-y-4">
            <div>
              <h1 className="text-base font-semibold mb-1">{product.title}</h1>
              <p className="text-muted-foreground text-sm mb-2">
                {product.brand?.name || product.retailer?.name || ''}
              </p>
              <div className="text-lg font-bold text-primary">
                {formatPrice(product.price_cents, product.currency)}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                className="flex-1 min-w-[70px]"
              >
                <Heart className="h-4 w-4 mr-1" />
                Like
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAddToWishlist}
                disabled={wishlistLoading}
                className="flex-1 min-w-[70px]"
              >
                <ShoppingBag className="h-4 w-4 mr-1" />
                Save
              </Button>
              {/* Save to Dress Me button - softened styling with explicit feedback */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  console.log('[DressMe] clicked', product?.id, 'user:', !!user);
                  if (!user) {
                    toast({ title: 'Sign in to save to Dress Me', variant: 'destructive' });
                    return;
                  }
                  if (product) addToWardrobe(product);
                }}
                disabled={wardrobeLoading}
                className="flex-1 min-w-[90px] opacity-80 hover:opacity-100"
              >
                <Shirt className="h-4 w-4 mr-1" />
                + Dress Me
              </Button>
              {sizeChartUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSizeChart(true)}
                  className="flex-1 min-w-[70px]"
                >
                  <Ruler className="h-4 w-4 mr-1" />
                  Size
                </Button>
              )}
            </div>

            {/* Similar Items */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Similar Items</h3>
              <SimilarItemsGrid 
                productId={product.id} 
                onItemClick={handleSimilarItemClick}
                onItemDetail={handleSimilarItemDetail}
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
      <div className="hidden md:block absolute inset-4 max-w-6xl mx-auto rounded-2xl bg-background overflow-hidden max-h-[calc(100vh-2rem)]">
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
        <div className="grid grid-cols-2 gap-6 p-6 h-[calc(100vh-10rem)] max-h-screen">{/* Force update */}
          {/* Left: Product Image */}
          <div className="bg-muted rounded-xl overflow-hidden flex items-start justify-center h-full pt-8 relative">
            <SmartImage
              src={productImages[currentImageIndex] || productImages[0]}
              alt={product.title}
              className="max-w-full max-h-[80%] object-contain"
              sizes="50vw"
            />
            
            {/* Thumbnails - TASK 2: Fixed touch handling for desktop */}
            {productImages.length > 1 && (
              <div className="absolute top-4 left-4 flex flex-col gap-2 max-h-[calc(100%-2rem)] overflow-y-auto">
                {productImages.slice(0, 6).map((imageUrl, index) => (
                    <button
                      key={index}
                      type="button"
                      style={{ touchAction: 'manipulation' }}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setCurrentImageIndex(index);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentImageIndex(index);
                      }}
                      className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${
                        currentImageIndex === index 
                          ? 'border-primary shadow-md' 
                          : 'border-border/30 hover:border-border'
                      }`}
                    >
                      <SmartImage
                        src={imageUrl}
                        alt={`${product.title} view ${index + 1}`}
                        className="w-full h-full object-cover pointer-events-none"
                        sizes="48px"
                      />
                    </button>
                ))}
                {productImages.length > 6 && (
                  <div className="w-12 h-12 rounded-lg bg-muted border-2 border-border/30 flex items-center justify-center text-xs text-muted-foreground">
                    +{productImages.length - 6}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Product Details */}
          <div className="flex flex-col h-full">
            {/* Fixed Product Info */}
            <div className="space-y-4 flex-shrink-0">
              <div>
                <h1 className="text-2xl font-semibold mb-2">{product.title}</h1>
                <p className="text-muted-foreground mb-3">
                  {product.brand?.name || product.retailer?.name || ''}
                </p>
                <div className="text-2xl font-bold text-primary">
                  {formatPrice(product.price_cents, product.currency)}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 flex-wrap">
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
                {/* Save to Dress Me button - Desktop with explicit feedback */}
                <Button
                  variant="outline"
                  onClick={() => {
                    console.log('[DressMe] clicked', product?.id, 'user:', !!user);
                    if (!user) {
                      toast({ title: 'Sign in to save to Dress Me', variant: 'destructive' });
                      return;
                    }
                    if (product) addToWardrobe(product);
                  }}
                  disabled={wardrobeLoading}
                  className="flex-1 opacity-80 hover:opacity-100"
                >
                  <Shirt className="h-4 w-4 mr-2" />
                  + Dress Me
                </Button>
                {sizeChartUrl && (
                  <Button
                    variant="ghost"
                    onClick={() => setShowSizeChart(true)}
                    className="flex-1"
                  >
                    <Ruler className="h-4 w-4 mr-2" />
                    Size Chart
                  </Button>
                )}
                {product.external_url && (
                  <Button
                    onClick={handleVisitBrand}
                    variant="default"
                    className="flex-1"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Shop Now
                  </Button>
                )}
              </div>
            </div>

            {/* Scrollable Similar Items */}
            <div className="flex-1 flex flex-col min-h-0 mt-6">
              <h3 className="text-xl font-semibold mb-4 flex-shrink-0">Similar Items</h3>
              <div className="flex-1 overflow-y-auto">
                <SimilarItemsGrid 
                  productId={product.id} 
                  onItemClick={handleSimilarItemClick}
                  onItemDetail={handleSimilarItemDetail}
                />
              </div>
            </div>

            {/* Fixed Bottom CTA */}
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

      {/* Size Chart Modal */}
      {showSizeChart && sizeChartUrl && (
        <Dialog open={showSizeChart} onOpenChange={setShowSizeChart}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Size Chart - {product.title}</DialogTitle>
            </DialogHeader>
            <div className="flex justify-center p-4">
              <SmartImage
                src={sizeChartUrl}
                alt={`Size chart for ${product.title}`}
                className="max-w-full h-auto rounded-lg"
                sizes="(max-width: 768px) 100vw, 80vw"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Product Detail Modal */}
      {showProductDetail && selectedDetailProduct && (
        <div className="fixed inset-0 z-60 bg-background">
          <ProductDetailPage
            product={selectedDetailProduct}
            onBack={() => {
              setShowProductDetail(false);
              setSelectedDetailProduct(null);
            }}
          />
        </div>
      )}
    </div>
  );
};

export default PhotoCloseup;