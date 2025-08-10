
import { useState, useCallback } from 'react';
import { BitStudioClient } from '@/lib/bitstudio-client';
import { BitStudioImage, BitStudioError } from '@/lib/bitstudio-types';
import { useToast } from '@/hooks/use-toast';

export function useBitStudio() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleError = useCallback((error: BitStudioError | any) => {
    console.error('BitStudio error:', error);
    
    let message = 'An error occurred';
    let action: (() => void) | undefined;

    if (error.code === 'unauthorized') {
      message = 'Server key invalid or missing';
    } else if (error.code === 'RATE_LIMITED') {
      message = 'Rate limit exceeded. Please try again in a moment.';
    } else if (error.code === 'insufficient_credits' || error.code === 'no_active_subscription' || error.code === 'upgrade_required') {
      message = 'Insufficient credits or subscription required';
      action = () => window.open('/billing', '_blank'); // Assuming billing page exists
    } else if (error.code === 'bad_request' || error.code === 'invalid_aspect_ratio' || error.code === 'invalid_resolution') {
      message = 'Invalid parameters. Please check your inputs.';
    } else if (error.status >= 500) {
      message = 'Temporary server issue. Please retry.';
    } else {
      message = error.error || error.message || 'Unknown error occurred';
    }

    setError(message);
    toast({
      title: 'Error',
      description: message,
      variant: 'destructive',
    });

    return message;
  }, [toast]);

  const uploadImage = useCallback(async (file: File, type: string): Promise<BitStudioImage | null> => {
    try {
      setError(null);
      setLoading(true);
      const result = await BitStudioClient.uploadImage(file, type);
      toast({
        title: 'Success',
        description: 'Image uploaded successfully',
      });
      return result;
    } catch (error: any) {
      handleError(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [handleError, toast]);

  const virtualTryOn = useCallback(async (params: Parameters<typeof BitStudioClient.virtualTryOn>[0]): Promise<BitStudioImage | null> => {
    try {
      setError(null);
      setLoading(true);
      const results = await BitStudioClient.virtualTryOn(params);
      const jobId = results[0]?.id;
      
      if (!jobId) {
        throw { error: 'No job ID returned', code: 'INVALID_RESPONSE' };
      }

      const result = await BitStudioClient.pollUntilComplete(jobId);
      
      toast({
        title: 'Try-On Complete',
        description: result.credits_used ? `Used ${result.credits_used} credits` : 'Generation completed',
      });
      
      return result;
    } catch (error: any) {
      handleError(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [handleError, toast]);

  const generateImages = useCallback(async (params: Parameters<typeof BitStudioClient.generateImages>[0]): Promise<BitStudioImage | null> => {
    try {
      setError(null);
      setLoading(true);
      const results = await BitStudioClient.generateImages(params);
      const jobId = Array.isArray(results) ? results[0]?.id : results?.id;
      
      if (!jobId) {
        throw { error: 'No job ID returned', code: 'INVALID_RESPONSE' };
      }

      const result = await BitStudioClient.pollUntilComplete(jobId);
      
      toast({
        title: 'Generation Complete',
        description: result.credits_used ? `Used ${result.credits_used} credits` : 'Images generated successfully',
      });
      
      return result;
    } catch (error: any) {
      handleError(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [handleError, toast]);

  const upscaleImage = useCallback(async (id: string, params: Parameters<typeof BitStudioClient.upscaleImage>[1]): Promise<BitStudioImage | null> => {
    try {
      setError(null);
      setLoading(true);
      const result = await BitStudioClient.upscaleImage(id, params);
      const polledResult = await BitStudioClient.pollUntilComplete(result.id || id);
      
      toast({
        title: 'Upscale Complete',
        description: polledResult.credits_used ? `Used ${polledResult.credits_used} credits` : 'Image upscaled successfully',
      });
      
      return polledResult;
    } catch (error: any) {
      handleError(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [handleError, toast]);

  const inpaintImage = useCallback(async (id: string, params: Parameters<typeof BitStudioClient.inpaintImage>[1]): Promise<BitStudioImage | null> => {
    try {
      setError(null);
      setLoading(true);
      const result = await BitStudioClient.inpaintImage(id, params);
      const polledResult = await BitStudioClient.pollUntilComplete(result.id || id);
      
      toast({
        title: 'Inpainting Complete',
        description: polledResult.credits_used ? `Used ${polledResult.credits_used} credits` : 'Inpainting completed successfully',
      });
      
      return polledResult;
    } catch (error: any) {
      handleError(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [handleError, toast]);

  const generateVideo = useCallback(async (id: string, params: Parameters<typeof BitStudioClient.generateVideo>[1]): Promise<BitStudioImage | null> => {
    try {
      setError(null);
      setLoading(true);
      const result = await BitStudioClient.generateVideo(id, params);
      const polledResult = await BitStudioClient.pollUntilComplete(result.id || id, 600000); // 10 minutes for video
      
      toast({
        title: 'Video Generation Complete',
        description: 'Video generated successfully',
      });
      
      return polledResult;
    } catch (error: any) {
      handleError(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [handleError, toast]);

  return {
    loading,
    error,
    uploadImage,
    virtualTryOn,
    generateImages,
    upscaleImage,
    inpaintImage,
    generateVideo,
    clearError: () => setError(null),
  };
}
