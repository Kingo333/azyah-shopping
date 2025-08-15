
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Upload, X, Image } from 'lucide-react';

interface ToyReplicaUploaderProps {
  onFileUploaded: (fileName: string) => void;
  onUploadStart: () => void;
  disabled?: boolean;
}

export const ToyReplicaUploader: React.FC<ToyReplicaUploaderProps> = ({
  onFileUploaded,
  onUploadStart,
  disabled = false
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const maxSizeBytes = 10 * 1024 * 1024; // 10MB

  const validateFile = (file: File): boolean => {
    console.log('Validating file:', file.name, file.type, file.size);
    
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a JPG, JPEG, PNG, or WebP image.",
        variant: "destructive"
      });
      return false;
    }

    if (file.size > maxSizeBytes) {
      toast({
        title: "File Too Large",
        description: "Please upload an image smaller than 10MB.",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleFileSelect = (file: File) => {
    if (!validateFile(file)) return;

    setSelectedFile(file);
    
    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const uploadFile = async () => {
    if (!selectedFile || !user) {
      toast({
        title: "Upload Failed",
        description: "Please select a file and make sure you're logged in.",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    onUploadStart();

    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      console.log('Uploading file to:', fileName);
      console.log('File details:', {
        name: selectedFile.name,
        type: selectedFile.type,
        size: selectedFile.size
      });

      const { data, error } = await supabase.storage
        .from('toy-replica-source')
        .upload(fileName, selectedFile, {
          contentType: selectedFile.type,
          upsert: false
        });

      console.log('Upload result:', { data, error });

      if (error) {
        console.error('Upload error details:', error);
        throw error;
      }

      if (!data) {
        throw new Error('No data returned from upload');
      }

      onFileUploaded(fileName);
      
      toast({
        title: "Upload Successful",
        description: "Your photo has been uploaded successfully!",
      });

    } catch (error) {
      console.error('Upload failed:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Could not upload your photo. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled || uploading}
      />

      {!selectedFile ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
          onClick={triggerFileInput}
        >
          <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium mb-2">Upload your photo</p>
          <p className="text-sm text-muted-foreground mb-4">
            Drag and drop or click to browse
          </p>
          <p className="text-xs text-muted-foreground">
            Supports JPG, JPEG, PNG, WebP • Max 10MB
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative border rounded-lg p-4">
            <div className="flex items-start gap-4">
              {previewUrl && (
                <div className="flex-shrink-0">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-20 h-20 object-cover rounded"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
              {!uploading && (
                <Button
                  onClick={clearFile}
                  variant="ghost"
                  size="sm"
                  className="flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={uploadFile}
              disabled={uploading || disabled}
              className="flex-1"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Uploading photo...
                </>
              ) : (
                <>
                  <Image className="h-4 w-4 mr-2" />
                  Upload & Generate
                </>
              )}
            </Button>
            
            {!uploading && (
              <Button
                onClick={triggerFileInput}
                variant="outline"
              >
                Change
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
