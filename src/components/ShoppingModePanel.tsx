import React, { useState } from 'react';
import { Camera, ShoppingBag, Scan, Info, Sparkles, Eye } from 'lucide-react';
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
    <Card className={`transition-all duration-300 hover:shadow-lg ${
      isActive 
        ? 'ring-2 ring-primary shadow-lg bg-gradient-to-br from-primary/5 to-secondary/5' 
        : 'hover:shadow-md bg-gradient-to-br from-card to-card/80'
    }`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
              isActive 
                ? 'bg-gradient-to-br from-primary to-secondary text-primary-foreground' 
                : 'bg-muted'
            }`}>
              <ShoppingBag className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-lg">Shopping Mode</CardTitle>
              {isActive && (
                <Badge variant="default" className="text-xs mt-1 bg-gradient-to-r from-primary to-secondary animate-pulse">
                  Active
                </Badge>
              )}
            </div>
          </div>
          <Button
            variant={isActive ? "default" : "outline"}
            size="sm"
            onClick={onToggle}
            className={`transition-all duration-300 ${
              isActive 
                ? 'bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-md' 
                : 'hover:bg-primary/10'
            }`}
          >
            {isActive ? 'Disable' : 'Enable'}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className={`text-sm transition-colors duration-300 ${
          isActive ? 'text-foreground' : 'text-muted-foreground'
        }`}>
          {isActive ? (
            <div className="space-y-2">
              <p className="font-medium">🛍️ Shopping Mode Active!</p>
              <p>Take photos of makeup products in-store for personalized recommendations and price comparisons.</p>
            </div>
          ) : (
            "Enable shopping mode to get product recommendations while browsing in stores."
          )}
        </div>

        {isActive && (
          <div className="space-y-4 animate-fade-in">
            <Button
              onClick={triggerFileInput}
              disabled={isCapturing}
              className="w-full bg-gradient-to-r from-secondary to-secondary/90 hover:from-secondary/90 hover:to-secondary shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
              variant="outline"
            >
              <Camera className="h-4 w-4 mr-2" />
              {isCapturing ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-current border-t-transparent"></div>
                  Processing...
                </div>
              ) : (
                'Scan Product'
              )}
            </Button>

            <div className="bg-gradient-to-br from-muted to-muted/80 p-4 rounded-xl border border-border/50">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                  <Info className="h-3 w-3 text-primary" />
                </div>
                <div className="text-xs space-y-2">
                  <p className="font-medium text-foreground">How Shopping Mode Works:</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <Scan className="h-3 w-3 text-primary" />
                      <span>Take a photo of makeup products</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Sparkles className="h-3 w-3 text-secondary" />
                      <span>AI identifies products and shades</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Eye className="h-3 w-3 text-accent" />
                      <span>Get personalized recommendations</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <ShoppingBag className="h-3 w-3 text-muted-foreground" />
                      <span>Compare prices and alternatives</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};