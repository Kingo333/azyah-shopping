import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Upload, Loader2, Crown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAddWardrobeItem, useWardrobeLimit } from '@/hooks/useWardrobeItems';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { removeBackground, loadImage } from '@/utils/backgroundRemoval';

interface WardrobeUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onItemAdded?: (itemId: string) => void;
  presetCategory?: string;
}

export const WardrobeUploadModal: React.FC<WardrobeUploadModalProps> = ({ 
  isOpen, 
  onClose,
  onItemAdded,
  presetCategory
}) => {
  const { user } = useAuth();
  const addItem = useAddWardrobeItem();
  const { data: wardrobeLimit, refetch: refetchLimit } = useWardrobeLimit();
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [bgRemovedPreview, setBgRemovedPreview] = useState<string | null>(null);
  const [category, setCategory] = useState<string>(presetCategory || '');
  const [color, setColor] = useState('');
  const [brand, setBrand] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [publicReuse, setPublicReuse] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<'upload' | 'processing' | 'metadata'>('upload');
  const [colorCarouselIndex, setColorCarouselIndex] = useState(0);

  const colorOptions = [
    { name: 'Black', value: 'black', hex: '#000000' },
    { name: 'White', value: 'white', hex: '#FFFFFF' },
    { name: 'Gray', value: 'gray', hex: '#9CA3AF' },
    { name: 'Red', value: 'red', hex: '#EF4444' },
    { name: 'Pink', value: 'pink', hex: '#EC4899' },
    { name: 'Orange', value: 'orange', hex: '#F97316' },
    { name: 'Yellow', value: 'yellow', hex: '#EAB308' },
    { name: 'Green', value: 'green', hex: '#22C55E' },
    { name: 'Blue', value: 'blue', hex: '#3B82F6' },
    { name: 'Purple', value: 'purple', hex: '#A855F7' },
    { name: 'Brown', value: 'brown', hex: '#92400E' },
    { name: 'Beige', value: 'beige', hex: '#D4C5B9' },
    { name: 'Navy', value: 'navy', hex: '#1E3A8A' },
    { name: 'Cream', value: 'cream', hex: '#FFFBEB' },
    { name: 'Olive', value: 'olive', hex: '#84CC16' },
    { name: 'Maroon', value: 'maroon', hex: '#991B1B' },
  ];

  const colorsPerPage = 5;
  const totalPages = Math.ceil(colorOptions.length / colorsPerPage);
  const visibleColors = colorOptions.slice(
    colorCarouselIndex * colorsPerPage,
    (colorCarouselIndex + 1) * colorsPerPage
  );

  // Update category when preset changes
  useEffect(() => {
    if (presetCategory) {
      setCategory(presetCategory);
    }
  }, [presetCategory]);


  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB max
    onDrop: async (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (file) {
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        await processImage(file);
      }
    },
    onDropRejected: (fileRejections) => {
      const error = fileRejections[0]?.errors[0];
      if (error?.code === 'file-too-large') {
        toast.error('Image is too large', {
          description: 'Please upload an image smaller than 10MB'
        });
      } else if (error?.code === 'file-invalid-type') {
        toast.error('Invalid file type', {
          description: 'Please upload a PNG, JPG, JPEG, or WebP image'
        });
      }
    }
  });

  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1024;
          const MAX_HEIGHT = 1024;
          
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            if (blob) {
              const compressed = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressed);
            } else {
              reject(new Error('Compression failed'));
            }
          }, 'image/jpeg', 0.85);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

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
      console.log('Original file size:', file.size);
      
      // Load image for browser-based processing
      setProgress(20);
      const imageElement = await loadImage(file);
      
      setProgress(30);
      console.log('Starting browser-based background removal (first time will download AI model ~50MB)...');
      
      // Remove background using Transformers.js in the browser
      const transparentBlob = await removeBackground(imageElement);
      
      setProgress(50);
      
      // Create local preview URL immediately so user can see the result
      const localPreviewUrl = URL.createObjectURL(transparentBlob);
      setBgRemovedPreview(localPreviewUrl);
      console.log('Background removed successfully, showing preview');
      
      // Convert blob to file
      const processedFile = new File(
        [transparentBlob], 
        file.name.replace(/\.[^.]+$/, '.png'),
        { type: 'image/png' }
      );

      console.log('Processed file size:', processedFile.size);
      setProgress(70);

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Upload to Supabase Storage
      const fileName = `${session.user.id}/${crypto.randomUUID()}.png`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('wardrobe-items')
        .upload(fileName, processedFile, {
          contentType: 'image/png',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      setProgress(85);

      // Get public URL and replace local preview
      const { data: { publicUrl } } = supabase.storage
        .from('wardrobe-items')
        .getPublicUrl(fileName);

      console.log('Image uploaded successfully:', publicUrl);
      
      // Clean up local preview URL and use storage URL
      URL.revokeObjectURL(localPreviewUrl);
      setBgRemovedPreview(publicUrl);
      
      setProgress(100);
      setCurrentStep('metadata');
      toast.success('Background removed successfully!');
    } catch (error: any) {
      console.error('Error processing image:', error);
      
      let errorMessage = 'Failed to process image. Please try again.';
      let errorDescription = '';
      
      if (error.message?.includes('WebGPU') || error.message?.includes('device')) {
        errorMessage = 'Browser compatibility issue';
        errorDescription = 'Please use Chrome, Edge, or another modern browser with WebGPU support.';
      } else if (error.message?.includes('Not authenticated')) {
        errorMessage = 'Authentication required';
        errorDescription = 'Please sign in to upload images.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage, {
        description: errorDescription || 'Try using a smaller image or a different browser if the issue persists.'
      });
      
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

    // Validate category matches DB enum
    const validCategories = ['top', 'bottom', 'dress', 'outerwear', 'shoes', 'bag', 'accessory'];
    if (!validCategories.includes(category)) {
      toast.error('Please select a valid category');
      return;
    }

    try {
      console.log('Saving item to database with URL:', bgRemovedPreview);
      
      const newItem = await addItem.mutateAsync({
        image_url: bgRemovedPreview,
        image_bg_removed_url: bgRemovedPreview,
        category: category as 'top' | 'bottom' | 'dress' | 'outerwear' | 'shoes' | 'bag' | 'accessory',
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
      
      if (newItem && onItemAdded) {
        onItemAdded(newItem.id);
      }

      // Refetch the limit to update the UI
      await refetchLimit();

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
      // Error toast is already handled by the mutation hook
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Clean up any object URLs to prevent memory leaks
      if (bgRemovedPreview && bgRemovedPreview.startsWith('blob:')) {
        URL.revokeObjectURL(bgRemovedPreview);
      }
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
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
            <div className="space-y-3">
              <div className="h-48 rounded-lg bg-muted/30 flex items-center justify-center"
                style={{
                  backgroundImage: bgRemovedPreview ? 'repeating-conic-gradient(hsl(var(--muted)) 0% 25%, transparent 0% 50%) 50% / 20px 20px' : 'none'
                }}
              >
                {bgRemovedPreview ? (
                  <img src={bgRemovedPreview} alt="Preview" className="max-h-full object-contain" />
                ) : (
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                )}
              </div>
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-xs text-center text-muted-foreground">
                  {progress < 30 ? 'Preparing image...' : progress < 70 ? 'Removing background with AI...' : 'Uploading...'}
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Metadata */}
          {currentStep === 'metadata' && (
            <>
              {bgRemovedPreview && (
                <div className="h-40 rounded-lg bg-muted/30 overflow-hidden flex items-center justify-center"
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

              <div className="space-y-2">
                <Label className="text-sm">Color</Label>
                <div className="relative flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => setColorCarouselIndex(Math.max(0, colorCarouselIndex - 1))}
                    disabled={colorCarouselIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <div className="flex gap-2 flex-1 justify-center">
                    {visibleColors.map((colorOption) => (
                      <button
                        key={colorOption.value}
                        type="button"
                        onClick={() => setColor(colorOption.value)}
                        className={cn(
                          "flex flex-col items-center gap-0.5 shrink-0 transition-all",
                          color === colorOption.value && "scale-105"
                        )}
                      >
                        <div
                          className={cn(
                            "w-9 h-9 rounded-full border-2 transition-all",
                            color === colorOption.value 
                              ? "border-primary ring-2 ring-primary/20" 
                              : "border-muted-foreground/30 hover:border-muted-foreground/50"
                          )}
                          style={{ 
                            backgroundColor: colorOption.hex,
                            boxShadow: colorOption.value === 'white' || colorOption.value === 'cream' 
                              ? 'inset 0 0 0 1px rgba(0,0,0,0.1)' 
                              : undefined 
                          }}
                        />
                        <span className="text-[10px] text-muted-foreground">
                          {colorOption.name}
                        </span>
                      </button>
                    ))}
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => setColorCarouselIndex(Math.min(totalPages - 1, colorCarouselIndex + 1))}
                    disabled={colorCarouselIndex === totalPages - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Brand (Optional)</Label>
                <Input
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="e.g., Nike, Zara"
                  maxLength={50}
                  className="h-9"
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label className="text-sm">Allow public reuse</Label>
                  <p className="text-[11px] text-muted-foreground">
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
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1 h-9" disabled={isProcessing || addItem.isPending}>
              Cancel
            </Button>
            {currentStep === 'metadata' && (
              <Button 
                onClick={handleSave} 
                className="flex-1 h-9" 
                disabled={!category || isProcessing || addItem.isPending}
              >
                {addItem.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save to Closet'
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
