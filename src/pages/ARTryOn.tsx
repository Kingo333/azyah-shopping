import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, 
  RotateCcw, 
  Download, 
  Share2, 
  Settings,
  ZoomIn,
  ZoomOut,
  Move3D,
  Sparkles,
  Upload,
  ChevronLeft,
  Monitor,
  Smartphone,
  Info,
  ShoppingBag,
  Heart,
  RotateCw,
  Loader2,
  CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ARGarmentOverlay } from '@/components/ARGarmentOverlay';
import { ARSmartFit } from '@/components/ARSmartFit';
import type { Product } from '@/types';

interface ARProduct {
  id: string;
  title: string;
  media_urls: string[];
  ar_mesh_url?: string;
  attributes?: {
    color_primary?: string;
    size?: string;
    gender_target?: string;
  };
}

const mockProducts: ARProduct[] = [
  {
    id: '1',
    title: 'Classic White T-Shirt',
    media_urls: ['/placeholder.svg'],
    ar_mesh_url: '/models/tshirt.glb',
    attributes: { color_primary: 'White', size: 'M', gender_target: 'unisex' }
  },
  {
    id: '2',
    title: 'Blue Denim Jacket',
    media_urls: ['/placeholder.svg'],
    ar_mesh_url: '/models/jacket.glb',
    attributes: { color_primary: 'Blue', size: 'L', gender_target: 'unisex' }
  },
  {
    id: '3',
    title: 'Black Hoodie',
    media_urls: ['/placeholder.svg'],
    ar_mesh_url: '/models/hoodie.glb',
    attributes: { color_primary: 'Black', size: 'M', gender_target: 'unisex' }
  },
  {
    id: '4',
    title: 'Summer Dress',
    media_urls: ['/placeholder.svg'],
    ar_mesh_url: '/models/dress.glb',
    attributes: { color_primary: 'Floral', size: 'S', gender_target: 'women' }
  }
];

