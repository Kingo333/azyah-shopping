
import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Upload, 
  Image, 
  AlertCircle, 
  Loader2, 
  Download, 
  Save,
  RefreshCw,
  Sparkles,
  Play,
  Zap,
  Paintbrush,
  Wand2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface AiStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface JobResult {
  id: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  path?: string;
  video_path?: string;
  credits_used?: number;
  error?: string;
}

const AiStudioModal: React.FC<AiStudioModalProps> = ({ isOpen, onClose }) => {
  const { toast } = useToast();
  const { user, session } = useAuth();
  
  const [activeTab, setActiveTab] = useState('tryon');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Try-On state
  const [personFile, setPersonFile] = useState<File | null>(null);
  const [outfitFile, setOutfitFile] = useState<File | null>(null);
  const [personId, setPersonId] = useState<string | null>(null);
  const [outfitId, setOutfitId] = useState<string | null>(null);
  const [tryonResult, setTryonResult] = useState<JobResult | null>(null);
  const [tryonSettings, setTryonSettings] = useState({
    resolution: 'standard' as 'standard' | 'high',
    numImages: 1,
    prompt: '',
    seed: undefined as number | undefined
  });

  // Generate state
  const [generateSettings, setGenerateSettings] = useState({
    prompt: '',
    aspectRatio: 'square' as 'portrait' | 'landscape' | 'square',
    style: 'studio' as 'studio' | 'smartphone',
    resolution: 'standard' as 'standard' | 'high',
    numImages: 1
  });
  const [generateResult, setGenerateResult] = useState<JobResult | null>(null);

  // Upscale state
  const [upscaleSettings, setUpscaleSettings] = useState({
    imageId: '',
    factor: 2 as 1 | 2 | 4,
    denoise: undefined as number | undefined
  });
  const [upscaleResult, setUpscaleResult] = useState<JobResult | null>(null);

  // Inpaint state
  const [inpaintFiles, setInpaintFiles] = useState({
    base: null as File | null,
    mask: null as File | null,
    reference: null as File | null
  });
  const [inpaintIds, setInpaintIds] = useState({
    base: '',
    mask: '',
    reference: ''
  });
  const [inpaintSettings, setInpaintSettings] = useState({
    prompt: '',
    denoise: 0.4,
    numImages: 1
  });
  const [inpaintResult, setInpaintResult] = useState<JobResult | null>(null);

  // Video state
  const [videoSettings, setVideoSettings] = useState({
    imageId: '',
    prompt: ''
  });
  const [videoResult, setVideoResult] = useState<JobResult | null>(null);

  const personFileRef = useRef<HTMLInputElement>(null);
  const outfitFileRef = useRef<HTMLInputElement>(null);
  const baseFileRef = useRef<HTMLInputElement>(null);
  const maskFileRef = useRef<HTMLInputElement>(null);
  const refFileRef = useRef<HTMLInputElement>(null);

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

  const uploadImage = async (file: File, type: string) => {
    if (!session) return null;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    const { data, error } = await supabase.functions.invoke('bitstudio-upload', {
      body: formData,
    });

    if (error) {
      console.error('Upload error:', error);
      throw new Error(error.message || 'Upload failed');
    }

    return data;
  };

  const pollJobStatus = async (jobId: string, maxMs = 180000) => {
    const start = Date.now();
    let attempts = 0;
    const maxAttempts = maxMs / 2000; // 2 second intervals

    const poll = async (): Promise<JobResult> => {
      try {
        const { data, error } = await supabase.functions.invoke('bitstudio-status', {
          body: { job_id: jobId },
        });

        if (error) {
          throw new Error(error.message || 'Status check failed');
        }

        // Update progress
        if (data.status === 'generating') {
          setProgress(Math.min(90, (attempts / maxAttempts) * 100));
        } else if (data.status === 'completed') {
          setProgress(100);
          return data;
        } else if (data.status === 'failed') {
          throw new Error(data.error || 'Generation failed');
        }

        attempts++;
        if (Date.now() - start < maxMs) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          return poll();
        } else {
          throw new Error('Generation timeout');
        }
      } catch (error: any) {
        throw new Error(error.message || 'Polling failed');
      }
    };

    return poll();
  };

  const handlePersonUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !validateFile(file)) return;

    setIsProcessing(true);
    setError(null);
    try {
      const result = await uploadImage(file, 'virtual-try-on-person');
      setPersonFile(file);
      setPersonId(result.id);
      toast({ description: 'Person photo uploaded successfully!' });
    } catch (error: any) {
      setError(error.message);
      toast({
        description: 'Failed to upload person photo',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOutfitUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !validateFile(file)) return;

    setIsProcessing(true);
    setError(null);
    try {
      const result = await uploadImage(file, 'virtual-try-on-outfit');
      setOutfitFile(file);
      setOutfitId(result.id);
      toast({ description: 'Outfit photo uploaded successfully!' });
    } catch (error: any) {
      setError(error.message);
      toast({
        description: 'Failed to upload outfit photo',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTryOn = async () => {
    if (!personId || !outfitId) {
      setError('Please upload both person and outfit photos');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProgress(0);
    setTryonResult(null);

    try {
      const requestBody: any = {
        person_image_id: personId,
        outfit_image_id: outfitId,
        resolution: tryonSettings.resolution,
        num_images: tryonSettings.numImages,
      };

      if (tryonSettings.prompt.trim()) {
        requestBody.prompt = tryonSettings.prompt.trim();
      }

      if (typeof tryonSettings.seed === 'number') {
        requestBody.seed = tryonSettings.seed;
      }

      const { data, error } = await supabase.functions.invoke('bitstudio-tryon', {
        body: requestBody,
      });

      if (error) {
        throw new Error(error.message || 'Failed to start try-on');
      }

      const result = await pollJobStatus(data.job_id);
      setTryonResult(result);

      if (result.credits_used) {
        toast({
          description: `Try-on completed! Used ${result.credits_used} credits.`,
        });
      }
    } catch (error: any) {
      setError(error.message);
      toast({
        description: error.message || 'Try-on failed',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerate = async () => {
    if (!generateSettings.prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProgress(0);
    setGenerateResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('bitstudio-generate', {
        body: {
          prompt: generateSettings.prompt,
          aspect_ratio: generateSettings.aspectRatio,
          style: generateSettings.style,
          resolution: generateSettings.resolution,
          num_images: generateSettings.numImages
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to start generation');
      }

      const jobId = Array.isArray(data) ? data[0]?.id : data?.id;
      const result = await pollJobStatus(jobId);
      setGenerateResult(result);

      if (result.credits_used) {
        toast({
          description: `Image generated! Used ${result.credits_used} credits.`,
        });
      }
    } catch (error: any) {
      setError(error.message);
      toast({
        description: error.message || 'Generation failed',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpscale = async () => {
    if (!upscaleSettings.imageId.trim()) {
      setError('Please enter an image ID');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProgress(0);
    setUpscaleResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('bitstudio-upscale', {
        body: {
          image_id: upscaleSettings.imageId,
          upscale_factor: upscaleSettings.factor,
          denoise: upscaleSettings.denoise
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to start upscaling');
      }

      const result = await pollJobStatus(data.id || upscaleSettings.imageId);
      setUpscaleResult(result);

      if (result.credits_used) {
        toast({
          description: `Image upscaled! Used ${result.credits_used} credits.`,
        });
      }
    } catch (error: any) {
      setError(error.message);
      toast({
        description: error.message || 'Upscaling failed',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInpaint = async () => {
    setIsProcessing(true);
    setError(null);
    setProgress(0);
    setInpaintResult(null);

    try {
      let baseId = inpaintIds.base;
      let maskId = inpaintIds.mask;
      let refId = inpaintIds.reference;

      // Upload files if provided instead of IDs
      if (inpaintFiles.base && !baseId) {
        const result = await uploadImage(inpaintFiles.base, 'inpaint-base');
        baseId = result.id;
      }

      if (inpaintFiles.mask && !maskId) {
        const result = await uploadImage(inpaintFiles.mask, 'inpaint-mask');
        maskId = result.id;
      }

      if (inpaintFiles.reference && !refId) {
        const result = await uploadImage(inpaintFiles.reference, 'inpaint-reference');
        refId = result.id;
      }

      if (!baseId || !maskId) {
        throw new Error('Base image and mask are required');
      }

      const requestBody: any = {
        base_image_id: baseId,
        mask_image_id: maskId,
        prompt: inpaintSettings.prompt,
        denoise: inpaintSettings.denoise,
        num_images: inpaintSettings.numImages
      };

      if (refId) {
        requestBody.reference_image_id = refId;
      }

      const { data, error } = await supabase.functions.invoke('bitstudio-inpaint', {
        body: requestBody,
      });

      if (error) {
        throw new Error(error.message || 'Failed to start inpainting');
      }

      const result = await pollJobStatus(data.id || baseId);
      setInpaintResult(result);

      if (result.credits_used) {
        toast({
          description: `Inpainting completed! Used ${result.credits_used} credits.`,
        });
      }
    } catch (error: any) {
      setError(error.message);
      toast({
        description: error.message || 'Inpainting failed',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVideo = async () => {
    if (!videoSettings.imageId.trim() || !videoSettings.prompt.trim()) {
      setError('Please provide both image ID and motion prompt');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProgress(0);
    setVideoResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('bitstudio-video', {
        body: {
          image_id: videoSettings.imageId,
          prompt: videoSettings.prompt
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to start video generation');
      }

      // Video generation can take up to 10 minutes
      const result = await pollJobStatus(data.id || videoSettings.imageId, 10 * 60 * 1000);
      setVideoResult(result);

      if (result.credits_used) {
        toast({
          description: `Video generated! Used ${result.credits_used} credits.`,
        });
      }
    } catch (error: any) {
      setError(error.message);
      toast({
        description: error.message || 'Video generation failed',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveToGallery = async (result: JobResult) => {
    if (!result.path || !user) return;

    try {
      const { error } = await supabase
        .from('ai_assets')
        .insert([{
          user_id: user.id,
          job_id: result.id,
          asset_url: result.path,
          asset_type: 'bitstudio_result',
          title: `AI Studio Result ${new Date().toLocaleDateString()}`
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

  const resetAll = () => {
    setPersonFile(null);
    setOutfitFile(null);
    setPersonId(null);
    setOutfitId(null);
    setTryonResult(null);
    setGenerateResult(null);
    setUpscaleResult(null);
    setInpaintResult(null);
    setVideoResult(null);
    setError(null);
    setProgress(0);
    setIsProcessing(false);
  };

  const handleClose = () => {
    resetAll();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            AI Studio
            <Badge variant="outline" className="text-xs">
              Powered by bitStudio
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-700">{error}</div>
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              <span className="text-sm text-blue-700">Processing...</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="tryon" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Try-On
            </TabsTrigger>
            <TabsTrigger value="generate" className="flex items-center gap-2">
              <Wand2 className="h-4 w-4" />
              Generate
            </TabsTrigger>
            <TabsTrigger value="upscale" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Upscale
            </TabsTrigger>
            <TabsTrigger value="inpaint" className="flex items-center gap-2">
              <Paintbrush className="h-4 w-4" />
              Inpaint
            </TabsTrigger>
            <TabsTrigger value="video" className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              Video
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tryon" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-3">Person Photo</h3>
                  <Button
                    onClick={() => personFileRef.current?.click()}
                    variant="outline"
                    className="w-full gap-2"
                    disabled={isProcessing}
                  >
                    <Upload className="h-4 w-4" />
                    Choose Photo
                  </Button>
                  <input
                    ref={personFileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePersonUpload}
                    className="hidden"
                  />
                  {personFile && (
                    <div className="mt-3">
                      <img
                        src={URL.createObjectURL(personFile)}
                        alt="Person preview"
                        className="w-full h-32 object-cover rounded"
                      />
                      <p className="text-xs text-green-600 mt-1">✓ Uploaded (ID: {personId})</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-3">Outfit Photo</h3>
                  <Button
                    onClick={() => outfitFileRef.current?.click()}
                    variant="outline"
                    className="w-full gap-2"
                    disabled={isProcessing}
                  >
                    <Upload className="h-4 w-4" />
                    Choose Photo
                  </Button>
                  <input
                    ref={outfitFileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleOutfitUpload}
                    className="hidden"
                  />
                  {outfitFile && (
                    <div className="mt-3">
                      <img
                        src={URL.createObjectURL(outfitFile)}
                        alt="Outfit preview"
                        className="w-full h-32 object-cover rounded"
                      />
                      <p className="text-xs text-green-600 mt-1">✓ Uploaded (ID: {outfitId})</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium">Resolution</label>
                    <select
                      value={tryonSettings.resolution}
                      onChange={e => setTryonSettings(prev => ({ ...prev, resolution: e.target.value as any }))}
                      className="w-full mt-1 p-2 border rounded"
                    >
                      <option value="standard">Standard (1 credit)</option>
                      <option value="high">High Quality (2 credits)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Images</label>
                    <input
                      type="number"
                      min="1"
                      max="4"
                      value={tryonSettings.numImages}
                      onChange={e => setTryonSettings(prev => ({ ...prev, numImages: parseInt(e.target.value) || 1 }))}
                      className="w-full mt-1 p-2 border rounded"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-sm font-medium">Prompt (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g., studio lighting, clean backdrop"
                      value={tryonSettings.prompt}
                      onChange={e => setTryonSettings(prev => ({ ...prev, prompt: e.target.value }))}
                      className="w-full mt-1 p-2 border rounded"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleTryOn}
                  disabled={!personId || !outfitId || isProcessing}
                  className="w-full gap-2"
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Generate Try-On
                </Button>
              </CardContent>
            </Card>

            {tryonResult?.path && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold">Result</h3>
                    {tryonResult.credits_used && (
                      <Badge variant="outline">{tryonResult.credits_used} credits used</Badge>
                    )}
                  </div>
                  <img
                    src={tryonResult.path}
                    alt="Try-on result"
                    className="w-full rounded-lg"
                  />
                  <div className="flex gap-2 mt-3">
                    <Button
                      onClick={() => handleDownload(tryonResult.path!, `tryon-${Date.now()}.png`)}
                      variant="outline"
                      className="flex-1 gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                    <Button
                      onClick={() => handleSaveToGallery(tryonResult)}
                      variant="outline"
                      className="flex-1 gap-2"
                    >
                      <Save className="h-4 w-4" />
                      Save to Gallery
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="generate" className="space-y-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                <div>
                  <label className="text-sm font-medium">Prompt</label>
                  <textarea
                    placeholder="Describe the image you want to generate..."
                    value={generateSettings.prompt}
                    onChange={e => setGenerateSettings(prev => ({ ...prev, prompt: e.target.value }))}
                    className="w-full mt-1 p-2 border rounded h-20 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium">Aspect Ratio</label>
                    <select
                      value={generateSettings.aspectRatio}
                      onChange={e => setGenerateSettings(prev => ({ ...prev, aspectRatio: e.target.value as any }))}
                      className="w-full mt-1 p-2 border rounded"
                    >
                      <option value="square">Square</option>
                      <option value="portrait">Portrait</option>
                      <option value="landscape">Landscape</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Style</label>
                    <select
                      value={generateSettings.style}
                      onChange={e => setGenerateSettings(prev => ({ ...prev, style: e.target.value as any }))}
                      className="w-full mt-1 p-2 border rounded"
                    >
                      <option value="studio">Studio</option>
                      <option value="smartphone">Smartphone</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Resolution</label>
                    <select
                      value={generateSettings.resolution}
                      onChange={e => setGenerateSettings(prev => ({ ...prev, resolution: e.target.value as any }))}
                      className="w-full mt-1 p-2 border rounded"
                    >
                      <option value="standard">Standard</option>
                      <option value="high">High Quality</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Images</label>
                    <input
                      type="number"
                      min="1"
                      max="4"
                      value={generateSettings.numImages}
                      onChange={e => setGenerateSettings(prev => ({ ...prev, numImages: parseInt(e.target.value) || 1 }))}
                      className="w-full mt-1 p-2 border rounded"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={!generateSettings.prompt.trim() || isProcessing}
                  className="w-full gap-2"
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4" />
                  )}
                  Generate Image
                </Button>
              </CardContent>
            </Card>

            {generateResult?.path && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold">Generated Image</h3>
                    {generateResult.credits_used && (
                      <Badge variant="outline">{generateResult.credits_used} credits used</Badge>
                    )}
                  </div>
                  <img
                    src={generateResult.path}
                    alt="Generated image"
                    className="w-full rounded-lg"
                  />
                  <div className="flex gap-2 mt-3">
                    <Button
                      onClick={() => handleDownload(generateResult.path!, `generated-${Date.now()}.png`)}
                      variant="outline"
                      className="flex-1 gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                    <Button
                      onClick={() => handleSaveToGallery(generateResult)}
                      variant="outline"
                      className="flex-1 gap-2"
                    >
                      <Save className="h-4 w-4" />
                      Save to Gallery
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="upscale" className="space-y-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                <div>
                  <label className="text-sm font-medium">Image ID</label>
                  <input
                    type="text"
                    placeholder="Enter image ID to upscale"
                    value={upscaleSettings.imageId}
                    onChange={e => setUpscaleSettings(prev => ({ ...prev, imageId: e.target.value }))}
                    className="w-full mt-1 p-2 border rounded"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Upscale Factor</label>
                    <select
                      value={upscaleSettings.factor}
                      onChange={e => setUpscaleSettings(prev => ({ ...prev, factor: parseInt(e.target.value) as any }))}
                      className="w-full mt-1 p-2 border rounded"
                    >
                      <option value={1}>1x (No upscale)</option>
                      <option value={2}>2x</option>
                      <option value={4}>4x</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Denoise (Optional)</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0.05"
                      max="1"
                      placeholder="0.05 - 1.0"
                      value={upscaleSettings.denoise || ''}
                      onChange={e => setUpscaleSettings(prev => ({ 
                        ...prev, 
                        denoise: e.target.value ? parseFloat(e.target.value) : undefined 
                      }))}
                      className="w-full mt-1 p-2 border rounded"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleUpscale}
                  disabled={!upscaleSettings.imageId.trim() || isProcessing}
                  className="w-full gap-2"
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                  Upscale Image
                </Button>
              </CardContent>
            </Card>

            {upscaleResult?.path && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold">Upscaled Image</h3>
                    {upscaleResult.credits_used && (
                      <Badge variant="outline">{upscaleResult.credits_used} credits used</Badge>
                    )}
                  </div>
                  <img
                    src={upscaleResult.path}
                    alt="Upscaled image"
                    className="w-full rounded-lg"
                  />
                  <div className="flex gap-2 mt-3">
                    <Button
                      onClick={() => handleDownload(upscaleResult.path!, `upscaled-${Date.now()}.png`)}
                      variant="outline"
                      className="flex-1 gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                    <Button
                      onClick={() => handleSaveToGallery(upscaleResult)}
                      variant="outline"
                      className="flex-1 gap-2"
                    >
                      <Save className="h-4 w-4" />
                      Save to Gallery
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="inpaint" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-3">Base Image</h3>
                  <Button
                    onClick={() => baseFileRef.current?.click()}
                    variant="outline"
                    className="w-full gap-2"
                    disabled={isProcessing}
                  >
                    <Upload className="h-4 w-4" />
                    Upload Base
                  </Button>
                  <input
                    ref={baseFileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={e => setInpaintFiles(prev => ({ ...prev, base: e.target.files?.[0] || null }))}
                    className="hidden"
                  />
                  <div className="mt-3">
                    <input
                      type="text"
                      placeholder="or Base Image ID"
                      value={inpaintIds.base}
                      onChange={e => setInpaintIds(prev => ({ ...prev, base: e.target.value }))}
                      className="w-full p-2 border rounded text-xs"
                    />
                  </div>
                  {inpaintFiles.base && (
                    <img
                      src={URL.createObjectURL(inpaintFiles.base)}
                      alt="Base preview"
                      className="w-full h-20 object-cover rounded mt-2"
                    />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-3">Mask Image</h3>
                  <Button
                    onClick={() => maskFileRef.current?.click()}
                    variant="outline"
                    className="w-full gap-2"
                    disabled={isProcessing}
                  >
                    <Upload className="h-4 w-4" />
                    Upload Mask
                  </Button>
                  <input
                    ref={maskFileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={e => setInpaintFiles(prev => ({ ...prev, mask: e.target.files?.[0] || null }))}
                    className="hidden"
                  />
                  <div className="mt-3">
                    <input
                      type="text"
                      placeholder="or Mask Image ID"
                      value={inpaintIds.mask}
                      onChange={e => setInpaintIds(prev => ({ ...prev, mask: e.target.value }))}
                      className="w-full p-2 border rounded text-xs"
                    />
                  </div>
                  {inpaintFiles.mask && (
                    <img
                      src={URL.createObjectURL(inpaintFiles.mask)}
                      alt="Mask preview"
                      className="w-full h-20 object-cover rounded mt-2"
                    />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-3">Reference (Optional)</h3>
                  <Button
                    onClick={() => refFileRef.current?.click()}
                    variant="outline"
                    className="w-full gap-2"
                    disabled={isProcessing}
                  >
                    <Upload className="h-4 w-4" />
                    Upload Reference
                  </Button>
                  <input
                    ref={refFileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={e => setInpaintFiles(prev => ({ ...prev, reference: e.target.files?.[0] || null }))}
                    className="hidden"
                  />
                  <div className="mt-3">
                    <input
                      type="text"
                      placeholder="or Reference Image ID"
                      value={inpaintIds.reference}
                      onChange={e => setInpaintIds(prev => ({ ...prev, reference: e.target.value }))}
                      className="w-full p-2 border rounded text-xs"
                    />
                  </div>
                  {inpaintFiles.reference && (
                    <img
                      src={URL.createObjectURL(inpaintFiles.reference)}
                      alt="Reference preview"
                      className="w-full h-20 object-cover rounded mt-2"
                    />
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="p-4 space-y-4">
                <div>
                  <label className="text-sm font-medium">Prompt</label>
                  <input
                    type="text"
                    placeholder="Describe what should be inpainted"
                    value={inpaintSettings.prompt}
                    onChange={e => setInpaintSettings(prev => ({ ...prev, prompt: e.target.value }))}
                    className="w-full mt-1 p-2 border rounded"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Denoise</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0.05"
                      max="1"
                      value={inpaintSettings.denoise}
                      onChange={e => setInpaintSettings(prev => ({ ...prev, denoise: parseFloat(e.target.value) || 0.4 }))}
                      className="w-full mt-1 p-2 border rounded"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Images</label>
                    <input
                      type="number"
                      min="1"
                      max="4"
                      value={inpaintSettings.numImages}
                      onChange={e => setInpaintSettings(prev => ({ ...prev, numImages: parseInt(e.target.value) || 1 }))}
                      className="w-full mt-1 p-2 border rounded"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleInpaint}
                  disabled={isProcessing}
                  className="w-full gap-2"
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Paintbrush className="h-4 w-4" />
                  )}
                  Start Inpainting
                </Button>
              </CardContent>
            </Card>

            {inpaintResult?.path && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold">Inpainted Image</h3>
                    {inpaintResult.credits_used && (
                      <Badge variant="outline">{inpaintResult.credits_used} credits used</Badge>
                    )}
                  </div>
                  <img
                    src={inpaintResult.path}
                    alt="Inpainted image"
                    className="w-full rounded-lg"
                  />
                  <div className="flex gap-2 mt-3">
                    <Button
                      onClick={() => handleDownload(inpaintResult.path!, `inpainted-${Date.now()}.png`)}
                      variant="outline"
                      className="flex-1 gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                    <Button
                      onClick={() => handleSaveToGallery(inpaintResult)}
                      variant="outline"
                      className="flex-1 gap-2"
                    >
                      <Save className="h-4 w-4" />
                      Save to Gallery
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="video" className="space-y-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                <div>
                  <label className="text-sm font-medium">Image ID</label>
                  <input
                    type="text"
                    placeholder="Enter image ID to animate"
                    value={videoSettings.imageId}
                    onChange={e => setVideoSettings(prev => ({ ...prev, imageId: e.target.value }))}
                    className="w-full mt-1 p-2 border rounded"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Motion Prompt</label>
                  <textarea
                    placeholder="Describe the motion (e.g., subtle turn, lighting sweep, gentle movement)"
                    value={videoSettings.prompt}
                    onChange={e => setVideoSettings(prev => ({ ...prev, prompt: e.target.value }))}
                    className="w-full mt-1 p-2 border rounded h-20 resize-none"
                  />
                </div>

                <Button
                  onClick={handleVideo}
                  disabled={!videoSettings.imageId.trim() || !videoSettings.prompt.trim() || isProcessing}
                  className="w-full gap-2"
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  Generate Video (up to 10 minutes)
                </Button>
              </CardContent>
            </Card>

            {videoResult?.video_path && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold">Generated Video</h3>
                    {videoResult.credits_used && (
                      <Badge variant="outline">{videoResult.credits_used} credits used</Badge>
                    )}
                  </div>
                  <video
                    controls
                    className="w-full rounded-lg"
                  >
                    <source src={videoResult.video_path} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                  <div className="flex gap-2 mt-3">
                    <Button
                      onClick={() => handleDownload(videoResult.video_path!, `video-${Date.now()}.mp4`)}
                      variant="outline"
                      className="flex-1 gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download Video
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <div className="bg-muted/50 p-3 rounded-lg">
          <div className="flex items-start gap-2 text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 text-blue-500 flex-shrink-0" />
            <div className="space-y-1 text-muted-foreground">
              <p className="font-medium">Tips for best results:</p>
              <p>• Try-On: Use full-body, front-facing photos with good lighting</p>
              <p>• Generate: Be descriptive and specific in your prompts</p>
              <p>• Inpaint: Black areas in mask will be replaced</p>
              <p>• Video: Keep motion prompts simple and realistic</p>
              <p>• Rate limit: Max 10 requests per second</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AiStudioModal;
