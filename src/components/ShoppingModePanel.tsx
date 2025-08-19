import React, { useState } from 'react';
import { Camera, ShoppingBag, Scan, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface ShoppingModePanelProps {
  onPhotoCapture: (file: File, mode: 'analysis' | 'shopping') => void;
  isActive: boolean;
  onToggle: () => void;
}

export const ShoppingModePanel: React.FC<ShoppingModePanelProps> = ({
  onPhotoCapture,
  isActive,
  onToggle
}) => {
  const [isCapturing, setIsCapturing] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        onPhotoCapture(file, 'shopping');
        toast.success('Product photo uploaded for analysis');
      } else {
        toast.error('Please upload an image file');
      }
    }
  };

  const triggerFileInput = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // Use rear camera on mobile
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        if (file.type.startsWith('image/')) {
          onPhotoCapture(file, 'shopping');
          toast.success('Product photo uploaded for analysis');
        } else {
          toast.error('Please upload an image file');
        }
      }
    };
    input.click();
  };

  return (
    <Card className={`transition-all duration-200 ${isActive ? 'ring-2 ring-primary' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            <CardTitle className="text-lg">Shopping Mode</CardTitle>
            {isActive && <Badge variant="default" className="text-xs">Active</Badge>}
          </div>
          <Button
            variant={isActive ? "default" : "outline"}
            size="sm"
            onClick={onToggle}
          >
            {isActive ? 'Disable' : 'Enable'}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          {isActive ? (
            "Take photos of makeup products in-store for personalized recommendations!"
          ) : (
            "Enable shopping mode to get product recommendations while browsing in stores."
          )}
        </div>

        {isActive && (
          <>
            <div className="space-y-2">
              <Button
                onClick={triggerFileInput}
                disabled={isCapturing}
                className="w-full"
                variant="outline"
              >
                <Camera className="h-4 w-4 mr-2" />
                {isCapturing ? 'Processing...' : 'Scan Product'}
              </Button>
            </div>

            <div className="bg-muted p-3 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium mb-1">How it works:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Take a photo of makeup products</li>
                    <li>AI identifies products and shades</li>
                    <li>Get personalized recommendations</li>
                    <li>Compare prices and alternatives</li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};