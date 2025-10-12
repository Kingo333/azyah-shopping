import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobId } = await req.json();
    
    if (!jobId) {
      return new Response(
        JSON.stringify({ error: 'Job ID is required' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const bitstudioApiKey = Deno.env.get('BITSTUDIO_API_KEY');

    if (!bitstudioApiKey) {
      throw new Error('BITSTUDIO_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get job from database
    const { data: job, error: jobError } = await supabase
      .from('event_tryon_jobs')
      .select('*')
      .eq('id', jobId)
      .single();
    
    if (jobError || !job) {
      return new Response(
        JSON.stringify({ error: 'Job not found' }), 
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (job.status !== 'processing' || !job.provider_job_id) {
      return new Response(
        JSON.stringify({ error: 'Invalid job status', status: job.status }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Poll] Checking BitStudio status for job ${job.provider_job_id}`);

    // Check BitStudio status
    const statusResponse = await fetch(
      `https://api.bitstudio.ai/images/${job.provider_job_id}`,
      {
        headers: {
          'Authorization': `Bearer ${bitstudioApiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!statusResponse.ok) {
      throw new Error(`BitStudio API error: ${statusResponse.status}`);
    }

    const bitstudioResult = await statusResponse.json();
    console.log(`[Poll] BitStudio status: ${bitstudioResult.status}`);

    if (bitstudioResult.status === 'completed' && bitstudioResult.path) {
      console.log('[Poll] Job completed, downloading image...');
      
      // Download image from BitStudio
      const imageResponse = await fetch(bitstudioResult.path);
      if (!imageResponse.ok) {
        throw new Error('Failed to download image from BitStudio');
      }
      
      const imageBlob = await imageResponse.blob();
      
      // Upload to Supabase Storage
      const timestamp = Date.now();
      const filename = `${job.product_id}_${timestamp}.png`;
      const storagePath = `${job.event_id}/${job.user_id}/${filename}`;
      
      const { error: uploadError } = await supabase.storage
        .from('event-tryon-renders')
        .upload(storagePath, imageBlob, {
          contentType: 'image/png',
          upsert: false
        });
      
      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      console.log('[Poll] Image uploaded to storage:', storagePath);
      
      // Update job with success
      const { error: updateError } = await supabase
        .from('event_tryon_jobs')
        .update({
          status: 'succeeded',
          output_path: storagePath,
          credits_used: bitstudioResult.credits_used || 100,
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId);
      
      if (updateError) {
        throw new Error(`Failed to update job: ${updateError.message}`);
      }

      console.log('[Poll] Job completed successfully');
      
      return new Response(
        JSON.stringify({ success: true, status: 'succeeded', output_path: storagePath }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
      
    } else if (bitstudioResult.status === 'failed') {
      console.log('[Poll] Job failed:', bitstudioResult.error);
      
      await supabase
        .from('event_tryon_jobs')
        .update({
          status: 'failed',
          error: bitstudioResult.error || 'BitStudio generation failed',
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId);
      
      return new Response(
        JSON.stringify({ success: false, status: 'failed', error: bitstudioResult.error }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
      
    } else {
      // Still processing
      console.log('[Poll] Job still processing');
      
      return new Response(
        JSON.stringify({ success: true, status: bitstudioResult.status }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
  } catch (error: any) {
    console.error('[Poll] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});