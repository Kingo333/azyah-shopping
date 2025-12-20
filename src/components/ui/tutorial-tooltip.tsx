import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

interface TutorialTooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  feature: string;
  className?: string;
}

export const TutorialTooltip: React.FC<TutorialTooltipProps> = ({ 
  children, 
  content, 
  feature, 
  className = "" 
}) => {
  const [isSkipped, setIsSkipped] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const skippedFeatures = JSON.parse(localStorage.getItem('skippedTooltips') || '[]');
    setIsSkipped(skippedFeatures.includes(feature));
  }, [feature]);

  const handleSkip = () => {
    const skippedFeatures = JSON.parse(localStorage.getItem('skippedTooltips') || '[]');
    const updatedSkipped = [...skippedFeatures, feature];
    localStorage.setItem('skippedTooltips', JSON.stringify(updatedSkipped));
    setIsSkipped(true);
    setOpen(false);
  };

  if (isSkipped) {
    return <>{children}</>;
  }

  return (
    <TooltipProvider>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent className="max-w-xs p-3 bg-popover border shadow-lg">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="text-sm text-popover-foreground">{content}</div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-destructive/10"
                onClick={handleSkip}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={handleSkip}
            >
              Don't show again
            </Button>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};