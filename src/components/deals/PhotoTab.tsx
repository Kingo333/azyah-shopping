import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Camera, Upload, Loader2, ImageIcon } from 'lucide-react';
import { useDealsFromImage } from '@/hooks/useDealsFromImage';
import { useDealsMatchCatalog } from '@/hooks/useDealsMatchCatalog';
import { PriceVerdict } from './PriceVerdict';
import { DealResultCard } from './DealResultCard';
import { ScanPanel } from './ScanPanel';
import { AzyahMatchesSection } from './AzyahMatchesSection';
import { ImageCropSelector } from './ImageCropSelector';
import { cropImage, CropRect } from '@/utils/imageCropUtils';
import { StoragePath } from '@/utils/objectDetection';
import { cn } from '@/lib/utils';

interface PhotoTabProps {
  onClose?: () => void;
}

type PhotoState = 'upload' | 'crop' | 'loading' | 'results';

export function PhotoTab({ onClose }: PhotoTabProps) {
  const { user } = useAuth();
  const [photoState, setPhotoState] = useState<PhotoState>('upload');
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  // NEW: Storage path for ML detection
  const [storagePath, setStoragePath] = useState<StoragePath | null>(null);
  
  const { searchFromImage, data, isLoading, error, reset } = useDealsFromImage();
  const { matchCatalog, data: catalogData, isLoading: catalogLoading, reset: resetCatalog } = useDealsMatchCatalog();

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Trigger catalog match when we get results
  useEffect(() => {
    if (data?.shopping_results?.length > 0) {
      const topResult = data.shopping_results[0];
      const avgPrice = data.price_stats.median ? data.price_stats.median * 100 : undefined;
      matchCatalog(topResult.title, undefined, avgPrice);
    }
  }, [data, matchCatalog]);

  // Handle file drop - upload FIRST for ML detection, then show crop selector
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file || !user) return;

    // Reset state
    setUploadError(null);
    reset();
    resetCatalog();
    setOriginalFile(file);
    setIsUploading(true);
    
    // Create preview URL for crop selector
    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);

    try {
      // Upload FULL image immediately for ML detection
      const fileName = `${user.id}/${Date.now()}_full.jpg`;
      
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('deals-uploads')
        .upload(fileName, file, {
          contentType: file.type || 'image/jpeg',
          cacheControl: '600',
          upsert: true,
        });

      if (uploadErr) {
        throw uploadErr;
      }

      // Store storage path for ML detection (bucket + path)
      setStoragePath({ bucket: 'deals-uploads', path: fileName });
      
      // Now show the crop selector (detection will use storage path)
      setPhotoState('crop');

      // Schedule cleanup after 15 min
      setTimeout(async () => {
        try {
          await supabase.storage.from('deals-uploads').remove([fileName]);
        } catch {
          // Ignore cleanup errors
        }
      }, 900000);
      
    } catch (err) {
      console.error('Upload error:', err);
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
      // Still show crop selector with fallback heuristic detection
      setPhotoState('crop');
    } finally {
      setIsUploading(false);
    }
  }, [user, reset, resetCatalog]);

  // Handle crop confirmation - upload cropped image and search
  const handleCropConfirm = useCallback(async (
    crops: { type: 'garment' | 'pattern' | 'full'; rect: CropRect }[]
  ) => {
    if (!originalFile || !user) return;

    setIsUploading(true);
    setPhotoState('loading');
    setUploadError(null);

    try {
      // Get the primary crop (garment)
      const primaryCrop = crops.find(c => c.type === 'garment') || crops[0];
      
      // Apply crop to the image
      const croppedBlob = await cropImage(originalFile, primaryCrop.rect);
      
      // Create unique filename
      const fileName = `${user.id}/${Date.now()}_crop.jpg`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('deals-uploads')
        .upload(fileName, croppedBlob, {
          contentType: 'image/jpeg',
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

      setUploadedImageUrl(signedData.signedUrl);

      // Start searching
      await searchFromImage(signedData.signedUrl);
      setPhotoState('results');

      // Schedule cleanup after 15 min
      setTimeout(async () => {
        try {
          await supabase.storage.from('deals-uploads').remove([fileName]);
        } catch {
          // Ignore cleanup errors
        }
      }, 900000);

    } catch (err) {
      console.error('Upload error:', err);
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
      setPhotoState('crop'); // Go back to crop on error
    } finally {
      setIsUploading(false);
    }
  }, [user, originalFile, searchFromImage]);

  // Handle cancel crop - go back to upload
  const handleCropCancel = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setOriginalFile(null);
    setStoragePath(null);
    setPhotoState('upload');
  }, [previewUrl]);

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
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setOriginalFile(null);
    setStoragePath(null);
    setUploadedImageUrl(null);
    setUploadError(null);
    setPhotoState('upload');
    reset();
    resetCatalog();
  };

  // Show upload UI
  if (photoState === 'upload') {
    return (
      <div className="space-y-4">
        <div
          {...getRootProps()}
          className={cn(
            "rounded-2xl p-8 text-center cursor-pointer transition-all duration-200",
            "border border-dashed border-white/40",
            "bg-white/30 dark:bg-white/5",
            "backdrop-blur-sm",
            isDragActive 
              ? "border-primary/50 bg-primary/10" 
              : "hover:border-primary/50 hover:bg-white/50",
            (isUploading) && "opacity-50 cursor-not-allowed"
          )}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-500/20 to-slate-600/20 flex items-center justify-center backdrop-blur-sm">
              {isUploading ? (
                <Loader2 className="h-7 w-7 text-muted-foreground animate-spin" />
              ) : (
                <Camera className="h-7 w-7 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="font-medium text-foreground">
                {isUploading ? 'Uploading...' : 'Upload a product photo'}
              </p>
              <p className="text-xs text-muted-foreground/80 mt-1">
                JPG, PNG or WebP up to 5MB
              </p>
            </div>
            {!isUploading && (
              <Button 
                variant="outline" 
                size="sm" 
                className="
                  mt-2 gap-2 rounded-xl
                  bg-white/50 dark:bg-white/10
                  border-white/30
                  hover:bg-white/70 dark:hover:bg-white/20
                "
              >
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

  // Show crop selector UI
  if (photoState === 'crop' && previewUrl) {
    return (
      <div className="space-y-4">
        <ImageCropSelector
          imageUrl={previewUrl}
          storagePath={storagePath || undefined}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
          isProcessing={isUploading}
        />
        
        {uploadError && (
          <p className="text-sm text-destructive text-center">{uploadError}</p>
        )}
      </div>
    );
  }

  // Show loading/results UI
  return (
    <div className="space-y-4">
      {/* Scan Panel */}
      <ScanPanel
        type="photo"
        thumbnail={uploadedImageUrl || previewUrl}
        isLoading={isLoading || photoState === 'loading'}
        dealsFound={data?.deals_found}
        onReset={!isLoading && photoState !== 'loading' ? handleReset : undefined}
      />

      {/* Loading skeleton */}
      {(isLoading || photoState === 'loading') && (
        <div className="space-y-3">
          <div className="h-20 bg-white/30 dark:bg-white/5 backdrop-blur-sm animate-pulse rounded-2xl" />
          <div className="h-24 bg-white/30 dark:bg-white/5 backdrop-blur-sm animate-pulse rounded-2xl" />
          <div className="h-24 bg-white/30 dark:bg-white/5 backdrop-blur-sm animate-pulse rounded-2xl" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-center py-6">
          <p className="text-sm text-destructive">{error}</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-3 rounded-xl bg-white/50 border-white/30" 
            onClick={handleReset}
          >
            Try again
          </Button>
        </div>
      )}

      {/* Results */}
      {data && !isLoading && photoState === 'results' && (
        <div className="space-y-4">
          {/* Price Verdict */}
          <PriceVerdict
            low={data.price_stats.low}
            median={data.price_stats.median}
            high={data.price_stats.high}
            validCount={data.price_stats.valid_count}
          />

          {/* Similar on Azyah */}
          <AzyahMatchesSection 
            matches={catalogData?.matches || []} 
            isLoading={catalogLoading}
          />

          {/* Disclaimer */}
          <p className="text-[10px] text-muted-foreground/70 text-center">
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
              <ImageIcon className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
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
