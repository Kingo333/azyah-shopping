import React from 'react';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, Wand2, Crown } from 'lucide-react';

interface AiStudioHeaderProps {
  isPremium: boolean;
  onUpgradeClick: () => void;
}

export const AiStudioHeader: React.FC<AiStudioHeaderProps> = ({
  isPremium,
  onUpgradeClick
}) => {
  return (
    <div className="flex-shrink-0 p-4 md:p-6 border-b border-border/50 bg-background/95 backdrop-blur-sm">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3 text-xl md:text-2xl">
          <div className="p-2 rounded-lg bg-primary/10">
            <Wand2 className="h-5 w-5 md:h-6 md:w-6 text-primary" />
          </div>
          AI Studio
          <Badge variant="secondary" className="ml-auto text-xs">
            <Sparkles className="h-3 w-3 mr-1" />
            BitStudio
          </Badge>
        </DialogTitle>
        
        {/* Premium Benefits Section */}
        {!isPremium && (
          <div className="mt-4 p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg border border-primary/20">
            <div className="flex items-start gap-3">
              <Crown className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <h4 className="text-sm font-semibold text-foreground">Upgrade to Premium</h4>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>• 20 AI Try-ons daily (vs 4 lifetime)</div>
                  <div>• Unlimited AI generation on Replica</div>
                  <div>• Access to UGC collabs</div>
                </div>
                <Button 
                  size="sm" 
                  variant="default" 
                  className="mt-2 h-8 text-xs px-4"
                  onClick={onUpgradeClick}
                >
                  Upgrade Now
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogHeader>
    </div>
  );
};