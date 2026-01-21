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

    // Extract token and pass explicitly for Lovable Cloud ES256 compatibility
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await userClient.auth.getUser(token);
    if (authError || !user) {
      console.error('[TheNewBlack Video] Auth error:', authError?.message);
      return new Response(
        JSON.stringify({ ok: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body once - extract all needed fields
    const { image_url, action, job_id } = await req.json();
    
    // Create service client for database operations
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Action: start - Start video generation
    if (action === 'start') {
      if (!image_url) {
        return new Response(
          JSON.stringify({ ok: false, step: 'start', error: 'image_url is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[TheNewBlack Video] Starting video generation for user:', user.id);
      console.log('[TheNewBlack Video] Image URL:', image_url);

      // Verify image URL is publicly accessible before calling provider
      console.log('[TheNewBlack Video] Verifying image URL accessibility...');
      try {
        const imageCheck = await fetch(image_url, { method: 'HEAD' });
        console.log('[TheNewBlack Video] Image URL check status:', imageCheck.status);
        if (!imageCheck.ok) {
          console.error('[TheNewBlack Video] Image URL not accessible:', imageCheck.status);
          return new Response(
            JSON.stringify({ 
              ok: false, 
              step: 'image_url_check', 
              status: imageCheck.status,
              error: 'Image URL is not publicly accessible. Please re-upload the image.' 
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        console.log('[TheNewBlack Video] Image URL verified accessible');
      } catch (err) {
        console.error('[TheNewBlack Video] Image URL check error:', err);
        return new Response(
          JSON.stringify({ 
            ok: false, 
            step: 'image_url_check', 
            error: 'Failed to verify image URL accessibility. Please try re-uploading.' 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check and deduct video credits
      const { data: credits, error: creditsError } = await serviceClient.rpc('get_user_credits', {
        target_user_id: user.id
      });

      if (creditsError || !credits || credits.length === 0) {
        return new Response(
          JSON.stringify({ ok: false, step: 'start', error: 'Failed to get credits' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (credits[0].video_credits <= 0) {
        return new Response(
          JSON.stringify({ 
            ok: false, 
            step: 'start',
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
          JSON.stringify({ ok: false, step: 'start', error: 'Failed to deduct credit' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Call The New Black API to start video generation
      const formData = new FormData();
      formData.append('image', image_url);
      formData.append('prompt', VIDEO_PROMPT);
      formData.append('time', '5'); // 5 second video

      // Enhanced logging for debugging
      console.log('[TheNewBlack Video] Request details:', {
        endpoint: 'https://thenewblack.ai/api/1.1/wf/ai-video',
        hasApiKey: !!apiKey,
        imageUrlLength: image_url?.length,
        imageUrlPreview: image_url?.substring(0, 80) + '...',
        promptLength: VIDEO_PROMPT.length,
        time: '5'
      });
      
      const apiResponse = await fetch(
        `https://thenewblack.ai/api/1.1/wf/ai-video?api_key=${apiKey}`,
        {
          method: 'POST',
          body: formData
        }
      );

      // Get the API response - may be JSON or plain text
      const responseText = await apiResponse.text();
      console.log('[TheNewBlack Video] API Response:', {
        status: apiResponse.status,
        statusText: apiResponse.statusText,
        contentType: apiResponse.headers.get('content-type'),
        bodyLength: responseText.length,
        bodyPreview: responseText.substring(0, 300)
      });

      if (!apiResponse.ok) {
        console.error('[TheNewBlack Video] API error:', apiResponse.status, responseText);
        
        // Refund credit on API failure
        await serviceClient.from('user_credits')
          .update({ video_credits: credits[0].video_credits })
          .eq('user_id', user.id);

        return new Response(
          JSON.stringify({ 
            ok: false, 
            step: 'start',
            status: apiResponse.status,
            bodySnippet: responseText.substring(0, 200),
            error: `Video API error: ${apiResponse.status}` 
          }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check for empty response
      if (!responseText || responseText.trim().length === 0) {
        console.error('[TheNewBlack Video] Empty response from API');
        
        // Refund credit
        await serviceClient.from('user_credits')
          .update({ video_credits: credits[0].video_credits })
          .eq('user_id', user.id);

        return new Response(
          JSON.stringify({ 
            ok: false, 
            step: 'start',
            bodySnippet: '(empty)',
            error: 'Video provider returned empty response.' 
          }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Try to parse as JSON first (in case API returns JSON)
      let jobId: string;
      try {
        const jsonResponse = JSON.parse(responseText);
        console.log('[TheNewBlack Video] Parsed JSON response:', JSON.stringify(jsonResponse));
        
        // Check for empty success response - this is the main issue!
        // API returns {"status":"success","response":{}} when request fails silently
        if (jsonResponse.status === 'success' && 
            (!jsonResponse.response || Object.keys(jsonResponse.response).length === 0) &&
            !jsonResponse.id && !jsonResponse.job_id) {
          console.error('[TheNewBlack Video] API returned empty success - no job ID provided');
          
          // Refund credit
          await serviceClient.from('user_credits')
            .update({ video_credits: credits[0].video_credits })
            .eq('user_id', user.id);

          return new Response(
            JSON.stringify({ 
              ok: false, 
              step: 'start',
              bodySnippet: responseText.substring(0, 200),
              error: 'Video provider returned invalid response. This may indicate an API key or credits issue on their end.' 
            }),
            { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Check if it's an error response
        if (jsonResponse.status === 'error' || jsonResponse.error) {
          console.error('[TheNewBlack Video] API returned error:', jsonResponse);
          
          // Refund credit
          await serviceClient.from('user_credits')
            .update({ video_credits: credits[0].video_credits })
            .eq('user_id', user.id);

          return new Response(
            JSON.stringify({ 
              ok: false, 
              step: 'start',
              bodySnippet: responseText.substring(0, 200),
              error: jsonResponse.message || jsonResponse.error || 'API error' 
            }),
            { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        // If JSON has an ID field, use it
        jobId = jsonResponse.id || jsonResponse.job_id || responseText;
      } catch {
        // Not JSON, treat as plain text job ID (expected per docs)
        jobId = responseText;
      }

      const cleanJobId = jobId.trim();
      console.log('[TheNewBlack Video] Extracted Job ID:', cleanJobId);

      // Validate job ID format - should be numeric like "1761033139928x378400228801150800"
      // Accept formats: "123456x789012" or just long numbers
      const validJobIdPattern = /^(\d+x\d+|\d{10,})$/;
      if (!cleanJobId || cleanJobId.length === 0 || !validJobIdPattern.test(cleanJobId)) {
        console.error('[TheNewBlack Video] Invalid job ID format:', cleanJobId.substring(0, 100));
        
        // Refund credit
        await serviceClient.from('user_credits')
          .update({ video_credits: credits[0].video_credits })
          .eq('user_id', user.id);

        return new Response(
          JSON.stringify({ 
            ok: false, 
            step: 'start',
            bodySnippet: cleanJobId.substring(0, 100),
            error: 'Invalid job ID format received from API. Please try again.' 
          }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          ok: true, 
          job_id: cleanJobId,
          status: 'processing',
          message: 'Video generation started. Check back in 2-5 minutes.',
          credits_remaining: credits[0].video_credits - 1
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Action: check - Check video status and retrieve result
    if (action === 'check') {
      if (!job_id) {
        return new Response(
          JSON.stringify({ ok: false, step: 'poll', error: 'job_id is required' }),
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
        console.error('[TheNewBlack Video] Poll API error:', apiResponse.status, errorText);
        return new Response(
          JSON.stringify({ 
            ok: false, 
            step: 'poll',
            status: apiResponse.status,
            bodySnippet: errorText.substring(0, 200),
            error: `Video polling failed: ${apiResponse.status}` 
          }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
