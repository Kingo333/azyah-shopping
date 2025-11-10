import { Star, Globe, Instagram, CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UGCBrandStats } from '@/types/ugcBrand';

interface BrandCardProps {
  brand: UGCBrandStats;
  onClick: () => void;
}

export const BrandCard = ({ brand, onClick }: BrandCardProps) => {
  return (
    <Card 
      className="p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="flex gap-3">
        {/* Logo */}
        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
          {brand.logo_url ? (
            <img src={brand.logo_url} alt={brand.name} className="w-full h-full object-cover rounded-lg" />
          ) : (
            <span className="text-lg font-semibold text-muted-foreground">
              {brand.name.charAt(0)}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="font-semibold truncate">{brand.name}</h3>
              {brand.is_verified && (
                <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-medium">{brand.avg_rating.toFixed(1)}</span>
            </div>
          </div>

          {/* Links */}
          <div className="flex gap-3 mb-3">
            {brand.website_url && (
              <a 
                href={brand.website_url} 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Globe className="h-4 w-4" />
              </a>
            )}
            {brand.instagram_handle && (
              <a 
                href={`https://instagram.com/${brand.instagram_handle.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Instagram className="h-4 w-4" />
              </a>
            )}
          </div>

          {/* Stats */}
          <div className="flex gap-2 flex-wrap">
            {brand.reviews_count > 0 && (
              <Badge variant="secondary">{brand.reviews_count} Reviews</Badge>
            )}
            {brand.questions_count > 0 && (
              <Badge variant="secondary">{brand.questions_count} Questions</Badge>
            )}
            {brand.scams_count > 0 && (
              <Badge variant="destructive">{brand.scams_count} Scams</Badge>
            )}
            {brand.category && (
              <Badge variant="outline">{brand.category}</Badge>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
