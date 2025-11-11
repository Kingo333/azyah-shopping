import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useCreateComment } from '@/hooks/useUGCBrand';
import { ContentType } from '@/types/ugcBrand';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

interface CommentInputProps {
  contentType: ContentType;
  contentId: string;
}

export const CommentInput = ({ contentType, contentId }: CommentInputProps) => {
  const [body, setBody] = useState('');
  const createComment = useCreateComment();

  const handleSubmit = async () => {
    if (!body.trim()) return;

    await createComment.mutateAsync({
      content_type: contentType,
      content_id: contentId,
      body: body.trim(),
    });

    setBody('');
  };

  return (
    <div className="space-y-3 border-t pt-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Your comment will be posted anonymously
        </AlertDescription>
      </Alert>
      
      <Textarea
        placeholder="Write a comment..."
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
      />
      
      <Button
        onClick={handleSubmit}
        disabled={!body.trim() || createComment.isPending}
        className="w-full"
      >
        {createComment.isPending ? 'Posting...' : 'Post Comment'}
      </Button>
    </div>
  );
};