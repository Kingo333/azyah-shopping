import React, { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Upload, Sparkles, Crown, X, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useZiinaPayments } from '@/hooks/useZiinaPayments';
import { AiStudioUploadPanel } from './AiStudio/AiStudioUploadPanel';
import { AiStudioControlsPanel } from './AiStudio/AiStudioControlsPanel';
import { AiStudioResultsPanel } from './AiStudio/AiStudioResultsPanel';
import { AiStudioHelpPanel } from './AiStudio/AiStudioHelpPanel';

interface AiStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ImageUploadResult {
  url: string;
  file: File;
}

const AiStudioModal: React.FC<AiStudioModalProps> = ({ isOpen, onClose }) => {
  const { toast } = useToast();
  const { isPremium, createPayment } = useZiinaPayments();
  const [uploadedImage, setUploadedImage] = useState<ImageUploadResult | null>(null);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<'upload' | 'controls' | 'results' | 'help'>('upload');
  const [prompt, setPrompt] = useState('');
  const [numImages, setNumImages] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isMaxReached, setIsMaxReached] = useState(false);

  const handleImageUpload = (result: ImageUploadResult) => {
    setUploadedImage(result);
    setActivePanel('controls');
  };

  const handleControlsSubmit = async (prompt: string, numImages: number) => {
    setPrompt(prompt);
    setNumImages(numImages);
    setIsGenerating(true);
    setGenerationError(null);

    // Simulate AI image generation (replace with actual API call)
    await simulateImageGeneration(prompt, numImages);
  };

  const simulateImageGeneration = async (prompt: string, numImages: number) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newImages = Array.from({ length: numImages }, (_, i) => `https://picsum.photos/256?random=${Math.random()}`);
        setGeneratedImages(newImages);
        setIsGenerating(false);
        setActivePanel('results');
        resolve(null);
      }, 2000);
    });
  };

  const handlePanelChange = (panel: 'upload' | 'controls' | 'results' | 'help') => {
    setActivePanel(panel);
  };

  const handleUpgradeClick = () => {
    createPayment(40, false, 'Premium subscription upgrade');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Sparkles className="mr-2 h-6 w-6 text-yellow-500" />
            AI Studio
            {isPremium ? (
              <Badge variant="secondary" className="ml-2 flex items-center gap-1">
                <Crown className="h-3 w-3" />
                Premium
              </Badge>
            ) : null}
          </DialogTitle>
        </DialogHeader>

        <Card className="mb-4">
          <CardContent className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {isPremium ? (
                <>
                  <Sparkles className="h-5 w-5 text-green-500" />
                  <p className="text-sm">
                    You have unlimited access to AI image generation!
                  </p>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                  <p className="text-sm">
                    Upgrade to Premium for unlimited access!
                  </p>
                </>
              )}
            </div>
            {!isPremium && (
              <Button size="sm" onClick={handleUpgradeClick}>
                <Crown className="mr-2 h-4 w-4" />
                Upgrade
              </Button>
            )}
          </CardContent>
        </Card>

        <Separator className="mb-4" />

        {/* Panel Content */}
        {activePanel === 'upload' && (
          <AiStudioUploadPanel onImageUpload={handleImageUpload} />
        )}
        {activePanel === 'controls' && uploadedImage && (
          <AiStudioControlsPanel
            uploadedImageUrl={uploadedImage.url}
            onSubmit={handleControlsSubmit}
            isGenerating={isGenerating}
          />
        )}
        {activePanel === 'results' && generatedImages.length > 0 && (
          <AiStudioResultsPanel
            generatedImages={generatedImages}
            prompt={prompt}
            numImages={numImages}
            onBack={() => setActivePanel('controls')}
          />
        )}
        {activePanel === 'help' && (
          <AiStudioHelpPanel onBack={() => setActivePanel('upload')} />
        )}

        {/* Panel Navigation */}
        <div className="mt-4 flex justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (activePanel === 'controls') setActivePanel('upload');
              else if (activePanel === 'results') setActivePanel('controls');
              else if (activePanel === 'help') setActivePanel('upload');
            }}
            disabled={activePanel === 'upload'}
          >
            Back
          </Button>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AiStudioModal;
