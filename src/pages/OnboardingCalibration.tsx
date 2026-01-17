import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Brain, ChevronRight, Check, Sparkles } from 'lucide-react';
import { CALIBRATION_OPTIONS } from '@/constants/styleTags';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CalibrationState {
  coverage: string;
  fit: string;
  fabric: string;
  style: string[];
}

const STEPS = ['coverage', 'fit', 'fabric', 'style'] as const;
type Step = typeof STEPS[number];

export default function OnboardingCalibration() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [preferences, setPreferences] = useState<CalibrationState>({
    coverage: '',
    fit: '',
    fabric: '',
    style: []
  });
  const [saving, setSaving] = useState(false);

  const currentStepKey = STEPS[currentStep];
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const handleSelect = (value: string) => {
    if (currentStepKey === 'style') {
      // Multi-select for style (max 2)
      setPreferences(prev => {
        const current = prev.style;
        if (current.includes(value)) {
          return { ...prev, style: current.filter(v => v !== value) };
        }
        if (current.length < 2) {
          return { ...prev, style: [...current, value] };
        }
        return prev;
      });
    } else {
      setPreferences(prev => ({ ...prev, [currentStepKey]: value }));
    }
  };

  const canProceed = () => {
    if (currentStepKey === 'style') {
      return preferences.style.length > 0;
    }
    return preferences[currentStepKey] !== '';
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = async () => {
    await savePreferences(true);
    navigate('/swipe', { replace: true });
  };

  const handleComplete = async () => {
    await savePreferences(false);
    navigate('/swipe', { replace: true });
  };

  const savePreferences = async (skipped: boolean) => {
    if (!user) {
      navigate('/swipe', { replace: true });
      return;
    }

    setSaving(true);
    try {
      const prefsToSave = skipped ? {} : {
        coverage: preferences.coverage,
        fit: preferences.fit,
        fabric: preferences.fabric,
        style: preferences.style
      };

      const { error } = await supabase
        .from('users')
        .update({
          preferences: prefsToSave,
          preferences_completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      if (!skipped) {
        toast.success('Style preferences saved!', {
          description: 'We\'ll use these to personalize your feed.'
        });
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      // Don't block navigation on error
    } finally {
      setSaving(false);
    }
  };

  const getStepTitle = (step: Step) => {
    switch (step) {
      case 'coverage': return 'Coverage Preference';
      case 'fit': return 'Fit Preference';
      case 'fabric': return 'Fabric Comfort';
      case 'style': return 'Style Direction';
    }
  };

  const getStepDescription = (step: Step) => {
    switch (step) {
      case 'coverage': return 'How much coverage do you prefer?';
      case 'fit': return 'What fit feels most comfortable?';
      case 'fabric': return 'Which fabrics do you gravitate toward?';
      case 'style': return 'Choose up to 2 style directions';
    }
  };

  const getOptions = (step: Step) => {
    return CALIBRATION_OPTIONS[step];
  };

  const isSelected = (value: string) => {
    if (currentStepKey === 'style') {
      return preferences.style.includes(value);
    }
    return preferences[currentStepKey] === value;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header 
        className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40"
        style={{ paddingTop: 'calc(var(--safe-top, 0px) + 10px)' }}
      >
        <div className="container max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Brain className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-medium">Style Calibration</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleSkip}
              disabled={saving}
              className="text-muted-foreground"
            >
              Skip
            </Button>
          </div>
          
          {/* Progress bar */}
          <div className="mt-3">
            <Progress value={progress} className="h-1" />
            <p className="text-[10px] text-muted-foreground mt-1 text-right">
              {currentStep + 1} of {STEPS.length}
            </p>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 container max-w-lg mx-auto px-4 py-6 flex flex-col">
        {/* Intro text */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs mb-3">
            <Sparkles className="h-3 w-3" />
            Quick Calibration
          </div>
          <p className="text-sm text-muted-foreground">
            We learn your style to match you to brands
          </p>
        </div>

        {/* Question card */}
        <Card className="flex-1 flex flex-col">
          <CardContent className="pt-6 flex-1 flex flex-col">
            <div className="mb-6">
              <h2 className="text-xl font-serif font-medium mb-1">
                {getStepTitle(currentStepKey)}
              </h2>
              <p className="text-sm text-muted-foreground">
                {getStepDescription(currentStepKey)}
              </p>
            </div>

            {/* Options */}
            <div className="flex-1 space-y-3">
              {getOptions(currentStepKey).map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    "w-full p-4 rounded-xl border-2 text-left transition-all",
                    isSelected(option.value)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{option.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {option.description}
                      </p>
                    </div>
                    {isSelected(option.value) && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Selected styles indicator for multi-select */}
            {currentStepKey === 'style' && preferences.style.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {preferences.style.map(s => (
                  <Badge key={s} variant="secondary" className="text-xs">
                    {CALIBRATION_OPTIONS.style.find(o => o.value === s)?.label}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action buttons */}
        <div className="mt-6 flex gap-3">
          {currentStep > 0 && (
            <Button
              variant="outline"
              onClick={() => setCurrentStep(currentStep - 1)}
              className="flex-1"
            >
              Back
            </Button>
          )}
          <Button
            onClick={handleNext}
            disabled={!canProceed() || saving}
            className="flex-1 gap-2"
          >
            {currentStep === STEPS.length - 1 ? (
              <>
                {saving ? 'Saving...' : 'Complete'}
                <Check className="h-4 w-4" />
              </>
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>

        {/* Footer microcopy */}
        <p className="text-center text-[10px] text-muted-foreground mt-4">
          You can update these preferences anytime in Settings
        </p>
      </main>
    </div>
  );
}
