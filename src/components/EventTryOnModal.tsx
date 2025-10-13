import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, User, Loader2, Download, Eye, UserCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAiAssets } from '@/hooks/useAiAssets';
import { runTryOn } from '@/lib/tryon';

interface EventProduct {
  id: string;
  image_url: string;
  try_on_data: any;
  try_on_config?: {
    outfit_image_id?: string;
    outfit_image_url?: string;
    outfitImagePath?: string;
  };
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
          // Store person image path for Gemini try-on
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
      console.log('[EventTryOn] Starting person upload:', file.name);
      
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');
      
      // Upload directly to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `person_${Date.now()}.${fileExt}`;
      const filePath = `${eventId}/${user.user.id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('event-user-photos')
        .upload(filePath, file, {
          contentType: file.type,
          upsert: true
        });
      
      if (uploadError) throw uploadError;

      // Upload to BitStudio to get image ID
      toast({
        title: "Uploading to BitStudio",
        description: "Please wait...",
      });

      const { BitStudioClient } = await import('@/lib/bitstudio-client');
      const bitstudioImage = await BitStudioClient.uploadImage(file, 'virtual-try-on-person');

      if (!bitstudioImage?.id) {
        throw new Error('Failed to upload to BitStudio');
      }
      
      // Store storage path AND BitStudio ID in database
      const { error: dbError } = await supabase
        .from('event_user_photos')
        .upsert({
          event_id: eventId,
          user_id: user.user.id,
          photo_url: filePath,
          bitstudio_image_id: bitstudioImage.id,
          vto_provider: 'bitstudio',
          vto_ready: true
        });
      
      if (dbError) throw dbError;
      
      setPersonImageId(filePath);
      setStatus('idle');
      
      toast({
        title: 'Person photo uploaded!',
        description: 'Photo uploaded to both Supabase and BitStudio'
      });
      
    } catch (err: any) {
      console.error('[EventTryOn] Upload error:', err);
      setStatus('failed');
      toast({
        title: 'Upload failed',
        description: err.message || 'Failed to upload photo. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const startTryOn = async () => {
    if (!personImageId) {
      toast({
        title: "Missing person image",
        description: "Please upload your photo first",
        variant: "destructive"
      });
      return;
    }

    const outfitPath = product.try_on_config?.outfitImagePath || product.try_on_data?.outfit_image_path;
    const outfitId = product.try_on_config?.outfit_image_id;

    if (!outfitPath && !outfitId) {
      toast({
        title: "Product not configured",
        description: "This product doesn't have try-on configured yet",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setStatus('generating');
      
      const result = await runTryOn({
        eventId: eventId,
        userId: (await supabase.auth.getUser()).data.user!.id,
        productId: product.id,
        personImagePath: personImageId,
        outfitImagePath: outfitPath
      });

      if (!result.ok || !result.jobId) {
        throw new Error(result.error || 'Failed to start try-on');
      }

      // Poll for completion using bitstudio-poll-job edge function (per BitStudio docs: 2s polling)
      console.log('[EventTryOn] Starting polling for job:', result.jobId);
      
      let pollAttempts = 0;
      const maxPollAttempts = 90; // 3 minutes / 2s = 90 attempts
      
      const pollInterval = setInterval(async () => {
        pollAttempts++;
        console.log('[EventTryOn] Poll attempt', pollAttempts, '/', maxPollAttempts, 'for job:', result.jobId);
        
        try {
          // Call the bitstudio-poll-job edge function
          const { data: pollData, error: pollError } = await supabase.functions.invoke('bitstudio-poll-job', {
            body: { jobId: result.jobId }
          });
          
          if (pollError) {
            console.error('[EventTryOn] Poll error:', pollError);
            if (pollAttempts >= maxPollAttempts) {
              clearInterval(pollInterval);
              setStatus('failed');
              toast({
                title: 'Try-on timeout',
                description: 'Polling timed out after 3 minutes',
                variant: 'destructive'
              });
            }
            return;
          }
          
          console.log('[EventTryOn] Poll result:', pollData);
          
          // Check job status in database
          const { data: job, error: jobError } = await supabase
            .from('event_tryon_jobs')
            .select('status, output_path, error')
            .eq('id', result.jobId)
            .single();
          
          if (jobError) {
            console.error('[EventTryOn] Job query error:', jobError);
            if (pollAttempts >= maxPollAttempts) {
              clearInterval(pollInterval);
              setStatus('failed');
              toast({
                title: 'Try-on failed',
                description: 'Could not retrieve job status',
                variant: 'destructive'
              });
            }
            return;
          }
          
          console.log('[EventTryOn] Job status:', job.status);
          
          if (job.status === 'succeeded' && job.output_path) {
            clearInterval(pollInterval);
            
            const { data } = supabase.storage
              .from('event-tryon-results')
              .getPublicUrl(job.output_path);
            
            setResultUrl(data.publicUrl);
            setStatus('done');
            
            await saveAsset(
              data.publicUrl,
              result.jobId,
              `${eventName} - ${product.brand_name} - Try-On`
            );
            
            toast({
              title: 'Try-on complete! ✨',
              description: 'Your virtual try-on is ready'
            });
          } else if (job.status === 'failed') {
            clearInterval(pollInterval);
            setStatus('failed');
            toast({
              title: 'Try-on failed',
              description: job.error || 'Generation failed',
              variant: 'destructive'
            });
          } else if (pollAttempts >= maxPollAttempts) {
            clearInterval(pollInterval);
            setStatus('failed');
            toast({
              title: 'Try-on timeout',
              description: 'Processing took longer than expected (3 minutes)',
              variant: 'destructive'
            });
          }
        } catch (err) {
          console.error('[EventTryOn] Polling exception:', err);
          if (pollAttempts >= maxPollAttempts) {
            clearInterval(pollInterval);
            setStatus('failed');
            toast({
              title: 'Try-on error',
              description: 'An error occurred while checking status',
              variant: 'destructive'
            });
          }
        }
      }, 2000); // Poll every 2 seconds per BitStudio docs
      
      // Store interval for cleanup
      return () => clearInterval(pollInterval);
      
    } catch (err: any) {
      console.error('Try-on error:', err);
      setStatus('failed');
      toast({
        title: 'Try-on failed',
        description: err.message || 'Failed to generate try-on. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const fastTryOn = async () => {
    if (!personImageId) {
      toast({
        title: "Missing person image",
        description: "Please upload your photo first",
        variant: "destructive"
      });
      return;
    }

    if (!product.image_url) {
      toast({
        title: "Missing product image",
        description: "Product image not available",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setStatus('generating');
      
      // Use new provider adapter with product main image
      const result = await runTryOn({
        eventId: eventId,
        userId: (await supabase.auth.getUser()).data.user!.id,
        productId: product.id,
        personImagePath: personImageId,
        outfitImagePath: product.image_url
      });

      if (result.ok && result.outputPath) {
        const { data } = supabase.storage
          .from('event-tryon-results')
          .getPublicUrl(result.outputPath);
        
        setResultUrl(data.publicUrl);
        setStatus('done');
        
        await saveAsset(
          data.publicUrl,
          undefined,
          `${eventName} - ${product.brand_name} - Fast Try-On`
        );
        
        toast({
          title: 'Fast try-on complete!',
          description: 'Your virtual try-on is ready'
        });
      } else {
        throw new Error(result.error || 'Try-on failed');
      }
      
    } catch (err: any) {
      console.error('Fast try-on error:', err);
      setStatus('failed');
      toast({
        title: 'Try-on failed',
        description: err.message || 'Failed to generate try-on',
        variant: 'destructive'
      });
    }
  };

  const resetFlow = () => {
    setFile(null);
    setPersonImageId(null);
    setStatus('idle');
    setResultUrl(null);
  };

  const handleDownload = async () => {
    if (!resultUrl) return;
    
    try {
      const response = await fetch(resultUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `event-tryon-${eventName}-${product.brand_name}-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
      toast({
        title: 'Download failed',
        description: 'Could not download image',
        variant: 'destructive'
      });
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

