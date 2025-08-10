
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const BITSTUDIO_API_KEY = Deno.env.get('BITSTUDIO_API_KEY');
    const BITSTUDIO_API_BASE = Deno.env.get('BITSTUDIO_API_BASE') || 'https://api.bitstudio.ai';

    if (!BITSTUDIO_API_KEY) {
      throw new Error('bitStudio API key not configured');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Get job ID from URL
    const url = new URL(req.url);
    const jobId = url.pathname.split('/').pop();

    if (!jobId) {
      return new Response(
        JSON.stringify({ error: 'Job ID required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get job from database
    const { data: jobData, error: jobError } = await supabase
      .from('ai_tryon_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single();

    if (jobError || !jobData) {
      return new Response(
        JSON.stringify({ error: 'Job not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    if (!jobData.provider_job_id) {
      return new Response(
        JSON.stringify({ error: 'Provider job ID not available' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Check status with bitStudio API
    const response = await fetch(`${BITSTUDIO_API_BASE}/images/${jobData.provider_job_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${BITSTUDIO_API_KEY}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('bitStudio API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
        );
      }
      
      throw new Error(`bitStudio API error: ${response.status}`);
    }

    const result = await response.json();
    
    // Update job status in database
    const updateData: any = {
      status: result.status,
    };

    if (result.status === 'completed') {
      updateData.result_url = result.path;
      updateData.completed_at = new Date().toISOString();
      if (result.credits_used) {
        updateData.credits_used = result.credits_used;
      }
    } else if (result.status === 'failed') {
      updateData.error = { message: result.error || 'Generation failed' };
    }

    await supabase
      .from('ai_tryon_jobs')
      .update(updateData)
      .eq('id', jobId);

    return new Response(
      JSON.stringify({
        job_id: jobId,
        status: result.status,
        result_url: result.path,
        credits_used: result.credits_used,
        error: result.error
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Status check error:', error);
    return new Response(
      JSON.stringify({ error: 'Status check failed', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
