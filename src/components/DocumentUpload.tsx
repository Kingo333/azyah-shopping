import React, { useState, useCallback } from 'react';
import { Upload, FileText, Image, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface UploadedFile {
  file: File;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
}

export const DocumentUpload: React.FC = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = async (uploadedFile: UploadedFile, index: number) => {
    const updateFile = (updates: Partial<UploadedFile>) => {
      setFiles(prev => prev.map((f, i) => i === index ? { ...f, ...updates } : f));
    };

    updateFile({ status: 'processing', progress: 0 });

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        updateFile({ progress: Math.min(uploadedFile.progress + 10, 90) });
      }, 200);

      const formData = new FormData();
      formData.append('files', uploadedFile.file);

      const endpoint = uploadedFile.file.type.toLowerCase().includes('image') 
        ? 'beauty-ingest-products' 
        : 'beauty-ingest-docs';

      const { data, error } = await supabase.functions.invoke(endpoint, {
        body: formData
      });

      clearInterval(progressInterval);

      if (error) throw error;

      updateFile({ 
        status: 'completed', 
        progress: 100 
      });

      toast.success(`${uploadedFile.file.name} processed successfully`);
    } catch (error) {
      updateFile({ 
        status: 'error', 
        progress: 0, 
        error: error instanceof Error ? error.message : 'Processing failed' 
      });
      toast.error(`Failed to process ${uploadedFile.file.name}`);
    }
  };

  const handleFiles = useCallback(async (fileList: FileList) => {
    const newFiles = Array.from(fileList).map(file => ({
      file,
      status: 'pending' as const,
      progress: 0
    }));

    setFiles(prev => [...prev, ...newFiles]);

    // Process each file
    for (let i = 0; i < newFiles.length; i++) {
      const fileIndex = files.length + i;
      await processFile(newFiles[i], fileIndex);
    }
  }, [files.length]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (file: File) => {
    if (file.type.includes('image')) return <Image className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <Check className="h-4 w-4 text-green-500" />;
      case 'error': return <X className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
        <div className="space-y-2">
          <p className="text-sm font-medium">Upload beauty knowledge</p>
          <p className="text-xs text-muted-foreground">
            Drop PDF guides, shade charts, or product images here
          </p>
          <p className="text-xs text-muted-foreground">
            Supports: .pdf, .jpg, .jpeg, .png, .webp, .csv, .json
          </p>
        </div>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => document.getElementById('file-input')?.click()}
        >
          Choose Files
        </Button>
        <input
          id="file-input"
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.webp,.csv,.json"
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Processing Files</h4>
          {files.map((uploadedFile, index) => (
            <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
              {getFileIcon(uploadedFile.file)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {uploadedFile.file.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {(uploadedFile.file.size / 1024 / 1024).toFixed(1)} MB
                </p>
                {uploadedFile.status === 'processing' && (
                  <Progress value={uploadedFile.progress} className="mt-1" />
                )}
                {uploadedFile.error && (
                  <p className="text-xs text-red-500 mt-1">{uploadedFile.error}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(uploadedFile.status)}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(index)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};