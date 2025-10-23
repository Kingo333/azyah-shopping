import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Loader2, CheckCircle2, XCircle, Image, Upload, Save, Sparkles } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

export type SaveStep = 
  | 'preparing' 
  | 'rendering' 
  | 'uploading' 
  | 'saving' 
  | 'success' 
  | 'error';

interface SaveProgressModalProps {
  isOpen: boolean;
  currentStep: SaveStep;
  progress?: number;
  errorMessage?: string;
  onRetry?: () => void;
  onClose?: () => void;
}

const stepConfig = {
  preparing: {
    icon: Sparkles,
    label: 'Preparing images...',
    description: 'Loading your outfit items',
  },
  rendering: {
    icon: Image,
    label: 'Rendering outfit...',
    description: 'Creating preview image',
  },
  uploading: {
    icon: Upload,
    label: 'Uploading to cloud...',
    description: 'Saving your creation',
  },
  saving: {
    icon: Save,
    label: 'Saving outfit...',
    description: 'Almost done!',
  },
  success: {
    icon: CheckCircle2,
    label: 'Success!',
    description: 'Your outfit has been saved',
  },
  error: {
    icon: XCircle,
    label: 'Save Failed',
    description: 'Something went wrong',
  },
};

export const SaveProgressModal: React.FC<SaveProgressModalProps> = ({
  isOpen,
  currentStep,
  progress = 0,
  errorMessage,
  onRetry,
  onClose,
}) => {
  const config = stepConfig[currentStep];
  const Icon = config.icon;
  const isError = currentStep === 'error';
  const isSuccess = currentStep === 'success';
  const isWorking = !isError && !isSuccess;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-col items-center justify-center gap-4 py-8">
          {/* Icon */}
          <div className={`
            relative flex items-center justify-center w-16 h-16 rounded-full
            ${isError ? 'bg-destructive/10' : isSuccess ? 'bg-green-500/10' : 'bg-primary/10'}
          `}>
            <Icon className={`
              w-8 h-8
              ${isError ? 'text-destructive' : isSuccess ? 'text-green-500' : 'text-primary'}
              ${isWorking ? 'animate-pulse' : ''}
            `} />
            {isWorking && (
              <Loader2 className="absolute w-16 h-16 text-primary/30 animate-spin" />
            )}
          </div>

          {/* Status Text */}
          <div className="text-center space-y-1">
            <h3 className="text-lg font-semibold">{config.label}</h3>
            <p className="text-sm text-muted-foreground">
              {isError && errorMessage ? errorMessage : config.description}
            </p>
          </div>

          {/* Progress Bar */}
          {isWorking && (
            <div className="w-full space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-center text-muted-foreground">
                {Math.round(progress)}%
              </p>
            </div>
          )}

          {/* Actions */}
          {isError && onRetry && (
            <div className="flex gap-2 w-full">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button onClick={onRetry} className="flex-1">
                Retry
              </Button>
            </div>
          )}
          
          {isSuccess && onClose && (
            <Button onClick={onClose} className="w-full">
              Done
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
