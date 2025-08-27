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
    const { text, voice_id, want_mp3, save_to_storage } = await req.json();

    if (!text) {
      throw new Error('Text is required');
    }

    console.log(`Generating voice for text: "${text.substring(0, 50)}..."`);

    // Generate speech from text using OpenAI TTS
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: voice_id || 'nova',
        response_format: want_mp3 ? 'mp3' : 'wav',
        speed: 1.0
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI TTS error:', errorText);
      throw new Error(`OpenAI TTS error: ${errorText}`);
    }

    const arrayBuffer = await response.arrayBuffer();

    // If save_to_storage is requested, upload to Supabase Storage
    if (save_to_storage) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

      if (supabaseUrl && supabaseServiceKey) {
        try {
          const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
          const supabase = createClient(supabaseUrl, supabaseServiceKey);

          const fileName = `azyah_${Date.now()}.${want_mp3 ? 'mp3' : 'wav'}`;
          const filePath = `responses/${fileName}`;

          const { error } = await supabase.storage
            .from('azyah-audio')
            .upload(filePath, new Uint8Array(arrayBuffer), {
              contentType: want_mp3 ? 'audio/mpeg' : 'audio/wav',
              upsert: false,
            });

          if (error) {
            console.error('Storage upload error:', error);
          } else {
            const { data } = supabase.storage
              .from('azyah-audio')
              .getPublicUrl(filePath);

            console.log('Voice generation and storage successful');

            return new Response(
              JSON.stringify({
                success: true,
                audio_url: data.publicUrl,
                mime: want_mp3 ? 'audio/mpeg' : 'audio/wav',
                message: 'Voice generation and storage completed'
              }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              }
            );
          }
        } catch (storageError) {
          console.error('Storage error:', storageError);
        }
      }
    }

    // Fallback: return base64 audio
    const base64Audio = btoa(
      String.fromCharCode(...new Uint8Array(arrayBuffer))
    );

    console.log('Voice generation successful');

    return new Response(
      JSON.stringify({ 
        success: true,
        audio_base64: base64Audio,
        mime: want_mp3 ? 'audio/mpeg' : 'audio/wav',
        message: 'Voice generation completed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in voice generation function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});