import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Camera, Upload, X, Loader2, Plus } from 'lucide-react';
import { motion } from 'framer-motion';

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImageUpload = (files: FileList | null) => {
    if (!files) return;
    
    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (imageFiles.length + selectedImages.length > 4) {
      toast({
        title: "Too many images",
        description: "You can upload up to 4 images per post",
        variant: "destructive"
      });
      return;
    }
    
    setSelectedImages(prev => [...prev, ...imageFiles]);
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && selectedImages.length === 0) {
      toast({
        title: "Empty post",
        description: "Please add some content or images",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // Create post
      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: userId,
          content: content.trim()
        })
        .select()
        .single();

      if (postError) throw postError;

      // Upload images if any
      if (selectedImages.length > 0) {
        const imageUploadPromises = selectedImages.map(async (file, index) => {
          const fileName = `${post.id}-${index}-${Date.now()}`;
          const { data, error } = await supabase.storage
            .from('post-images')
            .upload(fileName, file);

          if (error) throw error;

          // Create post_image record
          const { data: publicUrl } = supabase.storage
            .from('post-images')
            .getPublicUrl(fileName);

          return supabase.from('post_images').insert({
            post_id: post.id,
            image_url: publicUrl.publicUrl,
            sort_order: index
          });
        });

        await Promise.all(imageUploadPromises);
      }

      toast({
        title: "Post created!",
        description: "Your style inspiration has been shared",
        duration: 3000
      });

      // Reset form
      setContent('');
      setSelectedImages([]);
      onPostCreated();
      onClose();

    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        title: "Failed to create post",
        description: "Please try again later",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Share Your Style Inspiration</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Content Input */}
          <div>
            <Textarea
              placeholder="What's inspiring your style today? Share your fashion thoughts, outfit details, or styling tips..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[120px] resize-none"
              maxLength={500}
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-muted-foreground">
                {content.length}/500 characters
              </span>
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={selectedImages.length >= 4}
              >
                <Upload className="h-4 w-4 mr-2" />
                Add Photos
              </Button>
              <span className="text-xs text-muted-foreground">
                {selectedImages.length}/4 images
              </span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleImageUpload(e.target.files)}
              className="hidden"
            />

            {/* Image Preview Grid */}
            {selectedImages.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {selectedImages.map((file, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative aspect-square bg-muted rounded-lg overflow-hidden"
                  >
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Upload ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      className="absolute top-1 right-1 h-6 w-6 p-0"
                      onClick={() => removeImage(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || (!content.trim() && selectedImages.length === 0)}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Posting...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Share Post
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};