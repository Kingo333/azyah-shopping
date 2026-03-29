import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Category mapping for The New Black API
const categoryMapping: Record<string, string> = {
  'top': 'top',
  'bottom': 'pants',
  'dress': 'dress',
  'outerwear': 'jacket',
  'shoes': 'shoes',
  'bag': 'bag',
  'accessory': 'accessories',
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

    const { item_id } = await req.json();
    if (!item_id) {
      throw new Error('item_id is required');
    }

    // Get the wardrobe item
    const { data: item, error: itemError } = await supabaseClient
      .from('wardrobe_items')
      .select('*')
      .eq('id', item_id)
      .eq('user_id', user.id)
      .single();

    if (itemError || !item) {
      throw new Error('Item not found or access denied');
    }

    // Check and deduct credits (1 credit required)
    const CREDITS_REQUIRED = 1;

    // Get credits from user_credits table
    const { data: creditsData, error: creditsError } = await supabaseClient
      .rpc('get_user_credits', { target_user_id: user.id });

    if (creditsError || !creditsData || creditsData.length === 0) {
      throw new Error('Failed to fetch user credits');
    }

    const { wardrobe_credits, is_premium } = creditsData[0];

    // Check if user has enough wardrobe credits
    if (wardrobe_credits < CREDITS_REQUIRED) {
      throw new Error(`Insufficient credits. You need ${CREDITS_REQUIRED} credit to enhance an item. Wardrobe credits reset daily.`);
    }

    // Deduct wardrobe credit using the new function
    const { data: deductResult, error: deductError } = await supabaseClient
      .rpc('deduct_wardrobe_credit', { 
        target_user_id: user.id,
        amount: CREDITS_REQUIRED 
      });

    if (deductError || !deductResult) {
      throw new Error('Failed to deduct wardrobe credit');
    }

    console.log(`Wardrobe credit deducted. Remaining: ${wardrobe_credits - CREDITS_REQUIRED}`);

    console.log('Enhancing item:', item_id, 'Category:', item.category);

    // Get The New Black credentials
    const THE_NEW_BLACK_EMAIL = Deno.env.get('THE_NEW_BLACK_EMAIL');
    const THE_NEW_BLACK_PASSWORD = Deno.env.get('THE_NEW_BLACK_PASSWORD');
    
    if (!THE_NEW_BLACK_EMAIL || !THE_NEW_BLACK_PASSWORD) {
      throw new Error('The New Black API credentials not configured');
    }

    // Map category to The New Black type
    const clothingType = categoryMapping[item.category] || 'clothing';

    // Step 1: Call The New Black API for ghost mannequin
    console.log('Calling The New Black API...');
    const formData = new FormData();
    formData.append('email', THE_NEW_BLACK_EMAIL);
    formData.append('password', THE_NEW_BLACK_PASSWORD);
    formData.append('image', item.image_url);
    formData.append('type', clothingType);

    const newBlackResponse = await fetch('https://thenewblack.ai/api/1.1/wf/image-to-ghost', {
      method: 'POST',
      body: formData,
    });

    if (!newBlackResponse.ok) {
      const errorText = await newBlackResponse.text();
      console.error('The New Black API error:', newBlackResponse.status, errorText);
      throw new Error('Failed to enhance image with The New Black API');
    }

    const enhancedImageUrl = await newBlackResponse.text();
    console.log('Enhanced image URL:', enhancedImageUrl);

    // Step 2: Download enhanced image
    console.log('Downloading enhanced image...');
    const imageResponse = await fetch(enhancedImageUrl);
    if (!imageResponse.ok) {
      throw new Error('Failed to download enhanced image');
    }

    const imageBlob = await imageResponse.arrayBuffer();

    // Step 3: Call Picsart for background removal
    console.log('Removing background with Picsart...');
    const PICSART_API_KEY = Deno.env.get('PICSART_API_KEY');
    if (!PICSART_API_KEY) {
      throw new Error('PICSART_API_KEY not configured');
    }

    const picsartFormData = new FormData();
    picsartFormData.append('image', new Blob([imageBlob], { type: 'image/jpeg' }));
    picsartFormData.append('output_type', 'cutout');
    picsartFormData.append('format', 'PNG');
    picsartFormData.append('scale', 'fit');
    picsartFormData.append('auto_center', 'true');

    const picsartResponse = await fetch('https://api.picsart.io/tools/1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Picsart-API-Key': PICSART_API_KEY,
      },
      body: picsartFormData,
    });

    if (!picsartResponse.ok) {
      const errorText = await picsartResponse.text();
      console.error('Picsart API error:', picsartResponse.status, errorText);
      throw new Error('Background removal failed');
    }

    const picsartData = await picsartResponse.json();
    const processedImageUrl = picsartData.data?.url;
    
    if (!processedImageUrl) {
      throw new Error('No processed image URL returned from Picsart');
    }

    // Step 4: Download processed image from Picsart
    console.log('Downloading processed image...');
    const processedImageResponse = await fetch(processedImageUrl);
    if (!processedImageResponse.ok) {
      throw new Error('Failed to download processed image');
    }

    const processedBlob = new Uint8Array(await processedImageResponse.arrayBuffer());

    // Step 5: Upload to Supabase storage
    console.log('Uploading to storage...');
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

    console.log('Final image uploaded:', publicUrl);

    // Step 6: Update wardrobe item
    const { error: updateError } = await supabaseClient
      .from('wardrobe_items')
      .update({ image_bg_removed_url: publicUrl })
      .eq('id', item_id);

    if (updateError) {
      console.error('Update error:', updateError);
      throw new Error('Failed to update item');
    }

    return new Response(JSON.stringify({
      success: true,
      image_url: publicUrl
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] Error in enhance-wardrobe-item:`, error);
    
    return new Response(JSON.stringify({ 
      error: error.message || 'Enhancement failed',
      timestamp
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
