import React from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { X, User, ArrowRight } from 'lucide-react';

interface ProfileCompletionCardProps {
  percentage: number;
  onDismiss: () => void;
  onGoToProfile: () => void;
}

export function ProfileCompletionCard({ 
  percentage, 
  onDismiss, 
  onGoToProfile 
}: ProfileCompletionCardProps) {
  return (
    <div className="h-full flex items-center">
      <div className="w-full p-4 bg-card rounded-xl border border-border shadow-sm">
        <div className="flex items-center gap-3">
          {/* User Icon */}
          <User className="w-5 h-5 text-foreground flex-shrink-0" />
          
          {/* Progress Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-sm font-medium text-foreground font-sans">
                Complete Your Profile
              </span>
              <span className="text-sm font-medium text-muted-foreground">
                ({percentage}%)
              </span>
            </div>
            
            {/* Progress Bar */}
            <Progress 
              value={percentage} 
              className="h-1.5 bg-muted [&>div]:bg-[hsl(var(--azyah-maroon))]"
            />
          </div>
          
          {/* Action Button */}
          <Button
            size="icon"
            onClick={onGoToProfile}
            className="h-9 w-9 rounded-full bg-[hsl(var(--azyah-maroon))] hover:bg-[hsl(var(--azyah-maroon))]/90 flex-shrink-0"
          >
            <ArrowRight className="w-4 h-4 text-white" />
          </Button>
          
          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0 hover:bg-transparent"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>
      </div>
    </div>
  );
}
