
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { 
  Heart, 
  ExternalLink, 
  ShoppingCart, 
  Share2,
  Package,
  Truck,
  Shield,
  Star,
  MapPin,
  Globe,
  Mail,
  Plus
} from 'lucide-react';
import { Product } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import AddToClosetModal from '@/components/AddToClosetModal';

interface ProductDetailModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
}

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ product, isOpen, onClose }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isAddToClosetOpen, setIsAddToClosetOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (product && user) {
      checkIfLiked();
      fetchLikeCount();
    }
  }, [product, user]);

  const checkIfLiked = async () => {
    if (!user || !product) return;
    
    try {
      const { data, error } = await supabase
        .from('likes')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .single();

      setIsLiked(!!data);
    } catch (error) {
      // Not liked
      setIsLiked(false);
    }
  };

  const fetchLikeCount = async () => {
    if (!product) return;
    
    try {
      const { count, error } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('product_id', product.id);

      if (error) throw error;
      setLikeCount(count || 0);
    } catch (error) {
      console.error('Error fetching like count:', error);
    }
  };

  const handleLike = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "You must be signed in to like products.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (isLiked) {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', product.id);

        if (error) throw error;
        
        setIsLiked(false);
        setLikeCount(prev => Math.max(0, prev - 1));
        toast({ description: "Removed from likes" });
      } else {
        const { error } = await supabase
          .from('likes')
          .insert([{ user_id: user.id, product_id: product.id }]);

        if (error) throw error;
        
        setIsLiked(true);
        setLikeCount(prev => prev + 1);
        toast({ description: "Added to likes!" });
      }
    } catch (error: any) {
      console.error('Error toggling like:', error);
      toast({
        title: "Error",
        description: "Failed to update like status.",
        variant: "destructive",
      });
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.title,
          text: `Check out this amazing product: ${product.title}`,
          url: window.location.href
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast({ description: "Link copied to clipboard!" });
    }
  };

  const formatPrice = (cents: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(cents / 100);
  };

  if (!product) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="sr-only">Product Details</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Product Images */}
            <div className="space-y-4">
              {product.media_urls && product.media_urls.length > 1 ? (
                <Carousel className="w-full">
                  <CarouselContent>
                    {product.media_urls.map((url, index) => (
                      <CarouselItem key={index}>
                        <div className="aspect-square">
                          <img
                            src={url || '/placeholder.svg'}
                            alt={`${product.title} - Image ${index + 1}`}
                            className="w-full h-full object-cover rounded-lg"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/placeholder.svg';
                            }}
                          />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious />
                  <CarouselNext />
                </Carousel>
              ) : (
                <div className="aspect-square">
                  <img
                    src={product.media_urls?.[0] || '/placeholder.svg'}
                    alt={product.title}
                    className="w-full h-full object-cover rounded-lg"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder.svg';
                    }}
                  />
                </div>
              )}
            </div>

            {/* Product Information */}
            <div className="space-y-6">
              {/* Brand & Title */}
              <div>
                {product.brand && (
                  <div className="flex items-center gap-2 mb-2">
                    {product.brand.logo_url && (
                      <img
                        src={product.brand.logo_url}
                        alt={product.brand.name}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                    )}
                    <span className="text-sm font-medium text-gray-600">{product.brand.name}</span>
                  </div>
                )}
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{product.title}</h1>
                
                {/* Price */}
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-bold text-gray-900">
                    {formatPrice(product.price_cents, product.currency)}
                  </span>
                  {product.compare_at_price_cents && product.compare_at_price_cents > product.price_cents && (
                    <span className="text-lg text-gray-500 line-through">
                      {formatPrice(product.compare_at_price_cents, product.currency)}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={handleLike}
                  variant={isLiked ? "default" : "outline"}
                  className="flex-1 gap-2"
                >
                  <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                  {isLiked ? 'Liked' : 'Like'} ({likeCount})
                </Button>
                
                <Button
                  onClick={() => setIsAddToClosetOpen(true)}
                  variant="outline"
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add to Closet
                </Button>
                
                <Button onClick={handleShare} variant="outline" size="icon">
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>

              {/* External Link */}
              {product.external_url && (
                <Button asChild className="w-full gap-2">
                  <a href={product.external_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    View on Store
                  </a>
                </Button>
              )}

              {/* Description */}
              {product.description && (
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-gray-700 leading-relaxed">{product.description}</p>
                </div>
              )}

              {/* Product Details */}
              <div className="space-y-4">
                <h3 className="font-semibold">Product Details</h3>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-gray-500" />
                    <span>SKU: {product.sku}</span>
                  </div>
                  
                  {product.stock_qty !== undefined && (
                    <div className="flex items-center gap-2">
                      <Badge variant={product.stock_qty > 5 ? "default" : "destructive"}>
                        {product.stock_qty > 0 ? `${product.stock_qty} in stock` : 'Out of stock'}
                      </Badge>
                    </div>
                  )}
                  
                  {product.weight_grams && (
                    <div className="flex items-center gap-2">
                      <span>Weight: {product.weight_grams}g</span>
                    </div>
                  )}
                </div>

                {/* Categories */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{product.category_slug}</Badge>
                  {product.subcategory_slug && (
                    <Badge variant="outline">{product.subcategory_slug}</Badge>
                  )}
                </div>

                {/* Tags */}
                {product.tags && product.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {product.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Brand Information */}
              {product.brand && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {product.brand.logo_url && (
                        <img
                          src={product.brand.logo_url}
                          alt={product.brand.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <h4 className="font-semibold">{product.brand.name}</h4>
                        {product.brand.bio && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{product.brand.bio}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          {product.brand.website && (
                            <a 
                              href={product.brand.website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 hover:text-gray-700"
                            >
                              <Globe className="h-3 w-3" />
                              Website
                            </a>
                          )}
                          {product.brand.contact_email && (
                            <a 
                              href={`mailto:${product.brand.contact_email}`}
                              className="flex items-center gap-1 hover:text-gray-700"
                            >
                              <Mail className="h-3 w-3" />
                              Contact
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Additional Info */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="flex flex-col items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <Truck className="h-5 w-5 text-gray-600" />
                  <span className="text-xs text-gray-600">Free Shipping</span>
                </div>
                <div className="flex flex-col items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <Shield className="h-5 w-5 text-gray-600" />
                  <span className="text-xs text-gray-600">Secure Payment</span>
                </div>
                <div className="flex flex-col items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <Star className="h-5 w-5 text-gray-600" />
                  <span className="text-xs text-gray-600">Quality Guaranteed</span>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AddToClosetModal
        isOpen={isAddToClosetOpen}
        onClose={() => setIsAddToClosetOpen(false)}
        product={product}
      />
    </>
  );
};

export default ProductDetailModal;
