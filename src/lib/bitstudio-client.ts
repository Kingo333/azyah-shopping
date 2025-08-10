
import type { BitStudioImage, BitStudioError, AspectRatio, Resolution, Style, UpscaleFactor } from './bitstudio-types';
import { supabase } from '@/integrations/supabase/client';

export class BitStudioClient {
  private static async makeSupabaseRequest(functionName: string, body?: any) {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: JSON.stringify(body),
    });

    if (error) {
      console.error(`Supabase function error (${functionName}):`, error);
      throw { error: error.message, code: 'SUPABASE_ERROR' } as BitStudioError;
    }

    return data;
  }

  static async uploadImage(file: File, type: string): Promise<BitStudioImage> {
    try {
      // Get the session token for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw { error: 'Authentication required', code: 'UNAUTHORIZED' } as BitStudioError;
      }

      // Use direct fetch to preserve error details from FormData uploads
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const response = await fetch(`${window.location.origin}/functions/v1/bitstudio-upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          error: `HTTP ${response.status}`, 
          code: 'FETCH_ERROR' 
        }));
        console.error('Upload fetch error:', response.status, errorData);
        throw errorData as BitStudioError;
      }

      return await response.json() as BitStudioImage;
    } catch (error: any) {
      console.error('Upload error:', error);
      throw error;
    }
  }

  static async getImage(id: string): Promise<BitStudioImage> {
    // Use POST with JSON body instead of URL parameter
    return this.makeSupabaseRequest('bitstudio-status', { id });
  }

  static async virtualTryOn(params: {
    person_image_id?: string;
    person_image_url?: string;
    outfit_image_id?: string;
    outfit_image_url?: string;
    prompt?: string;
    resolution?: Resolution;
    num_images?: number;
    seed?: number;
  }): Promise<BitStudioImage[]> {
    // The edge function returns an object: { job_id, provider_job_id, result }
    // Normalize to always return the underlying array as the hook expects.
    const resp = await this.makeSupabaseRequest('bitstudio-tryon', params);
    if (Array.isArray(resp)) {
      return resp as BitStudioImage[];
    }
    if (resp && Array.isArray(resp.result)) {
      return resp.result as BitStudioImage[];
    }
    console.error('Unexpected try-on response shape:', resp);
    throw { error: 'Invalid response from try-on', code: 'INVALID_RESPONSE' } as BitStudioError;
  }

  static async pollUntilComplete(id: string, maxWaitMs = 180000): Promise<BitStudioImage> {
    const startTime = Date.now();
    let delay = 2000; // Start with 2 seconds
    let retryCount = 0;
    let rateLimitRetries = 0;
    const maxRateLimitRetries = 3;
    
    console.log(`Starting polling for image ${id}`);
    
    while (Date.now() - startTime < maxWaitMs) {
      try {
        const result = await this.getImage(id);
        
        console.log(`Poll ${retryCount + 1}: Status = ${result.status}`);
        
        if (result.status === 'completed') {
          console.log('Image generation completed successfully');
          return result;
        }
        
        if (result.status === 'failed') {
          throw { error: result.error || 'Generation failed', code: 'GENERATION_FAILED' };
        }
        
        // Reset rate limit retries on successful request
        rateLimitRetries = 0;
        
        // Exponential backoff with jitter
        await new Promise(resolve => setTimeout(resolve, delay + Math.random() * 1000));
        delay = Math.min(delay * 1.2, 6000); // Max 6 seconds
        retryCount++;
        
      } catch (error: any) {
        console.error(`Poll ${retryCount + 1} error:`, error);
        
        // Handle rate limiting with exponential backoff
        if ((error.code === 'RATE_LIMITED' || (error.status === 429)) && rateLimitRetries < maxRateLimitRetries) {
          const backoffDelay = Math.min(1000 * Math.pow(2, rateLimitRetries), 10000);
          console.log(`Rate limited, waiting ${backoffDelay}ms before retry`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
          rateLimitRetries++;
          continue;
        }
        
        // If we've exceeded rate limit retries or it's a different error, throw
        throw error;
      }
    }
    
    throw { error: 'Timeout waiting for result', code: 'TIMEOUT' };
  }
}
