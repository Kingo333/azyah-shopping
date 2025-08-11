// This component has been deprecated - AI Try-On results are now handled by the new AI Studio page
// Keeping this file to prevent import errors but marking as deprecated

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Product } from '@/types';

interface TryOnResultGalleryProps {
  resultUrl?: string;
  product?: Product;
  onSave?: () => void;
  onTryAgain?: () => void;
}

export const TryOnResultGallery: React.FC<TryOnResultGalleryProps> = () => {
  const navigate = useNavigate();

  return (
    <Card>
      <CardContent className="p-6 text-center">
        <p className="text-muted-foreground mb-4">
          AI Try-On results are now displayed in the new AI Studio interface.
        </p>
        <Button onClick={() => navigate('/ai-studio')} className="gap-2">
          Go to AI Studio
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
};
