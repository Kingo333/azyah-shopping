import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Heart, ShoppingBag, ExternalLink, Sparkles, X } from 'lucide-react';
import { Product } from '@/types';
import { EnhancedProductGallery } from './EnhancedProductGallery';
import { AdvancedSizeColorSelector } from './AdvancedSizeColorSelector';
import { AddToClosetModal } from './AddToClosetModal';
import { useFeatureFlags } from '@/contexts/FeatureFlagsContext';
import { AiTryOnUploader } from './AiTryOnUploader';
import { TryOnProgress } from './TryOnProgress';
import { TryOnResultGallery } from './TryOnResultGallery';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface ProductDetailModalProps {
  product?: Product | null;           // <-- allow null/undefined
  isOpen: boolean;
  onClose: () => void;
}

interface TryOnJob {
  id: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  output_url?: string;
  error_message?: string;
}

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isOpen,
  onClose
}) => {
  const { isEnabled } = useFeatureFlags();
  const { toast } = useToast();
  const { user, session } = useAuth();

  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [isClosetModalOpen, setIsClosetModalOpen] = useState(false);
  const [showAiTryOn, setShowAiTryOn] = useState(false);
  const [currentJob, setCurrentJob] = useState<TryOnJob | null>(null);

  // 🔒 Always compute a safe images array
  const images = useMemo<string[]>(() => {
    const media = (product?.media_urls ?? product?.images ?? []) as unknown as string[];
    return Array.isArray(media) ? media.filter(Boolean) : [];
  }, [product]);

  const priceCurrency = product?.currency || 'USD';
  const priceCents = product?.price_cents ?? 0;
  const compareAtCents = product?.compare_at_price_cents ?? null;

  const handleShopNow = () => {
    if (product?.external_url) {
      window.open(product.external_url, '_blank', 'noopener,noreferrer');
    } else {
      toast({ description: 'Shop link not available for this product', variant: 'destructive' });
    }
  };

  const handleAiTryOnUpload = async (imageId: string) => {
    if (!user || !session || !product?.id) {
      toast({ description: 'Please sign in and select a product to use AI Try-On', variant: 'destructive' });
      return;
    }

    try {
      const { data: result, error } = await supabase.functions.invoke('tryon-jobs', {
        body: {
          person_image_id: imageId,
          product_id: product.id,
          variant_id: selectedSize || selectedColor || null
        }
      });
      if (error) throw error;

      setCurrentJob({ id: result.job_id, status: 'queued' });
      void pollJobStatus(result.job_id);
    } catch (err) {
      console.error('AI Try-On error:', err);
      toast({ description: 'Failed to start AI Try-On. Please try again.', variant: 'destructive' });
    }
  };

  const pollJobStatus = async (jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const { data: job, error } = await supabase.functions.invoke(`tryon-jobs/${jobId}`, { method: 'GET' });
        if (error) throw error;
        setCurrentJob(job);
        if (job.status === 'succeeded' || job.status === 'failed') clearInterval(interval);
      } catch (err) {
        console.error('Error polling job status:', err);
        clearInterval(interval);
        setCurrentJob(prev => (prev ? { ...prev, status: 'failed' } : null));
      }
    }, 2000);

    setTimeout(() => clearInterval(interval), 60000);
  };

  const handleTryAgain = () => setCurrentJob(null);

  // Mock data (unchanged)
  const availableSizes = ['XS', 'S', 'M', 'L', 'XL'].map(size => ({
    value: size, label: size, inStock: true, stockCount: 10
  }));
  const availableColors = [
    { value: 'black', label: 'Black', hexCode: '#000000', inStock: true },
    { value: 'white', label: 'White', hexCode: '#ffffff', inStock: true },
    { value: 'navy', label: 'Navy', hexCode: '#1e3a8a', inStock: true },
    { value: 'beige', label: 'Beige', hexCode: '#f5f5dc', inStock: true }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        {/* ⏳ Loading/empty guard */}
        {!product ? (
          <div className="flex h-[70vh] items-center justify-center text-sm text-muted-foreground">
            Loading product details…
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 h-full">
            {/* Image Gallery */}
            <div className="relative">
              <EnhancedProductGallery
                images={images}
                productTitle={product.title}
                productId={product.id}
                hasARMesh={false}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="absolute top-4 right-4 z-10 bg-background/80 backdrop-blur-sm"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Product Details */}
            <div className="flex flex-col h-full">
              <ScrollArea className="flex-1 p-6">
                <div className="space-y-6">
                  {/* Header */}
                  <div>
                    <h2 className="text-2xl font-bold line-clamp-2 mb-2">{product.title}</h2>
                    <p className="text-muted-foreground">{product.brand?.name}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-2xl font-bold">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: priceCurrency })
                          .format(priceCents / 100)}
                      </span>
                      {compareAtCents ? (
                        <span className="text-lg text-muted-foreground line-through">
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: priceCurrency })
                            .format(compareAtCents / 100)}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* AI Try-On Section */}
                  {isEnabled('aiTryOn') && (
                    <div className="border rounded-lg p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
                      {!showAiTryOn && !currentJob && (
                        <div className="text-center">
                          <Button
                            onClick={() => setShowAiTryOn(true)}
                            className="gap-2 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                          >
                            <Sparkles className="h-4 w-4" />
                            Try with AI
                          </Button>
                          <p className="text-xs text-muted-foreground mt-2">
                            Upload your photo to see how this looks on you
                          </p>
                        </div>
                      )}

                      {showAiTryOn && !currentJob && (
                        <AiTryOnUploader onUploadComplete={handleAiTryOnUpload} />
                      )}

                      {currentJob && currentJob.status !== 'succeeded' && (
                        <TryOnProgress status={currentJob.status} />
                      )}

                      {currentJob?.status === 'succeeded' && currentJob.output_url && (
                        <TryOnResultGallery
                          resultUrl={currentJob.output_url}
                          product={product}
                          onTryAgain={handleTryAgain}
                        />
                      )}

                      {currentJob?.status === 'failed' && (
                        <div className="text-center space-y-2">
                          <p className="text-sm text-red-600">
                            {currentJob.error_message || 'Try-on failed. Please try again.'}
                          </p>
                          <Button onClick={handleTryAgain} variant="outline" size="sm">
                            Try Again
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Size and Color Selection */}
                  <AdvancedSizeColorSelector
                    sizes={availableSizes}
                    colors={availableColors}
                    selectedSize={selectedSize}
                    selectedColor={selectedColor}
                    onSizeSelect={setSelectedSize}
                    onColorSelect={setSelectedColor}
                  />

                  {/* Description */}
                  {product.description ? (
                    <div>
                      <h4 className="font-semibold mb-2">Description</h4>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {product.description}
                      </p>
                    </div>
                  ) : null}

                  {/* Product Details */}
                  <div className="space-y-3">
                    <h4 className="font-semibold">Product Details</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">SKU:</span>
                        <span>{product.sku}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Category:</span>
                        <span className="capitalize">
                          {product.category_slug?.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>

              {/* Sticky Footer Actions */}
              <div className="border-t p-6 space-y-3 bg-background">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 gap-2">
                    <Heart className="h-4 w-4" />
                    Wishlist
                  </Button>
                  <Button
                    onClick={() => setIsClosetModalOpen(true)}
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    Add to Closet
                  </Button>
                </div>

                {product.external_url ? (
                  <Button
                    onClick={handleShopNow}
                    className="w-full gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Shop Now
                  </Button>
                ) : (
                  <Button disabled className="w-full gap-2 opacity-50 cursor-not-allowed">
                    <ShoppingBag className="h-4 w-4" />
                    Shop Link Not Available
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Closet modal only mounts if product exists */}
        {product && (
          <AddToClosetModal
            productId={product.id}
            isOpen={isClosetModalOpen}
            onClose={() => setIsClosetModalOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProductDetailModal;
