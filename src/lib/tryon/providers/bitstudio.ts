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
      
      // 3. Get public URLs for storage paths
      const { data: { publicUrl: personUrl } } = supabase.storage
        .from('event-user-photos')
        .getPublicUrl(req.personImagePath);
      
      const { data: { publicUrl: outfitUrl } } = supabase.storage
        .from('event-products')
        .getPublicUrl(req.outfitImagePath);
      
      console.log('[BitStudioProvider] Using URLs:', { personUrl, outfitUrl });
      
      // 4. Call BitStudio API
      const results = await BitStudioClient.virtualTryOn({
        person_image_url: personUrl,
        outfit_image_url: outfitUrl,
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
      
      // 5. Poll for completion
      const result = await BitStudioClient.pollUntilComplete(bitstudioJobId);
      
      if (result.status === 'failed') {
        await supabase
          .from('event_tryon_jobs')
          .update({ 
            status: 'failed', 
            error: result.error || 'BitStudio generation failed',
            completed_at: new Date().toISOString()
          })
          .eq('id', job.id);
        
        return { ok: false, error: result.error || 'Generation failed' };
      }
      
      // 6. Upload result to Supabase Storage
      const timestamp = Date.now();
      const filename = `${req.productId}_${timestamp}.png`;
      const storagePath = `${req.eventId}/${req.userId}/${filename}`;
      
      // Download from BitStudio
      const imageResponse = await fetch(result.path!);
      const imageBlob = await imageResponse.blob();
      
      // Upload to Supabase
      const { error: uploadError } = await supabase.storage
        .from('event-tryon-renders')
        .upload(storagePath, imageBlob, {
          contentType: 'image/png',
          upsert: false
        });
      
      if (uploadError) {
        console.error('[BitStudioProvider] Upload error:', uploadError);
        await supabase
          .from('event_tryon_jobs')
          .update({ 
            status: 'failed', 
            error: `Upload failed: ${uploadError.message}`,
            completed_at: new Date().toISOString()
          })
          .eq('id', job.id);
        
        return { ok: false, error: uploadError.message };
      }
      
      // 7. Update job with success
      await supabase
        .from('event_tryon_jobs')
        .update({ 
          status: 'succeeded', 
          output_path: storagePath,
          credits_used: result.credits_used || 2,
          completed_at: new Date().toISOString()
        })
        .eq('id', job.id);
      
      console.log('[BitStudioProvider] Try-on complete:', storagePath);
      
      return {
        ok: true,
        jobId: job.id,
        outputPath: storagePath
      };
      
    } catch (error: any) {
      console.error('[BitStudioProvider] Error:', error);
      return { ok: false, error: error.message };
    }
  }
};
