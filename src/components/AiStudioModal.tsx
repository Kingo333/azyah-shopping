import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GlassPanel } from '@/components/ui/glass-panel';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, Sparkles, Wand2, Upload } from 'lucide-react';
import { useBitStudio } from '@/hooks/useBitStudio';
import { BITSTUDIO_IMAGE_TYPES } from '@/lib/bitstudio-types';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAiAssets } from '@/hooks/useAiAssets';
import { useSubscription } from '@/hooks/useSubscription';
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
  const { isPremium } = useSubscription();

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
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-[95vw] max-h-[95vh] h-[95vh] p-0 border-0 md:max-w-7xl">
        <div className="h-full flex flex-col bg-gradient-to-br from-background via-background/95 to-muted/50">
          {/* Header */}
          <div className="flex-shrink-0 p-3 md:p-6 border-b border-border/50">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 md:gap-3 text-lg md:text-2xl">
                <div className="p-1.5 md:p-2 rounded-lg bg-primary/10">
                  <Wand2 className="h-4 w-4 md:h-6 md:w-6 text-primary" />
                </div>
                AI Studio
                <Badge variant="secondary" className="ml-auto text-xs">
                  <Sparkles className="h-3 w-3 mr-1" />
                  BitStudio
                </Badge>
              </DialogTitle>
            </DialogHeader>
          </div>

          <div className="flex-1 flex flex-col lg:flex-row gap-3 md:gap-6 p-3 md:p-6 overflow-hidden">
            {/* Results Section */}
            <div className="flex-1 flex flex-col space-y-2 md:space-y-4 min-h-0 lg:max-h-full overflow-auto">
              <div className="flex items-center justify-between">
                <h3 className="text-base md:text-lg font-semibold">Generated Result</h3>
                {currentResult?.path && (
                  <Button onClick={downloadImage} size="sm" variant="outline" className="text-xs md:text-sm">
                    <Download className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                    Download
                  </Button>
                )}
              </div>
              
              {/* Top Half - Ready to Generate */}
              <GlassPanel variant="custom" className="flex-1 flex items-center justify-center min-h-[200px] md:min-h-[300px]">
                {loading ? (
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 md:h-12 md:w-12 animate-spin mx-auto mb-2 md:mb-4 text-primary" />
                    <p className="text-sm md:text-lg font-medium">Generating your try-on...</p>
                    <p className="text-xs md:text-sm text-muted-foreground mt-1">This may take a few moments</p>
                  </div>
                ) : currentResult?.path ? (
                  <div className="w-full h-full flex flex-col">
                    <img 
                      src={currentResult.path} 
                      alt="Virtual try-on result"
                      className="w-full h-full object-contain rounded-lg"
                    />
                    <div className="mt-4 flex items-center justify-center">
                      <Badge variant={currentResult.status === 'completed' ? 'default' : 'secondary'}>
                        {currentResult.status}
                      </Badge>
                      {currentResult.credits_used && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          Credits used: {currentResult.credits_used}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <Sparkles className="h-12 w-12 md:h-16 md:w-16 mx-auto mb-2 md:mb-4 text-muted-foreground/50" />
                    <h4 className="text-lg md:text-xl font-medium mb-1 md:mb-2">Ready to generate</h4>
                    <p className="text-sm md:text-base text-muted-foreground">Upload both images below to start</p>
                    <div className="mt-3 text-xs text-muted-foreground">
                      {remainingGenerations > 0 ? (
                        <span>{remainingGenerations} generations remaining {isPremium ? 'today' : 'lifetime'}</span>
                      ) : (
                        <span className="text-destructive">{isPremium ? 'Daily' : 'Lifetime'} limit reached</span>
                      )}
                    </div>
                  </div>
                )}
              </GlassPanel>

              {/* Bottom Half - Results Saved */}
              <div className="space-y-2 md:space-y-3">
                <h4 className="text-sm md:text-md font-medium">Your Results</h4>
                {assets.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 md:gap-3">
                    {assets.slice(0, 12).map((asset) => (
                      <GlassPanel 
                        key={asset.id} 
                        variant="custom" 
                        className="aspect-square p-1 md:p-2 cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => setCurrentResult({ path: asset.asset_url, status: 'completed' })}
                      >
                        {asset.asset_url ? (
                          <img 
                            src={asset.asset_url} 
                            alt="Previous result" 
                            className="w-full h-full object-cover rounded-md"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted rounded-md flex items-center justify-center">
                            <Sparkles className="h-4 w-4 md:h-6 md:w-6 text-muted-foreground" />
                          </div>
                        )}
                      </GlassPanel>
                    ))}
                  </div>
                ) : (
                  <GlassPanel variant="custom" className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">No results generated yet</p>
                  </GlassPanel>
                )}
              </div>
            </div>

            {/* Controls Section */}
            <div className="w-full lg:w-80 flex-shrink-0 space-y-3 md:space-y-4 overflow-auto">
              {/* Person Upload */}
              <GlassPanel variant="custom" className="p-3 md:p-4">
                <div className="space-y-2 md:space-y-3">
                  <div className="flex items-center gap-2">
                    <Upload className="h-3 w-3 md:h-4 md:w-4" />
                    <Label className="text-sm md:text-base font-medium">Person Image</Label>
                  </div>
                  <div className="space-y-2">
                    <Input 
                      type="file" 
                      accept="image/*" 
                      onChange={handlePersonUpload}
                      className="w-full text-xs md:text-sm"
                    />
                    {personFile && (
                      <div className="mt-2 relative">
                        <img 
                          src={URL.createObjectURL(personFile)} 
                          alt="Person preview" 
                          className="w-full h-24 md:h-32 object-cover rounded-lg"
                        />
                        {personImageId && (
                          <Badge className="absolute top-1 right-1 md:top-2 md:right-2 text-xs">
                            Uploaded
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </GlassPanel>

              {/* Outfit Upload */}
              <GlassPanel variant="custom" className="p-3 md:p-4">
                <div className="space-y-2 md:space-y-3">
                  <div className="flex items-center gap-2">
                    <Upload className="h-3 w-3 md:h-4 md:w-4" />
                    <Label className="text-sm md:text-base font-medium">Outfit Image</Label>
                  </div>
                  <div className="space-y-2">
                    <Input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleOutfitUpload}
                      className="w-full text-xs md:text-sm"
                    />
                    {outfitFile && (
                      <div className="mt-2 relative">
                        <img 
                          src={URL.createObjectURL(outfitFile)} 
                          alt="Outfit preview" 
                          className="w-full h-24 md:h-32 object-cover rounded-lg"
                        />
                        {outfitImageId && (
                          <Badge className="absolute top-1 right-1 md:top-2 md:right-2 text-xs">
                            Uploaded
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </GlassPanel>

              {/* Settings Panel */}
              <GlassPanel variant="custom" className="p-3 md:p-4">
                <Button
                  variant="ghost"
                  onClick={() => setShowSettings(!showSettings)}
                  className="w-full justify-between text-sm md:text-base h-8 md:h-10"
                >
                  Advanced Settings
                  <Sparkles className="h-3 w-3 md:h-4 md:w-4" />
                </Button>
                
                {showSettings && (
                  <div className="mt-3 md:mt-4 space-y-2 md:space-y-3">
                    <div>
                      <Label className="text-xs md:text-sm">Resolution</Label>
                      <Select value={resolution} onValueChange={(value: any) => setResolution(value)}>
                        <SelectTrigger className="mt-1 h-8 md:h-10 text-xs md:text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="high">High Quality</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label className="text-xs md:text-sm">Prompt (Optional)</Label>
                      <Input
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Describe styling preferences..."
                        className="mt-1 h-8 md:h-10 text-xs md:text-sm"
                      />
                    </div>
                  </div>
                )}
              </GlassPanel>

              {/* Generation Counter */}
              <div className="text-center space-y-1">
                <p className="text-sm font-medium">
                  {remainingGenerations} / {maxGenerations} generations remaining
                </p>
                <p className="text-xs text-muted-foreground">
                  {isPremium ? 'Premium daily limit' : 'Free lifetime limit'}
                </p>
              </div>

              {/* Generate Button */}
              <Button 
                onClick={handleVirtualTryOn} 
                disabled={loading || !personImageId || !outfitImageId || remainingGenerations <= 0} 
                className="w-full h-10 md:h-12 text-sm md:text-lg"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin mr-2" />
                    Generating...
                  </>
                ) : remainingGenerations <= 0 ? (
                  isPremium ? 'Daily Limit Reached' : 'Lifetime Limit Reached'
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                    Generate Try-On
                  </>
                )}
              </Button>

              {/* Help Alert */}
              <Alert className="text-xs md:text-sm">
                <Sparkles className="h-3 w-3 md:h-4 md:w-4" />
                <AlertTitle className="text-xs md:text-sm">Pro Tips</AlertTitle>
                <AlertDescription className="text-xs">
                  <ul className="space-y-1 mt-1 md:mt-2">
                    <li>• Use front-facing, full-body person photos</li>
                    <li>• Plain backgrounds work best</li>
                    <li>• High resolution images (1024px+)</li>
                    <li>• Outfit should be clearly visible</li>
                  </ul>
                </AlertDescription>
              </Alert>

              {error && (
                <Alert variant="destructive" className="text-xs md:text-sm">
                  <AlertTitle className="text-xs md:text-sm">Error</AlertTitle>
                  <AlertDescription className="text-xs">{error}</AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
export default AiStudioModal;