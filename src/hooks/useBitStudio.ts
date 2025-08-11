import { useState, useCallback, createElement } from 'react';
import { BitStudioClient } from '@/lib/bitstudio-client';
import { BitStudioImage, BitStudioError } from '@/lib/bitstudio-types';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';

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

const asTryGen = (r?: AnyRes): TryGenRes => (r === 'high' ? 'high' : 'standard');

export function useBitStudio() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleError = useCallback((error: BitStudioError | any) => {
    console.error('BitStudio error:', error);
    
    let message = 'An error occurred';
    let action: (() => void) | undefined;

    const status = typeof error?.status === 'number' ? error.status : undefined;

    // Surface BitStudio's detailed error if available
    if (error.bitstudio_error) {
      console.error('BitStudio API details:', error.bitstudio_error);
      
      // Show the actual BitStudio error message if it's more specific
      if (error.bitstudio_error.error && error.bitstudio_error.error !== error.error) {
        message = `${error.error}: ${error.bitstudio_error.error}`;
      }
    }

    // Handle service unavailable errors
    if (error.code === 'service_unavailable' || status === 503) {
      message = 'BitStudio API is temporarily unavailable. Please try again in a few minutes.';
    } else if (error.code === 'MISSING_API_KEY') {
      message = 'BitStudio API key is not configured. Please check your settings.';
      action = () => window.open('https://docs.lovable.dev', '_blank');
    } else if (error.code === 'unauthorized' || error.code === 'invalid_token') {
      message = 'BitStudio API key is invalid or missing. Please check your configuration.';
      action = () => window.open('https://docs.lovable.dev', '_blank');
    } else if (error.code === 'RATE_LIMITED') {
      message = 'Rate limit exceeded. Please try again in a moment.';
    } else if (error.code === 'insufficient_credits' || error.code === 'no_active_subscription' || error.code === 'upgrade_required') {
      message = 'Insufficient credits or subscription required';
      action = () => window.open('/billing', '_blank');
    } else if (error.code === 'bad_request' || error.code === 'invalid_aspect_ratio' || error.code === 'invalid_resolution') {
      message = error.details || error.error || 'Invalid parameters. Please check your inputs.';
      // Include raw response for debugging pattern errors
      if (error.raw_response) {
        message += ` (Raw: ${error.raw_response.substring(0, 100)})`;
      }
    } else if (status && status >= 500) {
      message = 'Temporary server issue. Please retry.';
    } else if (error.code === 'INVALID_RESPONSE') {
      message = 'Invalid response from server. Please try again.';
    } else if (error.code === 'upload_error') {
      message = 'File upload failed. Please try again.';
    } else if (error.code === 'api_error') {
      message = error.details || 'BitStudio API error. Please try again later.';
    } else {
      message = error.error || error.message || 'Unknown error occurred';
    }

    setError(message);
    
    const actionElement = action ? createElement(ToastAction, {
      altText: "Learn more",
      onClick: action
    }, "Learn more") : undefined;

    toast({
      title: 'Error',
      description: message,
      variant: 'destructive',
      action: actionElement,
    });

    return message;
  }, [toast]);

  const healthCheck = useCallback(async (): Promise<boolean> => {
    try {
      const result = await BitStudioClient.healthCheck();
      console.log('Health check result:', result);
      if (!result.ok) {
        handleError({ 
          code: result.error?.includes('API key') ? 'MISSING_API_KEY' : 'HEALTH_CHECK_ERROR',
          error: result.error || 'Health check failed'
        });
        return false;
      }
      return true;
    } catch (error: any) {
      console.error('Health check error:', error);
      handleError(error);
      return false;
    }
  }, [handleError]);

  const validateFile = useCallback((file: File): boolean => {
    console.log('Validating file:', { name: file.name, size: file.size, type: file.type });
    
    // Check for HEIC files which aren't supported
    if (file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
      handleError({ 
        code: 'bad_request', 
        error: 'HEIC/HEIF files are not supported. Please convert to JPEG or PNG first.' 
      });
      return false;
    }

    if (file.size > 10 * 1024 * 1024) {
      handleError({ code: 'bad_request', error: 'File size exceeds 10MB limit' });
      return false;
    }
    
    if (!file.type.startsWith('image/')) {
      handleError({ code: 'bad_request', error: 'Only image files are allowed' });
      return false;
    }
    
    console.log('File validation passed');
    return true;
  }, [handleError]);

  const uploadImage = useCallback(async (file: File, type: string): Promise<BitStudioImage | null> => {
    if (!validateFile(file)) {
      return null;
    }

    try {
      setError(null);
      setLoading(true);
      
      console.log('Starting upload with type:', JSON.stringify(type));
      console.log('File details:', { name: file.name, size: file.size, type: file.type });
      
      const result = await BitStudioClient.uploadImage(file, type);
      
      console.log('Upload successful:', result);
      
      toast({
        title: 'Success',
        description: 'Image uploaded successfully',
      });
      return result;
    } catch (error: any) {
      console.error('Upload error details:', error);
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
      
      console.log('Starting virtual try-on with params:', params);
      
      // Ensure safe resolution mapping
      const safeRes = asTryGen(params.resolution as AnyRes);
      const mappedParams = {
        ...params,
        resolution: safeRes
      };
      
      console.log('Mapped params:', mappedParams);
      
      const results = await BitStudioClient.virtualTryOn(mappedParams);
      
      // Virtual Try-On returns an array, get the first result's ID
      const jobId = Array.isArray(results) && results.length > 0 ? results[0].id : null;
      
      console.log('VTO response job ID:', jobId);
      
      if (!jobId) {
        throw { error: 'No job ID returned from virtual try-on', code: 'INVALID_RESPONSE' };
      }

      console.log('Starting polling for job:', jobId);
      const result = await BitStudioClient.pollUntilComplete(jobId);
      
      console.log('Polling completed with result:', result);
      
      toast({
        title: 'Try-On Complete',
        description: result.credits_used ? `Used ${result.credits_used} credits` : 'Generation completed',
      });
      
      return result;
    } catch (error: any) {
      console.error('Virtual try-on error:', error);
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
    healthCheck,
    clearError: () => setError(null),
  };
}
