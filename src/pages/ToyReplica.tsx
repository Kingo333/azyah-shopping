import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/useSubscription';
import { ToyReplicaUploader } from '@/components/ToyReplicaUploader';
import { ZiinaPaymentButton } from '@/components/ZiinaPaymentButton';
import { AlertCircle, Crown, Sparkles, Upload, Download, Trash2 } from 'lucide-react';

interface UploadedImage {
  id: string;
  url: string;
  name: string;
}

const ToyReplica: React.FC = () => {
  const { toast } = useToast();
  const { isPremium } = useSubscription();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);

  // Generation limits based on user type
  const maxGenerations = isPremium ? 999 : 4; // Unlimited for premium, 4 for free
  const remainingGenerations = Math.max(0, maxGenerations - uploadedImages.length);

  const handleImageUpload = (newImages: UploadedImage[]) => {
    setUploadedImages(newImages);
  };

  const clearImages = () => {
    setUploadedImages([]);
    setGeneratedImages([]);
  };

  const generateReplicas = async () => {
    if (uploadedImages.length === 0) {
      toast({
        title: 'No Images',
        description: 'Please upload at least one image to generate replicas',
        variant: 'destructive'
      });
      return;
    }

    if (remainingGenerations <= 0) {
      toast({
        title: 'Generation Limit Reached',
        description: isPremium 
          ? 'You have reached your generation limit' 
          : 'You have reached your lifetime limit of 4 generations. Upgrade to Premium for unlimited access.',
        variant: 'destructive'
      });
      return;
    }

    setIsGenerating(true);
    try {
      // Simulate generation process
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Mock generated images
      const mockGeneratedImages = uploadedImages.map((_, index) => 
        `https://picsum.photos/400/400?random=${Date.now() + index}`
      );
      
      setGeneratedImages(mockGeneratedImages);
      
      toast({
        title: 'Generation Complete',
        description: `Successfully generated ${mockGeneratedImages.length} toy replica(s)`,
      });
    } catch (error) {
      toast({
        title: 'Generation Failed',
        description: 'There was an error generating your toy replicas. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl p-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Toy Replica Generator</h1>
          <p className="text-muted-foreground">
            Transform your photos into adorable toy replicas using AI
          </p>
        </div>

        {/* Upload Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Images
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ToyReplicaUploader
              onImageUpload={handleImageUpload}
              fileInputRef={fileInputRef}
              uploadedImages={uploadedImages}
              onClear={clearImages}
            />
          </CardContent>
        </Card>

        {/* Generation Limits */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {isPremium ? 'Premium User' : `${remainingGenerations} generations remaining`}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={generateReplicas}
                  disabled={isGenerating || uploadedImages.length === 0 || remainingGenerations <= 0}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  {isGenerating ? (
                    <>
                      <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Replicas
                    </>
                  )}
                </Button>
                {!isPremium && remainingGenerations <= 0 && (
                  <ZiinaPaymentButton
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                    size="lg"
                  >
                    <Crown className="h-4 w-4 mr-2" />
                    Unlock Unlimited Access — 40 AED/month
                  </ZiinaPaymentButton>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Generated Results */}
        {generatedImages.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Generated Toy Replicas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {generatedImages.map((imageUrl, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={imageUrl}
                      alt={`Generated replica ${index + 1}`}
                      className="w-full h-64 object-cover rounded-lg"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = imageUrl;
                          link.download = `toy-replica-${index + 1}.png`;
                          link.click();
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ToyReplica;
