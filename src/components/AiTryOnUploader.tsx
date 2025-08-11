import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AiTryOnUploaderProps {
  onUploadComplete?: (imageId: string) => void;
}

export const AiTryOnUploader: React.FC<AiTryOnUploaderProps> = () => {
  const navigate = useNavigate();

  return (
    <Card>
      <CardContent className="p-6 text-center">
        <p className="text-muted-foreground mb-4">
          AI Try-On has moved to a dedicated page with improved functionality.
        </p>
        <Button onClick={() => navigate('/ai-studio')} className="gap-2">
          Go to AI Studio
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
};
