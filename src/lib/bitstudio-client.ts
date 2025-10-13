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
      console.log('[BitStudioClient] Starting upload:', { fileName: file.name, type, fileSize: file.size });
      
      // Use supabase.functions.invoke for upload with FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      console.log('[BitStudioClient] Calling bitstudio-upload function via Supabase');

      const { data, error } = await supabase.functions.invoke('bitstudio-upload', {
        body: formData,
      });

      if (error) {
        console.error('[BitStudioClient] Supabase function error:', error);
        throw { error: error.message, code: 'SUPABASE_ERROR' } as BitStudioError;
      }

      console.log('[BitStudioClient] Upload successful:', data);
      return data as BitStudioImage;
    } catch (error: any) {
      console.error('[BitStudioClient] Upload error:', error);
      throw error;
    }
  }

  static async getImage(id: string): Promise<BitStudioImage> {
    console.log('[BitStudioClient] Getting image status for ID:', id);
    
    // Use supabase.functions.invoke for status check with ID in URL
    // Since Supabase function invoke doesn't support URL params, we need to use fetch
    // but use the correct Supabase URL format
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw { error: 'Authentication required', code: 'UNAUTHORIZED' } as BitStudioError;
    }

    const statusUrl = `https://klwolsopucgswhtdlsps.supabase.co/functions/v1/bitstudio-status/${id}`;
    console.log('[BitStudioClient] Status URL:', statusUrl);

    const response = await fetch(statusUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      let errorData;
      try {
        const responseText = await response.text();
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { 
          error: `HTTP ${response.status}`, 
          code: 'FETCH_ERROR' 
        };
      }
      console.error('[BitStudioClient] Status check error:', response.status, errorData);
      throw errorData as BitStudioError;
    }

    const result = await response.json() as BitStudioImage;
    console.log('[BitStudioClient] Status check result:', result);
    return result;
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
    try {
      console.log('[BitStudioClient] Starting virtual try-on with params:', params);
      
      const resp = await this.makeSupabaseRequest('bitstudio-tryon', params);
      console.log('[BitStudioClient] VTO response:', resp);
      
      // Validate response structure
      if (!resp) {
        throw { error: 'Empty response from BitStudio API', code: 'EMPTY_RESPONSE' };
      }
      
      // Handle error responses from edge function
      if (resp.error) {
        throw { 
          error: resp.error, 
          code: resp.code || 'BITSTUDIO_ERROR',
          details: resp.details
        };
      }
      
      if (Array.isArray(resp)) {
        if (resp.length === 0) {
          throw { error: 'BitStudio returned empty results array', code: 'EMPTY_ARRAY' };
        }
        return resp as BitStudioImage[];
      }
      
      if (resp && Array.isArray(resp.result)) {
        if (resp.result.length === 0) {
          throw { error: 'BitStudio returned empty results array', code: 'EMPTY_ARRAY' };
        }
        return resp.result as BitStudioImage[];
      }
      
      // Log the unexpected structure
      console.error('[BitStudioClient] Unexpected try-on response shape:', JSON.stringify(resp, null, 2));
      throw { error: 'Invalid response structure from BitStudio', code: 'INVALID_RESPONSE', raw_response: resp };
      
    } catch (error: any) {
      console.error('[BitStudioClient] virtualTryOn error:', error);
      
      // Check for specific BitStudio error codes
      if (error.code === 'RATE_LIMITED') {
        throw { error: 'Rate limit exceeded. Please wait a moment and try again.', code: 'RATE_LIMITED' };
      }
      if (error.code === 'insufficient_credits') {
        throw { error: 'Insufficient credits. Please add credits to your BitStudio account.', code: 'insufficient_credits' };
      }
      if (error.code === 'upgrade_required') {
        throw { error: 'This feature requires a higher plan tier.', code: 'upgrade_required' };
      }
      
      // Re-throw with full context
      throw error;
    }
  }

  static async pollUntilComplete(id: string, maxWaitMs = 180000): Promise<BitStudioImage> {
    const startTime = Date.now();
    let attempts = 0;
    const maxAttempts = Math.ceil(maxWaitMs / 2000);
    
    console.log(`[BitStudioClient] Starting polling for image ${id} (max ${maxWaitMs}ms)`);
    
    while (attempts < maxAttempts) {
      try {
        const result = await this.getImage(id);
        
        console.log(`[BitStudioClient] Poll ${attempts + 1}: Status = ${result.status}`);
        
        // Check for completion
        if (result.status === 'completed') {
          console.log('[BitStudioClient] Image generation completed successfully');
          return result;
        }
        
        // Check for failure  
        if (result.status === 'failed') {
          const errorMsg = result.error || 'Generation failed';
          console.error('[BitStudioClient] Generation failed:', errorMsg);
          throw { error: errorMsg, code: 'GENERATION_FAILED' } as BitStudioError;
        }
        
        // Check timeout
        if (Date.now() - startTime >= maxWaitMs) {
          throw { error: 'Timeout: Image generation took too long (max 3 minutes)', code: 'TIMEOUT' } as BitStudioError;
        }
        
        // Exponential backoff with jitter (2s, 3s, 4.5s, 6.75s, max 10s)
        const baseDelay = Math.min(2000 * Math.pow(1.5, attempts), 10000);
        const jitter = Math.random() * 500;
        const delay = baseDelay + jitter;
        
        await new Promise(resolve => setTimeout(resolve, delay));
        attempts++;
        
      } catch (error: any) {
        console.error(`[BitStudioClient] Poll ${attempts + 1} error:`, error);
        
        // Handle rate limiting with exponential backoff
        if (error.code === 'RATE_LIMITED' || error.status === 429) {
          const retryDelay = 5000 + (attempts * 2000) + (Math.random() * 2000);
          console.log(`[BitStudioClient] Rate limited, waiting ${Math.round(retryDelay)}ms before retry`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          attempts++;
          continue;
        }
        
        // Handle credit/subscription errors
        if (error.code === 'insufficient_credits' || error.code === 'no_active_subscription') {
          throw { error: 'Insufficient credits or subscription required', code: error.code } as BitStudioError;
        }
        
        // For authentication or permanent errors, don't retry
        if (error.code === 'UNAUTHORIZED' || error.status === 401 || error.status === 403) {
          throw error;
        }
        
        // For temporary errors, retry with backoff
        if (attempts < 3) {
          const retryDelay = 2000 * (attempts + 1);
          console.log(`[BitStudioClient] Temporary error, retrying in ${retryDelay}ms:`, error.message || error.error);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          attempts++;
          continue;
        }
        
        // After max retries, rethrow
        throw error;
      }
    }
    
    console.error('[BitStudioClient] Polling timeout after', maxWaitMs, 'ms');
    throw { error: 'Timeout: Maximum polling attempts reached', code: 'TIMEOUT' } as BitStudioError;
  }
}
