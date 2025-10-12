import { BitStudioClient } from '@/lib/bitstudio-client';
import type { ITryOnProvider, TryOnRequest, TryOnResult } from '../types';

export const bitstudioProvider: ITryOnProvider = {
  name: 'bitstudio',
  
  async tryOn(req: TryOnRequest): Promise<TryOnResult> {
    try {
      console.log('[BitStudioProvider] Legacy try-on:', req);
      
      // Use existing BitStudio integration
      const results = await BitStudioClient.virtualTryOn({
        person_image_url: req.personImagePath,
        outfit_image_url: req.outfitImagePath,
        resolution: 'standard',
        num_images: 1
      });
      
      const jobId = Array.isArray(results) && results.length > 0 ? results[0].id : null;
      
      if (!jobId) {
        return { ok: false, error: 'No job ID returned' };
      }
      
      const result = await BitStudioClient.pollUntilComplete(jobId);
      
      return {
        ok: true,
        jobId: result.id,
        outputPath: result.path
      };
      
    } catch (error: any) {
      console.error('[BitStudioProvider] Error:', error);
      return { ok: false, error: error.message };
    }
  }
};
