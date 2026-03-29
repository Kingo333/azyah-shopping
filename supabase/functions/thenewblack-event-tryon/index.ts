import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const apiKey = Deno.env.get('THE_NEW_BLACK_API_KEY');

    if (!apiKey) {
      console.error('[TNB Event TryOn] THE_NEW_BLACK_API_KEY not configured');
      return new Response(
        JSON.stringify({ ok: false, error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const user = { id: claimsData.claims.sub };

    // Parse and validate request body
    const body = await req.json();
    const { event_id, product_id, person_image_url } = body;

    if (!event_id || !product_id || !person_image_url) {
      return new Response(
        JSON.stringify({ ok: false, error: 'event_id, product_id, and person_image_url are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[TNB Event TryOn] Starting for user:', user.id, 'product:', product_id);

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get product's outfit image
    const { data: product, error: productError } = await serviceClient
      .from('event_brand_products')
      .select('image_url, try_on_data, try_on_config')
      .eq('id', product_id)
      .single();

    if (productError || !product) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Product not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Resolve outfit image URL (prefer try_on_config, fall back to product image)
    const outfitImageUrl = 
      product.try_on_config?.outfit_image_url || 
      product.try_on_data?.outfit_image_url || 
      product.image_url;

    console.log('[TNB Event TryOn] Person:', person_image_url);
    console.log('[TNB Event TryOn] Outfit:', outfitImageUrl);

    // Resolve person image URL (might be a storage path)
    let resolvedPersonUrl = person_image_url;
    if (!person_image_url.startsWith('http')) {
      const { data: urlData } = serviceClient.storage
        .from('event-user-photos')
        .getPublicUrl(person_image_url);
      resolvedPersonUrl = urlData.publicUrl;
    }

    // Create job record for history tracking
    const { data: job, error: jobError } = await serviceClient
      .from('event_tryon_jobs')
      .insert({
        event_id,
        product_id,
        user_id: user.id,
        input_person_path: person_image_url,
        input_outfit_path: outfitImageUrl,
        provider: 'thenewblack',
        status: 'processing',
        started_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (jobError) {
      console.error('[TNB Event TryOn] Job creation error:', jobError);
    }

    // Call The New Black API
    const formData = new FormData();
    formData.append('model_photo', resolvedPersonUrl);
    formData.append('clothing_photo', outfitImageUrl);
    formData.append('ratio', 'auto');
    formData.append('prompt', 'Preserve the exact same person (face, body, skin tone, pose) and the exact same background from the model image. Replace ONLY the item being tried on with the provided clothing/accessory, keeping its true colors, print, embroidery, texture, edges, and proportions. Match the original lighting, shadows, and perspective so it looks naturally worn. Keep everything else in the image unchanged. Output should look photo-realistic.');

    console.log('[TNB Event TryOn] Calling The New Black API...');

    const apiResponse = await fetch(
      `https://thenewblack.ai/api/1.1/wf/vto_stream?api_key=${apiKey}`,
      {
        method: 'POST',
        body: formData
      }
    );

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error('[TNB Event TryOn] API error:', apiResponse.status, errorText);

      if (job) {
        await serviceClient.from('event_tryon_jobs').update({
          status: 'failed',
          error: `API error: ${apiResponse.status}`,
          completed_at: new Date().toISOString()
        }).eq('id', job.id);
      }

      return new Response(
        JSON.stringify({ ok: false, error: `API error: ${apiResponse.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resultUrl = await apiResponse.text();
    console.log('[TNB Event TryOn] Result URL:', resultUrl);

    if (!resultUrl || !resultUrl.trim().startsWith('http')) {
      if (job) {
        await serviceClient.from('event_tryon_jobs').update({
          status: 'failed',
          error: 'Invalid response from API',
          completed_at: new Date().toISOString()
        }).eq('id', job.id);
      }

      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid response from API' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Download and store result in Supabase storage
    console.log('[TNB Event TryOn] Downloading result image...');
    const imageResponse = await fetch(resultUrl.trim());
    
    if (!imageResponse.ok) {
      // Return the direct URL if download fails
      if (job) {
        await serviceClient.from('event_tryon_jobs').update({
          status: 'succeeded',
          output_path: resultUrl.trim(),
          completed_at: new Date().toISOString()
        }).eq('id', job.id);
      }

      return new Response(
        JSON.stringify({ ok: true, result_url: resultUrl.trim() }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const imageBlob = await imageResponse.blob();
    const fileName = `${event_id}/${product_id}/${user.id}_${Date.now()}.png`;

    const { error: uploadError } = await serviceClient.storage
      .from('event-tryon-results')
      .upload(fileName, imageBlob, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) {
      console.error('[TNB Event TryOn] Upload error:', uploadError);
      // Return direct URL as fallback
      if (job) {
        await serviceClient.from('event_tryon_jobs').update({
          status: 'succeeded',
          output_path: resultUrl.trim(),
          completed_at: new Date().toISOString()
        }).eq('id', job.id);
      }

      return new Response(
        JSON.stringify({ ok: true, result_url: resultUrl.trim() }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: publicUrl } = serviceClient.storage
      .from('event-tryon-results')
      .getPublicUrl(fileName);

    // Update job as succeeded
    if (job) {
      await serviceClient.from('event_tryon_jobs').update({
        status: 'succeeded',
        output_path: fileName,
        completed_at: new Date().toISOString()
      }).eq('id', job.id);
    }

    console.log('[TNB Event TryOn] Complete:', publicUrl.publicUrl);

    return new Response(
      JSON.stringify({ 
        ok: true, 
        result_url: publicUrl.publicUrl,
        job_id: job?.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[TNB Event TryOn] Error:', error);
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
