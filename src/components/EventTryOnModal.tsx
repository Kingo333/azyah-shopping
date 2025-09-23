import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, User, Loader2, Download, Eye, UserCircle } from 'lucide-react';
import { useBitStudio } from '@/hooks/useBitStudio';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BITSTUDIO_IMAGE_TYPES } from '@/lib/bitstudio-types';
import { useAiAssets } from '@/hooks/useAiAssets';

interface EventProduct {
  id: string;
  image_url: string;
  try_on_data: any;
  event_brand_id: string;
  brand_name: string;
  brand_logo_url?: string;
}

interface EventTryOnModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: EventProduct;
  eventId: string;
  eventName: string;
}

const EventTryOnModal: React.FC<EventTryOnModalProps> = ({
  isOpen,
  onClose,
  product,
  eventId,
  eventName
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [personImageId, setPersonImageId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'generating' | 'done' | 'failed'>('idle');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  
  const { toast } = useToast();
  const { loading, uploadImage, virtualTryOn, error } = useBitStudio();
  const { assets, saveAsset } = useAiAssets();

  // Check if user has uploaded person image for this event
  useEffect(() => {
    const checkPersonImage = async () => {
      if (!isOpen) return;
      
      try {
        const { data, error } = await supabase
          .from('event_user_photos')
          .select('photo_url')
          .eq('event_id', eventId)
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
          .single();

        if (data && !error) {
          // Convert stored URL to person image ID for BitStudio
          setPersonImageId(data.photo_url);
        }
      } catch (err) {
        console.error('Error checking person image:', err);
      }
    };

    checkPersonImage();
  }, [isOpen, eventId]);

  const validateFile = (file: File): boolean => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (JPEG, PNG, WebP)",
        variant: "destructive"
      });
      return false;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 10MB",
        variant: "destructive"
      });
      return false;
    }
    
    return true;
  };

  const handleFileSelect = async (selectedFile: File) => {
    if (validateFile(selectedFile)) {
      setFile(selectedFile);
      await uploadPersonImage(selectedFile);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const uploadPersonImage = async (file: File) => {
    try {
      setStatus('uploading');
      
      // Upload to BitStudio and get image ID
      const result = await uploadImage(file, BITSTUDIO_IMAGE_TYPES.PERSON);
      
      if (result?.id) {
        setPersonImageId(result.id);
        
        // Also store in event_user_photos for persistent access
        const { data: user } = await supabase.auth.getUser();
        if (user.user) {
          await supabase
            .from('event_user_photos')
            .upsert({
              event_id: eventId,
              user_id: user.user.id,
              photo_url: result.id // Store BitStudio image ID
            });
        }
        
        setStatus('idle');
        toast({
          title: 'Photo uploaded successfully!',
          description: 'Ready to try on products from this event'
        });
      }
    } catch (err: any) {
      console.error('Person image upload error:', err);
      setStatus('failed');
    }
  };

  const startTryOn = async () => {
    if (!personImageId || !product.try_on_data?.outfit_image_url) {
      toast({
        title: "Missing data",
        description: "Please wait for the photo to upload and product to load",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setStatus('generating');
      
      const result = await virtualTryOn({
        person_image_id: personImageId,
        outfit_image_url: product.try_on_data.outfit_image_url,
        resolution: 'standard',
        num_images: 1
      });

      if (result?.path) {
        setResultUrl(result.path);
        setStatus('done');
        
        // Save the result with event and brand context
        await saveAsset(result.path, undefined, `${eventName} - ${product.brand_name} - Try-On`);
        
        toast({
          title: 'Try-on complete!',
          description: 'Your virtual try-on is ready'
        });
      } else {
        throw new Error('No result returned from try-on');
      }
      
    } catch (err: any) {
      console.error('Try-on error:', err);
      setStatus('failed');
    }
  };

  const resetFlow = () => {
    setFile(null);
    setStatus('idle');
    setResultUrl(null);
  };

  const handleDownload = () => {
    if (resultUrl) {
      const link = document.createElement('a');
      link.href = resultUrl;
      link.download = `event-tryon-${eventName}-${product.brand_name}-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'uploading':
        return 'Uploading your photo...';
      case 'generating':
        return 'Generating your try-on...';
      default:
        return '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Try On: {product.brand_name}
          </DialogTitle>
        </DialogHeader>

        {/* Product Preview */}
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <img
            src={product.image_url}
            alt="Product"
            className="w-12 h-12 object-cover rounded"
          />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{product.brand_name}</p>
            <p className="text-sm text-muted-foreground">{eventName}</p>
          </div>
          {product.brand_logo_url && (
            <img
              src={product.brand_logo_url}
              alt={product.brand_name}
              className="w-8 h-8 object-contain"
            />
          )}
        </div>

        {/* Main Content Area */}
        <div className="space-y-4">
          {status === 'idle' && (
            <>
              <Alert>
                <AlertDescription className="text-sm">
                  <strong>Pro tips:</strong> Use a front-facing, full-body photo with good lighting and a plain background for best results.
                </AlertDescription>
              </Alert>

              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  dragActive 
                    ? 'border-primary bg-primary/5' 
                    : file || personImageId
                    ? 'border-green-500 bg-green-50' 
                    : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {file || personImageId ? (
                  <div className="space-y-2">
                    {file && (
                      <div className="w-20 h-20 mx-auto rounded-lg overflow-hidden">
                        <img
                          src={URL.createObjectURL(file)}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <p className="text-sm font-medium">
                      {personImageId ? 'Photo ready for try-on' : file?.name}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFile(null);
                        setPersonImageId(null);
                      }}
                    >
                      Change Photo
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Drop your photo here</p>
                      <p className="text-xs text-muted-foreground">or click to browse</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const selectedFile = e.target.files?.[0];
                        if (selectedFile) handleFileSelect(selectedFile);
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                )}
              </div>

              <Button
                onClick={startTryOn}
                disabled={!personImageId || !product.try_on_data?.outfit_image_url || loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Generating...
                  </>
                ) : (
                  'Try It On'
                )}
              </Button>
            </>
          )}

          {(status === 'uploading' || status === 'generating') && (
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto" />
              <p className="text-sm">{getStatusText()}</p>
              <p className="text-xs text-muted-foreground">
                This usually takes 30-60 seconds...
              </p>
            </div>
          )}

          {status === 'done' && resultUrl && (
            <div className="space-y-4">
              <img
                src={resultUrl}
                alt="Try-on result"
                className="w-full rounded-lg shadow-lg"
              />
              
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Save
                </Button>
                <Button variant="outline" onClick={onClose}>
                  <Eye className="h-4 w-4 mr-2" />
                  Done
                </Button>
              </div>
              
              <Button
                variant="ghost"
                onClick={resetFlow}
                className="w-full"
              >
                Try Another Photo
              </Button>
            </div>
          )}

          {status === 'failed' && (
            <div className="text-center space-y-4">
              <Alert variant="destructive">
                <AlertDescription>
                  {error || 'Try-on failed. Please try again with a clearer full-body photo.'}
                </AlertDescription>
              </Alert>
              <Button onClick={resetFlow} className="w-full">
                Try Again
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventTryOnModal;