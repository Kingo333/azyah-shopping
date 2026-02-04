import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VIDEO_PROMPT = "Fashion model naturally showcasing the outfit with elegant movements";

// Known-good test image for provider diagnostics
const TEST_IMAGE_URL = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&q=80";

// Helper: Log job lifecycle to database
async function logJobLifecycle(
  serviceClient: any,
  userId: string,
  data: {
    action: string;
    inputImageUrl?: string;
    usedImageUrl?: string;
    jobId?: string;
    step?: string;
    providerStatusCode?: number;
    bodySnippet?: string;
    errorMessage?: string;
    isSuccess: boolean;
  }
) {
  try {
    await serviceClient.from('video_job_logs').insert({
      user_id: userId,
      action: data.action,
      input_image_url: data.inputImageUrl,
      used_image_url: data.usedImageUrl,
      job_id: data.jobId,
      step: data.step,
      provider_status_code: data.providerStatusCode,
      body_snippet: data.bodySnippet?.substring(0, 500),
      error_message: data.errorMessage?.substring(0, 500),
      is_success: data.isSuccess
    });
  } catch (e) {
    console.error('[TheNewBlack Video] Failed to log job lifecycle:', e);
  }
}

// Helper: Create a provider-safe copy of the image
// Downloads the original image and re-uploads to a dedicated public bucket
// This ensures the URL is stable (no expiry) and provider-accessible
async function createProviderSafeCopy(
  imageUrl: string,
  userId: string,
  serviceClient: any
): Promise<{ ok: boolean; publicUrl?: string; error?: string; debug?: Record<string, unknown> }> {
  try {
    console.log('[TheNewBlack Video] Creating provider-safe copy from:', imageUrl.substring(0, 80));
    
    // Fetch image with browser-like headers for compatibility
    const response = await fetch(imageUrl, {
      headers: {
        'Accept': 'image/*,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (compatible; VideoBot/1.0)'
      }
    });
    
    if (!response.ok) {
      return { 
        ok: false, 
        error: `Failed to fetch image: ${response.status} ${response.statusText}`,
        debug: { fetchStatus: response.status }
      };
    }
    
    const contentType = response.headers.get('content-type') || '';
    console.log('[TheNewBlack Video] Fetched image, content-type:', contentType);
    
    // Accept image/* and application/octet-stream (common for binary downloads)
    if (!contentType.startsWith('image/') && contentType !== 'application/octet-stream') {
      return { 
        ok: false, 
        error: `Invalid content-type: ${contentType}. Expected an image.`,
        debug: { contentType }
      };
    }
    
    const blob = await response.blob();
    console.log('[TheNewBlack Video] Image blob size:', blob.size);
    
    if (blob.size < 1000) {
      return { 
        ok: false, 
        error: 'Image too small, likely an error response',
        debug: { blobSize: blob.size }
      };
    }
    
    // Generate unique filename
    const fileName = `${userId}/${Date.now()}_video_input.jpg`;
    
    // Upload to dedicated public bucket
    const { error: uploadError } = await serviceClient.storage
      .from('tnb-video-inputs')
      .upload(fileName, blob, {
        contentType: 'image/jpeg',
        upsert: true
      });
    
    if (uploadError) {
      console.error('[TheNewBlack Video] Upload to tnb-video-inputs failed:', uploadError);
      return { 
        ok: false, 
        error: `Upload failed: ${uploadError.message}`,
        debug: { uploadError: uploadError.message }
      };
    }
    
    // Get public URL
    const { data } = serviceClient.storage
      .from('tnb-video-inputs')
      .getPublicUrl(fileName);
    
    console.log('[TheNewBlack Video] Provider-safe URL created:', data.publicUrl);
    
    return { ok: true, publicUrl: data.publicUrl };
  } catch (err) {
    console.error('[TheNewBlack Video] createProviderSafeCopy error:', err);
    return { 
      ok: false, 
      error: err instanceof Error ? err.message : 'Copy failed',
      debug: { exception: err instanceof Error ? err.message : 'Unknown' }
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const apiKey = Deno.env.get('THE_NEW_BLACK_API_KEY');

    if (!apiKey) {
      console.error('THE_NEW_BLACK_API_KEY not configured');
      return new Response(
        JSON.stringify({ ok: false, step: 'config', error: 'API credentials not configured' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ ok: false, step: 'auth', error: 'Unauthorized' }),
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
        JSON.stringify({ ok: false, step: 'auth', error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body once - extract all needed fields including optional overrides
    const { image_url, action, job_id, prompt, time } = await req.json();
    
    // Allow optional prompt/time overrides from frontend
    const finalPrompt = (typeof prompt === 'string' && prompt.trim().length >= 3) 
      ? prompt.trim() 
      : VIDEO_PROMPT;
    
    const finalTime = (time === '5' || time === '10') ? time : '5';
    
    // Create service client for database operations
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // =====================================================
    // Action: start_test - Provider diagnostic (no credits)
    // =====================================================
    if (action === 'start_test') {
      console.log('[TheNewBlack Video] Running provider diagnostic test...');
      
      const formData = new FormData();
      formData.append('image', TEST_IMAGE_URL);
      formData.append('prompt', 'Model does a slow turn');
      formData.append('time', '5');

      const testResponse = await fetch(
        `https://thenewblack.ai/api/1.1/wf/ai-video?api_key=${apiKey}`,
        { method: 'POST', body: formData }
      );

      const testText = await testResponse.text();
      console.log('[TheNewBlack Video] Test response:', testResponse.status, testText.substring(0, 300));

      await logJobLifecycle(serviceClient, user.id, {
        action: 'start_test',
        inputImageUrl: TEST_IMAGE_URL,
        usedImageUrl: TEST_IMAGE_URL,
        providerStatusCode: testResponse.status,
        bodySnippet: testText,
        isSuccess: testResponse.ok && testText.length > 0
      });

      // Parse job ID from test
      let testJobId: string | null = null;
      if (testResponse.ok && testText) {
        try {
          const json = JSON.parse(testText);
          if (json.id || json.job_id) {
            testJobId = json.id || json.job_id;
          }
        } catch {
          // Plain text job ID
          const validPattern = /^(\d+x\d+|\d{10,})$/;
          if (validPattern.test(testText.trim())) {
            testJobId = testText.trim();
          }
        }
      }

      return new Response(
        JSON.stringify({
          ok: testResponse.ok && !!testJobId,
          test: true,
          provider_status: testResponse.status,
          job_id: testJobId,
          body_snippet: testText.substring(0, 200),
          message: testJobId 
            ? 'Provider test successful - credentials work' 
            : 'Provider test failed - check credentials or provider status'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =====================================================
    // Action: start - Start video generation
    // =====================================================
    if (action === 'start') {
      if (!image_url) {
        return new Response(
          JSON.stringify({ ok: false, step: 'validation', error: 'image_url is required' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[TheNewBlack Video] Starting video generation for user:', user.id);
      console.log('[TheNewBlack Video] Original image URL:', image_url);

      // Create provider-safe copy of the image
      // This downloads the original and re-uploads to a dedicated public bucket
      // Ensures stable, non-expiring URL for async video generation
      const copyResult = await createProviderSafeCopy(image_url, user.id, serviceClient);
      
      if (!copyResult.ok) {
        console.error('[TheNewBlack Video] Provider-safe copy failed:', copyResult.error);
        
        await logJobLifecycle(serviceClient, user.id, {
          action: 'start',
          inputImageUrl: image_url,
          step: 'image_copy',
          errorMessage: copyResult.error,
          isSuccess: false
        });

        return new Response(
          JSON.stringify({ 
            ok: false, 
            step: 'image_copy', 
            error: copyResult.error || 'Failed to prepare image for video generation',
            debug: {
              originalUrl: image_url,
              ...copyResult.debug
            }
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const providerSafeUrl = copyResult.publicUrl!;
      console.log('[TheNewBlack Video] Using provider-safe URL:', providerSafeUrl);
      
      // Validate prompt is reasonable
      if (typeof finalPrompt !== 'string' || finalPrompt.trim().length < 3) {
        console.error('[TheNewBlack Video] Prompt is invalid:', finalPrompt);
        return new Response(
          JSON.stringify({ 
            ok: false, 
            step: 'validation', 
            error: 'Server configuration error: VIDEO_PROMPT is missing or empty.' 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('[TheNewBlack Video] Using prompt:', finalPrompt.substring(0, 80) + '...');

      // Check and deduct video credits
      const { data: credits, error: creditsError } = await serviceClient.rpc('get_user_credits', {
        target_user_id: user.id
      });

      if (creditsError || !credits || credits.length === 0) {
        return new Response(
          JSON.stringify({ ok: false, step: 'credits', error: 'Failed to get credits' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (credits[0].video_credits <= 0) {
        return new Response(
          JSON.stringify({ 
            ok: false, 
            step: 'credits',
            error: 'No video credits remaining',
            credits_remaining: 0,
            is_premium: credits[0].is_premium
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Deduct video credit before processing
      const { data: deductResult, error: deductError } = await serviceClient.rpc('deduct_video_credit', {
        target_user_id: user.id
      });

      if (deductError || !deductResult) {
        console.error('[TheNewBlack Video] Failed to deduct credit:', deductError);
        return new Response(
          JSON.stringify({ ok: false, step: 'credits', error: 'Failed to deduct credit' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Call The New Black API to start video generation
      const formData = new FormData();
      formData.append('image', providerSafeUrl);  // Use provider-safe URL
      formData.append('prompt', finalPrompt);
      formData.append('time', finalTime);

      // Enhanced logging for debugging
      console.log('[TheNewBlack Video] Request details:', {
        endpoint: 'https://thenewblack.ai/api/1.1/wf/ai-video',
        hasApiKey: !!apiKey,
        apiKeyPrefix: apiKey?.substring(0, 8) + '...',
        providerSafeUrl: providerSafeUrl.substring(0, 80) + '...',
        promptLength: finalPrompt.length,
        time: finalTime
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

        await logJobLifecycle(serviceClient, user.id, {
          action: 'start',
          inputImageUrl: image_url,
          usedImageUrl: providerSafeUrl,
          step: 'provider_start',
          providerStatusCode: apiResponse.status,
          bodySnippet: responseText,
          errorMessage: `API error: ${apiResponse.status}`,
          isSuccess: false
        });

        return new Response(
          JSON.stringify({ 
            ok: false, 
            step: 'provider_start',
            provider_status: apiResponse.status,
            body_snippet: responseText.substring(0, 200),
            debug: {
              originalUrl: image_url,
              usedUrl: providerSafeUrl
            },
            error: `Video API error: ${apiResponse.status}` 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check for empty response
      if (!responseText || responseText.trim().length === 0) {
        console.error('[TheNewBlack Video] Empty response from API');
        
        // Refund credit
        await serviceClient.from('user_credits')
          .update({ video_credits: credits[0].video_credits })
          .eq('user_id', user.id);

        await logJobLifecycle(serviceClient, user.id, {
          action: 'start',
          inputImageUrl: image_url,
          usedImageUrl: providerSafeUrl,
          step: 'provider_start',
          providerStatusCode: apiResponse.status,
          bodySnippet: '(empty)',
          errorMessage: 'Empty response',
          isSuccess: false
        });

        return new Response(
          JSON.stringify({ 
            ok: false, 
            step: 'provider_start',
            provider_status: apiResponse.status,
            body_snippet: '(empty)',
            debug: {
              originalUrl: image_url,
              usedUrl: providerSafeUrl
            },
            error: 'Video provider returned empty response.' 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

          await logJobLifecycle(serviceClient, user.id, {
            action: 'start',
            inputImageUrl: image_url,
            usedImageUrl: providerSafeUrl,
            step: 'provider_start',
            providerStatusCode: apiResponse.status,
            bodySnippet: responseText,
            errorMessage: 'Empty success response - no job ID',
            isSuccess: false
          });

          return new Response(
            JSON.stringify({ 
              ok: false, 
              step: 'provider_start',
              provider_status: apiResponse.status,
              body_snippet: responseText.substring(0, 200),
              debug: {
                originalUrl: image_url,
                usedUrl: providerSafeUrl,
                parsedResponse: jsonResponse
              },
              error: 'Video provider returned empty response. This may indicate: 1) API key issue, 2) Image format not supported, or 3) Provider service issue. Please try a different image or contact support.' 
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Check if it's an error response
        if (jsonResponse.status === 'error' || jsonResponse.error) {
          console.error('[TheNewBlack Video] API returned error:', jsonResponse);
          
          // Refund credit
          await serviceClient.from('user_credits')
            .update({ video_credits: credits[0].video_credits })
            .eq('user_id', user.id);

          await logJobLifecycle(serviceClient, user.id, {
            action: 'start',
            inputImageUrl: image_url,
            usedImageUrl: providerSafeUrl,
            step: 'provider_start',
            providerStatusCode: apiResponse.status,
            bodySnippet: responseText,
            errorMessage: jsonResponse.message || jsonResponse.error || 'API error',
            isSuccess: false
          });

          return new Response(
            JSON.stringify({ 
              ok: false, 
              step: 'provider_start',
              provider_status: apiResponse.status,
              body_snippet: responseText.substring(0, 200),
              debug: {
                originalUrl: image_url,
                usedUrl: providerSafeUrl
              },
              error: jsonResponse.message || jsonResponse.error || 'API error' 
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

        await logJobLifecycle(serviceClient, user.id, {
          action: 'start',
          inputImageUrl: image_url,
          usedImageUrl: providerSafeUrl,
          step: 'provider_start',
          providerStatusCode: apiResponse.status,
          bodySnippet: cleanJobId,
          errorMessage: 'Invalid job ID format',
          isSuccess: false
        });

        return new Response(
          JSON.stringify({ 
            ok: false, 
            step: 'provider_start',
            provider_status: apiResponse.status,
            body_snippet: cleanJobId.substring(0, 100),
            debug: {
              originalUrl: image_url,
              usedUrl: providerSafeUrl
            },
            error: 'Invalid job ID format received from API. Please try again.' 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Success! Log and return
      await logJobLifecycle(serviceClient, user.id, {
        action: 'start',
        inputImageUrl: image_url,
        usedImageUrl: providerSafeUrl,
        jobId: cleanJobId,
        step: 'provider_start',
        providerStatusCode: apiResponse.status,
        isSuccess: true
      });

      return new Response(
        JSON.stringify({ 
          ok: true, 
          job_id: cleanJobId,
          status: 'processing',
          message: 'Video generation started. Check back in 2-5 minutes.',
          credits_remaining: credits[0].video_credits - 1,
          debug: {
            usedUrl: providerSafeUrl
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =====================================================
    // Action: check - Check video status and retrieve result
    // =====================================================
    if (action === 'check') {
      if (!job_id) {
        return new Response(
          JSON.stringify({ ok: false, step: 'validation', error: 'job_id is required' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[TheNewBlack Video] Checking job status:', job_id);

      // Call The New Black API to get video result (use api_key in URL per docs)
      const formData = new FormData();
      formData.append('id', job_id);

      let apiResponse: Response;
      let resultText: string;

      try {
        apiResponse = await fetch(
          `https://thenewblack.ai/api/1.1/wf/results_video?api_key=${apiKey}`,
          {
            method: 'POST',
            body: formData
          }
        );

        resultText = await apiResponse.text();
        console.log('[TheNewBlack Video] Poll response:', {
          status: apiResponse.status,
          bodyLength: resultText.length,
          bodyPreview: resultText.substring(0, 200)
        });
      } catch (err) {
        console.error('[TheNewBlack Video] Poll fetch error:', err);
        
        // Treat network errors as "still processing" - don't fail the entire job
        return new Response(
          JSON.stringify({ 
            ok: true, 
            status: 'processing',
            message: 'Checking video status... Please wait.',
            debug: {
              error: err instanceof Error ? err.message : 'Network error'
            }
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Handle non-2xx responses gracefully - treat as "still processing"
      if (!apiResponse.ok) {
        console.log('[TheNewBlack Video] Poll returned non-2xx:', apiResponse.status);
        
        // Log but don't fail - provider may be temporarily unavailable
        await logJobLifecycle(serviceClient, user.id, {
          action: 'check',
          jobId: job_id,
          step: 'provider_poll',
          providerStatusCode: apiResponse.status,
          bodySnippet: resultText,
          errorMessage: `Poll returned ${apiResponse.status}`,
          isSuccess: false
        });

        // Treat 404 "workflow not found" as permanent error
        if (apiResponse.status === 404 && resultText.includes('Workflow not found')) {
          return new Response(
            JSON.stringify({ 
              ok: false, 
              step: 'provider_poll',
              provider_status: apiResponse.status,
              body_snippet: resultText.substring(0, 200),
              error: 'Video workflow not found. Please try generating again.' 
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // For other errors, treat as "still processing"
        return new Response(
          JSON.stringify({ 
            ok: true, 
            status: 'processing',
            message: 'Video is still being generated. Please wait...',
            debug: {
              provider_status: apiResponse.status,
              body_snippet: resultText.substring(0, 100)
            }
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if result is ready (URL starts with http)
      if (!resultText || !resultText.startsWith('http')) {
        // Still processing
        return new Response(
          JSON.stringify({ 
            ok: true, 
            status: 'processing',
            message: 'Video is still being generated. Please wait...',
            debug: {
              response_preview: resultText?.substring(0, 50)
            }
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Video is ready - download and store
      console.log('[TheNewBlack Video] Video ready, downloading...');
      const videoResponse = await fetch(resultText.trim());
      if (!videoResponse.ok) {
        console.error('[TheNewBlack Video] Failed to download video');
        
        // Return the original URL if download fails - user can still use it
        await logJobLifecycle(serviceClient, user.id, {
          action: 'check',
          jobId: job_id,
          step: 'download',
          providerStatusCode: videoResponse.status,
          errorMessage: 'Failed to download video',
          isSuccess: true  // Technically successful - we have the URL
        });

        return new Response(
          JSON.stringify({ 
            ok: true, 
            result_url: resultText.trim(), 
            stored: false, 
            status: 'completed',
            message: 'Video ready (original URL)'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const videoBlob = await videoResponse.blob();
      const fileName = `${user.id}/${Date.now()}.mp4`;

      // Upload to Supabase storage
      const { error: uploadError } = await serviceClient.storage
        .from('ai-tryon-videos')
        .upload(fileName, videoBlob, {
          contentType: 'video/mp4',
          upsert: true
        });

      if (uploadError) {
        console.error('[TheNewBlack Video] Upload error:', uploadError);
        // Return the original URL if upload fails
        return new Response(
          JSON.stringify({ 
            ok: true, 
            result_url: resultText.trim(), 
            stored: false, 
            status: 'completed',
            message: 'Video ready (storage upload failed)'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get public URL
      const { data: publicUrl } = serviceClient.storage
        .from('ai-tryon-videos')
        .getPublicUrl(fileName);

      console.log('[TheNewBlack Video] Stored at:', publicUrl.publicUrl);

      // Check if asset already exists for this job (prevents duplicate saves)
      const { data: existingAsset } = await serviceClient
        .from('ai_assets')
        .select('id')
        .eq('job_id', job_id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!existingAsset) {
        // Save to ai_assets table (use existing columns, no metadata column)
        const { error: assetError } = await serviceClient.from('ai_assets').insert({
          user_id: user.id,
          job_id: job_id,
          asset_url: publicUrl.publicUrl,
          asset_type: 'tryon_video',
          title: `AI Video ${new Date().toLocaleDateString()}`
        });

        if (assetError) {
          console.error('[TheNewBlack Video] Failed to save asset:', assetError);
        }
      } else {
        console.log('[TheNewBlack Video] Asset already exists for job:', job_id);
      }

      // Log success
      await logJobLifecycle(serviceClient, user.id, {
        action: 'check',
        jobId: job_id,
        step: 'complete',
        isSuccess: true
      });

      return new Response(
        JSON.stringify({ 
          ok: true, 
          result_url: publicUrl.publicUrl,
          stored: true,
          status: 'completed',
          message: 'Video ready!'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ ok: false, step: 'validation', error: 'Invalid action. Use "start", "check", or "start_test"' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[TheNewBlack Video] Unhandled error:', error);
    return new Response(
      JSON.stringify({ 
        ok: false, 
        step: 'server_error',
        error: error instanceof Error ? error.message : 'Unknown server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
