import { useState } from 'react';
import { useAllQuestions } from '@/hooks/useUGCBrand';
import { QuestionCard } from './QuestionCard';
import { Button } from '@/components/ui/button';
import { PenSquare } from 'lucide-react';
import { QuestionFormModal } from './QuestionFormModal';
import { Skeleton } from '@/components/ui/skeleton';
import { ContentThreadModal } from './ContentThreadModal';

export const QuestionsList = () => {
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  
  const { data: questions, isLoading } = useAllQuestions();

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
          <h2 className="text-xl font-semibold">Questions</h2>
          <Button onClick={() => setShowQuestionForm(true)} className="gap-2">
            <PenSquare className="h-4 w-4" />
            Ask Question
          </Button>
        </div>

        {questions && questions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No questions yet. Be the first to ask!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {questions?.map((question) => (
              <QuestionCard
                key={question.id}
                question={question}
                onClick={() => setSelectedQuestionId(question.id)}
              />
            ))}
          </div>
        )}
      </div>

      <QuestionFormModal
        open={showQuestionForm}
        onOpenChange={setShowQuestionForm}
      />

      <ContentThreadModal
        contentType="question"
        contentId={selectedQuestionId}
        open={!!selectedQuestionId}
        onOpenChange={(open) => !open && setSelectedQuestionId(null)}
      />
    </>
  );
};