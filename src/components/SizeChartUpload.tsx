
import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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

    const { data: publicUrl } = supabase.storage
      .from('size-charts')
      .getPublicUrl(fileName);

    return publicUrl.publicUrl;
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Size Chart
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {previewUrl ? (
          <div className="relative">
            <img
              src={previewUrl}
              alt="Size chart"
              className="w-full max-h-64 object-contain rounded-lg border"
            />
            <Button
              variant="destructive"
              size="sm"
              className="absolute top-2 right-2"
              onClick={handleRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            {uploading ? (
              <>
                <Loader2 className="mx-auto h-12 w-12 text-gray-400 mb-4 animate-spin" />
                <div className="text-sm text-gray-600 mb-4">
                  Uploading size chart...
                </div>
              </>
            ) : (
              <>
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <div className="text-sm text-gray-600 mb-4">
                  Upload a size chart image to help customers choose the right size
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button 
                  variant="outline" 
                  disabled={uploading} 
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose Image
                </Button>
                <div className="text-xs text-gray-500 mt-2">
                  Supports JPG, PNG, GIF up to 8MB
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
