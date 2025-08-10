import React from 'react';

interface TryOnProgressProps {
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  onStatusChange?: (status: string) => void;
}

export const TryOnProgress: React.FC<TryOnProgressProps> = ({ status }) => {
  return (
    <div className="p-4 text-center text-muted-foreground">
      <p>AI Try-On has moved to Quick Actions. Please use the new interface from your dashboard.</p>
    </div>
  );
};