const ARTryOn = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedProduct, setSelectedProduct] = useState<ARProduct | null>(null);
  const [selectedSize, setSelectedSize] = useState('M');
  const [selectedColor, setSelectedColor] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [activeTab, setActiveTab] = useState('live-camera');
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [deviceType, setDeviceType] = useState<'mobile' | 'desktop'>('desktop');

  // Get preselected product from URL params
  const preselectedProductId = searchParams.get('product');
  
  // Fetch specific product if provided in URL
  const { data: preselectedProduct } = useQuery({
    queryKey: ['product', preselectedProductId],
    queryFn: async () => {
      if (!preselectedProductId) return null;
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', preselectedProductId)
        .single();

      if (error) throw error;
      return data as Product;
    },
    enabled: !!preselectedProductId
  });

  useEffect(() => {
    // Set device type based on screen size
    const checkDeviceType = () => {
      setDeviceType(window.innerWidth <= 768 ? 'mobile' : 'desktop');
    };
    
    checkDeviceType();
    window.addEventListener('resize', checkDeviceType);
    return () => window.removeEventListener('resize', checkDeviceType);
  }, []);

  useEffect(() => {
    // Set preselected product if available
    if (preselectedProduct) {
      // Convert Product to ARProduct format
      const arProduct: ARProduct = {
        id: preselectedProduct.id,
        title: preselectedProduct.title,
        media_urls: preselectedProduct.media_urls || [],
        ar_mesh_url: preselectedProduct.ar_mesh_url,
        attributes: preselectedProduct.attributes
      };
      setSelectedProduct(arProduct);
      setSelectedColor(arProduct.attributes?.color_primary || '');
      setSelectedSize(arProduct.attributes?.size || 'M');
    } else if (mockProducts.length > 0 && !selectedProduct) {
      setSelectedProduct(mockProducts[0]);
      setSelectedColor(mockProducts[0].attributes?.color_primary || '');
    }
  }, [preselectedProduct, selectedProduct]);

  useEffect(() => {
    if (activeTab === 'live-camera') {
      initializeCamera();
    } else {
      stopCamera();
    }

    return () => stopCamera();
  }, [activeTab]);

  const initializeCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 },
          facingMode: deviceType === 'mobile' ? 'user' : 'user'
        } 
      });
      
      setStream(mediaStream);
      setCameraPermission('granted');
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
    } catch (error) {
      console.error('Camera initialization error:', error);
      setCameraPermission('denied');
      toast({
        title: "Camera access denied",
        description: "Please allow camera access to use AR try-on feature.",
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    ctx.drawImage(video, 0, 0);
    
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ar-tryOn-${selectedProduct?.title || 'photo'}-${Date.now()}.jpg`;
        a.click();
        URL.revokeObjectURL(url);
        
        toast({
          description: "Photo captured and saved!",
        });
      }
    }, 'image/jpeg', 0.95);
  };

  const shareCapture = async () => {
    if (!canvasRef.current) return;

    try {
      canvasRef.current.toBlob(async (blob) => {
        if (blob) {
          const file = new File([blob], 'ar-tryOn-photo.jpg', { type: 'image/jpeg' });
          
          if (navigator.share && navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: `AR Try-On: ${selectedProduct?.title}`,
              text: 'Check out how this looks on me!',
              files: [file]
            });
          } else {
            toast({
              title: "Sharing not supported",
              description: "Your device doesn't support sharing photos.",
              variant: "destructive",
            });
          }
        }
      }, 'image/jpeg', 0.95);
    } catch (error) {
      toast({
        title: "Share failed",
        description: "Could not share the photo. Please try again.",
        variant: "destructive",
      });
    }
  };

  const convertARProductToProduct = (arProduct: ARProduct): Product => {
    // Create a minimal Product object from ARProduct
    return {
      ...arProduct,
      brand_id: '',
      sku: '',
      price_cents: 0,
      currency: 'USD',
      category_slug: '',
      attributes: arProduct.attributes || {},
      stock_qty: 0,
      min_stock_alert: 0,
      status: 'active',
      created_at: '',
      updated_at: ''
    } as Product;
  };

  if (!selectedProduct) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <CardTitle>AR Try-On Experience</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-muted-foreground">
              Select a product to start your AR try-on experience.
            </p>
            <div className="grid gap-2">
              {mockProducts.map((product) => (
                <Button
                  key={product.id}
                  variant="outline"
                  className="justify-start h-auto p-3"
                  onClick={() => setSelectedProduct(product)}
                >
                  <img
                    src={product.media_urls[0] || '/placeholder.svg'}
                    alt={product.title}
                    className="w-8 h-8 rounded object-cover mr-3"
                  />
                  <span className="text-left">{product.title}</span>
                </Button>
              ))}
            </div>
            <Button
              variant="ghost"
              onClick={() => navigate('/explore')}
              className="w-full"
            >
              Browse More Products
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-lg border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <span className="font-semibold">AR Try-On</span>
                <Badge variant="secondary">Beta</Badge>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {deviceType === 'mobile' ? (
                <Smartphone className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Monitor className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm text-muted-foreground capitalize">
                {deviceType} Mode
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Onboarding */}
        <AnimatePresence>
          {showOnboarding && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6"
            >
              <Card className="bg-gradient-to-r from-purple-500 to-blue-500 text-white border-0">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <Info className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-2">Welcome to AR Try-On!</h3>
                      <p className="text-white/90 text-sm mb-4">
                        {deviceType === 'mobile' 
                          ? "Use your front camera or upload a photo to see how clothes look on you. Drag, zoom, and rotate for the perfect fit!"
                          : "Use your webcam to see how clothes look on you in real-time. Drag, zoom, and rotate garments for the perfect virtual fit!"
                        }
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setShowOnboarding(false)}
                        >
                          Got it!
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* AR Experience */}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    AR Try-On Experience
                  </CardTitle>
                  <Badge variant="outline" className="gap-1">
                    <Sparkles className="h-3 w-3" />
                    Live Preview
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="p-0">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mx-6 mb-4">
                    <TabsTrigger value="live-camera" className="gap-2">
                      <Camera className="h-4 w-4" />
                      {deviceType === 'mobile' ? 'Camera' : 'Live Camera'}
                    </TabsTrigger>
                    <TabsTrigger value="smart-fit" className="gap-2">
                      <Upload className="h-4 w-4" />
                      Smart Fit (Beta)
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="live-camera" className="mt-0">
                    <div className="relative aspect-[4/3] bg-muted">
                      {cameraPermission === 'denied' ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-muted">
                          <div className="text-center p-8">
                            <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">Camera Access Needed</h3>
                            <p className="text-muted-foreground mb-4">
                              Please allow camera access to use the AR try-on feature.
                            </p>
                            <Button onClick={initializeCamera}>
                              Enable Camera
                            </Button>
                          </div>
                        </div>
                      ) : cameraPermission === 'prompt' ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-muted">
                          <div className="text-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                            <p className="text-muted-foreground">Initializing camera...</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <video
                            ref={videoRef}
                            className="w-full h-full object-cover"
                            autoPlay
                            playsInline
                            muted
                          />
                          
                          <ARGarmentOverlay
                            product={convertARProductToProduct(selectedProduct)}
                            selectedSize={selectedSize}
                            selectedColor={selectedColor}
                            isVisible={true}
                            containerWidth={800}
                            containerHeight={600}
                          />
                        </>
                      )}
                    </div>

                    {cameraPermission === 'granted' && (
                      <div className="flex items-center justify-center gap-2 p-4 bg-muted/30">
                        <Button size="sm" onClick={capturePhoto} className="gap-2">
                          <Download className="h-4 w-4" />
                          Capture
                        </Button>
                        <Button size="sm" variant="outline" onClick={shareCapture} className="gap-2">
                          <Share2 className="h-4 w-4" />
                          Share
                        </Button>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="smart-fit" className="mt-0">
                    <ARSmartFit
                      product={convertARProductToProduct(selectedProduct)}
                      selectedSize={selectedSize}
                      selectedColor={selectedColor}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Product Controls */}
          <div className="space-y-6">
            {/* Product Info */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Selected Product</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <img
                    src={selectedProduct.media_urls[0] || '/placeholder.svg'}
                    alt={selectedProduct.title}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm leading-tight">{selectedProduct.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedProduct.attributes?.gender_target || 'Unisex'} • AR Ready
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" className="h-7 text-xs gap-1">
                        <ShoppingBag className="h-3 w-3" />
                        Add to Bag
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                        <Heart className="h-3 w-3" />
                        Save
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Size & Color Selection */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Customize Fit</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Size</Label>
                  <Select value={selectedSize} onValueChange={setSelectedSize}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="XS">XS</SelectItem>
                      <SelectItem value="S">S</SelectItem>
                      <SelectItem value="M">M</SelectItem>
                      <SelectItem value="L">L</SelectItem>
                      <SelectItem value="XL">XL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Color</Label>
                  <Select value={selectedColor} onValueChange={setSelectedColor}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select color" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Red">Red</SelectItem>
                      <SelectItem value="Blue">Blue</SelectItem>
                      <SelectItem value="Black">Black</SelectItem>
                      <SelectItem value="White">White</SelectItem>
                      <SelectItem value="Green">Green</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Product Selection */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Try Other Products</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  {mockProducts.map((product) => (
                    <Button
                      key={product.id}
                      variant={selectedProduct.id === product.id ? "default" : "outline"}
                      className="justify-start h-auto p-3"
                      onClick={() => {
                        setSelectedProduct(product);
                        setSelectedColor(product.attributes?.color_primary || '');
                        setSelectedSize(product.attributes?.size || 'M');
                      }}
                    >
                      <img
                        src={product.media_urls[0] || '/placeholder.svg'}
                        alt={product.title}
                        className="w-8 h-8 rounded object-cover mr-3"
                      />
                      <div className="text-left">
                        <div className="text-sm font-medium">{product.title}</div>
                        {selectedProduct.id === product.id && (
                          <div className="text-xs text-muted-foreground">Currently selected</div>
                        )}
                      </div>
                      {selectedProduct.id === product.id && (
                        <CheckCircle className="h-4 w-4 ml-auto text-primary" />
                      )}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default ARTryOn;
