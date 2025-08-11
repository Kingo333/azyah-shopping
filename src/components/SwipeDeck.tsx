import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform, useAnimationControls } from 'framer-motion';
import { Heart, X, RotateCcw, Sparkles, ShoppingBag, TrendingUp, Users, Star, ExternalLink, Camera, Search, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useWishlist } from '@/hooks/useWishlist';
import ProductDetailModal from '@/components/ProductDetailModal';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types';
import { useNavigate } from 'react-router-dom';
import { TopCategory, SubCategory } from '@/lib/categories';
import { convertJsonToProductAttributes } from '@/lib/type-utils';

interface SwipeDeckProps {
  filter: string;
  subcategory: string;
  priceRange: {
    min: number;
    max: number;
  };
  searchQuery: string;
  currency?: string;
}

const cardVariants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
    y: 50
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1] // easeOut bezier curve
    }
  },
  exit: (direction: number) => ({
    x: direction > 0 ? 300 : direction < 0 ? -300 : 0,
    y: direction === 2 ? -300 : 0,
    opacity: 0,
    scale: 0.8,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.6, 1] // easeInOut bezier curve
    }
  })
};

// Improved thresholds for better responsiveness
const SWIPE_THRESHOLD = 100;
const VELOCITY_THRESHOLD = 500;
const VERTICAL_THRESHOLD = 80;

