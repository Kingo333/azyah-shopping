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
    <Card className={`transition-all duration-300 ${
      isActive 
        ? 'ring-1 ring-primary bg-gradient-to-br from-primary/5 to-secondary/5' 
        : 'bg-card'
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            <CardTitle className="text-base">Shopping Mode</CardTitle>
            {isActive && <Badge variant="default" className="text-xs">Active</Badge>}
          </div>
          <Button
            variant={isActive ? "default" : "outline"}
            size="sm"
            onClick={onToggle}
            className="text-xs px-3"
          >
            {isActive ? 'Disable' : 'Enable'}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className={isActive ? "space-y-4" : "pb-2"}>
        {isActive && (
          <div className="space-y-3">
            <Button
              onClick={triggerFileInput}
              disabled={isCapturing}
              className="w-full"
              size="sm"
              variant="outline"
            >
              <Camera className="h-3 w-3 mr-2" />
              {isCapturing ? 'Processing...' : 'Scan Product'}
            </Button>

            <div className="bg-muted/50 p-3 rounded-lg text-xs space-y-2">
              <p className="font-medium mb-1">✨ Smart Shopping Features:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Product recognition & shade matching</li>
                <li>• Price comparison across tiers</li>
                <li>• Alternative recommendations</li>
                <li>• Real-time availability checks</li>
              </ul>
            </div>
          </div>
        )}
        
        {!isActive && (
          <div className="text-xs text-muted-foreground space-y-2">
            <p className="font-medium">🛍️ Smart Shopping Assistant</p>
            <p>Take photos of makeup products in-store and get:</p>
            <ul className="space-y-1 ml-2">
              <li>• Personalized shade matching</li>
              <li>• Price comparisons (drugstore/mid/premium)</li>
              <li>• Alternative product suggestions</li>
              <li>• Ingredient compatibility checks</li>
              <li>• User reviews and ratings</li>
            </ul>
            <p className="text-xs text-orange-600 mt-2">⚠️ Always patch test new products</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};