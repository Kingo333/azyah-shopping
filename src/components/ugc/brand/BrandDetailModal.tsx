import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUGCBrand, useBrandReviews, useBrandQuestions, useBrandScamReports } from '@/hooks/useUGCBrand';
import { ReviewCard } from './ReviewCard';
import { QuestionCard } from './QuestionCard';
import { ScamCard } from './ScamCard';
import { Skeleton } from '@/components/ui/skeleton';

interface BrandDetailModalProps {
  brandId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const BrandDetailModal = ({ brandId, open, onOpenChange }: BrandDetailModalProps) => {
  const { data: brand } = useUGCBrand(brandId || undefined);
  const { data: reviews, isLoading: reviewsLoading } = useBrandReviews(brandId || undefined);
  const { data: questions, isLoading: questionsLoading } = useBrandQuestions(brandId || undefined);
  const { data: scams, isLoading: scamsLoading } = useBrandScamReports(brandId || undefined);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {brand?.name}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="reviews" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="questions">Questions</TabsTrigger>
            <TabsTrigger value="scams">Scams</TabsTrigger>
          </TabsList>

          <TabsContent value="reviews" className="flex-1 overflow-auto mt-4 space-y-3">
            {reviewsLoading ? (
              <>
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </>
            ) : reviews && reviews.length > 0 ? (
              reviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No reviews yet. Be the first to share your experience.
              </div>
            )}
          </TabsContent>

          <TabsContent value="questions" className="flex-1 overflow-auto mt-4 space-y-3">
            {questionsLoading ? (
              <>
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </>
            ) : questions && questions.length > 0 ? (
              questions.map((question) => (
                <QuestionCard key={question.id} question={question} />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No questions yet. Be the first to ask.
              </div>
            )}
          </TabsContent>

          <TabsContent value="scams" className="flex-1 overflow-auto mt-4 space-y-3">
            {scamsLoading ? (
              <>
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </>
            ) : scams && scams.length > 0 ? (
              scams.map((scam) => (
                <ScamCard key={scam.id} scam={scam} />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No scam reports for this brand.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
