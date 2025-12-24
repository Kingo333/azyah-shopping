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
      <div className="w-full p-3 bg-gradient-to-br from-primary/5 via-card to-accent/5 rounded-xl border border-border/50 shadow-sm">
        <div className="flex items-center gap-2.5">
          {/* User Icon with branded background */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-primary" />
          </div>
          
          {/* Progress Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-xs font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Complete Your Profile
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                ({percentage}%)
              </span>
            </div>
            
            {/* Progress Bar */}
            <Progress 
              value={percentage} 
              className="h-1.5 bg-background/60 [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-accent"
            />
          </div>
          
          {/* Action Button */}
          <Button
            size="icon"
            onClick={onGoToProfile}
            className="h-8 w-8 rounded-full bg-gradient-to-r from-primary to-accent hover:opacity-90 flex-shrink-0 shadow-sm"
          >
            <ArrowRight className="w-3.5 h-3.5 text-white" />
          </Button>
          
          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 flex-shrink-0 hover:bg-muted/50 rounded-full"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </Button>
        </div>
      </div>
    </div>
  );
}
