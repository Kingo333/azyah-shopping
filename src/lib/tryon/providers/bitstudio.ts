import { supabase } from '@/integrations/supabase/client';
import { BitStudioClient } from '@/lib/bitstudio-client';
import type { ITryOnProvider, TryOnRequest, TryOnResult } from '../types';

export const bitstudioProvider: ITryOnProvider = {
  name: 'bitstudio',
  
  async tryOn(req: TryOnRequest): Promise<TryOnResult> {
    try {
      console.log('[BitStudioProvider] Starting try-on:', req);
      
      // 1. Create job record in event_tryon_jobs
      const { data: job, error: jobError } = await supabase
        .from('event_tryon_jobs')
        .insert({
          event_id: req.eventId,
          user_id: req.userId,
          product_id: req.productId,
          input_person_path: req.personImagePath,
          input_outfit_path: req.outfitImagePath,
          provider: 'bitstudio',
          status: 'queued'
        })
        .select()
        .single();
      
      if (jobError || !job) {
        console.error('[BitStudioProvider] Job creation failed:', jobError);
        return { ok: false, error: jobError?.message || 'Failed to create job' };
      }
      
      console.log('[BitStudioProvider] Job created:', job.id);
      
      // 2. Update job status to processing
      await supabase
        .from('event_tryon_jobs')
        .update({ status: 'processing', started_at: new Date().toISOString() })
        .eq('id', job.id);
      
      // 3. Get BitStudio image IDs from database
      const { data: productData } = await supabase
        .from('event_brand_products')
        .select('try_on_data')
        .eq('id', req.productId)
        .single();
      
      const { data: personData } = await supabase
        .from('event_user_photos')
        .select('bitstudio_image_id')
        .eq('event_id', req.eventId)
        .eq('user_id', req.userId)
        .single();
      
      const tryOnData = productData?.try_on_data as { outfit_bitstudio_id?: string } | null;
      
      if (!tryOnData?.outfit_bitstudio_id) {
        await supabase
          .from('event_tryon_jobs')
          .update({ 
            status: 'failed', 
            error: 'Product outfit not uploaded to BitStudio',
            completed_at: new Date().toISOString()
          })
          .eq('id', job.id);
        
        return { ok: false, error: 'Product outfit not uploaded to BitStudio' };
      }
      
      if (!personData?.bitstudio_image_id) {
        await supabase
          .from('event_tryon_jobs')
          .update({ 
            status: 'failed', 
            error: 'Person photo not uploaded to BitStudio',
            completed_at: new Date().toISOString()
          })
          .eq('id', job.id);
        
        return { ok: false, error: 'Person photo not uploaded to BitStudio' };
      }
      
      console.log('[BitStudioProvider] Using BitStudio IDs:', { 
        personId: personData.bitstudio_image_id, 
        outfitId: tryOnData.outfit_bitstudio_id 
      });
      
      // 4. Call BitStudio API with image IDs
      const results = await BitStudioClient.virtualTryOn({
        person_image_id: personData.bitstudio_image_id,
        outfit_image_id: tryOnData.outfit_bitstudio_id,
        resolution: 'standard',
        num_images: 1
      });
      
      const bitstudioJobId = Array.isArray(results) && results.length > 0 ? results[0].id : null;
      
      if (!bitstudioJobId) {
        await supabase
          .from('event_tryon_jobs')
          .update({ 
            status: 'failed', 
            error: 'No job ID returned from BitStudio',
            completed_at: new Date().toISOString()
          })
          .eq('id', job.id);
        
        return { ok: false, error: 'No job ID returned from BitStudio' };
      }
      
      console.log('[BitStudioProvider] BitStudio job ID:', bitstudioJobId);
      
      // 5. Store BitStudio job ID and return immediately (background processing)
      await supabase
        .from('event_tryon_jobs')
        .update({ 
          provider_job_id: bitstudioJobId,
          status: 'processing'
        })
        .eq('id', job.id);
      
      console.log('[BitStudioProvider] Job queued for background processing:', job.id);
      
      return {
        ok: true,
        jobId: job.id,
        message: 'Try-on started, processing in background'
      };
      
    } catch (error: any) {
      console.error('[BitStudioProvider] Error:', error);
      return { ok: false, error: error.message };
    }
  }
};
