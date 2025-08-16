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
    <div className="space-y-2">
      {/* Pro Tips */}
      <Alert className="text-xs p-3">
        <Sparkles className="h-3 w-3" />
        <AlertTitle className="text-xs">Pro Tips</AlertTitle>
        <AlertDescription className="text-xs">
          <ul className="space-y-0.5 mt-1">
            <li>• Front-facing, full-body photos</li>
            <li>• Plain backgrounds work best</li>
            <li>• High resolution (1024px+)</li>
            <li>• Clear outfit visibility</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive" className="text-xs p-3">
          <AlertCircle className="h-3 w-3" />
          <AlertTitle className="text-xs">Error</AlertTitle>
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};