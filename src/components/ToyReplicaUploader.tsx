
import React, { useCallback, useState } from 'react';
import { Upload, X, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface ToyReplicaUploaderProps {
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  selectedFile: File | null;
  disabled?: boolean;
}

export const ToyReplicaUploader: React.FC<ToyReplicaUploaderProps> = ({
  onFileSelect,
  onFileRemove,
  selectedFile,
  disabled = false
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const { toast } = useToast();

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const validateFile = (file: File): boolean => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a .jpg, .jpeg, .png, or .webp file",
        variant: "destructive"
      });
      return false;
    }

    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    if (files.length > 1) {
      toast({
        title: "Too many files",
        description: "Please upload only one photo",
        variant: "destructive"
      });
      return;
    }

    const file = files[0];
    if (validateFile(file)) {
      onFileSelect(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (disabled) return;
    handleFiles(e.dataTransfer.files);
  }, [disabled]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (disabled) return;
    handleFiles(e.target.files);
  };

  const handleRemove = () => {
    onFileRemove();
    setPreview(null);
  };

  // If file is selected, show preview
  if (selectedFile && preview) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="relative">
          <img
            src={preview}
            alt="Selected photo"
            className="w-full h-64 object-cover rounded-lg border-2 border-border"
          />
          <Button
            onClick={handleRemove}
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2"
            disabled={disabled}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-2 text-center">
          <p className="text-sm text-muted-foreground">{selectedFile.name}</p>
          <p className="text-xs text-muted-foreground">
            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
          </p>
          <Button
            onClick={handleRemove}
            variant="outline"
            size="sm"
            className="mt-2"
            disabled={disabled}
          >
            Change Photo
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <form 
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive 
            ? 'border-primary bg-primary/10' 
            : 'border-border hover:border-primary/50'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleChange}
          accept=".jpg,.jpeg,.png,.webp"
          disabled={disabled}
        />
        
        <div className="space-y-4">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            {dragActive ? (
              <Upload className="h-6 w-6 text-primary" />
            ) : (
              <Image className="h-6 w-6 text-primary" />
            )}
          </div>
          
          <div>
            <p className="text-base font-medium">
              {dragActive ? 'Drop your photo here' : 'Upload your photo'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Click or drag & drop your photo here
            </p>
          </div>
          
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Supported: JPG, PNG, WebP</p>
            <p>Max size: 10MB</p>
            <p className="font-medium">Keep it family-friendly and your own photo.</p>
          </div>
        </div>
      </form>
    </div>
  );
};
