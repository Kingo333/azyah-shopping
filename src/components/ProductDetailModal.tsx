
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Heart, 
  Share2, 
  ShoppingBag, 
  Star, 
  ExternalLink,
  Package,
  Truck,
  Shield,
  ArrowLeft,
  ArrowRight,
  X,
  Plus,
  Check
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AddToClosetModal } from '@/components/AddToClosetModal';
import { motion, AnimatePresence } from 'framer-motion';

interface ProductBrand {
  id: string;
  name: string;
  logo_url?: string;
}

interface ProductRetailer {
  id: string;
  name: string;
  logo_url?: string;
}

interface Product {
  id: string;
  title: string;
  description?: string;
  price_cents: number;
  currency: string;
  media_urls: string[];
  external_url?: string;
  brand?: ProductBrand;
  retailer?: ProductRetailer;
  category_slug: string;
  subcategory_slug?: string;
  stock_qty?: number;
  rating?: number;
  review_count?: number;
  created_at: string;
}

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onLike?: (productId: string) => void;
  onAddToWishlist?: (productId: string) => void;
  isLiked?: boolean;
  isInWishlist?: boolean;
}

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isOpen,
  onClose,
  onLike,
  onAddToWishlist,
  isLiked = false,
  isInWishlist = false
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isAddToClosetOpen, setIsAddToClosetOpen] = useState(false);
  const [liked, setLiked] = useState(isLiked);
  const [inWishlist, setInWishlist] = useState(isInWishlist);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLiked(isLiked);
    setInWishlist(isInWishlist);
  }, [isLiked, isInWishlist]);

  useEffect(() => {
    if (isOpen) {
      setCurrentImageIndex(0);
    }
  }, [isOpen, product]);

  if (!product) return null;

  const images = product.media_urls || [];
  const hasMultipleImages = images.length > 1;
  
  const formatPrice = (cents: number, currency: string) => {
    const amount = cents / 100;
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    });
    return formatter.format(amount);
  };

  const handleLike = async () => {
    if (!user) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to like products",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      if (liked) {
        // Unlike
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', product.id);
        
        if (error) throw error;
        setLiked(false);
        onLike?.(product.id);
      } else {
        // Like
        const { error } = await supabase
          .from('likes')
          .insert({
            user_id: user.id,
            product_id: product.id
          });
        
        if (error && error.code !== '23505') throw error; // Ignore duplicate key error
        setLiked(true);
        onLike?.(product.id);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast({
        title: "Error",
        description: "Failed to update like status",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddToWishlist = async () => {
    if (!user) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to add to wishlist",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      if (inWishlist) {
        // Remove from wishlist
        const { error } = await supabase
          .from('wishlist_items')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', product.id);
        
        if (error) throw error;
        setInWishlist(false);
        onAddToWishlist?.(product.id);
        toast({
          title: "Removed from wishlist",
          description: "Product removed from your wishlist"
        });
      } else {
        // Add to wishlist
        const { error } = await supabase
          .from('wishlist_items')
          .insert({
            user_id: user.id,
            product_id: product.id
          });
        
        if (error && error.code !== '23505') throw error; // Ignore duplicate key error
        setInWishlist(true);
        onAddToWishlist?.(product.id);
        toast({
          title: "Added to wishlist",
          description: "Product added to your wishlist"
        });
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      toast({
        title: "Error",
        description: "Failed to update wishlist",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const nextImage = () => {
    if (hasMultipleImages) {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }
  };

  const prevImage = () => {
    if (hasMultipleImages) {
      setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.title,
          text: product.description,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback to copying URL
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied",
        description: "Product link copied to clipboard"
      });
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto p-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            {/* Image Section */}
            <div className="relative bg-gray-50">
              <DialogHeader className="absolute top-4 right-4 z-10">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="bg-white/80 backdrop-blur-sm hover:bg-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              </DialogHeader>
              
              {images.length > 0 ? (
                <div className="relative aspect-square">
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={currentImageIndex}
                      src={images[currentImageIndex]}
                      alt={product.title}
                      className="w-full h-full object-cover"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    />
                  </AnimatePresence>
                  
                  {hasMultipleImages && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={prevImage}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm hover:bg-white"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={nextImage}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm hover:bg-white"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                      
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                        {images.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentImageIndex(index)}
                            className={`w-2 h-2 rounded-full transition-colors ${
                              index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="aspect-square flex items-center justify-center bg-gray-100">
                  <Package className="h-16 w-16 text-gray-400" />
                </div>
              )}
            </div>

            {/* Content Section */}
            <div className="p-6 flex flex-col">
              <div className="flex-1 space-y-6">
                {/* Header */}
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        {product.title}
                      </h1>
                      {(product.brand || product.retailer) && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          {product.brand && (
                            <span>by {product.brand.name}</span>
                          )}
                          {product.retailer && (
                            <span>sold by {product.retailer.name}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">
                        {formatPrice(product.price_cents, product.currency)}
                      </p>
                      {product.rating && (
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm text-gray-600">
                            {product.rating} ({product.review_count || 0})
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {product.stock_qty !== undefined && (
                    <Badge variant={product.stock_qty > 0 ? "default" : "destructive"}>
                      {product.stock_qty > 0 ? `${product.stock_qty} in stock` : 'Out of stock'}
                    </Badge>
                  )}
                </div>

                {/* Description */}
                {product.description && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {product.description}
                    </p>
                  </div>
                )}

                {/* Features */}
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Truck className="h-4 w-4" />
                    <span>Free shipping on orders over $50</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Shield className="h-4 w-4" />
                    <span>30-day return policy</span>
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              {/* Actions */}
              <div className="space-y-4">
                <div className="flex gap-3">
                  <Button
                    onClick={handleLike}
                    variant={liked ? "default" : "outline"}
                    size="sm"
                    disabled={loading}
                    className="flex-1"
                  >
                    <Heart className={`h-4 w-4 mr-2 ${liked ? 'fill-current' : ''}`} />
                    {liked ? 'Liked' : 'Like'}
                  </Button>
                  <Button
                    onClick={handleAddToWishlist}
                    variant={inWishlist ? "default" : "outline"}
                    size="sm"
                    disabled={loading}
                    className="flex-1"
                  >
                    {inWishlist ? (
                      <Check className="h-4 w-4 mr-2" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    {inWishlist ? 'In Wishlist' : 'Wishlist'}
                  </Button>
                  <Button
                    onClick={handleShare}
                    variant="outline"
                    size="sm"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => setIsAddToClosetOpen(true)}
                    variant="outline"
                    className="flex-1"
                    disabled={!user}
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Add to Closet
                  </Button>
                  {product.external_url && (
                    <Button
                      onClick={() => window.open(product.external_url, '_blank')}
                      variant="default"
                      className="flex-1"
                    >
                      <ShoppingBag className="h-4 w-4 mr-2" />
                      Shop Now
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AddToClosetModal
        isOpen={isAddToClosetOpen}
        onClose={() => setIsAddToClosetOpen(false)}
        productId={product.id}
      />
    </>
  );
};

export default ProductDetailModal;
