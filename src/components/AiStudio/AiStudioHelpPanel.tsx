import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Sparkles, AlertCircle } from 'lucide-react';

interface AiStudioHelpPanelProps {
  error: string | null;
}

export const AiStudioHelpPanel: React.FC<AiStudioHelpPanelProps> = ({
  error
}) => {
  return (
    <div className="space-y-3">
      {/* Pro Tips */}
      <Alert className="text-sm">
        <Sparkles className="h-4 w-4" />
        <AlertTitle className="text-sm">Pro Tips</AlertTitle>
        <AlertDescription className="text-xs">
          <ul className="space-y-1 mt-2">
            <li>• Use front-facing, full-body person photos</li>
            <li>• Plain backgrounds work best</li>
            <li>• High resolution images (1024px+)</li>
            <li>• Outfit should be clearly visible</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive" className="text-sm">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="text-sm">Error</AlertTitle>
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};