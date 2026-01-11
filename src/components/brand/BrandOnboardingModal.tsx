import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { LogoUpload } from '@/components/LogoUpload';
import { RegionSelector, WORLDWIDE_VALUE } from '@/components/brand/RegionSelector';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { SUPPORTED_CURRENCIES } from '@/lib/currencies';
import { Camera, DollarSign, Globe, Share2, CheckCircle, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Brand {
  id: string;
  name: string;
  logo_url: string | null;
  bio: string | null;
  website: string | null;
  contact_email: string | null;
  socials: any;
  shipping_regions: string[];
  category?: string | null;
  currency?: string | null;
}

interface BrandOnboardingModalProps {
  isOpen: boolean;
  brand: Brand;
  onComplete: (updatedBrand: Brand) => void;
  onSkip: () => void;
}

type OnboardingStep = 'logo' | 'currency' | 'regions' | 'socials' | 'done';

const STEPS: { key: OnboardingStep; label: string; icon: React.ReactNode }[] = [
  { key: 'logo', label: 'Logo', icon: <Camera className="h-5 w-5" /> },
  { key: 'currency', label: 'Currency', icon: <DollarSign className="h-5 w-5" /> },
  { key: 'regions', label: 'Regions', icon: <Globe className="h-5 w-5" /> },
  { key: 'socials', label: 'Socials', icon: <Share2 className="h-5 w-5" /> },
  { key: 'done', label: 'Done', icon: <CheckCircle className="h-5 w-5" /> }
];

const SOCIAL_PLATFORMS = [
  { key: 'instagram', label: 'Instagram', placeholder: 'yourbrand' },
  { key: 'tiktok', label: 'TikTok', placeholder: 'yourbrand' },
  { key: 'twitter', label: 'X (Twitter)', placeholder: 'yourbrand' },
  { key: 'youtube', label: 'YouTube', placeholder: 'channel-name' }
];

export const BrandOnboardingModal: React.FC<BrandOnboardingModalProps> = ({
  isOpen,
  brand,
  onComplete,
  onSkip
}) => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('logo');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  
  // Form state
  const [logoUrl, setLogoUrl] = useState<string | null>(brand.logo_url);
  const [currency, setCurrency] = useState(brand.currency || 'AED');
  const [regions, setRegions] = useState<string[]>(brand.shipping_regions || []);
  const [socials, setSocials] = useState<Record<string, string>>(brand.socials || {});
  
  const isFashionBrand = brand.category === 'fashion_brand';
  const regionLabel = isFashionBrand ? 'Shipping Regions' : 'Service Regions';
  
  const currentStepIndex = STEPS.findIndex(s => s.key === currentStep);
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;
  
  const saveToDatabase = async (updates: Partial<Brand>) => {
    try {
      const { error } = await supabase
        .from('brands')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', brand.id);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error saving:', error);
      toast({
        title: 'Error',
        description: 'Failed to save. Please try again.',
        variant: 'destructive'
      });
      return false;
    }
  };
  
  const handleLogoUpdate = async (url: string | null) => {
    setLogoUrl(url);
    // Logo is saved by LogoUpload component directly
  };
  
  const handleNext = async () => {
    setIsSaving(true);
    
    try {
      switch (currentStep) {
        case 'logo':
          // Logo already saved by LogoUpload component
          setCurrentStep('currency');
          break;
        case 'currency':
          await saveToDatabase({ currency });
          setCurrentStep('regions');
          break;
        case 'regions':
          await saveToDatabase({ shipping_regions: regions });
          setCurrentStep('socials');
          break;
        case 'socials':
          await saveToDatabase({ socials });
          setCurrentStep('done');
          break;
        case 'done':
          // Fetch latest brand data and complete
          const { data } = await supabase
            .from('brands')
            .select('*')
            .eq('id', brand.id)
            .single();
          
          if (data) {
            onComplete(data);
          } else {
            onComplete({
              ...brand,
              logo_url: logoUrl,
              currency,
              shipping_regions: regions,
              socials
            });
          }
          break;
      }
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex].key);
    }
  };
  
  const handleSkipStep = () => {
    if (currentStep === 'done') {
      handleNext();
    } else {
      const nextIndex = currentStepIndex + 1;
      if (nextIndex < STEPS.length) {
        setCurrentStep(STEPS[nextIndex].key);
      }
    }
  };
  
  const handleSocialChange = (platform: string, value: string) => {
    setSocials(prev => {
      if (!value.trim()) {
        const updated = { ...prev };
        delete updated[platform];
        return updated;
      }
      return { ...prev, [platform]: value.trim() };
    });
  };
  
  const calculateCompletion = () => {
    let score = 0;
    if (logoUrl) score += 20;
    if (currency) score += 10;
    if (regions.length > 0) score += 15;
    if (Object.keys(socials).length > 0) score += 10;
    if (brand.name && brand.name !== 'My Brand') score += 15;
    if (brand.contact_email) score += 15;
    if (brand.bio) score += 15;
    return Math.min(score, 100);
  };
  
  const renderStepContent = () => {
    switch (currentStep) {
      case 'logo':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Upload Your Logo</h3>
              <p className="text-sm text-muted-foreground">
                A great logo helps customers recognize your brand
              </p>
            </div>
            <div className="flex justify-center">
              <LogoUpload
                currentLogoUrl={logoUrl}
                onLogoUpdate={handleLogoUpdate}
                entityType="brand"
                entityId={brand.id}
              />
            </div>
          </div>
        );
      
      case 'currency':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Select Your Currency</h3>
              <p className="text-sm text-muted-foreground">
                Choose the currency for your pricing
              </p>
            </div>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_CURRENCIES.map((curr) => (
                  <SelectItem key={curr.code} value={curr.code}>
                    {curr.symbol} {curr.name} ({curr.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      
      case 'regions':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">{regionLabel}</h3>
              <p className="text-sm text-muted-foreground">
                {isFashionBrand 
                  ? 'Where do you ship your products?' 
                  : 'Where do you offer your services?'}
              </p>
            </div>
            <RegionSelector
              selectedRegions={regions}
              onChange={setRegions}
              maxHeight="250px"
            />
          </div>
        );
      
      case 'socials':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Social Media</h3>
              <p className="text-sm text-muted-foreground">
                Connect your social platforms (optional)
              </p>
            </div>
            <div className="space-y-4">
              {SOCIAL_PLATFORMS.map((platform) => (
                <div key={platform.key} className="space-y-2">
                  <label className="text-sm font-medium">{platform.label}</label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">@</span>
                    <Input
                      value={socials[platform.key] || ''}
                      onChange={(e) => handleSocialChange(platform.key, e.target.value)}
                      placeholder={platform.placeholder}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      
      case 'done':
        return (
          <div className="space-y-6 text-center py-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">You're All Set!</h3>
              <p className="text-muted-foreground">
                Your profile is {calculateCompletion()}% complete
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-left">
              <p className="text-sm text-muted-foreground">
                You can update these settings anytime from the <strong>Settings</strong> tab in your dashboard.
              </p>
            </div>
          </div>
        );
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="sr-only">Complete Your Profile</DialogTitle>
          <DialogDescription className="sr-only">
            Step-by-step wizard to set up your brand profile
          </DialogDescription>
        </DialogHeader>
        
        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-2">
          {STEPS.map((step, index) => (
            <div 
              key={step.key}
              className={cn(
                'flex flex-col items-center gap-1',
                index <= currentStepIndex ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors',
                index < currentStepIndex ? 'bg-primary border-primary text-primary-foreground' :
                index === currentStepIndex ? 'border-primary bg-primary/10' : 
                'border-muted-foreground/30'
              )}>
                {index < currentStepIndex ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  step.icon
                )}
              </div>
              <span className="text-xs hidden sm:block">{step.label}</span>
            </div>
          ))}
        </div>
        
        <Progress value={progress} className="h-1 mb-4" />
        
        {/* Step Content */}
        <div className="min-h-[300px]">
          {renderStepContent()}
        </div>
        
        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div>
            {currentStepIndex > 0 && currentStep !== 'done' && (
              <Button variant="ghost" onClick={handleBack} disabled={isSaving}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {currentStep !== 'done' && (
              <Button variant="ghost" onClick={handleSkipStep} disabled={isSaving}>
                Skip
              </Button>
            )}
            <Button onClick={handleNext} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : currentStep === 'done' ? (
                'Go to Dashboard'
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
