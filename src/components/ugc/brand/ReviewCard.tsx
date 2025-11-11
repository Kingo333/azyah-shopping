import { Star, ThumbsUp, ThumbsDown, MessageCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BrandReview } from '@/types/ugcBrand';
import { useVoteContent } from '@/hooks/useUGCBrand';
import { formatDistanceToNow } from 'date-fns';

interface ReviewCardProps {
  review: BrandReview & { 
    ugc_brands?: { name: string; logo_url?: string };
    brand_name?: string;
    brand_logo_url?: string;
  };
  onClick?: () => void;
}

export const ReviewCard = ({ review, onClick }: ReviewCardProps) => {
  const vote = useVoteContent();

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    vote.mutate({ contentType: 'review', contentId: review.id, value: 1 });
  };

  const handleDislike = (e: React.MouseEvent) => {
    e.stopPropagation();
    vote.mutate({ contentType: 'review', contentId: review.id, value: -1 });
  };

  const brandName = review.ugc_brands?.name || review.brand_name;
  const brandLogo = review.ugc_brands?.logo_url || review.brand_logo_url;

  return (
    <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      {/* Header with Overall Rating */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-5 w-5 ${
                  star <= review.rating 
                    ? 'fill-yellow-400 text-yellow-400' 
                    : 'text-muted-foreground stroke-muted-foreground/30'
                } stroke-1`}
              />
            ))}
          </div>
          <span className="font-semibold text-lg">{review.title}</span>
        </div>
      </div>

      {/* Badges */}
      <div className="flex gap-2 flex-wrap mb-3">
        <Badge variant="secondary">{review.work_type}</Badge>
        {review.payout && (
          <Badge variant="outline">
            {review.currency} {review.payout}
          </Badge>
        )}
        {review.time_to_pay_days && (
          <Badge variant="outline">Paid in {review.time_to_pay_days} days</Badge>
        )}
        {review.would_work_again !== null && (
          <Badge variant={review.would_work_again ? 'default' : 'destructive'}>
            {review.would_work_again ? 'Would work again' : 'Would not work again'}
          </Badge>
        )}
      </div>

      {/* Body */}
      {review.body && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-4">{review.body}</p>
      )}

      {/* Secondary Ratings (Payment & Vibe) - Small and subtle */}
      {(review.payment_rating || review.vibe_rating) && (
        <div className="flex gap-4 mb-3 text-xs text-muted-foreground">
          {review.payment_rating && (
            <div>
              <span>Payment: </span>
              <span className="font-medium">{review.payment_rating}/5</span>
            </div>
          )}
          {review.vibe_rating && (
            <div>
              <span>Vibe: </span>
              <span className="font-medium">{review.vibe_rating}/5</span>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t text-sm">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-1 h-auto p-1 hover:text-green-600"
            onClick={handleLike}
            disabled={vote.isPending}
          >
            <ThumbsUp className="h-4 w-4" />
            <span>{review.like_count || 0}</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-1 h-auto p-1 hover:text-red-600"
            onClick={handleDislike}
            disabled={vote.isPending}
          >
            <ThumbsDown className="h-4 w-4" />
            <span>{review.dislike_count || 0}</span>
          </Button>
          <div className="flex items-center gap-1 text-muted-foreground">
            <MessageCircle className="h-4 w-4" />
            <span>{review.comment_count || 0}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {brandLogo && (
            <img src={brandLogo} alt={brandName} className="w-5 h-5 rounded-full object-cover" />
          )}
          <span className="text-muted-foreground text-xs">
            {brandName} • Anonymous Creator • {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
          </span>
        </div>
      </div>
    </Card>
  );
};