
import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const jobId = url.pathname.split('/').pop();

    if (req.method === 'GET' && jobId && jobId !== 'jobs') {
      // Get specific job
      const { data: job, error } = await supabase
        .from('tryon_jobs')
        .select('id, status, output_url, error_code, error_message, created_at')
        .eq('id', jobId)
        .eq('user_id', user.id)
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ error: 'Job not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Generate signed URL for output if available
      let signedOutputUrl = null;
      if (job.output_url) {
        const { data: signedData } = await supabase.storage
          .from('tryon')
          .createSignedUrl(job.output_url, 3600); // 1 hour expiry
        signedOutputUrl = signedData?.signedUrl;
      }

      return new Response(
        JSON.stringify({
          ...job,
          output_url: signedOutputUrl
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'POST') {
      const { person_image_id, product_id, variant_id } = await req.json();

      if (!person_image_id || !product_id) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create job
      const { data: job, error: createError } = await supabase
        .from('tryon_jobs')
        .insert([
          {
            user_id: user.id,
            product_id,
            variant_id,
            status: 'queued'
          }
        ])
        .select()
        .single();

      if (createError) {
        console.error('Error creating job:', createError);
        return new Response(
          JSON.stringify({ error: 'Failed to create job' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Log analytics event
      await supabase.from('events').insert([
        {
          event_type: 'ai_tryon_job_created',
          user_id: user.id,
          product_id,
          event_data: { job_id: job.id, variant_id }
        }
      ]);

      // Start background processing
      EdgeRuntime.waitUntil(processTryOnJob(supabase, job.id, person_image_id, product_id));

      return new Response(
        JSON.stringify({ job_id: job.id, status: 'queued' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in tryon-jobs function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processTryOnJob(supabase: any, jobId: string, personImageId: string, productId: string) {
  try {
    // Update status to running
    await supabase
      .from('tryon_jobs')
      .update({ status: 'running', updated_at: new Date().toISOString() })
      .eq('id', jobId);

    // Get job details with user info
    const { data: jobData } = await supabase
      .from('tryon_jobs')
      .select('*, products(*)')
      .eq('id', jobId)
      .single();

    if (!jobData) {
      throw new Error('Job not found');
    }

    // Get signed URL for person image
    const { data: personSignedData } = await supabase.storage
      .from('tryon')
      .createSignedUrl(personImageId, 3600);

    if (!personSignedData?.signedUrl) {
      throw new Error('Failed to get person image URL');
    }

    // Get product image (use first media URL)
    const productImageUrl = jobData.products?.media_urls?.[0];
    if (!productImageUrl) {
      throw new Error('Product image not found');
    }

    // Simulate AI processing (replace with actual model call)
    await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second simulation

    // For MVP, we'll create a simple overlay effect
    // In production, this would call a real AI try-on model
    const resultFileName = `results/${jobId}.png`;
    const resultPath = `tryon/users/${jobData.user_id}/${resultFileName}`;

    // Create a simple result (in production, this would be the AI model output)
    const mockResult = await createMockResult(personSignedData.signedUrl, productImageUrl);
    
    // Upload result
    const { error: uploadError } = await supabase.storage
      .from('tryon')
      .upload(resultPath, mockResult, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      throw uploadError;
    }

    // Update job with success
    await supabase
      .from('tryon_jobs')
      .update({
        status: 'succeeded',
        output_url: resultPath,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    // Log success event
    await supabase.from('events').insert([
      {
        event_type: 'ai_tryon_job_succeeded',
        user_id: jobData.user_id,
        product_id: productId,
        event_data: { job_id: jobId }
      }
    ]);

  } catch (error) {
    console.error('Error processing try-on job:', error);
    
    // Update job with failure
    await supabase
      .from('tryon_jobs')
      .update({
        status: 'failed',
        error_code: 'PROCESSING_ERROR',
        error_message: error.message || 'Unknown error occurred',
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    // Log failure event
    const { data: jobData } = await supabase
      .from('tryon_jobs')
      .select('user_id, product_id')
      .eq('id', jobId)
      .single();

    if (jobData) {
      await supabase.from('events').insert([
        {
          event_type: 'ai_tryon_job_failed',
          user_id: jobData.user_id,
          product_id: jobData.product_id,
          event_data: { job_id: jobId, error: error.message }
        }
      ]);
    }
  }
}

async function createMockResult(personUrl: string, productUrl: string): Promise<Blob> {
  // This is a placeholder - in production, you would call your AI model here
  // For now, we'll return the person image as the result
  const response = await fetch(personUrl);
  return await response.blob();
}
