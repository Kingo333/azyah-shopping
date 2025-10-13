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
      
      // 2. Invoke bitstudio-tryon edge function (SECURE - API key on server)
      const { data: result, error: invokeError } = await supabase.functions.invoke(
        'bitstudio-tryon',
        { body: { jobId: job.id } }
      );
      
      if (invokeError) {
        console.error('[BitStudioProvider] Edge function error:', invokeError);
        return { ok: false, jobId: job.id, error: invokeError.message };
      }
      
      if (!result?.ok) {
        console.error('[BitStudioProvider] Edge function returned error:', result);
        return { ok: false, jobId: job.id, error: result?.error || 'Failed to start try-on' };
      }
      
      console.log('[BitStudioProvider] Try-on started:', result);
      
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
