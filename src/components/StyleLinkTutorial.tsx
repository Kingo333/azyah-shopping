import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, ChevronRight, ChevronLeft, Tag, Link2, DollarSign, Eye, Sparkles, Info } from 'lucide-react';

interface StyleLinkTutorialProps {
  isOwner: boolean;
  onComplete?: () => void;
}

const ownerSteps = [
  {
    title: 'Welcome to Your Style Link! 🎉',
    description: 'This is your personal style page where visitors can see your outfits and shop your looks. Let\'s walk through how to make the most of it.',
    icon: <Sparkles className="h-5 w-5 text-[hsl(var(--azyah-maroon))]" />,
  },
  {
    title: 'Share Your Unique Link',
    description: 'Use the copy, share, and QR code buttons to spread your style link. Share it on social media, in your bio, or anywhere you want!',
    icon: <Link2 className="h-5 w-5 text-[hsl(var(--azyah-maroon))]" />,
    action: 'Copy your link using the buttons at the top',
  },
  {
    title: 'Create & Attach Promo Codes',
    description: 'Add your affiliate or discount codes in the "Deals & Codes" section. You can attach these codes to specific outfits so visitors see them when browsing.',
    icon: <Tag className="h-5 w-5 text-[hsl(var(--azyah-maroon))]" />,
    action: 'Tap "Create New Promo" to add a code',
  },
  {
    title: 'Earn From Your Style',
    description: 'When visitors use your codes or click your affiliate links, you earn rewards! Track your page views, outfit clicks, and shop clicks in the stats panel.',
    icon: <DollarSign className="h-5 w-5 text-[hsl(var(--azyah-maroon))]" />,
  },
  {
    title: 'Preview as a Visitor',
    description: 'Want to see how others view your page? Use the "Preview" button to see your page without owner controls.',
    icon: <Eye className="h-5 w-5 text-[hsl(var(--azyah-maroon))]" />,
    action: 'Click "Preview" in the stats section',
  },
];

export const StyleLinkTutorial: React.FC<StyleLinkTutorialProps> = ({
  isOwner,
  onComplete,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenTutorial, setHasSeenTutorial] = useState(true);

  const tutorialKey = 'style-link-owner-tutorial';
  const steps = ownerSteps;

  useEffect(() => {
    if (!isOwner) return;
    
    const seenTutorials = JSON.parse(localStorage.getItem('seenTutorials') || '{}');
    const hasSeen = seenTutorials[tutorialKey] || false;
    setHasSeenTutorial(hasSeen);

    // Auto-show tutorial if first time
    if (!hasSeen) {
      setTimeout(() => setIsOpen(true), 800);
    }
  }, [isOwner]);

  const handleComplete = () => {
    const seenTutorials = JSON.parse(localStorage.getItem('seenTutorials') || '{}');
    seenTutorials[tutorialKey] = true;
    localStorage.setItem('seenTutorials', JSON.stringify(seenTutorials));
    
    setHasSeenTutorial(true);
    setIsOpen(false);
    setCurrentStep(0);
    onComplete?.();
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleOpen = () => {
    setCurrentStep(0);
    setIsOpen(true);
  };

  if (!isOwner) return null;

  // Info icon button for triggering tutorial
  const TriggerButton = () => (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 rounded-full bg-background/80 hover:bg-background"
      onClick={handleOpen}
      title="How to use Style Link"
    >
      <Info className="h-3.5 w-3.5" />
    </Button>
  );

  if (!isOpen) {
    return <TriggerButton />;
  }

  const currentStepData = steps[currentStep];

  return (
    <>
      <TriggerButton />
      {/* Full-screen overlay for mobile and desktop */}
      <div 
        className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-3 sm:p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) handleComplete();
        }}
      >
        <Card className="w-full max-w-[calc(100vw-24px)] sm:max-w-sm mx-auto animate-fade-in shadow-2xl">
          <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="shrink-0">
                  {currentStepData.icon}
                </div>
                <CardTitle className="text-sm sm:text-base leading-tight">{currentStepData.title}</CardTitle>
              </div>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0" onClick={handleComplete}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="text-[10px]">
                {currentStep + 1} of {steps.length}
              </Badge>
              <div className="flex gap-1">
                {steps.map((_, index) => (
                  <div
                    key={index}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      index <= currentStep ? 'bg-[hsl(var(--azyah-maroon))]' : 'bg-muted'
                    }`}
                  />
                ))}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-3 pt-0 px-3 sm:px-6 pb-3 sm:pb-6">
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {currentStepData.description}
            </p>
            
            {currentStepData.action && (
              <div className="p-2 sm:p-2.5 bg-[hsl(var(--azyah-maroon))]/10 rounded-lg">
                <p className="text-[10px] sm:text-xs font-medium text-[hsl(var(--azyah-maroon))]">
                  💡 {currentStepData.action}
                </p>
              </div>
            )}
            
            <div className="flex items-center justify-between pt-2 sm:pt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className="gap-1 h-8 text-xs px-2"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Back
              </Button>
              
              <div className="flex gap-1 sm:gap-2">
                <Button variant="ghost" size="sm" onClick={handleComplete} className="h-8 text-xs px-2">
                  Skip
                </Button>
                <Button 
                  onClick={handleNext} 
                  size="sm" 
                  className="gap-1 h-8 text-xs px-2 sm:px-3 bg-[hsl(var(--azyah-maroon))] hover:bg-[hsl(var(--azyah-maroon))]/90"
                >
                  {currentStep === steps.length - 1 ? 'Got it!' : 'Next'}
                  {currentStep < steps.length - 1 && <ChevronRight className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};