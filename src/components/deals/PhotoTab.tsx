import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Camera, Upload, Loader2, ImageIcon, Sparkles } from 'lucide-react';
import { useDealsFromImage } from '@/hooks/useDealsFromImage';
import { PriceVerdict } from './PriceVerdict';
import { DealResultCard } from './DealResultCard';
import { cn } from '@/lib/utils';

interface PhotoTabProps {
  onClose?: () => void;
}

export function PhotoTab({ onClose }: PhotoTabProps) {
  const { user } = useAuth();
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const { searchFromImage, data, isLoading, error, reset } = useDealsFromImage();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file || !user) return;

    setIsUploading(true);
    setUploadError(null);
    reset();

    try {
      // Create unique filename with short expiry path
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('deals-uploads')
        .upload(fileName, file, {
          cacheControl: '600', // 10 minutes
          upsert: true,
        });

      if (uploadErr) {
        throw uploadErr;
      }

      // Get signed URL (15 minutes expiry for privacy)
      const { data: signedData, error: signedErr } = await supabase.storage
        .from('deals-uploads')
        .createSignedUrl(fileName, 900); // 15 minutes

      if (signedErr || !signedData?.signedUrl) {
        throw new Error('Failed to create signed URL');
      }

      setUploadedImage(signedData.signedUrl);

      // Start searching
      await searchFromImage(signedData.signedUrl);

      // Schedule cleanup (delete after search completes)
      setTimeout(async () => {
        try {
          await supabase.storage.from('deals-uploads').remove([fileName]);
        } catch {
          // Ignore cleanup errors
        }
      }, 60000); // 1 minute after upload

    } catch (err) {
      console.error('Upload error:', err);
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }, [user, searchFromImage, reset]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    maxFiles: 1,
    disabled: isUploading || isLoading,
  });

  const handleReset = () => {
    setUploadedImage(null);
    setUploadError(null);
    reset();
  };

  // Show upload UI if no image yet
  if (!uploadedImage && !isLoading) {
    return (
      <div className="space-y-4">
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
            isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
            (isUploading) && "opacity-50 cursor-not-allowed"
          )}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
              {isUploading ? (
                <Loader2 className="h-7 w-7 text-amber-500 animate-spin" />
              ) : (
                <Camera className="h-7 w-7 text-amber-500" />
              )}
            </div>
            <div>
              <p className="font-medium text-foreground">
                {isUploading ? 'Uploading...' : 'Upload a product photo'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                JPG, PNG or WebP up to 5MB
              </p>
            </div>
            {!isUploading && (
              <Button variant="outline" size="sm" className="mt-2 gap-2">
                <Upload className="h-4 w-4" />
                Choose Image
              </Button>
            )}
          </div>
        </div>

        {uploadError && (
          <p className="text-sm text-destructive text-center">{uploadError}</p>
        )}
      </div>
    );
  }

  // Show loading/results UI
  return (
    <div className="space-y-4">
      {/* Input preview */}
      {uploadedImage && (
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <div className="w-16 h-16 rounded-lg overflow-hidden bg-background flex-shrink-0">
            <img 
              src={uploadedImage} 
              alt="Uploaded" 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
                <span className="text-sm font-medium">Scanning the web...</span>
              </div>
            ) : data ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-green-600">
                  {data.deals_found}+ deals found
                </span>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">Image uploaded</span>
            )}
          </div>
          {!isLoading && (
            <Button variant="ghost" size="sm" onClick={handleReset}>
              Try another
            </Button>
          )}
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-3">
          <div className="h-16 bg-muted animate-pulse rounded-lg" />
          <div className="h-24 bg-muted animate-pulse rounded-lg" />
          <div className="h-24 bg-muted animate-pulse rounded-lg" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-center py-6">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={handleReset}>
            Try again
          </Button>
        </div>
      )}

      {/* Results */}
      {data && !isLoading && (
        <div className="space-y-4">
          {/* Price Verdict */}
          <PriceVerdict
            low={data.price_stats.low}
            median={data.price_stats.median}
            high={data.price_stats.high}
            validCount={data.price_stats.valid_count}
          />

          {/* Disclaimer */}
          <p className="text-[10px] text-muted-foreground text-center">
            Results pulled from public web listings. Prices may change.
          </p>

          {/* Results list */}
          <div className="space-y-2">
            {data.shopping_results.slice(0, 15).map((result, index) => (
              <DealResultCard
                key={`${result.link}-${index}`}
                result={result}
                isBestDeal={index === 0 && result.extracted_price !== null}
              />
            ))}
          </div>

          {data.shopping_results.length === 0 && (
            <div className="text-center py-6">
              <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No deals found for this image
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PhotoTab;
