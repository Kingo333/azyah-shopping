import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, User, Loader2, Download, Heart, Eye } from 'lucide-react';
import { useBitStudio } from '@/hooks/useBitStudio';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

interface Product {
  id: string;
  title: string;
  image_url?: string;
  media_urls?: string[];
  price_cents: number;
  currency: string;
  brand?: {
    name: string;
  };
}

interface ProductTryOnModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
}

interface TryOnJobStatus {
  status: 'queued' | 'running' | 'done' | 'failed';
  resultUrl?: string;
  error?: string;
}

const ProductTryOnModal: React.FC<ProductTryOnModalProps> = ({
  isOpen,
  onClose,
  product
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'queued' | 'running' | 'done' | 'failed'>('idle');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  
  const { toast } = useToast();

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

  const handleFileSelect = (selectedFile: File) => {
    if (validateFile(selectedFile)) {
      setFile(selectedFile);
      setError(null);
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

  const startTryOn = async () => {
    if (!file) return;
    
    try {
      setStatus('uploading');
      setError(null);
      
      // Upload person image to temporary bucket
      const personImagePath = `${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('tryon-persons')
        .upload(personImagePath, file);
      
      if (uploadError) throw uploadError;

      // Get the outfit image URL for this product
      const { data: outfitData, error: outfitError } = await supabase
        .from('product_outfit_assets')
        .select('outfit_image_url')
        .eq('product_id', product.id)
        .single();
      
      if (outfitError) throw new Error('Product outfit not found');

      // Create try-on job
      const jobData = {
        user_id: (await supabase.auth.getUser()).data.user?.id,
        person_image_id: uploadData.path,
        outfit_image_url: outfitData.outfit_image_url,
        status: 'pending'
      };

      const { data: jobResult, error: jobError } = await supabase
        .from('ai_tryon_jobs')
        .insert(jobData)
        .select()
        .single();
      
      if (jobError) throw jobError;

      setJobId(jobResult.id);
      setStatus('queued');
      
      // Start the try-on process via edge function
      const { data: tryonData, error: tryonError } = await supabase.functions
        .invoke('bitstudio-tryon', {
          body: {
            person_image_url: await getSignedUrl('tryon-persons', uploadData.path),
            outfit_image_url: outfitData.outfit_image_url,
            job_id: jobResult.id
          }
        });
      
      if (tryonError) throw tryonError;
      
      // Start polling for completion
      pollForCompletion(jobResult.id);
      
    } catch (err: any) {
      console.error('Try-on error:', err);
      setError(err.message || 'Failed to start try-on. Please try again.');
      setStatus('failed');
    }
  };

  const getSignedUrl = async (bucket: string, path: string): Promise<string> => {
    const { data } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 3600); // 1 hour expiry
    return data?.signedUrl || '';
  };

  const pollForCompletion = async (jobId: string) => {
    const maxAttempts = 60; // 5 minutes at 5-second intervals
    let attempts = 0;
    
    const poll = async () => {
      try {
        const { data, error } = await supabase
          .from('ai_tryon_jobs')
          .select('status, result_url, error')
          .eq('id', jobId)
          .single();
        
        if (error) throw error;
        
        if (data.status === 'completed' && data.result_url) {
          setResultUrl(data.result_url);
          setStatus('done');
          return;
        }
        
        if (data.status === 'failed') {
          setError(typeof data.error === 'string' ? data.error : 'Try-on failed. Please try again.');
          setStatus('failed');
          return;
        }
        
        if (data.status === 'generating') {
          setStatus('running');
        }
        
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000); // Poll every 5 seconds
        } else {
          setError('Try-on is taking longer than expected. Please try again.');
          setStatus('failed');
        }
      } catch (err: any) {
        console.error('Polling error:', err);
        setError('Failed to check try-on status');
        setStatus('failed');
      }
    };
    
    poll();
  };

  const resetFlow = () => {
    setFile(null);
    setJobId(null);
    setStatus('idle');
    setResultUrl(null);
    setError(null);
  };

  const handleDownload = () => {
    if (resultUrl) {
      const link = document.createElement('a');
      link.href = resultUrl;
      link.download = `tryon-${product.title}-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const formatPrice = (cents: number, currency: string): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(cents / 100);
  };

  const getStatusText = () => {
    switch (status) {
      case 'uploading':
        return 'Uploading your photo...';
      case 'queued':
        return 'Your try-on is queued...';
      case 'running':
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
            Try On: {product.title}
          </DialogTitle>
        </DialogHeader>

        {/* Product Preview */}
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <img
            src={product.image_url || product.media_urls?.[0] || '/placeholder.svg'}
            alt={product.title}
            className="w-12 h-12 object-cover rounded"
          />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{product.title}</p>
            <p className="text-sm text-muted-foreground">
              {product.brand?.name} • {formatPrice(product.price_cents, product.currency)}
            </p>
          </div>
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
                    : file 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {file ? (
                  <div className="space-y-2">
                    <div className="w-20 h-20 mx-auto rounded-lg overflow-hidden">
                      <img
                        src={URL.createObjectURL(file)}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFile(null)}
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
                disabled={!file}
                className="w-full"
              >
                Try It On
              </Button>
            </>
          )}

          {(status === 'uploading' || status === 'queued' || status === 'running') && (
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
                <Button variant="outline" asChild>
                  <Link to={`/product/${product.id}`}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Product
                  </Link>
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

export default ProductTryOnModal;