
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, X, Bookmark } from 'lucide-react';
import { Product } from '@/types';
import { SmartImage } from '@/components/SmartImage';
import { getPrimaryImageUrl } from '@/utils/imageHelpers';
import { getBrandDisplayName } from '@/utils/brandHelpers';

interface MiniCardProps {
  product: Product;
  swipeAction: 'left' | 'right' | 'up';
  onClick: () => void;
}

const MiniCard: React.FC<MiniCardProps> = ({ product, swipeAction, onClick }) => {
  const formatPrice = (cents: number, currency: string = 'USD') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);

  const getSwipeIcon = () => {
    switch (swipeAction) {
      case 'right':
        return <Heart className="h-3 w-3 text-green-500" />;
      case 'left':
        return <X className="h-3 w-3 text-red-500" />;
      case 'up':
        return <Bookmark className="h-3 w-3 text-cartier-600" />;
      default:
        return null;
    }
  };

  const getSwipeLabel = () => {
    switch (swipeAction) {
      case 'right':
        return 'Loved';
      case 'left':
        return 'Passed';
      case 'up':
        return 'Wishlisted';
      default:
        return '';
    }
  };

  return (
    <Card 
      className="w-20 h-30 cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-md rounded-lg overflow-hidden bg-card"
      onClick={onClick}
    >
      <div className="relative h-16 w-full">
        <SmartImage 
          src={getPrimaryImageUrl(product)} 
          alt={product.title}
          className="w-full h-full object-cover"
          sizes="(max-width: 768px) 25vw, 20vw"
        />
        <div className="absolute top-1 right-1">
          <Badge variant="secondary" className="h-5 px-1 text-xs flex items-center gap-1">
            {getSwipeIcon()}
          </Badge>
        </div>
      </div>
      <CardContent className="p-2 h-14 flex flex-col justify-between">
        <div className="flex-1 min-h-0">
          <h4 className="text-xs font-medium line-clamp-1 mb-1">{product.title}</h4>
          <p className="text-xs text-muted-foreground line-clamp-1">{getBrandDisplayName(product)}</p>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs font-semibold text-cartier-600">
            {formatPrice(product.price_cents, product.currency)}
          </span>
          <span className="text-xs text-muted-foreground">{getSwipeLabel()}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default MiniCard;
