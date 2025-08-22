
import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ToyReplicaUploaderProps {
  onImageSelect?: (imageUrl: string) => void;
  onFileUploaded?: (toyReplicaId: string, fileName: string, previewUrl: string) => void;
  onUploadStart?: () => void;
  onUploadError?: (error: string) => void;
  disabled?: boolean;
}

export const ToyReplicaUploader: React.FC<ToyReplicaUploaderProps> = ({
  onImageSelect,
  onFileUploaded,
  onUploadStart,
  onUploadError,
  disabled = false
}) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!user) {
      const errorMsg = "Please log in to upload images";
      onUploadError?.(errorMsg);
      toast({
        title: "Authentication Required",
        description: errorMsg,
        variant: "destructive"
      });
      return;
    }

    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file
    if (file.size > 10 * 1024 * 1024) { // 10MB
      const errorMsg = "File size must be less than 10MB";
      onUploadError?.(errorMsg);
      toast({
        title: "File Too Large",
        description: errorMsg,
        variant: "destructive"
      });
      return;
    }

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      const errorMsg = "Please upload a JPEG, PNG, or WebP image";
      onUploadError?.(errorMsg);
      toast({
        title: "Invalid File Type",
        description: errorMsg,
        variant: "destructive"
      });
      return;
    }

    try {
      setUploading(true);
      onUploadStart?.();

      // Create preview
      const previewUrl = URL.createObjectURL(file);
      setPreview(previewUrl);
      
      // Call onImageSelect for simple use cases
      onImageSelect?.(previewUrl);

      // For full upload functionality (if onFileUploaded is provided)
      if (onFileUploaded) {
        // Create toy replica record first
        const { data: toyReplica, error: createError } = await supabase
          .from('toy_replicas')
          .insert({
            user_id: user.id,
            status: 'queued'
          })
          .select()
          .single();

        if (createError || !toyReplica) {
          throw new Error(`Failed to create toy replica record: ${createError?.message}`);
        }

        // Upload to storage
        const fileExtension = file.name.split('.').pop() || 'jpg';
        const fileName = `${user.id}/${toyReplica.id}.${fileExtension}`;
        
        const { error: uploadError } = await supabase.storage
          .from('toy-replica-source')
          .upload(fileName, file, {
            contentType: file.type,
            upsert: true
          });

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        // Update toy replica with source URL
        const { error: updateError } = await supabase
          .from('toy_replicas')
          .update({ source_url: fileName })
          .eq('id', toyReplica.id);

        if (updateError) {
          throw new Error(`Failed to update toy replica: ${updateError.message}`);
        }

        onFileUploaded(toyReplica.id, fileName, previewUrl);
      }

    } catch (error) {
      console.error('Upload error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Upload failed';
      onUploadError?.(errorMsg);
      toast({
        title: "Upload Failed",
        description: errorMsg,
        variant: "destructive"
      });
      setPreview(null);
    } finally {
      setUploading(false);
    }
  }, [user, onImageSelect, onFileUploaded, onUploadStart, onUploadError, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp']
    },
    maxFiles: 1,
    disabled: disabled || uploading
  });

  const clearFile = () => {
    setPreview(null);
    if (preview) {
      URL.revokeObjectURL(preview);
    }
  };

  return (
    <div className="space-y-4">
      {!preview ? (
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
            ${disabled || uploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary hover:bg-primary/5'}
          `}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-4">
            <Upload className="h-12 w-12 text-muted-foreground" />
            <div>
              <p className="text-lg font-medium">
                {isDragActive ? 'Drop your photo here' : 'Upload your photo'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Drag & drop or click to select • JPEG, PNG, WebP • Max 10MB
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative">
            <img 
              src={preview} 
              alt="Preview" 
              className="w-full h-64 object-cover rounded-lg border"
            />
            <Button
              onClick={clearFile}
              variant="destructive"
              size="sm"
              className="absolute top-2 right-2"
              disabled={disabled || uploading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Image className="h-4 w-4" />
            <span>Ready to generate toy replica</span>
          </div>
        </div>
      )}
    </div>
  );
};
