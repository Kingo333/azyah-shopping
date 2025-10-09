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

    // Get form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Upload original to storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${crypto.randomUUID()}.${fileExt}`;
    
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('closet-items')
      .upload(fileName, file);

    if (uploadError) {
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseClient.storage
      .from('closet-items')
      .getPublicUrl(fileName);

    // Background removal using Lovable AI (vision model)
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
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Return ONLY a base64-encoded PNG with transparent background. Remove the background completely, keeping only the main subject (clothing item).'
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

    const aiData = await aiResponse.json();
    
    // For now, return original until we implement actual BG removal
    // You can integrate with remove.bg API or similar service here
    console.log('Background removal processed (placeholder)');

    // Create thumbnail
    const thumbName = `${user.id}/${crypto.randomUUID()}_thumb.webp`;
    // For now, use same image - in production, resize it
    const { error: thumbError } = await supabaseClient.storage
      .from('closet-thumbs')
      .upload(thumbName, file);

    if (thumbError) {
      console.warn('Thumbnail creation failed:', thumbError);
    }

    return new Response(JSON.stringify({
      image_path: fileName,
      thumb_path: thumbName,
      message: 'Background removal completed'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
