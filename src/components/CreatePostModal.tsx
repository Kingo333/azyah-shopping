
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Camera, X, Upload } from 'lucide-react';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: () => void;
  userId: string;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  isOpen,
  onClose,
  onPostCreated,
  userId
}) => {
  const [content, setContent] = useState('');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    // Validate file types and sizes
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast({
          description: `${file.name} is not a valid image file`,
          variant: 'destructive'
        });
        return false;
      }
      
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          description: `${file.name} is too large (max 10MB)`,
          variant: 'destructive'
        });
        return false;
      }
      
      return true;
    });

    setSelectedImages(prev => [...prev, ...validFiles].slice(0, 4)); // Max 4 images
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `post-images/${fileName}`;

      console.log('Uploading image:', fileName);

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      console.log('Image uploaded successfully:', publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!content.trim() && selectedImages.length === 0) {
      toast({
        description: 'Please add some content or an image',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);

    try {
      // Upload images first
      console.log('Starting to upload', selectedImages.length, 'images');
      const imageUploadPromises = selectedImages.map(uploadImage);
      const uploadedImageUrls = await Promise.all(imageUploadPromises);
      
      // Filter out failed uploads
      const successfulUploads = uploadedImageUrls.filter(url => url !== null) as string[];
      
      console.log('Successfully uploaded', successfulUploads.length, 'images');

      // If we had images but none uploaded successfully, show error
      if (selectedImages.length > 0 && successfulUploads.length === 0) {
        toast({
          description: 'Failed to upload images. Please try again.',
          variant: 'destructive'
        });
        setIsLoading(false);
        return;
      }

      // Create the post
      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({
          content: content.trim() || null,
          user_id: userId
        })
        .select()
        .single();

      if (postError) {
        console.error('Error creating post:', postError);
        throw postError;
      }

      console.log('Post created:', post);

      // Add images to post_images table
      if (successfulUploads.length > 0) {
        const imageData = successfulUploads.map((url, index) => ({
          post_id: post.id,
          image_url: url,
          sort_order: index
        }));

        const { error: imageError } = await supabase
          .from('post_images')
          .insert(imageData);

        if (imageError) {
          console.error('Error saving post images:', imageError);
          // Don't throw here - post was created successfully
          toast({
            description: 'Post created but some images failed to save',
            variant: 'destructive'
          });
        } else {
          console.log('Images saved successfully');
        }
      }

      toast({
        description: 'Post created successfully!'
      });

      // Reset form
      setContent('');
      setSelectedImages([]);
      onClose();
      onPostCreated();

    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        description: 'Failed to create post. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setContent('');
      setSelectedImages([]);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Post</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Textarea
            placeholder="Share your style inspiration..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[100px] resize-none"
            disabled={isLoading}
          />

          {/* Image Upload */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('image-upload')?.click()}
                disabled={isLoading || selectedImages.length >= 4}
              >
                <Camera className="h-4 w-4 mr-2" />
                Add Images ({selectedImages.length}/4)
              </Button>
              <Input
                id="image-upload"
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
                disabled={isLoading}
              />
            </div>

            {/* Image Previews */}
            {selectedImages.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {selectedImages.map((file, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeImage(index)}
                      disabled={isLoading}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading || (!content.trim() && selectedImages.length === 0)}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Posting...
                </div>
              ) : (
                'Post'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
