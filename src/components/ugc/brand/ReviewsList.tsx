import { useState } from 'react';
import { useAllReviews } from '@/hooks/useUGCBrand';
import { ReviewCard } from './ReviewCard';
import { Button } from '@/components/ui/button';
import { PenSquare } from 'lucide-react';
import { ReviewFormModal } from './ReviewFormModal';
import { Skeleton } from '@/components/ui/skeleton';
import { ContentThreadModal } from './ContentThreadModal';

export const ReviewsList = () => {
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  
  const { data: reviews, isLoading } = useAllReviews();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Reviews</h2>
          <Button onClick={() => setShowReviewForm(true)} className="gap-2">
            <PenSquare className="h-4 w-4" />
            Write Review
          </Button>
        </div>

        {reviews && reviews.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No reviews yet. Be the first to share your experience!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews?.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                onClick={() => setSelectedReviewId(review.id)}
              />
            ))}
          </div>
        )}
      </div>

      <ReviewFormModal
        open={showReviewForm}
        onOpenChange={setShowReviewForm}
      />

      <ContentThreadModal
        contentType="review"
        contentId={selectedReviewId}
        open={!!selectedReviewId}
        onOpenChange={(open) => !open && setSelectedReviewId(null)}
      />
    </>
  );
};
