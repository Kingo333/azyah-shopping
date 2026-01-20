import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
        JSON.stringify({ ok: false, error: 'API key not configured' }),
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
    const { model_photo_url, clothing_photo_url } = await req.json();

    if (!model_photo_url || !clothing_photo_url) {
      return new Response(
        JSON.stringify({ ok: false, error: 'model_photo_url and clothing_photo_url are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[TheNewBlack Picture] Starting try-on for user:', user.id);
    console.log('[TheNewBlack Picture] Model photo:', model_photo_url);
    console.log('[TheNewBlack Picture] Clothing photo:', clothing_photo_url);

    // Create service client for database operations
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check and deduct credits
    const { data: credits, error: creditsError } = await serviceClient.rpc('get_user_credits', {
      target_user_id: user.id
    });

    if (creditsError || !credits || credits.length === 0) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Failed to get credits' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (credits[0].ai_studio_credits <= 0) {
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: 'No picture credits remaining',
          credits_remaining: 0
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Deduct credit before processing
    const { error: deductError } = await serviceClient.rpc('deduct_ai_studio_credit', {
      target_user_id: user.id
    });

    if (deductError) {
      console.error('[TheNewBlack Picture] Failed to deduct credit:', deductError);
      return new Response(
        JSON.stringify({ ok: false, error: 'Failed to deduct credit' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call The New Black API
    const formData = new FormData();
    formData.append('model_photo', model_photo_url);
    formData.append('clothing_photo', clothing_photo_url);
    formData.append('ratio', 'auto');
    formData.append('prompt', 'virtual try on');

    console.log('[TheNewBlack Picture] Calling API...');
    
    const apiResponse = await fetch(
      `https://thenewblack.ai/api/1.1/wf/vto_stream?api_key=${apiKey}`,
      {
        method: 'POST',
        body: formData
      }
    );

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error('[TheNewBlack Picture] API error:', apiResponse.status, errorText);
      
      // Refund credit on API failure
      await serviceClient.from('user_credits')
        .update({ ai_studio_credits: credits[0].ai_studio_credits })
        .eq('user_id', user.id);

      return new Response(
        JSON.stringify({ ok: false, error: `API error: ${apiResponse.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // The API returns the image URL directly as text
    const resultUrl = await apiResponse.text();
    console.log('[TheNewBlack Picture] Result URL:', resultUrl);

    if (!resultUrl || !resultUrl.startsWith('http')) {
      console.error('[TheNewBlack Picture] Invalid result URL:', resultUrl);
      
      // Refund credit on invalid result
      await serviceClient.from('user_credits')
        .update({ ai_studio_credits: credits[0].ai_studio_credits })
        .eq('user_id', user.id);

      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid response from API' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Download the image and store in Supabase storage
    console.log('[TheNewBlack Picture] Downloading result image...');
    const imageResponse = await fetch(resultUrl.trim());
    if (!imageResponse.ok) {
      console.error('[TheNewBlack Picture] Failed to download result image');
      return new Response(
        JSON.stringify({ ok: true, result_url: resultUrl.trim(), stored: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const imageBlob = await imageResponse.blob();
    const fileName = `${user.id}/${Date.now()}.png`;

    // Upload to Supabase storage
    const { data: uploadData, error: uploadError } = await serviceClient.storage
      .from('ai-tryon-results')
      .upload(fileName, imageBlob, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) {
      console.error('[TheNewBlack Picture] Upload error:', uploadError);
      // Return the original URL if upload fails
      return new Response(
        JSON.stringify({ ok: true, result_url: resultUrl.trim(), stored: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get public URL
    const { data: publicUrl } = serviceClient.storage
      .from('ai-tryon-results')
      .getPublicUrl(fileName);

    console.log('[TheNewBlack Picture] Stored at:', publicUrl.publicUrl);

    // Save to ai_assets table
    await serviceClient.from('ai_assets').insert({
      user_id: user.id,
      asset_url: publicUrl.publicUrl,
      asset_type: 'tryon_result',
      metadata: {
        model_photo: model_photo_url,
        clothing_photo: clothing_photo_url,
        provider: 'thenewblack',
        original_url: resultUrl.trim()
      }
    });

    return new Response(
      JSON.stringify({ 
        ok: true, 
        result_url: publicUrl.publicUrl,
        stored: true,
        credits_remaining: credits[0].ai_studio_credits - 1
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[TheNewBlack Picture] Error:', error);
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
