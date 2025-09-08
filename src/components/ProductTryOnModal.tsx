import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, User, Loader2, Download, Heart, Eye } from 'lucide-react';
import { useBitStudio } from '@/hooks/useBitStudio';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { BITSTUDIO_IMAGE_TYPES } from '@/lib/bitstudio-types';
import { useAiAssets } from '@/hooks/useAiAssets';
import { GlassPanel } from '@/components/ui/glass-panel';

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
  const [personImageId, setPersonImageId] = useState<string | null>(null);
  const [outfitImageUrl, setOutfitImageUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'generating' | 'done' | 'failed'>('idle');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedThumbnail, setSelectedThumbnail] = useState<string | null>(null);
  
  const { toast } = useToast();
  const { loading, uploadImage, virtualTryOn, error } = useBitStudio();
  const { assets, saveAsset } = useAiAssets();

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
      // Upload person image and get outfit URL when file is selected
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

  // Get product outfit URL when component opens
  useEffect(() => {
    const getProductOutfit = async () => {
      try {
        const { data: productOutfit, error: productError } = await supabase
          .from('product_outfit_assets')
          .select('outfit_image_url')
          .eq('product_id', product.id)
          .single();

        if (productError || !productOutfit) {
          toast({
            title: "Product not available for try-on",
            description: "This product doesn't have try-on capabilities yet.",
            variant: "destructive"
          });
          onClose();
          return;
        }

        setOutfitImageUrl(productOutfit.outfit_image_url);
      } catch (err: any) {
        console.error('Error fetching product outfit:', err);
        toast({
          title: "Error",
          description: "Failed to load product try-on data",
          variant: "destructive"
        });
        onClose();
      }
    };

    if (isOpen && product.id) {
      getProductOutfit();
    }
  }, [isOpen, product.id, toast, onClose]);

  const uploadPersonImage = async (file: File) => {
    try {
      setStatus('uploading');
      
      const result = await uploadImage(file, BITSTUDIO_IMAGE_TYPES.PERSON);
      
      if (result?.id) {
        setPersonImageId(result.id);
        setStatus('idle'); // Reset to idle so user can proceed
        toast({
          title: 'Photo uploaded successfully!',
          description: 'Ready to generate your try-on'
        });
      }
    } catch (err: any) {
      console.error('Person image upload error:', err);
      setStatus('failed');
    }
  };

  const startTryOn = async () => {
    if (!personImageId || !outfitImageUrl) {
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
        outfit_image_url: outfitImageUrl,
        resolution: 'standard',
        num_images: 1
      });

      if (result?.path) {
        setResultUrl(result.path);
        setStatus('done');
        
        // Save the result to persistent storage
        await saveAsset(result.path, undefined, `Try-On: ${product.title}`);
        
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
    setPersonImageId(null);
    setStatus('idle');
    setResultUrl(null);
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
      case 'generating':
        return 'Generating your try-on...';
      default:
        return '';
    }
  };

  const openFullSizeImage = (imageUrl: string) => {
    try {
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(`
          <html>
            <head><title>Try-On Result</title></head>
            <body style="margin: 0; padding: 20px; background: black; display: flex; justify-content: center; align-items: center; min-height: 100vh;">
              <img src="${imageUrl}" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
            </body>
          </html>
        `);
      }
    } catch (error) {
      console.error('Failed to open full size image:', error);
    }
  };

  const handleThumbnailLongPress = (imageUrl: string) => {
    openFullSizeImage(imageUrl);
  };

  const handleViewProduct = () => {
    onClose(); // Close the try-on modal first
    // Navigate to product detail like clicking in list mode
    if (product?.external_url) {
      const url = product.external_url.startsWith('http') ? product.external_url : `https://${product.external_url}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <>
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
                disabled={!file || !personImageId || !outfitImageUrl || loading}
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
                <Button variant="outline" onClick={handleViewProduct}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Product
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

          {/* Previous Results Section */}
          {assets.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Previous Try-Ons</h4>
                <span className="text-xs text-muted-foreground">{assets.length} result{assets.length > 1 ? 's' : ''}</span>
              </div>
              
              <div className="grid grid-cols-4 gap-2">
                {assets.slice(0, 8).map((asset) => (
                  <GlassPanel 
                    key={asset.id}
                    variant="custom" 
                    className="aspect-square p-0.5 cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => setSelectedThumbnail(asset.asset_url)}
                    onTouchStart={() => {
                      // Handle long press for mobile
                      const timer = setTimeout(() => {
                        handleThumbnailLongPress(asset.asset_url);
                      }, 500);
                      return () => clearTimeout(timer);
                    }}
                  >
                    <img 
                      src={asset.asset_url} 
                      alt="Previous try-on result" 
                      className="w-full h-full object-cover rounded-sm"
                    />
                  </GlassPanel>
                ))}
              </div>
              
              <p className="text-xs text-muted-foreground text-center">
                Tap to view • Long press to enlarge
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* Selected Thumbnail Modal */}
    {selectedThumbnail && (
      <Dialog open={!!selectedThumbnail} onOpenChange={() => setSelectedThumbnail(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Try-On Result</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <img
              src={selectedThumbnail}
              alt="Try-on result"
              className="w-full rounded-lg shadow-lg"
            />
            
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = selectedThumbnail;
                  link.download = `tryon-${product.title}-${Date.now()}.png`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button variant="outline" onClick={handleViewProduct}>
                <Eye className="h-4 w-4 mr-2" />
                View Product
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )}

    </>
  );
};

export default ProductTryOnModal;