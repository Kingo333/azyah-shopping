
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, Image, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface AiTryOnUploaderProps {
  onUploadComplete: (imageId: string) => void;
}

export const AiTryOnUploader: React.FC<AiTryOnUploaderProps> = ({ onUploadComplete }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      toast({
        description: "Please upload an image file",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 6 * 1024 * 1024) { // 6MB limit
      toast({
        description: "Image size should be less than 6MB",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    
    try {
      // Create preview
      const preview = URL.createObjectURL(file);
      setPreviewUrl(preview);

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `tryon/users/${user.id}/inputs/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('tryon')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      onUploadComplete(filePath);
      
      toast({
        description: "Photo uploaded successfully!",
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        description: "Failed to upload photo. Please try again.",
        variant: "destructive"
      });
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <h3 className="font-semibold text-lg">AI Try-On</h3>
        <p className="text-sm text-muted-foreground">
          Upload a full-body photo to see how this item looks on you
        </p>
      </div>

      <Card className="border-dashed border-2 border-muted-foreground/25 bg-muted/10">
        <CardContent className="p-6">
          {previewUrl ? (
            <div className="space-y-4">
              <div className="aspect-[3/4] max-w-48 mx-auto rounded-lg overflow-hidden">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
              <Button 
                onClick={handleUploadClick} 
                variant="outline" 
                size="sm"
                disabled={isUploading}
              >
                Choose Different Photo
              </Button>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto">
                <Image className="h-8 w-8 text-white" />
              </div>
              
              <div className="space-y-2">
                <p className="font-medium">Upload Your Photo</p>
                <p className="text-sm text-muted-foreground">
                  Stand straight with arms slightly away from your body
                </p>
              </div>

              <Button 
                onClick={handleUploadClick} 
                disabled={isUploading}
                className="gap-2"
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {isUploading ? 'Uploading...' : 'Choose Photo'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="bg-muted/50 p-3 rounded-lg">
        <div className="flex items-start gap-2 text-sm">
          <AlertCircle className="h-4 w-4 mt-0.5 text-blue-500 flex-shrink-0" />
          <div className="space-y-1 text-muted-foreground">
            <p>• Use a clear, full-body photo</p>
            <p>• Face the camera directly</p>
            <p>• Ensure good lighting</p>
            <p>• Only one person in the photo</p>
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};
