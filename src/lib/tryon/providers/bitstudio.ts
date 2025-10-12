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
