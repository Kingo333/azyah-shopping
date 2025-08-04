import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import ShopperNavigation from '@/components/ShopperNavigation';
import TutorialTooltip from '@/components/TutorialTooltip';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { 
  Camera, 
  RotateCcw, 
  Download, 
  Share, 
  X,
  Zap,
  Sparkles,
  ShoppingBag,
  Heart,
  Settings,
  Info,
  Upload,
  CameraIcon,
  Plus
} from 'lucide-react';
import { useWishlistProducts } from '@/hooks/useWishlistProducts';

interface ARProduct {
  id: string;
  title: string;
  brand: string;
  price: number;
  currency: string;
  image: string;
  arMeshUrl?: string;
  category: string;
  sizes: string[];
  colors: string[];
}

const ARTryOn: React.FC = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [isARActive, setIsARActive] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ARProduct | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'pending'>('pending');
  const [isLoading, setIsLoading] = useState(false);
  const [hasHttpsError, setHasHttpsError] = useState(false);
  const [fallbackMode, setFallbackMode] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { wishlistProducts, isLoading: wishlistLoading, hasWishlist } = useWishlistProducts();

  // Convert wishlist products to AR products format
  const arProducts: ARProduct[] = wishlistProducts.map((item) => ({
    id: item.product.id,
    title: item.product.title,
    brand: 'Fashion Brand', // You might want to fetch actual brand names
    price: item.product.price_cents,
    currency: item.product.currency || 'USD',
    image: item.product.media_urls?.[0] || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&h=800&fit=crop',
    arMeshUrl: '/models/product.glb', // Default AR model
    category: 'Fashion',
    sizes: ['XS', 'S', 'M', 'L', 'XL'], // Default sizes - you might want to fetch actual sizes
    colors: ['Black', 'White', 'Navy'] // Default colors - you might want to fetch actual colors
  }));

  useEffect(() => {
    // Set default selections for the first product
    if (arProducts.length > 0 && !selectedProduct) {
      const firstProduct = arProducts[0];
      setSelectedProduct(firstProduct);
      setSelectedSize(firstProduct.sizes[0]);
      setSelectedColor(firstProduct.colors[0]);
    }
  }, [arProducts]);

  const logARError = async (errorType: string, errorMessage: string) => {
    if (!user) return;
    
    try {
      await supabase.from('events').insert({
        user_id: user.id,
        event_type: 'ar_error',
        event_data: {
          error_type: errorType,
          error_message: errorMessage,
          user_agent: navigator.userAgent,
          is_mobile: /Mobi|Android/i.test(navigator.userAgent),
          is_https: window.location.protocol === 'https:',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Failed to log AR error:', error);
    }
  };

  const requestCameraAccess = async () => {
    try {
      setIsLoading(true);
      
      // Force fallback mode on mobile devices
      if (isMobile) {
        await logARError('mobile_fallback', 'Mobile devices use photo upload mode');
        setFallbackMode(true);
        toast({ 
          description: "Mobile devices use photo upload mode for better experience!",
          variant: "default"
        });
        return;
      }
      
      // Check for HTTPS
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        setHasHttpsError(true);
        await logARError('https_required', 'Camera access requires HTTPS');
        throw new Error('HTTPS required for camera access');
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      
      setCameraPermission('granted');
      setIsARActive(true);
      toast({ description: "Camera access granted! AR try-on is now active." });
    } catch (error: any) {
      setCameraPermission('denied');
      await logARError('camera_access_denied', error.message);
      
      if (error.name === 'NotAllowedError') {
        toast({ 
          description: "Camera access denied. Try uploading a photo instead!",
          variant: "destructive"
        });
      } else if (error.name === 'NotFoundError') {
        toast({ 
          description: "No camera found. Try uploading a photo instead!",
          variant: "destructive"
        });
      } else if (hasHttpsError) {
        toast({ 
          description: "HTTPS required for camera. Try uploading a photo instead!",
          variant: "destructive"
        });
      } else {
        toast({ 
          description: "Camera not available. Try uploading a photo instead!",
          variant: "destructive"
        });
      }
      
      setFallbackMode(true);
    } finally {
      setIsLoading(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsARActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        
        // Convert to blob and download
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ar-tryOn-${selectedProduct?.title}-${Date.now()}.png`;
            a.click();
            URL.revokeObjectURL(url);
            toast({ description: "Photo captured and downloaded!" });
          }
        });
      }
    }
  };

  const sharePhoto = async () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        
        canvas.toBlob(async (blob) => {
          if (blob && navigator.share) {
            try {
              await navigator.share({
                title: `AR Try-On: ${selectedProduct?.title}`,
                text: `Check out how I look in this ${selectedProduct?.title} from ${selectedProduct?.brand}!`,
                files: [new File([blob], 'ar-tryOn.png', { type: 'image/png' })]
              });
            } catch (error) {
              toast({ description: "Sharing not supported on this device" });
            }
          } else {
            toast({ description: "Sharing not supported on this device" });
          }
        });
      }
    }
  };

  const formatPrice = (cents: number, currency: string = 'USD'): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(cents / 100);
  };

  const handleAddToWishlist = () => {
    toast({ description: `Added ${selectedProduct?.title} to wishlist` });
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      // Here you would normally process the uploaded photo for AR try-on
      toast({ description: "Photo uploaded! AR processing would happen here." });
    };
    reader.readAsDataURL(file);
  };

  const handleAddToBag = () => {
    if (!selectedSize) {
      toast({ description: "Please select a size", variant: "destructive" });
      return;
    }
    toast({ description: `Added ${selectedProduct?.title} (${selectedSize}) to bag` });
  };

  const tutorialSteps = [
    {
      title: "Welcome to AR Try-On!",
      description: "Experience the future of fashion shopping! Try on clothes virtually using your camera or by uploading photos.",
      icon: <CameraIcon className="h-5 w-5 text-primary" />,
      action: "Choose a product to get started"
    },
    {
      title: "Step 1: Camera or Upload",
      description: "On desktop, use live camera for real-time AR. On mobile, upload a full-body photo for the best try-on experience.",
      icon: <Camera className="h-5 w-5 text-green-500" />,
      action: isMobile ? "Upload a photo" : "Click 'Use Live Camera' when ready"
    },
    {
      title: "Step 2: Choose Your Product", 
      description: "Select any AR-ready product, pick your size and color preferences, then see how it looks on you in real-time!",
      icon: <Sparkles className="h-5 w-5 text-purple-500" />,
      action: "Select a product from the left panel"
    },
    {
      title: "Step 3: Save & Share",
      description: "Love how you look? Capture photos and share them, or add items directly to your wishlist or bag!",
      icon: <Heart className="h-5 w-5 text-red-500" />,
      action: "Use the capture and share buttons during AR session"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-6xl p-4">
        {/* Navigation */}
        <ShopperNavigation />
        
        {/* Tutorial */}
        <TutorialTooltip
          tutorialKey="ar-tryOn"
          steps={tutorialSteps}
          autoShow={true}
        />

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">AR Try-On</h1>
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="h-3 w-3" />
                Beta
              </Badge>
            </div>
          </div>
          <TutorialTooltip
            tutorialKey="ar-tryOn"
            steps={tutorialSteps}
            trigger={
              <Button variant="outline" size="sm">
                <Info className="h-4 w-4 mr-2" />
                How it works
              </Button>
            }
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your Wishlist Products</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {wishlistLoading ? (
                  <div className="text-center py-8">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Loading your wishlist...</p>
                  </div>
                ) : !hasWishlist ? (
                  <div className="text-center py-8">
                    <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No Wishlist Found</h3>
                    <p className="text-muted-foreground mb-4">
                      Create a wishlist first to try on your favorite products in AR.
                    </p>
                    <Button onClick={() => window.location.href = '/wishlist'}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Wishlist
                    </Button>
                  </div>
                ) : arProducts.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">Empty Wishlist</h3>
                    <p className="text-muted-foreground mb-4">
                      Add some products to your wishlist to try them on in AR.
                    </p>
                    <Button onClick={() => window.location.href = '/explore'}>
                      <Plus className="h-4 w-4 mr-2" />
                      Browse Products
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {arProducts.map((product) => (
                      <div 
                        key={product.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedProduct?.id === product.id 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => {
                          setSelectedProduct(product);
                          setSelectedSize(product.sizes[0]);
                          setSelectedColor(product.colors[0]);
                        }}
                      >
                        <div className="flex gap-3">
                          <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden">
                            <img 
                              src={product.image} 
                              alt={product.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm truncate">{product.title}</h3>
                            <p className="text-xs text-muted-foreground">{product.brand}</p>
                            <p className="text-sm font-semibold">{formatPrice(product.price)}</p>
                            <Badge variant="outline" className="text-xs mt-1">
                              <Zap className="h-2 w-2 mr-1" />
                              AR Ready
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Product Customization */}
            {selectedProduct && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Customize</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Size Selection */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Size</label>
                    <div className="flex flex-wrap gap-2">
                      {selectedProduct.sizes.map((size) => (
                        <Button
                          key={size}
                          variant={selectedSize === size ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedSize(size)}
                        >
                          {size}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Color Selection */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Color</label>
                    <div className="flex flex-wrap gap-2">
                      {selectedProduct.colors.map((color) => (
                        <Button
                          key={color}
                          variant={selectedColor === color ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedColor(color)}
                        >
                          {color}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Actions */}
                  <div className="space-y-2">
                    <Button onClick={handleAddToBag} className="w-full" disabled={!selectedSize}>
                      <ShoppingBag className="h-4 w-4 mr-2" />
                      Buy Now - {formatPrice(selectedProduct.price)}
                    </Button>
                    <Button variant="outline" onClick={handleAddToWishlist} className="w-full">
                      <Heart className="h-4 w-4 mr-2" />
                      Add to Wishlist
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* AR Camera View */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardContent className="p-0">
                <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                  {!isARActive ? (
                    // Camera Permission / Start Screen
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center space-y-4 max-w-md mx-auto p-6">
                        <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                          <Camera className="h-10 w-10 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold mb-2">Start AR Try-On</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            Use your camera or upload a photo to see how the {selectedProduct?.title} looks on you
                          </p>
                          
                          {hasHttpsError && (
                            <div className="p-3 bg-yellow-100 rounded-lg mb-4">
                              <p className="text-xs text-yellow-800">
                                Live camera requires HTTPS. Try uploading a photo instead!
                              </p>
                            </div>
                          )}
                          
                          <div className="space-y-3">
                          {!fallbackMode && !isMobile && (
                            <Button 
                              onClick={requestCameraAccess}
                              disabled={isLoading}
                              className="gap-2 w-full"
                            >
                              {isLoading ? (
                                  <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Starting Camera...
                                  </>
                                ) : (
                                  <>
                                    <Camera className="h-4 w-4" />
                                    Use Live Camera
                                  </>
                                )}
                              </Button>
                            )}
                            
                            <Button 
                              variant="outline"
                              onClick={() => fileInputRef.current?.click()}
                              className="gap-2 w-full"
                            >
                              <Upload className="h-4 w-4" />
                              Upload Photo Instead
                            </Button>
                            
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              onChange={handlePhotoUpload}
                              className="hidden"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Active AR View
                    <>
                      <video 
                        ref={videoRef}
                        className="w-full h-full object-cover"
                        autoPlay
                        muted
                        playsInline
                      />
                      
                      {/* AR Overlay */}
                      <div className="absolute inset-0 pointer-events-none">
                        {/* Simulated AR garment overlay */}
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-64 border-2 border-primary/50 rounded-lg bg-primary/10 flex items-center justify-center">
                          <div className="text-center text-primary">
                            <Sparkles className="h-8 w-8 mx-auto mb-2" />
                            <p className="text-sm font-medium">{selectedProduct?.title}</p>
                            <p className="text-xs">AR Rendering...</p>
                          </div>
                        </div>
                      </div>

                      {/* Controls Overlay */}
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2">
                        <Button size="sm" variant="secondary" onClick={capturePhoto}>
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="secondary" onClick={sharePhoto}>
                          <Share className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="secondary">
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={stopCamera}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Product Info Overlay */}
                      <div className="absolute top-4 right-4 bg-background/90 backdrop-blur-sm rounded-lg p-3 max-w-xs">
                        <h4 className="font-medium text-sm">{selectedProduct?.title}</h4>
                        <p className="text-xs text-muted-foreground">{selectedProduct?.brand}</p>
                        <p className="text-sm font-semibold">{selectedProduct && formatPrice(selectedProduct.price)}</p>
                        <div className="flex gap-1 mt-2">
                          <Badge variant="outline" className="text-xs">{selectedSize}</Badge>
                          <Badge variant="outline" className="text-xs">{selectedColor}</Badge>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Hidden canvas for photo capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};

export default ARTryOn;