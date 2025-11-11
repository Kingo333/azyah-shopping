import { MessageCircle, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BrandQuestion } from '@/types/ugcBrand';
import { useVoteContent } from '@/hooks/useUGCBrand';
import { formatDistanceToNow } from 'date-fns';

interface QuestionCardProps {
  question: BrandQuestion & { 
    brand_answers?: any[];
    ugc_brands?: { name: string; logo_url?: string };
    brand_name?: string;
    brand_logo_url?: string;
  };
  onClick?: () => void;
}

export const QuestionCard = ({ question, onClick }: QuestionCardProps) => {
  const vote = useVoteContent();
  const answerCount = question.brand_answers?.length || 0;
  const brandName = question.ugc_brands?.name || question.brand_name;
  const brandLogo = question.ugc_brands?.logo_url || question.brand_logo_url;

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    vote.mutate({ contentType: 'question', contentId: question.id, value: 1 });
  };

  const handleDislike = (e: React.MouseEvent) => {
    e.stopPropagation();
    vote.mutate({ contentType: 'question', contentId: question.id, value: -1 });
  };

  return (
    <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <h4 className="font-semibold mb-2">{question.title}</h4>
      {question.body && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{question.body}</p>
      )}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-1 h-auto p-1 hover:text-green-600"
            onClick={handleLike}
            disabled={vote.isPending}
          >
            <ThumbsUp className="h-4 w-4" />
            <span>{question.like_count || 0}</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-1 h-auto p-1 hover:text-red-600"
            onClick={handleDislike}
            disabled={vote.isPending}
          >
            <ThumbsDown className="h-4 w-4" />
            <span>{question.dislike_count || 0}</span>
          </Button>
          <div className="flex items-center gap-1 text-muted-foreground">
            <MessageCircle className="h-4 w-4" />
            <span>{question.comment_count || 0}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          {brandLogo && (
            <img src={brandLogo} alt={brandName} className="w-4 h-4 rounded-full object-cover" />
          )}
          <span>
            {brandName} • Anonymous Creator • {formatDistanceToNow(new Date(question.created_at), { addSuffix: true })}
          </span>
        </div>
      </div>
    </Card>
  );
};
