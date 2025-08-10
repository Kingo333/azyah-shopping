
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, Sparkles, Wand2 } from 'lucide-react';
import { useBitStudio } from '@/hooks/useBitStudio';
import { BITSTUDIO_IMAGE_TYPES } from '@/lib/bitstudio-types';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export interface AiStudioModalProps {
  open: boolean;
  onClose: () => void;
  trigger?: React.ReactNode;
}

const AiStudioModal: React.FC<AiStudioModalProps> = ({ open, onClose, trigger }) => {
  // File uploads
  const [personFile, setPersonFile] = useState<File | null>(null);
  const [outfitFile, setOutfitFile] = useState<File | null>(null);
  
  // Form data
  const [prompt, setPrompt] = useState('');
  const [resolution, setResolution] = useState<'standard' | 'high'>('standard');
  const [numImages, setNumImages] = useState(1);
  
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

  // Virtual Try-On handler
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
      resolution: resolution as 'standard' | 'high',
      num_images: numImages,
      prompt: prompt || undefined,
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
      a.download = `bitstudio-tryon-${currentResult.id}.png`;
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
            AI Virtual Try-On
            <Badge variant="secondary">Powered by bitStudio</Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Controls */}
          <div className="space-y-4">
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
            
            {/* Settings */}
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
            <Alert className="mt-2">
              <AlertTitle>Best photo tips</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  <li>Person: single subject, full-body, front-facing, neutral pose; arms slightly away.</li>
                  <li>Lighting & background: bright, even light; plain background; avoid filters and obstructions.</li>
                  <li>Quality: high‑resolution (≥ 1024px), JPG/PNG/WebP, under 10MB.</li>
                  <li>Outfit: product cutout or flat/ghost mannequin on plain background; front view (no model).</li>
                </ul>
              </AlertDescription>
            </Alert>
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
                      <p className="text-sm text-muted-foreground">Generating try-on...</p>
                    </div>
                  </div>
                ) : currentResult ? (
                  <div className="space-y-4">
                    {currentResult.path ? (
                      <img 
                        src={currentResult.path} 
                        alt="Virtual try-on result" 
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
                      
                      {currentResult.path && (
                        <Button onClick={downloadImage} size="sm" variant="outline">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <Sparkles className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Your virtual try-on will appear here</p>
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
