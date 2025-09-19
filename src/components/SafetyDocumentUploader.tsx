import React, { useState, useCallback } from 'react';
import { Upload, X, FileText, Loader2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SafetyDocumentUploaderProps {
  onFileUploaded: (file: { url: string; name: string; type: string }) => void;
}

export function SafetyDocumentUploader({ onFileUploaded }: SafetyDocumentUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.includes('pdf') && !file.type.includes('document')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF or document file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Create unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('safety-documents')
        .upload(fileName, file);

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('safety-documents')
        .getPublicUrl(data.path);

      // Notify parent component
      onFileUploaded({
        url: urlData.publicUrl,
        name: file.name,
        type: file.type,
      });

      toast({
        title: "File uploaded successfully",
        description: `${file.name} has been uploaded to your safety documents.`,
      });

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "There was an error uploading your file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }, [user, onFileUploaded, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxFiles: 1,
  });

  return (
    <Card className="border-dashed border-2 border-red-200/60 bg-red-50/20 hover:border-red-300/60 transition-colors">
      <CardContent className="p-6">
        <div
          {...getRootProps()}
          className={`cursor-pointer text-center space-y-4 ${
            isDragActive ? 'opacity-60' : ''
          }`}
        >
          <input {...getInputProps()} />
          
          <div className="flex justify-center">
            {uploading ? (
              <Loader2 className="w-12 h-12 text-red-600 animate-spin" />
            ) : (
              <Upload className="w-12 h-12 text-red-600" />
            )}
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">
              Upload Safety Document
            </h3>
            <p className="text-sm text-muted-foreground">
              {isDragActive
                ? "Drop your file here..."
                : "Drag & drop a PDF or document file here, or click to browse"}
            </p>
            <p className="text-xs text-muted-foreground">
              Supported formats: PDF, DOC, DOCX (max 10MB)
            </p>
          </div>
          
          {!uploading && (
            <Button variant="outline" className="border-red-600/30 text-red-600 hover:bg-red-50">
              Choose File
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}