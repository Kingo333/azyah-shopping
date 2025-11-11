import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { useVoteContent } from '@/hooks/useUGCBrand';
import { formatDistanceToNow } from 'date-fns';

interface Comment {
  id: string;
  body: string;
  like_count: number;
  dislike_count: number;
  created_at: string;
}

interface CommentCardProps {
  comment: Comment;
}

export const CommentCard = ({ comment }: CommentCardProps) => {
  const vote = useVoteContent();

  const handleLike = () => {
    vote.mutate({ contentType: 'comment' as any, contentId: comment.id, value: 1 });
  };

  const handleDislike = () => {
    vote.mutate({ contentType: 'comment' as any, contentId: comment.id, value: -1 });
  };

  return (
    <Card className="p-3 bg-muted/30">
      <p className="text-sm mb-2">{comment.body}</p>
      
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-1 h-auto p-1 hover:text-green-600"
            onClick={handleLike}
            disabled={vote.isPending}
          >
            <ThumbsUp className="h-3 w-3" />
            <span>{comment.like_count || 0}</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-1 h-auto p-1 hover:text-red-600"
            onClick={handleDislike}
            disabled={vote.isPending}
          >
            <ThumbsDown className="h-3 w-3" />
            <span>{comment.dislike_count || 0}</span>
          </Button>
        </div>
        
        <span className="text-muted-foreground">
          Anonymous Creator • {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
        </span>
      </div>
    </Card>
  );
};