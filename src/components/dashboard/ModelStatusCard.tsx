import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronRight, Sparkles } from 'lucide-react';
import { useUserTasteProfile } from '@/hooks/useUserTasteProfile';

// Circular progress ring component
const ProgressRing = ({ progress, size = 48 }: { progress: number; size?: number }) => {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90">
        <circle 
          cx={size / 2} 
          cy={size / 2} 
          r={radius} 
          strokeWidth={strokeWidth} 
          fill="none" 
          className="stroke-primary/20" 
        />
        <circle 
          cx={size / 2} 
          cy={size / 2} 
          r={radius} 
          strokeWidth={strokeWidth} 
          fill="none" 
          className="stroke-primary transition-all duration-500"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-primary">
        {progress}%
      </span>
    </div>
  );
};

export function ModelStatusCard() {
  const navigate = useNavigate();
  const { tasteProfile, insights, isLoading } = useUserTasteProfile();

  const progress = Math.round((tasteProfile?.preference_confidence || 0) * 100);
  const totalSwipes = tasteProfile?.total_swipes || 0;
  const isWellTrained = insights?.isWellTrained || false;

  if (isLoading) {
    return (
      <Card className="p-4 bg-gradient-to-br from-primary/5 to-background border animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-32" />
            <div className="h-2 bg-muted rounded w-20" />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-gradient-to-br from-primary/5 via-background to-primary/3 border overflow-hidden relative">
      {/* Decorative element */}
      <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-primary/5 blur-2xl" />
      
      <div className="relative">
        <div className="flex items-center gap-4">
          {/* Progress Ring instead of Brain icon */}
          <ProgressRing progress={progress} size={48} />
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">Your Style Model</p>
              {isWellTrained && (
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalSwipes} preference signal{totalSwipes !== 1 ? 's' : ''}
            </p>
          </div>
          
          {/* Status badge */}
          <div className="text-right shrink-0">
            <span className="text-lg font-semibold text-primary">
              {progress >= 100 ? 'Calibrated' : `${progress}%`}
            </span>
          </div>
        </div>
        
        {/* CTA Button - premium copy */}
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full mt-3 gap-1 text-xs h-8 hover:bg-primary/10"
          onClick={() => navigate('/swipe')}
        >
          {progress < 20 ? 'Start refining' : 'Refine your model'}
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </Card>
  );
}
