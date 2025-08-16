import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GlassPanel } from '@/components/ui/glass-panel';
import { Loader2, Wand2, Sparkles, ChevronDown, ChevronUp, Upload, User, Shirt } from 'lucide-react';

interface AiStudioControlsPanelProps {
  loading: boolean;
  uploadingPerson?: boolean;
  uploadingOutfit?: boolean;
  showSettings: boolean;
  prompt: string;
  resolution: 'standard' | 'high';
  remainingGenerations: number;
  maxGenerations: number;
  isPremium: boolean;
  personImageId: string | null;
  outfitImageId: string | null;
  personFile: File | null;
  outfitFile: File | null;
  onShowSettingsToggle: () => void;
  onPromptChange: (value: string) => void;
  onResolutionChange: (value: 'standard' | 'high') => void;
  onGenerate: () => void;
  onPersonUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOutfitUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const AiStudioControlsPanel: React.FC<AiStudioControlsPanelProps> = ({
  loading,
  uploadingPerson = false,
  uploadingOutfit = false,
  showSettings,
  prompt,
  resolution,
  remainingGenerations,
  maxGenerations,
  isPremium,
  personImageId,
  outfitImageId,
  personFile,
  outfitFile,
  onShowSettingsToggle,
  onPromptChange,
  onResolutionChange,
  onGenerate,
  onPersonUpload,
  onOutfitUpload
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
          </div>
        )}
      </GlassPanel>

      {/* Upload Panel */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {/* Person Upload */}
          <div>
            <Label className="text-xs block mb-1">Person Image</Label>
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={onPersonUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <GlassPanel variant="custom" className={`h-20 flex flex-col items-center justify-center transition-colors cursor-pointer hover:border-primary/50 ${personImageId ? 'border-green-500/50 bg-green-500/5' : uploadingPerson ? 'border-primary/50 bg-primary/5' : 'border-dashed'}`}>
                {uploadingPerson ? (
                  <div className="text-center">
                    <Loader2 className="h-4 w-4 mx-auto mb-1 animate-spin text-primary" />
                    <p className="text-xs text-primary font-medium">Uploading...</p>
                  </div>
                ) : personFile && personImageId ? (
                  <div className="text-center">
                    <User className="h-4 w-4 mx-auto mb-1 text-green-500" />
                    <p className="text-xs text-green-500 font-medium">Uploaded</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Person</p>
                  </div>
                )}
              </GlassPanel>
            </div>
          </div>

          {/* Outfit Upload */}
          <div>
            <Label className="text-xs block mb-1">Outfit Image</Label>
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={onOutfitUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <GlassPanel variant="custom" className={`h-20 flex flex-col items-center justify-center transition-colors cursor-pointer hover:border-primary/50 ${outfitImageId ? 'border-green-500/50 bg-green-500/5' : uploadingOutfit ? 'border-primary/50 bg-primary/5' : 'border-dashed'}`}>
                {uploadingOutfit ? (
                  <div className="text-center">
                    <Loader2 className="h-4 w-4 mx-auto mb-1 animate-spin text-primary" />
                    <p className="text-xs text-primary font-medium">Uploading...</p>
                  </div>
                ) : outfitFile && outfitImageId ? (
                  <div className="text-center">
                    <Shirt className="h-4 w-4 mx-auto mb-1 text-green-500" />
                    <p className="text-xs text-green-500 font-medium">Uploaded</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Outfit</p>
                  </div>
                )}
              </GlassPanel>
            </div>
          </div>
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