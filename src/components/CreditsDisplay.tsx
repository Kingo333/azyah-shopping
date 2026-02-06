import React from 'react';
import { Clock, Crown, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CreditsDisplayProps {
  feature: 'ai_studio' | 'wardrobe';
  aiStudioCredits?: number;
  beautyCredits?: number;
  wardrobeCredits?: number;
  isPremium: boolean;
  loading?: boolean;
}

export function CreditsDisplay({ feature, aiStudioCredits, beautyCredits, wardrobeCredits, isPremium, loading }: CreditsDisplayProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 p-3 bg-card rounded-lg border animate-pulse">
        <div className="w-4 h-4 bg-muted rounded"></div>
        <div className="w-16 h-4 bg-muted rounded"></div>
      </div>
    );
  }

  const featureLabels = {
    ai_studio: 'AI Studio',
    wardrobe: 'Wardrobe Enhancement'
  };

  const creditCount = feature === 'ai_studio' 
    ? aiStudioCredits ?? 0
    : wardrobeCredits ?? 0;

  return (
    <div className="flex items-center justify-between p-3 bg-card rounded-lg border">
      <div className="flex items-center gap-2">
        <div className="relative">
          <Zap className="h-4 w-4 text-primary" />
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse"></div>
        </div>
        <span className="text-sm font-medium">{featureLabels[feature]}: {creditCount} credits</span>
      </div>
      
      <div className="flex items-center gap-2">
        {isPremium && (
          <Badge variant="secondary" className="text-xs gap-1">
            <Crown className="h-3 w-3" />
            Premium
          </Badge>
        )}
        
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3 animate-[spin_3s_linear_infinite]" />
          <span>Daily reset</span>
        </div>
      </div>
    </div>
  );
}