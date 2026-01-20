import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VIDEO_PROMPT = "clear background of empty room and person has subtle, natural motions like gentle swaying then turning around to show back of outfit then turns back to front view";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const apiKey = Deno.env.get('THE_NEW_BLACK_API_KEY');
    const tnbEmail = Deno.env.get('THE_NEW_BLACK_EMAIL');
    const tnbPassword = Deno.env.get('THE_NEW_BLACK_PASSWORD');

    if (!apiKey || !tnbEmail || !tnbPassword) {
      console.error('TheNewBlack credentials not configured');
      return new Response(
        JSON.stringify({ ok: false, error: 'API credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create user client to verify auth
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { image_url, action } = await req.json();
    
    // Create service client for database operations
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Action: start - Start video generation
    if (action === 'start') {
      if (!image_url) {
        return new Response(
          JSON.stringify({ ok: false, error: 'image_url is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[TheNewBlack Video] Starting video generation for user:', user.id);
      console.log('[TheNewBlack Video] Image URL:', image_url);

      // Check and deduct video credits
      const { data: credits, error: creditsError } = await serviceClient.rpc('get_user_credits', {
        target_user_id: user.id
      });

      if (creditsError || !credits || credits.length === 0) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Failed to get credits' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (credits[0].video_credits <= 0) {
        return new Response(
          JSON.stringify({ 
            ok: false, 
            error: 'No video credits remaining',
            credits_remaining: 0,
            is_premium: credits[0].is_premium
          }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Deduct video credit before processing
      const { data: deductResult, error: deductError } = await serviceClient.rpc('deduct_video_credit', {
        target_user_id: user.id
      });

      if (deductError || !deductResult) {
        console.error('[TheNewBlack Video] Failed to deduct credit:', deductError);
        return new Response(
          JSON.stringify({ ok: false, error: 'Failed to deduct credit' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Call The New Black API to start video generation
      const formData = new FormData();
      formData.append('image', image_url);
      formData.append('prompt', VIDEO_PROMPT);
      formData.append('time', '5'); // 5 second video

      console.log('[TheNewBlack Video] Calling API to start generation...');
      
      const apiResponse = await fetch(
        `https://thenewblack.ai/api/1.1/wf/ai-video?api_key=${apiKey}`,
        {
          method: 'POST',
          body: formData
        }
      );

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        console.error('[TheNewBlack Video] API error:', apiResponse.status, errorText);
        
        // Refund credit on API failure
        await serviceClient.from('user_credits')
          .update({ video_credits: credits[0].video_credits })
          .eq('user_id', user.id);

        return new Response(
          JSON.stringify({ ok: false, error: `API error: ${apiResponse.status}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // The API returns the job ID directly as text
      const jobId = await apiResponse.text();
      console.log('[TheNewBlack Video] Job ID:', jobId);

      if (!jobId || jobId.trim().length === 0) {
        console.error('[TheNewBlack Video] Invalid job ID:', jobId);
        
        // Refund credit on invalid result
        await serviceClient.from('user_credits')
          .update({ video_credits: credits[0].video_credits })
          .eq('user_id', user.id);

        return new Response(
          JSON.stringify({ ok: false, error: 'Invalid response from API' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          ok: true, 
          job_id: jobId.trim(),
          status: 'processing',
          message: 'Video generation started. Check back in 2-5 minutes.',
          credits_remaining: credits[0].video_credits - 1
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Action: check - Check video status and retrieve result
    if (action === 'check') {
      const { job_id } = await req.json();
      
      if (!job_id) {
        return new Response(
          JSON.stringify({ ok: false, error: 'job_id is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[TheNewBlack Video] Checking job status:', job_id);

      // Call The New Black API to get video result
      const formData = new FormData();
      formData.append('email', tnbEmail);
      formData.append('password', tnbPassword);
      formData.append('id', job_id);

      const apiResponse = await fetch(
        'https://thenewblack.ai/api/1.1/wf/results_video',
        {
          method: 'POST',
          body: formData
        }
      );

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        console.error('[TheNewBlack Video] Check API error:', apiResponse.status, errorText);
        return new Response(
          JSON.stringify({ ok: false, error: `API error: ${apiResponse.status}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const resultUrl = await apiResponse.text();
      console.log('[TheNewBlack Video] Result URL:', resultUrl);

      // Check if result is ready (URL starts with http)
      if (!resultUrl || !resultUrl.startsWith('http')) {
        // Still processing
        return new Response(
          JSON.stringify({ 
            ok: true, 
            status: 'processing',
            message: 'Video is still being generated. Please wait...'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Video is ready - download and store
      console.log('[TheNewBlack Video] Downloading video...');
      const videoResponse = await fetch(resultUrl.trim());
      if (!videoResponse.ok) {
        console.error('[TheNewBlack Video] Failed to download video');
        return new Response(
          JSON.stringify({ ok: true, result_url: resultUrl.trim(), stored: false, status: 'completed' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const videoBlob = await videoResponse.blob();
      const fileName = `${user.id}/${Date.now()}.mp4`;

      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await serviceClient.storage
        .from('ai-tryon-videos')
        .upload(fileName, videoBlob, {
          contentType: 'video/mp4',
          upsert: true
        });

      if (uploadError) {
        console.error('[TheNewBlack Video] Upload error:', uploadError);
        // Return the original URL if upload fails
        return new Response(
          JSON.stringify({ ok: true, result_url: resultUrl.trim(), stored: false, status: 'completed' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get public URL
      const { data: publicUrl } = serviceClient.storage
        .from('ai-tryon-videos')
        .getPublicUrl(fileName);

      console.log('[TheNewBlack Video] Stored at:', publicUrl.publicUrl);

      // Save to ai_assets table
      await serviceClient.from('ai_assets').insert({
        user_id: user.id,
        asset_url: publicUrl.publicUrl,
        asset_type: 'tryon_video',
        metadata: {
          job_id: job_id,
          provider: 'thenewblack',
          original_url: resultUrl.trim()
        }
      });

      return new Response(
        JSON.stringify({ 
          ok: true, 
          result_url: publicUrl.publicUrl,
          stored: true,
          status: 'completed'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ ok: false, error: 'Invalid action. Use "start" or "check"' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[TheNewBlack Video] Error:', error);
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
