
import React, { useState } from 'react';
import { X, Sparkles, Upload, Palette, Download, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useSubscription } from '@/hooks/useSubscription';
import { ZiinaPaymentButton } from '@/components/ZiinaPaymentButton';

interface AiStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AiStudioModal({ isOpen, onClose }: AiStudioModalProps) {
  const { isPremium, loading: subscriptionLoading } = useSubscription();
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
    }
  };

  const handleProcess = async () => {
    if (!selectedImage || !isPremium) return;
    
    setIsProcessing(true);
    // Simulate processing
    setTimeout(() => {
      setIsProcessing(false);
    }, 3000);
  };

  if (subscriptionLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent" />
              AI Studio
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {!isPremium ? (
          <Card>
            <CardContent className="p-6 text-center space-y-4">
              <div className="text-accent mb-4">
                <Sparkles className="w-12 h-12 mx-auto" />
              </div>
              <h3 className="text-lg font-semibold">Premium Feature</h3>
              <p className="text-muted-foreground">
                AI Studio requires a Premium subscription to access advanced AI-powered editing tools.
              </p>
              <ZiinaPaymentButton />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Upload Section */}
              <Card>
                <CardContent className="p-6">
                  <div className="text-center space-y-4">
                    <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                    <div>
                      <h3 className="font-semibold mb-2">Upload Image</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Upload an image to start editing with AI
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="image-upload"
                      />
                      <label htmlFor="image-upload">
                        <Button variant="outline" className="cursor-pointer">
                          Choose Image
                        </Button>
                      </label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tools Section */}
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Palette className="w-5 h-5 text-accent" />
                      <h3 className="font-semibold">AI Tools</h3>
                    </div>
                    <div className="space-y-2">
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        disabled={!selectedImage || isProcessing}
                        onClick={handleProcess}
                      >
                        {isProcessing ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4 mr-2" />
                        )}
                        Background Removal
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        disabled={!selectedImage || isProcessing}
                      >
                        <Palette className="w-4 h-4 mr-2" />
                        Color Enhancement
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        disabled={!selectedImage || isProcessing}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Upscale Image
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {selectedImage && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4">Preview</h3>
                  <div className="relative">
                    <img
                      src={URL.createObjectURL(selectedImage)}
                      alt="Preview"
                      className="max-w-full h-auto rounded-lg"
                    />
                    {isProcessing && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                        <div className="text-white text-center">
                          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                          <p>Processing with AI...</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
