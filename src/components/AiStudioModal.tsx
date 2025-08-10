
import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  Image, 
  AlertCircle, 
  Loader2, 
  Download, 
  Save,
  Sparkles,
  Wand2,
  Zap,
  Video,
  Palette
} from 'lucide-react';
import { useBitStudio } from '@/hooks/useBitStudio';
import { BITSTUDIO_IMAGE_TYPES } from '@/lib/bitstudio-types';
import type { BitStudioImage, AspectRatio, Resolution, Style, UpscaleFactor } from '@/lib/bitstudio-types';

interface AiStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ImageUpload {
  file: File;
  preview: string;
  uploadedImage?: BitStudioImage;
}

const AiStudioModal: React.FC<AiStudioModalProps> = ({ isOpen, onClose }) => {
  const {
    loading,
    error,
    uploadImage,
    virtualTryOn,
    generateImages,
    upscaleImage,
    inpaintImage,
    generateVideo,
    clearError
  } = useBitStudio();

  // Virtual Try-On State
  const [personUpload, setPersonUpload] = useState<ImageUpload | null>(null);
  const [outfitUpload, setOutfitUpload] = useState<ImageUpload | null>(null);
  const [vtoSettings, setVtoSettings] = useState({
    resolution: 'standard' as Resolution,
    num_images: 1,
    prompt: '',
    seed: undefined as number | undefined
  });
  const [vtoResult, setVtoResult] = useState<BitStudioImage | null>(null);

  // Generate Images State
  const [genSettings, setGenSettings] = useState({
    prompt: '',
    aspect_ratio: 'square' as AspectRatio,
    style: 'studio' as Style,
    resolution: 'standard' as Resolution,
    num_images: 1,
    seed: undefined as number | undefined
  });
  const [genResult, setGenResult] = useState<BitStudioImage | null>(null);

  // Upscale State
  const [upscaleSettings, setUpscaleSettings] = useState({
    imageId: '',
    upscale_factor: 2 as UpscaleFactor,
    denoise: undefined as number | undefined
  });
  const [upscaleResult, setUpscaleResult] = useState<BitStudioImage | null>(null);

  // Inpaint State
  const [baseUpload, setBaseUpload] = useState<ImageUpload | null>(null);
  const [maskUpload, setMaskUpload] = useState<ImageUpload | null>(null);
  const [refUpload, setRefUpload] = useState<ImageUpload | null>(null);
  const [inpaintSettings, setInpaintSettings] = useState({
    prompt: '',
    denoise: 0.4,
    num_images: 1
  });
  const [inpaintResult, setInpaintResult] = useState<BitStudioImage | null>(null);

  // Video State
  const [videoSettings, setVideoSettings] = useState({
    imageId: '',
    prompt: ''
  });
  const [videoResult, setVideoResult] = useState<BitStudioImage | null>(null);

  // File input refs
  const personFileRef = useRef<HTMLInputElement>(null);
  const outfitFileRef = useRef<HTMLInputElement>(null);
  const baseFileRef = useRef<HTMLInputElement>(null);
  const maskFileRef = useRef<HTMLInputElement>(null);
  const refFileRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
      return false;
    }

    if (file.size > maxSize) {
      return false;
    }

    return true;
  };

  const handleFileUpload = async (
    file: File, 
    type: string, 
    setter: React.Dispatch<React.SetStateAction<ImageUpload | null>>
  ) => {
    if (!validateFile(file)) {
      return;
    }

    const preview = URL.createObjectURL(file);
    const imageUpload: ImageUpload = { file, preview };
    setter(imageUpload);

    const uploadedImage = await uploadImage(file, type);
    if (uploadedImage) {
      setter(prev => prev ? { ...prev, uploadedImage } : null);
    }
  };

  const handleVirtualTryOn = async () => {
    if (!personUpload?.uploadedImage?.id || !outfitUpload?.uploadedImage?.id) {
      return;
    }

    const result = await virtualTryOn({
      person_image_id: personUpload.uploadedImage.id,
      outfit_image_id: outfitUpload.uploadedImage.id,
      ...vtoSettings,
      seed: vtoSettings.seed || undefined
    });

    if (result) {
      setVtoResult(result);
    }
  };

  const handleGenerate = async () => {
    if (!genSettings.prompt.trim()) {
      return;
    }

    const result = await generateImages({
      ...genSettings,
      seed: genSettings.seed || undefined
    });

    if (result) {
      setGenResult(result);
    }
  };

  const handleUpscale = async () => {
    if (!upscaleSettings.imageId.trim()) {
      return;
    }

    const result = await upscaleImage(upscaleSettings.imageId, {
      upscale_factor: upscaleSettings.upscale_factor,
      denoise: upscaleSettings.denoise
    });

    if (result) {
      setUpscaleResult(result);
    }
  };

  const handleInpaint = async () => {
    if (!baseUpload?.uploadedImage?.id || !maskUpload?.uploadedImage?.id) {
      return;
    }

    const result = await inpaintImage(baseUpload.uploadedImage.id, {
      mask_image_id: maskUpload.uploadedImage.id,
      reference_image_id: refUpload?.uploadedImage?.id,
      prompt: inpaintSettings.prompt || undefined,
      denoise: inpaintSettings.denoise,
      num_images: inpaintSettings.num_images
    });

    if (result) {
      setInpaintResult(result);
    }
  };

  const handleVideoGeneration = async () => {
    if (!videoSettings.imageId.trim() || !videoSettings.prompt.trim()) {
      return;
    }

    const result = await generateVideo(videoSettings.imageId, {
      prompt: videoSettings.prompt
    });

    if (result) {
      setVideoResult(result);
    }
  };

  const handleDownloadResult = (result: BitStudioImage) => {
    if (!result.path) return;

    const link = document.createElement('a');
    link.href = result.path;
    link.download = `bitstudio-result-${Date.now()}.${result.video_path ? 'mp4' : 'png'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetAll = () => {
    setPersonUpload(null);
    setOutfitUpload(null);
    setBaseUpload(null);
    setMaskUpload(null);
    setRefUpload(null);
    setVtoResult(null);
    setGenResult(null);
    setUpscaleResult(null);
    setInpaintResult(null);
    setVideoResult(null);
    clearError();
  };

  const handleClose = () => {
    resetAll();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
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
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="tryon" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="tryon" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Try-On
            </TabsTrigger>
            <TabsTrigger value="generate" className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              Generate
            </TabsTrigger>
            <TabsTrigger value="upscale" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Upscale
            </TabsTrigger>
            <TabsTrigger value="inpaint" className="flex items-center gap-2">
              <Wand2 className="h-4 w-4" />
              Inpaint
            </TabsTrigger>
            <TabsTrigger value="video" className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              Video
            </TabsTrigger>
          </TabsList>

          {/* Virtual Try-On Tab */}
          <TabsContent value="tryon" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Person Upload */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Person Photo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {personUpload ? (
                    <div className="space-y-3">
                      <div className="aspect-[3/4] max-w-48 mx-auto rounded-lg overflow-hidden">
                        <img
                          src={personUpload.preview}
                          alt="Person"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => personFileRef.current?.click()}
                        >
                          Change
                        </Button>
                        {personUpload.uploadedImage && (
                          <Badge variant="secondary" className="text-xs">
                            Uploaded ✓
                          </Badge>
                        )}
                      </div>
                    </div>
                  ) : (
                    <Button 
                      onClick={() => personFileRef.current?.click()}
                      disabled={loading}
                      className="w-full gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Upload Person Photo
                    </Button>
                  )}
                  <input
                    ref={personFileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, BITSTUDIO_IMAGE_TYPES.PERSON, setPersonUpload);
                    }}
                    className="hidden"
                  />
                </CardContent>
              </Card>

              {/* Outfit Upload */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Outfit Photo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {outfitUpload ? (
                    <div className="space-y-3">
                      <div className="aspect-square max-w-48 mx-auto rounded-lg overflow-hidden">
                        <img
                          src={outfitUpload.preview}
                          alt="Outfit"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => outfitFileRef.current?.click()}
                        >
                          Change
                        </Button>
                        {outfitUpload.uploadedImage && (
                          <Badge variant="secondary" className="text-xs">
                            Uploaded ✓
                          </Badge>
                        )}
                      </div>
                    </div>
                  ) : (
                    <Button 
                      onClick={() => outfitFileRef.current?.click()}
                      disabled={loading}
                      className="w-full gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Upload Outfit Photo
                    </Button>
                  )}
                  <input
                    ref={outfitFileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, BITSTUDIO_IMAGE_TYPES.OUTFIT, setOutfitUpload);
                    }}
                    className="hidden"
                  />
                </CardContent>
              </Card>
            </div>

            {/* Try-On Controls */}
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <Label htmlFor="vto-resolution">Resolution</Label>
                    <Select
                      value={vtoSettings.resolution}
                      onValueChange={(value: Resolution) => 
                        setVtoSettings(prev => ({ ...prev, resolution: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="high">High Quality</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="vto-num-images">Images</Label>
                    <Select
                      value={vtoSettings.num_images.toString()}
                      onValueChange={(value) => 
                        setVtoSettings(prev => ({ ...prev, num_images: parseInt(value) }))
                      }
                    >
                      <SelectTrigger>
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
                    <Label htmlFor="vto-prompt">Prompt (Optional)</Label>
                    <Input
                      id="vto-prompt"
                      placeholder="e.g., studio lighting"
                      value={vtoSettings.prompt}
                      onChange={(e) => 
                        setVtoSettings(prev => ({ ...prev, prompt: e.target.value }))
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="vto-seed">Seed (Optional)</Label>
                    <Input
                      id="vto-seed"
                      type="number"
                      placeholder="Random seed"
                      value={vtoSettings.seed || ''}
                      onChange={(e) => 
                        setVtoSettings(prev => ({ 
                          ...prev, 
                          seed: e.target.value ? parseInt(e.target.value) : undefined 
                        }))
                      }
                    />
                  </div>
                </div>

                <Button
                  onClick={handleVirtualTryOn}
                  disabled={loading || !personUpload?.uploadedImage || !outfitUpload?.uploadedImage}
                  className="w-full gap-2"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {loading ? 'Generating Try-On...' : 'Generate Try-On'}
                </Button>
              </CardContent>
            </Card>

            {/* Try-On Result */}
            {vtoResult?.path && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center justify-between">
                    Try-On Result
                    {vtoResult.credits_used && (
                      <Badge variant="outline">
                        {vtoResult.credits_used} credits used
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="aspect-[3/4] max-w-md mx-auto rounded-lg overflow-hidden">
                      <img
                        src={vtoResult.path}
                        alt="Try-on result"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleDownloadResult(vtoResult)}
                        variant="outline"
                        className="flex-1 gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 gap-2"
                      >
                        <Save className="h-4 w-4" />
                        Save to Gallery
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Generate Images Tab */}
          <TabsContent value="generate" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Generate Images</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="gen-prompt">Prompt *</Label>
                  <Textarea
                    id="gen-prompt"
                    placeholder="Describe the image you want to generate..."
                    value={genSettings.prompt}
                    onChange={(e) => 
                      setGenSettings(prev => ({ ...prev, prompt: e.target.value }))
                    }
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Aspect Ratio</Label>
                    <Select
                      value={genSettings.aspect_ratio}
                      onValueChange={(value: AspectRatio) => 
                        setGenSettings(prev => ({ ...prev, aspect_ratio: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="square">Square</SelectItem>
                        <SelectItem value="portrait">Portrait</SelectItem>
                        <SelectItem value="landscape">Landscape</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Style</Label>
                    <Select
                      value={genSettings.style}
                      onValueChange={(value: Style) => 
                        setGenSettings(prev => ({ ...prev, style: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="studio">Studio</SelectItem>
                        <SelectItem value="smartphone">Smartphone</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Resolution</Label>
                    <Select
                      value={genSettings.resolution}
                      onValueChange={(value: Resolution) => 
                        setGenSettings(prev => ({ ...prev, resolution: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Images</Label>
                    <Select
                      value={genSettings.num_images.toString()}
                      onValueChange={(value) => 
                        setGenSettings(prev => ({ ...prev, num_images: parseInt(value) }))
                      }
                    >
                      <SelectTrigger>
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
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={loading || !genSettings.prompt.trim()}
                  className="w-full gap-2"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Palette className="h-4 w-4" />
                  )}
                  {loading ? 'Generating Images...' : 'Generate Images'}
                </Button>
              </CardContent>
            </Card>

            {/* Generate Result */}
            {genResult?.path && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center justify-between">
                    Generated Image
                    {genResult.credits_used && (
                      <Badge variant="outline">
                        {genResult.credits_used} credits used
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="max-w-md mx-auto rounded-lg overflow-hidden">
                      <img
                        src={genResult.path}
                        alt="Generated image"
                        className="w-full h-auto object-cover"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleDownloadResult(genResult)}
                        variant="outline"
                        className="flex-1 gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 gap-2"
                      >
                        <Save className="h-4 w-4" />
                        Save to Gallery
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Upscale Tab */}
          <TabsContent value="upscale" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Upscale Image</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="upscale-id">Image ID *</Label>
                  <Input
                    id="upscale-id"
                    placeholder="Enter image ID to upscale"
                    value={upscaleSettings.imageId}
                    onChange={(e) => 
                      setUpscaleSettings(prev => ({ ...prev, imageId: e.target.value }))
                    }
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Upscale Factor</Label>
                    <Select
                      value={upscaleSettings.upscale_factor.toString()}
                      onValueChange={(value) => 
                        setUpscaleSettings(prev => ({ 
                          ...prev, 
                          upscale_factor: parseInt(value) as UpscaleFactor 
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1x</SelectItem>
                        <SelectItem value="2">2x</SelectItem>
                        <SelectItem value="4">4x</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="upscale-denoise">Denoise (Optional)</Label>
                    <Input
                      id="upscale-denoise"
                      type="number"
                      step="0.05"
                      min="0"
                      max="1"
                      placeholder="0.0 - 1.0"
                      value={upscaleSettings.denoise || ''}
                      onChange={(e) => 
                        setUpscaleSettings(prev => ({ 
                          ...prev, 
                          denoise: e.target.value ? parseFloat(e.target.value) : undefined 
                        }))
                      }
                    />
                  </div>
                </div>

                <Button
                  onClick={handleUpscale}
                  disabled={loading || !upscaleSettings.imageId.trim()}
                  className="w-full gap-2"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                  {loading ? 'Upscaling...' : 'Upscale Image'}
                </Button>
              </CardContent>
            </Card>

            {/* Upscale Result */}
            {upscaleResult?.path && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center justify-between">
                    Upscaled Image
                    {upscaleResult.credits_used && (
                      <Badge variant="outline">
                        {upscaleResult.credits_used} credits used
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="max-w-md mx-auto rounded-lg overflow-hidden">
                      <img
                        src={upscaleResult.path}
                        alt="Upscaled image"
                        className="w-full h-auto object-cover"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleDownloadResult(upscaleResult)}
                        variant="outline"
                        className="flex-1 gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Inpaint Tab */}
          <TabsContent value="inpaint" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Base Image */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Base Image *</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {baseUpload ? (
                    <div className="space-y-3">
                      <div className="aspect-square rounded-lg overflow-hidden">
                        <img
                          src={baseUpload.preview}
                          alt="Base"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => baseFileRef.current?.click()}
                      >
                        Change
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      onClick={() => baseFileRef.current?.click()}
                      disabled={loading}
                      className="w-full gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Upload Base
                    </Button>
                  )}
                  <input
                    ref={baseFileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, BITSTUDIO_IMAGE_TYPES.INPAINT_BASE, setBaseUpload);
                    }}
                    className="hidden"
                  />
                </CardContent>
              </Card>

              {/* Mask Image */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Mask Image *</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {maskUpload ? (
                    <div className="space-y-3">
                      <div className="aspect-square rounded-lg overflow-hidden">
                        <img
                          src={maskUpload.preview}
                          alt="Mask"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => maskFileRef.current?.click()}
                      >
                        Change
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      onClick={() => maskFileRef.current?.click()}
                      disabled={loading}
                      className="w-full gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Upload Mask
                    </Button>
                  )}
                  <input
                    ref={maskFileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, BITSTUDIO_IMAGE_TYPES.INPAINT_MASK, setMaskUpload);
                    }}
                    className="hidden"
                  />
                </CardContent>
              </Card>

              {/* Reference Image */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Reference (Optional)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {refUpload ? (
                    <div className="space-y-3">
                      <div className="aspect-square rounded-lg overflow-hidden">
                        <img
                          src={refUpload.preview}
                          alt="Reference"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => refFileRef.current?.click()}
                      >
                        Change
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      onClick={() => refFileRef.current?.click()}
                      disabled={loading}
                      variant="outline"
                      className="w-full gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Upload Reference
                    </Button>
                  )}
                  <input
                    ref={refFileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, BITSTUDIO_IMAGE_TYPES.INPAINT_REFERENCE, setRefUpload);
                    }}
                    className="hidden"
                  />
                </CardContent>
              </Card>
            </div>

            {/* Inpaint Controls */}
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <Label htmlFor="inpaint-prompt">Prompt</Label>
                    <Input
                      id="inpaint-prompt"
                      placeholder="Describe what to paint in the mask area"
                      value={inpaintSettings.prompt}
                      onChange={(e) => 
                        setInpaintSettings(prev => ({ ...prev, prompt: e.target.value }))
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="inpaint-denoise">Denoise</Label>
                    <Input
                      id="inpaint-denoise"
                      type="number"
                      step="0.05"
                      min="0.05"
                      max="1"
                      value={inpaintSettings.denoise}
                      onChange={(e) => 
                        setInpaintSettings(prev => ({ 
                          ...prev, 
                          denoise: parseFloat(e.target.value) || 0.4 
                        }))
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="inpaint-num">Images</Label>
                    <Select
                      value={inpaintSettings.num_images.toString()}
                      onValueChange={(value) => 
                        setInpaintSettings(prev => ({ ...prev, num_images: parseInt(value) }))
                      }
                    >
                      <SelectTrigger>
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
                </div>

                <Button
                  onClick={handleInpaint}
                  disabled={loading || !baseUpload?.uploadedImage || !maskUpload?.uploadedImage}
                  className="w-full gap-2"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4" />
                  )}
                  {loading ? 'Inpainting...' : 'Start Inpainting'}
                </Button>
              </CardContent>
            </Card>

            {/* Inpaint Result */}
            {inpaintResult?.path && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center justify-between">
                    Inpainted Image
                    {inpaintResult.credits_used && (
                      <Badge variant="outline">
                        {inpaintResult.credits_used} credits used
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="max-w-md mx-auto rounded-lg overflow-hidden">
                      <img
                        src={inpaintResult.path}
                        alt="Inpainted image"
                        className="w-full h-auto object-cover"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleDownloadResult(inpaintResult)}
                        variant="outline"
                        className="flex-1 gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Video Tab */}
          <TabsContent value="video" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Image to Video</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="video-id">Image ID *</Label>
                  <Input
                    id="video-id"
                    placeholder="Enter image ID to animate"
                    value={videoSettings.imageId}
                    onChange={(e) => 
                      setVideoSettings(prev => ({ ...prev, imageId: e.target.value }))
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="video-prompt">Motion Prompt *</Label>
                  <Textarea
                    id="video-prompt"
                    placeholder="Describe the motion (e.g., 'gentle sway', 'zoom in slowly')"
                    value={videoSettings.prompt}
                    onChange={(e) => 
                      setVideoSettings(prev => ({ ...prev, prompt: e.target.value }))
                    }
                  />
                </div>

                <Button
                  onClick={handleVideoGeneration}
                  disabled={loading || !videoSettings.imageId.trim() || !videoSettings.prompt.trim()}
                  className="w-full gap-2"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Video className="h-4 w-4" />
                  )}
                  {loading ? 'Generating Video... (up to 10 min)' : 'Generate Video'}
                </Button>
              </CardContent>
            </Card>

            {/* Video Result */}
            {videoResult?.video_path && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Generated Video</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="max-w-md mx-auto rounded-lg overflow-hidden">
                      <video 
                        controls 
                        className="w-full h-auto"
                        preload="metadata"
                      >
                        <source src={videoResult.video_path} type="video/mp4" />
                        Your browser does not support the video tag.
                      </video>
                    </div>
                    <Button
                      onClick={() => handleDownloadResult(videoResult)}
                      variant="outline"
                      className="w-full gap-2"
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

        {/* Tips */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Tips:</strong> For best results, use high-quality images with good lighting. 
            Virtual try-on works best with full-body, front-facing photos and clean garment images.
            Rate limit: max 10 requests per second.
          </AlertDescription>
        </Alert>
      </DialogContent>
    </Dialog>
  );
};

export default AiStudioModal;
