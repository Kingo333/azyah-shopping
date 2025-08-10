
import type { BitStudioImage, BitStudioError, AspectRatio, Resolution, Style, UpscaleFactor } from './bitstudio-types';

export class BitStudioClient {
  private static async makeRequest(url: string, options: RequestInit = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw data as BitStudioError;
    }
    
    return data;
  }

  static async uploadImage(file: File, type: string): Promise<BitStudioImage> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    const response = await fetch('/api/bitstudio/images', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw data as BitStudioError;
    }
    
    return data;
  }

  static async getImage(id: string): Promise<BitStudioImage> {
    return this.makeRequest(`/api/bitstudio/images/${id}`);
  }

  static async virtualTryOn(params: {
    person_image_id?: string;
    person_image_url?: string;
    outfit_image_id?: string;
    outfit_image_url?: string;
    outfit_asset_id?: string;
    prompt?: string;
    resolution?: Resolution;
    num_images?: number;
    seed?: number;
  }): Promise<BitStudioImage[]> {
    return this.makeRequest('/api/bitstudio/virtual-try-on', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  static async generateImages(params: {
    prompt: string;
    num_images?: number;
    aspect_ratio?: AspectRatio;
    style?: Style;
    resolution?: Resolution;
    model_text?: string;
    outfit_text?: string;
    outfit_image_id?: string;
    outfit_asset_id?: string;
    set_id?: string;
    set_text?: string;
    seed?: number;
  }): Promise<BitStudioImage[]> {
    return this.makeRequest('/api/bitstudio/generate', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  static async upscaleImage(id: string, params: {
    upscale_factor: UpscaleFactor;
    denoise?: number;
    version_id?: string;
  }): Promise<BitStudioImage> {
    return this.makeRequest(`/api/bitstudio/images/${id}/upscale`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  static async inpaintImage(id: string, params: {
    mask_image_id: string;
    reference_image_id?: string;
    prompt?: string;
    denoise?: number;
    num_images?: number;
  }): Promise<BitStudioImage> {
    return this.makeRequest(`/api/bitstudio/images/${id}/inpaint`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  static async editImage(id: string, params: {
    prompt: string;
    resolution?: 'standard' | 'low';
    num_images?: number;
    seed?: number;
    version_id?: string;
  }): Promise<BitStudioImage> {
    return this.makeRequest(`/api/bitstudio/images/${id}/edit`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  static async generateVideo(id: string, params: {
    prompt: string;
  }): Promise<BitStudioImage> {
    return this.makeRequest(`/api/bitstudio/images/${id}/video`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  static async pollUntilComplete(id: string, maxWaitMs = 180000): Promise<BitStudioImage> {
    const startTime = Date.now();
    let delay = 2000; // Start with 2 seconds
    let retryCount = 0;
    
    while (Date.now() - startTime < maxWaitMs) {
      try {
        const result = await this.getImage(id);
        
        if (result.status === 'completed') {
          return result;
        }
        
        if (result.status === 'failed') {
          throw { error: result.error || 'Generation failed', code: 'GENERATION_FAILED' };
        }
        
        // Exponential backoff with jitter
        await new Promise(resolve => setTimeout(resolve, delay + Math.random() * 1000));
        delay = Math.min(delay * 1.2, 6000); // Max 6 seconds
        retryCount++;
        
      } catch (error: any) {
        // Handle rate limiting with exponential backoff
        if (error.code === 'RATE_LIMITED' || (error.status === 429)) {
          const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 10000);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
          retryCount++;
          continue;
        }
        
        throw error;
      }
    }
    
    throw { error: 'Timeout waiting for result', code: 'TIMEOUT' };
  }
}
