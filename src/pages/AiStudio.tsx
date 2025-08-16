import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { GlassPanel } from '@/components/ui/glass-panel';
import { 
  Upload, 
  Image, 
  Loader2, 
  Download, 
  Save,
  RefreshCw,
  Sparkles,
  Crown,
  Info,
  Settings,
  Zap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useBitStudio } from '@/hooks/useBitStudio';
import { useAiAssets } from '@/hooks/useAiAssets';
import { BITSTUDIO_IMAGE_TYPES } from '@/lib/bitstudio-types';

const AiStudio = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { uploadImage, virtualTryOn, loading, healthCheck } = useBitStudio();
  const { assets, saveAsset } = useAiAssets();
  
  const [personImage, setPersonImage] = useState<{ file: File; preview: string; id?: string } | null>(null);
  const [outfitImage, setOutfitImage] = useState<{ file?: File; preview: string; id?: string; url?: string } | null>(null);
  const [outfitUrl, setOutfitUrl] = useState('');
  const [resolution, setResolution] = useState<'standard' | 'high'>('standard');
  const [numImages, setNumImages] = useState(1);
  const [prompt, setPrompt] = useState('');
  const [currentResult, setCurrentResult] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadingPerson, setUploadingPerson] = useState(false);
  const [uploadingOutfit, setUploadingOutfit] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const personFileRef = useRef<HTMLInputElement>(null);
  const outfitFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkHealth = async () => {
      console.log('[AiStudio] Running health check...');
      const isHealthy = await healthCheck();
      console.log('[AiStudio] Health check result:', isHealthy);
      if (!isHealthy) {
        console.log('[AiStudio] BitStudio health check failed - user will see error toast');
      }
    };
    checkHealth();
  }, [healthCheck]);

  const validateFile = (file: File): boolean => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
      toast({
        description: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.',
        variant: 'destructive'
      });
      return false;
    }

    if (file.size > maxSize) {
      toast({
        description: 'File size exceeds 10MB limit.',
        variant: 'destructive'
      });
      return false;
    }

    return true;
  };

  const handlePersonImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !validateFile(file)) return;

    try {
      setUploadingPerson(true);
      const preview = URL.createObjectURL(file);
      
      console.log('[AiStudio] Uploading person image...', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });
      
      const uploadResult = await uploadImage(file, BITSTUDIO_IMAGE_TYPES.PERSON);
      
      if (uploadResult) {
        console.log('[AiStudio] Person image upload successful:', uploadResult);
        setPersonImage({
          file,
          preview,
          id: uploadResult.id
        });
        
        toast({
          description: 'Person photo uploaded successfully!',
        });
      } else {
        console.error('[AiStudio] Person image upload failed - no result returned');
      }
    } catch (error: any) {
      console.error('[AiStudio] Person image upload error:', error);
      // Error handling is done in useBitStudio hook
    } finally {
      setUploadingPerson(false);
    }
  };

  const handleOutfitImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !validateFile(file)) return;

    try {
      setUploadingOutfit(true);
      const preview = URL.createObjectURL(file);
      
      console.log('[AiStudio] Uploading outfit image...', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });
      
      const uploadResult = await uploadImage(file, BITSTUDIO_IMAGE_TYPES.OUTFIT);
      
      if (uploadResult) {
        console.log('[AiStudio] Outfit image upload successful:', uploadResult);
        setOutfitImage({
          file,
          preview,
          id: uploadResult.id
        });
        
        toast({
          description: 'Outfit photo uploaded successfully!',
        });
      } else {
        console.error('[AiStudio] Outfit image upload failed - no result returned');
      }
    } catch (error: any) {
      console.error('[AiStudio] Outfit image upload error:', error);
      // Error handling is done in useBitStudio hook
    } finally {
      setUploadingOutfit(false);
    }
  };

  const handleOutfitUrlSubmit = () => {
    if (!outfitUrl.trim()) return;
    
    console.log('[AiStudio] Adding outfit URL:', outfitUrl);
    
    setOutfitImage({
      preview: outfitUrl,
      url: outfitUrl
    });
    
    toast({
      description: 'Outfit URL added successfully!',
    });
    setOutfitUrl('');
  };

  const canGenerate = () => {
    const hasPersonImage = personImage?.id;
    const hasOutfitImage = outfitImage?.id || outfitImage?.url;
    return hasPersonImage && hasOutfitImage && !isGenerating;
  };

  const startGeneration = async () => {
    if (!canGenerate()) {
      toast({
        description: 'Please provide both person and outfit images.',
        variant: 'destructive'
      });
      return;
    }

    setIsGenerating(true);
    setProgress(10);
    setGenerationStatus('Initializing...');

    try {
      const params: any = {
        resolution,
        num_images: numImages,
      };

      if (personImage?.id) {
        params.person_image_id = personImage.id;
      }

      if (outfitImage?.id) {
        params.outfit_image_id = outfitImage.id;
      } else if (outfitImage?.url) {
        params.outfit_image_url = outfitImage.url;
      }

      if (prompt.trim()) {
        params.prompt = prompt.trim();
      }

      console.log('[AiStudio] Starting generation with params:', params);
      setProgress(25);
      setGenerationStatus('Submitting request...');

      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev < 90) {
            const increment = Math.random() * 10;
            const newProgress = Math.min(prev + increment, 90);
            
            if (newProgress < 40) {
              setGenerationStatus('Processing images...');
            } else if (newProgress < 70) {
              setGenerationStatus('Generating try-on...');
            } else {
              setGenerationStatus('Finalizing result...');
            }
            
            return newProgress;
          }
          return prev;
        });
      }, 1000);

      const result = await virtualTryOn(params);

      clearInterval(progressInterval);

      if (result) {
        console.log('[AiStudio] Generation successful:', result);
        setCurrentResult(result);
        setProgress(100);
        setGenerationStatus('Complete!');
        
        // Auto-save to gallery
        if (result.path) {
          await saveAsset(result.path, result.id);
        }
      } else {
        console.log('[AiStudio] Generation failed - no result returned');
        setProgress(0);
        setGenerationStatus('');
      }

    } catch (error: any) {
      console.error('[AiStudio] Generation error:', error);
      setProgress(0);
      setGenerationStatus('');
      
      // If it's a high resolution upgrade error, automatically fall back to standard
      if (error.message?.includes('High resolution requires') && resolution === 'high') {
        toast({
          description: 'High resolution requires Pro plan. Falling back to standard resolution.',
          variant: 'destructive'
        });
        setResolution('standard');
      } else {
        toast({
          description: error.message || 'Failed to generate try-on. Please try again.',
          variant: 'destructive'
        });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!currentResult?.path) {
      toast({
        description: 'No image available to download',
        variant: 'destructive'
      });
      return;
    }

    try {
      const response = await fetch(currentResult.path, {
        method: 'GET',
        mode: 'cors',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }

      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ai-tryon-${Date.now()}.png`;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(url);
      
      toast({
        description: 'Image downloaded successfully!',
      });
    } catch (error: any) {
      console.error('Download error:', error);
      toast({
        description: 'Failed to download image. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const resetFlow = () => {
    setPersonImage(null);
    setOutfitImage(null);
    setOutfitUrl('');
    setResolution('standard');
    setNumImages(1);
    setPrompt('');
    setCurrentResult(null);
    setProgress(0);
    setGenerationStatus('');
    setIsGenerating(false);
    setUploadingPerson(false);
    setUploadingOutfit(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary-glow/10 to-accent/5 p-4">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center justify-center gap-3">
            <Sparkles className="h-10 w-10 text-primary" />
            AI Studio
            <Badge variant="outline" className="text-xs">
              Powered by BitStudio
            </Badge>
          </h1>
          <p className="text-muted-foreground text-lg">
            Create stunning virtual try-on experiences with AI
          </p>
        </div>

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
          
          {/* Results Section - Top/Left */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Current Result Display */}
            <GlassPanel variant="custom" className="h-[600px] flex flex-col">
              <div className="p-6 border-b border-white/10">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Crown className="h-5 w-5 text-primary" />
                  Generated Result
                </h2>
              </div>
              
              <div className="flex-1 flex items-center justify-center p-6">
                {isGenerating ? (
                  <div className="text-center space-y-4 w-full max-w-md">
                    <div className="relative">
                      <div className="w-24 h-24 mx-auto rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                      <Zap className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-primary" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-lg font-medium">{generationStatus}</p>
                      <Progress value={progress} className="w-full" />
                      <p className="text-sm text-muted-foreground">{progress.toFixed(0)}% Complete</p>
                    </div>
                  </div>
                ) : currentResult ? (
                  <div className="text-center space-y-4 w-full">
                    <div className="relative max-w-md mx-auto">
                      <img
                        src={currentResult.path}
                        alt="AI Try-On Result"
                        className="w-full rounded-xl shadow-2xl"
                      />
                    </div>
                    <div className="flex gap-2 justify-center">
                      <Button onClick={handleDownload} variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                      <Button onClick={resetFlow} variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Try Again
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="w-24 h-24 mx-auto rounded-full bg-muted/20 flex items-center justify-center">
                      <Image className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-lg font-medium">No Result Yet</p>
                      <p className="text-muted-foreground">Upload your images below to get started</p>
                    </div>
                  </div>
                )}
              </div>
            </GlassPanel>

            {/* Previous Results Gallery */}
            {assets.length > 0 && (
              <GlassPanel variant="custom" className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Save className="h-5 w-5" />
                  Previous Results
                </h3>
                <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                  {assets.slice(0, 8).map((asset) => (
                    <button
                      key={asset.id}
                      onClick={() => setCurrentResult({ path: asset.asset_url, id: asset.job_id })}
                      className="aspect-square rounded-lg overflow-hidden hover:scale-105 transition-transform bg-muted/10"
                    >
                      <img
                        src={asset.asset_url}
                        alt={asset.title || 'Previous result'}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </GlassPanel>
            )}
          </div>

          {/* Controls Section - Right */}
          <div className="space-y-6">
            
            {/* Person Upload */}
            <GlassPanel variant="custom" className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-semibold">1</span>
                </div>
                Your Photo
              </h3>
              
              {personImage ? (
                <div className="space-y-4">
                  <div className="aspect-[3/4] rounded-lg overflow-hidden">
                    <img
                      src={personImage.preview}
                      alt="Person preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {personImage.id && (
                    <Badge variant="secondary" className="text-xs w-full justify-center">
                      ✓ Uploaded
                    </Badge>
                  )}
                  <Button 
                    onClick={() => personFileRef.current?.click()} 
                    variant="outline" 
                    size="sm"
                    className="w-full"
                    disabled={uploadingPerson}
                  >
                    {uploadingPerson ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Change Photo
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={() => personFileRef.current?.click()} 
                  disabled={uploadingPerson}
                  className="w-full gap-2"
                  variant="outline"
                >
                  {uploadingPerson ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {uploadingPerson ? 'Uploading...' : 'Upload Photo'}
                </Button>
              )}

              <input
                ref={personFileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePersonImageSelect}
                className="hidden"
              />
            </GlassPanel>

            {/* Outfit Upload */}
            <GlassPanel variant="custom" className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-teal-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-semibold">2</span>
                </div>
                Outfit
              </h3>
              
              {outfitImage ? (
                <div className="space-y-4">
                  <div className="aspect-square rounded-lg overflow-hidden">
                    <img
                      src={outfitImage.preview}
                      alt="Outfit preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {outfitImage.id && (
                    <Badge variant="secondary" className="text-xs w-full justify-center">
                      ✓ Uploaded
                    </Badge>
                  )}
                  <Button 
                    onClick={() => {
                      setOutfitImage(null);
                      setOutfitUrl('');
                    }}
                    variant="outline" 
                    size="sm"
                    className="w-full"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Change Outfit
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Button 
                    onClick={() => outfitFileRef.current?.click()} 
                    disabled={uploadingOutfit}
                    className="w-full gap-2"
                    variant="outline"
                  >
                    {uploadingOutfit ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    {uploadingOutfit ? 'Uploading...' : 'Upload Image'}
                  </Button>
                  
                  <div className="text-center text-sm text-muted-foreground">or</div>
                  
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="Paste image URL"
                      value={outfitUrl}
                      onChange={(e) => setOutfitUrl(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border border-white/20 rounded-md bg-white/10 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <Button 
                      onClick={handleOutfitUrlSubmit}
                      disabled={!outfitUrl.trim()}
                      size="sm"
                    >
                      Add
                    </Button>
                  </div>
                </div>
              )}

              <input
                ref={outfitFileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleOutfitImageSelect}
                className="hidden"
              />
            </GlassPanel>

            {/* Settings Panel */}
            <GlassPanel variant="custom" className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Settings
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSettings(!showSettings)}
                >
                  {showSettings ? 'Hide' : 'Show'}
                </Button>
              </div>
              
              {showSettings && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Resolution</label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={resolution === 'standard' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setResolution('standard')}
                      >
                        Standard
                      </Button>
                      <Button
                        variant={resolution === 'high' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setResolution('high')}
                      >
                        High
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Prompt (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Describe styling preferences..."
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-white/20 rounded-md bg-white/10 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              )}
            </GlassPanel>

            {/* Generate Button */}
            <Button
              onClick={startGeneration}
              disabled={!canGenerate()}
              className="w-full h-12 gap-2 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
            >
              {isGenerating ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Zap className="h-5 w-5" />
              )}
              {isGenerating ? 'Generating...' : 'Generate Try-On'}
            </Button>

            {/* Help Info */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                For best results, use clear photos with good lighting and neutral poses.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiStudio;