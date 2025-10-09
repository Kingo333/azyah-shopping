import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Loader2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { removeBackground } from '@/utils/backgroundRemoval';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAddWardrobeItem } from '@/hooks/useWardrobeItems';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

interface WardrobeUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WardrobeUploadModal: React.FC<WardrobeUploadModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const addItem = useAddWardrobeItem();
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [category, setCategory] = useState<string>('');
  const [color, setColor] = useState('');
  const [season, setSeason] = useState('');
  const [brand, setBrand] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (file) {
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
      }
    }
  });

  const handleUpload = async () => {
    if (!selectedFile || !category || !user) {
      toast.error('Please select an image and category');
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    try {
      // Remove background
      setProgress(10);
      const bgRemovedBlob = await removeBackground(selectedFile, setProgress);
      
      // Upload original image
      const originalFileName = `${user.id}/${Date.now()}_original.${selectedFile.name.split('.').pop()}`;
      const { data: originalData, error: originalError } = await supabase.storage
        .from('wardrobe')
        .upload(originalFileName, selectedFile);

      if (originalError) throw originalError;

      // Upload background-removed image
      const bgRemovedFileName = `${user.id}/${Date.now()}_nobg.png`;
      const { data: bgData, error: bgError } = await supabase.storage
        .from('wardrobe')
        .upload(bgRemovedFileName, bgRemovedBlob);

      if (bgError) throw bgError;

      // Get public URLs
      const { data: { publicUrl: originalUrl } } = supabase.storage
        .from('wardrobe')
        .getPublicUrl(originalFileName);

      const { data: { publicUrl: bgRemovedUrl } } = supabase.storage
        .from('wardrobe')
        .getPublicUrl(bgRemovedFileName);

      // Save to database
      await addItem.mutateAsync({
        image_url: originalUrl,
        image_bg_removed_url: bgRemovedUrl,
        category: category as any,
        color: color || null,
        season: season as any || null,
        brand: brand || null,
        is_favorite: false,
        tags: null,
        source: 'upload',
        public_reuse_permitted: false,
        attribution_user_id: null,
        thumb_path: null,
      });

      // Reset form
      setSelectedFile(null);
      setPreviewUrl(null);
      setCategory('');
      setColor('');
      setSeason('');
      setBrand('');
      setProgress(0);
      onClose();
    } catch (error) {
      console.error('Error uploading item:', error);
      toast.error('Failed to upload item');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add to Wardrobe</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Upload */}
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
                  {isDragActive ? 'Drop the image here' : 'Drag & drop or click to select'}
                </p>
              </div>
            )}
          </div>

          {/* Category Selection */}
          <div className="space-y-2">
            <Label>Category *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="top">Top</SelectItem>
                <SelectItem value="bottom">Bottom</SelectItem>
                <SelectItem value="shoes">Shoes</SelectItem>
                <SelectItem value="accessory">Accessory</SelectItem>
                <SelectItem value="jewelry">Jewelry</SelectItem>
                <SelectItem value="bag">Bag</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Optional Metadata */}
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
              <Label>Season</Label>
              <Select value={season} onValueChange={setSeason}>
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spring">Spring</SelectItem>
                  <SelectItem value="summer">Summer</SelectItem>
                  <SelectItem value="fall">Fall</SelectItem>
                  <SelectItem value="winter">Winter</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Brand</Label>
            <Input
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="Optional"
            />
          </div>

          {/* Progress */}
          {isProcessing && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-xs text-center text-muted-foreground">
                {progress < 50 ? 'Removing background...' : progress < 90 ? 'Processing...' : 'Uploading...'}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1" disabled={isProcessing}>
              Cancel
            </Button>
            <Button onClick={handleUpload} className="flex-1" disabled={!selectedFile || !category || isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Add to Wardrobe'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
