import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VIDEO_PROMPT = "Front-facing model looks into camera from the image, does a slow 360° turn to show front/side/back, then returns to face camera and holds a final pose to display the full outfit.";

// Known-good test image for provider diagnostics
const TEST_IMAGE_URL = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&q=80";

// Helper: Check if URL looks like a signed/expiring URL
function isSignedUrl(url: string): boolean {
  const signedPatterns = ['token=', 'X-Amz-', 'expires=', 'signature=', 'sig=', 'Expires='];
  return signedPatterns.some(p => url.toLowerCase().includes(p.toLowerCase()));
}

// Helper: Transform Supabase storage URL to render URL for better compatibility
function transformToRenderUrl(imageUrl: string, supabaseUrl: string): string | null {
  // Pattern: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
  const objectPattern = /\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/;
  const match = imageUrl.match(objectPattern);
  
  if (match && imageUrl.startsWith(supabaseUrl)) {
    const bucket = match[1];
    const path = match[2];
    // Transform to render URL with resize/format for better provider compatibility
    return `${supabaseUrl}/storage/v1/render/image/public/${bucket}/${path}?width=1024&quality=80&format=jpg`;
  }
  return null;
}

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

      // Check if URL is signed/expiring
      const isSigned = isSignedUrl(image_url);
      console.log('[TheNewBlack Video] Is signed URL:', isSigned);

      // Try to transform Supabase storage URL to render URL
      let usedImageUrl = image_url;
      const renderUrl = transformToRenderUrl(image_url, supabaseUrl);
      if (renderUrl) {
        console.log('[TheNewBlack Video] Transformed to render URL:', renderUrl);
        usedImageUrl = renderUrl;
      }

      // Verify image URL is publicly accessible AND is actually an image
      console.log('[TheNewBlack Video] Verifying image URL accessibility...');
      let imageCheckStatus = 0;
      let imageCheckContentType = '';
      
      try {
        const imageCheck = await fetch(usedImageUrl, { method: 'GET' });
        imageCheckStatus = imageCheck.status;
        imageCheckContentType = imageCheck.headers.get('content-type') || '';
        
        console.log('[TheNewBlack Video] Image check:', {
          status: imageCheckStatus,
          contentType: imageCheckContentType,
          isImage: imageCheckContentType.startsWith('image/')
        });
        
        if (!imageCheck.ok) {
          console.error('[TheNewBlack Video] Image URL not accessible:', imageCheckStatus);
          
          await logJobLifecycle(serviceClient, user.id, {
            action: 'start',
            inputImageUrl: image_url,
            usedImageUrl,
            step: 'image_url_check',
            providerStatusCode: imageCheckStatus,
            errorMessage: 'Image URL not accessible',
            isSuccess: false
          });

          return new Response(
            JSON.stringify({ 
              ok: false, 
              step: 'image_url_check', 
              provider_status: imageCheckStatus,
              debug: {
                originalUrl: image_url,
                usedUrl: usedImageUrl,
                isSigned,
                contentType: imageCheckContentType
              },
              error: 'Image URL is not publicly accessible. Please re-upload the image.' 
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        if (!imageCheckContentType.startsWith('image/')) {
          console.error('[TheNewBlack Video] URL is not an image:', imageCheckContentType);
          
          await logJobLifecycle(serviceClient, user.id, {
            action: 'start',
            inputImageUrl: image_url,
            usedImageUrl,
            step: 'image_url_check',
            errorMessage: `Not an image: ${imageCheckContentType}`,
            isSuccess: false
          });

          return new Response(
            JSON.stringify({ 
              ok: false, 
              step: 'image_url_check', 
              debug: {
                originalUrl: image_url,
                usedUrl: usedImageUrl,
                isSigned,
                contentType: imageCheckContentType
              },
              error: `URL must return a valid image. Got: ${imageCheckContentType}` 
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        console.log('[TheNewBlack Video] Image URL verified as valid image');
      } catch (err) {
        console.error('[TheNewBlack Video] Image URL check error:', err);
        
        await logJobLifecycle(serviceClient, user.id, {
          action: 'start',
          inputImageUrl: image_url,
          usedImageUrl,
          step: 'image_url_check',
          errorMessage: err instanceof Error ? err.message : 'Fetch failed',
          isSuccess: false
        });

        return new Response(
          JSON.stringify({ 
            ok: false, 
            step: 'image_url_check',
            debug: {
              originalUrl: image_url,
              usedUrl: usedImageUrl,
              isSigned,
              error: err instanceof Error ? err.message : 'Unknown'
            },
            error: 'Failed to verify image URL accessibility. Please try re-uploading.' 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
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
      formData.append('image', usedImageUrl);  // Use transformed URL
      formData.append('prompt', finalPrompt);
      formData.append('time', finalTime);

      // Enhanced logging for debugging
      console.log('[TheNewBlack Video] Request details:', {
        endpoint: 'https://thenewblack.ai/api/1.1/wf/ai-video',
        hasApiKey: !!apiKey,
        apiKeyPrefix: apiKey?.substring(0, 8) + '...',
        usedImageUrl: usedImageUrl.substring(0, 80) + '...',
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
          usedImageUrl,
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
              usedUrl: usedImageUrl,
              isSigned
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
          usedImageUrl,
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
              usedUrl: usedImageUrl,
              isSigned
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
            usedImageUrl,
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
                usedUrl: usedImageUrl,
                isSigned,
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
            usedImageUrl,
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
                usedUrl: usedImageUrl,
                isSigned
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
          usedImageUrl,
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
              usedUrl: usedImageUrl,
              isSigned
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
        usedImageUrl,
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
            usedUrl: usedImageUrl,
            isSigned
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

      // Call The New Black API to get video result
      const formData = new FormData();
      formData.append('email', tnbEmail);
      formData.append('password', tnbPassword);
      formData.append('id', job_id);

      let apiResponse: Response;
      let resultText: string;

      try {
        apiResponse = await fetch(
          'https://thenewblack.ai/api/1.1/wf/results_video',
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

      // Save to ai_assets table
      await serviceClient.from('ai_assets').insert({
        user_id: user.id,
        asset_url: publicUrl.publicUrl,
        asset_type: 'tryon_video',
        metadata: {
          job_id: job_id,
          provider: 'thenewblack',
          original_url: resultText.trim()
        }
      });

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
