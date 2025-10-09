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
    
    // Call Lovable AI for background removal
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const formDataAI = new FormData();
    formDataAI.append('file', new Blob([imageBlob]));
    formDataAI.append('prompt', 'Remove the background from this clothing item image, keeping only the garment');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/images/edit', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      },
      body: formDataAI,
    });

    if (!aiResponse.ok) {
      throw new Error(`AI background removal failed: ${aiResponse.statusText}`);
    }

    const aiData = await aiResponse.json();
    const processedImageUrl = aiData.data?.[0]?.url;
    
    if (!processedImageUrl) {
      throw new Error('No processed image returned from AI');
    }

    // Download the processed image
    const processedResponse = await fetch(processedImageUrl);
    const processedBlob = await processedResponse.arrayBuffer();

    // Upload to closet-items bucket
    const fileName = `${user.id}/${crypto.randomUUID()}.png`;
    const { error: uploadError } = await supabaseClient.storage
      .from('closet-items')
      .upload(fileName, processedBlob, {
        contentType: 'image/png',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabaseClient.storage
      .from('closet-items')
      .getPublicUrl(fileName);

    console.log('Image uploaded successfully:', publicUrl);

    // Generate WebP thumbnail (basic implementation)
    const thumbFileName = `${user.id}/${crypto.randomUUID()}_thumb.webp`;
    
    // For production, use proper image processing
    // This is a placeholder that creates a smaller version
    const thumbBlob = new Blob([new Uint8Array(processedBlob).slice(0, Math.floor(processedBlob.byteLength / 8))], 
      { type: 'image/webp' });
    
    await supabaseClient.storage
      .from('closet-thumbs')
      .upload(thumbFileName, thumbBlob, {
        contentType: 'image/webp',
        upsert: false,
      });

    // Update user credits
    await supabaseClient
      .from('user_credits')
      .update({ bg_removals_used_monthly: bgRemovalsUsed + 1 })
      .eq('user_id', user.id);

    const remainingQuota = bgRemovalQuota - bgRemovalsUsed - 1;

    return new Response(JSON.stringify({
      image_path: publicUrl,
      thumb_path: thumbFileName,
      quota: {
        used: bgRemovalsUsed + 1,
        total: bgRemovalQuota,
        remaining: remainingQuota
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      message: 'We couldn\'t remove the background. Try a clearer photo or different lighting.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
