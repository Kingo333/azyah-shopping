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
    
    // Call Picsart for background removal
    const PICSART_API_KEY = Deno.env.get('PICSART_API_KEY');
    if (!PICSART_API_KEY) {
      throw new Error('PICSART_API_KEY not configured');
    }

    const formDataPicsart = new FormData();
    formDataPicsart.append('image', new Blob([imageBlob], { type: imageFile.type }));
    formDataPicsart.append('output_type', 'cutout');
    formDataPicsart.append('format', 'PNG');
    formDataPicsart.append('scale', 'fit');
    formDataPicsart.append('auto_center', 'true');

    const picsartResponse = await fetch('https://api.picsart.io/tools/1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Picsart-API-Key': PICSART_API_KEY,
      },
      body: formDataPicsart,
    });

    if (!picsartResponse.ok) {
      const errorText = await picsartResponse.text();
      console.error('Picsart API error:', picsartResponse.status, errorText);
      
      // Handle specific Picsart error codes
      if (picsartResponse.status === 400) {
        throw new Error('Invalid image format. Please use JPG or PNG.');
      } else if (picsartResponse.status === 401) {
        throw new Error('Invalid API key.');
      } else if (picsartResponse.status === 402) {
        throw new Error('Out of credits. Please check your Picsart account.');
      } else if (picsartResponse.status === 415) {
        throw new Error('Unsupported image format. Please use JPG or PNG.');
      } else if (picsartResponse.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      }
      
      throw new Error(`Picsart background removal failed: ${picsartResponse.statusText}`);
    }

    const picsartData = await picsartResponse.json();
    
    const processedImageUrl = picsartData.data?.url;
    
    if (!processedImageUrl) {
      throw new Error('No processed image URL returned from Picsart');
    }

    console.log('Picsart processed image URL:', processedImageUrl);

    // Download the processed image from Picsart CDN
    const processedImageResponse = await fetch(processedImageUrl);
    if (!processedImageResponse.ok) {
      throw new Error('Failed to download processed image from Picsart');
    }

    const processedBlob = new Uint8Array(await processedImageResponse.arrayBuffer());

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
