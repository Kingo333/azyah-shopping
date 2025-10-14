import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check subscription status for quota
    const { data: subscription } = await supabaseClient
      .from('subscriptions')
      .select('status, current_period_end')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .gt('current_period_end', new Date().toISOString())
      .single();

    const isPremium = !!subscription;

    // Get or create user credits record
    let { data: credits } = await supabaseClient
      .from('user_credits')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!credits) {
      const { data: newCredits, error: createError } = await supabaseClient
        .from('user_credits')
        .insert({ user_id: user.id })
        .select()
        .single();

      if (createError) throw createError;
      credits = newCredits;
    }

    // Reset monthly count if needed
    const lastReset = new Date(credits.last_reset_date);
    const now = new Date();
    const shouldReset = now.getMonth() !== lastReset.getMonth() || 
                        now.getFullYear() !== lastReset.getFullYear();

    if (shouldReset) {
      const { data: resetCredits, error: resetError } = await supabaseClient
        .from('user_credits')
        .update({
          bg_removals_used_monthly: 0,
          last_reset_date: now.toISOString().split('T')[0]
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (resetError) throw resetError;
      credits = resetCredits;
    }

    const bgRemovalQuota = isPremium ? 999 : credits.bg_removals_quota_monthly;
    const bgRemovalsUsed = credits.bg_removals_used_monthly;

    // Check quota
    if (bgRemovalsUsed >= bgRemovalQuota) {
      return new Response(JSON.stringify({
        error: 'Quota exceeded',
        message: "You've reached your monthly background removals. Upgrade for unlimited."
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the image from FormData
    const formData = await req.formData();
    const imageFile = formData.get('file') as File;
    
    if (!imageFile) {
      throw new Error('No file provided');
    }

    const imageBlob = await imageFile.arrayBuffer();
    
    // Call OpenAI ChatGPT for background removal
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const formDataAI = new FormData();
    formDataAI.append('image', new Blob([imageBlob], { type: imageFile.type }));
    formDataAI.append('model', 'gpt-image-1');
    formDataAI.append('prompt', 'Remove the entire background from this photo and output a transparent PNG (RGBA). Keep only the subject (clothing item or person) with original colors, texture, and smooth edges. Do not add any background, shadow, gradient, or checkerboard. Maintain full resolution and aspect ratio.');
    formDataAI.append('background', 'transparent');
    formDataAI.append('size', '1024x1024');
    formDataAI.append('n', '1');

    const aiResponse = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formDataAI,
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`ChatGPT background removal failed: ${aiResponse.statusText}`);
    }

    const aiData = await aiResponse.json();
    
    const base64Image = aiData.data?.[0]?.b64_json;
    
    if (!base64Image) {
      throw new Error('No processed image returned from OpenAI');
    }

    // Decode base64 to binary
    const processedBlob = Uint8Array.from(atob(base64Image), c => c.charCodeAt(0));

    // Upload to wardrobe-items bucket
    const fileName = `${user.id}/${crypto.randomUUID()}.png`;
    const { error: uploadError } = await supabaseClient.storage
      .from('wardrobe-items')
      .upload(fileName, processedBlob, {
        contentType: 'image/png',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabaseClient.storage
      .from('wardrobe-items')
      .getPublicUrl(fileName);

    console.log('Image uploaded successfully:', publicUrl);

    // Use the same image for thumbnail (proper resizing can be added later)
    const thumbFileName = fileName;

    // Update user credits
    await supabaseClient
      .from('user_credits')
      .update({ bg_removals_used_monthly: bgRemovalsUsed + 1 })
      .eq('user_id', user.id);

    const remainingQuota = bgRemovalQuota - bgRemovalsUsed - 1;

    return new Response(JSON.stringify({
      image_path: publicUrl,
      thumb_path: publicUrl, // Use full image as thumbnail
      quota: {
        used: bgRemovalsUsed + 1,
        total: bgRemovalQuota,
        remaining: remainingQuota
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] Error in bg-remove:`, error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    return new Response(JSON.stringify({ 
      error: error.message,
      message: 'We couldn\'t remove the background. Try a clearer photo or different lighting.',
      timestamp
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
