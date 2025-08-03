import React, { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Camera, Upload, X, Search, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { pipeline } from '@huggingface/transformers';
import { useToast } from '@/hooks/use-toast';
import { Product, Brand } from '@/types';
import { createMinimalBrand } from '@/lib/type-utils';

interface VisualSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductSelect: (product: Product) => void;
}

interface SearchResult {
  id: string;
  title: string;
  price_cents: number;
  currency: string;
  media_urls: string[];
  similarity_score: number;
  reason?: string;
  brand: Brand;
}

export const VisualSearchModal: React.FC<VisualSearchModalProps> = ({
  isOpen,
  onClose,
  onProductSelect,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [searchImage, setSearchImage] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchMode, setSearchMode] = useState<'upload' | 'camera' | 'results'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  const handleImageUpload = useCallback(async (file: File) => {
    if (!file) return;

    setIsLoading(true);
    try {
      // Convert image to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageData = e.target?.result as string;
        setSearchImage(imageData);
        await performVisualSearch(imageData);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Upload Error",
        description: "Failed to process the image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const performVisualSearch = async (imageData: string) => {
    setIsLoading(true);
    try {
      // Initialize the vision model
      const classifier = await pipeline(
        'image-classification',
        'onnx-community/mobilenetv4_conv_small.e2400_r224_in1k',
        { device: 'webgpu' }
      );

      // Analyze the image
      const results = await classifier(imageData);
      
      // Convert results to fashion products (mock implementation)
      const mockResults: SearchResult[] = results.slice(0, 8).map((result: any, index: number) => ({
        id: `search-${index}`,
        title: `Fashion Item - ${result.label}`,
        price_cents: Math.floor(Math.random() * 20000) + 5000,
        currency: 'USD',
        media_urls: [`https://images.unsplash.com/photo-${1500000000000 + index}?w=300&h=400&fit=crop`],
        similarity_score: result.score,
        reason: `Similar ${result.label.toLowerCase()} style`,
        brand: createMinimalBrand(
          `brand-${index}`,
          ['Zara', 'H&M', 'Mango', 'ASOS'][index % 4]
        ),
      }));

      setSearchResults(mockResults);
      setSearchMode('results');
    } catch (error) {
      console.error('Visual search error:', error);
      toast({
        title: "Search Error",
        description: "Failed to analyze the image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setSearchMode('camera');
      }
    } catch (error) {
      console.error('Camera error:', error);
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please try uploading an image instead.",
        variant: "destructive",
      });
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);
      
      const imageData = canvas.toDataURL('image/jpeg');
      setSearchImage(imageData);
      
      // Stop camera
      const stream = video.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
      
      performVisualSearch(imageData);
    }
  };

  const resetSearch = () => {
    setSearchImage(null);
    setSearchResults([]);
    setSearchMode('upload');
    
    // Stop camera if running
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Visual Search
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {searchMode === 'upload' && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="h-full flex flex-col items-center justify-center space-y-6"
              >
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-semibold">Find Similar Fashion Items</h3>
                  <p className="text-muted-foreground">
                    Upload or take a photo to find similar products
                  </p>
                </div>

                <div className="flex gap-4">
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2"
                    disabled={isLoading}
                  >
                    <Upload className="h-4 w-4" />
                    Upload Image
                  </Button>
                  
                  <Button
                    onClick={startCamera}
                    variant="outline"
                    className="flex items-center gap-2"
                    disabled={isLoading}
                  >
                    <Camera className="h-4 w-4" />
                    Use Camera
                  </Button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                  }}
                  className="hidden"
                />
              </motion.div>
            )}

            {searchMode === 'camera' && (
              <motion.div
                key="camera"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col"
              >
                <div className="flex-1 relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <canvas ref={canvasRef} className="hidden" />
                </div>
                
                <div className="flex justify-center gap-4 mt-4">
                  <Button onClick={capturePhoto} disabled={isLoading}>
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Capture Photo'
                    )}
                  </Button>
                  <Button onClick={resetSearch} variant="outline">
                    Cancel
                  </Button>
                </div>
              </motion.div>
            )}

            {searchMode === 'results' && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="h-full flex flex-col"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    {searchImage && (
                      <img
                        src={searchImage}
                        alt="Search query"
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                    )}
                    <div>
                      <h3 className="font-semibold">Search Results</h3>
                      <p className="text-sm text-muted-foreground">
                        {searchResults.length} similar items found
                      </p>
                    </div>
                  </div>
                  <Button onClick={resetSearch} variant="outline" size="sm">
                    <X className="h-4 w-4 mr-1" />
                    New Search
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {searchResults.map((product) => (
                      <Card
                        key={product.id}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => onProductSelect(product as unknown as Product)}
                      >
                        <CardContent className="p-3">
                          <div className="aspect-[3/4] mb-2">
                            <img
                              src={product.media_urls?.[0]}
                              alt={product.title}
                              className="w-full h-full object-cover rounded-md"
                            />
                          </div>
                          <h4 className="font-medium text-sm truncate">
                            {product.title}
                          </h4>
                          <p className="text-xs text-muted-foreground mb-1">
                            {product.brand?.name}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-sm">
                              {formatPrice(product.price_cents || 0)}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {Math.round((product.similarity_score || 0) * 100)}% match
                            </Badge>
                          </div>
                          {product.reason && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {product.reason}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {isLoading && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-sm text-muted-foreground">
                  Analyzing image...
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};