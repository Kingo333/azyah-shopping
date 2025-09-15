
import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { imageUrlFrom, extractSupabasePath } from '@/lib/imageUrl';
import { isSupabaseAbsoluteUrl } from '@/lib/urlGuards';

interface SizeChartUploadProps {
  currentSizeChart?: string | null;
  onSizeChartUpdate: (sizeChartUrl: string | null) => void;
  productId: string;
}

export const SizeChartUpload: React.FC<SizeChartUploadProps> = ({
  currentSizeChart,
  onSizeChartUpdate,
  productId
}) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentSizeChart);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadSizeChartToStorage = async (file: File): Promise<string> => {
    if (!user) throw new Error('User not authenticated');

    const fileName = `${user.id}/size-chart-${productId}-${Date.now()}-${file.name}`;
    
    const { data, error } = await supabase.storage
      .from('size-charts')
      .upload(fileName, file);

    if (error) throw error;

    // Store relative path format for mobile-friendly URLs
    return `size-charts/${fileName}`;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a JPG, PNG, or GIF image',
        variant: 'destructive'
      });
      return;
    }

    // Validate file size (max 8MB)
    if (file.size > 8 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 8MB',
        variant: 'destructive'
      });
      return;
    }

    setUploading(true);

    try {
      const sizeChartUrl = await uploadSizeChartToStorage(file);
      setPreviewUrl(sizeChartUrl);
      onSizeChartUpdate(sizeChartUrl);
      toast({
        title: 'Size chart uploaded',
        description: 'Size chart has been successfully uploaded'
      });
    } catch (error) {
      console.error('Error uploading size chart:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload size chart. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
      // Reset the input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    onSizeChartUpdate(null);
    toast({
      title: 'Size chart removed',
      description: 'Size chart has been removed'
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <ImageIcon className="h-4 w-4 text-primary" />
        <Label className="text-sm font-medium">Size Chart</Label>
      </div>
      
      {previewUrl ? (
        <div className="border rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Chart uploaded</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRemove}
              className="text-destructive hover:text-destructive h-6 px-2 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Remove
            </Button>
          </div>
          <img 
            src={(() => {
              if (!previewUrl) return '';
              if (isSupabaseAbsoluteUrl(previewUrl)) {
                const pathData = extractSupabasePath(previewUrl);
                return pathData ? imageUrlFrom(pathData.bucket, pathData.path) : previewUrl;
              }
              return previewUrl.includes('/') ? imageUrlFrom(previewUrl.split('/')[0], previewUrl.split('/').slice(1).join('/')) : previewUrl;
            })()} 
            alt="Size chart preview" 
            className="w-full h-20 object-cover rounded border"
          />
        </div>
      ) : (
        <div className="border rounded-lg p-3 space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/gif"
            onChange={handleFileUpload}
            className="hidden"
            id="size-chart-upload"
          />
          <label 
            htmlFor="size-chart-upload" 
            className="flex flex-col items-center justify-center h-20 border-2 border-dashed border-muted-foreground/25 rounded cursor-pointer hover:border-muted-foreground/50 transition-colors"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground mt-1">Uploading...</span>
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground mt-1">Upload chart</span>
              </>
            )}
          </label>
          <p className="text-xs text-muted-foreground text-center">
            Size guide image (JPG, PNG, GIF up to 8MB)
          </p>
        </div>
      )}
    </div>
  );
};
