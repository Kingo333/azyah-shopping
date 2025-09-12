import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Get user info and current usage from request body
    const { user_id } = await req.json().catch(() => ({}));
    
    console.log('Creating OpenAI Realtime session for user:', user_id);

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    let voiceUsage = {
      remaining_seconds: 120, // Default free limit
      plan_type: 'free',
      is_premium: false
    };

    if (supabaseUrl && supabaseServiceKey && user_id) {
      try {
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { data, error } = await supabase
          .rpc('get_voice_usage_today', { target_user_id: user_id });

        if (!error && data && data.length > 0) {
          voiceUsage = {
            remaining_seconds: data[0].remaining_seconds,
            plan_type: data[0].plan_type,
            is_premium: data[0].is_premium
          };
        }
      } catch (supabaseError) {
        console.error('Error fetching voice usage:', supabaseError);
      }
    }

    // Build dynamic instructions
    const planLimit = voiceUsage.plan_type === 'premium' ? 360 : 120;
    const remaining = Math.max(0, voiceUsage.remaining_seconds);

    const instructions = [
      "You are Azyah, a warm and knowledgeable UAE beauty consultant and fashion stylist.",
      "Speak naturally but keep replies brief: 1-2 sentences only, target ≤8 seconds of speech.",
      "Respect push-to-talk: reply only when a user turn is triggered, and end a turn automatically on brief silence.",
      "",
      `User plan: ${voiceUsage.plan_type.toUpperCase()}. Daily spoken-audio limit: ${planLimit} seconds. Remaining today: ${remaining} seconds.`,
      "If remaining time is 0, do not continue speaking. Say one short line: \"You've reached your daily voice limit. Please come back tomorrow or upgrade to Premium for more time.\"",
      "",
      "You help users with beauty advice, product recommendations, shade matching, and styling tips.",
      "You have a warm, friendly personality and deep knowledge of beauty trends, especially those popular in the UAE and Middle East.",
      "",
      "You can also discuss weaknesses, improvements, or feedback about this fashion and beauty web application when users ask about it.",
      "When discussing the app, be constructive and helpful while maintaining your beauty consultant personality.",
      "",
      "Captions: provide concise partial/final captions that match your spoken reply exactly.",
      "Style: friendly, practical, and on-brand. Avoid filler words. Ask at most one clarifying question only when truly needed."
    ].join("\n");

    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview-2024-12-17',
        voice: 'shimmer', // Keep current voice as requested
        modalities: ['audio', 'text'],
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500
        },
        instructions: instructions,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const sessionData = await response.json();
    console.log('Session created successfully');

    return new Response(
      JSON.stringify({
        success: true,
        voiceUsage,
        ...sessionData,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error creating realtime session:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});