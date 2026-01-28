import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDropzone } from 'react-dropzone';
import { useSubmitDeliverable, useUploadScreenshot } from '@/hooks/useDeliverables';
import { Collaboration, PLATFORM_OPTIONS, validatePostUrl } from '@/types/ugc';
import { Upload, X, ExternalLink, Image, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SubmitDeliverableModalProps {
  collaboration: Collaboration;
  applicationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SubmitDeliverableModal: React.FC<SubmitDeliverableModalProps> = ({
  collaboration,
  applicationId,
  open,
  onOpenChange
}) => {
  const [platform, setPlatform] = useState<string>('');
  const [postUrl, setPostUrl] = useState('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);

  const submitDeliverable = useSubmitDeliverable();
  const uploadScreenshot = useUploadScreenshot();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setScreenshotFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  const handleUrlChange = (value: string) => {
    setPostUrl(value);
    if (platform && value) {
      if (!validatePostUrl(platform, value)) {
        setUrlError(`Please enter a valid ${PLATFORM_OPTIONS.find(p => p.value === platform)?.label} URL`);
      } else {
        setUrlError(null);
      }
    } else {
      setUrlError(null);
    }
  };

  const handlePlatformChange = (value: string) => {
    setPlatform(value);
    if (postUrl && value) {
      if (!validatePostUrl(value, postUrl)) {
        setUrlError(`Please enter a valid ${PLATFORM_OPTIONS.find(p => p.value === value)?.label} URL`);
      } else {
        setUrlError(null);
      }
    }
  };

  const clearScreenshot = () => {
    setScreenshotFile(null);
    setScreenshotPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!platform || !postUrl || !screenshotFile) return;
    if (urlError) return;

    try {
      // Upload screenshot first
      const screenshotPath = await uploadScreenshot.mutateAsync({
        file: screenshotFile,
        collabId: collaboration.id
      });

      // Submit deliverable via RPC
      await submitDeliverable.mutateAsync({
        applicationId,
        collabId: collaboration.id,
        platform,
        postUrl,
        screenshotPath
      });

      // Reset and close
      setPlatform('');
      setPostUrl('');
      clearScreenshot();
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation hooks
    }
  };

  const isSubmitting = uploadScreenshot.isPending || submitDeliverable.isPending;
  const canSubmit = platform && postUrl && screenshotFile && !urlError && !isSubmitting;

  // Filter platforms to only show those in the campaign
  const availablePlatforms = PLATFORM_OPTIONS.filter(p => 
    collaboration.platforms.includes(p.value)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-cormorant">Submit Your Post</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Platform Selection */}
          <div className="space-y-2">
            <Label>Platform</Label>
            <Select value={platform} onValueChange={handlePlatformChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                {availablePlatforms.map(p => (
                  <SelectItem key={p.value} value={p.value}>
                    <span className="flex items-center gap-2">
                      <span>{p.icon}</span>
                      {p.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Post URL */}
          <div className="space-y-2">
            <Label htmlFor="postUrl">Post URL</Label>
            <div className="relative">
              <Input
                id="postUrl"
                type="url"
                placeholder="https://..."
                value={postUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                className={urlError ? 'border-destructive pr-10' : 'pr-10'}
              />
              {postUrl && !urlError && (
                <a
                  href={postUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
            {urlError && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{urlError}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Screenshot Upload */}
          <div className="space-y-2">
            <Label>Screenshot (required)</Label>
            {screenshotPreview ? (
              <div className="relative rounded-lg border overflow-hidden">
                <img 
                  src={screenshotPreview} 
                  alt="Screenshot preview" 
                  className="w-full h-48 object-cover"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={clearScreenshot}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
                }`}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center gap-2">
                  <div className="p-3 bg-muted rounded-full">
                    <Image className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {isDragActive ? 'Drop the screenshot here' : 'Drag & drop a screenshot, or click to select'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG up to 10MB
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Info */}
          <Alert>
            <AlertDescription className="text-sm">
              Upload a screenshot of your published post. The brand will review your submission 
              and approve it for payout.
            </AlertDescription>
          </Alert>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!canSubmit}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Upload className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Post'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