const SwipeDeck: React.FC<SwipeDeckProps> = ({
  filter,
  subcategory,
  priceRange,
  searchQuery,
  currency = 'USD'
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [index, setIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [imageAspectRatio, setImageAspectRatio] = useState<number>(1);
  const [exitDirection, setExitDirection] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Motion values for smooth dragging
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-20, 0, 20]);
  const opacity = useTransform(x, [-150, -75, 0, 75, 150], [0.5, 0.8, 1, 0.8, 0.5]);
  
  // Animation controls for programmatic swipes
  const controls = useAnimationControls();
  
  const cardRef = useRef<HTMLDivElement>(null);

  const currentProduct = useMemo(() => products[index], [products, index]);
  const { addToWishlist, isLoading: wishlistLoading } = useWishlist(currentProduct?.id);

  // Calculate image height based on aspect ratio with better mobile optimization
  const getImageHeight = useCallback((aspectRatio: number) => {
    const isMobile = window.innerWidth < 640;
    
    if (isMobile) {
      const maxHeight = window.innerHeight * 0.65;
      const minHeight = 250;
      const calculatedHeight = 350 / aspectRatio;
      
      return Math.max(minHeight, Math.min(maxHeight, calculatedHeight));
    } else {
      const maxHeight = window.innerHeight * 0.7;
      const minHeight = 200;
      const calculatedHeight = 400 / aspectRatio;
      
      if (aspectRatio < 0.6) {
        return Math.max(minHeight, Math.min(window.innerHeight * 0.8, calculatedHeight));
      }
      
      return Math.max(minHeight, Math.min(maxHeight, calculatedHeight));
    }
  }, []);

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const ratio = img.naturalWidth / img.naturalHeight;
    setImageAspectRatio(ratio);
  }, []);

  // Improved card transition function
  const nextCard = useCallback(async (direction: number = 0) => {
    if (isAnimating || index >= products.length - 1) return;
    
    setIsAnimating(true);
    setExitDirection(direction);
    
    // Animate the exit
    await controls.start({
      x: direction > 0 ? 300 : direction < 0 ? -300 : 0,
      y: direction === 2 ? -300 : 0,
      opacity: 0,
      scale: 0.8,
      transition: { duration: 0.3 }
    });
    
    // Move to next card and reset
    setIndex(prevIndex => prevIndex + 1);
    
    // Reset motion values
    x.set(0);
    y.set(0);
    controls.set({ x: 0, y: 0, opacity: 1, scale: 1 });
    
    setIsAnimating(false);
  }, [index, products.length, isAnimating, controls, x, y]);

  const prevCard = useCallback(() => {
    if (index <= 0) return;
    
    x.set(0);
    y.set(0);
    controls.set({ x: 0, y: 0, opacity: 1, scale: 1 });
    setIndex(prevIndex => prevIndex - 1);
  }, [index, x, y, controls]);

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
      await nextCard(1);
    } catch (error: any) {
      console.error("Error liking product:", error.message);
      toast({
        title: "Error",
        description: "Failed to like product. Please try again.",
        variant: "destructive"
      });
    }
  }, [user, toast, nextCard]);

  const handleDislike = useCallback(async () => {
    await nextCard(-1);
  }, [nextCard]);

  const handleAddToWishlist = useCallback(async (product: Product) => {
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
      await nextCard(2);
    } catch (error: any) {
      console.error("Error adding to wishlist:", error.message);
      
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
      await nextCard(2);
    }
  }, [user, addToWishlist, toast, nextCard]);

  // Improved swipe detection with better thresholds
  const handleDragEnd = useCallback(async (event: any, info: PanInfo) => {
    if (isAnimating || !currentProduct) return;

    const { offset, velocity } = info;
    const { x: offsetX, y: offsetY } = offset;
    const { x: velocityX, y: velocityY } = velocity;

    // Calculate effective movement considering velocity
    const effectiveX = offsetX + (velocityX * 0.2);
    const effectiveY = offsetY + (velocityY * 0.2);

    // Determine swipe direction with improved logic
    const absX = Math.abs(effectiveX);
    const absY = Math.abs(effectiveY);
    const hasStrongVelocity = Math.abs(velocityX) > VELOCITY_THRESHOLD || Math.abs(velocityY) > VELOCITY_THRESHOLD;

    // Vertical swipe (up for wishlist)
    if ((effectiveY < -VERTICAL_THRESHOLD || (hasStrongVelocity && velocityY < -VELOCITY_THRESHOLD)) && absY > absX) {
      await handleAddToWishlist(currentProduct);
    }
    // Horizontal swipes
    else if (effectiveX > SWIPE_THRESHOLD || (hasStrongVelocity && velocityX > VELOCITY_THRESHOLD)) {
      await handleLike(currentProduct);
    }
    else if (effectiveX < -SWIPE_THRESHOLD || (hasStrongVelocity && velocityX < -VELOCITY_THRESHOLD)) {
      await handleDislike();
    }
    else {
      // Snap back to center
      controls.start({
        x: 0,
        y: 0,
        transition: { type: "spring", stiffness: 500, damping: 30 }
      });
    }
  }, [isAnimating, currentProduct, handleLike, handleDislike, handleAddToWishlist, controls]);

  const fetchProducts = useCallback(async () => {
    try {
      let query = supabase.from('products').select(`
          id,
          title,
          price_cents,
          currency,
          media_urls,
          external_url,
          ar_mesh_url,
          brand_id,
          sku,
          category_slug,
          subcategory_slug,
          status,
          stock_qty,
          min_stock_alert,
          created_at,
          updated_at,
          description,
          compare_at_price_cents,
          weight_grams,
          dimensions,
          tags,
          seo_title,
          seo_description,
          retailer_id,
          brand:brands!inner(
            id, 
            name, 
            slug, 
            logo_url, 
            bio, 
            website, 
            owner_user_id, 
            created_at, 
            updated_at, 
            socials, 
            contact_email, 
            shipping_regions, 
            cover_image_url
          ),
          attributes
        `).eq('status', 'active');

      // Apply subcategory filter first (more specific)
      if (subcategory && subcategory !== '') {
        query = query.eq('subcategory_slug', subcategory as any);
      }
      // Apply category filter only if no subcategory
      else if (filter && filter !== 'all') {
        // Map new "bags" category to "accessories" for database compatibility
        const dbCategory = filter === 'bags' ? 'accessories' : filter;
        query = query.eq('category_slug', dbCategory as any);

        // If bags category is selected, filter by bag subcategories
        if (filter === 'bags') {
          query = query.in('subcategory_slug', ['handbags', 'clutches', 'totes', 'backpacks', 'wallets']);
        }
      }

      // Apply currency filter
      if (currency && currency !== 'USD') {
        query = query.eq('currency', currency);
      }

      // Apply price range filter
      if (priceRange.min > 0) {
        query = query.gte('price_cents', priceRange.min * 100);
      }
      if (priceRange.max < 1000) {
        query = query.lte('price_cents', priceRange.max * 100);
      }

      // Apply search query
      if (searchQuery && searchQuery.trim() !== '') {
        query = query.ilike('title', `%${searchQuery.trim()}%`);
      }

      // Order by created_at for consistent results
      query = query.order('created_at', {
        ascending: false
      });
      const {
        data,
        error
      } = await query;
      if (error) throw error;

      // Transform the data to match Product type with proper type conversions
      const transformedProducts: Product[] = (data || []).map(item => ({
        id: item.id,
        title: item.title,
        description: item.description,
        price_cents: item.price_cents,
        compare_at_price_cents: item.compare_at_price_cents,
        currency: item.currency || 'USD',
        media_urls: Array.isArray(item.media_urls) ? item.media_urls as string[] : [],
        external_url: item.external_url,
        ar_mesh_url: item.ar_mesh_url,
        brand_id: item.brand_id || '',
        retailer_id: item.retailer_id,
        sku: item.sku,
        category_slug: item.category_slug,
        subcategory_slug: item.subcategory_slug,
        status: item.status,
        stock_qty: item.stock_qty || 0,
        min_stock_alert: item.min_stock_alert || 5,
        weight_grams: item.weight_grams,
        dimensions: item.dimensions && typeof item.dimensions === 'object' && item.dimensions !== null ? item.dimensions as Record<string, number> : undefined,
        tags: item.tags,
        seo_title: item.seo_title,
        seo_description: item.seo_description,
        created_at: item.created_at,
        updated_at: item.updated_at,
        brand: item.brand ? {
          id: item.brand.id,
          name: item.brand.name,
          slug: item.brand.slug,
          logo_url: item.brand.logo_url,
          cover_image_url: item.brand.cover_image_url,
          bio: item.brand.bio,
          socials: item.brand.socials && typeof item.brand.socials === 'object' && item.brand.socials !== null ? item.brand.socials as Record<string, string> : {},
          website: item.brand.website,
          contact_email: item.brand.contact_email,
          shipping_regions: item.brand.shipping_regions,
          owner_user_id: item.brand.owner_user_id,
          created_at: item.brand.created_at,
          updated_at: item.brand.updated_at
        } : undefined,
        attributes: convertJsonToProductAttributes(item.attributes)
      }));
      console.log('Fetched products with filters:', {
        filter,
        subcategory,
        priceRange,
        searchQuery,
        count: transformedProducts.length
      });
      setProducts(transformedProducts);
      setIndex(0);
      x.set(0);
      y.set(0);
      controls.set({ x: 0, y: 0, opacity: 1, scale: 1 });
    } catch (error: any) {
      console.error("Error fetching products:", error.message);
      toast({
        title: "Error",
        description: "Failed to fetch products. Please try again.",
        variant: "destructive"
      });
    }
  }, [filter, subcategory, priceRange, searchQuery, currency, toast, x, y, controls]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4">
        <Search className="h-10 w-10 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">No products found matching your criteria.</p>
        <Button variant="outline" onClick={() => {
          window.location.reload();
        }}>
          Reset Filters
        </Button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full" style={{ touchAction: 'none' }}>
      <AnimatePresence mode="wait">
        {currentProduct && (
          <motion.div
            key={`${currentProduct.id}-${index}`}
            ref={cardRef}
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
            style={{ x, y, rotate, opacity }}
            animate={controls}
            drag
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            dragElastic={0.1}
            dragTransition={{ bounceStiffness: 600, bounceDamping: 25 }}
            onDragEnd={handleDragEnd}
            variants={cardVariants}
            initial="hidden"
            exit="exit"
            custom={exitDirection}
            whileDrag={{ 
              scale: 1.05,
              zIndex: 20
            }}
          >
            <Card className="h-full flex flex-col overflow-hidden shadow-lg">
              <CardContent className="p-3 sm:p-4 flex flex-col h-full overflow-hidden">
                <div 
                  className="relative w-full mb-3 sm:mb-4 overflow-hidden rounded-md flex-shrink-0"
                  style={{
                    height: `${getImageHeight(imageAspectRatio)}px`
                  }}
                >
                  <img
                    src={currentProduct.media_urls?.[0] || '/placeholder.svg'}
                    alt={currentProduct.title}
                    className="object-cover w-full h-full"
                    onLoad={handleImageLoad}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder.svg';
                    }}
                  />
                </div>
                <div className="flex flex-col flex-grow">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 flex-1">
                      <h3 className="text-base sm:text-lg font-semibold line-clamp-2">{currentProduct.title}</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleProductClick(currentProduct);
                        }}
                        className="flex-shrink-0 h-7 sm:h-7 px-2 sm:px-2 text-xs hover:bg-accent"
                      >
                        <Info className="h-3 w-3 mr-1" />
                        <span className="hidden sm:inline">Details</span>
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm sm:text-sm text-muted-foreground line-clamp-1 mb-2">{currentProduct.brand?.name}</p>
                  <div className="flex items-center justify-between mb-auto">
                    <span className="text-xl sm:text-xl font-bold">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: currentProduct.currency || 'USD'
                      }).format(currentProduct.price_cents / 100)}
                    </span>
                    {currentProduct.ar_mesh_url && (
                      <Badge variant="outline" className="gap-1 text-xs">
                        <Sparkles className="h-3 w-3" />
                        AR Ready
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* No More Products */}
      {index >= products.length && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          <h2 className="text-2xl font-bold text-muted-foreground mb-2">No More Products</h2>
          <p className="text-muted-foreground">You've seen all the products for now.</p>
        </div>
      )}

      {/* Action Buttons */}
      {products.length > 0 && index < products.length && currentProduct && (
        <div className="absolute bottom-4 right-6 flex flex-col gap-4">
          <Button 
            variant="destructive" 
            size="icon" 
            onClick={() => handleDislike()}
            disabled={isAnimating}
            className="h-12 w-12 rounded-full shadow-lg"
          >
            <X className="h-6 w-6" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => handleAddToWishlist(currentProduct)}
            disabled={wishlistLoading || isAnimating}
            className="h-12 w-12 rounded-full shadow-lg bg-background"
          >
            <ShoppingBag className="h-6 w-6" />
          </Button>
          <Button 
            variant="default" 
            size="icon" 
            onClick={() => handleLike(currentProduct)}
            disabled={isAnimating}
            className="h-12 w-12 rounded-full shadow-lg"
          >
            <Heart className="h-6 w-6" />
          </Button>
        </div>
      )}

      {/* Swipe Instructions */}
      <div className="absolute top-4 left-4 right-4 z-10">
        <div className="bg-black/50 text-white text-xs p-2 rounded-lg text-center">
          Swipe ← to pass • Swipe → to like • Swipe ↑ to add to wishlist
        </div>
      </div>

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct!}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedProduct(null);
        }}
      />
    </div>
  );
};

export default SwipeDeck;