              {/* Person Image Upload */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Your Photo</h4>
                <div
                  className={`relative border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
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
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const selectedFile = e.target.files?.[0];
                      if (selectedFile) handleFileSelect(selectedFile);
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {file || personImageId ? (
                    <div className="space-y-2">
                      {file && (
                        <div className="w-16 h-16 mx-auto rounded-lg overflow-hidden">
                          <img
                            src={URL.createObjectURL(file)}
                            alt="Person preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <p className="text-xs font-medium">
                        {personImageId ? 'Person photo ready' : file?.name}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                          setPersonImageId(null);
                        }}
                      >
                        Change
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
                      <div>
                        <p className="text-xs font-medium">Drop person photo here</p>
                        <p className="text-xs text-muted-foreground">or click to browse</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Button
                onClick={startTryOn}
                disabled={!personImageId}
                className="w-full"
              >
                Try On Product
              </Button>
            </>
          )}

          {(status === 'uploading' || status === 'generating') && (
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <div>
                <p className="text-sm font-medium">{getStatusText()}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  This may take 30-90 seconds
                </p>
                {status === 'generating' && (
                  <>
                    <p className="text-xs text-muted-foreground mt-2">
                      <strong>You can safely close this window.</strong>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Results will appear above the Try On button when complete.
                    </p>
                  </>
                )}
              </div>
              {status === 'generating' && (
                <Button variant="outline" onClick={onClose} className="mt-4">
                  Close & Continue Browsing
                </Button>
              )}
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
                  Try-on failed. Please try again with a clearer full-body photo.
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