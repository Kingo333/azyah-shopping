import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GlassPanel } from '@/components/ui/glass-panel';
import { Loader2, Wand2, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

interface AiStudioControlsPanelProps {
  loading: boolean;
  showSettings: boolean;
  prompt: string;
  resolution: 'standard' | 'high';
  remainingGenerations: number;
  maxGenerations: number;
  isPremium: boolean;
  personImageId: string | null;
  outfitImageId: string | null;
  onShowSettingsToggle: () => void;
  onPromptChange: (value: string) => void;
  onResolutionChange: (value: 'standard' | 'high') => void;
  onGenerate: () => void;
}

export const AiStudioControlsPanel: React.FC<AiStudioControlsPanelProps> = ({
  loading,
  showSettings,
  prompt,
  resolution,
  remainingGenerations,
  maxGenerations,
  isPremium,
  personImageId,
  outfitImageId,
  onShowSettingsToggle,
  onPromptChange,
  onResolutionChange,
  onGenerate
}) => {
  const canGenerate = !loading && personImageId && outfitImageId && remainingGenerations > 0;

  return (
    <div className="space-y-3">
      {/* Advanced Settings */}
      <GlassPanel variant="custom" className="p-3">
        <Button
          variant="ghost"
          onClick={onShowSettingsToggle}
          className="w-full justify-between text-sm h-8"
        >
          Advanced Settings
          {showSettings ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </Button>
        
        {showSettings && (
          <div className="mt-3 space-y-2">
            <div>
              <Label className="text-xs">Resolution</Label>
              <Select value={resolution} onValueChange={onResolutionChange}>
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="high">High Quality</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-xs">Prompt (Optional)</Label>
              <Input
                value={prompt}
                onChange={(e) => onPromptChange(e.target.value)}
                placeholder="Describe styling preferences..."
                className="mt-1 h-8 text-xs"
              />
            </div>
          </div>
        )}
      </GlassPanel>

      {/* Generation Status */}
      <div className="text-center space-y-1 p-3">
        <div className="text-sm font-medium">
          {remainingGenerations} / {maxGenerations} remaining
        </div>
        <div className="text-xs text-muted-foreground">
          {isPremium ? 'Premium daily limit' : 'Free lifetime limit'}
        </div>
      </div>

      {/* Generate Button */}
      <Button 
        onClick={onGenerate} 
        disabled={!canGenerate} 
        className="w-full h-10 text-sm font-medium"
        size="lg"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Generating...
          </>
        ) : remainingGenerations <= 0 ? (
          isPremium ? 'Daily Limit Reached' : 'Lifetime Limit Reached'
        ) : !personImageId || !outfitImageId ? (
          'Upload Both Images'
        ) : (
          <>
            <Wand2 className="h-4 w-4 mr-2" />
            Generate Try-On
          </>
        )}
      </Button>
    </div>
  );
};