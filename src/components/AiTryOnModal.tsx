import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  Image, 
  AlertCircle, 
  Loader2, 
  Download, 
  Save,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBitStudio } from '@/hooks/useBitStudio';
import { BITSTUDIO_IMAGE_TYPES } from '@/lib/bitstudio-types';

interface AiTryOnModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TryOnJob {
  job_id: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  result_url?: string;
  credits_used?: number;
  error?: string;
}

const AiTryOnModal: React.FC<AiTryOnModalProps> = ({ isOpen, onClose }) => {
  const { toast } = useToast();
  const { user, session } = useAuth();
  const { uploadImage, loading: uploadLoading } = useBitStudio();
  
  const [step, setStep] = useState<'person' | 'outfit' | 'settings' | 'generating' | 'result'>('person');
  const [personImage, setPersonImage] = useState<{ file: File; preview: string; id?: string } | null>(null);
  const [outfitImage, setOutfitImage] = useState<{ file?: File; preview: string; id?: string; url?: string } | null>(null);
  const [outfitUrl, setOutfitUrl] = useState('');
  const [resolution, setResolution] = useState<'standard' | 'high'>('standard');
  const [numImages, setNumImages] = useState(1);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentJob, setCurrentJob] = useState<TryOnJob | null>(null);
  const [progress, setProgress] = useState(0);

  const personFileRef = useRef<HTMLInputElement>(null);
  const outfitFileRef = useRef<HTMLInputElement>(null);

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
      const preview = URL.createObjectURL(file);
      
      console.log('Uploading person image...');
      const uploadResult = await uploadImage(file, BITSTUDIO_IMAGE_TYPES.PERSON);
      
      if (uploadResult) {
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
      console.error('Person image upload error:', error);
      // Error handling is done in useBitStudio hook
    }
  };

  const handleOutfitImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !validateFile(file)) return;

    try {
      const preview = URL.createObjectURL(file);
      
      console.log('Uploading outfit image...');
      const uploadResult = await uploadImage(file, BITSTUDIO_IMAGE_TYPES.OUTFIT);
      
      if (uploadResult) {
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
      console.error('Outfit image upload error:', error);
      // Error handling is done in useBitStudio hook
    }
  };

  const handleOutfitUrlSubmit = () => {
    if (!outfitUrl.trim()) return;
    
    setOutfitImage({
      preview: outfitUrl,
      url: outfitUrl
    });
    
    toast({
      description: 'Outfit URL added successfully!',
    });
  };

  const startGeneration = async () => {
    if (!personImage?.id && !outfitImage?.id && !outfitImage?.url) {
      toast({
        description: 'Please provide both person and outfit images.',
        variant: 'destructive'
      });
      return;
    }

    setIsGenerating(true);
    setStep('generating');
    setProgress(0);

    try {
      const requestBody: any = {
        resolution,
        num_images: numImages,
      };

      if (personImage?.id) {
        requestBody.person_image_id = personImage.id;
      }

      if (outfitImage?.id) {
        requestBody.outfit_image_id = outfitImage.id;
      } else if (outfitImage?.url) {
        requestBody.outfit_image_url = outfitImage.url;
      }

      if (prompt.trim()) {
        requestBody.prompt = prompt.trim();
      }

      console.log('Starting generation with params:', requestBody);

      const { data, error } = await supabase.functions.invoke('bitstudio-tryon', {
        body: requestBody,
      });

      if (error) {
        throw new Error(error.message || 'Failed to start generation');
      }

      setCurrentJob({
        job_id: data.job_id,
        status: 'generating'
      });

      // Start polling for status
      pollJobStatus(data.job_id);

    } catch (error: any) {
      console.error('Generation error:', error);
      toast({
        description: error.message || 'Failed to start AI try-on. Please try again.',
        variant: 'destructive'
      });
      setIsGenerating(false);
      setStep('settings');
    }
  };

  const pollJobStatus = async (jobId: string) => {
    const maxAttempts = 90; // 3 minutes with 2-second intervals
    let attempts = 0;
    let delay = 2000; // Start with 2 seconds

    const poll = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('bitstudio-status', {
          body: { job_id: jobId },
        });

        if (error) {
          throw new Error(error.message || 'Status check failed');
        }

        setCurrentJob(data);
        
        // Update progress based on status
        if (data.status === 'generating') {
          setProgress(Math.min(75, (attempts / maxAttempts) * 100));
        } else if (data.status === 'completed') {
          setProgress(100);
          setStep('result');
          setIsGenerating(false);
          
          if (data.credits_used) {
            toast({
              description: `Try-on completed! Used ${data.credits_used} credits.`,
            });
          }
          return;
        } else if (data.status === 'failed') {
          throw new Error(data.error || 'Generation failed');
        }

        attempts++;
        if (attempts < maxAttempts) {
          // Exponential backoff: 2s -> 4s -> 6s (max)
          delay = Math.min(6000, delay + 2000);
          setTimeout(poll, delay);
        } else {
          throw new Error('Generation timeout');
        }

      } catch (error: any) {
        console.error('Polling error:', error);
        toast({
          description: error.message || 'Generation failed. Please try again.',
          variant: 'destructive'
        });
        setIsGenerating(false);
        setStep('settings');
      }
    };

    poll();
  };

  const handleDownload = async () => {
    if (!currentJob?.result_url) return;

    try {
      const response = await fetch(currentJob.result_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ai-tryon-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        description: 'Image downloaded successfully!',
      });
    } catch (error) {
      toast({
        description: 'Failed to download image',
        variant: 'destructive'
      });
    }
  };

  const handleSaveToGallery = async () => {
    if (!currentJob?.result_url || !user) return;

    try {
      // Use a direct insert since the table now exists
      const { error } = await supabase
        .from('ai_assets')
        .insert([{
          user_id: user.id,
          job_id: currentJob.job_id,
          asset_url: currentJob.result_url,
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
    setCurrentJob(null);
    setProgress(0);
    setIsGenerating(false);
  };

  const handleClose = () => {
    resetFlow();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            AI Try-On
            <Badge variant="outline" className="text-xs">
              Powered by bitStudio
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step 1: Person Photo */}
          {step === 'person' && (
            <Card>
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto">
                    <Image className="h-8 w-8 text-white" />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Upload Your Photo</h3>
                    <p className="text-sm text-muted-foreground">
                      Full-body photo with neutral pose and front-facing view works best
                    </p>
                  </div>

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
                          disabled={uploadLoading}
                        >
                          Change Photo
                        </Button>
                        <Button 
                          onClick={() => setStep('outfit')}
                          className="flex-1"
                        >
                          Next: Outfit Photo
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button 
                      onClick={() => personFileRef.current?.click()} 
                      disabled={uploadLoading}
                      className="gap-2"
                    >
                      {uploadLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      {uploadLoading ? 'Uploading...' : 'Choose Photo'}
                    </Button>
                  )}

                  <input
                    ref={personFileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePersonImageSelect}
                    className="hidden"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Outfit Photo */}
          {step === 'outfit' && (
            <Card>
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-500 rounded-full flex items-center justify-center mx-auto">
                    <Image className="h-8 w-8 text-white" />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Add Outfit</h3>
                    <p className="text-sm text-muted-foreground">
                      Upload a garment photo or paste an image URL
                    </p>
                  </div>

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
                        >
                          Next: Settings
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => outfitFileRef.current?.click()} 
                          disabled={uploadLoading}
                          variant="outline"
                          className="flex-1 gap-2"
                        >
                          {uploadLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4" />
                          )}
                          Upload Photo
                        </Button>
                      </div>
                      
                      <div className="text-sm text-muted-foreground">or</div>
                      
                      <div className="flex gap-2">
                        <input
                          type="url"
                          placeholder="Paste image URL"
                          value={outfitUrl}
                          onChange={(e) => setOutfitUrl(e.target.value)}
                          className="flex-1 px-3 py-2 border border-input rounded-md text-sm"
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
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Settings */}
          {step === 'settings' && (
            <Card>
              <CardContent className="p-6 space-y-6">
                <div className="text-center">
                  <h3 className="font-semibold text-lg">Generation Settings</h3>
                  <p className="text-sm text-muted-foreground">
                    Customize your AI try-on
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Resolution</label>
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
                    <label className="text-sm font-medium">Number of Images</label>
                    <div className="mt-2 flex gap-2">
                      {[1, 2].map((num) => (
                        <Button
                          key={num}
                          variant={numImages === num ? 'default' : 'outline'}
                          onClick={() => setNumImages(num)}
                          size="sm"
                        >
                          {num}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Prompt (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g., studio lighting, clean backdrop"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      className="mt-2 w-full px-3 py-2 border border-input rounded-md text-sm"
                    />
                  </div>
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
                    disabled={isGenerating}
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
              <CardContent className="p-6 text-center space-y-4">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto">
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">Generating Your Try-On</h3>
                  <p className="text-muted-foreground">
                    {currentJob?.status === 'pending' && 'Your request is queued...'}
                    {currentJob?.status === 'generating' && 'AI is creating your try-on...'}
                  </p>
                  
                  <div className="w-full max-w-xs mx-auto">
                    <Progress value={progress} className="h-2" />
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  This may take up to 2-3 minutes...
                </p>
              </CardContent>
            </Card>
          )}

          {/* Step 5: Result */}
          {step === 'result' && currentJob?.result_url && (
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="text-center">
                  <h3 className="font-semibold text-lg">Your AI Try-On Result</h3>
                  {currentJob.credits_used && (
                    <p className="text-sm text-muted-foreground">
                      Used {currentJob.credits_used} credits
                    </p>
                  )}
                </div>

                <div className="aspect-[3/4] max-w-md mx-auto rounded-lg overflow-hidden">
                  <img
                    src={currentJob.result_url}
                    alt="AI Try-On result"
                    className="w-full h-full object-cover"
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
          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="flex items-start gap-2 text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 text-blue-500 flex-shrink-0" />
              <div className="space-y-1 text-muted-foreground">
                <p className="font-medium">Tips for best results:</p>
                <p>• Use full-body, front-facing photos</p>
                <p>• Ensure good lighting and neutral pose</p>
                <p>• Clean garment images work best</p>
                <p>• Only one person in the photo</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AiTryOnModal;
