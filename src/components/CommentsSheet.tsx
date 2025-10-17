import { useState } from 'react';
import { Send, Trash2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFitComments, useAddComment, useDeleteComment } from '@/hooks/useFitComments';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';

interface CommentsSheetProps {
  fitId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const CommentsSheet = ({ fitId, isOpen, onClose }: CommentsSheetProps) => {
  const [commentText, setCommentText] = useState('');
  const { user } = useAuth();
  const { data: comments, isLoading } = useFitComments(fitId);
  const { mutate: addComment, isPending: isAdding } = useAddComment(fitId);
  const { mutate: deleteComment } = useDeleteComment(fitId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    addComment(commentText.trim(), {
      onSuccess: () => setCommentText(''),
    });
  };

  const handleDelete = (commentId: string) => {
    deleteComment(commentId);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="h-[80vh] flex flex-col">
        <SheetHeader>
          <SheetTitle>Comments</SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 pr-4 -mr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Loading comments...</p>
            </div>
          ) : comments && comments.length > 0 ? (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={comment.user.avatar_url || undefined} />
                    <AvatarFallback>
                      {(comment.user.username || comment.user.name || 'U')[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">
                        {comment.user.username || comment.user.name || 'Anonymous'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm mt-1">{comment.comment_text}</p>
                  </div>

                  {user && user.id === comment.user_id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(comment.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">No comments yet. Be the first!</p>
            </div>
          )}
        </ScrollArea>

        <form onSubmit={handleSubmit} className="flex gap-2 pt-4 border-t">
          <Input
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add a comment..."
            maxLength={500}
            disabled={!user || isAdding}
          />
          <Button type="submit" size="icon" disabled={!user || !commentText.trim() || isAdding}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
};
