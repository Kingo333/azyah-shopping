import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, ShoppingCart, Heart, ExternalLink, AlertTriangle, Info } from 'lucide-react';
import { toast } from 'sonner';

interface ProductRecommendationCardProps {
  product: {
    name: string;
    brand?: string;
    finish?: string;
    why_it_matches: string;
    shade_family?: string;
    price_tier?: 'drugstore' | 'mid' | 'premium';
    alt_options?: string[];
    price?: number;
    currency?: string;
    image_url?: string;
    url?: string;
    availability?: 'in_stock' | 'out_of_stock';
    rating?: number;
    review_count?: number;
  };
  skin_profile?: {
    tone_depth: string;
    undertone: string;
    skin_type: string;
  };
}

export const ProductRecommendationCard: React.FC<ProductRecommendationCardProps> = ({ 
  product, 
  skin_profile 
}) => {
  const [isFavorited, setIsFavorited] = useState(false);

  const handleAddToCart = () => {
    toast.success(`Added ${product.name} to wishlist!`);
    // In a real app, this would add to cart/wishlist
  };

  const handleFavorite = () => {
    setIsFavorited(!isFavorited);
    toast.success(isFavorited ? 'Removed from favorites' : 'Added to favorites!');
  };

  const getPriceTierColor = (tier?: string) => {
    switch (tier) {
      case 'drugstore': return 'bg-green-100 text-green-800';
      case 'mid': return 'bg-yellow-100 text-yellow-800';
      case 'premium': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatPrice = (price?: number, currency?: string) => {
    if (!price) return null;
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: currency || 'AED'
    }).format(price);
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex gap-3">
          {/* Product Image */}
          <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
            {product.image_url ? (
              <img 
                src={product.image_url} 
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-muted-foreground text-xs text-center p-1">
                No Image
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate">{product.name}</h4>
                {product.brand && (
                  <p className="text-xs text-muted-foreground">{product.brand}</p>
                )}
              </div>
              
              <div className="flex items-center gap-1 ml-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleFavorite}
                  className="h-8 w-8 p-0"
                >
                  <Heart className={`h-3 w-3 ${isFavorited ? 'fill-red-500 text-red-500' : ''}`} />
                </Button>
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-1 mb-2">
              {product.price_tier && (
                <Badge 
                  variant="secondary" 
                  className={`text-xs ${getPriceTierColor(product.price_tier)}`}
                >
                  {product.price_tier}
                </Badge>
              )}
              {product.finish && (
                <Badge variant="outline" className="text-xs">
                  {product.finish}
                </Badge>
              )}
              {product.availability === 'out_of_stock' && (
                <Badge variant="destructive" className="text-xs">
                  Out of Stock
                </Badge>
              )}
            </div>

            {/* Price and Rating */}
            <div className="flex items-center justify-between mb-2">
              {product.price && (
                <span className="font-medium text-sm">
                  {formatPrice(product.price, product.currency)}
                </span>
              )}
              
              {product.rating && (
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span className="text-xs text-muted-foreground">
                    {product.rating} ({product.review_count || 0})
                  </span>
                </div>
              )}
            </div>

            {/* Why it matches */}
            <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
              {product.why_it_matches}
            </p>

            {/* Shade Information */}
            {product.shade_family && skin_profile && (
              <div className="mb-3 p-2 bg-secondary/20 rounded-md">
                <div className="flex items-center gap-1 mb-1">
                  <Info className="h-3 w-3" />
                  <span className="text-xs font-medium">Shade Match</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  <strong>{product.shade_family}</strong> complements your{' '}
                  <strong>{skin_profile.tone_depth} {skin_profile.undertone}</strong> undertones
                </p>
              </div>
            )}

            {/* Safety Warning */}
            {skin_profile?.skin_type === 'sensitive' && (
              <div className="mb-3 p-2 bg-orange-50 border border-orange-200 rounded-md">
                <div className="flex items-center gap-1 mb-1">
                  <AlertTriangle className="h-3 w-3 text-orange-600" />
                  <span className="text-xs font-medium text-orange-800">Sensitive Skin</span>
                </div>
                <p className="text-xs text-orange-700">
                  Patch test recommended. Check ingredients for potential irritants.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddToCart}
                disabled={product.availability === 'out_of_stock'}
                className="flex-1 h-7 text-xs"
              >
                <Heart className="h-3 w-3 mr-1" />
                Save
              </Button>
              
              {product.url && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => window.open(product.url, '_blank')}
                  className="flex-1 h-7 text-xs"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View
                </Button>
              )}
            </div>

            {/* Alternative Options */}
            {product.alt_options && product.alt_options.length > 0 && (
              <div className="mt-3 pt-2 border-t">
                <p className="text-xs font-medium mb-1">Alternatives:</p>
                <div className="flex flex-wrap gap-1">
                  {product.alt_options.slice(0, 2).map((alt, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {alt}
                    </Badge>
                  ))}
                  {product.alt_options.length > 2 && (
                    <Badge variant="secondary" className="text-xs">
                      +{product.alt_options.length - 2} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};