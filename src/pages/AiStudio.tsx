
import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Upload, 
  Image, 
  Loader2, 
  Download, 
  Save,
  RefreshCw,
  Sparkles,
  ArrowLeft,
  User,
  Shirt
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useBitStudio } from '@/hooks/useBitStudio';
import { BITSTUDIO_IMAGE_TYPES } from '@/lib/bitstudio-types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const AiStudio: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { uploadImage, virtualTryOn, loading, healthCheck } = useBitStudio();
  
  const [step, setStep] = useState<'person' | 'outfit' | 'settings' | 'generating' | 'result'>('person');
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

  const personFileRef = useRef<HTMLInputElement>(null);
  const outfitFileRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    // Run health check on mount
    const checkHealth = async () => {
      console.log('[AiStudio] Running health check...');
      const isHealthy = await healthCheck();
      console.log('[AiStudio] Health check result:', isHealthy);
      if (!isHealthy) {
        console.log('[AiStudio] BitStudio health check failed');
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
      }
    } catch (error: any) {
      console.error('[AiStudio] Person image upload error:', error);
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
      }
    } catch (error: any) {
      console.error('[AiStudio] Outfit image upload error:', error);
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
  };

  const canGenerate = () => {
    const hasPersonImage = personImage?.id;
    const hasOutfitImage = outfitImage?.id || outfitImage?.url;
    console.log('[AiStudio] Can generate check:', {
      hasPersonImage: !!hasPersonImage,
      hasOutfitImage: !!hasOutfitImage,
      personId: personImage?.id,
      outfitId: outfitImage?.id,
      outfitUrl: outfitImage?.url,
      isGenerating
    });
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
    setStep('generating');
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
        setStep('result');
      } else {
        console.log('[AiStudio] Generation failed - no result returned');
        setStep('settings');
        setProgress(0);
        setGenerationStatus('');
      }

    } catch (error: any) {
      console.error('[AiStudio] Generation error:', error);
      setProgress(0);
      setGenerationStatus('');
      setStep('settings');
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

  const handleSaveToGallery = async () => {
    if (!currentResult?.path || !user) return;

    try {
      const { error } = await supabase
        .from('ai_assets')
        .insert([{
          user_id: user.id,
          job_id: currentResult.id,
          asset_url: currentResult.path,
          asset_type: 'tryon_result',
          title: `AI Try-On ${new Date().toLocaleDateString()}`
        }]);

      if (error) throw error;

      toast({
        description: 'Saved to your gallery!',
      });
    } catch (error) {
      console.error('Save error:', error);
      toast({
        description: 'Failed to save to gallery',
        variant: 'destructive'
      });
    }
  };

  const resetFlow = () => {
    setStep('person');
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
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-500" />
            AI Studio
            <Badge variant="outline" className="text-xs">
              Powered by BitStudio
            </Badge>
          </h1>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center space-x-2 mb-6">
          {['person', 'outfit', 'settings', 'result'].map((stepName, index) => (
            <div
              key={stepName}
              className={`w-3 h-3 rounded-full ${
                step === stepName ? 'bg-primary' : 
                ['person', 'outfit', 'settings'].indexOf(step) > index ? 'bg-primary/50' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Person Image */}
        {step === 'person' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Upload Person Photo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Upload a full-body photo with neutral pose and front-facing view for best results
              </p>

              {personImage ? (
                <div className="space-y-4">
                  <div className="aspect-[3/4] max-w-48 mx-auto rounded-lg overflow-hidden">
                    <img
                      src={personImage.preview}
                      alt="Person preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => personFileRef.current?.click()} 
                      variant="outline" 
                      size="sm"
                      disabled={uploadingPerson}
                    >
                      {uploadingPerson ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : null}
                      Change Photo
                    </Button>
                    <Button 
                      onClick={() => setStep('outfit')}
                      className="flex-1"
                      disabled={!personImage.id}
                    >
                      Next: Outfit Photo
                    </Button>
                  </div>
                  {personImage.id && (
                    <Badge variant="outline" className="w-fit">
                      Uploaded: {personImage.id}
                    </Badge>
                  )}
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <Button 
                    onClick={() => personFileRef.current?.click()} 
                    disabled={uploadingPerson}
                    className="gap-2"
                  >
                    {uploadingPerson ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    {uploadingPerson ? 'Uploading...' : 'Choose Photo'}
                  </Button>
                </div>
              )}

              <input
                ref={personFileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePersonImageSelect}
                className="hidden"
              />
            </CardContent>
          </Card>
        )}

        {/* Step 2: Outfit Image */}
        {step === 'outfit' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shirt className="h-5 w-5" />
                Add Outfit
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Upload a garment photo or paste an image URL
              </p>

              {outfitImage ? (
                <div className="space-y-4">
                  <div className="aspect-square max-w-48 mx-auto rounded-lg overflow-hidden">
                    <img
                      src={outfitImage.preview}
                      alt="Outfit preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => setStep('person')}
                      variant="outline" 
                      size="sm"
                    >
                      Back
                    </Button>
                    <Button 
                      onClick={() => {
                        setOutfitImage(null);
                        setOutfitUrl('');
                      }}
                      variant="outline" 
                      size="sm"
                    >
                      Change
                    </Button>
                    <Button 
                      onClick={() => setStep('settings')}
                      className="flex-1"
                      disabled={!outfitImage.id && !outfitImage.url}
                    >
                      Next: Settings
                    </Button>
                  </div>
                  {outfitImage.id && (
                    <Badge variant="outline" className="w-fit">
                      Uploaded: {outfitImage.id}
                    </Badge>
                  )}
                  {outfitImage.url && (
                    <Badge variant="outline" className="w-fit">
                      URL: Added
                    </Badge>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => outfitFileRef.current?.click()} 
                      disabled={uploadingOutfit}
                      variant="outline"
                      className="flex-1 gap-2"
                    >
                      {uploadingOutfit ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      {uploadingOutfit ? 'Uploading...' : 'Upload Photo'}
                    </Button>
                  </div>
                  
                  <div className="text-sm text-muted-foreground text-center">or</div>
                  
                  <div className="flex gap-2">
                    <Input
                      type="url"
                      placeholder="Paste image URL"
                      value={outfitUrl}
                      onChange={(e) => setOutfitUrl(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleOutfitUrlSubmit}
                      disabled={!outfitUrl.trim()}
                      size="sm"
                    >
                      Add
                    </Button>
                  </div>

                  <Button 
                    onClick={() => setStep('person')}
                    variant="outline" 
                    size="sm"
                  >
                    Back
                  </Button>
                </div>
              )}

              <input
                ref={outfitFileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleOutfitImageSelect}
                className="hidden"
              />
            </CardContent>
          </Card>
        )}

        {/* Step 3: Settings */}
        {step === 'settings' && (
          <Card>
            <CardHeader>
              <CardTitle>Generation Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-sm font-medium">Resolution</Label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Button
                    variant={resolution === 'standard' ? 'default' : 'outline'}
                    onClick={() => setResolution('standard')}
                    className="flex-col h-auto p-3"
                  >
                    <span className="font-medium">Standard</span>
                    <span className="text-xs text-muted-foreground">Faster • 1 credit</span>
                  </Button>
                  <Button
                    variant={resolution === 'high' ? 'default' : 'outline'}
                    onClick={() => setResolution('high')}
                    className="flex-col h-auto p-3"
                  >
                    <span className="font-medium">High Quality</span>
                    <span className="text-xs text-muted-foreground">Better • 2 credits</span>
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Number of Images</Label>
                <Select value={numImages.toString()} onValueChange={value => setNumImages(parseInt(value))}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium">Prompt (Optional)</Label>
                <Textarea
                  placeholder="e.g., studio lighting, clean backdrop"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="mt-2"
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={() => setStep('outfit')}
                  variant="outline"
                  className="flex-1"
                >
                  Back
                </Button>
                <Button 
                  onClick={startGeneration}
                  disabled={!canGenerate()}
                  className="flex-1 gap-2"
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Generate Try-On
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Generating */}
        {step === 'generating' && (
          <Card>
            <CardContent className="p-6 text-center space-y-6">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto">
                <Loader2 className="h-8 w-8 text-white animate-spin" />
              </div>
              
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Generating Your Try-On</h3>
                <p className="text-sm text-muted-foreground">
                  {generationStatus || 'AI is creating your try-on...'}
                </p>
                
                <div className="w-full max-w-sm mx-auto space-y-2">
                  <Progress value={progress} className="h-3" />
                  <p className="text-xs text-muted-foreground">
                    {Math.round(progress)}% complete
                  </p>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground">
                This may take up to 2-3 minutes...
              </p>
            </CardContent>
          </Card>
        )}

        {/* Step 5: Result */}
        {step === 'result' && currentResult?.path && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="text-center">
                <h3 className="font-semibold text-lg">Your AI Try-On Result</h3>
                {currentResult.credits_used && (
                  <p className="text-sm text-muted-foreground">
                    Used {currentResult.credits_used} credits
                  </p>
                )}
              </div>

              <div className="aspect-[3/4] max-w-md mx-auto rounded-lg overflow-hidden">
                <img
                  src={currentResult.path}
                  alt="AI Try-On result"
                  className="w-full h-full object-cover"
                  crossOrigin="anonymous"
                />
              </div>
              
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Button
                    onClick={handleDownload}
                    variant="outline"
                    className="flex-1 gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                  
                  <Button
                    onClick={handleSaveToGallery}
                    variant="outline"
                    className="flex-1 gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Save to Gallery
                  </Button>
                </div>

                <Button
                  onClick={resetFlow}
                  className="w-full gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Another
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tips */}
        <Alert>
          <AlertTitle>Best photo tips</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
              <li>Person: single subject, full-body, front-facing, neutral pose; arms slightly away from torso.</li>
              <li>Lighting & background: bright, even light; plain background; avoid filters, hats/sunglasses, and heavy occlusions.</li>
              <li>Quality: high‑resolution (≥ 1024px), JPG/PNG/WebP, under 10MB.</li>
              <li>Outfit image: product cutout or flat/ghost mannequin on a plain background, front view; preferably no model, but model photos can work.</li>
            </ul>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
};

export default AiStudio;
