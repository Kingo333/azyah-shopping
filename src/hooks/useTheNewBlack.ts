import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PictureResult {
  ok: boolean;
  result_url?: string;
  stored?: boolean;
  credits_remaining?: number;
  error?: string;
}

interface VideoStartResult {
  ok: boolean;
  job_id?: string;
  status?: string;
  message?: string;
  credits_remaining?: number;
  is_premium?: boolean;
  error?: string;
}

interface VideoCheckResult {
  ok: boolean;
  status?: 'processing' | 'completed';
  result_url?: string;
  stored?: boolean;
  message?: string;
  error?: string;
  step?: string;
  debug?: Record<string, unknown>;
}

// Free picture generation for video flow (no credit deduction)
interface FreePictureResult {
  ok: boolean;
  result_url?: string;
  stored?: boolean;
  error?: string;
}

export function useTheNewBlack() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [videoPolling, setVideoPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Upload image to Supabase storage and get public URL
  const uploadImage = useCallback(async (file: File, type: 'person' | 'outfit'): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      const fileName = `${user.id}/${type}_${Date.now()}.${file.name.split('.').pop()}`;
      
      const { error: uploadError } = await supabase.storage
        .from('ai-tryon-uploads')
        .upload(fileName, file, {
          contentType: file.type,
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrl } = supabase.storage
        .from('ai-tryon-uploads')
        .getPublicUrl(fileName);

      return publicUrl.publicUrl;
    } catch (err) {
      console.error('[useTheNewBlack] Upload error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      
      // Show toast on upload failure
      toast({
        title: 'Upload failed',
        description: errorMessage.includes('Bucket not found') 
          ? 'Storage not configured. Please contact support.'
          : 'Could not upload image. Please try again.',
        variant: 'destructive'
      });
      
      return null;
    }
  }, [toast]);

  // Generate picture try-on
  const generatePicture = useCallback(async (
    modelPhotoUrl: string,
    clothingPhotoUrl: string
  ): Promise<PictureResult> => {
    setLoading(true);
    setError(null);

    try {
      console.log('[useTheNewBlack] Generating picture try-on...');

      const { data, error: invokeError } = await supabase.functions.invoke('thenewblack-picture', {
        body: {
          model_photo_url: modelPhotoUrl,
          clothing_photo_url: clothingPhotoUrl
        }
      });

      if (invokeError) {
        throw invokeError;
      }

      if (!data.ok) {
        if (data.error?.includes('No picture credits')) {
          toast({
            title: 'No credits remaining',
            description: 'Upgrade to premium for more daily credits!',
            variant: 'destructive'
          });
        }
        throw new Error(data.error || 'Generation failed');
      }

      console.log('[useTheNewBlack] Picture generated:', data.result_url);

      toast({
        title: 'Try-on complete!',
        description: 'Your virtual try-on has been generated.',
      });

      return data as PictureResult;
    } catch (err) {
      console.error('[useTheNewBlack] Picture generation error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Generation failed';
      setError(errorMessage);
      toast({
        title: 'Generation failed',
        description: errorMessage,
        variant: 'destructive'
      });
      return { ok: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Helper: Get user-friendly error message based on step
  const getVideoErrorMessage = (data: any): { title: string; description: string } => {
    const step = data.step || 'unknown';
    const baseError = data.error || 'Video generation failed';
    
    switch (step) {
      case 'image_url_check':
        return {
          title: 'Image not accessible',
          description: 'The image URL could not be verified. Please re-upload the image or try a different one.'
        };
      case 'provider_start':
        if (baseError.includes('empty response')) {
          return {
            title: 'Provider issue',
            description: 'Video provider returned an empty response. Try a different image or try again later.'
          };
        }
        return {
          title: 'Video start failed',
          description: `Provider error: ${baseError.substring(0, 100)}`
        };
      case 'provider_poll':
        return {
          title: 'Video check failed',
          description: 'Could not check video status. The video may still be processing - try again in a minute.'
        };
      case 'credits':
        return {
          title: 'No video credits',
          description: data.is_premium 
            ? 'You have used all your daily video credits. Try again tomorrow!'
            : 'Sign up for premium to get 4 video credits daily!'
        };
      case 'auth':
        return {
          title: 'Authentication required',
          description: 'Please sign out and back in, then try again.'
        };
      default:
        return {
          title: 'Video generation failed',
          description: baseError
        };
    }
  };

  // Start video generation
  const startVideoGeneration = useCallback(async (imageUrl: string): Promise<VideoStartResult> => {
    setLoading(true);
    setError(null);

    try {
      console.log('[useTheNewBlack] Starting video generation...');

      const { data, error: invokeError } = await supabase.functions.invoke('thenewblack-video', {
        body: {
          action: 'start',
          image_url: imageUrl
        }
      });

      // Handle invoke error (network/auth issues)
      if (invokeError) {
        console.error('[useTheNewBlack] Invoke error:', invokeError);
        throw new Error(invokeError.message || 'Failed to call video function');
      }

      // Handle structured error response (now always returns 200)
      if (!data.ok) {
        console.log('[useTheNewBlack] Video start failed:', data);
        const { title, description } = getVideoErrorMessage(data);
        
        toast({
          title,
          description,
          variant: 'destructive'
        });
        
        // Log debug info if available
        if (data.debug) {
          console.log('[useTheNewBlack] Debug info:', data.debug);
        }
        
        return { ok: false, error: data.error || description };
      }

      console.log('[useTheNewBlack] Video generation started, job ID:', data.job_id);

      toast({
        title: 'Video generation started',
        description: 'Your video will be ready in 1-2 minutes.',
      });

      return data as VideoStartResult;
    } catch (err) {
      console.error('[useTheNewBlack] Video start error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Video generation failed';
      setError(errorMessage);
      
      toast({
        title: 'Video generation failed',
        description: errorMessage.includes('non-2xx') 
          ? 'Server error. Please try again.'
          : errorMessage,
        variant: 'destructive'
      });
      return { ok: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Check video status
  const checkVideoStatus = useCallback(async (jobId: string): Promise<VideoCheckResult> => {
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('thenewblack-video', {
        body: {
          action: 'check',
          job_id: jobId
        }
      });

      if (invokeError) {
        throw invokeError;
      }

      return data as VideoCheckResult;
    } catch (err) {
      console.error('[useTheNewBlack] Video check error:', err);
      return { ok: false, error: err instanceof Error ? err.message : 'Check failed' };
    }
  }, []);

  // Poll for video completion with initial delay
  const pollVideoUntilComplete = useCallback(async (
    jobId: string,
    onComplete: (result: VideoCheckResult) => void,
    onProgress?: (status: string) => void,
    maxAttempts = 60 // 5 minutes with 5 second intervals
  ) => {
    setVideoPolling(true);
    let attempts = 0;
    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 3;

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setVideoPolling(false);
        toast({
          title: 'Video generation timeout',
          description: 'The video is taking longer than expected. Please try again.',
          variant: 'destructive'
        });
        return;
      }

      attempts++;
      const minutesElapsed = Math.floor((attempts * 5) / 60);
      const secondsElapsed = (attempts * 5) % 60;
      onProgress?.(`Processing... ${minutesElapsed}:${secondsElapsed.toString().padStart(2, '0')} (typically 1-2 min)`);

      const result = await checkVideoStatus(jobId);

      // Handle structured errors - only fail on permanent errors
      if (!result.ok) {
        consecutiveErrors++;
        console.log('[useTheNewBlack] Poll error:', result, `(${consecutiveErrors}/${maxConsecutiveErrors})`);
        
        // Check if it's a permanent error (workflow not found, etc.)
        if (result.error?.includes('workflow not found') || result.step === 'validation') {
          setVideoPolling(false);
          toast({
            title: 'Video generation failed',
            description: result.error || 'Please try generating again.',
            variant: 'destructive'
          });
          return;
        }
        
        // For transient errors, only fail after multiple consecutive errors
        if (consecutiveErrors >= maxConsecutiveErrors) {
          setVideoPolling(false);
          toast({
            title: 'Error checking video status',
            description: 'Multiple errors occurred. Please try again.',
            variant: 'destructive'
          });
          return;
        }
        
        // Continue polling despite error
        setTimeout(poll, 5000);
        return;
      }

      // Reset error count on success
      consecutiveErrors = 0;

      if (result.status === 'completed') {
        setVideoPolling(false);
        toast({
          title: 'Video ready!',
          description: 'Your fashion video has been generated.',
        });
        onComplete(result);
        return;
      }

      // Still processing, poll again in 5 seconds
      setTimeout(poll, 5000);
    };

    // Initial delay before first poll (15 seconds) - video takes 1-2 min
    onProgress?.('Starting video generation... (typically 1-2 min)');
    setTimeout(poll, 15000);
  }, [checkVideoStatus, toast]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Generate picture for video flow - FREE (no credit deduction)
  const generatePictureFree = useCallback(async (
    modelPhotoUrl: string,
    clothingPhotoUrl: string
  ): Promise<FreePictureResult> => {
    setLoading(true);
    setError(null);

    try {
      console.log('[useTheNewBlack] Generating picture for video (free)...');

      const { data, error: invokeError } = await supabase.functions.invoke('thenewblack-picture-free', {
        body: {
          model_photo_url: modelPhotoUrl,
          clothing_photo_url: clothingPhotoUrl
        }
      });

      if (invokeError) {
        throw invokeError;
      }

      if (!data.ok) {
        throw new Error(data.error || 'Generation failed');
      }

      console.log('[useTheNewBlack] Free picture generated:', data.result_url);

      return data as FreePictureResult;
    } catch (err) {
      console.error('[useTheNewBlack] Free picture generation error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Generation failed';
      setError(errorMessage);
      toast({
        title: 'Generation failed',
        description: errorMessage,
        variant: 'destructive'
      });
      return { ok: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return {
    loading,
    videoPolling,
    error,
    uploadImage,
    generatePicture,
    generatePictureFree,
    startVideoGeneration,
    checkVideoStatus,
    pollVideoUntilComplete,
    clearError
  };
}
