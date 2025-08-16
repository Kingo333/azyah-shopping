import React from 'react';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, Wand2, Crown, X } from 'lucide-react';

interface AiStudioHeaderProps {
  isPremium: boolean;
  onUpgradeClick: () => void;
  onClose: () => void;
}

export const AiStudioHeader: React.FC<AiStudioHeaderProps> = ({
  isPremium,
  onUpgradeClick,
  onClose
}) => {
  return (
    <div className="flex-shrink-0 p-3 md:p-4 border-b border-border/50 bg-background/95 backdrop-blur-sm">
      <DialogHeader>
        <div className="flex items-center justify-between">
          <DialogTitle className="flex items-center gap-2 text-lg md:text-xl">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Wand2 className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            </div>
            AI Studio
            <Badge variant="secondary" className="text-xs">
              AI try-on
            </Badge>
          </DialogTitle>
          
          {/* Close Button */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0 lg:hidden"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Premium Benefits Section - Compact */}
        {!isPremium && (
          <div className="mt-3 p-3 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg border border-primary/20">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-foreground">Upgrade to Premium</h4>
                <div className="text-xs text-muted-foreground">
                  20 daily try-ons, unlimited replica generation, UGC collab access
                </div>
              </div>
              <Button 
                size="sm" 
                variant="default" 
                className="h-7 text-xs px-3 flex-shrink-0"
                onClick={onUpgradeClick}
              >
                Upgrade
              </Button>
            </div>
          </div>
        )}
      </DialogHeader>
    </div>
  );
};