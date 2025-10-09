import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Upload, Loader2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAddWardrobeItem } from '@/hooks/useWardrobeItems';
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
  const [quota, setQuota] = useState<{ remaining: number; total: number } | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      fetchQuota();
    }
  }, [isOpen, user]);

  const fetchQuota = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('bg-remove', {
        body: { action: 'check_quota' }
      });
      
      if (!error && data?.quota) {
        setQuota(data.quota);
      }
    } catch (error) {
      console.error('Error fetching quota:', error);
    }
  };

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
    setIsProcessing(true);
    setProgress(10);
    setCurrentStep('processing');

    try {
      // Call bg-remove edge function
      const formData = new FormData();
      formData.append('file', file);

      setProgress(30);
      const { data: bgRemoveData, error: bgRemoveError } = await supabase.functions.invoke('bg-remove', {
        body: formData
      });

      if (bgRemoveError) {
        if (bgRemoveError.message?.includes('quota')) {
          toast.error("You've reached your monthly background removals. Upgrade for unlimited.");
        } else {
          throw bgRemoveError;
        }
        setIsProcessing(false);
        return;
      }

      setProgress(60);

      // Get public URL for preview
      const { data: { publicUrl } } = supabase.storage
        .from('closet-items')
        .getPublicUrl(bgRemoveData.image_path);

      setBgRemovedPreview(publicUrl);
      setProgress(70);

      // Call auto-tag edge function
      const { data: tagData, error: tagError } = await supabase.functions.invoke('auto-tag', {
        body: { image_path: bgRemoveData.image_path }
      });

      if (!tagError && tagData) {
        setCategory(tagData.category || '');
        setColor(tagData.color_primary || '');
        setTags(tagData.suggested_tags || []);
      }

      setProgress(100);
      setCurrentStep('metadata');
    } catch (error) {
      console.error('Error processing image:', error);
      toast.error('We couldn\'t remove the background. Try a clearer photo or different lighting.');
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
      // Extract path from preview URL
      const urlParts = bgRemovedPreview.split('/');
      const imagePath = `${urlParts[urlParts.length - 2]}/${urlParts[urlParts.length - 1]}`;

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
        thumb_path: imagePath.replace('.png', '_thumb.webp'),
      });

      toast.success('Added to your closet');
      
      if (newItem && onItemAdded) {
        onItemAdded(newItem.id);
      }

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
