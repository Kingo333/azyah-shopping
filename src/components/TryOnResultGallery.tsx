
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, Heart, ShoppingBag, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Product } from '@/types';

interface TryOnResultGalleryProps {
  resultUrl: string;
  product: Product;
  onSave?: () => void;
  onTryAgain: () => void;
}

export const TryOnResultGallery: React.FC<TryOnResultGalleryProps> = ({
  resultUrl,
  product,
  onSave,
  onTryAgain
}) => {
  const { toast } = useToast();

  const handleDownload = async () => {
    try {
      const response = await fetch(resultUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `try-on-${product.title.replace(/\s+/g, '-').toLowerCase()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        description: "Image downloaded successfully!",
      });
    } catch (error) {
      toast({
        description: "Failed to download image",
        variant: "destructive"
      });
    }
  };

  const handleShopNow = () => {
    if (product.external_url) {
      window.open(product.external_url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="font-semibold text-lg mb-2">Your AI Try-On Result</h3>
        <p className="text-sm text-muted-foreground">
          See how {product.title} looks on you
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="aspect-[3/4] rounded-lg overflow-hidden mb-4">
            <img
              src={resultUrl}
              alt={`AI Try-On result for ${product.title}`}
              className="w-full h-full object-cover"
            />
          </div>
          
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="flex-1 gap-2"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
              
              {onSave && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onSave}
                  className="flex-1 gap-2"
                >
                  <Heart className="h-4 w-4" />
                  Save
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={onTryAgain}
                variant="secondary"
                size="sm"
                className="flex-1"
              >
                Try Different Photo
              </Button>
              
              {product.external_url ? (
                <Button
                  onClick={handleShopNow}
                  size="sm"
                  className="flex-1 gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                >
                  <ExternalLink className="h-4 w-4" />
                  Shop Now
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="flex-1 gap-2"
                  disabled
                >
                  <ShoppingBag className="h-4 w-4" />
                  Add to Bag
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
