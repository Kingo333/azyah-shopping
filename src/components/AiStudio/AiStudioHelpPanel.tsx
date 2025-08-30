import React, { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GlassPanel } from '@/components/ui/glass-panel';
import { Sparkles, AlertCircle, Settings, ChevronDown, ChevronUp } from 'lucide-react';
interface AiStudioHelpPanelProps {
  error: string | null;
  resolution: 'standard' | 'high';
  onResolutionChange: (value: 'standard' | 'high') => void;
}
export const AiStudioHelpPanel: React.FC<AiStudioHelpPanelProps> = ({
  error,
  resolution,
  onResolutionChange
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  return <div className="space-y-2">
      {/* Pro Tips */}
      <Alert className="text-xs p-3 shadow-md shadow-black/15 border border-white/30 md:shadow-none md:border-border">
        <Sparkles className="h-3 w-3" />
        <AlertTitle className="text-xs">Pro Tips</AlertTitle>
        <AlertDescription className="text-xs">
          <ul className="space-y-0.5 mt-1">
            <li className="flex items-center gap-2">
              • Front-facing, full-body photos
              <img 
                src="/lovable-uploads/5fe53348-b875-4bf3-a608-f6b536718c8b.png" 
                alt="Example of front-facing, full-body photo"
                className="w-4 h-6 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => window.open('/lovable-uploads/5fe53348-b875-4bf3-a608-f6b536718c8b.png', '_blank')}
                title="Click to view example"
              />
            </li>
            <li>• Plain backgrounds work best</li>
            <li>• High resolution </li>
            <li>• Clear outfit visibility</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Advanced Settings */}
      <GlassPanel variant="custom" className="p-3 shadow-md shadow-black/15 border border-white/30 md:shadow-none md:border-white/20">
        <Button variant="ghost" onClick={() => setShowAdvanced(!showAdvanced)} className="w-full justify-between text-xs h-7 p-2">
          <div className="flex items-center gap-2">
            <Settings className="h-3 w-3" />
            Advanced Settings
          </div>
          {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Button>
        
        {showAdvanced && <div className="mt-3 space-y-2">
            <div>
              <Label className="text-xs">Resolution</Label>
              <Select value={resolution} onValueChange={onResolutionChange}>
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard (1 credit)</SelectItem>
                  <SelectItem value="high">High Quality (2 credits)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              High quality mode consumes 2 credits per generation
            </p>
          </div>}
      </GlassPanel>

      {/* Error Display */}
      {error && <Alert variant="destructive" className="text-xs p-3 shadow-md shadow-red-500/15 border border-red-500/30 md:shadow-none">
          <AlertCircle className="h-3 w-3" />
          <AlertTitle className="text-xs">Error</AlertTitle>
          <AlertDescription className="text-xs">
            {error}
            {error.includes('load failed') && <div className="mt-1">
                <p>• Check your internet connection</p>
                <p>• Ensure images are valid JPEG/PNG files</p>
                <p>• Try uploading smaller images (&lt;10MB)</p>
              </div>}
          </AlertDescription>
        </Alert>}
    </div>;
};