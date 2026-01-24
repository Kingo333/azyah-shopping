import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Brain, ChevronRight, Check, Sparkles, Ruler } from 'lucide-react';
import { CALIBRATION_OPTIONS } from '@/constants/styleTags';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CalibrationState {
  coverage: string;
  fit: string;
  fabric: string;
  style: string[];
}

interface MeasurementsState {
  height: string;
  weight: string;
  topSize: string;
  bottomSize: string;
  dressSize: string;
}

const STEPS = ['coverage', 'fit', 'fabric', 'style', 'measurements'] as const;
type Step = typeof STEPS[number];

const TOP_SIZES = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];
const BOTTOM_SIZES = ['24', '26', '28', '30', '32', '34', '36', '38', '40', '42'];
const DRESS_SIZES = ['0', '2', '4', '6', '8', '10', '12', '14', '16', '18', '20'];

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
  const [measurements, setMeasurements] = useState<MeasurementsState>({
    height: '',
    weight: '',
    topSize: '',
    bottomSize: '',
    dressSize: ''
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
    } else if (currentStepKey !== 'measurements') {
      setPreferences(prev => ({ ...prev, [currentStepKey]: value }));
    }
  };

  const canProceed = () => {
    if (currentStepKey === 'style') {
      return preferences.style.length > 0;
    }
    if (currentStepKey === 'measurements') {
      // Measurements step is always optional (can proceed without filling anything)
      return true;
    }
    return preferences[currentStepKey as keyof CalibrationState] !== '';
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
      // Build style preferences
      const stylePrefs = skipped ? {} : {
        coverage: preferences.coverage,
        fit: preferences.fit,
        fabric: preferences.fabric,
        style: preferences.style
      };

      // Build measurements if provided
      const measurementsData = measurements.height ? {
        height: parseFloat(measurements.height),
        weight: measurements.weight ? parseFloat(measurements.weight) : undefined,
        top_size: measurements.topSize || undefined,
        bottom_size: measurements.bottomSize || undefined,
        dress_size: measurements.dressSize || undefined,
        updated_at: new Date().toISOString(),
      } : undefined;

      const prefsToSave = {
        ...stylePrefs,
        ...(measurementsData ? { measurements: measurementsData } : {}),
        measurements_prompted: true, // Flag to not nag again
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
        toast.success('Preferences saved!', {
          description: 'We\'ll use these to personalize your experience.'
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
      case 'measurements': return 'Your Fit (Optional)';
    }
  };

  const getStepDescription = (step: Step) => {
    switch (step) {
      case 'coverage': return 'How much coverage do you prefer?';
      case 'fit': return 'What fit feels most comfortable?';
      case 'fabric': return 'Which fabrics do you gravitate toward?';
      case 'style': return 'Choose up to 2 style directions';
      case 'measurements': return 'Help us find outfits from people your size';
    }
  };

  const getOptions = (step: Step) => {
    if (step === 'measurements') return [];
    return CALIBRATION_OPTIONS[step];
  };

  const isSelected = (value: string) => {
    if (currentStepKey === 'style') {
      return preferences.style.includes(value);
    }
    if (currentStepKey === 'measurements') return false;
    return preferences[currentStepKey as keyof CalibrationState] === value;
  };

  // Render measurements step content
  const renderMeasurementsStep = () => (
    <div className="flex-1 space-y-4">
      <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
        <div className="flex items-center gap-2 mb-2">
          <Ruler className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Why add measurements?</span>
        </div>
        <p className="text-xs text-muted-foreground">
          We'll show you outfits from people with similar body measurements. 
          This is completely optional and private.
        </p>
      </div>

      {/* Height - Primary */}
      <div className="space-y-2">
        <Label htmlFor="height">Height (cm)</Label>
        <Input
          id="height"
          type="number"
          placeholder="e.g., 165"
          value={measurements.height}
          onChange={(e) => setMeasurements(prev => ({ ...prev, height: e.target.value }))}
        />
      </div>

      {/* Weight - Optional */}
      <div className="space-y-2">
        <Label htmlFor="weight">Weight (kg) - optional</Label>
        <Input
          id="weight"
          type="number"
          placeholder="e.g., 60"
          value={measurements.weight}
          onChange={(e) => setMeasurements(prev => ({ ...prev, weight: e.target.value }))}
        />
      </div>

      {/* Size Preferences */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label>Top Size</Label>
          <Select 
            value={measurements.topSize} 
            onValueChange={(v) => setMeasurements(prev => ({ ...prev, topSize: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              {TOP_SIZES.map((size) => (
                <SelectItem key={size} value={size}>{size}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Bottom</Label>
          <Select 
            value={measurements.bottomSize} 
            onValueChange={(v) => setMeasurements(prev => ({ ...prev, bottomSize: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              {BOTTOM_SIZES.map((size) => (
                <SelectItem key={size} value={size}>{size}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Dress</Label>
          <Select 
            value={measurements.dressSize} 
            onValueChange={(v) => setMeasurements(prev => ({ ...prev, dressSize: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              {DRESS_SIZES.map((size) => (
                <SelectItem key={size} value={size}>{size}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

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
                {currentStepKey === 'measurements' ? (
                  <Ruler className="h-4 w-4 text-primary" />
                ) : (
                  <Brain className="h-4 w-4 text-primary" />
                )}
              </div>
              <span className="text-sm font-medium">
                {currentStepKey === 'measurements' ? 'Your Fit' : 'Style Calibration'}
              </span>
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
            {currentStepKey === 'measurements' ? 'Optional Step' : 'Quick Calibration'}
          </div>
          <p className="text-sm text-muted-foreground">
            {currentStepKey === 'measurements' 
              ? 'Find outfits from people your size'
              : 'We learn your style to match you to brands'
            }
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

            {/* Content - Either options or measurements form */}
            {currentStepKey === 'measurements' ? (
              renderMeasurementsStep()
            ) : (
              <>
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
              </>
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
