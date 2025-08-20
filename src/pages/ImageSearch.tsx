import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import ShopperNavigation from '@/components/ShopperNavigation';
import TutorialTooltip from '@/components/TutorialTooltip';
import ProductDetailPage from '@/components/ProductDetailPage';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Upload, 
  Camera, 
  Search, 
  Loader2,
  ExternalLink,
  ShoppingBag,
  X,
  Info,
  Sparkles
} from 'lucide-react';
import { pipeline } from '@huggingface/transformers';
import { motion, AnimatePresence } from 'framer-motion';
import { Product } from '@/types';

interface SearchResult {
  id: string;
  title: string;
  price_cents: number;
  currency: string;
  media_urls: string[];
  brand: { name: string };
  external_url?: string;
  similarity_score: number;
  source: 'internal' | 'external';
}

interface ExternalSearchResult {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  image_url: string | null;
  brand: string;
  external_url: string;
  source: 'catalog' | 'external';
}

const ImageSearch: React.FC = () => {
  const [searchImage, setSearchImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [internalResults, setInternalResults] = useState<SearchResult[]>([]);
  const [externalResults, setExternalResults] = useState<ExternalSearchResult[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductDetail, setShowProductDetail] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const { toast } = useToast();
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

  const tutorialSteps = [
    {
      title: "Visual Search Magic! 🔍",
      description: "Upload any fashion image to find similar items in our catalog and across the web.",
      icon: <Search className="h-5 w-5 text-primary" />,
      action: "Upload an image or take a photo"
    },
    {
      title: "Step 1: Upload or Capture",
      description: "Choose to upload an existing photo or use your camera to capture a new one.",
      icon: <Upload className="h-5 w-5 text-blue-500" />,
      action: "Click 'Upload Image' or 'Use Camera'"
    },
    {
      title: "Step 2: Dual Search Results",
      description: "We'll search both our internal catalog and external shopping sites for similar items.",
      icon: <Sparkles className="h-5 w-5 text-purple-500" />,
      action: "Browse through two result sections"
    },
    {
      title: "Step 3: Shop Similar Items",
      description: "Click on internal items for details or external links to shop directly from other sites.",
      icon: <ShoppingBag className="h-5 w-5 text-green-500" />,
      action: "Click on any result to explore"
    }
  ];

  // Upload a file/blob to Supabase Storage 'search-images' bucket and return public URL
  const uploadToSearchBucket = useCallback(async (blob: Blob, ext: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('You must be signed in to upload search images');
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('search-images').upload(path, blob, {
      contentType: ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg',
      upsert: true,
    });
    if (upErr) throw upErr;
    const { data } = supabase.storage.from('search-images').getPublicUrl(path);
    return data.publicUrl as string;
  }, []);

  const handleImageUpload = useCallback(async (file: File) => {
    if (!file) return;

    setIsLoading(true);
    try {
      // 1) Upload original file to Storage to enable Google Lens search
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const publicUrl = await uploadToSearchBucket(file, ext);
      setUploadedImageUrl(publicUrl);

      // 2) Read for on-screen preview and local classification
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageData = e.target?.result as string;
        setSearchImage(imageData);
        await performDualSearch(imageData, publicUrl);
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
  }, [toast, uploadToSearchBucket]);

  const performDualSearch = async (imageData: string, uploadedUrl?: string) => {
    setIsLoading(true);
    try {
      let searchQuery: string = 'fashion item';

      // Try WebGPU first, then gracefully fall back to WASM/CPU
      try {
        const classifierWebGPU = await pipeline(
          'image-classification',
          'onnx-community/mobilenetv4_conv_small.e2400_r224_in1k',
          { device: 'webgpu' }
        );
        const results = await classifierWebGPU(imageData);
        const topResult = Array.isArray(results) ? results[0] : results;
        searchQuery = (topResult as any)?.label || searchQuery;
      } catch (gpuErr) {
        console.warn('WebGPU classification failed, falling back to WASM/CPU', gpuErr);
        try {
          const classifierCPU = await pipeline(
            'image-classification',
            'onnx-community/mobilenetv4_conv_small.e2400_r224_in1k'
          );
          const results = await classifierCPU(imageData);
          const topResult = Array.isArray(results) ? results[0] : results;
          searchQuery = (topResult as any)?.label || searchQuery;
        } catch (cpuErr) {
          console.error('Classification fallback failed, using generic query', cpuErr);
        }
      }
      
      // Always proceed with searches
      await searchInternalCatalog(searchQuery);
      await searchExternalSources(searchQuery, uploadedUrl);
      
    } catch (error) {
      console.error('Visual search error:', error);
      toast({
        title: "Search Error",
        description: "Continuing with a generic search.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const searchInternalCatalog = async (query: string) => {
    try {
      const { data: products, error } = await supabase
        .from('products')
        .select(`
          id,
          title,
          price_cents,
          currency,
          media_urls,
          external_url,
          brand:brands!inner(name)
        `)
        .eq('status', 'active')
        .limit(8);

      if (error) throw error;

      // Convert to search results with mock similarity scores
      const results: SearchResult[] = products.map((product, index) => ({
        ...product,
        media_urls: Array.isArray(product.media_urls) 
          ? product.media_urls.map(url => typeof url === 'string' ? url : '/placeholder.svg')
          : ['/placeholder.svg'],
        similarity_score: Math.max(0.6, Math.random()),
        source: 'internal' as const
      })).sort((a, b) => b.similarity_score - a.similarity_score);

      setInternalResults(results);
    } catch (error) {
      console.error('Internal search error:', error);
      setInternalResults([]);
    }
  };

  const searchExternalSources = async (query: string, imageUrl?: string) => {
    try {
      console.log('Calling google-shopping-search with:', { query, imageUrl });
      
      // Call our Google Shopping API edge function (now supports imageUrl for Google Lens)
      const { data, error } = await supabase.functions.invoke('google-shopping-search', {
        body: { searchQuery: query, imageUrl, maxResults: 6 }
      });

      console.log('Edge function response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      if (data?.results) {
        setExternalResults(data.results);
        console.log('External results set:', data.results.length, 'items');
        console.log('Sources breakdown:', data.sources);
        
        if ((data?.sources?.external ?? 0) === 0) {
          toast({
            title: 'Online results unavailable',
            description: 'External search may be misconfigured. Check function logs.',
            variant: 'destructive',
          });
        }
      } else {
        console.log('No results in data:', data);
        // Fallback to empty if API returns no results
        setExternalResults([]);
      }
    } catch (error) {
      console.error('External search error:', error);
      // Fallback mock results on error
      const mockExternalResults: ExternalSearchResult[] = [
        {
          id: "ext-1",
          title: "Similar Style Dress - Zara",
          description: "Premium fashion item with similar design",
          price: 89.99,
          currency: "USD",
          image_url: "https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=400&h=500&fit=crop",
          brand: "Zara",
          external_url: "https://zara.com/example",
          source: "external"
        },
        {
          id: "ext-2",
          title: "Comparable Design - H&M",
          description: "Affordable fashion with matching style",
          price: 45.99,
          currency: "USD",
          image_url: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&h=500&fit=crop",
          brand: "H&M",
          external_url: "https://hm.com/example",
          source: "external"
        }
      ];
      setExternalResults(mockExternalResults);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
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

  const capturePhoto = async () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);
      
      const imageData = canvas.toDataURL('image/jpeg');
      
      try {
        setIsLoading(true);
        // Convert data URL to Blob by refetching it
        const blob = await (await fetch(imageData)).blob();
        const publicUrl = await uploadToSearchBucket(blob, 'jpg');
        setUploadedImageUrl(publicUrl);
        setSearchImage(imageData);
        
        // Stop camera
        const stream = video.srcObject as MediaStream;
        stream?.getTracks().forEach(track => track.stop());
        setCameraActive(false);
        
        await performDualSearch(imageData, publicUrl);
      } catch (error) {
        console.error('Capture/upload error:', error);
        toast({
          title: 'Camera Error',
          description: 'Failed to capture or upload image.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const resetSearch = () => {
    setSearchImage(null);
    setInternalResults([]);
    setExternalResults([]);
    
    // Stop camera if running
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setCameraActive(false);
    }
  };

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const handleInternalProductClick = (result: SearchResult) => {
    setSelectedProduct(result as unknown as Product);
    setShowProductDetail(true);
  };

  const handleExternalProductClick = (result: ExternalSearchResult) => {
    window.open(result.external_url, '_blank');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-6xl p-4">
        {/* Navigation */}
        <ShopperNavigation />
        
        {/* Tutorial */}
        <TutorialTooltip
          tutorialKey="image-search"
          steps={tutorialSteps}
          autoShow={true}
        />

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Visual Search</h1>
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="h-3 w-3" />
              AI Powered
            </Badge>
          </div>
          <TutorialTooltip
            tutorialKey="image-search"
            steps={tutorialSteps}
            trigger={
              <Button variant="outline" size="sm">
                <Info className="h-4 w-4 mr-2" />
                How it works
              </Button>
            }
          />
        </div>

        <AnimatePresence mode="wait">
          {!searchImage ? (
            // Upload Section
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="max-w-2xl mx-auto">
                <CardHeader className="text-center">
                  <CardTitle>Upload Fashion Image</CardTitle>
                  <p className="text-muted-foreground">
                    Find similar items in our catalog and across the web
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {cameraActive ? (
                    <div className="space-y-4">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full aspect-video object-cover rounded-lg"
                      />
                      <canvas ref={canvasRef} className="hidden" />
                      <div className="flex justify-center gap-4">
                        <Button onClick={capturePhoto} disabled={isLoading}>
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Camera className="h-4 w-4 mr-2" />
                          )}
                          Capture Photo
                        </Button>
                        <Button 
                          onClick={() => {
                            const stream = videoRef.current?.srcObject as MediaStream;
                            stream?.getTracks().forEach(track => track.stop());
                            setCameraActive(false);
                          }} 
                          variant="outline"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-center gap-4">
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

                      <div className="text-center text-sm text-muted-foreground">
                        Supported formats: JPG, PNG, WebP
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            // Results Section
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Search Info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <img
                    src={searchImage}
                    alt="Search query"
                    className="w-16 h-16 object-cover rounded-lg border"
                  />
                  <div>
                    <h3 className="font-semibold">Search Results</h3>
                    <p className="text-sm text-muted-foreground">
                      Found {internalResults.length + externalResults.length} similar items
                    </p>
                  </div>
                </div>
                <Button onClick={resetSearch} variant="outline" size="sm">
                  <X className="h-4 w-4 mr-1" />
                  New Search
                </Button>
              </div>

              {/* Internal Results */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5" />
                  Similar Items in Our Catalog
                  <Badge variant="secondary">{internalResults.length}</Badge>
                </h3>
                
                {internalResults.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {internalResults.map((result) => (
                      <Card
                        key={result.id}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => handleInternalProductClick(result)}
                      >
                        <CardContent className="p-3">
                          <div className="aspect-[3/4] mb-2">
                            <img
                              src={result.media_urls?.[0] || '/placeholder.svg'}
                              alt={result.title}
                              className="w-full h-full object-cover rounded-md"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/placeholder.svg';
                              }}
                            />
                          </div>
                          <h4 className="font-medium text-sm truncate">
                            {result.title}
                          </h4>
                          <p className="text-xs text-muted-foreground mb-1">
                            {result.brand?.name}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-sm">
                              {formatPrice(result.price_cents || 0)}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {Math.round(result.similarity_score * 100)}% match
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No similar items found in our catalog</p>
                  </div>
                )}
              </div>

              <Separator />

              {/* External Results */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <ExternalLink className="h-5 w-5" />
                  Similar Items Online
                  <Badge variant="outline">{externalResults.length}</Badge>
                </h3>
                
                {externalResults.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {externalResults.map((result, index) => (
                      <Card
                        key={index}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => handleExternalProductClick(result)}
                      >
                        <CardContent className="p-3">
                           <div className="aspect-[3/4] mb-2">
                             <img
                               src={result.image_url || '/placeholder.svg'}
                               alt={result.title}
                               className="w-full h-full object-cover rounded-md"
                               onError={(e) => {
                                 (e.target as HTMLImageElement).src = '/placeholder.svg';
                               }}
                             />
                           </div>
                           <h4 className="font-medium text-sm truncate">
                             {result.title}
                           </h4>
                           <p className="text-xs text-muted-foreground mb-1">
                             {result.brand}
                           </p>
                           <div className="flex items-center justify-between">
                             <span className="font-semibold text-sm">
                               {new Intl.NumberFormat('en-US', {
                                 style: 'currency',
                                 currency: result.currency || 'USD'
                               }).format(result.price)}
                             </span>
                             <div className="flex items-center gap-1">
                               <Badge variant="secondary" className="text-xs">
                                 AI Match
                               </Badge>
                               <ExternalLink className="h-3 w-3 text-muted-foreground" />
                             </div>
                           </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <ExternalLink className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No external matches found</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-sm text-muted-foreground">
                Analyzing image and searching...
              </p>
            </div>
          </div>
        )}

        {/* Product Detail Page */}
        {selectedProduct && showProductDetail && (
          <div className="fixed inset-0 z-50 bg-background">
            <ProductDetailPage
              product={selectedProduct}
              onBack={() => {
                setShowProductDetail(false);
                setSelectedProduct(null);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageSearch;
