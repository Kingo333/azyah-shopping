
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

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
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentSizeChart);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file',
        variant: 'destructive'
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 5MB',
        variant: 'destructive'
      });
      return;
    }

    setUploading(true);

    try {
      // Convert to base64 for storage
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64String = e.target?.result as string;
        setPreviewUrl(base64String);
        onSizeChartUpdate(base64String);
        toast({
          title: 'Size chart uploaded',
          description: 'Size chart has been successfully uploaded'
        });
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading size chart:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload size chart. Please try again.',
        variant: 'destructive'
      });
      setUploading(false);
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
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <div className="text-sm text-gray-600 mb-4">
              Upload a size chart image to help customers choose the right size
            </div>
            <Label htmlFor="size-chart-upload">
              <Button variant="outline" disabled={uploading} className="cursor-pointer">
                {uploading ? 'Uploading...' : 'Choose Image'}
              </Button>
            </Label>
            <Input
              id="size-chart-upload"
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className="text-xs text-gray-500 mt-2">
              Supports JPG, PNG, GIF up to 5MB
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
