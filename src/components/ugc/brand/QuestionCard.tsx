import { MessageCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { BrandQuestion } from '@/types/ugcBrand';
import { formatDistanceToNow } from 'date-fns';

interface QuestionCardProps {
  question: BrandQuestion & { brand_answers?: any[] };
}

export const QuestionCard = ({ question }: QuestionCardProps) => {
  const answerCount = question.brand_answers?.length || 0;

  return (
    <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow">
      <h4 className="font-semibold mb-2">{question.title}</h4>
      {question.body && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{question.body}</p>
      )}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <MessageCircle className="h-4 w-4" />
          <span>{answerCount} {answerCount === 1 ? 'answer' : 'answers'}</span>
        </div>
        <span>
          {question.users?.name || 'Anonymous'} •{' '}
          {formatDistanceToNow(new Date(question.created_at), { addSuffix: true })}
        </span>
      </div>
    </Card>
  );
};
