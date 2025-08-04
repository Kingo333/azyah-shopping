import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, ChevronRight, ChevronLeft, Lightbulb } from 'lucide-react';

interface TutorialStep {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: string;
}

interface TutorialTooltipProps {
  tutorialKey: string;
  steps: TutorialStep[];
  onComplete?: () => void;
  trigger?: React.ReactNode;
  autoShow?: boolean;
}

const TutorialTooltip: React.FC<TutorialTooltipProps> = ({
  tutorialKey,
  steps,
  onComplete,
  trigger,
  autoShow = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenTutorial, setHasSeenTutorial] = useState(false);

  useEffect(() => {
    // Check if user has seen this tutorial before
    const seenTutorials = JSON.parse(localStorage.getItem('seenTutorials') || '{}');
    const hasSeen = seenTutorials[tutorialKey] || false;
    setHasSeenTutorial(hasSeen);

    // Auto-show tutorial if it's the first time and autoShow is enabled
    if (!hasSeen && autoShow) {
      setTimeout(() => setIsOpen(true), 1000);
    }
  }, [tutorialKey, autoShow]);

  const handleComplete = () => {
    // Mark tutorial as seen
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

  const handleSkip = () => {
    handleComplete();
  };

  if (!isOpen) {
    return (
      <div className="relative">
        {trigger && (
          <div onClick={() => setIsOpen(true)}>
            {trigger}
          </div>
        )}
        {!hasSeenTutorial && !trigger && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsOpen(true)}
            className="fixed bottom-4 right-4 z-50 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg"
          >
            <Lightbulb className="h-4 w-4 mr-2" />
            Tutorial
          </Button>
        )}
      </div>
    );
  }

  const currentStepData = steps[currentStep];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full mx-auto animate-fade-in">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{currentStepData.title}</CardTitle>
              {currentStepData.icon}
            </div>
            <Button variant="ghost" size="sm" onClick={handleSkip}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              Step {currentStep + 1} of {steps.length}
            </Badge>
            <div className="flex gap-1">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index <= currentStep ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {currentStepData.description}
          </p>
          
          {currentStepData.action && (
            <div className="p-3 bg-primary/10 rounded-lg">
              <p className="text-sm font-medium text-primary">
                {currentStepData.action}
              </p>
            </div>
          )}
          
          <div className="flex items-center justify-between pt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleSkip}>
                Skip Tutorial
              </Button>
              <Button onClick={handleNext} size="sm" className="gap-1">
                {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
                {currentStep < steps.length - 1 && <ChevronRight className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TutorialTooltip;