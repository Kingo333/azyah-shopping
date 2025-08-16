import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { useBitStudio } from '@/hooks/useBitStudio';
import { BITSTUDIO_IMAGE_TYPES } from '@/lib/bitstudio-types';
import { useToast } from '@/hooks/use-toast';
import { useAiAssets } from '@/hooks/useAiAssets';
import { useSubscription } from '@/hooks/useSubscription';
import { AiStudioHeader } from './AiStudio/AiStudioHeader';
import { AiStudioResultsPanel } from './AiStudio/AiStudioResultsPanel';
import { AiStudioUploadPanel } from './AiStudio/AiStudioUploadPanel';
import { AiStudioControlsPanel } from './AiStudio/AiStudioControlsPanel';
import { AiStudioHelpPanel } from './AiStudio/AiStudioHelpPanel';

export interface AiStudioModalProps {
  open: boolean;
  onClose: () => void;
  trigger?: React.ReactNode;
}

const AiStudioModal: React.FC<AiStudioModalProps> = ({
  open,
  onClose,
  trigger
}) => {
  // File uploads
  const [personFile, setPersonFile] = useState<File | null>(null);
  const [outfitFile, setOutfitFile] = useState<File | null>(null);
  const [outfitUrl, setOutfitUrl] = useState('');

  // Form data
  const [prompt, setPrompt] = useState('');
  const [resolution, setResolution] = useState<'standard' | 'high'>('standard');
  const [numImages, setNumImages] = useState(1);
  const [showSettings, setShowSettings] = useState(false);

  // Results
  const [currentResult, setCurrentResult] = useState<any>(null);
  const [personImageId, setPersonImageId] = useState<string | null>(null);
  const [outfitImageId, setOutfitImageId] = useState<string | null>(null);

  const {
    loading,
    error,
    uploadImage,
    virtualTryOn,
    clearError
  } = useBitStudio();
  
  const { toast } = useToast();
  const { assets, loading: assetsLoading, fetchAssets, saveAsset } = useAiAssets();
  const { isPremium, createPaymentIntent } = useSubscription();

  // Generation limits based on user type
  const maxGenerations = isPremium ? 20 : 4;
  
  // For premium users, count today's generations; for free users, count all lifetime generations
  const relevantAssets = isPremium 
    ? assets.filter(asset => {
        const assetDate = new Date(asset.created_at);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return assetDate >= today;
      })
    : assets;
    
  const remainingGenerations = maxGenerations - relevantAssets.length;

  useEffect(() => {
    if (open) {
      fetchAssets();
    }
  }, [open, fetchAssets]);

  // File validation helper
  const validateFile = (file: File): boolean => {
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Please select an image file smaller than 10MB',
        variant: 'destructive'
      });
      return false;
    }
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File Type',
        description: 'Please select an image file',
        variant: 'destructive'
      });
      return false;
    }
    return true;
  };

  // File upload handlers
  const handleFileUpload = async (file: File, type: string, setImageId: (id: string) => void) => {
    if (!file || !validateFile(file)) return;
    try {
      clearError();
      const result = await uploadImage(file, type);
      if (result?.id) {
        setImageId(result.id);
        toast({
          title: 'Upload Complete',
          description: 'Image uploaded successfully'
        });
      }
    } catch (err) {
      console.error('Upload error:', err);
    }
  };

  const handlePersonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPersonFile(file);
      handleFileUpload(file, BITSTUDIO_IMAGE_TYPES.PERSON, setPersonImageId);
    }
  };

  const handleOutfitUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setOutfitFile(file);
      handleFileUpload(file, BITSTUDIO_IMAGE_TYPES.OUTFIT, setOutfitImageId);
    }
  };

  // Virtual Try-On handler
  const handleVirtualTryOn = async () => {
    if (!personImageId || !outfitImageId) {
      toast({
        title: 'Missing Images',
        description: 'Please upload both person and outfit images',
        variant: 'destructive'
      });
      return;
    }

    if (remainingGenerations <= 0) {
      toast({
        title: 'Generation Limit Reached',
        description: isPremium 
          ? 'You have reached your daily limit of 20 try-ons' 
          : 'You have reached your lifetime limit of 4 generations. Upgrade to Premium for 20 daily try-ons.',
        variant: 'destructive'
      });
      return;
    }

    const result = await virtualTryOn({
      person_image_id: personImageId,
      outfit_image_id: outfitImageId,
      resolution: resolution as 'standard' | 'high',
      num_images: numImages,
      prompt: prompt || undefined
    });

    if (result) {
      setCurrentResult(result);
      // Save the result
      if (result.path) {
        await saveAsset(result.path, result.id, `Virtual Try-On ${new Date().toLocaleDateString()}`);
      }
    }
  };

  const downloadImage = async () => {
    if (!currentResult?.path) return;
    try {
      const response = await fetch(currentResult.path);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bitstudio-tryon-${currentResult.id}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      toast({
        title: 'Download Failed',
        description: 'Could not download the image',
        variant: 'destructive'
      });
    }
  };

  const handleUpgradeClick = async () => {
    await createPaymentIntent();
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-[95vw] max-h-[95vh] h-[95vh] p-0 border-0 md:max-w-7xl">
        <div className="h-full flex flex-col bg-gradient-to-br from-background via-background/95 to-muted/50">
          {/* Header */}
          <AiStudioHeader 
            isPremium={isPremium}
            onUpgradeClick={handleUpgradeClick}
          />

          {/* Main Content */}
          <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 md:p-6 min-h-0">
            {/* Results Section */}
            <div className="flex-1 min-h-0 overflow-auto">
            <AiStudioResultsPanel 
              loading={loading}
              currentResult={currentResult}
              assets={assets}
              remainingGenerations={remainingGenerations}
              isPremium={isPremium}
              onDownload={downloadImage}
              onResultSelect={setCurrentResult}
            />

            </div>

            {/* Controls Section */}
            <div className="w-full lg:w-96 flex-shrink-0 flex flex-col gap-4 max-h-full overflow-y-auto p-1">
              {/* Upload Panel */}
              <AiStudioUploadPanel 
                personFile={personFile}
                outfitFile={outfitFile}
                personImageId={personImageId}
                outfitImageId={outfitImageId}
                onPersonUpload={handlePersonUpload}
                onOutfitUpload={handleOutfitUpload}
              />

              {/* Controls Panel */}
              <AiStudioControlsPanel 
                loading={loading}
                showSettings={showSettings}
                prompt={prompt}
                resolution={resolution}
                remainingGenerations={remainingGenerations}
                maxGenerations={maxGenerations}
                isPremium={isPremium}
                personImageId={personImageId}
                outfitImageId={outfitImageId}
                onShowSettingsToggle={() => setShowSettings(!showSettings)}
                onPromptChange={setPrompt}
                onResolutionChange={setResolution}
                onGenerate={handleVirtualTryOn}
              />

              {/* Help Panel */}
              <AiStudioHelpPanel error={error} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AiStudioModal;