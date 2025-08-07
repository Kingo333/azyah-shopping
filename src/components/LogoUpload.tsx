
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, X } from 'lucide-react';

interface LogoUploadProps {
  currentLogoUrl?: string | null;
  onLogoUpdate: (logoUrl: string | null) => void;
  entityType: 'brand' | 'retailer';
  entityId: string;
}

export const LogoUpload: React.FC<LogoUploadProps> = ({
  currentLogoUrl,
  onLogoUpdate,
  entityType,
  entityId
}) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentLogoUrl);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ title: "Error", description: "Please select an image file", variant: "destructive" });
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Error", description: "Image must be less than 5MB", variant: "destructive" });
      return;
    }

    setUploading(true);

    try {
      // For now, create a preview URL (in production, you'd upload to Supabase Storage)
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      // Update the database with the new logo URL
      const tableName = entityType === 'brand' ? 'brands' : 'retailers';
      const { error } = await supabase
        .from(tableName)
        .update({ logo_url: objectUrl })
        .eq('id', entityId);

      if (error) throw error;

      onLogoUpdate(objectUrl);
      toast({ title: "Success", description: "Logo updated successfully!" });
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to upload logo", 
        variant: "destructive" 
      });
    } finally {
      setUploading(false);
    }
  };

  const removeLogo = async () => {
    try {
      const tableName = entityType === 'brand' ? 'brands' : 'retailers';
      const { error } = await supabase
        .from(tableName)
        .update({ logo_url: null })
        .eq('id', entityId);

      if (error) throw error;

      setPreviewUrl(null);
      onLogoUpdate(null);
      toast({ title: "Success", description: "Logo removed successfully!" });
    } catch (error: any) {
      console.error('Error removing logo:', error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to remove logo", 
        variant: "destructive" 
      });
    }
  };

  return (
    <div className="space-y-4">
      <Label>Logo</Label>
      
      {previewUrl ? (
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden">
            <img 
              src={previewUrl} 
              alt="Logo preview" 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex space-x-2">
            <label htmlFor="logo-upload" className="cursor-pointer">
              <Button variant="outline" size="sm" disabled={uploading}>
                <Upload className="h-4 w-4 mr-2" />
                Change Logo
              </Button>
              <input
                id="logo-upload"
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            <Button variant="outline" size="sm" onClick={removeLogo}>
              <X className="h-4 w-4 mr-2" />
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <input
            id="logo-upload"
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <label
            htmlFor="logo-upload"
            className="flex items-center justify-center w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
          >
            <div className="text-center">
              <Upload className="mx-auto h-8 w-8 text-gray-400" />
              <p className="text-xs text-gray-500 mt-1">Upload Logo</p>
            </div>
          </label>
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Supported formats: JPG, PNG, SVG (max 5MB)
      </p>
    </div>
  );
};
