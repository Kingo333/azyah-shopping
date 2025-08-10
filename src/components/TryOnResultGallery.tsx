// This component is no longer needed - AI Try-On has been moved to Quick Actions modal
// Keeping file to prevent import errors, but marking as deprecated

import React from 'react';
import type { Product } from '@/types';

interface TryOnResultGalleryProps {
  resultUrl: string;
  product: Product;
  onSave?: () => void;
  onTryAgain: () => void;
}

export const TryOnResultGallery: React.FC<TryOnResultGalleryProps> = () => {
  return (
    <div className="p-4 text-center text-muted-foreground">
      <p>AI Try-On has moved to Quick Actions. Please use the new interface from your dashboard.</p>
    </div>
  );
};
