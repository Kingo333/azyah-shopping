import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isEventOpen, resolvePersonPath, resultPath } from "./rules.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const PHOTO_BUCKET = 'event-user-photos';
// Results go where photo try-on results go, so they keep working in the
// AI Studio gallery (permanent, unguessable links). Making all try-on results
// private is a separate change to AI Studio.
const RESULT_BUCKET = 'ai-tryon-results';
const PERSON_LINK_SECONDS = 600;   // long enough for the provider to fetch the photo

const TNB_PROMPT = 'Preserve the exact same person (face, body, skin tone, pose) and the exact same background from the model image. Replace ONLY the item being tried on with the provided clothing/accessory, keeping its true colors, print, embroidery, texture, edges, and proportions. Match the original lighting, shadows, and perspective so it looks naturally worn. Keep everything else in the image unchanged. Output should look photo-realistic.';

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

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
      return json({ ok: false, error: 'API key not configured' }, 500);
    }

    // 1. Signed-in user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ ok: false, error: 'Unauthorized' }, 401);
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) return json({ ok: false, error: 'Unauthorized' }, 401);
    const userId = claimsData.claims.sub as string;

    // 2. Request
    const body = await req.json();
    const { event_id, product_id, person_image_path, person_image_url } = body ?? {};
    if (!event_id || !product_id || (!person_image_path && !person_image_url)) {
      return json({ ok: false, error: 'event_id, product_id and person_image_path are required' }, 400);
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // 3. Event must be running
    const { data: event } = await serviceClient
      .from('retail_events')
      .select('id, status, event_date, end_date')
      .eq('id', event_id)
      .maybeSingle();
    if (!event || !isEventOpen(event, new Date().toISOString().slice(0, 10))) {
      return json({ ok: false, error: "This event isn't running right now" }, 403);
    }

    // 4. Item must belong to this event
    const { data: product } = await serviceClient
      .from('event_brand_products')
      .select('image_url, try_on_data, try_on_config, event_brand_id')
      .eq('id', product_id)
      .maybeSingle();
    const { data: eventBrand } = product
      ? await serviceClient.from('event_brands').select('event_id').eq('id', product.event_brand_id).maybeSingle()
      : { data: null };
    if (!product || eventBrand?.event_id !== event_id) {
      return json({ ok: false, error: 'Product not found' }, 404);
    }
    const outfitImageUrl =
      product.try_on_config?.outfit_image_url ||
      product.try_on_data?.outfit_image_url ||
      product.image_url;

    // 5. Photo must be the caller's own upload for this event
    const personPath = resolvePersonPath({ person_image_path, person_image_url }, event_id, userId, supabaseUrl);
    if (!personPath) return json({ ok: false, error: 'Please upload your photo again' }, 403);
    const { data: personLink, error: personLinkError } = await serviceClient.storage
      .from(PHOTO_BUCKET)
      .createSignedUrl(personPath, PERSON_LINK_SECONDS);
    if (personLinkError || !personLink?.signedUrl) {
      return json({ ok: false, error: 'Please upload your photo again' }, 404);
    }

    // 6. Credits: same rules as thenewblack-picture (one AI credit per try-on)
    const { data: credits, error: creditsError } = await serviceClient.rpc('get_user_credits', { target_user_id: userId });
    if (creditsError || !credits || credits.length === 0) {
      return json({ ok: false, error: 'Failed to get credits' }, 500);
    }
    const creditsBefore = credits[0].ai_studio_credits;
    if (creditsBefore <= 0) {
      return json({ ok: false, error: 'No picture credits remaining', credits_remaining: 0 }, 402);
    }
    const { error: deductError } = await serviceClient.rpc('deduct_ai_studio_credit', { target_user_id: userId });
    if (deductError) {
      console.error('[TNB Event TryOn] Failed to deduct credit:', deductError.message);
      return json({ ok: false, error: 'Failed to deduct credit' }, 500);
    }
    const refund = () => serviceClient.from('user_credits')
      .update({ ai_studio_credits: creditsBefore })
      .eq('user_id', userId);

    // 7. Job record
    const { data: job, error: jobError } = await serviceClient
      .from('event_tryon_jobs')
      .insert({
        event_id,
        product_id,
        user_id: userId,
        input_person_path: personPath,
        input_outfit_path: outfitImageUrl,
        provider: 'thenewblack',
        status: 'processing',
        started_at: new Date().toISOString(),
        credits_used: 1,
      })
      .select('id')
      .single();
    if (jobError) console.error('[TNB Event TryOn] Job creation error:', jobError.message);
    const markJob = (fields: Record<string, unknown>) => job
      ? serviceClient.from('event_tryon_jobs').update({ ...fields, completed_at: new Date().toISOString() }).eq('id', job.id)
      : Promise.resolve();

    // 8. The New Black
    const formData = new FormData();
    formData.append('model_photo', personLink.signedUrl);
    formData.append('clothing_photo', outfitImageUrl);
    formData.append('ratio', 'auto');
    formData.append('prompt', TNB_PROMPT);
    const apiResponse = await fetch(`https://thenewblack.ai/api/1.1/wf/vto_stream?api_key=${apiKey}`, {
      method: 'POST',
      body: formData,
    });
    if (!apiResponse.ok) {
      console.error('[TNB Event TryOn] API error:', apiResponse.status);
      await refund();
      await markJob({ status: 'failed', error: `API error: ${apiResponse.status}`, credits_used: 0 });
      return json({ ok: false, error: `API error: ${apiResponse.status}` }, 500);
    }
    const resultUrl = (await apiResponse.text()).trim();
    if (!resultUrl.startsWith('http')) {
      await refund();
      await markJob({ status: 'failed', error: 'Invalid response from API', credits_used: 0 });
      return json({ ok: false, error: 'Invalid response from API' }, 500);
    }

    // 9. Store the result with the other try-on results
    const imageResponse = await fetch(resultUrl);
    if (!imageResponse.ok) {
      await markJob({ status: 'succeeded', output_path: resultUrl });
      return json({ ok: true, result_url: resultUrl, job_id: job?.id });
    }
    const outputPath = resultPath(event_id, userId, product_id, Date.now());
    const { error: uploadError } = await serviceClient.storage
      .from(RESULT_BUCKET)
      .upload(outputPath, await imageResponse.blob(), { contentType: 'image/png', upsert: true });
    if (uploadError) {
      console.error('[TNB Event TryOn] Upload error:', uploadError.message);
      await markJob({ status: 'succeeded', output_path: resultUrl });
      return json({ ok: true, result_url: resultUrl, job_id: job?.id });
    }
    const { data: stored } = serviceClient.storage.from(RESULT_BUCKET).getPublicUrl(outputPath);
    await markJob({ status: 'succeeded', output_path: stored.publicUrl });

    return json({ ok: true, result_url: stored.publicUrl, job_id: job?.id });
  } catch (error) {
    console.error('[TNB Event TryOn] Error:', error instanceof Error ? error.message : error);
    return json({ ok: false, error: 'Something went wrong. Please try again.' }, 500);
  }
});
