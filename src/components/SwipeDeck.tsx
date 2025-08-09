import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { 
  Heart, 
  X, 
  RotateCcw, 
  Sparkles, 
  ShoppingBag,
  TrendingUp,
  Users,
  Star,
  ExternalLink,
  Camera
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import ProductDetailModal from '@/components/ProductDetailModal';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types';
import { useNavigate } from 'react-router-dom';

interface SwipeDeckProps {
  filter: string;
  subcategory: string;
  priceRange: { min: number; max: number };
  searchQuery: string;
}

const cardVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  exit: (x: number) => ({
    x: x,
    opacity: 0,
    transition: { duration: 0.5 },
  }),
};

const DISTANCE_THRESHOLD = 100;

const SwipeDeck: React.FC<SwipeDeckProps> = ({ filter, subcategory, priceRange, searchQuery }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [index, setIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-45, 0, 45]);
  const opacity = useTransform(x, [-200, 0, 200], [0, 1, 0]);
  const scale = useTransform(x, [-200, 0, 200], [0.8, 1, 0.8]);

  const cardRef = useRef<HTMLDivElement>(null);

  const fetchProducts = useCallback(async () => {
    try {
      let query = supabase
        .from('products')
        .select(`
          id,
          title,
          price_cents,
          currency,
          media_urls,
          external_url,
          ar_mesh_url,
          brand:brands!inner(name),
          attributes
        `)
        .eq('status', 'active');

      if (filter !== 'all') {
        query = query.eq('category', filter);
      }

      if (subcategory) {
        query = query.eq('subcategory', subcategory);
      }

      if (priceRange.min > 0) {
        query = query.gte('price_cents', priceRange.min * 100);
      }

      if (priceRange.max < 1000) {
        query = query.lte('price_cents', priceRange.max * 100);
      }

      if (searchQuery) {
        query = query.ilike('title', `%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      setProducts(data || []);
      setIndex(0); // Reset index when products change
    } catch (error: any) {
      console.error("Error fetching products:", error.message);
      toast({
        title: "Error",
        description: "Failed to fetch products. Please try again.",
        variant: "destructive",
      });
    }
  }, [filter, subcategory, priceRange, searchQuery, toast]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleLike = async (product: Product) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "You must be signed in to like products.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('likes')
        .insert([{ user_id: user.id, product_id: product.id }]);

      if (error) throw error;

      toast({
        description: `${product.title} added to your likes!`,
      });
      nextCard();
    } catch (error: any) {
      console.error("Error liking product:", error.message);
      toast({
        title: "Error",
        description: "Failed to like product. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDislike = () => {
    nextCard();
  };

  const nextCard = () => {
    x.set(0);
    setIndex((prevIndex) => Math.min(prevIndex + 1, products.length - 1));
  };

  const prevCard = () => {
    x.set(0);
    setIndex((prevIndex) => Math.max(prevIndex - 1, 0));
  };

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleSwipeEnd = useCallback((event: any, info: PanInfo) => {
    if (info.offset.x > DISTANCE_THRESHOLD) {
      handleLike(products[index]);
    } else if (info.offset.x < -DISTANCE_THRESHOLD) {
      handleDislike();
    } else {
      x.set(0); // Reset position if not swiped far enough
    }
  }, [x, index, products, handleLike, handleDislike]);

  const currentProduct = useMemo(() => products[index], [products, index]);

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4">
        <Search className="h-10 w-10 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">No products found matching your criteria.</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <AnimatePresence initial={false} custom={x.get()}>
        {currentProduct && (
          <motion.div
            key={currentProduct.id}
            ref={cardRef}
            className="absolute top-0 left-0 w-full h-full"
            style={{ x, rotate, opacity, scale, touchAction: 'pan-y' }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.8}
            onDrag={(event, info) => {}}
            onDragEnd={handleSwipeEnd}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            custom={x.get()}
          >
            <Card className="h-full flex flex-col cursor-grab active:cursor-grabbing" onClick={() => handleProductClick(currentProduct)}>
              <CardContent className="p-4 flex flex-col h-full">
                <div className="relative aspect-square w-full mb-4">
                  <img
                    src={currentProduct.media_urls?.[0] || '/placeholder.svg'}
                    alt={currentProduct.title}
                    className="object-cover rounded-md w-full h-full"
                    style={{ imageRendering: 'high-quality' }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder.svg';
                    }}
                  />
                </div>
                <div className="flex flex-col flex-grow">
                  <h3 className="text-lg font-semibold line-clamp-2">{currentProduct.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-1">{currentProduct.brand?.name}</p>
                  <div className="mt-auto flex items-end justify-between">
                    <span className="text-xl font-bold">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: currentProduct.currency || 'USD',
                      }).format(currentProduct.price_cents / 100)}
                    </span>
                    {currentProduct.ar_mesh_url && (
                      <Badge variant="outline" className="gap-1">
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
      {products.length > 0 && index < products.length && (
        <div className="absolute bottom-4 left-0 w-full flex justify-center gap-4">
          <Button variant="secondary" size="icon" onClick={prevCard} disabled={index === 0}>
            <RotateCcw className="h-5 w-5" />
          </Button>
          <Button variant="destructive" size="icon" onClick={handleDislike}>
            <X className="h-5 w-5" />
          </Button>
          <Button variant="primary" size="icon" onClick={() => handleLike(products[index])}>
            <Heart className="h-5 w-5" />
          </Button>
        </div>
      )}

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
