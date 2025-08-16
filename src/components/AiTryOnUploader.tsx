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
          AI Try-On is now available in the dashboard with improved functionality.
        </p>
        <Button onClick={() => navigate('/dashboard')} className="gap-2">
          Go to Dashboard
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
};
