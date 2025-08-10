
import { useState, useCallback } from 'react';
import { BitStudioClient } from '@/lib/bitstudio-client';
import { BitStudioImage, BitStudioError } from '@/lib/bitstudio-types';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { createElement } from 'react';

// Use the existing types from bitstudio-types instead of duplicating
type BitImage = BitStudioImage & {
  video_path?: string;
  credits_used?: number;
};

// Some endpoints (virtual-try-on) return an array; others return an object
type BitCreateResponse = BitImage | BitImage[];

function getFirstId(resp: BitCreateResponse): string | undefined {
  return Array.isArray(resp) ? resp[0]?.id : resp?.id;
}

// Resolution type guards and mappers
type AnyRes = 'low' | 'standard' | 'high';
type TryGenRes = 'standard' | 'high';
type EditRes = 'standard' | 'low';

const asTryGen = (r?: AnyRes): TryGenRes => (r === 'high' ? 'high' : 'standard');
const asEdit = (r?: AnyRes): EditRes => (r === 'low' ? 'low' : 'standard');

export function useBitStudio() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleError = useCallback((error: BitStudioError | any) => {
    console.error('BitStudio error:', error);
    
    let message = 'An error occurred';
    let action: (() => void) | undefined;

    const status = typeof error?.status === 'number' ? error.status : undefined;

    if (error.code === 'unauthorized') {
      message = 'Server key invalid or missing';
    } else if (error.code === 'RATE_LIMITED') {
      message = 'Rate limit exceeded. Please try again in a moment.';
    } else if (error.code === 'insufficient_credits' || error.code === 'no_active_subscription' || error.code === 'upgrade_required') {
      message = 'Insufficient credits or subscription required';
      action = () => window.open('/billing', '_blank');
    } else if (error.code === 'bad_request' || error.code === 'invalid_aspect_ratio' || error.code === 'invalid_resolution') {
      message = 'Invalid parameters. Please check your inputs.';
    } else if (status && status >= 500) {
      message = 'Temporary server issue. Please retry.';
    } else if (error.code === 'INVALID_RESPONSE') {
      message = 'Invalid response from server. Please try again.';
    } else {
      message = error.error || error.message || 'Unknown error occurred';
    }

    setError(message);
    
    const actionElement = action 
      ? createElement(ToastAction, { altText: "Open billing", onClick: action }, "Open billing")
      : undefined;

    toast({
      title: 'Error',
      description: message,
      variant: 'destructive',
      action: actionElement,
    });

    return message;
  }, [toast]);

  const validateFile = useCallback((file: File): boolean => {
    if (file.size > 10 * 1024 * 1024) {
      handleError({ code: 'bad_request', error: 'File size exceeds 10MB limit' });
      return false;
    }
    
    if (!file.type.startsWith('image/')) {
      handleError({ code: 'bad_request', error: 'Only image files are allowed' });
      return false;
    }
    
    return true;
  }, [handleError]);

  const uploadImage = useCallback(async (file: File, type: string): Promise<BitStudioImage | null> => {
    if (!validateFile(file)) {
      return null;
    }

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
  }, [handleError, toast, validateFile]);

  const virtualTryOn = useCallback(async (params: Parameters<typeof BitStudioClient.virtualTryOn>[0]): Promise<BitStudioImage | null> => {
    try {
      setError(null);
      setLoading(true);
      
      // Ensure safe resolution mapping
      const safeRes = asTryGen(params.resolution as AnyRes);
      const mappedParams = {
        ...params,
        resolution: safeRes
      };
      
      const results = await BitStudioClient.virtualTryOn(mappedParams);
      
      // Handle array response - get first item's ID using safe extraction
      const data = results as BitCreateResponse;
      const jobId = getFirstId(data);
      
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
      
      // Ensure safe resolution mapping
      const safeRes = asTryGen(params.resolution as AnyRes);
      const mappedParams = {
        ...params,
        resolution: safeRes
      };
      
      const results = await BitStudioClient.generateImages(mappedParams);
      
      // Handle both array and single object responses using safe extraction
      const data = results as BitCreateResponse;
      const jobId = getFirstId(data);
      
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

  const editImage = useCallback(async (id: string, params: Parameters<typeof BitStudioClient.editImage>[1]): Promise<BitStudioImage | null> => {
    try {
      setError(null);
      setLoading(true);
      
      // Ensure safe resolution mapping for edit (never 'high')
      const safeEditRes = asEdit(params.resolution as AnyRes);
      const mappedParams = {
        ...params,
        resolution: safeEditRes
      };
      
      const result = await BitStudioClient.editImage(id, mappedParams);
      const polledResult = await BitStudioClient.pollUntilComplete(result.id || id);
      
      toast({
        title: 'Edit Complete',
        description: polledResult.credits_used ? `Used ${polledResult.credits_used} credits` : 'Image edited successfully',
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
    editImage,
    generateVideo,
    clearError: () => setError(null),
  };
}
