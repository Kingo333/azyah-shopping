import { Star, ThumbsUp, Flag } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BrandReview } from '@/types/ugcBrand';
import { useVoteContent, useReportContent } from '@/hooks/useUGCBrand';
import { formatDistanceToNow } from 'date-fns';

interface ReviewCardProps {
  review: BrandReview;
}

export const ReviewCard = ({ review }: ReviewCardProps) => {
  const vote = useVoteContent();
  const report = useReportContent();

  const handleHelpful = () => {
    vote.mutate({ contentType: 'review', contentId: review.id, value: 1 });
  };

  const handleReport = () => {
    report.mutate({ contentType: 'review', contentId: review.id });
  };

  return (
    <Card className="p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-4 w-4 ${
                  star <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted'
                }`}
              />
            ))}
          </div>
          <span className="font-semibold">{review.title}</span>
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

      {/* Ratings */}
      {(review.communication_rating || review.fairness_rating) && (
        <div className="flex gap-4 mb-3 text-sm">
          {review.communication_rating && (
            <div>
              <span className="text-muted-foreground">Communication: </span>
              <span className="font-medium">{review.communication_rating}/5</span>
            </div>
          )}
          {review.fairness_rating && (
            <div>
              <span className="text-muted-foreground">Fairness: </span>
              <span className="font-medium">{review.fairness_rating}/5</span>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t text-sm">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-1 h-auto p-1"
            onClick={handleHelpful}
            disabled={vote.isPending}
          >
            <ThumbsUp className="h-4 w-4" />
            <span>Helpful {review.helpful_count > 0 && `(${review.helpful_count})`}</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-1 h-auto p-1"
            onClick={handleReport}
            disabled={report.isPending}
          >
            <Flag className="h-4 w-4" />
            Report
          </Button>
        </div>
        <span className="text-muted-foreground">
          {review.is_anonymous ? 'Anonymous' : review.users?.name || 'Anonymous'} •{' '}
          {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
        </span>
      </div>
    </Card>
  );
};
