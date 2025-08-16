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
      <DialogContent className="max-w-[95vw] w-[95vw] h-[100dvh] max-h-[100dvh] p-0 border-0 md:max-w-7xl md:h-[95vh] md:max-h-[95vh] md:overflow-hidden">
        <div className="h-full flex flex-col bg-gradient-to-br from-background via-background/95 to-muted/50">
          {/* Header */}
          <div className="flex-shrink-0 z-10">
            <AiStudioHeader 
              isPremium={isPremium}
              onUpgradeClick={handleUpgradeClick}
              onClose={onClose}
            />
          </div>

          {/* Main Content - Mobile First Layout */}
          <div className="flex-1 flex flex-col lg:flex-row min-h-0 relative">
            
            {/* Mobile: Single scroll container - Remove all height restrictions */}
            <div className="lg:hidden flex-1 overflow-y-auto" 
                 style={{ 
                   touchAction: 'pan-y', 
                   WebkitOverflowScrolling: 'touch',
                   overscrollBehavior: 'contain'
                 }}>
              <div className="p-3 space-y-4 pb-20">
                {/* Current Result Display - Mobile (at very top) */}
                <div className="min-h-[250px]">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-semibold">Generated Result</h3>
                    {currentResult?.path && (
                      <Button onClick={downloadImage} size="sm" variant="outline" className="h-8 text-xs">
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                    )}
                  </div>
                  <GlassPanel variant="custom" className="h-[250px] flex items-center justify-center">
                    {loading ? (
                      <div className="text-center space-y-3">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                        <div>
                          <p className="text-base font-medium">Generating your try-on...</p>
                          <p className="text-xs text-muted-foreground">This may take a few moments</p>
                        </div>
                      </div>
                    ) : currentResult?.path ? (
                      <div className="w-full h-full flex flex-col p-3">
                        <img 
                          src={currentResult.path} 
                          alt="Virtual try-on result"
                          className="w-full flex-1 object-contain rounded-lg"
                        />
                        <div className="mt-2 flex items-center justify-center gap-2 flex-shrink-0">
                          <Badge variant={currentResult.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                            {currentResult.status}
                          </Badge>
                          {currentResult.credits_used && (
                            <span className="text-xs text-muted-foreground">
                              Credits: {currentResult.credits_used}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center space-y-3 p-4">
                        <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/50" />
                        <div>
                          <h4 className="text-lg font-medium mb-1">Ready to generate</h4>
                          <p className="text-sm text-muted-foreground">Upload both images to start</p>
                          <div className="mt-2 text-xs text-muted-foreground">
                            {remainingGenerations > 0 ? (
                              <span>{remainingGenerations} remaining {isPremium ? 'today' : 'lifetime'}</span>
                            ) : (
                              <span className="text-destructive">{isPremium ? 'Daily' : 'Lifetime'} limit reached</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </GlassPanel>
                </div>
                
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

                {/* Results Gallery - Mobile (after help panel) */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Your Results</h4>
                  {assets.length > 0 ? (
                    <div className="grid grid-cols-6 sm:grid-cols-8 gap-1">
                      {assets.slice(0, 20).map((asset) => (
                        <GlassPanel 
                          key={asset.id} 
                          variant="custom" 
                          className="aspect-square p-0.5 cursor-pointer hover:scale-105 transition-transform"
                          onClick={() => setCurrentResult({ path: asset.asset_url, status: 'completed' })}
                        >
                          {asset.asset_url ? (
                            <img 
                              src={asset.asset_url} 
                              alt="Previous result" 
                              className="w-full h-full object-cover rounded-sm"
                            />
                          ) : (
                            <div className="w-full h-full bg-muted rounded-sm flex items-center justify-center">
                              <Sparkles className="h-3 w-3 text-muted-foreground" />
                            </div>
                          )}
                        </GlassPanel>
                      ))}
                    </div>
                  ) : (
                    <GlassPanel variant="custom" className="p-3 text-center h-20 flex items-center justify-center">
                      <p className="text-xs text-muted-foreground">No results generated yet</p>
                    </GlassPanel>
                  )}
                </div>
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
                />
              </div>

              {/* Controls Section - Desktop */}
              <div className="w-80 flex-shrink-0 min-h-0">
                <div className="h-full space-y-3 overflow-y-auto scrollbar-thin">
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AiStudioModal;