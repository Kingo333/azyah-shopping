
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const LEGO_PROMPT = `Create a LEGO mini-figure version of the person in the uploaded photo, wearing the exact same outfit, accessories, and hairstyle. Replicate all clothing details, patterns, and colors exactly, including any printed text on clothing, denim styles, jewelry, headwear, phone case designs, handbags, or boots. The LEGO figure should mimic the identical facial expression, stance, and pose as the person in the image, while holding the same objects in the same way. Maintain realistic LEGO proportions and brick-like textures while ensuring accurate color matching to the original photo. Render with a transparent background and no shadows so it can be used in various layouts. The style should be consistent with authentic LEGO mini-figure aesthetics.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  
  // Health endpoint
  if (req.method === 'GET' && url.pathname.endsWith('/health')) {
    const hasKey = !!openAIApiKey;
    return new Response(JSON.stringify({
      ok: hasKey,
      model: "gpt-image-1 (images/edits)",
      hasKey: hasKey,
      apiType: "OpenAI Images API - Edits"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: hasKey ? 200 : 500,
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    if (!openAIApiKey) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY missing in function environment" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const requestBody = await req.json().catch(() => ({}));
    const { toyReplicaId } = requestBody;

    if (!toyReplicaId) {
      return new Response(JSON.stringify({ error: "toyReplicaId is required" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Processing toy replica generation for toyReplicaId:', toyReplicaId);

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the toy replica record
    const { data: toyReplica, error: fetchError } = await supabase
      .from('toy_replicas')
      .select('*')
      .eq('id', toyReplicaId)
      .single();

    if (fetchError || !toyReplica) {
      console.error('Failed to fetch toy replica:', fetchError);
      return new Response(JSON.stringify({ error: "Toy replica not found" }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check premium subscription status
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status, current_period_end')
      .eq('user_id', toyReplica.user_id)
      .maybeSingle();

    const now = new Date();
    const isPremiumActive = subscription && 
      (subscription.status === 'active' || subscription.status === 'canceled') &&
      subscription.current_period_end && 
      new Date(subscription.current_period_end) >= now;

    console.log('Premium subscription check:', {
      userId: toyReplica.user_id,
      subscription: subscription,
      isPremiumActive: isPremiumActive
    });

    // If not premium, enforce 4 total generation limit
    if (!isPremiumActive) {
      const { count, error: countError } = await supabase
        .from('toy_replicas')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', toyReplica.user_id)
        .eq('status', 'succeeded');

      if (countError) {
        console.error('Failed to count user generations:', countError);
        return new Response(JSON.stringify({ error: "Failed to check generation limit" }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`Basic user ${toyReplica.user_id} has ${count}/4 generations used`);

      if ((count ?? 0) >= 4) {
        console.log(`User ${toyReplica.user_id} has reached generation limit: ${count}/4`);
        return new Response(JSON.stringify({ 
          error: "Limit reached. Upgrade to Premium for full access.",
          upgrade_required: true
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      console.log(`Premium user ${toyReplica.user_id} has unlimited generations`);
    }

    // Update status to processing
    await supabase
      .from('toy_replicas')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', toyReplicaId);

    // Download the source image
    console.log('Downloading source image from:', toyReplica.source_url);
    const { data: imageData, error: downloadError } = await supabase.storage
      .from('toy-replica-source')
      .download(toyReplica.source_url);

    if (downloadError || !imageData) {
      console.error('Failed to download source image:', downloadError);
      await supabase
        .from('toy_replicas')
        .update({ 
          status: 'failed', 
          error: `Failed to download source image: ${downloadError?.message}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', toyReplicaId);
      
      return new Response(JSON.stringify({ error: "Failed to download source image" }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Convert blob to bytes
    const imageBytes = new Uint8Array(await imageData.arrayBuffer());
    const imageMime = imageData.type || 'image/jpeg';

    console.log('Calling OpenAI Images API - Edits...');

    // Create form data for OpenAI Images API - Edits
    const form = new FormData();
    form.set("model", "gpt-image-1");
    form.set("prompt", LEGO_PROMPT);
    form.set("size", "1024x1024");
    form.set("background", "transparent");
    form.set("quality", "medium"); // Force medium quality ($0.04 cost)
    
    // Add the image file
    const imageBlob = new Blob([imageBytes], { type: imageMime });
    const fileExtension = imageMime.split("/")[1] || "jpg";
    form.append("image", imageBlob, `source.${fileExtension}`);

    // Call OpenAI Images API - Edits
    const response = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAIApiKey}`,
      },
      body: form
    });

    console.log('OpenAI API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      
      await supabase
        .from('toy_replicas')
        .update({ 
          status: 'failed', 
          error: `OpenAI API error: ${response.status} ${errorText}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', toyReplicaId);
      
      return new Response(JSON.stringify({ 
        error: `OpenAI Images API failed: ${response.status} ${errorText}` 
      }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await response.json();
    console.log('OpenAI API response received');

    // Extract the generated image
    const b64Image = result?.data?.[0]?.b64_json;
    if (!b64Image) {
      console.error('No image returned from OpenAI:', result);
      
      await supabase
        .from('toy_replicas')
        .update({ 
          status: 'failed', 
          error: "No image was generated by OpenAI",
          updated_at: new Date().toISOString()
        })
        .eq('id', toyReplicaId);
      
      return new Response(JSON.stringify({ 
        error: "No image was generated by OpenAI" 
      }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Convert base64 to bytes and upload to result bucket
    const resultImageBytes = Uint8Array.from(atob(b64Image), c => c.charCodeAt(0));
    const resultPath = `${toyReplica.user_id}/${toyReplicaId}.png`;
    
    console.log('Uploading result image to:', resultPath);
    
    const { error: uploadError } = await supabase.storage
      .from('toy-replica-result')
      .upload(resultPath, resultImageBytes, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) {
      console.error('Failed to upload result image:', uploadError);
      
      await supabase
        .from('toy_replicas')
        .update({ 
          status: 'failed', 
          error: `Failed to upload result: ${uploadError.message}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', toyReplicaId);
      
      return new Response(JSON.stringify({ 
        error: "Failed to upload result image" 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get public URL for the result
    const { data: resultUrlData } = supabase.storage
      .from('toy-replica-result')
      .getPublicUrl(resultPath);

    // Update toy replica with success
    await supabase
      .from('toy_replicas')
      .update({ 
        status: 'succeeded', 
        result_url: resultUrlData.publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', toyReplicaId);

    console.log('LEGO mini-figure generation completed successfully');

    return new Response(JSON.stringify({ 
      resultUrl: resultUrlData.publicUrl,
      status: 'succeeded'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in generate-toy-replica function:', error);
    
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
