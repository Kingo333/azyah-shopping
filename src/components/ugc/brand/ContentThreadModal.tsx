import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useContentDetail, useContentComments } from '@/hooks/useUGCBrand';
import { ReviewCard } from './ReviewCard';
import { QuestionCard } from './QuestionCard';
import { ScamCard } from './ScamCard';
import { CommentInput } from './CommentInput';
import { CommentCard } from './CommentCard';
import { Skeleton } from '@/components/ui/skeleton';
import { ContentType } from '@/types/ugcBrand';

interface ContentThreadModalProps {
  contentType: ContentType;
  contentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ContentThreadModal = ({ contentType, contentId, open, onOpenChange }: ContentThreadModalProps) => {
  const { data: content, isLoading: contentLoading } = useContentDetail(contentType, contentId);
  const { data: comments, isLoading: commentsLoading } = useContentComments(contentType, contentId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {contentType === 'review' && 'Review Thread'}
            {contentType === 'question' && 'Question Thread'}
            {contentType === 'scam' && 'Scam Report Thread'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Main Content */}
          {contentLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : content ? (
            <div>
              {contentType === 'review' && <ReviewCard review={content as any} />}
              {contentType === 'question' && <QuestionCard question={content as any} />}
              {contentType === 'scam' && <ScamCard scam={content as any} />}
            </div>
          ) : null}

          {/* Comment Input */}
          {contentId && (
            <CommentInput contentType={contentType} contentId={contentId} />
          )}

          {/* Comments */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground">
              Comments ({comments?.length || 0})
            </h3>
            
            {commentsLoading ? (
              <>
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </>
            ) : comments && comments.length > 0 ? (
              comments.map((comment) => (
                <CommentCard key={comment.id} comment={comment} />
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No comments yet. Be the first to comment!
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};