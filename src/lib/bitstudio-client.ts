
import type { BitStudioImage, BitStudioError, AspectRatio, Resolution, Style, UpscaleFactor } from './bitstudio-types';
import { supabase } from '@/integrations/supabase/client';

export class BitStudioClient {
  private static async makeSupabaseRequest(functionName: string, body?: any) {
    console.log(`[BitStudioClient] Calling ${functionName} with body:`, body);
    
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: JSON.stringify(body),
    });

    if (error) {
      console.error(`[BitStudioClient] Supabase function error (${functionName}):`, error);
      throw { error: error.message, code: 'SUPABASE_ERROR' } as BitStudioError;
    }

    console.log(`[BitStudioClient] ${functionName} response:`, data);
    return data;
  }

  static async healthCheck(): Promise<{ ok: boolean; base?: string; error?: string }> {
    try {
      console.log('[BitStudioClient] Performing health check');
      return await this.makeSupabaseRequest('bitstudio-health');
    } catch (error: any) {
      console.error('[BitStudioClient] Health check error:', error);
      return { 
        ok: false, 
        error: error.error || error.message || 'Health check failed' 
      };
    }
  }

  static async uploadImage(file: File, type: string): Promise<BitStudioImage> {
    try {
      console.log('[BitStudioClient] Starting upload:', { fileName: file.name, type });
      
      // Get the session token for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw { error: 'Authentication required', code: 'UNAUTHORIZED' } as BitStudioError;
      }

      // Use the full Supabase Functions URL for better reliability
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      console.log('[BitStudioClient] FormData prepared:', { 
        file: `${file.name} (${file.size} bytes)`, 
        type: JSON.stringify(type)
      });

      const uploadUrl = `https://klwolsopucgswhtdlsps.supabase.co/functions/v1/bitstudio-upload`;
      console.log('[BitStudioClient] Upload URL:', uploadUrl);

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          // Don't set Content-Type - let FormData set the boundary
        },
        body: formData,
      });

      console.log('[BitStudioClient] Upload response status:', response.status);
      console.log('[BitStudioClient] Upload response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        let errorData;
        try {
          const responseText = await response.text();
          console.log('[BitStudioClient] Upload error response text:', responseText);
          errorData = JSON.parse(responseText);
        } catch {
          errorData = { 
            error: `HTTP ${response.status}`, 
            code: 'FETCH_ERROR' 
          };
        }
        console.error('[BitStudioClient] Upload fetch error:', response.status, errorData);
        throw errorData as BitStudioError;
      }

      const result = await response.json() as BitStudioImage;
      console.log('[BitStudioClient] Upload successful:', result);
      return result;
    } catch (error: any) {
      console.error('[BitStudioClient] Upload error:', error);
      throw error;
    }
  }

  static async getImage(id: string): Promise<BitStudioImage> {
    console.log('[BitStudioClient] Getting image status for ID:', id);
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
    console.log('[BitStudioClient] Starting virtual try-on with params:', params);
    
    // The edge function returns an object: { job_id, provider_job_id, result }
    // Normalize to always return the underlying array as the hook expects.
    const resp = await this.makeSupabaseRequest('bitstudio-tryon', params);
    console.log('[BitStudioClient] VTO response:', resp);
    
    if (Array.isArray(resp)) {
      return resp as BitStudioImage[];
    }
    if (resp && Array.isArray(resp.result)) {
      return resp.result as BitStudioImage[];
    }
    console.error('[BitStudioClient] Unexpected try-on response shape:', resp);
    throw { error: 'Invalid response from try-on', code: 'INVALID_RESPONSE' } as BitStudioError;
  }

  static async pollUntilComplete(id: string, maxWaitMs = 180000): Promise<BitStudioImage> {
    const startTime = Date.now();
    let delay = 2000; // Start with 2 seconds
    let retryCount = 0;
    let rateLimitRetries = 0;
    const maxRateLimitRetries = 3;
    
    console.log(`[BitStudioClient] Starting polling for image ${id}`);
    
    while (Date.now() - startTime < maxWaitMs) {
      try {
        const result = await this.getImage(id);
        
        console.log(`[BitStudioClient] Poll ${retryCount + 1}: Status = ${result.status}`);
        
        if (result.status === 'completed') {
          console.log('[BitStudioClient] Image generation completed successfully');
          return result;
        }
        
        if (result.status === 'failed') {
          const errorMsg = result.error || 'Generation failed';
          console.error('[BitStudioClient] Generation failed:', errorMsg);
          throw { error: errorMsg, code: 'GENERATION_FAILED' };
        }
        
        // Reset rate limit retries on successful request
        rateLimitRetries = 0;
        
        // Exponential backoff with jitter
        await new Promise(resolve => setTimeout(resolve, delay + Math.random() * 1000));
        delay = Math.min(delay * 1.2, 6000); // Max 6 seconds
        retryCount++;
        
      } catch (error: any) {
        console.error(`[BitStudioClient] Poll ${retryCount + 1} error:`, error);
        
        // Handle rate limiting with exponential backoff
        if ((error.code === 'RATE_LIMITED' || (error.status === 429)) && rateLimitRetries < maxRateLimitRetries) {
          const backoffDelay = Math.min(1000 * Math.pow(2, rateLimitRetries), 10000);
          console.log(`[BitStudioClient] Rate limited, waiting ${backoffDelay}ms before retry`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
          rateLimitRetries++;
          continue;
        }
        
        // If we've exceeded rate limit retries or it's a different error, throw
        throw error;
      }
    }
    
    console.error('[BitStudioClient] Polling timeout after', maxWaitMs, 'ms');
    throw { error: 'Timeout waiting for result', code: 'TIMEOUT' };
  }
}
