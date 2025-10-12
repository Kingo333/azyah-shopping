import { supabase } from '@/integrations/supabase/client';
import type { ITryOnProvider, TryOnRequest, TryOnResult } from '../types';

export const geminiProvider: ITryOnProvider = {
  name: 'gemini',
  
  async tryOn(req: TryOnRequest): Promise<TryOnResult> {
    try {
      console.log('[GeminiProvider] Starting try-on:', req);
      
      // 1. Create job record
      const { data: job, error: jobError } = await supabase
        .from('event_tryon_jobs')
        .insert({
          event_id: req.eventId,
          user_id: req.userId,
          product_id: req.productId,
          input_person_path: req.personImagePath,
          input_outfit_path: req.outfitImagePath,
          provider: 'gemini',
          model: 'gemini-2.0-flash-exp',
          status: 'queued'
        })
        .select()
        .single();
      
      if (jobError || !job) {
        console.error('[GeminiProvider] Job creation failed:', jobError);
        return { ok: false, error: jobError?.message || 'Failed to create job' };
      }
      
      console.log('[GeminiProvider] Job created:', job.id);
      
      // 2. Invoke edge function
      const { data: result, error: invokeError } = await supabase.functions.invoke(
        'vto-gemini',
        { body: { jobId: job.id } }
      );
      
      if (invokeError) {
        console.error('[GeminiProvider] Edge function error:', invokeError);
        return { ok: false, jobId: job.id, error: invokeError.message };
      }
      
      console.log('[GeminiProvider] Generation complete:', result);
      
      return {
        ok: true,
        jobId: job.id,
        outputPath: result.output_path
      };
      
    } catch (error: any) {
      console.error('[GeminiProvider] Try-on error:', error);
      return { ok: false, error: error.message || 'Unknown error' };
    }
  }
};
