
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, Sparkles, Upload, Wand2, ArrowUp, Edit, Play } from 'lucide-react';
import { useBitStudio } from '@/hooks/useBitStudio';
import { BITSTUDIO_IMAGE_TYPES } from '@/lib/bitstudio-types';
import { useToast } from '@/hooks/use-toast';

export interface AiStudioModalProps {
  open: boolean;
  onClose: () => void;
  trigger?: React.ReactNode;
}

function mapResolutionFor(
  feature: 'tryon' | 'generate' | 'edit',
  selected: 'low' | 'standard' | 'high'
): 'low' | 'standard' | 'high' {
  if (feature === 'edit') {
    return selected === 'high' ? 'standard' : selected;
  }
  return selected === 'low' ? 'standard' : selected;
}

const AiStudioModal: React.FC<AiStudioModalProps> = ({ open, onClose, trigger }) => {
  const [activeTab, setActiveTab] = useState('virtual-tryon');
  
  // File uploads
  const [personFile, setPersonFile] = useState<File | null>(null);
  const [outfitFile, setOutfitFile] = useState<File | null>(null);
  const [baseFile, setBaseFile] = useState<File | null>(null);
  const [maskFile, setMaskFile] = useState<File | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  
  // Form data
  const [prompt, setPrompt] = useState('');
  const [resolution, setResolution] = useState<'standard' | 'high' | 'low'>('standard');
  const [numImages, setNumImages] = useState(1);
  const [aspectRatio, setAspectRatio] = useState<'portrait' | 'landscape' | 'square'>('portrait');
  const [style, setStyle] = useState<'studio' | 'smartphone'>('studio');
  const [upscaleFactor, setUpscaleFactor] = useState<1 | 2 | 4>(2);
  
  // Results
  const [currentResult, setCurrentResult] = useState<any>(null);
  const [personImageId, setPersonImageId] = useState<string | null>(null);
  const [outfitImageId, setOutfitImageId] = useState<string | null>(null);
  const [baseImageId, setBaseImageId] = useState<string | null>(null);
  const [maskImageId, setMaskImageId] = useState<string | null>(null);
  const [referenceImageId, setReferenceImageId] = useState<string | null>(null);
  
  const { 
    loading, 
    error, 
    uploadImage, 
    virtualTryOn, 
    generateImages, 
    upscaleImage, 
    inpaintImage, 
    editImage, 
    generateVideo,
    clearError 
  } = useBitStudio();
  
  const { toast } = useToast();

  // File validation helper
  const validateFile = (file: File): boolean => {
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Please select an image file smaller than 10MB',
        variant: 'destructive',
      });
      return false;
    }
    
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File Type',
        description: 'Please select an image file',
        variant: 'destructive',
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
          description: 'Image uploaded successfully',
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

  const handleBaseUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBaseFile(file);
      handleFileUpload(file, BITSTUDIO_IMAGE_TYPES.INPAINT_BASE, setBaseImageId);
    }
  };

  const handleMaskUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMaskFile(file);
      handleFileUpload(file, BITSTUDIO_IMAGE_TYPES.INPAINT_MASK, setMaskImageId);
    }
  };

  const handleReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReferenceFile(file);
      handleFileUpload(file, BITSTUDIO_IMAGE_TYPES.INPAINT_REFERENCE, setReferenceImageId);
    }
  };

  // Feature handlers
  const handleVirtualTryOn = async () => {
    if (!personImageId || !outfitImageId) {
      toast({
        title: 'Missing Images',
        description: 'Please upload both person and outfit images',
        variant: 'destructive',
      });
      return;
    }

    const result = await virtualTryOn({
      person_image_id: personImageId,
      outfit_image_id: outfitImageId,
      resolution: mapResolutionFor('tryon', resolution),
      num_images: numImages,
      prompt: prompt || undefined,
    });

    if (result) {
      setCurrentResult(result);
    }
  };

  const handleGenerateImages = async () => {
    if (!prompt.trim()) {
      toast({
        title: 'Missing Prompt',
        description: 'Please enter a description for image generation',
        variant: 'destructive',
      });
      return;
    }

    const result = await generateImages({
      prompt,
      num_images: numImages,
      aspect_ratio: aspectRatio,
      style,
      resolution: mapResolutionFor('generate', resolution),
      outfit_image_id: outfitImageId || undefined,
    });

    if (result) {
      setCurrentResult(result);
    }
  };

  const handleUpscale = async () => {
    if (!currentResult?.id) {
      toast({
        title: 'No Image',
        description: 'Please generate or upload an image first',
        variant: 'destructive',
      });
      return;
    }

    const result = await upscaleImage(currentResult.id, {
      upscale_factor: upscaleFactor,
    });

    if (result) {
      setCurrentResult(result);
    }
  };

  const handleInpaint = async () => {
    if (!baseImageId || !maskImageId) {
      toast({
        title: 'Missing Images',
        description: 'Please upload both base and mask images',
        variant: 'destructive',
      });
      return;
    }

    const result = await inpaintImage(baseImageId, {
      mask_image_id: maskImageId,
      reference_image_id: referenceImageId || undefined,
      prompt: prompt || undefined,
      denoise: 0.4,
      num_images: numImages,
    });

    if (result) {
      setCurrentResult(result);
    }
  };

  const handleEdit = async () => {
    if (!currentResult?.id) {
      toast({
        title: 'No Image',
        description: 'Please generate or upload an image first',
        variant: 'destructive',
      });
      return;
    }

    if (!prompt.trim()) {
      toast({
        title: 'Missing Prompt',
        description: 'Please enter edit instructions',
        variant: 'destructive',
      });
      return;
    }

    const result = await editImage(currentResult.id, {
      prompt,
      resolution: mapResolutionFor('edit', resolution),
      num_images: numImages,
    });

    if (result) {
      setCurrentResult(result);
    }
  };

  const handleGenerateVideo = async () => {
    if (!currentResult?.id) {
      toast({
        title: 'No Image',
        description: 'Please generate or upload an image first',
        variant: 'destructive',
      });
      return;
    }

    if (!prompt.trim()) {
      toast({
        title: 'Missing Prompt',
        description: 'Please enter video generation prompt',
        variant: 'destructive',
      });
      return;
    }

    const result = await generateVideo(currentResult.id, {
      prompt,
    });

    if (result) {
      setCurrentResult(result);
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
      a.download = `bitstudio-result-${currentResult.id}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      toast({
        title: 'Download Failed',
        description: 'Could not download the image',
        variant: 'destructive',
      });
    }
  };

  const downloadVideo = async () => {
    if (!currentResult?.video_path) return;
    
    try {
      const response = await fetch(currentResult.video_path);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bitstudio-video-${currentResult.id}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      toast({
        title: 'Download Failed',
        description: 'Could not download the video',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      {trigger && (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-4xl h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Studio
            <Badge variant="secondary">Powered by bitStudio</Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Controls */}
          <div className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="virtual-tryon">Try-On</TabsTrigger>
                <TabsTrigger value="generate">Generate</TabsTrigger>
                <TabsTrigger value="enhance">Enhance</TabsTrigger>
              </TabsList>
              
              <TabsContent value="virtual-tryon" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Wand2 className="h-4 w-4" />
                      Virtual Try-On
                    </CardTitle>
                    <CardDescription>
                      Upload a person and outfit to see how they look together
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="person-upload">Person Image</Label>
                      <Input
                        id="person-upload"
                        type="file"
                        accept="image/*"
                        onChange={handlePersonUpload}
                        className="mt-1"
                      />
                      {personImageId && <Badge variant="outline" className="mt-1">Uploaded</Badge>}
                    </div>
                    
                    <div>
                      <Label htmlFor="outfit-upload">Outfit Image</Label>
                      <Input
                        id="outfit-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleOutfitUpload}
                        className="mt-1"
                      />
                      {outfitImageId && <Badge variant="outline" className="mt-1">Uploaded</Badge>}
                    </div>
                    
                    <div>
                      <Label htmlFor="prompt">Prompt (Optional)</Label>
                      <Textarea
                        id="prompt"
                        placeholder="Describe any specific styling or modifications..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    
                    <Button 
                      onClick={handleVirtualTryOn} 
                      disabled={loading || !personImageId || !outfitImageId}
                      className="w-full"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Wand2 className="h-4 w-4 mr-2" />}
                      Generate Try-On
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="generate" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Image Generation
                    </CardTitle>
                    <CardDescription>
                      Create fashion images from text descriptions
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="gen-prompt">Prompt</Label>
                      <Textarea
                        id="gen-prompt"
                        placeholder="A stylish woman wearing a red dress..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Aspect Ratio</Label>
                        <Select value={aspectRatio} onValueChange={(value: any) => setAspectRatio(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="portrait">Portrait</SelectItem>
                            <SelectItem value="landscape">Landscape</SelectItem>
                            <SelectItem value="square">Square</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label>Style</Label>
                        <Select value={style} onValueChange={(value: any) => setStyle(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="studio">Studio</SelectItem>
                            <SelectItem value="smartphone">Smartphone</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={handleGenerateImages} 
                      disabled={loading || !prompt.trim()}
                      className="w-full"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                      Generate Images
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="enhance" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ArrowUp className="h-4 w-4" />
                      Enhance Images
                    </CardTitle>
                    <CardDescription>
                      Upscale, edit, inpaint, or create videos from your images
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-4 gap-2">
                      <Button 
                        onClick={handleUpscale} 
                        disabled={loading || !currentResult?.id}
                        variant="outline"
                        size="sm"
                      >
                        {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <ArrowUp className="h-3 w-3 mr-1" />}
                        Upscale
                      </Button>
                      
                      <Button 
                        onClick={handleEdit} 
                        disabled={loading || !currentResult?.id || !prompt.trim()}
                        variant="outline"
                        size="sm"
                      >
                        {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Edit className="h-3 w-3 mr-1" />}
                        Edit
                      </Button>
                      
                      <Button 
                        onClick={handleInpaint} 
                        disabled={loading || !baseImageId || !maskImageId}
                        variant="outline"
                        size="sm"
                      >
                        {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Upload className="h-3 w-3 mr-1" />}
                        Inpaint
                      </Button>
                      
                      <Button 
                        onClick={handleGenerateVideo} 
                        disabled={loading || !currentResult?.id || !prompt.trim()}
                        variant="outline"
                        size="sm"
                      >
                        {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Play className="h-3 w-3 mr-1" />}
                        Video
                      </Button>
                    </div>
                    
                    <div>
                      <Label htmlFor="enhance-prompt">Edit/Video Prompt</Label>
                      <Textarea
                        id="enhance-prompt"
                        placeholder="Describe the changes or video motion..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="mt-1"
                      />
                    </div>

                    {/* Inpainting file uploads */}
                    <div className="space-y-2">
                      <Label>Inpainting Images</Label>
                      <div className="grid grid-cols-1 gap-2">
                        <div>
                          <Label htmlFor="base-upload" className="text-sm">Base Image</Label>
                          <Input
                            id="base-upload"
                            type="file"
                            accept="image/*"
                            onChange={handleBaseUpload}
                            className="mt-1"
                          />
                          {baseImageId && <Badge variant="outline" className="mt-1">Base Uploaded</Badge>}
                        </div>
                        
                        <div>
                          <Label htmlFor="mask-upload" className="text-sm">Mask Image</Label>
                          <Input
                            id="mask-upload"
                            type="file"
                            accept="image/*"
                            onChange={handleMaskUpload}
                            className="mt-1"
                          />
                          {maskImageId && <Badge variant="outline" className="mt-1">Mask Uploaded</Badge>}
                        </div>
                        
                        <div>
                          <Label htmlFor="reference-upload" className="text-sm">Reference Image (Optional)</Label>
                          <Input
                            id="reference-upload"
                            type="file"
                            accept="image/*"
                            onChange={handleReferenceUpload}
                            className="mt-1"
                          />
                          {referenceImageId && <Badge variant="outline" className="mt-1">Reference Uploaded</Badge>}
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <Label>Upscale Factor</Label>
                      <Select value={upscaleFactor.toString()} onValueChange={(value) => setUpscaleFactor(parseInt(value) as 1 | 2 | 4)}>
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
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
            
            {/* Common Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Resolution</Label>
                    <Select value={resolution} onValueChange={(value: any) => setResolution(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Number of Images</Label>
                    <Select value={numImages.toString()} onValueChange={(value) => setNumImages(parseInt(value))}>
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
              </CardContent>
            </Card>
            
            {error && (
              <Card className="border-destructive">
                <CardContent className="pt-6">
                  <p className="text-sm text-destructive">{error}</p>
                </CardContent>
              </Card>
            )}
          </div>
          
          {/* Results */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Result</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Generating...</p>
                    </div>
                  </div>
                ) : currentResult ? (
                  <div className="space-y-4">
                    {currentResult.path ? (
                      <img 
                        src={currentResult.path} 
                        alt="Generated result" 
                        className="w-full rounded-lg"
                      />
                    ) : currentResult.video_path ? (
                      <video 
                        src={currentResult.video_path} 
                        controls 
                        className="w-full rounded-lg"
                      />
                    ) : (
                      <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                        <p className="text-sm text-muted-foreground">Processing...</p>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Badge variant={currentResult.status === 'completed' ? 'default' : 'secondary'}>
                          {currentResult.status}
                        </Badge>
                        {currentResult.credits_used && (
                          <p className="text-xs text-muted-foreground">
                            Credits used: {currentResult.credits_used}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        {currentResult.path && (
                          <Button onClick={downloadImage} size="sm" variant="outline">
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        )}
                        {currentResult.video_path && (
                          <Button onClick={downloadVideo} size="sm" variant="outline">
                            <Download className="h-4 w-4 mr-2" />
                            Download Video
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <Sparkles className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Your AI-generated content will appear here</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AiStudioModal;
