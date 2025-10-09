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

    // Check quota
    const { data: subscription } = await supabaseClient
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    const isPremium = subscription?.status === 'active' && 
                      subscription?.current_period_end &&
                      new Date(subscription.current_period_end) >= new Date();

    // Get or create user credits record
    let { data: credits } = await supabaseClient
      .from('user_credits')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!credits) {
      const { data: newCredits } = await supabaseClient
        .from('user_credits')
        .insert({ user_id: user.id })
        .select()
        .single();
      credits = newCredits;
    }

    // Check if quota exceeded (skip for premium users)
    if (!isPremium && credits && credits.bg_removals_used_monthly >= credits.bg_removals_quota_monthly) {
      return new Response(JSON.stringify({ 
        error: "You've reached your monthly background removals. Upgrade for unlimited.",
        quota_exceeded: true
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Processing background removal for user:', user.id);

    // Background removal using Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const imageBuffer = await file.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Remove the background from this clothing item image completely. Return ONLY the clothing item with a transparent background. Make the cutout precise and clean.'
              },
              {
                type: 'image_url',
                image_url: { url: `data:${file.type};base64,${base64Image}` }
              }
            ]
          }
        ],
        modalities: ["image"]
      })
    });

    if (!aiResponse.ok) {
      throw new Error(`AI service error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    
    // Extract the generated image from response
    const generatedImageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!generatedImageUrl) {
      throw new Error('No image returned from AI service');
    }

    // Convert base64 to blob
    const base64Data = generatedImageUrl.split(',')[1];
    const imageBlob = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    // Upload background-removed PNG to storage
    const fileName = `${user.id}/${crypto.randomUUID()}.png`;
    const { error: uploadError } = await supabaseClient.storage
      .from('closet-items')
      .upload(fileName, imageBlob, { contentType: 'image/png' });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    // Create WebP thumbnail (resize to 144px max dimension)
    const thumbName = `${user.id}/${crypto.randomUUID()}_thumb.webp`;
    // For now, use a smaller version - in production, use image resizing
    const { error: thumbError } = await supabaseClient.storage
      .from('closet-thumbs')
      .upload(thumbName, imageBlob.slice(0, Math.floor(imageBlob.length / 4)), { 
        contentType: 'image/webp' 
      });

    if (thumbError) {
      console.warn('Thumbnail creation failed:', thumbError);
    }

    // Increment usage counter
    if (!isPremium) {
      await supabaseClient
        .from('user_credits')
        .update({ 
          bg_removals_used_monthly: (credits?.bg_removals_used_monthly || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);
    }

    console.log('Background removal completed successfully');

    return new Response(JSON.stringify({
      image_path: fileName,
      thumb_path: thumbName,
      message: 'Background removal completed'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'We couldn\'t remove the background. Try a clearer photo or different lighting.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
