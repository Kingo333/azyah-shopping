import React from 'react';

interface AiTryOnUploaderProps {
  onUploadComplete: (imageId: string) => void;
}

export const AiTryOnUploader: React.FC<AiTryOnUploaderProps> = ({ onUploadComplete }) => {
  return (
    <div className="p-4 text-center text-muted-foreground">
      <p>AI Try-On has moved to Quick Actions. Please use the new interface from your dashboard.</p>
    </div>
  );
};
