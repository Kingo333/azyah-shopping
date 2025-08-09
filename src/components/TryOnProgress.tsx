
import React, { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Sparkles } from 'lucide-react';

interface TryOnProgressProps {
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  onStatusChange?: (status: string) => void;
}

export const TryOnProgress: React.FC<TryOnProgressProps> = ({ 
  status, 
  onStatusChange 
}) => {
  const getStatusText = () => {
    switch (status) {
      case 'queued':
        return 'Your try-on is queued...';
      case 'running':
        return 'Generating your try-on...';
      case 'succeeded':
        return 'Try-on complete!';
      case 'failed':
        return 'Try-on failed';
      default:
        return 'Processing...';
    }
  };

  const getProgressPercentage = () => {
    switch (status) {
      case 'queued':
        return 25;
      case 'running':
        return 75;
      case 'succeeded':
        return 100;
      case 'failed':
        return 0;
      default:
        return 0;
    }
  };

  return (
    <Card>
      <CardContent className="p-6 text-center space-y-4">
        <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto">
          {status === 'succeeded' ? (
            <Sparkles className="h-8 w-8 text-white" />
          ) : (
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          )}
        </div>
        
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">AI Try-On</h3>
          <p className="text-muted-foreground">{getStatusText()}</p>
          
          {status !== 'failed' && (
            <div className="w-full bg-muted rounded-full h-2 mt-4">
              <div 
                className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
          )}
        </div>
        
        {status === 'running' && (
          <p className="text-sm text-muted-foreground">
            This may take up to 30-50 seconds...
          </p>
        )}
      </CardContent>
    </Card>
  );
};
