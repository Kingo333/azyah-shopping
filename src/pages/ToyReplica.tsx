import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useZiinaPayments } from '@/hooks/useZiinaPayments';
import { useAuth } from '@/contexts/AuthContext';
import { ToyReplicaUploader } from '@/components/ToyReplicaUploader';
import { BackButton } from '@/components/ui/back-button';
import { Crown, Sparkles, Upload, Zap, Star, AlertCircle } from 'lucide-react';
import { ZiinaPaymentButton } from '@/components/ZiinaPaymentButton';

interface UploadedImage {
  url: string;
  file: File;
}

const ToyReplica: React.FC = () => {
  const { user } = useAuth();
  const { isPremium } = useZiinaPayments();

  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationCount, setGenerationCount] = useState(0);
  const maxGenerations = isPremium ? Infinity : 4;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (newImages: UploadedImage[]) => {
    setUploadedImages(newImages);
  };

  const handleGenerate = async () => {
    if (uploadedImages.length === 0) {
      setGenerationError('Please upload images first.');
      return;
    }

    if (generationCount >= maxGenerations && !isPremium) {
      setGenerationError('You have reached the maximum number of free generations. Upgrade to premium for unlimited generations.');
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);

    // Simulate AI generation (replace with actual API call)
    await new Promise(resolve => setTimeout(resolve, 3000));

    const newImage = 'https://placekitten.com/512/512'; // Placeholder image
    setGeneratedImage(newImage);
    setIsGenerating(false);
    setGenerationCount(prevCount => prevCount + 1);
  };

  const handleClearImages = () => {
    setUploadedImages([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Reset file input
    }
    setGeneratedImage(null);
    setGenerationError(null);
  };

  const remainingGenerations = maxGenerations === Infinity ? 'Unlimited' : maxGenerations - generationCount;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-2xl p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <BackButton />
          <h1 className="text-2xl font-bold">Toy Replica</h1>
        </div>

        <div className="space-y-6">
          {/* Hero Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Generate AI Toy Replicas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Upload photos of your toy and let our AI generate unique replicas.
              </p>
              <div className="flex items-center gap-2">
                {isPremium ? (
                  <Badge variant="secondary">
                    <Crown className="h-4 w-4 mr-2" />
                    Premium: Unlimited Generations
                  </Badge>
                ) : (
                  <Badge variant="outline">
                    <Zap className="h-4 w-4 mr-2" />
                    {remainingGenerations} Generations Remaining
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Uploader Card */}
          <Card>
            <CardHeader>
              <CardTitle>Upload Toy Photos</CardTitle>
            </CardHeader>
            <CardContent>
              <ToyReplicaUploader
                onImageUpload={handleImageUpload}
                fileInputRef={fileInputRef}
                uploadedImages={uploadedImages}
                onClear={handleClearImages}
              />
            </CardContent>
          </Card>

          {/* Results Card */}
          {generatedImage && (
            <Card>
              <CardHeader>
                <CardTitle>Generated Replica</CardTitle>
              </CardHeader>
              <CardContent>
                <img src={generatedImage} alt="Generated Toy Replica" className="w-full rounded-md" />
              </CardContent>
            </Card>
          )}

          {/* Error Message */}
          {generationError && (
            <div className="p-4 rounded-md bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {generationError}
            </div>
          )}

          {/* Generate Button */}
          <Button
            className="w-full"
            onClick={handleGenerate}
            disabled={isGenerating || (generationCount >= maxGenerations && !isPremium)}
          >
            {isGenerating ? 'Generating...' : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Replica
              </>
            )}
          </Button>

          {/* Upgrade Button */}
          {!isPremium && (
            <ZiinaPaymentButton
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
              size="lg"
              message="Premium subscription upgrade"
            >
              <Crown className="h-4 w-4 mr-2" />
              Unlock Unlimited Generations
            </ZiinaPaymentButton>
          )}
        </div>
      </div>
    </div>
  );
};

export default ToyReplica;
