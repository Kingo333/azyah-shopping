import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Upload, Loader2, Crown } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAddWardrobeItem, useWardrobeLimit } from '@/hooks/useWardrobeItems';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

interface WardrobeUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onItemAdded?: (itemId: string) => void;
}

export const WardrobeUploadModal: React.FC<WardrobeUploadModalProps> = ({ 
  isOpen, 
  onClose,
  onItemAdded 
}) => {
  const { user } = useAuth();
  const addItem = useAddWardrobeItem();
  const { data: wardrobeLimit, refetch: refetchLimit } = useWardrobeLimit();
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [bgRemovedPreview, setBgRemovedPreview] = useState<string | null>(null);
  const [category, setCategory] = useState<string>('');
  const [color, setColor] = useState('');
  const [brand, setBrand] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [publicReuse, setPublicReuse] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<'upload' | 'processing' | 'metadata'>('upload');


  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    maxFiles: 1,
    onDrop: async (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (file) {
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        await processImage(file);
      }
    }
  });

  const processImage = async (file: File) => {
    // Check limit before processing
    if (wardrobeLimit && !wardrobeLimit.canAdd) {
      toast.error(`You've reached your ${wardrobeLimit.max} item limit. ${wardrobeLimit.isPremium ? '' : 'Upgrade to premium for unlimited items.'}`);
      return;
    }

    setIsProcessing(true);
    setProgress(10);
    setCurrentStep('processing');

    try {
      console.log('Starting Gemini background removal...');
      
      // Create FormData with the image
      const formData = new FormData();
      formData.append('file', file);
      
      setProgress(30);

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Call Gemini edge function using direct fetch (FormData doesn't work with supabase.functions.invoke)
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-bg-remove`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: formData
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Background removal failed');
      }

      const data = await response.json();
      
      setProgress(70);

      if (!data.success || !data.image_url) {
        throw new Error('Background removal failed');
      }

      console.log('Background removed successfully:', data.image_url);
      setBgRemovedPreview(data.image_url);
      
      setProgress(90);
      
      // Try auto-tagging (optional)
      try {
        const { data: tagData } = await supabase.functions.invoke('auto-tag', {
          body: { image_path: data.image_path }
        });

        if (tagData && !tagData.error) {
          setCategory(tagData.category || '');
          setColor(tagData.color_primary || '');
          setTags(tagData.suggested_tags || []);
        }
      } catch (tagError) {
        console.warn('Auto-tagging failed (non-critical):', tagError);
      }

      setProgress(100);
      setCurrentStep('metadata');
      toast.success('Background removed successfully!');
    } catch (error: any) {
      console.error('Error processing image:', error);
      toast.error(error.message || 'Failed to process image. Please try again.');
      
      setCurrentStep('upload');
      setProgress(0);
      setSelectedFile(null);
      setPreviewUrl(null);
      setBgRemovedPreview(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!category || !user || !bgRemovedPreview) {
      toast.error('Please complete all required fields');
      return;
    }

    setIsProcessing(true);

    try {
      console.log('Saving item to database with URL:', bgRemovedPreview);
      
      const newItem = await addItem.mutateAsync({
        image_url: bgRemovedPreview,
        image_bg_removed_url: bgRemovedPreview,
        category: category as any,
        color: color || null,
        season: null,
        brand: brand || null,
        is_favorite: false,
        tags: tags.length > 0 ? tags : null,
        source: 'upload',
        public_reuse_permitted: publicReuse,
        attribution_user_id: null,
        thumb_path: null,
      });

      console.log('Item saved successfully:', newItem);
      toast.success('Item added to your wardrobe!');
      
      if (newItem && onItemAdded) {
        onItemAdded(newItem.id);
      }

      // Refetch the limit to update the UI
      refetchLimit();

      // Reset form
      setSelectedFile(null);
      setPreviewUrl(null);
      setBgRemovedPreview(null);
      setCategory('');
      setColor('');
      setBrand('');
      setTags([]);
      setPublicReuse(false);
      setProgress(0);
      setCurrentStep('upload');
      onClose();
    } catch (error) {
      console.error('Error saving item:', error);
      toast.error('Failed to save item');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add to Closet</DialogTitle>
        </DialogHeader>

        {/* Wardrobe Limit Display */}
        {wardrobeLimit && (
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm font-medium">Wardrobe Items</p>
              <p className="text-xs text-muted-foreground">
                {wardrobeLimit.isPremium 
                  ? `${wardrobeLimit.current} items (Unlimited)` 
                  : `${wardrobeLimit.current}/${wardrobeLimit.max} items used`}
              </p>
            </div>
            {wardrobeLimit.isPremium ? (
              <Badge variant="default" className="gap-1">
                <Crown className="h-3 w-3" />
                Premium
              </Badge>
            ) : wardrobeLimit.current >= wardrobeLimit.max ? (
              <Badge variant="destructive">Limit Reached</Badge>
            ) : (
              <Badge variant="secondary">Free</Badge>
            )}
          </div>
        )}

        <div className="space-y-4">
          {/* Step 1: Upload */}
          {currentStep === 'upload' && (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              }`}
            >
              <input {...getInputProps()} />
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="max-h-48 mx-auto rounded" />
              ) : (
                <div className="space-y-2">
                  <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Upload a photo or import from web. We'll remove the background for you.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Processing */}
          {currentStep === 'processing' && (
            <div className="space-y-4">
              <div className="aspect-square rounded-lg bg-muted/30 flex items-center justify-center"
                style={{
                  backgroundImage: bgRemovedPreview ? 'repeating-conic-gradient(hsl(var(--muted)) 0% 25%, transparent 0% 50%) 50% / 20px 20px' : 'none'
                }}
              >
                {bgRemovedPreview ? (
                  <img src={bgRemovedPreview} alt="Preview" className="max-h-full object-contain" />
                ) : (
                  <Loader2 className="w-12 h-12 animate-spin text-muted-foreground" />
                )}
              </div>
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-xs text-center text-muted-foreground">
                  Looking sharp… removing background.
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Metadata */}
          {currentStep === 'metadata' && (
            <>
              {bgRemovedPreview && (
                <div className="aspect-square rounded-lg bg-muted/30 overflow-hidden flex items-center justify-center"
                  style={{
                    backgroundImage: 'repeating-conic-gradient(hsl(var(--muted)) 0% 25%, transparent 0% 50%) 50% / 20px 20px'
                  }}
                >
                  <img src={bgRemovedPreview} alt="Preview" className="max-h-full object-contain" />
                </div>
              )}

              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="top">Top</SelectItem>
                    <SelectItem value="bottom">Bottom</SelectItem>
                    <SelectItem value="dress">Dress</SelectItem>
                    <SelectItem value="outerwear">Outerwear</SelectItem>
                    <SelectItem value="shoes">Shoes</SelectItem>
                    <SelectItem value="bag">Bag</SelectItem>
                    <SelectItem value="accessory">Accessory</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Color</Label>
                  <Input
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="e.g., Blue"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Brand</Label>
                  <Input
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow public reuse</Label>
                  <p className="text-xs text-muted-foreground">
                    Let others use this item in their fits
                  </p>
                </div>
                <Switch
                  checked={publicReuse}
                  onCheckedChange={setPublicReuse}
                />
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1" disabled={isProcessing}>
              Cancel
            </Button>
            {currentStep === 'metadata' && (
              <Button onClick={handleSave} className="flex-1" disabled={!category || isProcessing}>
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save to My Closet'
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
