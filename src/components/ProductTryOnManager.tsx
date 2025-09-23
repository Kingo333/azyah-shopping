import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Upload, Image as ImageIcon, X, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useProductOutfits, useProductHasOutfit } from '@/hooks/useProductOutfits';
import { cn } from '@/lib/utils';

interface ProductTryOnManagerProps {
  product: {
    id: string;
    title: string;
    brand_id?: string;
  };
  variant?: 'button' | 'edit';
  className?: string;
}

export const ProductTryOnManager: React.FC<ProductTryOnManagerProps> = ({ 
  product, 
  variant = 'button',
  className 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [outfitFile, setOutfitFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  
  const { data: hasOutfit, refetch: refetchHasOutfit } = useProductHasOutfit(product.id);
  const { uploadOutfit, deleteOutfit } = useProductOutfits(product.brand_id || '');

  const handleOutfitUpload = async () => {
    if (!outfitFile || !product.brand_id) return;
    
    setIsUploading(true);
    uploadOutfit({
      productId: product.id,
      brandId: product.brand_id,
      file: outfitFile
    }, {
      onSuccess: () => {
        setOutfitFile(null);
        setIsOpen(false);
        refetchHasOutfit();
      },
      onError: (error: any) => {
        console.error('Error uploading outfit:', error);
        toast({
          title: "Upload failed", 
          description: "Failed to upload virtual try-on image. Please try again.",
          variant: "destructive"
        });
      },
      onSettled: () => {
        setIsUploading(false);
      }
    });
  };

  const handleRemoveOutfit = async () => {
    deleteOutfit(product.id, {
      onSuccess: () => {
        refetchHasOutfit();
        setIsOpen(false);
      },
      onError: (error: any) => {
        console.error('Error removing outfit:', error);
        toast({
          title: "Error",
          description: "Failed to remove virtual try-on image.",
          variant: "destructive"
        });
      }
    });
  };

  const TriggerButton = () => {
    if (variant === 'edit') {
      return (
        <Button variant="ghost" size="sm" className={cn("h-8 w-8 p-0", className)}>
          <Edit className="h-4 w-4" />
        </Button>
      );
    }

    return (
      <Button 
        variant={hasOutfit ? "secondary" : "outline"} 
        size="sm" 
        className={cn("flex items-center gap-2", className)}
      >
        <ImageIcon className="h-4 w-4" />
        {hasOutfit ? "Edit Try-On" : "Add Try-On"}
        {hasOutfit && <Badge variant="secondary" className="ml-1">✓</Badge>}
      </Button>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <TriggerButton />
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Virtual Try-On</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Upload an outfit image for "{product.title}"
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {hasOutfit && (
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Try-On Available</Badge>
                <span className="text-sm text-green-700">This product has virtual try-on enabled</span>
              </div>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleRemoveOutfit}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="outfit-upload">Upload Outfit Image</Label>
            <div className="flex items-center gap-2">
              <Input
                id="outfit-upload"
                type="file"
                accept="image/*"
                onChange={(e) => setOutfitFile(e.target.files?.[0] || null)}
                className="flex-1"
              />
              <Upload className="h-4 w-4 text-muted-foreground" />
            </div>
            {outfitFile && (
              <div className="text-sm text-muted-foreground">
                Selected: {outfitFile.name}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Upload a clear image of the outfit/garment for virtual try-on
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleOutfitUpload}
              disabled={!outfitFile || isUploading || !product.brand_id}
              className="flex-1"
            >
              {isUploading ? "Uploading..." : hasOutfit ? "Update Image" : "Upload Image"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};