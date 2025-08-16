import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GlassPanel } from '@/components/ui/glass-panel';
import { Download, Loader2, Sparkles } from 'lucide-react';
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
  const { assets, loading: assetsLoading, fetchAssets, saveAsset, deleteAssets } = useAiAssets();
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
  }, [open]); // Remove fetchAssets dependency to prevent infinite loop

  // Effect to show helpful messages when images are uploaded
  useEffect(() => {
    if (personImageId && outfitImageId && !loading && !currentResult) {
      toast({
        title: 'Ready to Generate',
        description: 'Both images uploaded successfully! Click "Generate Try-On" to see the result.',
      });
    }
  }, [personImageId, outfitImageId, loading, currentResult, toast]);

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

  // State for tracking upload status
  const [uploadingPerson, setUploadingPerson] = useState(false);
  const [uploadingOutfit, setUploadingOutfit] = useState(false);

  // File upload handlers
  const handleFileUpload = async (file: File, type: string, setImageId: (id: string) => void, setUploading: (uploading: boolean) => void) => {
    if (!file || !validateFile(file)) return;
    try {
      setUploading(true);
      clearError();
      const result = await uploadImage(file, type);
      if (result?.id) {
        setImageId(result.id);
        toast({
          title: 'Upload Complete',
          description: `${type === BITSTUDIO_IMAGE_TYPES.PERSON ? 'Person' : 'Outfit'} image uploaded successfully`
        });
      }
    } catch (err) {
      console.error('Upload error:', err);
      toast({
        title: 'Upload Failed',
        description: `Failed to upload ${type === BITSTUDIO_IMAGE_TYPES.PERSON ? 'person' : 'outfit'} image. Please try again.`,
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const handlePersonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPersonFile(file);
      handleFileUpload(file, BITSTUDIO_IMAGE_TYPES.PERSON, setPersonImageId, setUploadingPerson);
    }
  };

  const handleOutfitUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setOutfitFile(file);
      handleFileUpload(file, BITSTUDIO_IMAGE_TYPES.OUTFIT, setOutfitImageId, setUploadingOutfit);
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

    try {
      const result = await virtualTryOn({
        person_image_id: personImageId,
        outfit_image_id: outfitImageId,
        resolution: resolution as 'standard' | 'high',
        num_images: numImages,
        prompt: prompt || undefined
      });

      if (result) {
        setCurrentResult(result);
        
        // Save the result to database (assets list is updated automatically by saveAsset)
        if (result.path) {
          const savedAsset = await saveAsset(result.path, result.id, `Virtual Try-On ${new Date().toLocaleDateString()}`);
          if (savedAsset) {
            toast({
              title: 'Try-On Complete',
              description: 'Result saved successfully',
            });
          }
        }
      }
    } catch (error) {
      console.error('Virtual try-on failed:', error);
      toast({
        title: 'Try-On Failed',
        description: 'There was an error generating your try-on. Please try again.',
        variant: 'destructive'
      });
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
      <DialogContent className="max-w-[95vw] w-[95vw] h-[100dvh] p-0 border-0 md:max-w-7xl md:h-[95vh] md:max-h-[95vh] md:overflow-hidden">
        <div className="h-full flex flex-col bg-gradient-to-br from-background via-background/95 to-muted/50 md:overflow-hidden">
          {/* Header */}
          <div className="flex-shrink-0 z-10">
            <AiStudioHeader 
              isPremium={isPremium}
              onUpgradeClick={handleUpgradeClick}
              onClose={onClose}
            />
          </div>

          {/* Main Content - Mobile First Layout */}
          <div className="flex-1 lg:flex lg:flex-row lg:min-h-0 relative">
            
            {/* Mobile: Simple scrollable container */}
            <div className="lg:hidden">
              <div className="p-3 space-y-4 pb-20 overflow-y-auto" style={{ height: 'calc(100dvh - 100px)' }}>
                {/* Results Panel - Mobile */}
                <AiStudioResultsPanel 
                  loading={loading}
                  currentResult={currentResult}
                  assets={assets}
                  remainingGenerations={remainingGenerations}
                  isPremium={isPremium}
                  onDownload={downloadImage}
                  onResultSelect={setCurrentResult}
                  onDeleteAssets={deleteAssets}
                />
                
                {/* Controls Panel */}
                <AiStudioControlsPanel 
                  loading={loading}
                  uploadingPerson={uploadingPerson}
                  uploadingOutfit={uploadingOutfit}
                  showSettings={showSettings}
                  prompt={prompt}
                  resolution={resolution}
                  remainingGenerations={remainingGenerations}
                  maxGenerations={maxGenerations}
                  isPremium={isPremium}
                  personImageId={personImageId}
                  outfitImageId={outfitImageId}
                  personFile={personFile}
                  outfitFile={outfitFile}
                  onShowSettingsToggle={() => setShowSettings(!showSettings)}
                  onPromptChange={setPrompt}
                  onResolutionChange={setResolution}
                  onGenerate={handleVirtualTryOn}
                  onPersonUpload={handlePersonUpload}
                  onOutfitUpload={handleOutfitUpload}
                />

                {/* Help Panel */}
                <AiStudioHelpPanel 
                  error={error}
                  resolution={resolution}
                  onResolutionChange={setResolution}
                />
              </div>
            </div>

            {/* Desktop Layout */}
            <div className="hidden lg:flex flex-1 gap-3 p-3 min-h-0">
              {/* Results Section - Desktop */}
              <div className="flex-1 min-h-0">
                <AiStudioResultsPanel 
                  loading={loading}
                  currentResult={currentResult}
                  assets={assets}
                  remainingGenerations={remainingGenerations}
                  isPremium={isPremium}
                  onDownload={downloadImage}
                  onResultSelect={setCurrentResult}
                  onDeleteAssets={deleteAssets}
                />
              </div>

              {/* Controls Section - Desktop */}
              <div className="w-80 flex-shrink-0 min-h-0">
                <div className="h-full space-y-3 overflow-y-auto scrollbar-thin">
                  {/* Controls Panel */}
                  <AiStudioControlsPanel 
                    loading={loading}
                    uploadingPerson={uploadingPerson}
                    uploadingOutfit={uploadingOutfit}
                    showSettings={showSettings}
                    prompt={prompt}
                    resolution={resolution}
                    remainingGenerations={remainingGenerations}
                    maxGenerations={maxGenerations}
                    isPremium={isPremium}
                    personImageId={personImageId}
                    outfitImageId={outfitImageId}
                    personFile={personFile}
                    outfitFile={outfitFile}
                    onShowSettingsToggle={() => setShowSettings(!showSettings)}
                    onPromptChange={setPrompt}
                    onResolutionChange={setResolution}
                    onGenerate={handleVirtualTryOn}
                    onPersonUpload={handlePersonUpload}
                    onOutfitUpload={handleOutfitUpload}
                  />

                  {/* Help Panel */}
                  <AiStudioHelpPanel 
                    error={error}
                    resolution={resolution}
                    onResolutionChange={setResolution}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AiStudioModal;